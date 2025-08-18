import type { ErrorMetadata, ErrorXOptions, SerializableError, ErrorAction } from './types.js'
import safeStringify from 'safe-stringify';

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
  public readonly code: string
  /** User-friendly message suitable for display in UI */
  public readonly uiMessage: string | undefined
  /** Additional context and metadata associated with the error */
  public readonly metadata: ErrorMetadata | undefined
  /** Timestamp when the error was created */
  public readonly timestamp: Date
  /** Error actions for UI behavior and handling */
  public readonly actions: ErrorAction[] | undefined

  /**
   * Creates a new ErrorX instance with enhanced error handling capabilities.
   * 
   * @param options - Configuration options for the error (optional)
   * @param options.message - Technical error message (defaults to 'An error occurred')
   * @param options.name - Error type/name (defaults to 'Error')
   * @param options.code - Error identifier code (auto-generated from name if not provided)
   * @param options.uiMessage - User-friendly message (defaults to undefined)
   * @param options.cause - Original error that caused this error
   * @param options.metadata - Additional context data (defaults to undefined)
   * @param options.actions - Error actions for UI behavior and handling (defaults to undefined)
   * 
   * @example
   * ```typescript
   * // Create with full options
   * const error = new ErrorX({
   *   message: 'Database query failed',
   *   name: 'DatabaseError',
   *   code: 'DB_QUERY_FAILED',
   *   uiMessage: 'Unable to load data. Please try again.',
   *   metadata: { query: 'SELECT * FROM users', timeout: 5000 },
   *   actions: [
   *     { 
   *       action: 'notify', 
   *       payload: { targets: [HandlingTargets.TOAST] }
   *     },
   *     { 
   *       action: 'redirect', 
   *       payload: { redirectURL: '/dashboard', delay: 1000 }
   *     }
   *   ]
   * })
   * 
   * // Create with minimal options
   * const simpleError = new ErrorX({ message: 'Something failed' })
   * 
   * // Create with no options (uses defaults)
   * const defaultError = new ErrorX()
   * ```
   */
  constructor(options: ErrorXOptions = {}) {
    const formattedMessage = ErrorX.formatMessage(options.message)
    super(formattedMessage, { cause: options.cause })

    this.name = options.name ?? ErrorX.getDefaultName()
    this.code = options.code != null ? String(options.code) : ErrorX.generateDefaultCode(options.name)
    this.uiMessage = options.uiMessage
    this.metadata = options.metadata
    this.actions = options.actions
    this.timestamp = new Date()

    // Handle stack trace preservation
    if (options.cause instanceof Error) {
      this.stack = ErrorX.preserveOriginalStack(options.cause, this)
    } else {
      // Node.js specific stack trace capture for clean stack
      if (typeof Error.captureStackTrace === 'function') {
        Error.captureStackTrace(this, this.constructor)
      }
      // Clean the stack to remove ErrorX constructor noise
      this.stack = ErrorX.cleanStack(this.stack)
    }
  }

  /**
   * Returns the default error name.
   * @returns Default error name 'Error'
   */
  private static getDefaultName(): string {
    return 'Error'
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
    if (!name) return 'ERROR'

    // Convert camelCase/PascalCase to UPPER_SNAKE_CASE
    return name
      .replace(/([a-z])([A-Z])/g, '$1_$2') // Add underscore between camelCase
      .replace(/\s+/g, '_') // Replace spaces with underscores
      .replace(/[^a-zA-Z0-9_]/g, '') // Remove special characters
      .toUpperCase()
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
    if (!originalError.stack) return newError.stack || ''

    // Get the new error's first line (error name + message)
    const newErrorFirstLine = `${newError.name}: ${newError.message}`

    // Get original stack lines (skip the first line which is the original error message)
    const originalStackLines = originalError.stack.split('\n')
    const originalStackTrace = originalStackLines.slice(1)

    // Combine new error message with original stack trace
    return [newErrorFirstLine, ...originalStackTrace].join('\n')
  }

  /**
   * Cleans the stack trace by removing ErrorX internal method calls.
   * This provides cleaner stack traces that focus on user code.
   * 
   * @param stack - Raw stack trace to clean
   * @returns Cleaned stack trace without ErrorX internal calls
   */
  private static cleanStack(stack?: string): string {
    if (!stack) return ''

    const stackLines = stack.split('\n')
    const cleanedLines: string[] = []

    for (const line of stackLines) {
      // Skip lines that contain ErrorX constructor or internal methods
      if (
        line.includes('new ErrorX') ||
        line.includes('ErrorX.constructor') ||
        line.includes('ErrorX.toErrorX') ||
        line.includes('error-x/dist/') ||
        line.includes('error-x/src/error.ts')
      ) {
        continue
      }
      cleanedLines.push(line)
    }

    return cleanedLines.join('\n')
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
    let stack = error.stack ?? ''
    const stackLines = stack.split('\n')

    // Find the index of the first line containing the delimiter
    const delimiterIndex = stackLines.findIndex(line => line.includes(delimiter))

    // If the delimiter is found, return all lines after it
    if (delimiterIndex !== -1) {
      stack = stackLines.slice(delimiterIndex + 1).join('\n')
    }
    return stack
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
      return 'An error occurred'
    }

    // Split by sentences and capitalize each
    let formatted = message
      .split('. ')
      .map(sentence => {
        const trimmed = sentence.trim()
        if (!trimmed) return trimmed
        return trimmed.charAt(0).toUpperCase() + trimmed.slice(1)
      })
      .join('. ')

    // Add period at the end if it doesn't have proper punctuation
    const endsWithPunctuation = /[.!?)\]]$/.test(formatted)
    if (!endsWithPunctuation) {
      formatted = `${formatted}.`
    }

    return formatted
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
  public withMetadata(additionalMetadata: ErrorMetadata): ErrorX {
    const options: ErrorXOptions = {
      message: this.message,
      name: this.name,
      code: this.code,
      uiMessage: this.uiMessage,
      cause: this.cause,
      metadata: { ...(this.metadata ?? {}), ...additionalMetadata },
    }
    if (this.actions) {
      options.actions = this.actions
    }
    const newError = new ErrorX(options)

    // Preserve the original stack trace
    if (this.stack) {
      newError.stack = this.stack
    }
    return newError
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
    return value instanceof ErrorX
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
    if (error instanceof ErrorX) return error

    let name = ''
    let message = ''
    let code = ''
    let uiMessage = ''
    let cause: unknown
    let metadata: ErrorMetadata = {}
    let actions: ErrorAction[] | undefined

    if (error) {
      if (typeof error === 'string') {
        message = error
        metadata = { originalError: error }
      } else if (error instanceof Error) {
        name = error.name
        message = error.message
        cause = error.cause
      } else if (typeof error === 'object') {
        // Extract name from various properties
        if ('name' in error && error.name) name = String(error.name)
        else if ('title' in error && error.title) name = String(error.title)

        // Extract message from various properties
        if ('message' in error && error.message) message = String(error.message)
        else if ('details' in error && error.details) message = String(error.details)
        else if ('text' in error && error.text) message = String(error.text)
        else if ('info' in error && error.info) message = String(error.info)
        else if ('statusText' in error && error.statusText) message = String(error.statusText)
        else if ('error' in error && error.error) message = String(error.error)
        else if ('errorMessage' in error && error.errorMessage) message = String(error.errorMessage)

        // Extract code
        if ('code' in error && error.code) code = String(error.code)

        // Extract UI message
        if ('uiMessage' in error && error.uiMessage) uiMessage = String(error.uiMessage)
        else if ('userMessage' in error && error.userMessage) uiMessage = String(error.userMessage)

        // Extract actions
        if ('actions' in error && Array.isArray(error.actions)) {
          actions = error.actions as ErrorAction[]
        }

        // Store original object as metadata if it has additional properties
        metadata = { originalError: error }
      }
    }

    const options: ErrorXOptions = {
      message: message || 'Unknown error occurred',
    }

    if (name) options.name = name
    if (code) options.code = code
    if (uiMessage) options.uiMessage = uiMessage
    if (cause) options.cause = cause
    if (Object.keys(metadata).length > 0) options.metadata = metadata
    if (actions && actions.length > 0) options.actions = actions

    return new ErrorX(options)
  }

  /**
   * Public wrapper for processing error stack traces with delimiter.
   * Delegates to the private processErrorStack method for implementation.
   * 
   * @param error - Error whose stack to process
   * @param delimiter - String to search for in stack lines
   * @returns Processed stack trace starting after the delimiter
   * 
   * @example
   * ```typescript
   * const error = new Error('Something failed')
   * const cleanStack = ErrorX.processStack(error, 'my-app-entry')
   * // Returns stack trace starting after the line containing 'my-app-entry'
   * ```
   */
  public static processStack(error: Error, delimiter: string): string {
    return ErrorX.processErrorStack(error, delimiter)
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
      }
      if (this.metadata !== undefined) {
        options.metadata = this.metadata
      }
      if (this.actions) {
        options.actions = this.actions
      }
      const newError = new ErrorX(options)
      newError.stack = ErrorX.processErrorStack(this, delimiter)
      return newError
    }
    return this
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
    const parts = []

    // Add name and message
    parts.push(`${this.name}: ${this.message}`)

    // Add code if different from default
    if (this.code && this.code !== 'ERROR') {
      parts.push(`[${this.code}]`)
    }

    // Add timestamp
    parts.push(`(${this.timestamp.toISOString()})`)

    // Add metadata if present
    if (this.metadata && Object.keys(this.metadata).length > 0) {
      const metadataStr = safeStringify(this.metadata)
      parts.push(`metadata: ${metadataStr}`)
    }

    let result = parts.join(' ')

    // Add stack trace if available
    if (this.stack) {
      result += `\n${this.stack}`
    }

    return result
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
  public toJSON(): SerializableError {
    // Handle metadata serialization with circular reference protection


    // Use safe stringify to parse the metadata and remove circular references
    const safeMetadata: ErrorMetadata | undefined = this.metadata ? 
      JSON.parse(safeStringify(this.metadata)) : undefined


    const serialized: SerializableError = {
      name: this.name,
      message: this.message,
      code: this.code,
      uiMessage: this.uiMessage,
      metadata: safeMetadata,
      timestamp: this.timestamp.toISOString(),
    }

    // Include actions if present
    if (this.actions && this.actions.length > 0) {

      // Use safe stringify to parse the actions and remove circular references
      const stringified = safeStringify(this.actions)
      serialized.actions = JSON.parse(stringified)

    }

    // Include stack if available
    if (this.stack) {
      serialized.stack = this.stack
    }

    // Recursively serialize cause if it's an ErrorX
    if (this.cause) {
      if (this.cause instanceof ErrorX) {
        serialized.cause = this.cause.toJSON()
      } else if (this.cause instanceof Error) {
        const causeData: SerializableError = {
          name: this.cause.name,
          message: this.cause.message,
          code: 'ERROR',
          uiMessage: undefined,
          metadata: {},
          timestamp: new Date().toISOString(),
        }
        if (this.cause.stack) {
          causeData.stack = this.cause.stack
        }
        serialized.cause = causeData
      }
    }

    return serialized
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
  public static fromJSON(serialized: SerializableError): ErrorX {
    const options: ErrorXOptions = {
      message: serialized.message,
      name: serialized.name,
      code: serialized.code,
      uiMessage: serialized.uiMessage,
    }
    if (serialized.metadata !== undefined) {
      options.metadata = serialized.metadata
    }

    if (serialized.actions && serialized.actions.length > 0) {
      options.actions = serialized.actions
    }

    const error = new ErrorX(options)

    // Restore stack and timestamp
    if (serialized.stack) {
      error.stack = serialized.stack
    }
    // Use Object.defineProperty to set readonly properties
    Object.defineProperty(error, 'timestamp', {
      value: new Date(serialized.timestamp),
      writable: false,
    })

    // Restore cause chain
    if (serialized.cause) {
      Object.defineProperty(error, 'cause', {
        value: ErrorX.fromJSON(serialized.cause),
        writable: false,
      })
    }

    return error
  }
}
