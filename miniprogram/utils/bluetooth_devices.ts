type Cb = (...s: any) => void

// error: 错误监听 notify: value值 stateChange 状态发生改变时触发
type EventType = 'error' | 'notify' | 'stateChange'
interface MonitorFn {
  stateChange: Cb
  error: Cb
  notify: Cb
}
// 后面如果需要多个同时连接自行改造代码
export class BluetoothDevices {
  searchData: any[]
  monitorFn: Partial<MonitorFn> = {
    stateChange: () => void 0,
    error: () => void 0,
    notify: () => void 0,
  }
  deviceId = ''
  serviceId = ''
  uuId = ''
  deviceName = ''
  repeatNums: number
  // 连接状态
  connectStatus = 'false'
  maxRepeatNums = 3

  constructor({data, config}: any) {
    // 搜索的设备列表
    this.searchData = data || []
    // 重复请求次数 MAX = 3 请求后重置
    this.repeatNums = 0
    this.deviceName = config && config.name
    // 初始化蓝牙的连接状态
    this.getDevicesState()
    // 初始化监听值的变化
    this.getDeviceNotifyValue()
  }
  // 初始化蓝牙设备
  init = () => {
    // 打开蓝牙适配器
    wx.openBluetoothAdapter({
      success: () => {
        console.warn('打开适配器成功!')
        this.checkBluetooth()
      },
      fail: () => {
        console.warn('打开适配器失败!')
        // wx.showToast({ title: '请检查蓝牙是否打开!' })
      },
    })
  }
  // 检查蓝牙是否能用
  checkBluetooth = (isOnlyCheck?: boolean) => {
    wx.getBluetoothAdapterState({
      success: () => {
        console.warn('当前蓝牙是可用状态!')
        if (!isOnlyCheck) {
          this.startSearchDevices()
        }
      },
      fail: () => {
        console.warn('检测本机蓝牙是否可用失败！')
        wx.showToast({title: '请检查蓝牙是否打开!'})
      },
    })
  }
  // string 转 arraybuffer unit8Array
  hexStringToArrayBuffer = (str: string) => {
    if (!str) return new ArrayBuffer(0)
    const buffer = new ArrayBuffer(str.length)
    const dataView = new DataView(buffer)
    let ind = 0
    for (let i = 0, len = str.length; i < len; i += 2) {
      const code = parseInt(str.substr(i, 2), 16)
      dataView.setUint8(ind, code)
      ind++
    }
    return buffer
  }
  // 暂时不考虑 多台设备连接的问题, 只允许连接一台设备
  /**
   *
   * @param sn 连接蓝牙设备唯一标示
   */
  connect = (sn: string) => {
    this.deviceName = sn
    this.init()
  }
  disconnect = () => {
    this.closeCollection(true)
  }
  // 开启事件监听
  on = (key: EventType, fn: (...v: any) => void) => {
    this.monitorFn[key] = fn
  }

  // 手动触发重连
  handTryConnect = () => {
    this.repeatNums = 0
    this.closeCollection()
  }

  // fetch 发起请求
  fetch = (params: any, fetchFn: (...s: any) => void) => {
    this.sendDevicesData(params, fetchFn)
  }

