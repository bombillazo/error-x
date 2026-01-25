import { deepmerge } from 'deepmerge-ts';
import safeStringify from 'safe-stringify';
import {
  ERROR_X_OPTION_FIELDS,
  type ErrorXAggregateOptions,
  type ErrorXAggregateSerialized,
  type ErrorXMetadata,
  type ErrorXOptionField,
  type ErrorXOptions,
  type ErrorXSerialized,
  type ErrorXSnapshot,
  type ErrorXTransform,
  type ErrorXTransformContext,
} from './types';

// Use the single source of truth for accepted fields
const acceptedFields = new Set(ERROR_X_OPTION_FIELDS);

/**
 * Configuration interface for ErrorX global settings
 *
 * @public
 */
export interface ErrorXConfig {
  /**
   * Control stack trace cleaning behavior
   * - true: Enable automatic stack trace cleaning (default)
   * - false: Disable stack trace cleaning entirely
   * - string[]: Custom patterns to match and remove from stack traces
   */
  cleanStack?: boolean | string[];
  /**
   * Delimiter to trim stack traces after a specified line
   * When set, stack traces will be trimmed to start after the first line containing this string
   */
  cleanStackDelimiter?: string;
}

/**
 * Enhanced Error class with rich metadata, type-safe error handling, and intelligent error conversion.
 *
 * @example
 * ```typescript
 * // Configure globally (optional)
 * ErrorX.configure({
 *   cleanStackDelimiter: 'my-app-entry' // Clean stack traces after this line
 * })
 *
 * // Basic usage
 * const error = new ErrorX({ message: 'Database connection failed' })
 *
 * // With full options
 * const error = new ErrorX({
 *   message: 'User authentication failed',
 *   name: 'AuthError',
 *   code: 'AUTH_FAILED',
 *   metadata: { userId: 123, loginAttempt: 3 }
 * })
 *
 * // With type-safe metadata
 * type MyMetadata = { userId: number; action: string };
 * const error = new ErrorX<MyMetadata>({
 *   message: 'Action failed',
 *   metadata: { userId: 123, action: 'delete' }
 * })
 * // error.metadata?.userId is typed as number
 * ```
 *
 * @public
 */
export class ErrorX<TMetadata extends ErrorXMetadata = ErrorXMetadata> extends Error {
  /** Global configuration for all ErrorX instances */
  private static _config: ErrorXConfig | null = null;

  /** Error identifier code, auto-generated from name if not provided */
  public code: string;
  /** Additional context and metadata associated with the error */
  public metadata: TMetadata | undefined;
  /** Unix epoch timestamp (milliseconds) when the error was created */
  public timestamp: number;
  /** HTTP status code associated with this error */
  public httpStatus: number | undefined;
  /** Serialized non-ErrorX entity this was wrapped from (if created via ErrorX.from()) */
  public original: ErrorXSnapshot | undefined;
  /** Error chain timeline: [this, parent, grandparent, ...] - single source of truth */
  private _chain: ErrorX[] = [];

  /**
   * Gets the immediate parent ErrorX in the chain (if any).
   * @returns The ErrorX that caused this error, or undefined if this is the root
   */
  public get parent(): ErrorX | undefined {
    return this._chain[1];
  }

  /**
   * Gets the deepest ErrorX in the chain (the original root cause).
   * @returns The root cause ErrorX, or undefined if chain has only this error
   */
  public get root(): ErrorX | undefined {
    return this._chain.length > 1 ? this._chain[this._chain.length - 1] : undefined;
  }

  /**
   * Gets the full error chain timeline.
   * @returns Array of ErrorX instances: [this, parent, grandparent, ...]
   */
  public get chain(): readonly ErrorX[] {
    return this._chain;
  }

  /**
   * Creates a new ErrorX instance with enhanced error handling capabilities.
   *
   * @param messageOrOptions - Error message string or ErrorXOptions object (optional)
   *
   * @example
   * ```typescript
   * // Create with default message
   * const error1 = new ErrorX()
   *
   * // Create with string message only
   * const error2 = new ErrorX('Database query failed')
   *
   * // Create with options object
   * const error3 = new ErrorX({
   *   message: 'Database query failed',
   *   name: 'DatabaseError',
   *   code: 'DB_QUERY_FAILED',
   *   metadata: { query: 'SELECT * FROM users', timeout: 5000 }
   * })
   *
   * // With type-safe metadata
   * type MyMeta = { userId: number };
   * const error4 = new ErrorX<MyMeta>({
   *   message: 'User action failed',
   *   metadata: { userId: 123 }
   * })
   *
   * // For converting unknown errors, use ErrorX.from()
   * const apiError = { message: 'User not found', code: 404 }
   * const error5 = ErrorX.from(apiError)
   * ```
   */
  constructor(messageOrOptions?: string | ErrorXOptions<TMetadata>) {
    let options: ErrorXOptions<TMetadata> = {};

    // Handle different input types
    if (typeof messageOrOptions === 'string') {
      // String message provided
      options = { message: messageOrOptions };
    } else if (messageOrOptions != null) {
      // ErrorXOptions object - use directly
      options = messageOrOptions;
    }
    // else: undefined/null - use empty options object

    // Use default message if not provided or if it's empty/whitespace-only
    const message = options.message?.trim() ? options.message : 'An error occurred';

    // Call super
    super(message);

    this.name = options.name ?? ErrorX.getDefaultName();
    this.code =
      options.code != null ? String(options.code) : ErrorX.generateDefaultCode(options.name);
    this.metadata = options.metadata;
    this.timestamp = Date.now();
    this.httpStatus = options.httpStatus;

    // Build the error chain
    if (options.cause != null) {
      if (options.cause instanceof ErrorX) {
        // Cause is already ErrorX - flatten its chain into ours
        this._chain = [this, ...options.cause._chain];
      } else {
        // Cause is not ErrorX - wrap it via from() then chain
        const wrappedCause = ErrorX.from(options.cause);
        this._chain = [this, ...wrappedCause._chain];
      }
    } else {
      // No cause - this is the root of the chain
      this._chain = [this];
    }

    // Capture stack trace for this error (each error stores its own stack)
    if (typeof Error.captureStackTrace === 'function') {
      Error.captureStackTrace(this, this.constructor);
    }
    // Clean internal frames from stack
    this.stack = ErrorX.cleanStack(this.stack);
  }

