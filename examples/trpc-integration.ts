/**
 * tRPC Error Integration Example
 *
 * This example shows how to integrate error-x with tRPC for
 * type-safe API error handling.
 *
 * @example
 * ```bash
 * pnpm add @trpc/server @trpc/client @bombillazo/error-x
 * ```
 */

import {
  ErrorX,
  HTTPErrorX,
  DBErrorX,
  ValidationErrorX,
  httpErrorUiMessages,
  toLogEntry,
  type ErrorXSerialized,
} from '@bombillazo/error-x'
import { TRPCError } from '@trpc/server'
import type { TRPC_ERROR_CODE_KEY } from '@trpc/server/rpc'

// ============================================================================
// Type Mappings
// ============================================================================

/**
 * Map HTTP status codes to tRPC error codes.
 */
const httpStatusToTrpcCode: Record<number, TRPC_ERROR_CODE_KEY> = {
  400: 'BAD_REQUEST',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  405: 'METHOD_NOT_SUPPORTED',
  408: 'TIMEOUT',
  409: 'CONFLICT',
  412: 'PRECONDITION_FAILED',
  413: 'PAYLOAD_TOO_LARGE',
  422: 'UNPROCESSABLE_CONTENT',
  429: 'TOO_MANY_REQUESTS',
  499: 'CLIENT_CLOSED_REQUEST',
  500: 'INTERNAL_SERVER_ERROR',
  501: 'NOT_IMPLEMENTED',
  502: 'BAD_GATEWAY',
  503: 'SERVICE_UNAVAILABLE',
  504: 'GATEWAY_TIMEOUT',
}

/**
 * Map ErrorX codes to tRPC error codes.
 */
const errorCodeToTrpcCode: Record<string, TRPC_ERROR_CODE_KEY> = {
  // Validation errors
  VALIDATION_FAILED: 'BAD_REQUEST',
  VALIDATION_INVALID: 'BAD_REQUEST',

  // Auth errors
  AUTH_FAILED: 'UNAUTHORIZED',
  AUTH_EXPIRED: 'UNAUTHORIZED',
  AUTH_INVALID: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',

  // Not found
  NOT_FOUND: 'NOT_FOUND',
  USER_NOT_FOUND: 'NOT_FOUND',

  // Database errors
  DB_CONNECTION_FAILED: 'INTERNAL_SERVER_ERROR',
  DB_QUERY_FAILED: 'INTERNAL_SERVER_ERROR',
  DB_UNIQUE_VIOLATION: 'CONFLICT',
  DB_NOT_FOUND: 'NOT_FOUND',
}

// ============================================================================
// Conversion Utilities
// ============================================================================

/**
 * Convert an ErrorX to a TRPCError.
 *
 * @example
 * ```typescript
 * throw toTRPCError(HTTPErrorX.create(404, { message: 'User not found' }))
 * ```
 */
export const toTRPCError = (error: ErrorX): TRPCError => {
  // Determine tRPC code from HTTP status or error code
  let code: TRPC_ERROR_CODE_KEY = 'INTERNAL_SERVER_ERROR'

  if (error.httpStatus && httpStatusToTrpcCode[error.httpStatus]) {
    code = httpStatusToTrpcCode[error.httpStatus]
  } else if (errorCodeToTrpcCode[error.code]) {
    code = errorCodeToTrpcCode[error.code]
  }

  return new TRPCError({
    code,
    message: error.message,
    cause: error,
  })
}

/**
 * Convert a TRPCError back to an ErrorX.
 *
 * @example
 * ```typescript
 * // In error formatter
 * const errorX = fromTRPCError(error)
 * console.log(errorX.code, errorX.metadata)
 * ```
 */
