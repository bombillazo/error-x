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
export type ErrorXMetadata = Record<string, any>;

/**
 * Action to display notifications in specified UI targets.
 * Used to notify applications to handle error messages through the indicated display mechanisms.
 *
 * @example
 * ```typescript
 * {
 *   action: 'notify',
 *   targets: ['toast', 'custom-sidebar'],
 *   title: 'Error occurred',
 *   duration: 5000
 * }
 * ```
 *
 * @public
 */
export type ErrorXActionNotify = {
  action: 'notify';
  targets: string[];
  [key: string]: any;
};

/**
 * Action to log out the current user when an error occurs.
 * Useful for authentication errors or session expiration.
 *
 * @example
 * ```typescript
 * {
 *   action: 'logout',
 *   clearStorage: true,
 *   redirectURL: '/login'
 * }
 * ```
 *
 * @public
 */
export type ErrorXActionLogout = {
  action: 'logout';
  [key: string]: any;
};

/**
 * Action to redirect the user to a different URL when an error occurs.
 * Commonly used for navigation after authentication errors or access denied scenarios.
 *
 * @example
 * ```typescript
 * {
 *   action: 'redirect',
 *   redirectURL: '/login',
 *   delay: 2000,
 *   replace: true
 * }
 * ```
 *
 * @public
 */
export type ErrorXActionRedirect = {
  action: 'redirect';
  redirectURL: string;
  [key: string]: any;
};

/**
 * Custom action type for application-specific actions.
 * This type is essential for proper TypeScript discrimination in the ErrorAction union.
 * Without this, TypeScript cannot properly distinguish between predefined and custom actions.
 *
 * @example
 * ```typescript
 * {
 *   action: 'custom',
 *   type: 'analytics',
 *   event: 'error_occurred',
 *   category: 'authentication',
 *   severity: 'high'
 * }
 *
 * {
 *   action: 'custom',
 *   type: 'show-modal',
 *   modalId: 'error-modal',
 *   title: 'Error',
 *   message: 'Something went wrong'
 * }
 * ```
 *
 * @public
 */
export type ErrorXActionCustom = {
  action: 'custom';
  [key: string]: any;
};

/**
 * Union type of all possible error actions.
 * Includes predefined actions (NotifyAction, LogoutAction, RedirectAction)
 * and CustomAction for application-specific actions.
 *
 * @public
 */
export type ErrorXAction =
  | ErrorXActionNotify
  | ErrorXActionLogout
  | ErrorXActionRedirect
  | ErrorXActionCustom;

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
  'httpStatus',
  'type',
  'url',
  'href',
  'source',
] as const;

/**
 * Union type of all valid ErrorXOptions field names.
 *
 * @public
 */
export type ErrorXOptionField = (typeof ERROR_X_OPTION_FIELDS)[number];

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
  message?: string;
  /** Error type/name (default: 'Error') */
  name?: string;
  /** Error identifier code (auto-generated from name if not provided) */
  code?: string | number;
  /** User-friendly message for UI display (default: undefined) */
  uiMessage?: string | undefined;
  /** Original error that caused this error (preserves error chain) */
  cause?: Error | unknown;
  /** Additional context and debugging information (default: undefined) */
  metadata?: ErrorXMetadata;
  /** Actions to perform when this error occurs (default: undefined) */
  actions?: ErrorXAction[];
  /** HTTP status code (100-599) for HTTP-related errors (default: undefined) */
  httpStatus?: number | undefined;
  /** Error type for categorization (default: undefined) */
  type?: string | undefined;
  /** URL related to the error (API endpoint, page URL, resource URL) (default: undefined) */
  url?: string | undefined;
  /** Documentation URL for this specific error (default: undefined) */
  href?: string | undefined;
  /** Where the error originated (service name, module, component) (default: undefined) */
  source?: string | undefined;
};

/**
 * Simplified representation of an error cause for serialization.
 * Used to store error chain information without circular references.
 *
 * @public
 */
export type ErrorXCause = {
  /** Error message */
  message: string;
  /** Error name (optional) */
  name?: string;
  /** Stack trace (optional) */
  stack?: string;
};

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
 *     { action: 'logout', clearStorage: true }
 *   ],
 *   cause: {
 *     name: 'NetworkError',
 *     message: 'Request timeout.',
 *     stack: '...'
 *   },
 *   url: 'https://api.example.com/auth',
 *   href: 'https://docs.example.com/errors#auth-failed',
 *   source: 'auth-service'
 * }
 * ```
 *
 * @public
 */
export type ErrorXSerialized = {
  /** Error type/name */
  name: string;
  /** Technical error message */
  message: string;
  /** Error identifier code */
  code: string;
  /** User-friendly message for UI display */
  uiMessage: string | undefined;
  /** Stack trace (optional) */
  stack?: string;
  /** Additional context and debugging information */
  metadata: ErrorXMetadata | undefined;
  /** ISO timestamp when error was created */
  timestamp: string;
  /** Actions to perform when this error occurs */
  actions?: ErrorXAction[];
  /** Simplified cause error (for error chaining) */
  cause?: ErrorXCause;
  /** HTTP status code for HTTP-related errors */
  httpStatus?: number;
  /** Error type for categorization */
  type?: string;
  /** URL related to the error */
  url?: string;
  /** Documentation URL for this error */
  href?: string;
  /** Where the error originated */
  source?: string;
};