  /**
   * Returns the default error name.
   * @returns Default error name 'Error'
   */
  private static getDefaultName(): string {
    return 'Error';
  }

  /**
   * Converts any value to ErrorXSnapshot format.
   * @param value - Value to convert to ErrorXSnapshot
   * @returns ErrorXSnapshot object or undefined if value is null/undefined
   */
  private static toErrorXSnapshot(value: unknown): ErrorXSnapshot | undefined {
    if (value === undefined || value === null) {
      return undefined;
    }

    if (value instanceof Error) {
      const snapshot: ErrorXSnapshot = {
        message: value.message,
      };
      if (value.name) {
        snapshot.name = value.name;
      }
      if (value.stack) {
        snapshot.stack = value.stack;
      }
      return snapshot;
    }

    if (typeof value === 'object') {
      const obj = value as Record<string, unknown>;
      const snapshot: ErrorXSnapshot = {
        message: String(obj.message || obj),
      };
      if (obj.name) {
        snapshot.name = String(obj.name);
      }
      if (obj.stack) {
        snapshot.stack = String(obj.stack);
      }
      return snapshot;
    }

    // Handle primitives
    return {
      message: String(value),
    };
  }

  /**
   * Configure global ErrorX settings.
   * This method allows you to set defaults for all ErrorX instances.
   *
   * @param config - Configuration object
   *
   * @example
   * ```typescript
   * ErrorX.configure({
   *   cleanStack: true, // Enable stack trace cleaning
   *   cleanStackDelimiter: 'app-entry-point' // Trim stack traces after this line
   * })
   * ```
   */
  public static configure(config: ErrorXConfig): void {
    ErrorX._config = { ...(ErrorX._config || {}), ...config };
  }

  /**
   * Get the current global configuration.
   * Returns null if no configuration has been set.
   */
  public static getConfig(): ErrorXConfig | null {
    return ErrorX._config;
  }

  /**
   * Reset global configuration to null.
   * Useful for testing or when you want to clear all configuration.
   *
   * @example
   * ```typescript
   * ErrorX.resetConfig()
   * const config = ErrorX.getConfig() // null
   * ```
   */
  public static resetConfig(): void {
    ErrorX._config = null;
  }

  /**
   * Validates if an object is a valid ErrorXOptions object.
   * Checks that the object only contains accepted ErrorXOptions fields.
   *
   * @param value - Value to check
   * @returns True if value is a valid ErrorXOptions object
   */
  public static isErrorXOptions(value: unknown): value is ErrorXOptions {
    if (value == null || typeof value !== 'object' || Array.isArray(value)) {
      return false;
    }

    // If it's an Error instance, it's not ErrorXOptions
    if (value instanceof Error) {
      return false;
    }

    const obj = value as Record<string, unknown>;
    const keys = Object.keys(obj);

    // Empty object is valid ErrorXOptions
    if (keys.length === 0) {
      return true;
    }

    // Check if all keys are in the accepted fields
    // If there's any key that's not accepted, it's not ErrorXOptions
    return keys.every((key) => acceptedFields.has(key as ErrorXOptionField));
  }

  /**
   * Generates a default error code from the error name.
   * Converts camelCase/PascalCase names to UPPER_SNAKE_CASE format.
   *
   * @param name - Error name to convert
   * @returns Generated error code in UPPER_SNAKE_CASE format
   *
   * @example
   * ```typescript
   * generateDefaultCode('DatabaseError') // 'DATABASE_ERROR'
   * generateDefaultCode('userAuthError') // 'USER_AUTH_ERROR'
   * generateDefaultCode('API Timeout') // 'API_TIMEOUT'
   * ```
   */
  private static generateDefaultCode(name?: string): string {
    if (!name) return 'ERROR';

    // Convert camelCase/PascalCase to UPPER_SNAKE_CASE
    return name
      .replace(/([a-z])([A-Z])/g, '$1_$2') // Add underscore between camelCase
      .replace(/\s+/g, '_') // Replace spaces with underscores
      .replace(/[^a-zA-Z0-9_]/g, '') // Remove special characters
      .toUpperCase();
  }

