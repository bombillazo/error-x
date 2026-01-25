/**
 * Express.js Error Middleware Example
 *
 * This example shows how to integrate error-x with Express.js for
 * consistent error handling across your API.
 *
 * @example
 * ```bash
 * pnpm add express @bombillazo/error-x
 * pnpm add -D @types/express
 * ```
 */

import type { Request, Response, NextFunction, ErrorRequestHandler } from 'express'
import {
  ErrorX,
  HTTPErrorX,
  DBErrorX,
  ValidationErrorX,
  toLogEntry,
  type ErrorXSerialized,
} from '@bombillazo/error-x'

// ============================================================================
// Types
// ============================================================================

type ErrorResponse = {
  success: false
  error: {
    code: string
    message: string
    timestamp: string
    requestId?: string
  }
  details?: ErrorXSerialized
}

type ExpressErrorMiddlewareOptions = {
  /** Include stack traces and full error in response (default: false in prod) */
  includeDetails?: boolean
  /** Custom logger function */
  logger?: (entry: ReturnType<typeof toLogEntry>) => void
  /** Header name for request ID (default: 'x-request-id') */
  requestIdHeader?: string
  /** Custom error transformer before response */
  transformError?: (error: ErrorX, req: Request) => ErrorX
}

// ============================================================================
// Error Middleware
// ============================================================================

/**
 * Creates an Express error handling middleware.
 * Must be registered LAST after all routes.
 *
 * @example
 * ```typescript
 * app.use('/api', apiRouter)
 * app.use(errorHandler())  // Must be last
 * ```
 */
export const errorHandler = (options: ExpressErrorMiddlewareOptions = {}): ErrorRequestHandler => {
  const {
    includeDetails = process.env.NODE_ENV !== 'production',
    logger = (entry) => console.error(JSON.stringify(entry)),
    requestIdHeader = 'x-request-id',
    transformError,
  } = options

  return (err: unknown, req: Request, res: Response, _next: NextFunction) => {
    // Convert any error to ErrorX
    let error = ErrorX.isErrorX(err) ? err : ErrorX.from(err)

    // Apply custom transformation if provided
    if (transformError) {
      error = transformError(error, req)
    }

    // Get request ID
    const requestId = req.headers[requestIdHeader] as string | undefined

    // Log the error with request context
    const logEntry = toLogEntry(error, {
      includeStack: true,
      includeFull: true,
      context: {
        requestId,
        method: req.method,
        path: req.path,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
      },
    })
    logger(logEntry)

    // Determine HTTP status
    const status = error.httpStatus ?? 500

    // Build response
    const response: ErrorResponse = {
      success: false,
      error: {
        code: error.code,
        message: error.message,
        timestamp: new Date(error.timestamp).toISOString(),
        ...(requestId && { requestId }),
      },
    }

    // Include full error details in development
    if (includeDetails) {
      response.details = error.toJSON()
    }

    res.status(status).json(response)
  }
}

/**
 * Async handler wrapper - catches async errors and forwards to error middleware.
 *
 * @example
 * ```typescript
 * app.get('/user/:id', asyncHandler(async (req, res) => {
 *   const user = await getUser(req.params.id)
 *   res.json(user)
 * }))
 * ```
 */
export const asyncHandler = <T>(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<T>
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}

/**
 * Request ID middleware - adds a unique ID to each request.
 */
export const requestIdMiddleware = (headerName = 'x-request-id') => {
  return (req: Request, res: Response, next: NextFunction) => {
    const requestId = (req.headers[headerName] as string) ?? crypto.randomUUID()
    req.headers[headerName] = requestId
    res.setHeader(headerName, requestId)
    next()
  }
}

/**
 * Not found handler - creates 404 errors for unmatched routes.
 * Should be registered after all routes but before error handler.
 */
export const notFoundHandler = () => {
  return (req: Request, _res: Response, next: NextFunction) => {
    const error = HTTPErrorX.create(404, {
      message: `Route ${req.method} ${req.path} not found`,
      metadata: {
        method: req.method,
        path: req.path,
      },
    })
    next(error)
  }
}

// ============================================================================
// Example Application Setup
// ============================================================================