export const fromTRPCError = (trpcError: TRPCError): ErrorX => {
  // Check if cause is already an ErrorX
  if (ErrorX.isErrorX(trpcError.cause)) {
    return trpcError.cause
  }

  // Map tRPC code to HTTP status
  const httpStatusMap: Record<TRPC_ERROR_CODE_KEY, number> = {
    PARSE_ERROR: 400,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    METHOD_NOT_SUPPORTED: 405,
    TIMEOUT: 408,
    CONFLICT: 409,
    PRECONDITION_FAILED: 412,
    PAYLOAD_TOO_LARGE: 413,
    UNPROCESSABLE_CONTENT: 422,
    TOO_MANY_REQUESTS: 429,
    CLIENT_CLOSED_REQUEST: 499,
    INTERNAL_SERVER_ERROR: 500,
    NOT_IMPLEMENTED: 501,
    BAD_GATEWAY: 502,
    SERVICE_UNAVAILABLE: 503,
    GATEWAY_TIMEOUT: 504,
  }

  return ErrorX.from(trpcError, {
    code: trpcError.code,
    httpStatus: httpStatusMap[trpcError.code] ?? 500,
    name: 'TRPCError',
  })
}

// ============================================================================
// tRPC Error Formatter
// ============================================================================

/**
 * Custom error shape for tRPC responses.
 */
type ErrorXTRPCShape = {
  code: string
  message: string
  httpStatus?: number
  timestamp: number
  metadata?: Record<string, unknown>
  // Only included in development
  stack?: string
  chain?: Array<{ code: string; message: string }>
}

/**
 * Create an error formatter for tRPC that uses error-x.
 *
 * @example
 * ```typescript
 * import { initTRPC } from '@trpc/server'
 * import { createErrorFormatter } from './trpc-integration'
 *
 * const t = initTRPC.create({
 *   errorFormatter: createErrorFormatter({ includeStack: false })
 * })
 * ```
 */
export const createErrorFormatter = (options?: {
  /** Include stack trace in response (default: false in production) */
  includeStack?: boolean
  /** Include error chain in response (default: false) */
  includeChain?: boolean
  /** Logger for error tracking */
  logger?: (entry: ReturnType<typeof toLogEntry>) => void
}) => {
  const {
    includeStack = process.env.NODE_ENV !== 'production',
    includeChain = false,
    logger,
  } = options ?? {}

  return ({ shape, error }: { shape: { message: string; code: string }; error: TRPCError }) => {
    const errorX = fromTRPCError(error)

    // Log the error
    if (logger) {
      logger(toLogEntry(errorX, { includeStack: true, includeFull: true }))
    }

    const customShape: ErrorXTRPCShape = {
      code: errorX.code,
      message: errorX.message,
      httpStatus: errorX.httpStatus,
      timestamp: errorX.timestamp,
    }

    if (errorX.metadata && Object.keys(errorX.metadata).length > 0) {
      customShape.metadata = errorX.metadata
    }

    if (includeStack && errorX.stack) {
      customShape.stack = errorX.stack
    }

    if (includeChain && errorX.chain.length > 1) {
      customShape.chain = errorX.chain.map((e) => ({
        code: e.code,
        message: e.message,
      }))
    }

    return {
      ...shape,
      data: customShape,
    }
  }
}

// ============================================================================
// tRPC Middleware
// ============================================================================

/**
 * Create error handling middleware for tRPC.
 * Converts all errors to ErrorX before throwing as TRPCError.
 *
 * @example
 * ```typescript
 * const t = initTRPC.create()
 *
 * const errorMiddleware = t.middleware(createErrorMiddleware())
 *
 * export const publicProcedure = t.procedure.use(errorMiddleware)
 * ```
 */