  /**
   * Cleans a stack trace by removing ErrorX internal method calls and optionally trimming after a delimiter.
   * This provides cleaner stack traces that focus on user code.
   *
   * @param stack - Raw stack trace string to clean
   * @param delimiter - Optional delimiter to trim stack trace after (overrides config delimiter)
   * @returns Cleaned stack trace without internal calls and optionally trimmed after delimiter
   *
   * @example
   * ```typescript
   * // Clean with pattern-based removal only
   * const cleaned = ErrorX.cleanStack(error.stack)
   *
   * // Clean and trim after delimiter
   * const trimmed = ErrorX.cleanStack(error.stack, 'my-app-entry')
   * // Returns stack trace starting after the line containing 'my-app-entry'
   * ```
   */
  public static cleanStack(stack?: string, delimiter?: string): string {
    if (!stack) return '';

    const config = ErrorX.getConfig();
    const cleanStackConfig = config?.cleanStack ?? true; // Default to true

    // If cleanStack is explicitly disabled, return original stack
    if (cleanStackConfig === false) {
      return stack;
    }

    const stackLines = stack.split('\n');
    const cleanedLines: string[] = [];

    // Default patterns to remove - only internal ErrorX frames
    const defaultPatterns = [
      'new ErrorX',
      'ErrorX.constructor',
      'ErrorX.from',
      'error-x/dist/error.js',
      'error-x/src/error.ts',
    ];

    // Use custom patterns if provided, otherwise use defaults
    const patterns = Array.isArray(cleanStackConfig) ? cleanStackConfig : defaultPatterns;

    for (const line of stackLines) {
      // Skip lines that match any of the patterns
      const shouldSkip = patterns.some((pattern) => line.includes(pattern));
      if (shouldSkip) {
        continue;
      }
      cleanedLines.push(line);
    }

    let cleanedStack = cleanedLines.join('\n');

    // Apply delimiter-based cleaning if provided (parameter takes precedence over config)
    const activeDelimiter = delimiter ?? config?.cleanStackDelimiter;
    if (activeDelimiter) {
      const delimiterIndex = cleanedLines.findIndex((line) => line.includes(activeDelimiter));
      if (delimiterIndex !== -1) {
        cleanedStack = cleanedLines.slice(delimiterIndex + 1).join('\n');
      }
    }

    return cleanedStack;
  }

  /**
   * Creates a new ErrorX instance with additional metadata merged with existing metadata.
   * The original error properties are preserved while extending the metadata.
   *
   * @param additionalMetadata - Additional metadata to merge with existing metadata
   * @returns New ErrorX instance with merged metadata
   *
   * @example
   * ```typescript
   * const error = new ErrorX({
   *   message: 'API request failed',
   *   metadata: { endpoint: '/users' }
   * })
   *
   * const enrichedError = error.withMetadata({
   *   retryCount: 3,
   *   userId: 123
   * })
   * // Result: metadata = { endpoint: '/users', retryCount: 3, userId: 123 }
   * ```
   */
  public withMetadata<TAdditionalMetadata extends Record<string, unknown> = ErrorXMetadata>(
    additionalMetadata: TAdditionalMetadata
  ): ErrorX<TMetadata & TAdditionalMetadata> {
    // Create new error without cause (we'll copy the chain directly)
    const options: ErrorXOptions<TMetadata & TAdditionalMetadata> = {
      message: this.message,
      name: this.name,
      code: this.code,
      metadata: {
        ...(this.metadata ?? {}),
        ...additionalMetadata,
      } as TMetadata & TAdditionalMetadata,
      httpStatus: this.httpStatus,
    };
    const newError = new ErrorX<TMetadata & TAdditionalMetadata>(options);

    // Preserve the chain with new error at front
    newError._chain = [newError, ...this._chain.slice(1)];

    // Preserve original
    newError.original = this.original;

    // Preserve the original stack trace and timestamp
    if (this.stack) {
      newError.stack = this.stack;
    }
    newError.timestamp = this.timestamp;
    return newError;
  }

  /**
   * Type guard that checks if a value is an ErrorX instance.
   *
   * @param value - Value to check
   * @returns True if value is an ErrorX instance, false otherwise
   *
   * @example
   * ```typescript
   * try {
   *   // some operation
   * } catch (error) {
   *   if (ErrorX.isErrorX(error)) {
   *     // TypeScript knows error is ErrorX
   *     console.log(error.code, error.metadata)
   *   }
   * }
   * ```
   */
  public static isErrorX<TMetadata extends ErrorXMetadata = ErrorXMetadata>(
    value: unknown
  ): value is ErrorX<TMetadata> {
    return value instanceof ErrorX;
  }

