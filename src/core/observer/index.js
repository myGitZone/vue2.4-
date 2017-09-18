/* @flow */

import Dep from './dep'
import { arrayMethods } from './array'
import {
  def,
  warn,
  hasOwn,
  hasProto,
  isObject,
  isPlainObject,
  isValidArrayIndex,
  isServerRendering
} from '../util/index'

const arrayKeys = Object.getOwnPropertyNames(arrayMethods)

/**
 * By default, when a reactive property is set, the new value is
 * also converted to become reactive. However when passing down props,
 * we don't want to force conversion because the value may be a nested value
 * under a frozen data structure. Converting it would defeat the optimization.
 */
export const observerState = {
  shouldConvert: true
}

/**
 * Observer class that are attached to each observed
 * object. Once attached, the observer converts target
 * object's property keys into getter/setters that
 * collect dependencies and dispatches updates.
 * 这些代码在网上有很多简易的实现，及简单实现mvvm框架之类的
 */
export class Observer {
  value: any;
  dep: Dep;
  vmCount: number; // number of vms that has this object as root $data

  constructor (value: any) {
    this.value = value
    this.dep = new Dep()
    this.vmCount = 0
    /* 给value添加__ob__属性，属性值为this（Observer） */
    def(value, '__ob__', this)
    /* 如果是数组，则遍历数组每一项，然后进行observe */
    if (Array.isArray(value)) {
      const augment = hasProto
        ? protoAugment
        : copyAugment
      augment(value, arrayMethods, arrayKeys)
      this.observeArray(value)
    } else {
      /* 最后value会在这里进行defineReactive操作 */
      this.walk(value)
    }
  }

  /**
   * Walk through each property and convert them into
   * getter/setters. This method should only be called when
   * value type is Object.
   */
  walk (obj: Object) {
    const keys = Object.keys(obj)
    for (let i = 0; i < keys.length; i++) {
      defineReactive(obj, keys[i], obj[keys[i]])
    }
  }

  /**
   * Observe a list of Array items.
   */
  observeArray (items: Array<any>) {
    for (let i = 0, l = items.length; i < l; i++) {
      observe(items[i])
    }
  }
}

// helpers

/**
 * Augment an target Object or Array by intercepting
 * the prototype chain using __proto__
 */
function protoAugment (target, src: Object, keys: any) {
  /* eslint-disable no-proto */
  target.__proto__ = src
  /* eslint-enable no-proto */
}

/**
 * Augment an target Object or Array by defining
 * hidden properties.
 */
/* istanbul ignore next */
function copyAugment (target: Object, src: Object, keys: Array<string>) {
  for (let i = 0, l = keys.length; i < l; i++) {
    const key = keys[i]
    def(target, key, src[key])
  }
}

/**
 * Attempt to create an observer instance for a value,
 * returns the new observer if successfully observed,
 * or the existing observer if the value already has one.
 * 尝试创建一个Observer实例（__ob__），如果成功创建Observer实例则返回新的Observer实例，如果已有Observer实例则返回现有的Observer实例。
 */
export function observe (value: any, asRootData: ?boolean): Observer | void {
  /* 判断value是否是object */
  if (!isObject(value)) {
    return
  }
  let ob: Observer | void
  /* 判断是否有Observer实例 */
  if (hasOwn(value, '__ob__') && value.__ob__ instanceof Observer) {
    ob = value.__ob__
  } else if (
    /*
       这里的判断是为了确保value是单纯的对象，而不是函数或者是Regexp等情况。
       而且该对象在shouldConvert的时候才会进行Observer。这是一个标识位，避免重复对value进行Observer
     */
    observerState.shouldConvert &&
    !isServerRendering() &&
    (Array.isArray(value) || isPlainObject(value)) &&
    Object.isExtensible(value) &&
    !value._isVue
  ) {
    ob = new Observer(value)
  }
  if (asRootData && ob) {
    /* 如果是根数据则计数，后面Observer中的observe的asRootData非true */
    ob.vmCount++
  }
  return ob
}

/**
 * Define a reactive property on an Object.
 */
