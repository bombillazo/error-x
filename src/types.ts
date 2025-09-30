/**
 * Metadata object containing additional context information for an error.
 * Can store any key-value pairs to provide extra debugging or business context.
 *
 * @example
 * ```typescript
 * const metadata: ErrorMetadata = {
 *   userId: 123,
 *   operation: 'fetchUser',
 *   retryCount: 3
 * }
 * ```
 *
 * @public
 */
export type ErrorMetadata = Record<string, any>

/**
 * Predefined display targets for error notifications and UI feedback.
 * These enum values provide consistent, type-safe options for where errors should be displayed.
 *
 * @public
 */
export enum HandlingTargets {
  MODAL = 'modal',
  TOAST = 'toast',
  INLINE = 'inline',
  BANNER = 'banner',
  CONSOLE = 'console',
  LOGGER = 'logger',
  NOTIFICATION = 'notification',
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
 *
 * @public
 */
export type HandlingTarget = HandlingTargets | string

/**
 * Action to display notifications in specified UI targets.
 * Used to notify applications to handle error messages through the indicated display mechanisms.
 *
 * @example
 * ```typescript
 * {
 *   action: 'notify',
 *   payload: {
 *     targets: [HandlingTargets.TOAST, 'custom-sidebar'],
 *     title: 'Error occurred',
 *     duration: 5000
 *   }
 * }
 * ```
 *
 * @public
 */
export type NotifyAction = {
  action: 'notify'
  payload: {
    targets: HandlingTarget[]
    [key: string]: any
  }
}

/**
 * Action to log out the current user when an error occurs.
 * Useful for authentication errors or session expiration.
 *
 * @example
 * ```typescript
 * {
 *   action: 'logout',
 *   payload: {
 *     clearStorage: true,
 *     redirectURL: '/login'
 *   }
 * }
 * ```
 *
 * @public
 */
export type LogoutAction = {
  action: 'logout'
  payload?: {
    [key: string]: any
  }
}

/**
 * Action to redirect the user to a different URL when an error occurs.
 * Commonly used for navigation after authentication errors or access denied scenarios.
 *
 * @example
 * ```typescript
 * {
 *   action: 'redirect',
 *   payload: {
 *     redirectURL: '/login',
 *     delay: 2000,
 *     replace: true,
 *   }
 * }
 * ```
 *
 * @public
 */
export type RedirectAction = {
  action: 'redirect'
  payload: {
    redirectURL: string
    [key: string]: any
  }
}

/**
 * Custom action type for application-specific actions.
 * This type is essential for proper TypeScript discrimination in the ErrorAction union.
 * Without this, TypeScript cannot properly distinguish between predefined and custom actions.
 *
 * @example
 * ```typescript
 * {
 *   action: 'custom',
 *   payload: {
 *     type: 'analytics',
 *     event: 'error_occurred',
 *     category: 'authentication',
 *     severity: 'high'
 *   }
 * }
 *
 * {
 *   action: 'custom',
 *   payload: {
 *     type: 'show-modal',
 *     modalId: 'error-modal',
 *     title: 'Error',
 *     message: 'Something went wrong'
 *   }
 * }
 * ```
 *
 * @public
 */
export type CustomAction = {
  action: 'custom'
  payload?: Record<string, any>
}

/**
 * Union type of all possible error actions.
 * Includes predefined actions (NotifyAction, LogoutAction, RedirectAction)
 * and CustomAction for application-specific actions.
 *
 * @public
 */
export type ErrorAction = NotifyAction | LogoutAction | RedirectAction | CustomAction

/**
 * Array of valid ErrorXOptions field names.
 * This serves as the single source of truth for both runtime validation and type checking.
 *
 * @internal
 */
export const ERROR_X_OPTION_FIELDS = [
  'message',
  'name',
  'code',
  'uiMessage',
  'cause',
  'metadata',
  'actions',
] as const

/**
 * Union type of all valid ErrorXOptions field names.
 *
 * @public
 */
export type ErrorXOptionField = (typeof ERROR_X_OPTION_FIELDS)[number]

/**
 * Configuration options for creating an ErrorX instance.
 * All properties are optional with sensible defaults.
 *
 * @remarks
 * **Note on design:** ErrorXOptions is a `type` instead of a `class` to provide maximum flexibility.
 * This allows you to pass plain objects without instantiation:
 *
 * ```typescript
 * // ✅ Works - plain object
 * new ErrorX({ message: 'Error', code: 'ERR' })
 *
 * // ✅ Works - object literal
 * const opts = { message: 'Error' }
 * new ErrorX(opts)
 * ```
 *
 * If ErrorXOptions were a class, you would need to instantiate it:
 *
 * ```typescript
 * // ❌ Would be required with class
 * new ErrorX(new ErrorXOptions({ message: 'Error' }))
 * ```
 *
 * The current `type` approach provides better ergonomics while still maintaining type safety.
 * The `isErrorXOptions()` validation method ensures only valid option objects are accepted.
 *
 * @public
 */
export type ErrorXOptions = {
  /** Technical error message (default: 'An error occurred') */
  message?: string
  /** Error type/name (default: 'Error') */
  name?: string
  /** Error identifier code (auto-generated from name if not provided) */
  code?: string | number
  /** User-friendly message for UI display (default: undefined) */
  uiMessage?: string | undefined
  /** Original error that caused this error (preserves error chain) */
  cause?: Error | unknown
  /** Additional context and debugging information (default: undefined) */
  metadata?: ErrorMetadata
  /** Actions to perform when this error occurs (default: undefined) */
  actions?: ErrorAction[]
}

/**
 * JSON-serializable representation of an ErrorX instance.
 * Used for transmitting errors over network or storing in databases.
 *
 * @example
 * ```typescript
 * const serialized: SerializableError = {
 *   name: 'AuthError',
 *   message: 'Authentication failed.',
 *   code: 'AUTH_FAILED',
 *   uiMessage: 'Please check your credentials',
 *   stack: 'Error: Authentication failed.\n    at login (auth.ts:42:15)',
 *   metadata: { userId: 123, loginAttempt: 3 },
 *   timestamp: '2024-01-15T10:30:45.123Z',
 *   actions: [
 *     { action: 'logout', payload: { clearStorage: true } }
 *   ],
 *   cause: {
 *     name: 'NetworkError',
 *     message: 'Request timeout.',
 *     code: 'NETWORK_TIMEOUT',
 *     // ... other error properties
 *   }
 * }
 * ```
 *
 * @public
 */
export type SerializableError = {
  /** Error type/name */
  name: string
  /** Technical error message */
  message: string
  /** Error identifier code */
  code: string
  /** User-friendly message for UI display */
  uiMessage: string | undefined
  /** Stack trace (optional) */
  stack?: string
  /** Additional context and debugging information */
  metadata: ErrorMetadata | undefined
  /** ISO timestamp when error was created */
  timestamp: string
  /** Actions to perform when this error occurs */
  actions?: ErrorAction[]
  /** Serialized cause error (for error chaining) */
  cause?: SerializableError
}
