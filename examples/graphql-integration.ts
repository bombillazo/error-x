/**
 * GraphQL Error Formatting Integration Example
 *
 * This example shows how to integrate error-x with GraphQL servers
 * (Apollo Server, graphql-yoga, etc.) for consistent error handling.
 *
 * @example
 * ```bash
 * pnpm add @apollo/server graphql @bombillazo/error-x
 * # or
 * pnpm add graphql-yoga graphql @bombillazo/error-x
 * ```
 */

import {
  ErrorX,
  HTTPErrorX,
  DBErrorX,
  ValidationErrorX,
  toLogEntry,
  generateFingerprint,
  type ErrorXSerialized,
} from '@bombillazo/error-x'
import { GraphQLError } from 'graphql'

// ============================================================================
// Types
// ============================================================================

/**
 * GraphQL error extensions following best practices.
 */
type GraphQLErrorExtensions = {
  code: string
  httpStatus?: number
  timestamp: string
  fingerprint: string
  metadata?: Record<string, unknown>
  // Development only
  stack?: string
  chain?: Array<{ code: string; message: string; name: string }>
}

/**
 * Options for error formatting.
 */
type ErrorFormatterOptions = {
  /** Include stack trace (default: false in production) */
  includeStack?: boolean
  /** Include error chain (default: false) */
  includeChain?: boolean
  /** Mask internal errors with generic message */
  maskInternalErrors?: boolean
  /** Logger function */
  logger?: (entry: ReturnType<typeof toLogEntry>) => void
}

// ============================================================================
// Error Formatting
// ============================================================================

/**
 * Convert ErrorX to GraphQL error extensions.
 *
 * @example
 * ```typescript
 * const error = HTTPErrorX.create(404)
 * const extensions = toGraphQLExtensions(error)
 * ```
 */
export const toGraphQLExtensions = (
  error: ErrorX,
  options?: ErrorFormatterOptions
): GraphQLErrorExtensions => {
  const { includeStack = false, includeChain = false } = options ?? {}

  const extensions: GraphQLErrorExtensions = {
    code: error.code,
    httpStatus: error.httpStatus,
    timestamp: new Date(error.timestamp).toISOString(),
    fingerprint: generateFingerprint(error),
  }

  if (error.metadata && Object.keys(error.metadata).length > 0) {
    extensions.metadata = error.metadata
  }

  if (includeStack && error.stack) {
    extensions.stack = error.stack
  }

  if (includeChain && error.chain.length > 1) {
    extensions.chain = error.chain.map((e) => ({
      code: e.code,
      message: e.message,
      name: e.name,
    }))
  }

  return extensions
}

/**
 * Convert ErrorX to GraphQLError.
 *
 * @example
 * ```typescript
 * throw toGraphQLError(HTTPErrorX.create(404, { message: 'User not found' }))
 * ```
 */
export const toGraphQLError = (error: ErrorX, options?: ErrorFormatterOptions): GraphQLError => {
  const { maskInternalErrors = true } = options ?? {}

  // Mask internal server errors in production
  const isInternalError = error.httpStatus === 500 || !error.httpStatus
  const shouldMask = maskInternalErrors && isInternalError && process.env.NODE_ENV === 'production'

  return new GraphQLError(
    shouldMask ? 'Internal server error' : error.message,
    {
      extensions: toGraphQLExtensions(error, options),
    }
  )
}

/**
 * Convert any error to GraphQLError through ErrorX.
 *
 * @example
 * ```typescript
 * try {
 *   await operation()
 * } catch (err) {
 *   throw toGraphQLErrorFromAny(err)
 * }
 * ```
 */
export const toGraphQLErrorFromAny = (err: unknown, options?: ErrorFormatterOptions): GraphQLError => {
  const errorX = ErrorX.isErrorX(err) ? err : ErrorX.from(err)
  return toGraphQLError(errorX, options)
}

// ============================================================================
// Apollo Server Integration
// ============================================================================

/**
 * Create an Apollo Server format error function.
 *
 * @example
 * ```typescript
 * import { ApolloServer } from '@apollo/server'
 * import { createApolloErrorFormatter } from './graphql-integration'
 *
 * const server = new ApolloServer({
 *   typeDefs,
 *   resolvers,
 *   formatError: createApolloErrorFormatter({
 *     logger: console.error
 *   })
 * })
 * ```
 */