  /**
   * Converts unknown input into ErrorXOptions with intelligent property extraction.
   * Handles strings, regular Error objects, API response objects, and unknown values.
   * Extracts metadata directly from objects if present, without wrapping.
   * This is a private helper method used by ErrorX.from().
   *
   * @param error - Value to convert to ErrorXOptions
   * @returns ErrorXOptions object with extracted properties
   * @internal
   */
  private static convertUnknownToOptions(error: unknown): ErrorXOptions {
    let name = '';
    let message = '';
    let code = '';
    let cause: unknown;
    let metadata: ErrorXMetadata = {};
    let httpStatus: number | undefined;

    if (error) {
      if (typeof error === 'string') {
        message = error;
      } else if (error instanceof Error) {
        name = error.name;
        message = error.message;
        cause = error.cause;
      } else if (typeof error === 'object') {
        // Extract name from various properties
        if ('name' in error && error.name) name = String(error.name);
        else if ('title' in error && error.title) name = String(error.title);

        // Extract message from various properties
        if ('message' in error && error.message) message = String(error.message);
        else if ('details' in error && error.details) message = String(error.details);
        else if ('text' in error && error.text) message = String(error.text);
        else if ('info' in error && error.info) message = String(error.info);
        else if ('statusText' in error && error.statusText) message = String(error.statusText);
        else if ('error' in error && error.error) message = String(error.error);
        else if ('errorMessage' in error && error.errorMessage)
          message = String(error.errorMessage);

        // Extract code
        if ('code' in error && error.code) code = String(error.code);

        // Extract metadata directly if present
        if ('metadata' in error && typeof error.metadata === 'object' && error.metadata !== null) {
          metadata = error.metadata as ErrorXMetadata;
        }

        // Extract httpStatus
        if ('httpStatus' in error && typeof error.httpStatus === 'number') {
          httpStatus = error.httpStatus;
        } else if ('status' in error && typeof error.status === 'number') {
          httpStatus = error.status;
        } else if ('statusCode' in error && typeof error.statusCode === 'number') {
          httpStatus = error.statusCode;
        }
      }
    }

    const options: ErrorXOptions = {
      message: message || 'Unknown error occurred',
    };

    if (name) options.name = name;
    if (code) options.code = code;
    if (cause) options.cause = cause;
    if (Object.keys(metadata).length > 0) options.metadata = metadata;
    if (httpStatus !== undefined) options.httpStatus = httpStatus;

    return options;
  }

  /**
   * Converts unknown input into an ErrorX instance with intelligent property extraction.
   * Handles strings, regular Error objects, API response objects, and unknown values.
   * Extracts metadata directly from objects if present.
   *
   * This is a "wrapping" operation - the resulting ErrorX represents the same error
   * in ErrorX form. The original source is stored in the `original` property.
   *
   * @param payload - Value to convert to ErrorX
   * @param overrides - Optional overrides to deep-merge with extracted properties
   * @returns ErrorX instance with extracted properties and `original` set
   *
   * @example
   * ```typescript
   * // Convert string error
   * const error1 = ErrorX.from('Something went wrong')
   *
   * // Convert regular Error
   * const error2 = ErrorX.from(new Error('Database failed'))
   *
   * // Convert API response object
   * const apiError = {
   *   message: 'User not found',
   *   code: 'USER_404',
   *   metadata: { userId: 123, endpoint: '/api/users' }
   * }
   * const error3 = ErrorX.from(apiError)
   * // error3.metadata = { userId: 123, endpoint: '/api/users' }
   * // error3.original = { message: 'User not found', name: undefined, stack: undefined }
   *
   * // With overrides
   * const error4 = ErrorX.from(new Error('Connection failed'), {
   *   httpStatus: 500,
   *   metadata: { context: 'db-layer' }
   * })
   * ```
   */
  public static from<TMetadata extends ErrorXMetadata = ErrorXMetadata>(
    error: ErrorX<TMetadata>,
    overrides?: Partial<ErrorXOptions<TMetadata>>
  ): ErrorX<TMetadata>;
  public static from<TMetadata extends ErrorXMetadata = ErrorXMetadata>(
    payload: Error,
    overrides?: Partial<ErrorXOptions<TMetadata>>
  ): ErrorX<TMetadata>;
  public static from<TMetadata extends ErrorXMetadata = ErrorXMetadata>(
    payload: string,
    overrides?: Partial<ErrorXOptions<TMetadata>>
  ): ErrorX<TMetadata>;
  public static from<TMetadata extends ErrorXMetadata = ErrorXMetadata>(
    payload: unknown,
    overrides?: Partial<ErrorXOptions<TMetadata>>
  ): ErrorX<TMetadata>;
  public static from<TMetadata extends ErrorXMetadata = ErrorXMetadata>(
    payload: unknown,
    overrides?: Partial<ErrorXOptions<TMetadata>>
  ): ErrorX<TMetadata> {
    // If already ErrorX, apply overrides if provided, otherwise return as-is
    if (payload instanceof ErrorX) {
      if (overrides && Object.keys(overrides).length > 0) {
        // Create new ErrorX with merged options
        const mergedOptions: ErrorXOptions<TMetadata> = {
          message: overrides.message ?? payload.message,
          name: overrides.name ?? payload.name,
          code: overrides.code ?? payload.code,
          httpStatus: overrides.httpStatus ?? payload.httpStatus,
          metadata: overrides.metadata
            ? (deepmerge(payload.metadata ?? {}, overrides.metadata) as TMetadata)
            : (payload.metadata as TMetadata | undefined),
        };
        const newError = new ErrorX<TMetadata>(mergedOptions);
        newError.original = payload.original;
        newError._chain = [newError]; // from() creates root of chain
        return newError;
      }
      return payload as ErrorX<TMetadata>;
    }

    // Convert unknown to options and create ErrorX
    const extractedOptions = ErrorX.convertUnknownToOptions(payload);

    // Deep merge overrides if provided
    const finalOptions: ErrorXOptions<TMetadata> = overrides
      ? {
          ...extractedOptions,
          ...overrides,
          metadata:
            extractedOptions.metadata || overrides.metadata
              ? (deepmerge(extractedOptions.metadata ?? {}, overrides.metadata ?? {}) as TMetadata)
              : undefined,
        }
      : (extractedOptions as ErrorXOptions<TMetadata>);

    // Create ErrorX without cause (from() is wrapping, not chaining)
    const error = new ErrorX<TMetadata>(finalOptions);

    // Set original to serialized form of the source
    error.original = ErrorX.toErrorXSnapshot(payload);

    // Preserve the original error's stack if it's an Error instance
    if (payload instanceof Error && payload.stack) {
      error.stack = payload.stack;
    }

    // Chain is just [this] for wrapped errors (from() doesn't chain)
    error._chain = [error];

    return error;
  }

