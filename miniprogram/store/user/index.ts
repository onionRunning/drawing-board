import {Action} from '../../libs/mini-redux'
import {TEST_INIT, TEST_SUCCESS, TEST_ERROR} from '../actionTypes'

const userState = {
  name: 'init or default',
}

export type UserState = typeof userState

const getUserMsg = (state = userState, action: Action<{test: string}>) => {
  switch (action.type) {
    case TEST_INIT:
      return {...state, name: 'init'}
    case TEST_SUCCESS:
      return {...state, name: 'success'}
    case TEST_ERROR:
      return {...state, ...action.payload}
    default:
      return {...state}
  }
}

export default getUserMsg