export const createApolloErrorFormatter = (options?: ErrorFormatterOptions) => {
  const { logger } = options ?? {}

  return (formattedError: { message: string; extensions?: Record<string, unknown> }, error: unknown) => {
    // Get the original error
    const originalError = error instanceof GraphQLError ? error.originalError : error

    // Convert to ErrorX
    const errorX = ErrorX.isErrorX(originalError)
      ? originalError
      : ErrorX.from(originalError ?? formattedError)

    // Log the error
    if (logger) {
      logger(toLogEntry(errorX, { includeStack: true }))
    }

    // Return formatted error with ErrorX extensions
    return {
      message: formattedError.message,
      extensions: {
        ...formattedError.extensions,
        ...toGraphQLExtensions(errorX, options),
      },
    }
  }
}

/**
 * Apollo Server plugin for error handling.
 *
 * @example
 * ```typescript
 * const server = new ApolloServer({
 *   typeDefs,
 *   resolvers,
 *   plugins: [
 *     errorXPlugin({
 *       logger: (entry) => myLogger.error(entry)
 *     })
 *   ]
 * })
 * ```
 */
export const errorXPlugin = (options?: {
  logger?: (entry: ReturnType<typeof toLogEntry>, context: { operationName?: string }) => void
}) => ({
  async requestDidStart() {
    return {
      async didEncounterErrors({ errors, operationName }: { errors: readonly GraphQLError[]; operationName?: string }) {
        for (const error of errors) {
          const originalError = error.originalError
          const errorX = ErrorX.isErrorX(originalError)
            ? originalError
            : ErrorX.from(originalError ?? error)

          if (options?.logger) {
            options.logger(
              toLogEntry(errorX, {
                includeStack: true,
                context: { operationName },
              }),
              { operationName }
            )
          }
        }
      },
    }
  },
})

// ============================================================================
// graphql-yoga Integration
// ============================================================================

/**
 * Create a graphql-yoga mask error function.
 *
 * @example
 * ```typescript
 * import { createYoga } from 'graphql-yoga'
 * import { createYogaErrorMasker } from './graphql-integration'
 *
 * const yoga = createYoga({
 *   schema,
 *   maskedErrors: {
 *     maskError: createYogaErrorMasker({ includeStack: false })
 *   }
 * })
 * ```
 */
export const createYogaErrorMasker = (options?: ErrorFormatterOptions) => {
  const { maskInternalErrors = true, logger } = options ?? {}

  return (error: unknown, message: string) => {
    // Convert to ErrorX
    const errorX = ErrorX.isErrorX(error) ? error : ErrorX.from(error)

    // Log
    if (logger) {
      logger(toLogEntry(errorX, { includeStack: true }))
    }

    // Check if it's a user-facing error
    const isUserError = errorX.httpStatus !== undefined && errorX.httpStatus < 500

    if (isUserError || !maskInternalErrors) {
      return toGraphQLError(errorX, options)
    }

    // Return masked error
    return new GraphQLError(message, {
      extensions: {
        code: 'INTERNAL_SERVER_ERROR',
        timestamp: new Date().toISOString(),
        fingerprint: generateFingerprint(errorX),
      },
    })
  }
}

// ============================================================================
// Error Classes for GraphQL
// ============================================================================

/**
 * GraphQL-specific error codes.
 */
const graphqlPresets = {
  UNAUTHENTICATED: {
    code: 'UNAUTHENTICATED',
    name: 'AuthenticationError',
    message: 'You must be logged in to perform this action.',
    httpStatus: 401,
  },
  FORBIDDEN: {
    code: 'FORBIDDEN',
    name: 'ForbiddenError',
    message: 'You are not authorized to perform this action.',
    httpStatus: 403,
  },
  NOT_FOUND: {
    code: 'NOT_FOUND',
    name: 'NotFoundError',
    message: 'The requested resource was not found.',
    httpStatus: 404,
  },
  BAD_USER_INPUT: {
    code: 'BAD_USER_INPUT',
    name: 'UserInputError',
    message: 'Invalid input provided.',
    httpStatus: 400,
  },
  PERSISTED_QUERY_NOT_FOUND: {
    code: 'PERSISTED_QUERY_NOT_FOUND',
    name: 'PersistedQueryNotFoundError',
    message: 'The persisted query was not found.',
    httpStatus: 400,
  },
  PERSISTED_QUERY_NOT_SUPPORTED: {
    code: 'PERSISTED_QUERY_NOT_SUPPORTED',
    name: 'PersistedQueryNotSupportedError',
    message: 'Persisted queries are not supported.',
    httpStatus: 400,
  },
} as const