export const createErrorMiddleware = (options?: {
  /** Logger for error tracking */
  logger?: (error: ErrorX, path: string) => void
}) => {
  const { logger } = options ?? {}

  return async <TContext, TInput>({
    next,
    path,
  }: {
    next: () => Promise<{ ok: true; data: unknown } | { ok: false; error: TRPCError }>
    path: string
    ctx: TContext
    input: TInput
  }) => {
    try {
      return await next()
    } catch (err) {
      // Convert to ErrorX
      const errorX = ErrorX.isErrorX(err) ? err : ErrorX.from(err)

      // Add path context
      const enrichedError = errorX.withMetadata({ trpcPath: path })

      // Log
      if (logger) {
        logger(enrichedError, path)
      }

      // Throw as TRPCError
      throw toTRPCError(enrichedError)
    }
  }
}

// ============================================================================
// Client-Side Error Handling
// ============================================================================

/**
 * Parse tRPC error response on client to get ErrorX-like shape.
 *
 * @example
 * ```typescript
 * const trpc = createTRPCProxyClient<AppRouter>({
 *   links: [httpBatchLink({ url: '/trpc' })]
 * })
 *
 * try {
 *   await trpc.user.get.query({ id: '123' })
 * } catch (err) {
 *   const errorInfo = parseClientError(err)
 *   console.log(errorInfo.code, errorInfo.message)
 *   showToast(errorInfo.userMessage)
 * }
 * ```
 */
export const parseClientError = (err: unknown): {
  code: string
  message: string
  userMessage: string
  httpStatus?: number
  metadata?: Record<string, unknown>
} => {
  // Check if it's a tRPC error with our custom shape
  if (
    err &&
    typeof err === 'object' &&
    'data' in err &&
    err.data &&
    typeof err.data === 'object' &&
    'code' in err.data
  ) {
    const data = err.data as ErrorXTRPCShape
    return {
      code: data.code,
      message: data.message,
      userMessage: data.httpStatus
        ? httpErrorUiMessages[data.httpStatus as keyof typeof httpErrorUiMessages] ?? data.message
        : data.message,
      httpStatus: data.httpStatus,
      metadata: data.metadata,
    }
  }

  // Fallback for standard tRPC errors
  if (err instanceof Error) {
    return {
      code: 'UNKNOWN_ERROR',
      message: err.message,
      userMessage: 'An unexpected error occurred. Please try again.',
    }
  }

  return {
    code: 'UNKNOWN_ERROR',
    message: 'An unknown error occurred',
    userMessage: 'An unexpected error occurred. Please try again.',
  }
}

// ============================================================================
// React Query Integration
// ============================================================================

/**
 * Error handler for @tanstack/react-query with tRPC.
 *
 * @example
 * ```typescript
 * import { QueryClient } from '@tanstack/react-query'
 * import { createQueryErrorHandler } from './trpc-integration'
 *
 * const queryClient = new QueryClient({
 *   defaultOptions: {
 *     queries: {
 *       retry: (failureCount, error) => {
 *         const { shouldRetry } = createQueryErrorHandler()(error)
 *         return shouldRetry && failureCount < 3
 *       }
 *     },
 *     mutations: {
 *       onError: createQueryErrorHandler()
 *     }
 *   }
 * })
 * ```
 */
export const createQueryErrorHandler = (options?: {
  /** Callback when error occurs */
  onError?: (errorInfo: ReturnType<typeof parseClientError>) => void
  /** Toast/notification function */
  showNotification?: (message: string, type: 'error' | 'warning') => void
}) => {
  const { onError, showNotification } = options ?? {}

  return (err: unknown) => {
    const errorInfo = parseClientError(err)

    // Determine if error is retryable
    const nonRetryableCodes = [
      'UNAUTHORIZED',
      'FORBIDDEN',
      'NOT_FOUND',
      'BAD_REQUEST',
      'UNPROCESSABLE_CONTENT',
    ]
    const shouldRetry = !nonRetryableCodes.includes(errorInfo.code)

    // Call custom handler
    if (onError) {
      onError(errorInfo)
    }

    // Show notification
    if (showNotification) {
      const type = errorInfo.httpStatus && errorInfo.httpStatus < 500 ? 'warning' : 'error'
      showNotification(errorInfo.userMessage, type)
    }

    return { errorInfo, shouldRetry }
  }
}

