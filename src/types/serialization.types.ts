import type { ErrorXMetadata, ErrorXSnapshot } from './core.types';

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
  /** Stack trace (optional) */
  stack?: string;
  /** Additional context and debugging information */
  metadata: ErrorXMetadata | undefined;
  /** Unix epoch timestamp (milliseconds) when error was created */
  timestamp: number;
  /** HTTP status code associated with this error */
  httpStatus?: number;
  /** Serialized non-ErrorX entity this was wrapped from (if created via ErrorX.from()) */
  original?: ErrorXSnapshot;
  /** Serialized error chain timeline (this error and all ancestors) */
  chain?: ErrorXSerialized[];
};
