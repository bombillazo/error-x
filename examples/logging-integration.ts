/**
 * Logging Library Integration Example
 *
 * This example shows how to integrate error-x with popular logging libraries
 * like pino, winston, and bunyan for structured error logging.
 *
 * @example
 * ```bash
 * pnpm add pino @bombillazo/error-x
 * # or
 * pnpm add winston @bombillazo/error-x
 * ```
 */

import {
  ErrorX,
  HTTPErrorX,
  DBErrorX,
  toLogEntry,
  generateFingerprint,
  type ErrorLogEntry,
} from '@bombillazo/error-x'

// ============================================================================
// Pino Integration
// ============================================================================

/**
 * Creates a pino logger configuration with error-x serializers.
 *
 * @example
 * ```typescript
 * import pino from 'pino'
 * import { createPinoConfig } from './logging-integration'
 *
 * const logger = pino(createPinoConfig())
 *
 * // Log an error
 * const error = HTTPErrorX.create(404)
 * logger.error({ err: error }, 'Request failed')
 * // Output: {"level":30,"err":{"code":"NOT_FOUND","fingerprint":"abc123",...},...}
 * ```
 */
export const createPinoConfig = (options?: {
  includeStack?: boolean
  includeFull?: boolean
}) => {
  const { includeStack = true, includeFull = false } = options ?? {}

  return {
    serializers: {
      // Custom error serializer for ErrorX
      err: (err: unknown) => {
        if (ErrorX.isErrorX(err)) {
          return toLogEntry(err, { includeStack, includeFull })
        }
        // Fall back to standard error serialization
        if (err instanceof Error) {
          return {
            type: err.name,
            message: err.message,
            stack: includeStack ? err.stack : undefined,
          }
        }
        return err
      },
    },
    // Recommended pino settings for production
    level: process.env.LOG_LEVEL ?? 'info',
    formatters: {
      level: (label: string) => ({ level: label }),
    },
  }
}

/**
 * Pino child logger factory with request context.
 *
 * @example
 * ```typescript
 * import pino from 'pino'
 * import { createRequestLogger } from './logging-integration'
 *
 * const baseLogger = pino(createPinoConfig())
 *
 * app.use((req, res, next) => {
 *   req.log = createRequestLogger(baseLogger, {
 *     requestId: req.headers['x-request-id'],
 *     method: req.method,
 *     path: req.path
 *   })
 *   next()
 * })
 *
 * // Later in handlers:
 * req.log.error({ err: error }, 'Database query failed')
 * ```
 */
export const createRequestLogger = <TLogger extends { child: (bindings: object) => TLogger }>(
  logger: TLogger,
  context: {
    requestId?: string
    method?: string
    path?: string
    userId?: string
    [key: string]: unknown
  }
): TLogger => {
  return logger.child({
    req: context,
  })
}

// ============================================================================
// Winston Integration
// ============================================================================

/**
 * Winston format for ErrorX errors.
 *
 * @example
 * ```typescript
 * import winston from 'winston'
 * import { errorXFormat, createWinstonLogger } from './logging-integration'
 *
 * const logger = createWinstonLogger()
 *
 * // Log errors
 * logger.error('Request failed', { error: HTTPErrorX.create(500) })
 * ```
 */
export const errorXFormat = () => {
  return {
    transform: (info: { error?: unknown; [key: string]: unknown }) => {
      if (info.error && ErrorX.isErrorX(info.error)) {
        const entry = toLogEntry(info.error, { includeStack: true })
        return {
          ...info,
          errorCode: entry.errorCode,
          errorName: entry.errorName,
          fingerprint: entry.fingerprint,
          httpStatus: entry.httpStatus,
          metadata: entry.metadata,
          chainDepth: entry.chainDepth,
          rootCause: entry.rootCause,
        }
      }
      return info
    },
  }
}

/**
 * Create a Winston logger with ErrorX support.
 *
 * @example
 * ```typescript
 * const logger = createWinstonLogger({
 *   level: 'debug',
 *   serviceName: 'api-server'
 * })
 *
 * try {
 *   await operation()
 * } catch (err) {
 *   logger.error('Operation failed', {
 *     error: ErrorX.from(err),
 *     context: { userId: '123' }
 *   })
 * }
 * ```
 */
