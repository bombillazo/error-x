import type { ErrorX } from './error';
import type { ErrorXMetadata, ErrorXSerialized } from './types';

/**
 * Options for generating error fingerprints.
 *
 * @public
 */
export type FingerprintOptions = {
  /** Include error code in fingerprint (default: true) */
  includeCode?: boolean;
  /** Include error name in fingerprint (default: true) */
  includeName?: boolean;
  /** Include error message in fingerprint (default: true) */
  includeMessage?: boolean;
  /** Include specific metadata keys in fingerprint */
  includeMetadataKeys?: string[];
  /** Custom hash function (default: simple string hash) */
  hashFunction?: (input: string) => string;
};

/**
 * Structured log entry format for error logging.
 * Compatible with structured logging libraries (pino, winston, bunyan).
 *
 * @public
 */
export type ErrorLogEntry = {
  /** Log level */
  level: 'error' | 'warn' | 'info';
  /** Error message */
  message: string;
  /** Error fingerprint for deduplication */
  fingerprint: string;
  /** Error name/type */
  errorName: string;
  /** Error code */
  errorCode: string;
  /** Unix timestamp in milliseconds */
  timestamp: number;
  /** ISO 8601 timestamp string */
  timestampIso: string;
  /** HTTP status code if present */
  httpStatus?: number;
  /** Error metadata */
  metadata?: ErrorXMetadata;
  /** Stack trace (if includeStack is true) */
  stack?: string;
  /** Error chain depth */
  chainDepth: number;
  /** Root cause error info (if chain exists) */
  rootCause?: {
    name: string;
    message: string;
    code: string;
  };
  /** Full serialized error (if includeFull is true) */
  error?: ErrorXSerialized;
};

/**
 * Options for creating structured log entries.
 *
 * @public
 */
export type LogEntryOptions = {
  /** Log level (default: 'error') */
  level?: 'error' | 'warn' | 'info';
  /** Include stack trace (default: false) */
  includeStack?: boolean;
  /** Include full serialized error (default: false) */
  includeFull?: boolean;
  /** Fingerprint options */
  fingerprintOptions?: FingerprintOptions;
  /** Additional context to merge into log entry */
  context?: Record<string, unknown>;
};

/**
 * OpenTelemetry-compatible span attributes for error tracking.
 * Follows OpenTelemetry semantic conventions for exceptions.
 *
 * @see https://opentelemetry.io/docs/specs/semconv/exceptions/exceptions-spans/
 * @public
 */
export type OtelErrorAttributes = {
  /** Exception type/name (semantic convention: exception.type) */
  'exception.type': string;
  /** Exception message (semantic convention: exception.message) */
  'exception.message': string;
  /** Exception stack trace (semantic convention: exception.stacktrace) */
  'exception.stacktrace'?: string;
  /** Error code (custom attribute) */
  'error.code': string;
  /** Error fingerprint for deduplication (custom attribute) */
  'error.fingerprint': string;
  /** HTTP status code if present */
  'http.status_code'?: number;
  /** Error chain depth */
  'error.chain_depth': number;
  /** Whether this is an aggregate error */
  'error.is_aggregate': boolean;
  /** Number of aggregated errors (if aggregate) */
  'error.aggregate_count'?: number;
  /** Timestamp when error was created */
  'error.timestamp': number;
};

/**
 * Options for creating OpenTelemetry span attributes.
 *
 * @public
 */
export type OtelAttributeOptions = {
  /** Include stack trace (default: true) */
  includeStack?: boolean;
  /** Include metadata as span attributes (default: false) */
  includeMetadata?: boolean;
  /** Prefix for metadata attributes (default: 'error.metadata.') */
  metadataPrefix?: string;
  /** Fingerprint options */
  fingerprintOptions?: FingerprintOptions;
};

/**
 * Simple string hash function using djb2 algorithm.
 * Produces a hex string hash for fingerprinting.
 *
 * @param str - Input string to hash
 * @returns Hex string hash
 *
 * @internal
 */
const djb2Hash = (str: string): string => {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 33) ^ str.charCodeAt(i);
  }
  // Convert to unsigned 32-bit integer and then to hex
  return (hash >>> 0).toString(16).padStart(8, '0');
};

