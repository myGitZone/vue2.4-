/* @flow */

import config from '../config'
import { initProxy } from './proxy'
import { initState } from './state'
import { initRender } from './render'
import { initEvents } from './events'
import { mark, measure } from '../util/perf'
import { initLifecycle, callHook } from './lifecycle'
import { initProvide, initInjections } from './inject'
import { extend, mergeOptions, formatComponentName } from '../util/index'

let uid = 0
/* 给vue原型上绑定_init方法，vue实例初始化的时候调用 */
export function initMixin (Vue: Class<Component>) {
  Vue.prototype._init = function (options?: Object) {
    /* 将实例绑定到vm上 */
    const vm: Component = this
    // a uid
    vm._uid = uid++

    let startTag, endTag
    /* istanbul ignore if */
    if (process.env.NODE_ENV !== 'production' && config.performance && mark) {
      startTag = `vue-perf-init:${vm._uid}`
      endTag = `vue-perf-end:${vm._uid}`
      mark(startTag)
    }

    // a flag to avoid this being observed   为了避免这种被观察的标志
    /* 避免vm被自身监控标记 */
    vm._isVue = true
    // merge options  合并配置项
    /* _isComponent判断是否是vue的组件。这个属性在初始化组件的时候赋值 */
    if (options && options._isComponent) {
      // optimize internal component instantiation   优化内部组件实例，由于动态选择合并是非常缓慢的，和内部组件的选择都需要特殊处理
      // since dynamic options merging is pretty slow, and none of the
      // internal component options needs special treatment.
      initInternalComponent(vm, options)
    } else { /* 这里是vue的实例，因为只有一个vue实例，所以这个只是进一次，其他的都会是组件，进if而不会进else */
      /* 融合后获取到新的配置项 */
      vm.$options = mergeOptions(
        resolveConstructorOptions(vm.constructor),
        options || {},
        vm
      )
    }
    /* istanbul ignore else */
    if (process.env.NODE_ENV !== 'production') {
      initProxy(vm)
    } else {
      vm._renderProxy = vm
    }
    // expose real self
    vm._self = vm
    /* 初始化生命周期 */
    initLifecycle(vm)
    /* 初始化事件 */
    initEvents(vm)
    /* 初始化render函数 */
    initRender(vm)
    /* 触发beforeCreate钩子 */
    callHook(vm, 'beforeCreate')
    initInjections(vm) // resolve injections before data/props
    /* 初始化props、methods、data、computed与watch */
    initState(vm)
    initProvide(vm) // resolve provide after data/props
    callHook(vm, 'created')

    /* istanbul ignore if */
    if (process.env.NODE_ENV !== 'production' && config.performance && mark) {
      vm._name = formatComponentName(vm, false)
      mark(endTag)
      measure(`${vm._name} init`, startTag, endTag)
    }

    if (vm.$options.el) {
      vm.$mount(vm.$options.el)
    }
  }
}

function initInternalComponent (vm: Component, options: InternalComponentOptions) {
  const opts = vm.$options = Object.create(vm.constructor.options)
  // doing this because it's faster than dynamic enumeration.
  opts.parent = options.parent
  opts.propsData = options.propsData
  opts._parentVnode = options._parentVnode
  opts._parentListeners = options._parentListeners
  opts._renderChildren = options._renderChildren
  opts._componentTag = options._componentTag
  opts._parentElm = options._parentElm
  opts._refElm = options._refElm
  if (options.render) {
    opts.render = options.render
    opts.staticRenderFns = options.staticRenderFns
  }
}
/* 解析构造函数选项 */
export function resolveConstructorOptions (Ctor: Class<Component>) {
  /* 看到这里可能会有疑问，什么时候将options绑定到Vue的构造函数上的（静态属性），这个要继续往下看，后面就会提到 */
  let options = Ctor.options
  /* 查看是否有父类 */
  if (Ctor.super) {
    /* 如果有父类，则获取父类的配置项 */
    const superOptions = resolveConstructorOptions(Ctor.super)
    /* 获取缓存中父类的配置项 */
    const cachedSuperOptions = Ctor.superOptions
    /* 如果父类的配置项发生了变化，则进一步处理（现在的个人理解，其实变化指的就是在其他组件中对Vue的配置项进行了修改，如添加了全局过滤器和全局的组件，这时需要进行更新到其他刚创建的组件中，不然全局的无法调用） */
    if (superOptions !== cachedSuperOptions) {
      // super option changed,
      // need to resolve new options.
      /* 先将配置项缓存下来 */
      Ctor.superOptions = superOptions
      // check if there are any late-modified/attached options (#4976)
      const modifiedOptions = resolveModifiedOptions(Ctor)
      // update base extend options
      if (modifiedOptions) {
        extend(Ctor.extendOptions, modifiedOptions)
      }
      options = Ctor.options = mergeOptions(superOptions, Ctor.extendOptions)
      if (options.name) {
        options.components[options.name] = Ctor
      }
    }
  }
  return options
}

function resolveModifiedOptions (Ctor: Class<Component>): ?Object {
  let modified
  const latest = Ctor.options
  const extended = Ctor.extendOptions
  const sealed = Ctor.sealedOptions
  for (const key in latest) {
    if (latest[key] !== sealed[key]) {
      if (!modified) modified = {}
      modified[key] = dedupe(latest[key], extended[key], sealed[key])
    }
  }
  return modified
}

function dedupe (latest, extended, sealed) {
  // compare latest and sealed to ensure lifecycle hooks won't be duplicated
  // between merges
  if (Array.isArray(latest)) {
    const res = []
    sealed = Array.isArray(sealed) ? sealed : [sealed]
    extended = Array.isArray(extended) ? extended : [extended]
    for (let i = 0; i < latest.length; i++) {
      // push original options and not sealed options to exclude duplicated options
      if (extended.indexOf(latest[i]) >= 0 || sealed.indexOf(latest[i]) < 0) {
        res.push(latest[i])
      }
    }
    return res
  } else {
    return latest
  }
}