export const createWinstonLogger = (options?: {
  level?: string
  serviceName?: string
  prettyPrint?: boolean
}) => {
  // Winston would be imported here, but we show the configuration pattern
  const config = {
    level: options?.level ?? 'info',
    defaultMeta: {
      service: options?.serviceName ?? 'app',
    },
    format: {
      combine: [
        { timestamp: true },
        errorXFormat(),
        options?.prettyPrint
          ? { prettyPrint: { colorize: true } }
          : { json: true },
      ],
    },
    transports: [
      { type: 'Console' },
      // Add file transport for production:
      // { type: 'File', filename: 'logs/error.log', level: 'error' },
      // { type: 'File', filename: 'logs/combined.log' },
    ],
  }

  return config
}

// ============================================================================
// Generic Logging Utilities
// ============================================================================

/**
 * Logger interface that works with any logging library.
 */
export type LoggerInterface = {
  error: (message: string, context?: object) => void
  warn: (message: string, context?: object) => void
  info: (message: string, context?: object) => void
  debug: (message: string, context?: object) => void
}

/**
 * Create an error logging helper that wraps any logger.
 *
 * @example
 * ```typescript
 * import pino from 'pino'
 * const pinoLogger = pino()
 *
 * const errorLogger = createErrorLogger({
 *   error: (msg, ctx) => pinoLogger.error(ctx, msg),
 *   warn: (msg, ctx) => pinoLogger.warn(ctx, msg),
 *   info: (msg, ctx) => pinoLogger.info(ctx, msg),
 *   debug: (msg, ctx) => pinoLogger.debug(ctx, msg),
 * })
 *
 * // Now use consistent error logging
 * errorLogger.logError(error, { requestId: '123' })
 * errorLogger.logError(error, { requestId: '123' }, 'warn')
 * ```
 */
export const createErrorLogger = (logger: LoggerInterface) => {
  return {
    /**
     * Log an ErrorX with full context.
     */
    logError: (
      error: ErrorX,
      additionalContext?: Record<string, unknown>,
      level: 'error' | 'warn' | 'info' = 'error'
    ) => {
      const entry = toLogEntry(error, {
        level,
        includeStack: true,
        context: additionalContext,
      })

      logger[level](entry.message, entry)
    },

    /**
     * Log any error, converting to ErrorX first.
     */
    logAnyError: (
      err: unknown,
      additionalContext?: Record<string, unknown>,
      level: 'error' | 'warn' | 'info' = 'error'
    ) => {
      const error = ErrorX.isErrorX(err) ? err : ErrorX.from(err)
      const entry = toLogEntry(error, {
        level,
        includeStack: true,
        context: additionalContext,
      })

      logger[level](entry.message, entry)
    },

    /**
     * Create a child logger with additional context.
     */
    withContext: (context: Record<string, unknown>) => {
      const wrappedLogger: LoggerInterface = {
        error: (msg, ctx) => logger.error(msg, { ...context, ...ctx }),
        warn: (msg, ctx) => logger.warn(msg, { ...context, ...ctx }),
        info: (msg, ctx) => logger.info(msg, { ...context, ...ctx }),
        debug: (msg, ctx) => logger.debug(msg, { ...context, ...ctx }),
      }
      return createErrorLogger(wrappedLogger)
    },
  }
}

// ============================================================================
// Error Deduplication
// ============================================================================

/**
 * Simple in-memory error deduplication tracker.
 * Useful for preventing log spam from repeated errors.
 *
 * @example
 * ```typescript
 * const dedup = createErrorDeduplicator({ windowMs: 60000, maxPerWindow: 5 })
 *
 * // In error handler:
 * if (dedup.shouldLog(error)) {
 *   logger.error('Error occurred', toLogEntry(error))
 * }
 * ```
 */
