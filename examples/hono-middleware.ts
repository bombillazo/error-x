/**
 * Hono.js Error Middleware Example
 *
 * This example shows how to integrate error-x with Hono.js for
 * consistent error handling across your API.
 *
 * @example
 * ```bash
 * pnpm add hono @bombillazo/error-x
 * ```
 */

import { Hono } from 'hono'
import type { Context, ErrorHandler, MiddlewareHandler } from 'hono'
import {
  ErrorX,
  HTTPErrorX,
  ValidationErrorX,
  toLogEntry,
  type ErrorXSerialized,
} from '@bombillazo/error-x'

// ============================================================================
// Types
// ============================================================================

type ErrorResponse = {
  error: {
    code: string
    message: string
    timestamp: string
    requestId?: string
  }
  // Include full error details in development only
  details?: ErrorXSerialized
}

type ErrorMiddlewareOptions = {
  /** Include stack traces in response (default: false in prod) */
  includeDetails?: boolean
  /** Custom logger function */
  logger?: (entry: ReturnType<typeof toLogEntry>) => void
  /** Header name for request ID (default: 'x-request-id') */
  requestIdHeader?: string
}

// ============================================================================
// Error Middleware
// ============================================================================

/**
 * Creates an error handling middleware for Hono.
 * Converts all errors to ErrorX and returns consistent JSON responses.
 */
export const errorMiddleware = (options: ErrorMiddlewareOptions = {}): ErrorHandler => {
  const {
    includeDetails = process.env.NODE_ENV !== 'production',
    logger = console.error,
    requestIdHeader = 'x-request-id',
  } = options

  return (err: Error, c: Context) => {
    // Convert any error to ErrorX
    const error = ErrorX.isErrorX(err) ? err : ErrorX.from(err)

    // Get request ID if present
    const requestId = c.req.header(requestIdHeader)

    // Log the error
    const logEntry = toLogEntry(error, {
      includeStack: true,
      includeFull: true,
      context: {
        requestId,
        method: c.req.method,
        path: c.req.path,
        userAgent: c.req.header('user-agent'),
      },
    })
    logger(logEntry)

    // Determine HTTP status
    const status = error.httpStatus ?? 500

    // Build response
    const response: ErrorResponse = {
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

    return c.json(response, status as 400)
  }
}

/**
 * Request ID middleware - adds a unique ID to each request.
 */
export const requestIdMiddleware = (): MiddlewareHandler => {
  return async (c, next) => {
    const requestId = c.req.header('x-request-id') ?? crypto.randomUUID()
    c.set('requestId', requestId)
    c.header('x-request-id', requestId)
    await next()
  }
}

// ============================================================================
// Example Application
// ============================================================================

const app = new Hono()

// Add request ID tracking
app.use('*', requestIdMiddleware())

// Example routes that throw different error types
app.get('/user/:id', async (c) => {
  const id = c.req.param('id')

  // Simulate user not found
  if (id === '0') {
    throw HTTPErrorX.create(404, {
      message: 'User not found',
      metadata: { userId: id },
    })
  }

  // Simulate server error
  if (id === 'error') {
    throw new Error('Database connection lost')
  }

  return c.json({ id, name: 'John Doe' })
})

app.post('/user', async (c) => {
  const body = await c.req.json()

  // Simulate validation error
  if (!body.email) {
    throw ValidationErrorX.forField('email', 'Email is required')
  }

  return c.json({ id: '123', ...body }, 201)
})

// Global error handler - catches all errors
app.onError(errorMiddleware({
  logger: (entry) => {
    // In production, use a structured logger
    console.error(JSON.stringify(entry, null, 2))
  },
}))

// Not found handler
app.notFound((c) => {
  const error = HTTPErrorX.create(404, {
    message: `Route ${c.req.method} ${c.req.path} not found`,
  })

  return c.json({
    error: {
      code: error.code,
      message: error.message,
    },
  }, 404)
})

export default app

// ============================================================================
// Usage Notes
// ============================================================================

/**
 * ## Usage
 *
 * 1. Import the middleware:
 *    ```typescript
 *    import { errorMiddleware, requestIdMiddleware } from './hono-middleware'
 *    ```
 *
 * 2. Add to your Hono app:
 *    ```typescript
 *    app.use('*', requestIdMiddleware())
 *    app.onError(errorMiddleware())
 *    ```
 *
 * 3. Throw ErrorX errors in your handlers:
 *    ```typescript
 *    throw HTTPErrorX.create(400, { message: 'Invalid input' })
 *    throw ValidationErrorX.fromZodError(zodError)
 *    throw new ErrorX({ code: 'CUSTOM_ERROR', message: 'Something went wrong' })
 *    ```
 *
 * ## Response Format
 *
 * All errors return a consistent JSON structure:
 * ```json
 * {
 *   "error": {
 *     "code": "NOT_FOUND",
 *     "message": "User not found",
 *     "timestamp": "2024-01-01T00:00:00.000Z",
 *     "requestId": "abc-123"
 *   }
 * }
 * ```
 *
 * In development, additional details are included:
 * ```json
 * {
 *   "error": { ... },
 *   "details": {
 *     "name": "NotFoundError",
 *     "code": "NOT_FOUND",
 *     "message": "User not found",
 *     "stack": "...",
 *     "metadata": { "userId": "0" },
 *     "chain": [...]
 *   }
 * }
 * ```
 */
