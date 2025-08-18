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
 */
export type ErrorMetadata = Record<string, any>

/**
 * Predefined display targets for error notifications and UI feedback.
 * These enum values provide consistent, type-safe options for where errors should be displayed.
 */
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

/**
 * Predefined error actions that can be performed when an error occurs.
 */
/**
 * Action to display notifications in specified UI targets.
 * Used to notify applications to handle error messages through the indicated display mechanisms.
 * 
 * @example
 * ```typescript
 * {
 *   action: 'NOTIFY',
 *   payload: {
 *     targets: [HandlingTargets.TOAST, 'custom-sidebar'],
 *     title: 'Error occurred',
 *     duration: 5000
 *   }
 * }
 * ```
 */
export type NotifyAction = {
  action: 'NOTIFY'
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
 *   action: 'LOGOUT',
 *   payload: {
 *     clearStorage: true,
 *     redirectURL: '/login'
 *   }
 * }
 * ```
 */
export type LogoutAction = {
  action: 'LOGOUT'
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
 *   action: 'REDIRECT',
 *   payload: {
 *     redirectURL: '/login',
 *     delay: 2000,
 *     replace: true,
 *   }
 * }
 * ```
 */
export type RedirectAction = {
  action: 'REDIRECT'
  payload: {
    redirectURL: string
    [key: string]: any
  }
}

/**
 * Generic action type for custom application-specific actions.
 * Allows defining any custom action with flexible payload structure.
 * 
 * @example
 * ```typescript
 * {
 *   action: 'track-analytics',
 *   payload: {
 *     event: 'error_occurred',
 *     severity: 'high',
 *     category: 'authentication'
 *   }
 * }
 * 
 * {
 *   action: 'show-help-modal',
 *   payload: {
 *     helpId: 'payment-error-help',
 *     category: 'billing'
 *   }
 * }
 * ```
 */
export type GenericAction = {
  action: string
  payload?: Record<string, any>
}

/**
 * Union type of all possible actions - predefined and custom
 */
export type ErrorAction = NotifyAction | LogoutAction | RedirectAction | GenericAction

/**
 * Configuration options for creating an ErrorX instance.
 * All properties are optional with sensible defaults.
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
  /** Additional context and debugging information (default: {}) */
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
 *     { action: 'LOGOUT', payload: { clearStorage: true } }
 *   ],
 *   cause: {
 *     name: 'NetworkError',
 *     message: 'Request timeout.',
 *     code: 'NETWORK_TIMEOUT',
 *     // ... other error properties
 *   }
 * }
 * ```
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
  metadata: ErrorMetadata
  /** ISO timestamp when error was created */
  timestamp: string
  /** Actions to perform when this error occurs */
  actions?: ErrorAction[]
  /** Serialized cause error (for error chaining) */
  cause?: SerializableError
}