  // 开始搜索设备
  private readonly startSearchDevices = () => {
    wx.startBluetoothDevicesDiscovery({
      services: [],
      allowDuplicatesKey: false,
      interval: 0,
      success: () => {
        console.warn('开始搜索设备!')
        this.getBluetoothDevices()
      },
      fail: () => {
        console.warn('搜索蓝牙失败!')
      },
    })
  }
  // 获取蓝牙设备列表
  private readonly getBluetoothDevices = () => {
    console.warn('我正在进行搜索!')
    wx.getBluetoothDevices({
      success: res => {
        // 什么都搜不到 就递归重新搜索 比较费电
        console.warn('搜索的内容', res)
        if (res.devices.length === 0) {
          this.getBluetoothDevices()
        }
        const choseInfo = res.devices.filter(i => i.name)[0] || {}
        // update deviced
        this.deviceId = choseInfo.deviceId
        if (choseInfo && choseInfo.deviceId) {
          setTimeout(() => {
            this.collectToDevices()
          }, 2000)
          this.stopSearchDevices()
        }
      },
      fail: res => {
        console.warn(res, '获取蓝牙设备列表失败=====')
      },
    })
  }
  // 连接设备
  private readonly collectToDevices = () => {
    // 由于android端获取的mac地址, ios 不能直接用拿到的数据, 所以ios 需要兼容转换。(蓝牙设备信息需要转换)
    wx.createBLEConnection({
      deviceId: this.deviceId,
      success: rr => {
        console.warn(rr, '创建连接成功！')
        this.getDeviceServices()
      },
      fail: r => {
        console.warn('创建连接失败！', r)
        this.closeAdapter()
      },
    })
  }
  // 小程序停止搜索蓝牙
  private readonly stopSearchDevices = () => {
    wx.stopBluetoothDevicesDiscovery({
      success(res) {
        console.warn(res, '蓝牙停止搜索成功!')
      },
      fail: r => {
        console.warn('停止搜索失败!')
        this.sendError(r)
      },
    })
  }
  // 获取设备服务信息
  private readonly getDeviceServices = () => {
    wx.getBLEDeviceServices({
      deviceId: this.deviceId,
      success: res => {
        this.searchData = res.services
        // 找到指定主服务 (uuid) :TODO
        this.serviceId = res.services[0].uuid
        this.getDeviceCharacteristics()
      },
      fail: r => {
        console.warn('获取设备服务信息失败')
        this.sendError(r)
      },
    })
  }
  // 获取特征值信息
  private readonly getDeviceCharacteristics = () => {
    wx.getBLEDeviceCharacteristics({
      deviceId: this.deviceId,
      serviceId: this.serviceId,
      success: res => {
        // 获取特征值id
        console.warn('打印当前特征值', res)
        const supportNotify = res.characteristics.filter(item => item.properties.notify)
        this.uuId = supportNotify.length > 0 ? supportNotify[0].uuid : ''
        if (this.uuId) {
          this.startNotifyCharacteristicValueChange()
        } else {
          wx.showToast({title: '当前蓝牙不支持监听!'})
        }
      },
      fail: r => {
        this.sendError(r)
      },
    })
  }
  // 发起notify通知
  private readonly startNotifyCharacteristicValueChange = () => {
    wx.notifyBLECharacteristicValueChange({
      state: true,
      deviceId: this.deviceId,
      serviceId: this.serviceId,
      characteristicId: this.uuId,
      success: () => {
        console.warn('开始监听! 数据变化!')
      },
      fail: r => {
        console.warn(r, '启用低功耗蓝牙设备监听失败')
        this.sendError(r)
      },
    })
  }
  // 获取蓝牙设备的连接状态
  private readonly getDevicesState = () => {
    wx.onBLEConnectionStateChange(res => {
      this.connectStatus = res.connected ? 'success' : 'fail'
      console.warn(res, '打印当前蓝牙设备的连接状态!')
      // if (res.connected === false) {
      //   this.closeCollection()
      // }
      this.monitorFn.stateChange!(res.connected)
    })
  }
  // 关闭适配器
  private readonly closeAdapter = (isOnlyClose?: boolean) => {
    wx.closeBluetoothAdapter({
      success: () => {
        console.warn('关闭适配器成功!')
        if (isOnlyClose) return
        this.tryConnect()
      },
      fail: err => {
        console.warn('关闭适配器失败!')
        this.sendError(err)
        if (isOnlyClose) return
        this.tryConnect()
      },
    })
  }
  // 关闭蓝牙以及断开连接
  private readonly closeCollection = (isOnlyClose?: boolean) => {
    console.warn('我在关闭蓝牙连接!')
    wx.closeBLEConnection({
      deviceId: this.deviceId,
      success: () => {
        this.closeAdapter(isOnlyClose)
        console.warn('关闭蓝牙成功!')
      },
      fail: err => {
        this.closeAdapter(isOnlyClose)
        console.warn('关闭蓝牙连接失败!')
        this.sendError(err)
      },
    })
  }

  private readonly tryConnect = () => {
    // 开始进行重连
    if (this.repeatNums < this.maxRepeatNums) {
      this.repeatNums = this.repeatNums + 1
      this.init()
    }
  }

  // 向蓝牙设备发送写的逻辑
  private readonly sendDevicesData = (str: string, fn?: (...s: any) => void) => {
    // 只有这样才允许发送 写的逻辑
    if (this.deviceId && this.serviceId && this.uuId) {
      wx.writeBLECharacteristicValue({
        deviceId: this.deviceId,
        serviceId: this.serviceId,
        characteristicId: this.uuId,
        value: this.hexStringToArrayBuffer(str),
        success: () => {
          console.warn('发送数据成功!')
          if (!fn) return
          fn()
        },
        fail: err => {
          console.warn(err, '向蓝牙写入数据失败!')
          this.sendError(err)
        },
      })
    }
  }

  // 获取监听特征值的改变
  private readonly getDeviceNotifyValue = () => {
    wx.onBLECharacteristicValueChange(res => {
      console.warn(this.abToString(res.value), '传输的值是多少!')
      // fn(this.abToString(res.value))
      this.monitorFn.notify!(this.abToString(res.value))
    })
  }

  // buffer 转换成字符串
  private readonly abToString = (buffer: any) => {
    return new Uint8Array(buffer)
      .map((bit: number) => {
        return `00${bit.toString(16)}`.slice(-2) as any
      })
      .join('')
  }
  private readonly sendError = (err: any) => {
    this.monitorFn.error!(err)
  }
}

// ps. 注意事件触发需要防抖
