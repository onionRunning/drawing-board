import {Action, createStore} from './mini-redux'

interface BaseMapping {
  [p: string]: string | BaseMapping
}
const shallowDiffData = (data: any, stateMap: any) => {
  if (!Boolean(Object.prototype.toString.call(data) === '[object Object]')) return false
  const newMap: BaseMapping = {}
  let hasDiff = false
  for (const key in stateMap) {
    if (stateMap[key] !== data[key]) {
      hasDiff = true
      newMap[key] = stateMap[key]
    }
  }
  return hasDiff && newMap
}
type BaseCallBack = (...s: any) => any

// thunk 中间件
export const thunkMiddle = (next: (arg0: any) => any) => {
  return (action: (arg0: any) => any | Action<unknown>) => {
    if (typeof action === 'function') {
      return action(next)
    }
    return next(action)
  }
}

let store = {} as Partial<ReturnType<typeof createStore>>
// connect 传输数据 更新小程序ui视图 connect connectComponent
export const connectPage = (mapStateToData: BaseCallBack, mapMethodToPage?: BaseCallBack) => {
  return (pageObject: any) => {
    const dataMap = mapStateToData ? mapStateToData(store.getState!()) : {}
    if (!pageObject.data) pageObject.data = {}
    // reducer 数据挂载到 data上
    for (const dataKey in dataMap) {
      if (Object.prototype.hasOwnProperty.call(dataMap, dataKey)) {
        pageObject.data[dataKey] = dataMap[dataKey]
      }
    }
    // 挂载dispatch方法 要是在page下没有申明也可以直接用 this.dispatch 去执行dispatch方法
    if (pageObject.props) {
      pageObject.props.dispatch = store.dispatch
    }
    pageObject.dispatch = store.dispatch
    const methodMap = mapMethodToPage ? mapMethodToPage(store.dispatch, store.getState!()) : {}
    // 直接将要执行的方法挂载到 this上
    for (const methodKey in methodMap) {
      if (Object.prototype.hasOwnProperty.call(methodMap, methodKey) && pageObject.props) {
        pageObject.props[methodKey] = methodMap[methodKey]
      }
    }
    const onLoad = pageObject.onLoad
    const onUnload = pageObject.onUnload
    let unsubscribe: any = () => void 0
    pageObject.onLoad = function (options: any) {
      const updateData = () => {
        const stateMap = shallowDiffData(this.data, mapStateToData(store.getState!()))
        if (stateMap) {
          // 触发小程序ui视图更新的逻辑
          this.setData(stateMap)
        }
      }
      updateData()
      unsubscribe = store.subscribe!(updateData)
      if (onLoad) {
        onLoad.call(this, options)
      }
    }
    pageObject.onUnload = () => {
      if (unsubscribe) {
        unsubscribe()
      }
      if (onUnload) {
        onUnload.call(this)
      }
    }
    return pageObject
  }
}

// connect 组件
export function connectComponent(mapStateToData: BaseCallBack, mapMethodToPage?: BaseCallBack) {
  return (componentObject: any) => {
    const dataMap = mapStateToData ? mapStateToData(store.getState?.()) : {}
    if (!componentObject.data) componentObject.data = {}
    for (const dataKey in dataMap) {
      if (componentObject.data.hasOwnProperty(dataKey)) {
        componentObject.data[dataKey] = dataMap[dataKey]
      }
    }
    // map method to component
    const methodMap = mapMethodToPage ? mapMethodToPage(store.dispatch, store.getState?.()) : {}
    if (!componentObject.methods) componentObject.methods = {}
    for (const methodKey in methodMap) {
      if (componentObject.hasOwnProperty(methodKey)) {
        componentObject.methods[methodKey] = methodMap[methodKey]
      }
    }
    const attached =
      (componentObject.lifetimes && componentObject.lifetimes.attached) || componentObject.attached

    const detached =
      (componentObject.lifetimes && componentObject.lifetimes.detached) || componentObject.detached

    let unsubscribe: any = null

    const attachedCache = function (this: any) {
      const updateData = () => {
        const stateMap = shallowDiffData(this.data, mapStateToData(store.getState?.()))
        if (stateMap) this.setData(stateMap)
      }
      updateData()
      unsubscribe = store.subscribe?.(updateData)
      if (attached) attached.call(this)
    }

    const detachedCache = function (this: any) {
      if (unsubscribe) {
        unsubscribe()
      }
      if (detached) {
        detached.call(this)
      }
    }

    /**
     * 兼容2.2.3以下版本
     */
    if (componentObject.lifetimes && componentObject.lifetimes.attached) {
      componentObject.lifetimes.attached = attachedCache
    } else {
      componentObject.attached = attachedCache
    }
    if (componentObject.lifetimes && componentObject.lifetimes.detached) {
      componentObject.lifetimes.detached = detachedCache
    } else {
      componentObject.detached = detachedCache
    }
    return componentObject
  }
}

export const use = (s: any) => {
  store = s
}