  /**
   * Converts the ErrorX instance to a detailed string representation.
   * Includes error name, message, code, timestamp, metadata, and stack trace.
   *
   * @returns Formatted string representation of the error
   *
   * @example
   * ```typescript
   * const error = new ErrorX({
   *   message: 'Database connection failed',
   *   name: 'DatabaseError',
   *   code: 'DB_CONN_FAILED',
   *   metadata: { host: 'localhost', port: 5432 }
   * })
   *
   * console.log(error.toString())
   * // Output: "DatabaseError: Database connection failed. [DB_CONN_FAILED] 2025-01-15T10:30:45.123Z (1736937045123) metadata: {...}"
   * ```
   */
  public toString(): string {
    const parts = [];

    // Add name and message
    parts.push(`${this.name}: ${this.message}`);

    // Add code if different from default
    if (this.code && this.code !== 'ERROR') {
      parts.push(`[${this.code}]`);
    }

    // Add timestamp
    parts.push(`${new Date(this.timestamp).toISOString()} (${this.timestamp})`);

    // Add metadata if present
    if (this.metadata && Object.keys(this.metadata).length > 0) {
      const metadataStr = safeStringify(this.metadata);
      parts.push(`metadata: ${metadataStr}`);
    }

    let result = parts.join(' ');

    // Add stack trace if available
    if (this.stack) {
      result += `\n${this.stack}`;
    }

    return result;
  }

  /**
   * Serializes the ErrorX instance to a JSON-compatible object.
   * Recursively serializes the error chain and handles ErrorX or regular Error causes.
   *
   * @returns Serializable object representation of the error
   *
   * @example
   * ```typescript
   * const error = new ErrorX({
   *   message: 'API request failed',
   *   code: 'API_ERROR',
   *   metadata: { endpoint: '/users', status: 500 }
   * })
   *
   * const serialized = error.toJSON()
   * // Can be safely passed to JSON.stringify() or sent over network
   * ```
   */
  public toJSON(): ErrorXSerialized {
    // Handle metadata serialization with circular reference protection
    // safeStringify already handles circular references, but we need to
    // return a plain object (not a string) for toJSON()
    // Using a try-catch to fallback to safe serialization if needed
    let safeMetadata: ErrorXMetadata | undefined;
    if (this.metadata) {
      // Always use safeStringify to handle circular references and ensure a plain object
      safeMetadata = JSON.parse(safeStringify(this.metadata));
    }

    const serialized: ErrorXSerialized = {
      name: this.name,
      message: this.message,
      code: this.code,
      metadata: safeMetadata,
      timestamp: this.timestamp,
    };

    // Include httpStatus if present
    if (this.httpStatus !== undefined) {
      serialized.httpStatus = this.httpStatus;
    }

    // Include stack if available
    if (this.stack) {
      serialized.stack = this.stack;
    }

    // Include original if present (for wrapped errors)
    if (this.original) {
      serialized.original = this.original;
    }

    // Serialize the chain with full properties (excluding nested chains - chains are flattened)
    if (this._chain.length > 1) {
      serialized.chain = this._chain.map((err) => {
        let safeMetadata: ErrorXMetadata | undefined;
        if (err.metadata) {
          safeMetadata = JSON.parse(safeStringify(err.metadata));
        }

        const chainEntry: ErrorXSerialized = {
          name: err.name,
          message: err.message,
          code: err.code,
          metadata: safeMetadata,
          timestamp: err.timestamp,
        };

        if (err.httpStatus !== undefined) chainEntry.httpStatus = err.httpStatus;
        if (err.stack) chainEntry.stack = err.stack;
        if (err.original) chainEntry.original = err.original;
        // Note: chain property omitted - chains are flattened

        return chainEntry;
      });
    }

    return serialized;
  }

