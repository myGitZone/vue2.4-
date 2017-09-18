/* @flow */

import config from '../config'
import { initUse } from './use'
import { initMixin } from './mixin'
import { initExtend } from './extend'
import { initAssetRegisters } from './assets'
import { set, del } from '../observer/index'
import { ASSET_TYPES } from 'shared/constants'
import builtInComponents from '../components/index'

import {
  warn,
  extend,
  nextTick,
  mergeOptions,
  defineReactive
} from '../util/index'

export function initGlobalAPI (Vue: GlobalAPI) {
  // config
  /* 新建配置对象 */
  const configDef = {}
  /* 绑定静态的get函数，该函数返回config.js中的配置项 */
  configDef.get = () => config
  if (process.env.NODE_ENV !== 'production') {
    configDef.set = () => {
      warn(
        'Do not replace the Vue.config object, set individual fields instead.'
      )
    }
  }
  /* 给congig绑定到Vue上，作为静态属性，响应式的，有get属性 */
  Object.defineProperty(Vue, 'config', configDef)

  // exposed util methods.
  // NOTE: these are not considered part of the public API - avoid relying on
  // them unless you are aware of the risk.
  Vue.util = {
    warn,
    extend,
    mergeOptions,
    defineReactive
  }
  /* 全局的set方法 */
  Vue.set = set
  Vue.delete = del
  /* 全局的nextTick方法 */
  Vue.nextTick = nextTick
  /* 给全局options创建一个空对象 */
  Vue.options = Object.create(null)
  /* 遍历声明周期，并对其赋初值。是一个空对象 */
  ASSET_TYPES.forEach(type => {
    Vue.options[type + 's'] = Object.create(null)
  })

  // this is used to identify the "base" constructor to extend all plain-object
  // components with in Weex's multi-instance scenarios.
  Vue.options._base = Vue
  /* Vue的全局components继承builtInComponents */
  extend(Vue.options.components, builtInComponents)
  /* 初始化Vue的use */
  initUse(Vue)
  /* 初始化Vue的mixin */
  initMixin(Vue)
  /* 初始化extend函数 */
  initExtend(Vue)
  /* 全局的生命周期函数初始化 */
  initAssetRegisters(Vue)
}
