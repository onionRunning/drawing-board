import {createStore} from '../libs/mini-redux'
import {thunkMiddle, use} from '../libs/redux-tools'
import getUserMsg, {UserState} from './user/index'

const initReducer = {
  baseReducer: getUserMsg,
}

export interface ConnectState {
  baseReducer: UserState
}

const Store = createStore(initReducer, [thunkMiddle])
export default Store
export type Reducer = typeof initReducer
// 初始化store
use(Store)