  /**
   * Deserializes a JSON object back into an ErrorX instance.
   * Recursively reconstructs the error chain and restores all properties.
   *
   * @param serialized - Serialized error object to deserialize
   * @returns Reconstructed ErrorX instance with restored properties
   *
   * @example
   * ```typescript
   * const serializedError = {
   *   name: 'DatabaseError',
   *   message: 'Connection failed.',
   *   code: 'DB_CONN_FAILED',
   *   metadata: { host: 'localhost' },
   *   timestamp: 1705315845123
   * }
   *
   * const error = ErrorX.fromJSON(serializedError)
   * // Fully restored ErrorX instance with all properties
   * ```
   */
  public static fromJSON<TMetadata extends ErrorXMetadata = ErrorXMetadata>(
    serialized: ErrorXSerialized
  ): ErrorX<TMetadata> {
    // Create the main error without cause (we'll restore chain directly)
    const options: ErrorXOptions = {
      message: serialized.message,
      name: serialized.name,
      code: serialized.code,
      httpStatus: serialized.httpStatus,
    };
    if (serialized.metadata !== undefined) {
      options.metadata = serialized.metadata;
    }

    const error = new ErrorX<TMetadata>(options as ErrorXOptions<TMetadata>);

    // Restore stack and timestamp
    if (serialized.stack) {
      error.stack = serialized.stack;
    }
    error.timestamp = serialized.timestamp;

    // Restore original if present
    if (serialized.original) {
      error.original = serialized.original;
    }

    // Restore chain from serialized array (supports both new ErrorXSerialized and old ErrorXSnapshot formats)
    if (serialized.chain && serialized.chain.length > 0) {
      // Reconstruct chain: first element is this error, rest are ancestors
      const chainErrors: ErrorX[] = [error];
      for (let i = 1; i < serialized.chain.length; i++) {
        const causeData = serialized.chain[i];
        if (!causeData) continue;

        const chainErrorOptions: ErrorXOptions = {
          message: causeData.message,
        };

        // Restore all properties (new format has these, old format doesn't)
        if (causeData.name) chainErrorOptions.name = causeData.name;
        if ('code' in causeData && causeData.code !== undefined)
          chainErrorOptions.code = causeData.code;
        if ('metadata' in causeData && causeData.metadata !== undefined)
          chainErrorOptions.metadata = causeData.metadata;
        if ('httpStatus' in causeData && causeData.httpStatus !== undefined)
          chainErrorOptions.httpStatus = causeData.httpStatus;

        const chainError = new ErrorX(chainErrorOptions);

        if (causeData.stack) chainError.stack = causeData.stack;
        if ('timestamp' in causeData && causeData.timestamp !== undefined)
          chainError.timestamp = causeData.timestamp;
        if ('original' in causeData && causeData.original) chainError.original = causeData.original;

        chainErrors.push(chainError);
      }

      // Set up each chain member's _chain to preserve navigation from any point
      for (let i = 0; i < chainErrors.length; i++) {
        const chainError = chainErrors[i];
        if (chainError) {
          chainError._chain = chainErrors.slice(i);
        }
      }
    }

    return error;
  }

