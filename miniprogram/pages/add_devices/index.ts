// import {BluetoothDevices} from '@/utils/bluetooth_devices'
import {BaseCallBack, BaseProps} from '../../global/interface'
import {connectPage} from '../../libs/redux-tools'
import {ConnectState} from '../../store'
import {TEST_ERROR, TEST_SUCCESS} from '../../store/actionTypes'

const getStateMap = (state: ConnectState) => {
  const {baseReducer} = state
  return {userName: baseReducer.name}
}

type Pages = BaseProps & {clickMe: BaseCallBack}

const page: Pages = {
  onLoad() {
    // console.warn('page load', this)
  },
  data: {},
  clickMe() {
    // const blueTooth = new BluetoothDevices({})
    // blueTooth.connect('CS_BLECE27')
    // 同步
    this.dispatch?.({type: TEST_SUCCESS})

    // 异步
    this.dispatch?.(d => {
      setTimeout(() => {
        d({type: TEST_ERROR, payload: {name: 'hello world!'}})
      }, 1000)
    })
  },
}

// Page(page)
Page(connectPage(getStateMap)(page))