type GraphQLPresetKey = keyof typeof graphqlPresets | (string & {})

/**
 * GraphQL-specific error class with Apollo-compatible codes.
 *
 * @example
 * ```typescript
 * // In resolver
 * if (!context.user) {
 *   throw GraphQLErrorX.create('UNAUTHENTICATED')
 * }
 *
 * const user = await getUser(id)
 * if (!user) {
 *   throw GraphQLErrorX.create('NOT_FOUND', {
 *     message: 'User not found',
 *     metadata: { userId: id }
 *   })
 * }
 * ```
 */
export class GraphQLErrorX extends ErrorX {
  static presets = graphqlPresets
  static defaultPreset = 'BAD_USER_INPUT'

  static override create(
    presetKey?: GraphQLPresetKey,
    overrides?: Partial<Parameters<typeof ErrorX.from>[1]>
  ): GraphQLErrorX {
    return ErrorX.create.call(GraphQLErrorX, presetKey, overrides) as GraphQLErrorX
  }

  /**
   * Convert to GraphQLError for throwing.
   */
  toGraphQL(options?: ErrorFormatterOptions): GraphQLError {
    return toGraphQLError(this, options)
  }
}

// ============================================================================
// Resolver Helpers
// ============================================================================

/**
 * Wrap a resolver function with error handling.
 *
 * @example
 * ```typescript
 * const resolvers = {
 *   Query: {
 *     user: withErrorHandling(async (_, { id }, context) => {
 *       const user = await context.db.user.findUnique({ where: { id } })
 *       if (!user) {
 *         throw GraphQLErrorX.create('NOT_FOUND', { metadata: { userId: id } })
 *       }
 *       return user
 *     })
 *   }
 * }
 * ```
 */
export const withErrorHandling = <TParent, TArgs, TContext, TResult>(
  resolver: (parent: TParent, args: TArgs, context: TContext, info: unknown) => Promise<TResult>,
  options?: ErrorFormatterOptions
) => {
  return async (parent: TParent, args: TArgs, context: TContext, info: unknown): Promise<TResult> => {
    try {
      return await resolver(parent, args, context, info)
    } catch (err) {
      // Already a GraphQL error
      if (err instanceof GraphQLError) {
        throw err
      }

      // Convert and throw
      throw toGraphQLErrorFromAny(err, options)
    }
  }
}

/**
 * Create a resolver that requires authentication.
 *
 * @example
 * ```typescript
 * const resolvers = {
 *   Mutation: {
 *     updateProfile: requireAuth(async (_, { input }, { user }) => {
 *       return updateUser(user.id, input)
 *     })
 *   }
 * }
 * ```
 */
export const requireAuth = <TParent, TArgs, TContext extends { user?: unknown }, TResult>(
  resolver: (parent: TParent, args: TArgs, context: TContext, info: unknown) => Promise<TResult>
) => {
  return async (parent: TParent, args: TArgs, context: TContext, info: unknown): Promise<TResult> => {
    if (!context.user) {
      throw GraphQLErrorX.create('UNAUTHENTICATED')
    }
    return resolver(parent, args, context, info)
  }
}

// ============================================================================
// Client-Side Error Parsing
// ============================================================================

/**
 * Parse GraphQL errors on the client side.
 *
 * @example
 * ```typescript
 * import { useQuery } from '@apollo/client'
 *
 * const { data, error } = useQuery(GET_USER)
 *
 * if (error) {
 *   const parsed = parseGraphQLErrors(error)
 *   parsed.forEach(e => {
 *     console.log(e.code, e.message)
 *     showToast(e.userMessage)
 *   })
 * }
 * ```
 */
export const parseGraphQLErrors = (error: { graphQLErrors?: readonly GraphQLError[] }) => {
  const errors = error.graphQLErrors ?? []

  return errors.map((e) => {
    const extensions = e.extensions as GraphQLErrorExtensions | undefined

    return {
      code: extensions?.code ?? 'UNKNOWN_ERROR',
      message: e.message,
      userMessage: getUserFriendlyMessage(extensions?.code, extensions?.httpStatus),
      httpStatus: extensions?.httpStatus,
      metadata: extensions?.metadata,
      fingerprint: extensions?.fingerprint,
    }
  })
}

