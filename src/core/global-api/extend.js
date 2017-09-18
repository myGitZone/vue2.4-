/* @flow */

import { ASSET_TYPES } from 'shared/constants'
import { warn, extend, mergeOptions } from '../util/index'
import { defineComputed, proxy } from '../instance/state'
/* 定义一个initExtend函数 */
export function initExtend (Vue: GlobalAPI) {
  /**
   * Each instance constructor, including Vue, has a unique
   * cid. This enables us to create wrapped "child
   * constructors" for prototypal inheritance and cache them.
   */
  Vue.cid = 0
  let cid = 1

  /**
   * Class inheritance
   */
  /* 给Vue绑定静态的extend函数 */
  Vue.extend = function (extendOptions: Object): Function {
    /* 这里为了对传入的配置项进行处理，防止为空 */
    extendOptions = extendOptions || {}
    /* 定义父类变量，直接指向Vue */
    const Super = this
    /* 定义父类Vue的Id变量。 */
    const SuperId = Super.cid
    /* 判断合并的配置项是否有构造函数，如果没有，则赋值空对象 */
    const cachedCtors = extendOptions._Ctor || (extendOptions._Ctor = {})
    /* 判断构造的id是否存在，如果存在，则直接返回id */
    if (cachedCtors[SuperId]) {
      return cachedCtors[SuperId]
    }
    /* 如果配置项定义了name则使用配置项的，否则使用父类的 */
    const name = extendOptions.name || Super.options.name
    if (process.env.NODE_ENV !== 'production') {
      if (!/^[a-zA-Z][\w-]*$/.test(name)) {
        warn(
          'Invalid component name: "' + name + '". Component names ' +
          'can only contain alphanumeric characters and the hyphen, ' +
          'and must start with a letter.'
        )
      }
    }
    /* 这里是定义子组件的类，即Sub为子组件，这里就是自组件的构造函数，一会会直接当作返回值，Sub就是继承了Vue的组件类 */
    const Sub = function VueComponent (options) {
      this._init(options)
    }
    /* 经典的原型继承，继承父类的原型，使用Object.create，是为了创建一个实例，指向一个新的内存地址，下面可以直接修改该内存地址类的构造函数是Sub。否则的话将修改Vue的构造函数。 */
    Sub.prototype = Object.create(Super.prototype)
    /* 子类成了父类的原型，现在的constructor是指向的Vue。所以要修改为Sub */
    Sub.prototype.constructor = Sub
    /* 修改子类的唯一值Id */
    Sub.cid = cid++
    /* 子类的配置项合并，合并父类的配置项和传入的配置项 */
    Sub.options = mergeOptions(
      Super.options,
      extendOptions
    )
    /* 添加一个super属性到Sub的静态属性 */
    Sub['super'] = Super

    // For props and computed properties, we define the proxy getters on
    // the Vue instances at extension time, on the extended prototype. This
    // avoids Object.defineProperty calls for each instance created.
    /* 判断子类的配置项有没有传入的属性 */
    if (Sub.options.props) {
      /* 对props进行处理，绑定到Sub的原型 */
      initProps(Sub)
    }
    if (Sub.options.computed) {
      /* 对computed进行处理，绑定到Sub的原型 */
      initComputed(Sub)
    }

    // allow further extension/mixin/plugin usage
    /* 将一些全局api绑定到子类 */
    Sub.extend = Super.extend
    Sub.mixin = Super.mixin
    Sub.use = Super.use

    // create asset registers, so extended classes
    // can have their private assets too.
    /* 将父类的钩子函数绑到子类的静态属性上 */
    ASSET_TYPES.forEach(function (type) {
      Sub[type] = Super[type]
    })
    // enable recursive self-lookup
    if (name) {
      Sub.options.components[name] = Sub
    }

    // keep a reference to the super options at extension time.
    // later at instantiation we can check if Super's options have
    // been updated.
    Sub.superOptions = Super.options
    Sub.extendOptions = extendOptions
    Sub.sealedOptions = extend({}, Sub.options)

    // cache constructor
    cachedCtors[SuperId] = Sub
    return Sub
  }
}

function initProps (Comp) {
  /* 获取到传入的属性 */
  const props = Comp.options.props
  /* 将props传入的属性绑定到Sub的原型 */
  for (const key in props) {
    proxy(Comp.prototype, `_props`, key)
  }
}

function initComputed (Comp) {
  const computed = Comp.options.computed
  /* 将计算属性绑定到原型 */
  for (const key in computed) {
    defineComputed(Comp.prototype, key, computed[key])
  }
}
