/* @flow */

import config from '../config'
import Dep from '../observer/dep'
import Watcher from '../observer/watcher'
import {isUpdatingChildComponent} from './lifecycle'

import {
  set,
  del,
  observe,
  observerState,
  defineReactive
} from '../observer/index'

import {
  warn,
  bind,
  noop,
  hasOwn,
  isReserved,
  handleError,
  nativeWatch,
  validateProp,
  isPlainObject,
  isReservedAttribute
} from '../util/index'

const sharedPropertyDefinition = {
  enumerable: true,
  configurable: true,
  get: noop,
  set: noop
}

export function proxy(target: Object, sourceKey: string, key: string) {
  sharedPropertyDefinition.get = function proxyGetter () {
    return this[sourceKey][key]
  }
  sharedPropertyDefinition.set = function proxySetter (val) {
    this[sourceKey][key] = val
  }
  Object.defineProperty(target, key, sharedPropertyDefinition)
}

/* 初始化props、methods、data、computed与watch */
export function initState(vm: Component) {
  /* 初始化一个数组，保存所有的watch */
  vm._watchers = []
  const opts = vm.$options
  /* 判断是否有props，如果有，则初始化props,opts.props为组件定义的部分。包含了type等属性 */
  if (opts.props) initProps(vm, opts.props)
  /* 判断是否有methods属性，如果有则初始化该属性 */
  if (opts.methods) initMethods(vm, opts.methods)
  /* 如果有data属性 */
  if (opts.data) {
    initData(vm)
  } else {
    observe(vm._data = {}, true /* asRootData */)
  }
  /* 判断是否有计算属性，然后进行计算属性的初始化 */
  if (opts.computed) initComputed(vm, opts.computed)
  /* 判断是否有watch,如果有则进行初始化 */
  if (opts.watch && opts.watch !== nativeWatch) {
    initWatch(vm, opts.watch)
  }
}

function checkOptionType(vm: Component, name: string) {
  const option = vm.$options[name]
  if (!isPlainObject(option)) {
    warn(
      `component option "${name}" should be an object.`,
      vm
    )
  }
}

function initProps(vm: Component, propsOptions: Object) {
  /* propsData是外部传入组件的值 */
  const propsData = vm.$options.propsData || {}
  const props = vm._props = {}
  // cache prop keys so that future props updates can iterate using Array
  // instead of dynamic object key enumeration.
  /* 这里是缓存props中的属性key */
  const keys = vm.$options._propKeys = []
  /* 根据$parent是否存在来判断当前是否是根结点 */
  const isRoot = !vm.$parent
  // root instance props should be converted
  observerState.shouldConvert = isRoot
  for (const key in propsOptions) {
    keys.push(key)
    /* 验证是否传入的是props是否有效 */
    const value = validateProp(key, propsOptions, propsData, vm)
    /* istanbul ignore else */
    if (process.env.NODE_ENV !== 'production') {
      /* 验证props的key是不是保留的key */
      if (isReservedAttribute(key) || config.isReservedAttr(key)) {
        warn(
          `"${key}" is a reserved attribute and cannot be used as component prop.`,
          vm
        )
      }
      /* 通过Object.defineProperty将props的值变成可观察的 */
      defineReactive(props, key, value, () => {
        if (vm.$parent && !isUpdatingChildComponent) {
          warn(
            `Avoid mutating a prop directly since the value will be ` +
            `overwritten whenever the parent component re-renders. ` +
            `Instead, use a data or computed property based on the prop's ` +
            `value. Prop being mutated: "${key}"`,
            vm
          )
        }
      })
    } else {
      defineReactive(props, key, value)
    }
    // static props are already proxied on the component's prototype
    // during Vue.extend(). We only need to proxy props defined at
    // instantiation here.
    if (!(key in vm)) {
      proxy(vm, `_props`, key)
    }
  }
  observerState.shouldConvert = true
}

