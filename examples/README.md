# error-x Integration Examples

This directory contains example integrations for error-x with popular frameworks and libraries.

## Examples

### Server Frameworks

- **[hono-middleware.ts](./hono-middleware.ts)** - Hono.js error handling middleware
- **[express-middleware.ts](./express-middleware.ts)** - Express.js error handling middleware

### Frontend

- **[react-error-boundary.tsx](./react-error-boundary.tsx)** - React error boundary with ErrorX integration

### API Frameworks

- **[trpc-integration.ts](./trpc-integration.ts)** - tRPC error handling with ErrorX
- **[graphql-integration.ts](./graphql-integration.ts)** - GraphQL (Apollo/yoga) error formatting

### Utilities

- **[logging-integration.ts](./logging-integration.ts)** - Pino, Winston, and generic logging integration
- **[zod-integration.ts](./zod-integration.ts)** - Advanced Zod validation patterns

## Quick Start

### Hono.js

```typescript
import { Hono } from 'hono'
import { HTTPErrorX, ValidationErrorX } from '@bombillazo/error-x'
import { errorMiddleware, requestIdMiddleware } from './examples/hono-middleware'

const app = new Hono()

app.use('*', requestIdMiddleware())
app.onError(errorMiddleware())

app.get('/user/:id', async (c) => {
  const user = await getUser(c.req.param('id'))
  if (!user) {
    throw HTTPErrorX.create(404, { message: 'User not found' })
  }
  return c.json(user)
})
```

### Express.js

```typescript
import express from 'express'
import { HTTPErrorX } from '@bombillazo/error-x'
import { errorHandler, asyncHandler, notFoundHandler } from './examples/express-middleware'

const app = express()

app.get('/user/:id', asyncHandler(async (req, res) => {
  const user = await getUser(req.params.id)
  if (!user) {
    throw HTTPErrorX.create(404)
  }
  res.json(user)
}))

app.use(notFoundHandler())
app.use(errorHandler())
```

### React

```tsx
import { ErrorBoundary, useErrorBoundary } from './examples/react-error-boundary'
import { HTTPErrorX } from '@bombillazo/error-x'

const App = () => (
  <ErrorBoundary onError={(error, info) => trackError(error)}>
    <MainContent />
  </ErrorBoundary>
)

const DataFetcher = () => {
  const { reportError } = useErrorBoundary()

  const fetchData = async () => {
    try {
      const response = await fetch('/api/data')
      if (!response.ok) throw HTTPErrorX.create(response.status)
      return response.json()
    } catch (err) {
      reportError(err)
    }
  }

  // ...
}
```

### Logging

```typescript
import pino from 'pino'
import { ErrorX, toLogEntry } from '@bombillazo/error-x'
import { createPinoConfig, createErrorDeduplicator } from './examples/logging-integration'

const logger = pino(createPinoConfig())
const dedup = createErrorDeduplicator()

// In error handler
const error = ErrorX.from(caughtError)
if (dedup.shouldLog(error)) {
  logger.error(toLogEntry(error, { includeStack: true }))
}
```

### tRPC

```typescript
import { initTRPC } from '@trpc/server'
import { HTTPErrorX } from '@bombillazo/error-x'
import { createErrorFormatter, toTRPCError } from './examples/trpc-integration'

const t = initTRPC.create({
  errorFormatter: createErrorFormatter()
})

const appRouter = t.router({
  user: t.router({
    get: t.procedure.input(z.object({ id: z.string() })).query(async ({ input }) => {
      const user = await db.user.findUnique({ where: { id: input.id } })
      if (!user) throw toTRPCError(HTTPErrorX.create(404))
      return user
    })
  })
})
```

### GraphQL

```typescript
import { ApolloServer } from '@apollo/server'
import { GraphQLErrorX, createApolloErrorFormatter } from './examples/graphql-integration'

const server = new ApolloServer({
  typeDefs,
  resolvers,
  formatError: createApolloErrorFormatter()
})

// In resolver
const resolvers = {
  Query: {
    user: async (_, { id }) => {
      const user = await getUser(id)
      if (!user) throw GraphQLErrorX.create('NOT_FOUND')
      return user
    }
  }
}
```

### Zod Validation

```typescript
import { z } from 'zod'
import { ValidationErrorX } from '@bombillazo/error-x'
import { validateRequest, validateForm } from './examples/zod-integration'

const schema = z.object({
  email: z.string().email(),
  age: z.number().min(18)
})

// API validation
app.post('/api/users', async (c) => {
  const validation = validateRequest(schema, await c.req.json())
  if (!validation.success) {
    return c.json(validation.errorResponse, 400)
  }
  // validation.data is typed
})

// Form validation
const result = validateForm(schema, formData)
if (!result.success) {
  setErrors(result.fieldErrors) // { email: ['Invalid email'], age: ['Must be 18+'] }
}
```

## Note

These examples are for reference and may require additional dependencies. Install the relevant framework/library before using:

```bash
# Server frameworks
pnpm add hono
pnpm add express && pnpm add -D @types/express

# React
pnpm add react react-dom

# API frameworks
pnpm add @trpc/server @trpc/client
pnpm add @apollo/server graphql
# or
pnpm add graphql-yoga graphql

# Logging
pnpm add pino
# or
pnpm add winston

# Validation
pnpm add zod
```
