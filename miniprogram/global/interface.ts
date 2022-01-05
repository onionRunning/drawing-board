import {Dispatch} from '@/libs/mini-redux'

export interface BaseProps {
  data?: BaseMapping

  dispatch?: Dispatch
  onLoad(): void
}

export type BaseCallBack = (...s: any) => any

export interface BaseMapping {
  [p: string]: string | BaseMapping
}
