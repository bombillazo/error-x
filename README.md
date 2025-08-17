# error-x

A simple and consistent error handling library for TypeScript applications. Provides type-safe error handling with great DX, solving common pain points like unknown error types, lost stack traces, async error handling, and error serialization. Isomorphic and framework-agnostic.

## Features

- 🎯 **Type-safe error handling** with rich metadata support
- 🔄 **Smart error conversion** from various formats (API responses, strings, Error objects)
- 📝 **Auto-formatted messages** with proper capitalization and punctuation
- 🏷️ **Auto-generated error codes** from error names
- 👤 **User-friendly messages** separate from technical messages
- 🕒 **Automatic timestamps** for error tracking
- 🔗 **Error chaining** with cause preservation
- 📊 **Flexible metadata** for additional context

## Installation

```bash
pnpm add error-x
# or
npm install error-x
# or
yarn add error-x
```

## Quick Start

```typescript
import { ErrorX } from 'error-x'

// Simple usage
const error = new ErrorX({ message: 'Database connection failed' })

// With full options
const error = new ErrorX({
  message: 'User authentication failed',
  name: 'AuthError',
  code: 'AUTH_FAILED',
  uiMessage: 'Please check your credentials and try again',
  metadata: { 
    userId: 123, 
    loginAttempt: 3,
    timestamp: Date.now()
  }
})
```

## API Reference

### Constructor

```typescript
new ErrorX(options: {
  message: string                    // Required: Technical error message
  name?: string                      // Optional: Error type (default: 'Error')
  code?: string                      // Optional: Error code (auto-generated if not provided)
  uiMessage?: string                 // Optional: User-friendly message
  cause?: Error | unknown            // Optional: Original error that caused this
  metadata?: Record<string, unknown> // Optional: Additional context data
})
```

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `message` | `string` | Auto-formatted technical error message |
| `name` | `string` | Error type/title |
| `code` | `string` | Error identifier (auto-generated from name) |
| `uiMessage` | `string` | User-friendly message for display |
| `metadata` | `object` | Additional context and data |
| `timestamp` | `Date` | When the error was created |
| `stack` | `string` | Stack trace (inherited from Error) |
| `cause` | `unknown` | Original error that caused this (if any) |

### Static Methods

#### `ErrorX.wrap(error, options?)`

Wraps existing errors with optional property overrides.

```typescript
try {
  await database.connect()
} catch (err) {
  throw ErrorX.wrap(err, {
    message: 'Database connection failed',
    code: 'DB_CONNECTION_ERROR',
    uiMessage: 'Unable to connect to database. Please try again.'
  })
}
```

#### `ErrorX.toErrorX(error)`

Intelligently converts unknown error formats to ErrorX instances.

```typescript
// API response
const apiError = { error: 'User not found', code: 'USER_404', statusText: 'Not Found' }
const errorX = ErrorX.toErrorX(apiError)

// String error
const stringError = ErrorX.toErrorX('Something went wrong')

// Standard Error
const standardError = ErrorX.toErrorX(new Error('Connection timeout'))
```

**Supported input properties:**
- `message`, `details`, `text`, `info`, `statusText`, `error`, `errorMessage`
- `name`, `title`
- `code`
- `uiMessage`, `userMessage`

#### `ErrorX.isErrorX(value)`

Type guard to check if a value is an ErrorX instance.

```typescript
if (ErrorX.isErrorX(error)) {
  console.log(error.code) // TypeScript knows this is ErrorX
}
```

### Instance Methods

#### `withMetadata(additionalMetadata)`

Returns a new ErrorX instance with merged metadata.

```typescript
const error = new ErrorX({ message: 'API request failed' })
const enrichedError = error.withMetadata({ 
  endpoint: '/api/users',
  retryCount: 3,
  userId: 123
})
```

## Smart Features

### Auto Code Generation

Error codes are automatically generated from the error name:

```typescript
new ErrorX({ message: 'Failed', name: 'DatabaseError' })
// code: 'DATABASE_ERROR'

new ErrorX({ message: 'Failed', name: 'userAuthError' })  
// code: 'USER_AUTH_ERROR'

new ErrorX({ message: 'Failed', name: 'API Timeout' })
// code: 'API_TIMEOUT'
```

### Message Formatting

Messages are automatically formatted with proper capitalization and punctuation:

```typescript
new ErrorX({ message: 'database connection failed' })
// message: 'Database connection failed.'

new ErrorX({ message: 'user not found. please check credentials' })
// message: 'User not found. Please check credentials.'
```

### Default Values

| Property | Default Value |
|----------|---------------|
| `name` | `'Error'` |
| `code` | Auto-generated from name or `'ERROR'` |
| `uiMessage` | `'Something went wrong. Please try again.'` |
| `metadata` | `{}` |

## Usage Examples

### Basic Error Handling

```typescript
import { ErrorX } from 'error-x'

function validateUser(user: unknown) {
  if (!user) {
    throw new ErrorX({
      message: 'User validation failed: user is required',
      name: 'ValidationError',
      code: 'USER_REQUIRED',
      uiMessage: 'Please provide user information',
      metadata: { field: 'user', received: user }
    })
  }
}
```

### API Error Handling

```typescript
async function fetchUser(id: string) {
  try {
    const response = await fetch(`/api/users/${id}`)
    if (!response.ok) {
      throw ErrorX.toErrorX({
        message: `Failed to fetch user: ${response.statusText}`,
        code: `HTTP_${response.status}`,
        statusText: response.statusText,
        uiMessage: 'Unable to load user data'
      })
    }
    return response.json()
  } catch (error) {
    throw ErrorX.wrap(error, {
      message: 'User fetch operation failed',
      metadata: { userId: id, operation: 'fetchUser' }
    })
  }
}
```

### Error Chaining

```typescript
try {
  await database.transaction(async (tx) => {
    await tx.users.create(userData)
  })
} catch (dbError) {
  const error = ErrorX.wrap(dbError, {
    message: 'User creation failed',
    code: 'USER_CREATE_FAILED',
    uiMessage: 'Unable to create user account'
  })
  
  // Add more context
  throw error.withMetadata({
    operation: 'userRegistration',
    timestamp: new Date().toISOString(),
    requestId: generateRequestId()
  })
}
```

### Type Guards and Error Handling

```typescript
function handleError(error: unknown) {
  if (ErrorX.isErrorX(error)) {
    // Full ErrorX functionality
    console.error(`[${error.code}] ${error.message}`)
    logToService(error.metadata)
    showUserMessage(error.uiMessage)
  } else {
    // Convert unknown errors
    const errorX = ErrorX.toErrorX(error)
    handleError(errorX)
  }
}
```

## TypeScript Support

This library is written in TypeScript and provides full type safety:

```typescript
import { ErrorX, type ErrorMetadata } from 'error-x'

const metadata: ErrorMetadata = {
  userId: 123,
  requestId: 'req_abc123',
  timestamp: Date.now()
}

const error = new ErrorX({
  message: 'Operation failed',
  metadata
})
```

## License

MIT