/**
 * Generates a unique fingerprint for an error for deduplication purposes.
 * The fingerprint is based on stable error properties that identify the "type"
 * of error rather than the specific instance.
 *
 * @param error - ErrorX instance to fingerprint
 * @param options - Fingerprint generation options
 * @returns Hex string fingerprint
 *
 * @example
 * ```typescript
 * const error = new ErrorX({
 *   message: 'Database connection failed',
 *   name: 'DatabaseError',
 *   code: 'DB_CONN_FAILED'
 * })
 *
 * const fingerprint = generateFingerprint(error)
 * // e.g., "a1b2c3d4"
 *
 * // Same error type always produces the same fingerprint
 * const error2 = new ErrorX({
 *   message: 'Database connection failed',
 *   name: 'DatabaseError',
 *   code: 'DB_CONN_FAILED'
 * })
 * generateFingerprint(error2) === fingerprint // true
 * ```
 *
 * @public
 */
export const generateFingerprint = (error: ErrorX, options?: FingerprintOptions): string => {
  const {
    includeCode = true,
    includeName = true,
    includeMessage = true,
    includeMetadataKeys = [],
    hashFunction = djb2Hash,
  } = options ?? {};

  const parts: string[] = [];

  if (includeName) {
    parts.push(`name:${error.name}`);
  }

  if (includeCode) {
    parts.push(`code:${error.code}`);
  }

  if (includeMessage) {
    parts.push(`message:${error.message}`);
  }

  // Include specific metadata keys if requested
  if (includeMetadataKeys.length > 0 && error.metadata) {
    for (const key of includeMetadataKeys) {
      if (key in error.metadata) {
        const value = error.metadata[key];
        parts.push(`meta.${key}:${String(value)}`);
      }
    }
  }

  const fingerprint = parts.join('|');
  return hashFunction(fingerprint);
};

/**
 * Creates a structured log entry from an ErrorX instance.
 * The entry is compatible with structured logging libraries like pino, winston, and bunyan.
 *
 * @param error - ErrorX instance to create log entry from
 * @param options - Log entry creation options
 * @returns Structured log entry object
 *
 * @example
 * ```typescript
 * import pino from 'pino'
 * const logger = pino()
 *
 * const error = new ErrorX({
 *   message: 'User not found',
 *   code: 'USER_NOT_FOUND',
 *   httpStatus: 404,
 *   metadata: { userId: 123 }
 * })
 *
 * const logEntry = toLogEntry(error)
 * logger.error(logEntry)
 * // Output: {"level":"error","message":"User not found","fingerprint":"abc123",...}
 *
 * // With full error for debugging
 * const debugEntry = toLogEntry(error, { includeFull: true, includeStack: true })
 * ```
 *
 * @public
 */
export const toLogEntry = (error: ErrorX, options?: LogEntryOptions): ErrorLogEntry => {
  const { level = 'error', includeStack = false, includeFull = false, fingerprintOptions, context } =
    options ?? {};

  const fingerprint = generateFingerprint(error, fingerprintOptions);
  const chain = error.chain;
  const root = error.root;

  const entry: ErrorLogEntry = {
    level,
    message: error.message,
    fingerprint,
    errorName: error.name,
    errorCode: error.code,
    timestamp: error.timestamp,
    timestampIso: new Date(error.timestamp).toISOString(),
    chainDepth: chain.length,
  };

  if (error.httpStatus !== undefined) {
    entry.httpStatus = error.httpStatus;
  }

  if (error.metadata && Object.keys(error.metadata).length > 0) {
    entry.metadata = error.metadata;
  }

  if (includeStack && error.stack) {
    entry.stack = error.stack;
  }

  if (root) {
    entry.rootCause = {
      name: root.name,
      message: root.message,
      code: root.code,
    };
  }

  if (includeFull) {
    entry.error = error.toJSON();
  }

  // Merge additional context
  if (context) {
    return { ...entry, ...context } as ErrorLogEntry;
  }

  return entry;
};

