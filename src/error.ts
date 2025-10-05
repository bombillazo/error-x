import safeStringify from 'safe-stringify';
import type {
  ErrorXCause,
  ErrorXMetadata,
  ErrorXOptionField,
  ErrorXOptions,
  ErrorXSerialized,
} from './types.js';
import { ERROR_X_OPTION_FIELDS } from './types.js';

// Use the single source of truth for accepted fields
const acceptedFields = new Set(ERROR_X_OPTION_FIELDS);

/**
 * Configuration interface for ErrorX global settings
 *
 * @public
 */
export interface ErrorXConfig {
  /** Default source identifier for all errors (e.g., service name, module name) */
  source?: string;
  /** Base URL for error documentation */
  docsBaseURL?: string;
  /** Mapping of error codes to documentation paths */
  docsMap?: Record<string, string>;
  /**
   * Control stack trace cleaning behavior
   * - true: Enable automatic stack trace cleaning (default)
   * - false: Disable stack trace cleaning entirely
   * - string[]: Custom patterns to match and remove from stack traces
   */
  cleanStack?: boolean | string[];
}

/**
 * Enhanced Error class with rich metadata, type-safe error handling, and intelligent error conversion.
 *
 * @example
 * ```typescript
 * // Configure globally (optional)
 * ErrorX.configure({
 *   source: 'my-service',
 *   docsBaseURL: 'https://docs.example.com',
 *   docsMap: {
 *     'AUTH_FAILED': 'errors/authentication',
 *     'DB_ERROR': 'errors/database'
 *   }
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
 *   uiMessage: 'Please check your credentials',
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
  /** User-friendly message suitable for display in UI */
  public uiMessage: string | undefined;
  /** Additional context and metadata associated with the error */
  public metadata: TMetadata | undefined;
  /** Timestamp when the error was created */
  public timestamp: Date;
  /** HTTP status code (100-599) for HTTP-related errors */
  public httpStatus: number | undefined;
  /** Error type for categorization */
  public type: string | undefined;
  /** Source URL related to the error (API endpoint, page URL, resource URL) */
  public sourceUrl: string | undefined;
  /** Documentation URL for this specific error */
  public docsUrl: string | undefined;
  /** Where the error originated (service name, module, component) */
  public source: string | undefined;

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
   *   uiMessage: 'Unable to load data. Please try again.',
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

    // Read environment config for defaults
    const envConfig = ErrorX.getConfig();

    // Use default message if not provided or if it's empty/whitespace-only
    const message = options.message?.trim() ? options.message : 'An error occurred';

    // For pre-ES2022 environments that don't support Error.cause option
    // We pass the cause option but manually set it afterwards as a fallback
    super(message, { cause: options.cause });

    // Polyfill for environments that don't support error.cause (pre-ES2022)
    // This ensures the cause property is always set correctly
    if (options.cause !== undefined && !Object.hasOwn(this, 'cause')) {
      Object.defineProperty(this, 'cause', {
        value: options.cause,
        writable: true,
        enumerable: false,
        configurable: true,
      });
    }

    this.name = options.name ?? ErrorX.getDefaultName();
    this.code =
      options.code != null ? String(options.code) : ErrorX.generateDefaultCode(options.name);
    this.uiMessage = options.uiMessage;
    this.metadata = options.metadata;
    this.httpStatus = ErrorX.validateHttpStatus(options.httpStatus);
    this.type = ErrorX.validateType(options.type);
    this.timestamp = new Date();

    // Set new fields
    this.sourceUrl = options.sourceUrl;
    this.source = options.source ?? envConfig?.source;

    // Auto-generate docsUrl from environment config if available
    let generatedDocsUrl: string | undefined;
    if (envConfig?.docsBaseURL && envConfig?.docsMap && this.code) {
      const docPath = envConfig.docsMap[this.code];
      if (docPath) {
        // Normalize URL construction to avoid double slashes
        const base = envConfig.docsBaseURL.replace(/\/+$/, ''); // Remove trailing slashes
        const path = docPath.replace(/^\/+/, ''); // Remove leading slashes
        generatedDocsUrl = `${base}/${path}`;
      }
    }
    this.docsUrl = options.docsUrl ?? generatedDocsUrl;

    // Handle stack trace preservation
    if (options.cause instanceof Error) {
      this.stack = ErrorX.preserveOriginalStack(options.cause, this);
    } else {
      // Node.js specific stack trace capture for clean stack
      if (typeof Error.captureStackTrace === 'function') {
        Error.captureStackTrace(this, this.constructor);
      }
      // Clean the stack to remove ErrorX constructor noise
      this.stack = ErrorX.cleanStack(this.stack);
    }
  }

  /**
   * Returns the default error name.
   * @returns Default error name 'Error'
   */
  private static getDefaultName(): string {
    return 'Error';
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
   *   source: 'my-api-service',
   *   docsBaseURL: 'https://docs.example.com/errors',
   *   docsMap: {
   *     'AUTH_FAILED': 'authentication-errors',
   *     'DB_ERROR': 'database-errors'
   *   }
   * })
   * ```
   */
  public static configure(config: ErrorXConfig): void {
    ErrorX._config = config;
  }

  /**
   * Get the current global configuration.
   * Returns null if no configuration has been set.
   */
  public static getConfig(): ErrorXConfig | null {
    return ErrorX._config;
  }

  /**
   * Validates HTTP status code to ensure it's within valid range (100-599)
   *
   * @param status - Status code to validate
   * @returns Valid status code or undefined if invalid/not provided
   */
  private static validateHttpStatus(status?: number): number | undefined {
    if (status === undefined || status === null) {
      return undefined;
    }

    const statusNum = Number(status);

    // Validate status code is a number and within valid HTTP range
    if (Number.isNaN(statusNum) || statusNum < 100 || statusNum > 599) {
      return undefined;
    }

    return Math.floor(statusNum);
  }

  /**
   * Validates and normalizes the type field
   *
   * @param type - Type value to validate
   * @returns Validated type string or undefined if invalid/empty
   */
  private static validateType(type?: string): string | undefined {
    if (type === undefined || type === null) {
      return undefined;
    }

    const typeStr = String(type).trim();

    // Return undefined for empty strings
    if (typeStr === '') {
      return undefined;
    }

    return typeStr;
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
   * Preserves the original error's stack trace while updating the error message.
   * Combines the new error's message with the original error's stack trace.
   *
   * @param originalError - The original error whose stack to preserve
   * @param newError - The new error whose message to use
   * @returns Combined stack trace with new error message and original stack
   */
  private static preserveOriginalStack(originalError: Error, newError: Error): string {
    if (!originalError.stack) return newError.stack || '';

    // Get the new error's first line (error name + message)
    const newErrorFirstLine = `${newError.name}: ${newError.message}`;

    // Get original stack lines (skip the first line which is the original error message)
    const originalStackLines = originalError.stack.split('\n');
    const originalStackTrace = originalStackLines.slice(1);

    // Combine new error message with original stack trace
    return [newErrorFirstLine, ...originalStackTrace].join('\n');
  }

  /**
   * Cleans the stack trace by removing ErrorX internal method calls.
   * This provides cleaner stack traces that focus on user code.
   *
   * @param stack - Raw stack trace to clean
   * @returns Cleaned stack trace without ErrorX internal calls
   */
  private static cleanStack(stack?: string): string {
    if (!stack) return '';

    const config = ErrorX.getConfig();
    const cleanStackConfig = config?.cleanStack ?? true; // Default to true

    // If cleanStack is explicitly disabled, return original stack
    if (cleanStackConfig === false) {
      return stack;
    }

    const stackLines = stack.split('\n');
    const cleanedLines: string[] = [];

    // Default patterns to remove
    const defaultPatterns = [
      'new ErrorX',
      'ErrorX.constructor',
      'ErrorX.from',
      'error-x/dist/',
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

    return cleanedLines.join('\n');
  }

  /**
   * Processes an error's stack trace to trim it after a specified delimiter.
   * Useful for removing irrelevant stack frames before a specific function.
   *
   * @param error - Error whose stack to process
   * @param delimiter - String to search for in stack lines
   * @returns Processed stack trace starting after the delimiter
   *
   * @example
   * ```typescript
   * const processed = ErrorX.processErrorStack(error, 'my-app-entry')
   * // Returns stack trace starting after the line containing 'my-app-entry'
   * ```
   */
  private static processErrorStack(error: Error, delimiter: string): string {
    let stack = error.stack ?? '';
    const stackLines = stack.split('\n');

    // Find the index of the first line containing the delimiter
    const delimiterIndex = stackLines.findIndex((line) => line.includes(delimiter));

    // If the delimiter is found, return all lines after it
    if (delimiterIndex !== -1) {
      stack = stackLines.slice(delimiterIndex + 1).join('\n');
    }
    return stack;
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
  public withMetadata(additionalMetadata: Partial<TMetadata>): ErrorX<TMetadata> {
    const options: ErrorXOptions<TMetadata> = {
      message: this.message,
      name: this.name,
      code: this.code,
      uiMessage: this.uiMessage,
      cause: this.cause,
      metadata: { ...(this.metadata ?? {}), ...additionalMetadata } as TMetadata,
      httpStatus: this.httpStatus,
      type: this.type,
      sourceUrl: this.sourceUrl,
      docsUrl: this.docsUrl,
      source: this.source,
    };
    const newError = new ErrorX<TMetadata>(options);

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
   * This is a private helper method used by both the constructor and toErrorX.
   *
   * @param error - Value to convert to ErrorXOptions
   * @returns ErrorXOptions object with extracted properties
   * @internal
   */
  private static convertUnknownToOptions(error: unknown): ErrorXOptions {
    let name = '';
    let message = '';
    let code = '';
    let uiMessage = '';
    let cause: unknown;
    let metadata: ErrorXMetadata = {};
    let httpStatus: number | undefined;
    let type: string | undefined;
    let url: string | undefined;
    let href: string | undefined;
    let source: string | undefined;

    if (error) {
      if (typeof error === 'string') {
        message = error;
        metadata = { originalError: error };
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

        // Extract UI message
        if ('uiMessage' in error && error.uiMessage) uiMessage = String(error.uiMessage);
        else if ('userMessage' in error && error.userMessage) uiMessage = String(error.userMessage);

        let _httpStatus: unknown;
        // Extract HTTP status
        if ('httpStatus' in error) {
          _httpStatus = error.httpStatus;
        } else if ('status' in error) {
          _httpStatus = error.status;
        } else if ('statusCode' in error) {
          _httpStatus = error.statusCode;
        }
        if (_httpStatus !== undefined && _httpStatus !== null) {
          const num = typeof _httpStatus === 'number' ? _httpStatus : Number(_httpStatus);
          httpStatus = ErrorX.validateHttpStatus(num);
        }

        // Extract type
        if ('type' in error && error.type) {
          type = ErrorX.validateType(String(error.type));
        }

        // Extract sourceUrl
        if ('sourceUrl' in error && error.sourceUrl) {
          url = String(error.sourceUrl);
        } else if ('url' in error && error.url) {
          url = String(error.url);
        }

        // Extract docsUrl
        if ('docsUrl' in error && error.docsUrl) {
          href = String(error.docsUrl);
        } else if ('href' in error && error.href) {
          href = String(error.href);
        } else if ('documentationUrl' in error && error.documentationUrl) {
          href = String(error.documentationUrl);
        }

        // Extract source
        if ('source' in error && error.source) {
          source = String(error.source);
        } else if ('service' in error && error.service) {
          source = String(error.service);
        } else if ('component' in error && error.component) {
          source = String(error.component);
        }

        // Store original object as metadata if it has additional properties
        metadata = { originalError: error };
      }
    }

    const options: ErrorXOptions = {
      message: message || 'Unknown error occurred',
    };

    if (name) options.name = name;
    if (code) options.code = code;
    if (uiMessage) options.uiMessage = uiMessage;
    if (cause) options.cause = cause;
    if (Object.keys(metadata).length > 0) options.metadata = metadata;
    if (httpStatus) options.httpStatus = httpStatus;
    if (type) options.type = type;
    if (url) options.sourceUrl = url;
    if (href) options.docsUrl = href;
    if (source) options.source = source;

    return options;
  }

  /**
   * Converts unknown input into an ErrorX instance with intelligent property extraction.
   * Handles strings, regular Error objects, API response objects, and unknown values.
   *
   * @param error - Value to convert to ErrorX
   * @returns ErrorX instance with extracted properties
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
   *   statusText: 'Not Found'
   * }
   * const error3 = ErrorX.from(apiError)
   * ```
   */
  public static from<TMetadata extends ErrorXMetadata = ErrorXMetadata>(
    error: ErrorX<TMetadata>
  ): ErrorX<TMetadata>;
  public static from(error: Error): ErrorX;
  public static from(error: string): ErrorX;
  public static from(error: unknown): ErrorX;
  public static from(error: unknown): ErrorX {
    if (error instanceof ErrorX) return error;

    const options = ErrorX.convertUnknownToOptions(error);
    return new ErrorX(options);
  }

  /**
   * Creates a new ErrorX instance with cleaned stack trace using the specified delimiter.
   * Returns the same instance if no delimiter is provided or no stack is available.
   *
   * @param delimiter - Optional string to search for in stack lines
   * @returns New ErrorX instance with cleaned stack trace, or the same instance if no cleaning needed
   *
   * @example
   * ```typescript
   * const error = new ErrorX({ message: 'Database error' })
   * const cleanedError = error.cleanStackTrace('database-layer')
   * // Returns new ErrorX with stack trace starting after 'database-layer'
   * ```
   */
  public cleanStackTrace(delimiter?: string): ErrorX<TMetadata> {
    if (delimiter && this.stack) {
      const options: ErrorXOptions = {
        message: this.message,
        name: this.name,
        code: this.code,
        uiMessage: this.uiMessage,
        cause: this.cause,
        httpStatus: this.httpStatus,
        type: this.type,
        sourceUrl: this.sourceUrl,
        docsUrl: this.docsUrl,
        source: this.source,
      };
      if (this.metadata !== undefined) {
        options.metadata = this.metadata;
      }
      const newError = new ErrorX<TMetadata>(options as ErrorXOptions<TMetadata>);
      newError.stack = ErrorX.processErrorStack(this, delimiter);
      return newError;
    }
    return this;
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
   * // Output: "DatabaseError: Database connection failed. [DB_CONN_FAILED] (2024-01-15T10:30:45.123Z) metadata: {...}"
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
    parts.push(`(${this.timestamp.toISOString()})`);

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
      try {
        // Try direct serialization first (most common case, fastest)
        JSON.stringify(this.metadata);
        safeMetadata = this.metadata;
      } catch {
        // Fallback to safe stringify for circular references
        safeMetadata = JSON.parse(safeStringify(this.metadata));
      }
    }

    const serialized: ErrorXSerialized = {
      name: this.name,
      message: this.message,
      code: this.code,
      uiMessage: this.uiMessage,
      metadata: safeMetadata,
      timestamp: this.timestamp.toISOString(),
    };

    // Include httpStatus if present
    if (this.httpStatus !== undefined) {
      serialized.httpStatus = this.httpStatus;
    }

    // Include type if present
    if (this.type !== undefined) {
      serialized.type = this.type;
    }

    // Include url if present
    if (this.sourceUrl !== undefined) {
      serialized.sourceUrl = this.sourceUrl;
    }

    // Include href if present
    if (this.docsUrl !== undefined) {
      serialized.docsUrl = this.docsUrl;
    }

    // Include source if present
    if (this.source !== undefined) {
      serialized.source = this.source;
    }

    // Include stack if available
    if (this.stack) {
      serialized.stack = this.stack;
    }

    // Serialize cause as simplified format
    if (this.cause) {
      if (this.cause instanceof Error) {
        const cause: ErrorXCause = {
          message: this.cause.message,
        };
        if (this.cause.name) {
          cause.name = this.cause.name;
        }
        if (this.cause.stack) {
          cause.stack = this.cause.stack;
        }
        serialized.cause = cause;
      } else if (typeof this.cause === 'object' && this.cause !== null) {
        // Handle non-Error objects
        const causeObj = this.cause as Record<string, unknown>;
        const cause: ErrorXCause = {
          message: String(causeObj.message || causeObj),
        };
        if (causeObj.name) {
          cause.name = String(causeObj.name);
        }
        if (causeObj.stack) {
          cause.stack = String(causeObj.stack);
        }
        serialized.cause = cause;
      } else {
        // Handle primitives
        serialized.cause = {
          message: String(this.cause),
        };
      }
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
   *   uiMessage: 'Database is temporarily unavailable',
   *   metadata: { host: 'localhost' },
   *   timestamp: '2024-01-15T10:30:45.123Z'
   * }
   *
   * const error = ErrorX.fromJSON(serializedError)
   * // Fully restored ErrorX instance with all properties
   * ```
   */
  public static fromJSON<TMetadata extends ErrorXMetadata = ErrorXMetadata>(
    serialized: ErrorXSerialized
  ): ErrorX<TMetadata> {
    const options: ErrorXOptions = {
      message: serialized.message,
      name: serialized.name,
      code: serialized.code,
      uiMessage: serialized.uiMessage,
      httpStatus: serialized.httpStatus,
      type: serialized.type,
      sourceUrl: serialized.sourceUrl,
      docsUrl: serialized.docsUrl,
      source: serialized.source,
    };
    if (serialized.metadata !== undefined) {
      options.metadata = serialized.metadata;
    }

    const error = new ErrorX<TMetadata>(options as ErrorXOptions<TMetadata>);

    // Restore stack and timestamp
    if (serialized.stack) {
      error.stack = serialized.stack;
    }
    // Properties are now mutable, so we can set directly
    error.timestamp = new Date(serialized.timestamp);

    // Restore cause from simplified format
    if (serialized.cause) {
      const causeError = new Error(serialized.cause.message);
      if (serialized.cause.name) {
        causeError.name = serialized.cause.name;
      }
      if (serialized.cause.stack) {
        causeError.stack = serialized.cause.stack;
      }

      Object.defineProperty(error, 'cause', {
        value: causeError,
        writable: true,
      });
    }

    return error;
  }
}