  /**
   * Creates a new instance of this error class using optional presets and overrides.
   * This is a factory method that supports preset-based error creation with
   * full TypeScript autocomplete for preset keys.
   *
   * Define static properties on your subclass to customize behavior:
   * - `presets`: Record of preset configurations keyed by identifier
   * - `defaultPreset`: Key of preset to use as fallback
   * - `defaults`: Default values for all errors of this class
   * - `transform`: Function to transform options before instantiation
   *
   * Supported call signatures:
   * - `create()` - uses defaultPreset
   * - `create(presetKey)` - uses specified preset
   * - `create(presetKey, overrides)` - preset with overrides
   * - `create(overrides)` - just overrides, uses defaultPreset
   *
   * @param presetKeyOrOverrides - Preset key (string/number) or overrides object
   * @param overrides - Optional overrides when first arg is preset key
   * @returns New instance of this error class
   *
   * @example
   * ```typescript
   * class DBError extends ErrorX<{ query?: string }> {
   *   static presets = {
   *     9333: { message: 'Connection timeout', code: 'TIMEOUT' },
   *     CONN_REFUSED: { message: 'Connection refused', code: 'CONN_REFUSED' },
   *     GENERIC: { message: 'A database error occurred', code: 'ERROR' },
   *   }
   *   static defaultPreset = 'GENERIC'
   *   static defaults = { httpStatus: 500 }
   *   static transform = (opts, ctx) => ({
   *     ...opts,
   *     code: `DB_${opts.code}`,
   *   })
   * }
   *
   * DBError.create()                           // uses defaultPreset
   * DBError.create(9333)                       // uses preset 9333
   * DBError.create('CONN_REFUSED')             // uses preset CONN_REFUSED
   * DBError.create(9333, { message: 'Custom' }) // preset + overrides
   * DBError.create({ message: 'Custom' })      // just overrides
   * ```
   */
  public static create<T extends ErrorXMetadata = ErrorXMetadata>(
    this: new (
      options?: ErrorXOptions<T>
    ) => ErrorX<T>,
    presetKeyOrOverrides?: string | number | Partial<ErrorXOptions<ErrorXMetadata>>,
    overrides?: Partial<ErrorXOptions<ErrorXMetadata>>
  ): ErrorX<T> {
    // Detect call signature: create(overrides) vs create(presetKey) vs create(presetKey, overrides)
    let presetKey: string | number | undefined;
    let finalOverrides: Partial<ErrorXOptions<ErrorXMetadata>> | undefined;

    if (typeof presetKeyOrOverrides === 'object' && presetKeyOrOverrides !== null) {
      // create(overrides) - first arg is an object
      presetKey = undefined;
      finalOverrides = presetKeyOrOverrides;
    } else {
      // create(), create(presetKey), or create(presetKey, overrides)
      presetKey = presetKeyOrOverrides;
      finalOverrides = overrides;
    }

    // Access static properties from the constructor (this refers to the class)
    // biome-ignore lint/complexity/noThisInStatic: Required for polymorphic factory pattern
    const ctor = this as unknown as {
      presets?: Record<string | number, Partial<ErrorXOptions<ErrorXMetadata>>>;
      defaultPreset?: string | number;
      defaults?: Partial<ErrorXOptions<ErrorXMetadata>>;
      transform?: ErrorXTransform<T>;
    };

    const presets = ctor.presets ?? {};
    const defaultPreset = ctor.defaultPreset;
    const defaults = ctor.defaults ?? {};
    const transform = ctor.transform;

    // Step 1: Resolve preset
    let resolvedPreset: Partial<ErrorXOptions<ErrorXMetadata>> = {};

    if (presetKey !== undefined) {
      // Preset key provided - look it up
      if (presetKey in presets) {
        resolvedPreset = presets[presetKey] ?? {};
      } else if (defaultPreset !== undefined && defaultPreset in presets) {
        // Not found, fall back to defaultPreset
        resolvedPreset = presets[defaultPreset] ?? {};
      }
    } else if (defaultPreset !== undefined && defaultPreset in presets) {
      // No preset key provided, use defaultPreset
      resolvedPreset = presets[defaultPreset] ?? {};
    }

    // Step 2: Deep merge layers: defaults → preset → overrides
    const mergedOptions = deepmerge(
      defaults,
      resolvedPreset,
      finalOverrides ?? {}
    ) as ErrorXOptions<ErrorXMetadata>;

    // Step 3: Apply transform if defined
    const transformContext: ErrorXTransformContext = { presetKey };
    const finalOptions = transform
      ? transform(mergedOptions, transformContext)
      : (mergedOptions as ErrorXOptions<T>);

    // Step 4: Create instance
    // biome-ignore lint/complexity/noThisInStatic: Required for polymorphic factory pattern
    return new this(finalOptions);
  }

  /**
   * Creates an aggregate error that combines multiple errors into a single ErrorX instance.
   * Useful for batch operations where multiple validations or operations can fail simultaneously.
   *
   * Each aggregated error preserves its full error chain, allowing you to trace
   * the root cause of each individual failure.
   *
   * @param errors - Array of errors to aggregate. Can be ErrorX, Error, or unknown values.
   * @param options - Optional configuration for the aggregate error.
   * @returns AggregateErrorX instance containing all provided errors.
   *
   * @example
   * ```typescript
   * // Basic validation aggregation
   * const validationErrors = [
   *   new ErrorX({ message: 'Email is required', code: 'VALIDATION_EMAIL' }),
   *   new ErrorX({ message: 'Password too short', code: 'VALIDATION_PASSWORD' }),
   * ]
   * const aggregateError = ErrorX.aggregate(validationErrors)
   * // aggregateError.errors contains both validation errors
   * // aggregateError.message = 'Multiple errors occurred (2 errors)'
   *
   * @example
   * // With custom options
   * const errors = [new Error('First'), new Error('Second')]
   * const aggregate = ErrorX.aggregate(errors, {
   *   message: 'Batch operation failed',
   *   code: 'BATCH_FAILURE',
   *   httpStatus: 400,
   *   metadata: { operation: 'user-import' }
   * })
   *
   * @example
   * // Accessing individual errors
   * const aggregate = ErrorX.aggregate(errors)
   * for (const error of aggregate.errors) {
   *   console.log(error.message, error.code)
   *   // Each error has its own chain: error.chain, error.root, error.parent
   * }
   *
   * @example
   * // Type guard for aggregate errors
   * if (AggregateErrorX.isAggregateErrorX(error)) {
   *   console.log(`Found ${error.errors.length} errors`)
   * }
   * ```
   */
  public static aggregate<TMetadata extends ErrorXMetadata = ErrorXMetadata>(
    errors: unknown[],
    options?: ErrorXAggregateOptions<TMetadata>
  ): AggregateErrorX<TMetadata> {
    return new AggregateErrorX<TMetadata>(errors, options);
  }
}

