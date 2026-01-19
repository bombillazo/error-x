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
  'httpStatus',
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
  /** HTTP status code associated with this error */
  httpStatus?: number | undefined;
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
 * Context passed to the transform function when creating errors via `.create()`.
 * Contains information about the preset being used.
 *
 * @public
 */
export type ErrorXTransformContext = {
  /** The preset key used (if any) */
  presetKey: string | number | undefined;
};

/**
 * Transform function signature for custom error classes.
 * Transforms options after merge but before instantiation.
 *
 * @public
 */
export type ErrorXTransform<TMetadata extends ErrorXMetadata = ErrorXMetadata> = (
  opts: ErrorXOptions<ErrorXMetadata>,
  ctx: ErrorXTransformContext
) => ErrorXOptions<TMetadata>;

/**
 * JSON-serializable representation of an ErrorX instance.
 * Used for transmitting errors over network or storing in databases.
 *
 * @example
 * ```typescript
 * const serialized: ErrorXSerialized = {
 *   name: 'AuthError',
 *   message: 'Authentication failed.',
 *   code: 'AUTH_FAILED',
 *   uiMessage: 'Please check your credentials',
 *   stack: 'Error: Authentication failed.\n    at login (auth.ts:42:15)',
 *   metadata: { userId: 123, loginAttempt: 3 },
 *   timestamp: 1705315845123,
 *   httpStatus: 401,
 *   original: {
 *     name: 'NetworkError',
 *     message: 'Request timeout.',
 *     stack: '...'
 *   },
 *   chain: [
 *     { name: 'AuthError', message: 'Authentication failed.' },
 *     { name: 'NetworkError', message: 'Request timeout.' }
 *   ]
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
  /** HTTP status code associated with this error */
  httpStatus?: number;
  /** Serialized non-ErrorX entity this was wrapped from (if created via ErrorX.from()) */
  original?: ErrorXCause;
  /** Serialized error chain timeline (this error and all ancestors) */
  chain?: ErrorXCause[];
};

/**
 * Type representing valid preset keys for error creation.
 * Allows both string and number keys while preventing accidental misuse.
 *
 * @public
 */
export type ErrorXBasePresetKey = (number & {}) | (string & {});
