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

/**
 * Configuration options for creating an aggregated ErrorX instance.
 * Used when combining multiple errors into a single aggregate error.
 *
 * @public
 */
export type ErrorXAggregateOptions<TMetadata extends ErrorXMetadata = ErrorXMetadata> = {
  /** Custom message for the aggregate error (default: 'Multiple errors occurred ({count} errors)') */
  message?: string;
  /** Custom name for the aggregate error (default: 'AggregateError') */
  name?: string;
  /** Custom code for the aggregate error (default: 'AGGREGATE_ERROR') */
  code?: string;
  /** Additional metadata for the aggregate error */
  metadata?: TMetadata;
  /** HTTP status code for the aggregate error */
  httpStatus?: number;
};

/**
 * JSON-serializable representation of an aggregated ErrorX instance.
 * Extends ErrorXSerialized with an errors array containing all aggregated errors.
 *
 * @public
 */
export type ErrorXAggregateSerialized = ErrorXSerialized & {
  /** Serialized array of all aggregated errors */
  errors: ErrorXSerialized[];
};
