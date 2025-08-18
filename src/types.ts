export type ErrorMetadata = Record<string, any>

export enum HandlingTargets {
  MODAL = 'modal',
  TOAST = 'toast',
  INLINE = 'inline',
  BANNER = 'banner',
  CONSOLE = 'console',
  LOGGER = 'logger',
  NOTIFICATION = 'notification'
}

/**
 * Display target type that allows both predefined enum values and custom strings.
 * This enables flexibility for custom UI components while providing standard options.
 * 
 * @example
 * ```typescript
 * // Using predefined enum values
 * targets: [HandlingTargets.MODAL, HandlingTargets.TOAST]
 * 
 * // Using custom strings
 * targets: ['custom-sidebar', 'my-notification-center']
 * 
 * // Mixing both
 * targets: [HandlingTargets.MODAL, 'custom-popup', HandlingTargets.CONSOLE]
 * ```
 */
export type HandlingTarget = HandlingTargets | string

export type ErrorHandlingOptions = {
  logout?: boolean
  redirect?: string
  targets?: HandlingTarget[]
}

export type ErrorXOptions = {
  message?: string
  name?: string
  code?: string | number
  uiMessage?: string | undefined
  cause?: Error | unknown
  metadata?: ErrorMetadata
  handlingOptions?: ErrorHandlingOptions | undefined
}

export type SerializableError = {
  name: string
  message: string
  code: string
  uiMessage: string | undefined
  stack?: string
  metadata: ErrorMetadata
  timestamp: string
  handlingOptions?: ErrorHandlingOptions | undefined
  cause?: SerializableError
}