export function defineReactive (
  obj: Object,
  key: string,
  val: any,
  customSetter?: ?Function,
  shallow?: boolean
) {
  const dep = new Dep()
  /* 返回属性的描述符，判断是否可修改，configurable等信息 */
  const property = Object.getOwnPropertyDescriptor(obj, key)
  if (property && property.configurable === false) {
    return
  }

  // cater for pre-defined getter/setters
  const getter = property && property.get
  const setter = property && property.set
  /* 判断子属性中是否是object，如果是object，则继续observe化，直到最后是普通类型 */
  let childOb = !shallow && observe(val)
  Object.defineProperty(obj, key, {
    enumerable: true,
    configurable: true,
    /* 添加get属性 */
    get: function reactiveGetter () {
      /* 处理属性自身所有的get属性，如果有则调用自身默认的get。没有的话就是value本身 */
      const value = getter ? getter.call(obj) : val
      /* 判断是否有watch】 */
      if (Dep.target) {
        /* 如果有，则添加到观察的队列中，到使用set的时候，会触发 */
        dep.depend()
        if (childOb) {
          childOb.dep.depend()
        }
        if (Array.isArray(value)) {
          dependArray(value)
        }
      }
      return value
    },
    set: function reactiveSetter (newVal) {
      /* 通过get获取old value */
      const value = getter ? getter.call(obj) : val
      /* eslint-disable no-self-compare */
      if (newVal === value || (newVal !== newVal && value !== value)) {
        return
      }
      /* eslint-enable no-self-compare */
      if (process.env.NODE_ENV !== 'production' && customSetter) {
        customSetter()
      }
      if (setter) {
        setter.call(obj, newVal)
      } else {
        val = newVal
      }
      /* 判断赋值的新值是否要进行observe，即如果是object则进行observe */
      childOb = !shallow && observe(newVal)
      /* 触发所有观察对象，也就是我们使用vue的时候，当值改变的时候，多处使用该值的地方都会刷新 */
      dep.notify()
    }
  })
}

/**
 * Set a property on an object. Adds the new property and
 * triggers change notification if the property doesn't
 * already exist.
 * 这个set是绑定在原型上的，即Vue.prototype.set,在全局调用的时候是Vue.set,vue实例中调用是this.$set.这样就知道这个函数是干什么的了吧
 */
export function set (target: Array<any> | Object, key: any, val: any): any {
  /* 判断值是否为数组，如果是数组，则继续判断传入的index值（key）是否有效 */
  if (Array.isArray(target) && isValidArrayIndex(key)) {
    /* 取数组长度和传入key的最大值 */
    target.length = Math.max(target.length, key)
    /* 插入数组，splice是数组的方法，删除原来的值，添加新植 */
    target.splice(key, 1, val)
    return val
  }
  /* 如果不是数组，那就是object，验证是否有该属性值 */
  if (hasOwn(target, key)) {
    target[key] = val
    return val
  }
  const ob = (target: any).__ob__
  /* target._isVue是判断是否为vm自身，防止对自身进行观察，vue官网明确说明：
  Vue 不允许在已经创建的实例上动态添加新的根级响应式属性(root-level reactive property)。
  然而它可以使用 Vue.set(object, key, value) 方法将响应属性添加到嵌套的对象上 */
  if (target._isVue || (ob && ob.vmCount)) {
    process.env.NODE_ENV !== 'production' && warn(
      'Avoid adding reactive properties to a Vue instance or its root $data ' +
      'at runtime - declare it upfront in the data option.'
    )
    return val
  }
  if (!ob) {
    target[key] = val
    return val
  }
  defineReactive(ob.value, key, val)
  /* 这里进行触发数据响应式变化 */
  ob.dep.notify()
  return val
}

/**
 * Delete a property and trigger change if necessary.
 */
export function del (target: Array<any> | Object, key: any) {
  if (Array.isArray(target) && isValidArrayIndex(key)) {
    target.splice(key, 1)
    return
  }
  const ob = (target: any).__ob__
  if (target._isVue || (ob && ob.vmCount)) {
    process.env.NODE_ENV !== 'production' && warn(
      'Avoid deleting properties on a Vue instance or its root $data ' +
      '- just set it to null.'
    )
    return
  }
  if (!hasOwn(target, key)) {
    return
  }
  delete target[key]
  if (!ob) {
    return
  }
  ob.dep.notify()
}

/**
 * Collect dependencies on array elements when the array is touched, since
 * we cannot intercept array element access like property getters.
 */
function dependArray (value: Array<any>) {
  for (let e, i = 0, l = value.length; i < l; i++) {
    e = value[i]
    e && e.__ob__ && e.__ob__.dep.depend()
    if (Array.isArray(e)) {
      dependArray(e)
    }
  }
}