/**
 * Example setup showing complete Express integration:
 *
 * ```typescript
 * import express from 'express'
 * import {
 *   errorHandler,
 *   asyncHandler,
 *   requestIdMiddleware,
 *   notFoundHandler
 * } from './express-middleware'
 * import { HTTPErrorX, DBErrorX, ValidationErrorX, ErrorX } from '@bombillazo/error-x'
 *
 * const app = express()
 *
 * // Early middleware
 * app.use(express.json())
 * app.use(requestIdMiddleware())
 *
 * // Routes
 * app.get('/user/:id', asyncHandler(async (req, res) => {
 *   const { id } = req.params
 *
 *   if (id === '0') {
 *     throw HTTPErrorX.create(404, {
 *       message: 'User not found',
 *       metadata: { userId: id }
 *     })
 *   }
 *
 *   // Simulate DB error
 *   if (id === 'db-error') {
 *     throw DBErrorX.create('CONNECTION_TIMEOUT', {
 *       cause: new Error('ETIMEDOUT'),
 *       metadata: { host: 'db.example.com', timeout: 5000 }
 *     })
 *   }
 *
 *   res.json({ id, name: 'John Doe' })
 * }))
 *
 * app.post('/user', asyncHandler(async (req, res) => {
 *   const { email, password } = req.body
 *
 *   if (!email) {
 *     throw ValidationErrorX.forField('email', 'Email is required')
 *   }
 *
 *   if (!password || password.length < 8) {
 *     throw ValidationErrorX.forField('password', 'Password must be at least 8 characters')
 *   }
 *
 *   res.status(201).json({ id: '123', email })
 * }))
 *
 * // Error handling - MUST be last
 * app.use(notFoundHandler())
 * app.use(errorHandler({
 *   logger: (entry) => {
 *     // Send to your logging service
 *     console.error(JSON.stringify(entry))
 *   },
 *   transformError: (error, req) => {
 *     // Add request context to metadata
 *     return error.withMetadata({
 *       requestPath: req.path,
 *       requestMethod: req.method
 *     })
 *   }
 * }))
 *
 * app.listen(3000, () => console.log('Server running on port 3000'))
 * ```
 */

// ============================================================================
// Response Format Examples
// ============================================================================

/**
 * ## Response Format
 *
 * All errors return a consistent JSON structure:
 *
 * ### Production Response (status: 404)
 * ```json
 * {
 *   "success": false,
 *   "error": {
 *     "code": "NOT_FOUND",
 *     "message": "User not found",
 *     "timestamp": "2024-01-01T00:00:00.000Z",
 *     "requestId": "abc-123"
 *   }
 * }
 * ```
 *
 * ### Development Response (includes full details)
 * ```json
 * {
 *   "success": false,
 *   "error": {
 *     "code": "NOT_FOUND",
 *     "message": "User not found",
 *     "timestamp": "2024-01-01T00:00:00.000Z",
 *     "requestId": "abc-123"
 *   },
 *   "details": {
 *     "name": "NotFoundError",
 *     "code": "NOT_FOUND",
 *     "message": "User not found",
 *     "httpStatus": 404,
 *     "timestamp": 1704067200000,
 *     "stack": "NotFoundError: User not found\n    at ...",
 *     "metadata": { "userId": "0" },
 *     "chain": []
 *   }
 * }
 * ```
 *
 * ### DB Error Response (status: 500)
 * ```json
 * {
 *   "success": false,
 *   "error": {
 *     "code": "DB_CONNECTION_TIMEOUT",
 *     "message": "Database connection timed out.",
 *     "timestamp": "2024-01-01T00:00:00.000Z"
 *   },
 *   "details": {
 *     "name": "DatabaseError",
 *     "code": "DB_CONNECTION_TIMEOUT",
 *     "httpStatus": 500,
 *     "metadata": { "host": "db.example.com", "timeout": 5000 },
 *     "chain": [
 *       { "name": "DatabaseError", "code": "DB_CONNECTION_TIMEOUT", ... },
 *       { "name": "Error", "message": "ETIMEDOUT", ... }
 *     ],
 *     "original": { "name": "Error", "message": "ETIMEDOUT", ... }
 *   }
 * }
 * ```
 */

export { ErrorX, HTTPErrorX, DBErrorX, ValidationErrorX }