/**
 * Creates OpenTelemetry-compatible span attributes from an ErrorX instance.
 * Follows OpenTelemetry semantic conventions for exception tracking.
 *
 * @param error - ErrorX instance to create attributes from
 * @param options - Attribute creation options
 * @returns Object of span attributes following OTel conventions
 *
 * @example
 * ```typescript
 * import { trace } from '@opentelemetry/api'
 *
 * const tracer = trace.getTracer('my-service')
 * const span = tracer.startSpan('operation')
 *
 * try {
 *   await riskyOperation()
 * } catch (err) {
 *   const error = ErrorX.from(err)
 *   const attributes = toOtelAttributes(error)
 *
 *   // Record exception event with attributes
 *   span.recordException(error)
 *   span.setAttributes(attributes)
 *   span.setStatus({ code: SpanStatusCode.ERROR, message: error.message })
 * }
 *
 * // With metadata as span attributes
 * const attrs = toOtelAttributes(error, {
 *   includeMetadata: true,
 *   metadataPrefix: 'app.error.'
 * })
 * // Includes: { 'app.error.userId': 123, ... }
 * ```
 *
 * @public
 */
export const toOtelAttributes = (
  error: ErrorX,
  options?: OtelAttributeOptions
): OtelErrorAttributes & Record<string, unknown> => {
  const {
    includeStack = true,
    includeMetadata = false,
    metadataPrefix = 'error.metadata.',
    fingerprintOptions,
  } = options ?? {};

  const fingerprint = generateFingerprint(error, fingerprintOptions);

  // Check if this is an aggregate error by checking for 'errors' property
  const isAggregate = 'errors' in error && Array.isArray((error as { errors?: unknown[] }).errors);
  const aggregateCount = isAggregate
    ? (error as { errors: unknown[] }).errors.length
    : undefined;

  const attributes: OtelErrorAttributes & Record<string, unknown> = {
    'exception.type': error.name,
    'exception.message': error.message,
    'error.code': error.code,
    'error.fingerprint': fingerprint,
    'error.chain_depth': error.chain.length,
    'error.is_aggregate': isAggregate,
    'error.timestamp': error.timestamp,
  };

  if (includeStack && error.stack) {
    attributes['exception.stacktrace'] = error.stack;
  }

  if (error.httpStatus !== undefined) {
    attributes['http.status_code'] = error.httpStatus;
  }

  if (isAggregate && aggregateCount !== undefined) {
    attributes['error.aggregate_count'] = aggregateCount;
  }

  // Include metadata as span attributes if requested
  if (includeMetadata && error.metadata) {
    for (const [key, value] of Object.entries(error.metadata)) {
      // Only include primitive values (strings, numbers, booleans)
      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        attributes[`${metadataPrefix}${key}`] = value;
      }
    }
  }

  return attributes;
};

/**
 * Helper to record an error on an OpenTelemetry span.
 * This is a convenience function that creates attributes and provides
 * a callback pattern for span manipulation.
 *
 * @param error - ErrorX instance to record
 * @param options - Options including attribute options and span callback
 * @returns Object with attributes and a helper to apply to a span
 *
 * @example
 * ```typescript
 * import { trace, SpanStatusCode } from '@opentelemetry/api'
 *
 * const span = tracer.startSpan('operation')
 *
 * try {
 *   await operation()
 * } catch (err) {
 *   const error = ErrorX.from(err)
 *   const { attributes, applyToSpan } = recordError(error)
 *
 *   // Apply all error info to span
 *   applyToSpan(span, {
 *     setStatus: true,
 *     recordException: true
 *   })
 * }
 * ```
 *
 * @public
 */
export const recordError = (
  error: ErrorX,
  options?: OtelAttributeOptions
): {
  attributes: OtelErrorAttributes & Record<string, unknown>;
  applyToSpan: <TSpan extends OtelSpanLike>(
    span: TSpan,
    spanOptions?: { setStatus?: boolean; recordException?: boolean }
  ) => void;
} => {
  const attributes = toOtelAttributes(error, options);

  return {
    attributes,
    applyToSpan: (span, spanOptions = {}) => {
      const { setStatus = true, recordException = true } = spanOptions;

      span.setAttributes(attributes);

      if (recordException && typeof span.recordException === 'function') {
        span.recordException(error);
      }

      if (setStatus && typeof span.setStatus === 'function') {
        span.setStatus({ code: 2, message: error.message }); // SpanStatusCode.ERROR = 2
      }
    },
  };
};

/**
 * Minimal interface matching OpenTelemetry Span for type compatibility.
 * This allows using the helpers without requiring @opentelemetry/api as a dependency.
 *
 * @public
 */
export type OtelSpanLike = {
  setAttributes: (attributes: Record<string, unknown>) => void;
  recordException?: (exception: Error) => void;
  setStatus?: (status: { code: number; message?: string }) => void;
};
