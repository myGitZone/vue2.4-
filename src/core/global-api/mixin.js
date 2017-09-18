/* @flow */

import { mergeOptions } from '../util/index'

export function initMixin (Vue: GlobalAPI) {
  /* mixin函数绑定到Vue上，作为静态属性 */
  Vue.mixin = function (mixin: Object) {
    /* 调用mixin其实就是调用mergeOptions方法将要合并的项添加到Vue的配置项options上 */
    this.options = mergeOptions(this.options, mixin)
    return this
  }
}