export const createErrorDeduplicator = (options?: {
  /** Time window in milliseconds (default: 60000 = 1 minute) */
  windowMs?: number
  /** Max occurrences per fingerprint before suppressing (default: 10) */
  maxPerWindow?: number
}) => {
  const { windowMs = 60000, maxPerWindow = 10 } = options ?? {}

  const errorCounts = new Map<string, { count: number; firstSeen: number }>()

  const cleanup = () => {
    const now = Date.now()
    for (const [fingerprint, data] of errorCounts) {
      if (now - data.firstSeen > windowMs) {
        errorCounts.delete(fingerprint)
      }
    }
  }

  return {
    /**
     * Check if this error should be logged (not deduplicated).
     */
    shouldLog: (error: ErrorX): boolean => {
      cleanup()

      const fingerprint = generateFingerprint(error)
      const now = Date.now()
      const existing = errorCounts.get(fingerprint)

      if (!existing) {
        errorCounts.set(fingerprint, { count: 1, firstSeen: now })
        return true
      }

      if (now - existing.firstSeen > windowMs) {
        // Reset window
        errorCounts.set(fingerprint, { count: 1, firstSeen: now })
        return true
      }

      existing.count++

      if (existing.count <= maxPerWindow) {
        return true
      }

      // Log every nth occurrence after threshold
      if (existing.count % maxPerWindow === 0) {
        return true
      }

      return false
    },

    /**
     * Get current stats for monitoring.
     */
    getStats: () => {
      cleanup()
      return {
        uniqueErrors: errorCounts.size,
        entries: Array.from(errorCounts.entries()).map(([fp, data]) => ({
          fingerprint: fp,
          count: data.count,
          ageMs: Date.now() - data.firstSeen,
        })),
      }
    },

    /**
     * Reset all tracking.
     */
    reset: () => {
      errorCounts.clear()
    },
  }
}

// ============================================================================
// Complete Usage Example
// ============================================================================

/**
 * ## Complete Pino Example
 *
 * ```typescript
 * import pino from 'pino'
 * import { ErrorX, HTTPErrorX, DBErrorX, toLogEntry } from '@bombillazo/error-x'
 * import { createPinoConfig, createErrorDeduplicator } from './logging-integration'
 *
 * // Create logger
 * const logger = pino(createPinoConfig({ includeStack: true }))
 * const dedup = createErrorDeduplicator({ windowMs: 60000 })
 *
 * // Express error handler
 * app.use((err, req, res, next) => {
 *   const error = ErrorX.from(err)
 *
 *   // Skip duplicate errors
 *   if (dedup.shouldLog(error)) {
 *     const entry = toLogEntry(error, {
 *       includeStack: true,
 *       context: {
 *         requestId: req.headers['x-request-id'],
 *         method: req.method,
 *         path: req.path,
 *         userId: req.user?.id
 *       }
 *     })
 *
 *     logger.error(entry, 'Request error')
 *   }
 *
 *   res.status(error.httpStatus ?? 500).json({ error: error.code })
 * })
 * ```
 *
 * ## Complete Winston Example
 *
 * ```typescript
 * import winston from 'winston'
 * import { ErrorX, toLogEntry } from '@bombillazo/error-x'
 * import { errorXFormat } from './logging-integration'
 *
 * const logger = winston.createLogger({
 *   level: 'info',
 *   format: winston.format.combine(
 *     winston.format.timestamp(),
 *     winston.format.errors({ stack: true }),
 *     winston.format(errorXFormat().transform)(),
 *     winston.format.json()
 *   ),
 *   transports: [
 *     new winston.transports.Console(),
 *     new winston.transports.File({ filename: 'error.log', level: 'error' })
 *   ]
 * })
 *
 * // Usage
 * try {
 *   await databaseOperation()
 * } catch (err) {
 *   const error = DBErrorX.create('QUERY_FAILED', {
 *     cause: err,
 *     metadata: { query: 'SELECT * FROM users' }
 *   })
 *
 *   logger.error('Database query failed', { error })
 *   // Output includes: errorCode, fingerprint, chainDepth, rootCause, etc.
 * }
 * ```
 *
 * ## Log Output Example
 *
 * ```json
 * {
 *   "level": "error",
 *   "timestamp": "2024-01-01T12:00:00.000Z",
 *   "message": "Database connection timed out.",
 *   "fingerprint": "a1b2c3d4",
 *   "errorName": "DatabaseError",
 *   "errorCode": "DB_CONNECTION_TIMEOUT",
 *   "httpStatus": 500,
 *   "chainDepth": 2,
 *   "rootCause": {
 *     "name": "Error",
 *     "message": "ETIMEDOUT",
 *     "code": "ERROR"
 *   },
 *   "metadata": {
 *     "host": "db.example.com",
 *     "port": 5432,
 *     "timeout": 5000
 *   },
 *   "req": {
 *     "requestId": "abc-123",
 *     "method": "GET",
 *     "path": "/api/users"
 *   }
 * }
 * ```
 */

export { ErrorX, HTTPErrorX, DBErrorX, toLogEntry, generateFingerprint }
