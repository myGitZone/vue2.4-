/* @flow */

import { toArray } from '../util/index'

export function initUse (Vue: GlobalAPI) {
  /* Vue静态函数use，用来安装插件，plugin是一个函数，或者类，必须有install函数 */
  Vue.use = function (plugin: Function | Object) {
    /* 获取Vue是否已经保存了所有的插件到一个数组，如果没有，则初始化一个数组 */
    const installedPlugins = (this._installedPlugins || (this._installedPlugins = []))
    /* 如果该插件已经use使用，则直接返回 */
    if (installedPlugins.indexOf(plugin) > -1) {
      return this
    }
    /* 使用Vue.use的时候，可以传递参数，这里是获取参数 */
    // additional parameters
    const args = toArray(arguments, 1)
    /* 将Vue作为第一个参数传入 */
    args.unshift(this)
    if (typeof plugin.install === 'function') {
      /* 通过apply的方式调用该插件的install方法 */
      plugin.install.apply(plugin, args)
    } else if (typeof plugin === 'function')
      /* 如果插件本身就是一个插件，则直接调用 */
      plugin.apply(null, args)
    }
    /* 将该插件添加到插件数组中 */
    installedPlugins.push(plugin)
    return this
  }
}