// ============================================================================
// Complete Usage Example
// ============================================================================

/**
 * ## Complete Server Setup
 *
 * ```typescript
 * // server/trpc.ts
 * import { initTRPC } from '@trpc/server'
 * import { createErrorFormatter, createErrorMiddleware, toTRPCError } from './trpc-integration'
 * import { ErrorX, HTTPErrorX, ValidationErrorX } from '@bombillazo/error-x'
 * import { z } from 'zod'
 *
 * const t = initTRPC.create({
 *   errorFormatter: createErrorFormatter({
 *     logger: (entry) => console.error('[tRPC Error]', entry)
 *   })
 * })
 *
 * const errorHandling = t.middleware(createErrorMiddleware())
 *
 * const publicProcedure = t.procedure.use(errorHandling)
 *
 * export const appRouter = t.router({
 *   user: t.router({
 *     get: publicProcedure
 *       .input(z.object({ id: z.string() }))
 *       .query(async ({ input }) => {
 *         const user = await db.user.findUnique({ where: { id: input.id } })
 *
 *         if (!user) {
 *           throw HTTPErrorX.create(404, {
 *             message: 'User not found',
 *             metadata: { userId: input.id }
 *           })
 *         }
 *
 *         return user
 *       }),
 *
 *     create: publicProcedure
 *       .input(z.object({
 *         email: z.string().email(),
 *         name: z.string().min(2)
 *       }))
 *       .mutation(async ({ input }) => {
 *         try {
 *           return await db.user.create({ data: input })
 *         } catch (err) {
 *           // Handle unique constraint violation
 *           if (isUniqueViolation(err)) {
 *             throw HTTPErrorX.create(409, {
 *               message: 'Email already exists',
 *               cause: err,
 *               metadata: { email: input.email }
 *             })
 *           }
 *           throw err
 *         }
 *       })
 *   })
 * })
 *
 * export type AppRouter = typeof appRouter
 * ```
 *
 * ## Complete Client Setup
 *
 * ```typescript
 * // client/trpc.ts
 * import { createTRPCReact } from '@trpc/react-query'
 * import { QueryClient } from '@tanstack/react-query'
 * import { httpBatchLink } from '@trpc/client'
 * import { createQueryErrorHandler, parseClientError } from './trpc-integration'
 * import type { AppRouter } from '../server/trpc'
 *
 * export const trpc = createTRPCReact<AppRouter>()
 *
 * const errorHandler = createQueryErrorHandler({
 *   showNotification: (message, type) => toast[type](message)
 * })
 *
 * export const queryClient = new QueryClient({
 *   defaultOptions: {
 *     queries: {
 *       retry: (failureCount, error) => {
 *         const { shouldRetry } = errorHandler(error)
 *         return shouldRetry && failureCount < 3
 *       }
 *     },
 *     mutations: {
 *       onError: (error) => errorHandler(error)
 *     }
 *   }
 * })
 *
 * export const trpcClient = trpc.createClient({
 *   links: [httpBatchLink({ url: '/api/trpc' })]
 * })
 * ```
 *
 * ## Client Component Usage
 *
 * ```tsx
 * const UserProfile = ({ userId }) => {
 *   const { data, error, isLoading } = trpc.user.get.useQuery({ id: userId })
 *
 *   if (isLoading) return <Spinner />
 *
 *   if (error) {
 *     const errorInfo = parseClientError(error)
 *     return (
 *       <ErrorCard
 *         message={errorInfo.userMessage}
 *         code={errorInfo.code}
 *       />
 *     )
 *   }
 *
 *   return <UserCard user={data} />
 * }
 * ```
 */

export {
  ErrorX,
  HTTPErrorX,
  DBErrorX,
  ValidationErrorX,
  toLogEntry,
}