function initData(vm: Component) {
  /* 用变量data代理data属性 */
  let data = vm.$options.data
  /* 判断data是否为函数，如果是函数，则通过getData函数获取到返回值，否则等于data本身或者一个空对象 */
  data = vm._data = typeof data === 'function'
    ? getData(data, vm)
    : data || {}
  /* 对data进行检查，看data是否满足要求，该函数是利用Object.prototype.toString.call()来判断是否是object类型 */
  if (!isPlainObject(data)) {
    /* 如果这时候data不是object，则对其进行重置，并进行警告提示 */
    data = {}
    process.env.NODE_ENV !== 'production' && warn(
      'data functions should return an object:\n' +
      'https://vuejs.org/v2/guide/components.html#data-Must-Be-a-Function',
      vm
    )
  }
  // proxy data on instance、
  /* 通过Object.keys获取到所有的属性keys */
  const keys = Object.keys(data)
  /* 获取props和methods，这里为了检查data中是否有同名的属性 */
  const props = vm.$options.props
  const methods = vm.$options.methods
  let i = keys.length
  /* 进行遍历 */
  while (i--) {
    /* 获取key */
    const key = keys[i]
    if (process.env.NODE_ENV !== 'production') {
      if (methods && hasOwn(methods, key)) {
        warn(
          `method "${key}" has already been defined as a data property.`,
          vm
        )
      }
    }
    if (props && hasOwn(props, key)) {
      process.env.NODE_ENV !== 'production' && warn(
        `The data property "${key}" is already declared as a prop. ` +
        `Use prop default value instead.`,
        vm
      )
    } else if (!isReserved(key)) {
      /* 这里将data的属性代理到vm实例上，也就是为什么data的属性，可以直接通过this.xx的形式调用，而不用this.data.xx */
      /* _datade是由于上面代码中vm._data指向了真是data地址，做代理的时候从vm中的该属性中获取key值 */
      proxy(vm, `_data`, key)
    }
  }
  // observe data
  /* 这里对data做了Object.defineProperty处理，给每一个属性添加了getter 和 setter,也是vue为什么可以实现数据的变化监听 */
  observe(data, true /* asRootData */)
}

function getData(data: Function, vm: Component): any {
  try {
    return data.call(vm)
  } catch (e) {
    handleError(e, vm, `data()`)
    return {}
  }
}

const computedWatcherOptions = {lazy: true}
/* 计算属性初始化 */
function initComputed(vm: Component, computed: Object) {
  process.env.NODE_ENV !== 'production' && checkOptionType(vm, 'computed')
  /* 初始化一个空对象，赋值给一个变量 */
  const watchers = vm._computedWatchers = Object.create(null)
　/* 遍历计算属性的key */
  for (const key in computed) {
    /* 获取到计算属性的函数 */
    const userDef = computed[key]
    const getter = typeof userDef === 'function' ? userDef : userDef.get
    if (process.env.NODE_ENV !== 'production' && getter == null) {
      warn(
        `Getter is missing for computed property "${key}".`,
        vm
      )
    }
    // create internal watcher for the computed property.
    /* 创建一个watcher实例 */
    watchers[key] = new Watcher(vm, getter || noop, noop, computedWatcherOptions)

    // component-defined computed properties are already defined on the
    // component prototype. We only need to define computed properties defined
    // at instantiation here.
    /* 判断这个key是否在vm实例上,为什么key会在vm实例上，主要是因为在执行extend的时候，已经执行过一次defineComputed， */
    if (!(key in vm)) {
      defineComputed(vm, key, userDef)
    } else if (process.env.NODE_ENV !== 'production') {
      /* 如果计算属性与已定义的data或者props中的名称冲突则发出warning */
      if (key in vm.$data) {
        warn(`The computed property "${key}" is already defined in data.`, vm)
      } else if (vm.$options.props && key in vm.$options.props) {
        warn(`The computed property "${key}" is already defined as a prop.`, vm)
      }
    }
  }
}
/* 将计算属性变成可观察的，即用Object.defineProperty添加get、set */
export function defineComputed(target: any, key: string, userDef: Object | Function) {
  if (typeof userDef === 'function') {
    sharedPropertyDefinition.get = createComputedGetter(key)
    sharedPropertyDefinition.set = noop
  } else {
    sharedPropertyDefinition.get = userDef.get
      ? userDef.cache !== false
        ? createComputedGetter(key)
        : userDef.get
      : noop
    sharedPropertyDefinition.set = userDef.set
      ? userDef.set
      : noop
  }
  if (process.env.NODE_ENV !== 'production' &&
    sharedPropertyDefinition.set === noop) {
    sharedPropertyDefinition.set = function () {
      warn(
        `Computed property "${key}" was assigned to but it has no setter.`,
        this
      )
    }
  }
  Object.defineProperty(target, key, sharedPropertyDefinition)
}