/**
 * Get user-friendly message for common error codes.
 */
const getUserFriendlyMessage = (code?: string, httpStatus?: number): string => {
  const messages: Record<string, string> = {
    UNAUTHENTICATED: 'Please log in to continue.',
    FORBIDDEN: 'You don\'t have permission to do that.',
    NOT_FOUND: 'The requested item could not be found.',
    BAD_USER_INPUT: 'Please check your input and try again.',
    INTERNAL_SERVER_ERROR: 'Something went wrong. Please try again later.',
  }

  if (code && messages[code]) {
    return messages[code]
  }

  if (httpStatus && httpStatus >= 500) {
    return 'Something went wrong. Please try again later.'
  }

  return 'An error occurred. Please try again.'
}

// ============================================================================
// Complete Usage Examples
// ============================================================================

/**
 * ## Apollo Server Setup
 *
 * ```typescript
 * import { ApolloServer } from '@apollo/server'
 * import { startStandaloneServer } from '@apollo/server/standalone'
 * import {
 *   createApolloErrorFormatter,
 *   errorXPlugin,
 *   GraphQLErrorX,
 *   withErrorHandling,
 *   requireAuth
 * } from './graphql-integration'
 *
 * const typeDefs = `
 *   type User {
 *     id: ID!
 *     email: String!
 *     name: String!
 *   }
 *
 *   type Query {
 *     user(id: ID!): User
 *     me: User
 *   }
 *
 *   type Mutation {
 *     updateProfile(name: String!): User
 *   }
 * `
 *
 * const resolvers = {
 *   Query: {
 *     user: withErrorHandling(async (_, { id }, { db }) => {
 *       const user = await db.user.findUnique({ where: { id } })
 *       if (!user) {
 *         throw GraphQLErrorX.create('NOT_FOUND', {
 *           message: 'User not found',
 *           metadata: { userId: id }
 *         })
 *       }
 *       return user
 *     }),
 *
 *     me: requireAuth(async (_, __, { user, db }) => {
 *       return db.user.findUnique({ where: { id: user.id } })
 *     })
 *   },
 *
 *   Mutation: {
 *     updateProfile: requireAuth(async (_, { name }, { user, db }) => {
 *       return db.user.update({
 *         where: { id: user.id },
 *         data: { name }
 *       })
 *     })
 *   }
 * }
 *
 * const server = new ApolloServer({
 *   typeDefs,
 *   resolvers,
 *   formatError: createApolloErrorFormatter({
 *     includeStack: process.env.NODE_ENV !== 'production',
 *     logger: (entry) => logger.error('[GraphQL]', entry)
 *   }),
 *   plugins: [
 *     errorXPlugin({
 *       logger: (entry, ctx) =>
 *         logger.error(`[${ctx.operationName ?? 'Anonymous'}]`, entry)
 *     })
 *   ]
 * })
 *
 * await startStandaloneServer(server, { listen: { port: 4000 } })
 * ```
 *
 * ## graphql-yoga Setup
 *
 * ```typescript
 * import { createYoga } from 'graphql-yoga'
 * import { createServer } from 'node:http'
 * import { createYogaErrorMasker, GraphQLErrorX } from './graphql-integration'
 *
 * const yoga = createYoga({
 *   schema,
 *   maskedErrors: {
 *     maskError: createYogaErrorMasker({
 *       logger: console.error,
 *       maskInternalErrors: true
 *     })
 *   }
 * })
 *
 * const server = createServer(yoga)
 * server.listen(4000)
 * ```
 *
 * ## Client Usage with Apollo Client
 *
 * ```typescript
 * import { useQuery, useMutation } from '@apollo/client'
 * import { parseGraphQLErrors } from './graphql-integration'
 *
 * const UserProfile = ({ userId }) => {
 *   const { data, loading, error } = useQuery(GET_USER, {
 *     variables: { id: userId }
 *   })
 *
 *   if (loading) return <Spinner />
 *
 *   if (error) {
 *     const errors = parseGraphQLErrors(error)
 *     return (
 *       <ErrorDisplay
 *         message={errors[0]?.userMessage ?? 'An error occurred'}
 *         code={errors[0]?.code}
 *       />
 *     )
 *   }
 *
 *   return <UserCard user={data.user} />
 * }
 * ```
 */

export {
  ErrorX,
  HTTPErrorX,
  DBErrorX,
  ValidationErrorX,
  toLogEntry,
  generateFingerprint,
}