/**
 * An ErrorX subclass that aggregates multiple errors into a single instance.
 * Created via `ErrorX.aggregate()` for batch operations with multiple failures.
 *
 * @example
 * ```typescript
 * const errors = [
 *   new ErrorX({ message: 'Invalid email', code: 'EMAIL_INVALID' }),
 *   new ErrorX({ message: 'Invalid phone', code: 'PHONE_INVALID' }),
 * ]
 * const aggregate = ErrorX.aggregate(errors)
 *
 * // Access all errors
 * aggregate.errors.forEach(e => console.log(e.code))
 *
 * // Check if an error is an aggregate
 * if (AggregateErrorX.isAggregateErrorX(error)) {
 *   // TypeScript knows error.errors exists
 * }
 * ```
 *
 * @public
 */
export class AggregateErrorX<
  TMetadata extends ErrorXMetadata = ErrorXMetadata,
> extends ErrorX<TMetadata> {
  /** Array of all aggregated errors, each converted to ErrorX with preserved chains */
  public readonly errors: readonly ErrorX[];

  /**
   * Creates a new AggregateErrorX instance containing multiple errors.
   *
   * @param errors - Array of errors to aggregate. Non-ErrorX values are converted via ErrorX.from().
   * @param options - Optional configuration for the aggregate error.
   */
  constructor(errors: unknown[], options?: ErrorXAggregateOptions<TMetadata>) {
    const errorCount = errors.length;
    const defaultMessage =
      errorCount === 0
        ? 'No errors occurred'
        : errorCount === 1
          ? '1 error occurred'
          : `Multiple errors occurred (${errorCount} errors)`;

    super({
      message: options?.message ?? defaultMessage,
      name: options?.name ?? 'AggregateError',
      code: options?.code ?? 'AGGREGATE_ERROR',
      metadata: options?.metadata,
      httpStatus: options?.httpStatus,
    });

    // Convert all errors to ErrorX, preserving existing ErrorX instances
    this.errors = errors.map((err) => (err instanceof ErrorX ? err : ErrorX.from(err)));
  }

  /**
   * Type guard that checks if a value is an AggregateErrorX instance.
   *
   * @param value - Value to check
   * @returns True if value is an AggregateErrorX instance, false otherwise
   *
   * @example
   * ```typescript
   * try {
   *   await batchOperation()
   * } catch (error) {
   *   if (AggregateErrorX.isAggregateErrorX(error)) {
   *     // TypeScript knows error.errors exists
   *     error.errors.forEach(e => console.log(e.message))
   *   }
   * }
   * ```
   */
  public static isAggregateErrorX<TMetadata extends ErrorXMetadata = ErrorXMetadata>(
    value: unknown
  ): value is AggregateErrorX<TMetadata> {
    return value instanceof AggregateErrorX;
  }

  /**
   * Serializes the AggregateErrorX to a JSON-compatible object.
   * Includes the errors array with all aggregated errors serialized.
   *
   * @returns Serializable object representation including all aggregated errors
   */
  public override toJSON(): ErrorXAggregateSerialized {
    const baseSerialized = super.toJSON();
    return {
      ...baseSerialized,
      errors: this.errors.map((err) => err.toJSON()),
    };
  }

  /**
   * Converts the AggregateErrorX to a detailed string representation.
   * Includes summary of aggregated errors with their messages and codes.
   *
   * @returns Formatted string representation including all aggregated error details
   */
  public override toString(): string {
    const baseStr = super.toString();
    const errorSummaries = this.errors.map(
      (err, idx) => `  [${idx + 1}] ${err.name}: ${err.message} [${err.code}]`
    );
    return `${baseStr}\nAggregated errors:\n${errorSummaries.join('\n')}`;
  }

  /**
   * Deserializes an ErrorXAggregateSerialized object back into an AggregateErrorX instance.
   *
   * @param serialized - Serialized aggregate error object
   * @returns Reconstructed AggregateErrorX instance
   *
   * @example
   * ```typescript
   * const serialized = aggregateError.toJSON()
   * const restored = AggregateErrorX.fromJSON(serialized)
   * // restored.errors is fully reconstructed
   * ```
   */
  public static fromJSON<TMetadata extends ErrorXMetadata = ErrorXMetadata>(
    serialized: ErrorXAggregateSerialized
  ): AggregateErrorX<TMetadata> {
    // Deserialize all aggregated errors
    const errors = serialized.errors.map((errSerialized) => ErrorX.fromJSON(errSerialized));

    // Build options object, only including defined properties
    const options: ErrorXAggregateOptions<TMetadata> = {
      message: serialized.message,
      name: serialized.name,
      code: serialized.code,
    };
    if (serialized.metadata !== undefined) {
      options.metadata = serialized.metadata as TMetadata;
    }
    if (serialized.httpStatus !== undefined) {
      options.httpStatus = serialized.httpStatus;
    }

    // Create aggregate with restored properties
    const aggregate = new AggregateErrorX<TMetadata>(errors, options);

    // Restore timestamp and stack
    aggregate.timestamp = serialized.timestamp;
    if (serialized.stack) {
      aggregate.stack = serialized.stack;
    }

    return aggregate;
  }
}
