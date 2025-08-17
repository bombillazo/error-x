export type ErrorMetadata = Record<string, unknown>

export enum ErrorUIMode {
  MODAL = 'modal',
  TOAST = 'toast',
  INLINE = 'inline',
  BANNER = 'banner',
  NONE = 'none'
}

export type ErrorHandlingOptions = {
  logout?: boolean
  redirect?: string
  ui_mode?: ErrorUIMode
}

export type ErrorXOptions = {
  message?: string
  name?: string
  code?: string | number
  uiMessage?: string
  cause?: Error | unknown
  metadata?: ErrorMetadata
  handlingOptions?: ErrorHandlingOptions
}

export type SerializableError = {
  name: string
  message: string
  code: string
  uiMessage: string
  stack?: string
  metadata: ErrorMetadata
  timestamp: string
  handlingOptions?: ErrorHandlingOptions
  cause?: SerializableError
}
