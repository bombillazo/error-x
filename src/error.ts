import safeStringify from 'safe-stringify';
import type {
  ErrorXAction,
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
 * Enhanced Error class with rich metadata, type-safe error handling, and intelligent error conversion.
 *
 * @example
 * ```typescript
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
 * ```
 *
 * @public
 */
export class ErrorX extends Error {
  /** Error identifier code, auto-generated from name if not provided */
  public code: string;
  /** User-friendly message suitable for display in UI */
  public uiMessage: string | undefined;
  /** Additional context and metadata associated with the error */
  public metadata: ErrorXMetadata | undefined;
  /** Timestamp when the error was created */
  public timestamp: Date;
  /** Error actions for UI behavior and handling */
  public actions: ErrorXAction[] | undefined;
  /** HTTP status code (100-599) for HTTP-related errors */
  public httpStatus: number | undefined;
  /** Error type for categorization */
  public type: string | undefined;
  /** URL related to the error (API endpoint, page URL, resource URL) */
  public url: string | undefined;
  /** Documentation URL for this specific error */
  public href: string | undefined;
  /** Where the error originated (service name, module, component) */
  public source: string | undefined;

  /**
   * Creates a new ErrorX instance with enhanced error handling capabilities.
   *
   * @param messageOrOptions - Error message string or ErrorXOptions object
   * @param additionalOptions - Additional options when first parameter is a string (optional)
   *
   * @example
   * ```typescript
   * // Create with string message only
   * const error1 = new ErrorX('Database query failed')
   *
   * // Create with string message and additional options
   * const error2 = new ErrorX('Database query failed', {
   *   name: 'DatabaseError',
   *   code: 'DB_QUERY_FAILED',
   *   uiMessage: 'Unable to load data. Please try again.',
   *   metadata: { query: 'SELECT * FROM users', timeout: 5000 }
   * })
   *
   * // Create with options object
   * const error3 = new ErrorX({
   *   message: 'Database query failed',
   *   name: 'DatabaseError',
   *   code: 'DB_QUERY_FAILED',
   *   actions: [
   *     { action: 'notify', targets: ['toast'] }
   *   ]
   * })
   *
   * // Create with no options (uses defaults)
   * const error4 = new ErrorX()
   *
   * // For converting unknown errors, use ErrorX.toErrorX()
   * const apiError = { message: 'User not found', code: 404 }
   * const error5 = ErrorX.toErrorX(apiError)
   * ```
   */
  constructor(
    messageOrOptions?: string | ErrorXOptions,
    additionalOptions?: Partial<ErrorXOptions>
  ) {
    let options: ErrorXOptions = {};

    // Handle different input types
    if (typeof messageOrOptions === 'string') {
      // String message provided - merge with additional options
      options = {
        message: messageOrOptions,
        ...additionalOptions,
      };
    } else if (messageOrOptions != null) {
      // ErrorXOptions object - use directly
      options = messageOrOptions;
    }
    // else: undefined/null - use empty options object

    const formattedMessage = ErrorX.formatMessage(options.message);
    super(formattedMessage, { cause: options.cause });

    // Read environment config for defaults
    const envConfig = ErrorX.getEnvConfig();

    this.name = options.name ?? ErrorX.getDefaultName();
    this.code =
      options.code != null ? String(options.code) : ErrorX.generateDefaultCode(options.name);
    this.uiMessage = options.uiMessage;
    this.metadata = options.metadata;
    this.actions = options.actions;
    this.httpStatus = ErrorX.validateHttpStatus(options.httpStatus);
    this.type = ErrorX.validateType(options.type);
    this.timestamp = new Date();

    // Set new fields
    this.url = options.url;
    this.source = options.source ?? envConfig?.source;

    // Auto-generate href from environment config if available
    let generatedHref: string | undefined;
    if (envConfig?.docsBaseURL && envConfig?.docsMap && this.code) {
      const docPath = envConfig.docsMap[this.code];
      if (docPath) {
        generatedHref = `${envConfig.docsBaseURL}/${docPath}`;
      }
    }
    this.href = options.href ?? generatedHref;

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
   * Reads and parses the ERROR_X_CONFIG environment variable.
   * Supports both Node.js and browser environments (isomorphic).
   *
   * Expected config structure:
   * {
   *   "source": "my-service-name",
   *   "docsBaseURL": "https://docs.example.com/errors/",
   *   "docsMap": {
   *     "AUTH_FAILED": "authentication#auth-failed",
   *     "NOT_FOUND": "common#not-found"
   *   }
   * }
   *
   * @returns Parsed config object or null if not available or invalid
   */
  private static getEnvConfig(): {
    source?: string;
    docsBaseURL?: string;
    docsMap?: Record<string, string>;
  } | null {
    try {
      // Check if running in Node.js environment
      const envConfig =
        process?.env?.ERROR_X_CONFIG
          ? process.env.ERROR_X_CONFIG
          : undefined;

      if (!envConfig) return null;

      const parsed = JSON.parse(envConfig);

      // Validate parsed config has expected shape
      if (typeof parsed !== 'object' || parsed === null) {
        return null;
      }

      return parsed;
    } catch {
      // Failed to parse JSON or access environment
      return null;
    }
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

    const stackLines = stack.split('\n');
    const cleanedLines: string[] = [];

    for (const line of stackLines) {
      // Skip lines that contain ErrorX constructor or internal methods
      if (
        line.includes('new ErrorX') ||
        line.includes('ErrorX.constructor') ||
        line.includes('ErrorX.toErrorX') ||
        line.includes('error-x/dist/') ||
        line.includes('error-x/src/error.ts')
      ) {
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
   * Formats error messages with proper capitalization and punctuation.
   * Ensures consistent message formatting across all ErrorX instances.
   *
   * @param message - Raw error message to format (optional)
   * @returns Formatted message with proper capitalization and punctuation
   *
   * @example
   * ```typescript
   * formatMessage('database connection failed') // 'Database connection failed.'
   * formatMessage('user not found. please check credentials') // 'User not found. Please check credentials.'
   * formatMessage() // 'An error occurred'
   * ```
   */
  private static formatMessage(message?: string): string {
    if (!message || typeof message !== 'string' || !message.trim()) {
      return 'An error occurred';
    }

    // Split by sentences and capitalize each
    let formatted = message
      .split('. ')
      .map((sentence) => {
        const trimmed = sentence.trim();
        if (!trimmed) return trimmed;
        return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
      })
      .join('. ');

    // Add period at the end if it doesn't have proper punctuation
    const endsWithPunctuation = /[.!?)\]]$/.test(formatted);
    if (!endsWithPunctuation) {
      formatted = `${formatted}.`;
    }

    return formatted;
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
  public withMetadata(additionalMetadata: ErrorXMetadata): ErrorX {
    const options: ErrorXOptions = {
      message: this.message,
      name: this.name,
      code: this.code,
      uiMessage: this.uiMessage,
      cause: this.cause,
      metadata: { ...(this.metadata ?? {}), ...additionalMetadata },
      httpStatus: this.httpStatus,
      type: this.type,
      url: this.url,
      href: this.href,
      source: this.source,
    };
    if (this.actions) {
      options.actions = this.actions;
    }
    const newError = new ErrorX(options);

    // Preserve the original stack trace
    if (this.stack) {
      newError.stack = this.stack;
    }
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
  public static isErrorX(value: unknown): value is ErrorX {
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
    let actions: ErrorXAction[] | undefined;
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

        // Extract actions
        if ('actions' in error && Array.isArray(error.actions)) {
          actions = error.actions as ErrorXAction[];
        }

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

        // Extract url
        if ('url' in error && error.url) {
          url = String(error.url);
        }

        // Extract href
        if ('href' in error && error.href) {
          href = String(error.href);
        } else if ('docsUrl' in error && error.docsUrl) {
          href = String(error.docsUrl);
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
    if (actions && actions.length > 0) options.actions = actions;
    if (httpStatus) options.httpStatus = httpStatus;
    if (type) options.type = type;
    if (url) options.url = url;
    if (href) options.href = href;
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
   * const error1 = ErrorX.toErrorX('Something went wrong')
   *
   * // Convert regular Error
   * const error2 = ErrorX.toErrorX(new Error('Database failed'))
   *
   * // Convert API response object
   * const apiError = {
   *   message: 'User not found',
   *   code: 'USER_404',
   *   statusText: 'Not Found'
   * }
   * const error3 = ErrorX.toErrorX(apiError)
   * ```
   */
  public static toErrorX(error: unknown): ErrorX {
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
  public cleanStackTrace(delimiter?: string): ErrorX {
    if (delimiter && this.stack) {
      const options: ErrorXOptions = {
        message: this.message,
        name: this.name,
        code: this.code,
        uiMessage: this.uiMessage,
        cause: this.cause,
        httpStatus: this.httpStatus,
        type: this.type,
        url: this.url,
        href: this.href,
        source: this.source,
      };
      if (this.metadata !== undefined) {
        options.metadata = this.metadata;
      }
      if (this.actions) {
        options.actions = this.actions;
      }
      const newError = new ErrorX(options);
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

    // Use safe stringify to parse the metadata and remove circular references
    const safeMetadata: ErrorXMetadata | undefined = this.metadata
      ? JSON.parse(safeStringify(this.metadata))
      : undefined;

    const serialized: ErrorXSerialized = {
      name: this.name,
      message: this.message,
      code: this.code,
      uiMessage: this.uiMessage,
      metadata: safeMetadata,
      timestamp: this.timestamp.toISOString(),
    };

    // Include actions if present
    if (this.actions && this.actions.length > 0) {
      // Use safe stringify to parse the actions and remove circular references
      const stringified = safeStringify(this.actions);
      serialized.actions = JSON.parse(stringified);
    }

    // Include httpStatus if present
    if (this.httpStatus !== undefined) {
      serialized.httpStatus = this.httpStatus;
    }

    // Include type if present
    if (this.type !== undefined) {
      serialized.type = this.type;
    }

    // Include url if present
    if (this.url !== undefined) {
      serialized.url = this.url;
    }

    // Include href if present
    if (this.href !== undefined) {
      serialized.href = this.href;
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
        const causeObj = this.cause as any;
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
  public static fromJSON(serialized: ErrorXSerialized): ErrorX {
    const options: ErrorXOptions = {
      message: serialized.message,
      name: serialized.name,
      code: serialized.code,
      uiMessage: serialized.uiMessage,
      httpStatus: serialized.httpStatus,
      type: serialized.type,
      url: serialized.url,
      href: serialized.href,
      source: serialized.source,
    };
    if (serialized.metadata !== undefined) {
      options.metadata = serialized.metadata;
    }

    if (serialized.actions && serialized.actions.length > 0) {
      options.actions = serialized.actions;
    }

    const error = new ErrorX(options);

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

  /**
   * HTTP error presets for common HTTP status codes.
   *
   * ## Features
   * - **Pre-configured error templates** for common HTTP status codes (400-511)
   * - **Type-safe** with TypeScript support
   * - **Fully customizable** via destructuring and override pattern
   * - **User-friendly messages** included for all presets
   * - **Categorized by type** - all HTTP presets include `type: 'http'`
   *
   * ## Usage Patterns
   *
   * ### 1. Direct Usage
   * Use a preset as-is without any modifications:
   * ```typescript
   * throw new ErrorX(ErrorX.HTTP.NOT_FOUND)
   * // Result: 404 error with default message and UI message
   * ```
   *
   * ### 2. Override Specific Fields
   * Customize the error while keeping other preset values:
   * ```typescript
   * throw new ErrorX({
   *   ...ErrorX.HTTP.NOT_FOUND,
   *   message: 'User not found',
   *   metadata: { userId: 123 }
   * })
   * // Result: 404 error with custom message but keeps httpStatus, code, name, uiMessage, type
   * ```
   *
   * ### 3. Add Metadata and Actions
   * Enhance presets with additional context and behaviors:
   * ```typescript
   * throw new ErrorX({
   *   ...ErrorX.HTTP.UNAUTHORIZED,
   *   metadata: { attemptedAction: 'viewProfile', userId: 456 },
   *   actions: [
   *     { action: 'logout', payload: { clearStorage: true } },
   *     { action: 'redirect', payload: { redirectURL: '/login' } }
   *   ]
   * })
   * ```
   *
   * ### 4. Add Error Cause
   * Chain errors by adding a cause:
   * ```typescript
   * try {
   *   // some operation
   * } catch (originalError) {
   *   throw new ErrorX({
   *     ...ErrorX.HTTP.INTERNAL_SERVER_ERROR,
   *     cause: originalError,
   *     metadata: { operation: 'database-query' }
   *   })
   * }
   * ```
   *
   * ## Common HTTP Presets
   *
   * ### 4xx Client Errors
   * - `BAD_REQUEST` (400) - Invalid request data
   * - `UNAUTHORIZED` (401) - Authentication required
   * - `FORBIDDEN` (403) - Insufficient permissions
   * - `NOT_FOUND` (404) - Resource not found
   * - `METHOD_NOT_ALLOWED` (405) - HTTP method not allowed
   * - `CONFLICT` (409) - Resource conflict
   * - `UNPROCESSABLE_ENTITY` (422) - Validation failed
   * - `TOO_MANY_REQUESTS` (429) - Rate limit exceeded
   *
   * ### 5xx Server Errors
   * - `INTERNAL_SERVER_ERROR` (500) - Unexpected server error
   * - `NOT_IMPLEMENTED` (501) - Feature not implemented
   * - `BAD_GATEWAY` (502) - Upstream server error
   * - `SERVICE_UNAVAILABLE` (503) - Service temporarily down
   * - `GATEWAY_TIMEOUT` (504) - Upstream timeout
   *
   * @example
   * ```typescript
   * // API endpoint example
   * app.get('/users/:id', async (req, res) => {
   *   const user = await db.users.findById(req.params.id)
   *
   *   if (!user) {
   *     throw new ErrorX({
   *       ...ErrorX.HTTP.NOT_FOUND,
   *       message: 'User not found',
   *       metadata: { userId: req.params.id }
   *     })
   *   }
   *
   *   res.json(user)
   * })
   *
   * // Authentication middleware example
   * const requireAuth = (req, res, next) => {
   *   if (!req.user) {
   *     throw new ErrorX({
   *       ...ErrorX.HTTP.UNAUTHORIZED,
   *       actions: [
   *         { action: 'redirect', payload: { redirectURL: '/login' } }
   *       ]
   *     })
   *   }
   *   next()
   * }
   *
   * // Rate limiting example
   * if (isRateLimited(req.ip)) {
   *   throw new ErrorX({
   *     ...ErrorX.HTTP.TOO_MANY_REQUESTS,
   *     metadata: {
   *       ip: req.ip,
   *       retryAfter: 60
   *     }
   *   })
   * }
   * ```
   *
   * @public
   */
  public static readonly HTTP = {
    // 4xx Client Errors
    BAD_REQUEST: {
      httpStatus: 400,
      code: 'BAD_REQUEST',
      name: 'Bad Request Error',
      message: 'bad request',
      uiMessage: 'The request could not be processed. Please check your input and try again.',
      type: 'http',
    } satisfies ErrorXOptions,

    UNAUTHORIZED: {
      httpStatus: 401,
      code: 'UNAUTHORIZED',
      name: 'Unauthorized Error',
      message: 'unauthorized',
      uiMessage: 'Authentication required. Please log in to continue.',
      type: 'http',
    } satisfies ErrorXOptions,

    PAYMENT_REQUIRED: {
      httpStatus: 402,
      code: 'PAYMENT_REQUIRED',
      name: 'Payment Required Error',
      message: 'payment required',
      uiMessage: 'Payment is required to access this resource.',
      type: 'http',
    } satisfies ErrorXOptions,

    FORBIDDEN: {
      httpStatus: 403,
      code: 'FORBIDDEN',
      name: 'Forbidden Error',
      message: 'forbidden',
      uiMessage: 'You do not have permission to access this resource.',
      type: 'http',
    } satisfies ErrorXOptions,

    NOT_FOUND: {
      httpStatus: 404,
      code: 'NOT_FOUND',
      name: 'Not Found Error',
      message: 'not found',
      uiMessage: 'The requested resource could not be found.',
      type: 'http',
    } satisfies ErrorXOptions,

    METHOD_NOT_ALLOWED: {
      httpStatus: 405,
      code: 'METHOD_NOT_ALLOWED',
      name: 'Method Not Allowed Error',
      message: 'method not allowed',
      uiMessage: 'This action is not allowed for the requested resource.',
      type: 'http',
    } satisfies ErrorXOptions,

    NOT_ACCEPTABLE: {
      httpStatus: 406,
      code: 'NOT_ACCEPTABLE',
      name: 'Not Acceptable Error',
      message: 'not acceptable',
      uiMessage: 'The requested format is not supported.',
      type: 'http',
    } satisfies ErrorXOptions,

    PROXY_AUTHENTICATION_REQUIRED: {
      httpStatus: 407,
      code: 'PROXY_AUTHENTICATION_REQUIRED',
      name: 'Proxy Authentication Required Error',
      message: 'proxy authentication required',
      uiMessage: 'Proxy authentication is required to access this resource.',
      type: 'http',
    } satisfies ErrorXOptions,

    REQUEST_TIMEOUT: {
      httpStatus: 408,
      code: 'REQUEST_TIMEOUT',
      name: 'Request Timeout Error',
      message: 'request timeout',
      uiMessage: 'The request took too long to complete. Please try again.',
      type: 'http',
    } satisfies ErrorXOptions,

    CONFLICT: {
      httpStatus: 409,
      code: 'CONFLICT',
      name: 'Conflict Error',
      message: 'conflict',
      uiMessage: 'The request conflicts with the current state. Please refresh and try again.',
      type: 'http',
    } satisfies ErrorXOptions,

    GONE: {
      httpStatus: 410,
      code: 'GONE',
      name: 'Gone Error',
      message: 'gone',
      uiMessage: 'This resource is no longer available.',
      type: 'http',
    } satisfies ErrorXOptions,

    LENGTH_REQUIRED: {
      httpStatus: 411,
      code: 'LENGTH_REQUIRED',
      name: 'Length Required Error',
      message: 'length required',
      uiMessage: 'The request is missing required length information.',
      type: 'http',
    } satisfies ErrorXOptions,

    PRECONDITION_FAILED: {
      httpStatus: 412,
      code: 'PRECONDITION_FAILED',
      name: 'Precondition Failed Error',
      message: 'precondition failed',
      uiMessage: 'A required condition was not met. Please try again.',
      type: 'http',
    } satisfies ErrorXOptions,

    PAYLOAD_TOO_LARGE: {
      httpStatus: 413,
      code: 'PAYLOAD_TOO_LARGE',
      name: 'Payload Too Large Error',
      message: 'payload too large',
      uiMessage: 'The request is too large. Please reduce the size and try again.',
      type: 'http',
    } satisfies ErrorXOptions,

    URI_TOO_LONG: {
      httpStatus: 414,
      code: 'URI_TOO_LONG',
      name: 'URI Too Long Error',
      message: 'URI too long',
      uiMessage: 'The request URL is too long.',
      type: 'http',
    } satisfies ErrorXOptions,

    UNSUPPORTED_MEDIA_TYPE: {
      httpStatus: 415,
      code: 'UNSUPPORTED_MEDIA_TYPE',
      name: 'Unsupported Media Type Error',
      message: 'unsupported media type',
      uiMessage: 'The file type is not supported.',
      type: 'http',
    } satisfies ErrorXOptions,

    RANGE_NOT_SATISFIABLE: {
      httpStatus: 416,
      code: 'RANGE_NOT_SATISFIABLE',
      name: 'Range Not Satisfiable Error',
      message: 'range not satisfiable',
      uiMessage: 'The requested range cannot be satisfied.',
      type: 'http',
    } satisfies ErrorXOptions,

    EXPECTATION_FAILED: {
      httpStatus: 417,
      code: 'EXPECTATION_FAILED',
      name: 'Expectation Failed Error',
      message: 'expectation failed',
      uiMessage: 'The server cannot meet the requirements of the request.',
      type: 'http',
    } satisfies ErrorXOptions,

    IM_A_TEAPOT: {
      httpStatus: 418,
      code: 'IM_A_TEAPOT',
      name: 'Im A Teapot Error',
      message: "i'm a teapot",
      uiMessage: "I'm a teapot and cannot brew coffee.",
      type: 'http',
    } satisfies ErrorXOptions,

    UNPROCESSABLE_ENTITY: {
      httpStatus: 422,
      code: 'UNPROCESSABLE_ENTITY',
      name: 'Unprocessable Entity Error',
      message: 'unprocessable entity',
      uiMessage: 'The request contains invalid data. Please check your input.',
      type: 'http',
    } satisfies ErrorXOptions,

    LOCKED: {
      httpStatus: 423,
      code: 'LOCKED',
      name: 'Locked Error',
      message: 'locked',
      uiMessage: 'This resource is locked and cannot be modified.',
      type: 'http',
    } satisfies ErrorXOptions,

    FAILED_DEPENDENCY: {
      httpStatus: 424,
      code: 'FAILED_DEPENDENCY',
      name: 'Failed Dependency Error',
      message: 'failed dependency',
      uiMessage: 'The request failed due to a dependency error.',
      type: 'http',
    } satisfies ErrorXOptions,

    TOO_EARLY: {
      httpStatus: 425,
      code: 'TOO_EARLY',
      name: 'Too Early Error',
      message: 'too early',
      uiMessage: 'The request was sent too early. Please try again later.',
      type: 'http',
    } satisfies ErrorXOptions,

    UPGRADE_REQUIRED: {
      httpStatus: 426,
      code: 'UPGRADE_REQUIRED',
      name: 'Upgrade Required Error',
      message: 'upgrade required',
      uiMessage: 'Please upgrade to continue using this service.',
      type: 'http',
    } satisfies ErrorXOptions,

    PRECONDITION_REQUIRED: {
      httpStatus: 428,
      code: 'PRECONDITION_REQUIRED',
      name: 'Precondition Required Error',
      message: 'precondition required',
      uiMessage: 'Required conditions are missing from the request.',
      type: 'http',
    } satisfies ErrorXOptions,

    TOO_MANY_REQUESTS: {
      httpStatus: 429,
      code: 'TOO_MANY_REQUESTS',
      name: 'Too Many Requests Error',
      message: 'too many requests',
      uiMessage: 'You have made too many requests. Please wait and try again.',
      type: 'http',
    } satisfies ErrorXOptions,

    REQUEST_HEADER_FIELDS_TOO_LARGE: {
      httpStatus: 431,
      code: 'REQUEST_HEADER_FIELDS_TOO_LARGE',
      name: 'Request Header Fields Too Large Error',
      message: 'request header fields too large',
      uiMessage: 'The request headers are too large.',
      type: 'http',
    } satisfies ErrorXOptions,

    UNAVAILABLE_FOR_LEGAL_REASONS: {
      httpStatus: 451,
      code: 'UNAVAILABLE_FOR_LEGAL_REASONS',
      name: 'Unavailable For Legal Reasons Error',
      message: 'unavailable for legal reasons',
      uiMessage: 'This content is unavailable for legal reasons.',
      type: 'http',
    } satisfies ErrorXOptions,

    // 5xx Server Errors
    INTERNAL_SERVER_ERROR: {
      httpStatus: 500,
      code: 'INTERNAL_SERVER_ERROR',
      name: 'Internal Server Error',
      message: 'internal server error',
      uiMessage: 'An unexpected error occurred. Please try again later.',
      type: 'http',
    } satisfies ErrorXOptions,

    NOT_IMPLEMENTED: {
      httpStatus: 501,
      code: 'NOT_IMPLEMENTED',
      name: 'Not Implemented Error',
      message: 'not implemented',
      uiMessage: 'This feature is not yet available.',
      type: 'http',
    } satisfies ErrorXOptions,

    BAD_GATEWAY: {
      httpStatus: 502,
      code: 'BAD_GATEWAY',
      name: 'Bad Gateway Error',
      message: 'bad gateway',
      uiMessage: 'Unable to connect to the server. Please try again later.',
      type: 'http',
    } satisfies ErrorXOptions,

    SERVICE_UNAVAILABLE: {
      httpStatus: 503,
      code: 'SERVICE_UNAVAILABLE',
      name: 'Service Unavailable Error',
      message: 'service unavailable',
      uiMessage: 'The service is temporarily unavailable. Please try again later.',
      type: 'http',
    } satisfies ErrorXOptions,

    GATEWAY_TIMEOUT: {
      httpStatus: 504,
      code: 'GATEWAY_TIMEOUT',
      name: 'Gateway Timeout Error',
      message: 'gateway timeout',
      uiMessage: 'The server took too long to respond. Please try again.',
      type: 'http',
    } satisfies ErrorXOptions,

    HTTP_VERSION_NOT_SUPPORTED: {
      httpStatus: 505,
      code: 'HTTP_VERSION_NOT_SUPPORTED',
      name: 'HTTP Version Not Supported Error',
      message: 'HTTP version not supported',
      uiMessage: 'Your browser version is not supported.',
      type: 'http',
    } satisfies ErrorXOptions,

    VARIANT_ALSO_NEGOTIATES: {
      httpStatus: 506,
      code: 'VARIANT_ALSO_NEGOTIATES',
      name: 'Variant Also Negotiates Error',
      message: 'variant also negotiates',
      uiMessage: 'The server has an internal configuration error.',
      type: 'http',
    } satisfies ErrorXOptions,

    INSUFFICIENT_STORAGE: {
      httpStatus: 507,
      code: 'INSUFFICIENT_STORAGE',
      name: 'Insufficient Storage Error',
      message: 'insufficient storage',
      uiMessage: 'The server has insufficient storage to complete the request.',
      type: 'http',
    } satisfies ErrorXOptions,

    LOOP_DETECTED: {
      httpStatus: 508,
      code: 'LOOP_DETECTED',
      name: 'Loop Detected Error',
      message: 'loop detected',
      uiMessage: 'The server detected an infinite loop.',
      type: 'http',
    } satisfies ErrorXOptions,

    NOT_EXTENDED: {
      httpStatus: 510,
      code: 'NOT_EXTENDED',
      name: 'Not Extended Error',
      message: 'not extended',
      uiMessage: 'Additional extensions are required.',
      type: 'http',
    } satisfies ErrorXOptions,

    NETWORK_AUTHENTICATION_REQUIRED: {
      httpStatus: 511,
      code: 'NETWORK_AUTHENTICATION_REQUIRED',
      name: 'Network Authentication Required Error',
      message: 'network authentication required',
      uiMessage: 'Network authentication is required to access this resource.',
      type: 'http',
    } satisfies ErrorXOptions,
  } as const;
}
