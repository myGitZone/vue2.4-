/* @flow */

import {
  tip,
  toArray,
  hyphenate,
  handleError,
  formatComponentName
} from '../util/index'
import { updateListeners } from '../vdom/helpers/index'

export function initEvents (vm: Component) {
  /* 在vm上创建一个_events对象，用来存放事件 */
  vm._events = Object.create(null)
  /* 这个bool标志位来表明是否存在钩子，而不需要通过哈希表的方法来查找是否有钩子，这样做可以减少不必要的开销，优化性能 */
  vm._hasHookEvent = false
  // init parent attached events
  /* 初始化父组件attach的事件 */
  const listeners = vm.$options._parentListeners
  if (listeners) {
    updateComponentListeners(vm, listeners)
  }
}

let target: Component

function add (event, fn, once) {
  if (once) {
    target.$once(event, fn)
  } else {
    target.$on(event, fn)
  }
}

function remove (event, fn) {
  target.$off(event, fn)
}

export function updateComponentListeners (
  vm: Component,
  listeners: Object,
  oldListeners: ?Object
) {
  target = vm
  updateListeners(listeners, oldListeners || {}, add, remove, vm)
}
/* 事件的合并 */
export function eventsMixin (Vue: Class<Component>) {
  const hookRE = /^hook:/
  /* 这里实现$on对事件的监听的方法 */
  Vue.prototype.$on = function (event: string | Array<string>, fn: Function): Component {
    const vm: Component = this
    /* 判断时间event名是不是一个数组，如果是个数组，则遍历递归进行事件的监听 */
    if (Array.isArray(event)) {
      for (let i = 0, l = event.length; i < l; i++) {
        this.$on(event[i], fn)
      }
    } else {
      /* 如果是是字符串，则进行判断，在实例的_events对象中个是否已经有该事件的监听，如果有push，没有的话，则初始化一个数组，在进行push */
      (vm._events[event] || (vm._events[event] = [])).push(fn)
      // optimize hook:event cost by using a boolean flag marked at registration
      // instead of a hash lookup
      /* 判断是否为钩子函数，如果是，则标记为true */
      if (hookRE.test(event)) {
        vm._hasHookEvent = true
      }
    }
    return vm
  }
  /* 这里实现$noce对事件的监听的方法 */
  Vue.prototype.$once = function (event: string, fn: Function): Component {
    const vm: Component = this
    /* 定义一个on函数，此函数为一个闭包函数 */
    function on () {
      /* 因为是只是执行一次，则在执行前，将该监听从监听队列中移除 */
      vm.$off(event, on)
      /* 执行监听函数 */
      fn.apply(vm, arguments)
    }
    /* on的静态函数，fn */
    on.fn = fn
    /* 给事件监听绑定函数on */
    vm.$on(event, on)
    return vm
  }
  /* 移除事件监听 */
  Vue.prototype.$off = function (event?: string | Array<string>, fn?: Function): Component {
    const vm: Component = this
    // all  如果没有传参，则表示移除所有的监听
    if (!arguments.length) {
      /* 这里直接给监听事件对象赋值新对象 */
      vm._events = Object.create(null)
      return vm
    }
    // array of events  如果是一个数组的话，则遍历数组，递归进行移除事件的监听
    if (Array.isArray(event)) {
      for (let i = 0, l = event.length; i < l; i++) {
        this.$off(event[i], fn)
      }
      return vm
    }
    // specific event 如果是字符串，则单个移除，获取到该事件所有的监听函数
    const cbs = vm._events[event]
    /* 如果函数为空，或者不存在，则不进行下面的操作 */
    if (!cbs) {
      return vm
    }
    /* 如果只是传入一个参数，即只是移除对某一事件的监听，则清空所有事件监听函数，即赋值为null */
    if (arguments.length === 1) {
      vm._events[event] = null
      return vm
    }
    // specific handler
    let cb
    let i = cbs.length
    /* 遍历所有事件，进行判断，当等于要移除的函数的时候，进行删除操作 */
    while (i--) {
      cb = cbs[i]
      if (cb === fn || cb.fn === fn) {
        cbs.splice(i, 1)
        break
      }
    }
    return vm
  }
  /* 事件的触发 */
  Vue.prototype.$emit = function (event: string): Component {
    const vm: Component = this
    if (process.env.NODE_ENV !== 'production') {
      /* 将字符串转为小写，然后进行判断，看是否有全小写的函数进行了监听，然后进行提示 */
      const lowerCaseEvent = event.toLowerCase()
      if (lowerCaseEvent !== event && vm._events[lowerCaseEvent]) {
        tip(
          `Event "${lowerCaseEvent}" is emitted in component ` +
          `${formatComponentName(vm)} but the handler is registered for "${event}". ` +
          `Note that HTML attributes are case-insensitive and you cannot use ` +
          `v-on to listen to camelCase events when using in-DOM templates. ` +
          `You should probably use "${hyphenate(event)}" instead of "${event}".`
        )
      }
    }
    /* 获取事件的函数 */
    let cbs = vm._events[event]
    /* 判断函数是否为空 */
    if (cbs) {
      /* 如果是函数组，则调用toArray函数，转换成函数的数组 */
      cbs = cbs.length > 1 ? toArray(cbs) : cbs
      /* 这里是获取传入的参数 */
      const args = toArray(arguments, 1)
      /* 遍历函数数组，并执行函数 */
      for (let i = 0, l = cbs.length; i < l; i++) {
        try {
          cbs[i].apply(vm, args)
        } catch (e) {
          handleError(e, vm, `event handler for "${event}"`)
        }
      }
    }
    return vm
  }
}