function createComputedGetter(key) {
  return function computedGetter() {
    const watcher = this._computedWatchers && this._computedWatchers[key]
    if (watcher) {
      if (watcher.dirty) {
        watcher.evaluate()
      }
      if (Dep.target) {
        watcher.depend()
      }
      return watcher.value
    }
  }
}

function initMethods(vm: Component, methods: Object) {
  process.env.NODE_ENV !== 'production' && checkOptionType(vm, 'methods')
  const props = vm.$options.props
  /* 遍历methods中的所有函数 */
  for (const key in methods) {
    /* 判断是否为空，如果为空则赋值为空函数，如果不为空，则通过bind，改变函数的this指向，（bind函数在shared的util.js中） */
    vm[key] = methods[key] == null ? noop : bind(methods[key], vm)
    if (process.env.NODE_ENV !== 'production') {
      /* 如果为空，则警告提示 */
      if (methods[key] == null) {
        warn(
          `method "${key}" has an undefined value in the component definition. ` +
          `Did you reference the function correctly?`,
          vm
        )
      }
      /* 判断props中时候定义了同名的属性 */
      if (props && hasOwn(props, key)) {
        warn(
          `method "${key}" has already been defined as a prop.`,
          vm
        )
      }
    }
  }
}

function initWatch(vm: Component, watch: Object) {
  process.env.NODE_ENV !== 'production' && checkOptionType(vm, 'watch')
  for (const key in watch) {
    const handler = watch[key]
    if (Array.isArray(handler)) {
      for (let i = 0; i < handler.length; i++) {
        createWatcher(vm, key, handler[i])
      }
    } else {
      createWatcher(vm, key, handler)
    }
  }
}

function createWatcher(vm: Component,
                       keyOrFn: string | Function,
                       handler: any,
                       options?: Object) {
  if (isPlainObject(handler)) {
    options = handler
    handler = handler.handler
  }
  if (typeof handler === 'string') {
    handler = vm[handler]
  }
  return vm.$watch(keyOrFn, handler, options)
}
/* 状态的合并 */
export function stateMixin(Vue: Class<Component>) {
  // flow somehow has problems with directly declared definition object
  // when using Object.defineProperty, so we have to procedurally build up
  // the object here.
  const dataDef = {}
  dataDef.get = function () {
    return this._data
  }
  const propsDef = {}
  propsDef.get = function () {
    return this._props
  }
  if (process.env.NODE_ENV !== 'production') {
    dataDef.set = function (newData: Object) {
      warn(
        'Avoid replacing instance root $data. ' +
        'Use nested data properties instead.',
        this
      )
    }
    propsDef.set = function () {
      warn(`$props is readonly.`, this)
    }
  }
  /* 将data绑定到vm实例的$data属性上具有get属性 */
  Object.defineProperty(Vue.prototype, '$data', dataDef)
  /* 将props绑定到vm实例的$props属性上具有get属性 */
  Object.defineProperty(Vue.prototype, '$props', propsDef)
  /* 设置实例的set方法 */
  Vue.prototype.$set = set
  /* 设置实例的del方法 */
  Vue.prototype.$delete = del
  /* 定义watch函数 */
  Vue.prototype.$watch = function (expOrFn: string | Function,
                                   cb: any,
                                   options?: Object): Function {
    const vm: Component = this
    if (isPlainObject(cb)) {
      return createWatcher(vm, expOrFn, cb, options)
    }
    options = options || {}
    options.user = true
    const watcher = new Watcher(vm, expOrFn, cb, options)
    if (options.immediate) {
      cb.call(vm, watcher.value)
    }
    return function unwatchFn() {
      watcher.teardown()
    }
  }
}
