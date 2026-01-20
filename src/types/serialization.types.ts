import type { ErrorXMetadata, ErrorXSnapshot } from './core.types';

/**
 * JSON-serializable representation of an ErrorX instance.
 * Used for transmitting errors over network or storing in databases.
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
