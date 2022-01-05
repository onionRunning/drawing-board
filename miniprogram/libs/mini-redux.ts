const INIT = '00000000'
interface StateTree {
  [p: string]: object
}

type CallBack = (s: (l: Action<unknown>) => void) => void

export type Action<T> = {
  type: string
  payload?: any | T
}

export type Dispatch = (a: Action<unknown> | CallBack) => void

export const createStore = function store(reducers: any, middleware?: any[]) {
  const stateTree: StateTree = {}
  const listern: any[] = []
  const initState = () => {
    for (const keys in reducers) {
      if (Object.prototype.hasOwnProperty.call(reducers, keys)) {
        stateTree[keys] = reducers[keys](undefined, {type: INIT})
      }
    }
  }
  initState() // 初始化

  const dispatch = (action: Action<unknown>) => {
    if (!action.type) throw new Error('定义的action需要有type')
    for (const keys in reducers) {
      if (Object.prototype.hasOwnProperty.call(reducers, keys)) {
        stateTree[keys] = reducers[keys](stateTree[keys], action)
      }
    }
    if (listern.length) {
      listern.forEach(fn => fn?.())
    }
  }
  // 拓展dispatch 功能
  const extendDispatch = (action: Action<unknown> | CallBack) => {
    const midi = applyMiddleware(...middleware!)
    midi(dispatch)(action)
  }
  // 核心 柯里化代码
  // 需要执行逻辑储存， 执行后需要释放掉
  const subscribe = (fn: (...s: any) => void) => {
    listern.push(fn)
    return () => {
      listern.pop()
    }
  }
  return {
    state: stateTree,
    getState: () => stateTree,
    dispatch: extendDispatch,
    subscribe,
  }
}
// 函数柯里化
const applyMiddleware = (...arg: any) => {
  const temp = arg.slice() as any[]
  if (temp.length === 1) return temp[0]
  return temp.reduce((a, b) => {
    return (...args: any) => a(b(...args))
  })
}
