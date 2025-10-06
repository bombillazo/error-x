/**
 * Metadata object containing additional context information for an error.
 * Can store any key-value pairs to provide extra debugging or business context.
 *
 * Users can use metadata to store application-specific behavior instructions if needed:
 * ```typescript
 * const metadata = {
 *   userId: 123,
 *   operation: 'fetchUser',
 *   retryCount: 3,
 *   // Application-specific behavior can be stored here:
 *   shouldNotify: true,
 *   notifyTargets: ['toast', 'banner'],
 *   redirectTo: '/login'
 * }
 * ```
 *
 * @public
 */
export type ErrorXMetadata = Record<string, unknown>;

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
  'type',
  'docsUrl',
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
 *
 * // ✅ Works - with type-safe metadata
 * type MyMeta = { userId: number; action: string };
 * new ErrorX<MyMeta>({ metadata: { userId: 123, action: 'login' } })
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
export type ErrorXOptions<TMetadata extends ErrorXMetadata = ErrorXMetadata> = {
  /** Technical error message (default: 'An error occurred') */
  message?: string;
  /** Error type/name (default: 'Error') */
  name?: string;
  /** Error identifier code (auto-generated from name if not provided) */
  code?: string | number;
  /** User-friendly message for UI display */
  uiMessage?: string | undefined;
  /** Original error that caused this error (preserves error chain, will be converted to ErrorXCause format) */
  cause?: ErrorXCause | Error | unknown;
  /** Additional context and debugging information */
  metadata?: TMetadata | undefined;
  /** Error type for categorization */
  type?: string | undefined;
  /** Documentation URL for this specific error */
  docsUrl?: string | undefined;
  /** Where the error originated (service name, module, component) */
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
 *   timestamp: 1705315845123,
 *   cause: {
 *     name: 'NetworkError',
 *     message: 'Request timeout.',
 *     stack: '...'
 *   },
 *   docsUrl: 'https://docs.example.com/errors#auth-failed',
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
  /** Unix epoch timestamp (milliseconds) when error was created */
  timestamp: number;
  /** Simplified cause error (for error chaining) */
  cause?: ErrorXCause;
  /** Error type for categorization */
  type?: string;
  /** Documentation URL for this error */
  docsUrl?: string;
  /** Where the error originated */
  source?: string;
};
