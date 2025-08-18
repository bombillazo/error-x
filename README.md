# error-x

A smart, isomorphic, and delightful error library for TypeScript applications. Provides type-safe error handling with great DX, solving common pain points like unknown error types, lost stack traces, async error handling, and error serialization.

## Features

- 🎯 **Type-safe error handling** for great DX
- 🔄 **Smart error conversion** from various formats (API responses, strings, Error objects)
- 📝 **Auto-formatted messages and error codes** with proper capitalization and punctuation
- 👤 **User-friendly messages** separate from technical messages
- 🕒 **Automatic timestamps** for error tracking
- 🔗 **Error chaining** with cause preservation and stack trace preservation
- 📊 **Flexible metadata** for additional context
- 🎛️ **Error handling options** for UI behavior and application actions
- 📦 **Serialization/deserialization** support for network transfer and storage

## Installation

```bash
pnpm add @bombillazo/error-x
# or
npm install @bombillazo/error-x
# or
yarn add @bombillazo/error-x
```

> [!WARNING]
>
> This library is currently in pre-1.0 development. While we strive to minimize breaking changes, the API may evolve based on feedback and real-world usage. We recommend pinning to specific versions and reviewing release notes when updating.
>
> Once we reach version 1.0, we plan to minimize API changes and follow semantic versioning.

## Quick Start

```typescript
import { ErrorX, HandlingTargets, type HandlingTarget } from 'error-x'

// Minimal usage (all parameters optional)
const error = new ErrorX()

// Simple usage
const error = new ErrorX({ message: 'Database connection failed' })

// With full options
const error = new ErrorX({
  message: 'User authentication failed',
  name: 'AuthError',
  code: 'AUTH_FAILED',
  uiMessage: 'Please check your credentials and try again',
  cause: originalError, // Chain errors while preserving stack traces
  metadata: { 
    userId: 123, 
    loginAttempt: 3,
    timestamp: Date.now()
  },
  handlingOptions: {
    targets: [HandlingTargets.TOAST, HandlingTargets.BANNER],
    redirect: '/login',
    logout: false
  }
})
```

## API Reference

### Constructor

```typescript
new ErrorX(options?: {
  name?: string                      // Optional: Error type (default: 'Error')
  message?: string                    // Optional: Technical error message (default: 'An error occurred')
  code?: string | number             // Optional: Error code (auto-generated from name if not provided)
  uiMessage?: string                 // Optional: User-friendly message (default: undefined)
  cause?: Error | unknown            // Optional: Original error that caused this (preserves stack traces)
  metadata?: Record<string, any>     // Optional: Additional context data (default: {})
  handlingOptions?: {                // Optional: Error handling configuration (default: undefined)
    targets?: HandlingTarget[]       // Where to display the error (predefined or custom targets)
    redirect?: string                // URL to redirect to after error
    logout?: boolean                 // Whether to log out the user
  }
})
```

**All parameters are optional** - ErrorX uses sensible defaults and auto-generates missing values.

### Properties

| Property          | Type                                | Default Value                         | Description                                                              |
| ----------------- | ----------------------------------- | ------------------------------------- | ------------------------------------------------------------------------ |
| `name`            | `string`                            | `'Error'`                             | Error type/title                                                         |
| `message`         | `string`                            | `'An error occurred'`                 | Auto-formatted technical error message                                   |
| `code`            | `string`                            | Auto-generated from name or `'ERROR'` | Error identifier (auto-generated from name in UPPER_SNAKE_CASE)          |
| `uiMessage`       | `string \| undefined`               | `undefined`                           | User-friendly message for display                                        |
| `metadata`        | `Record<string, any>`               | `{}`                                  | Additional context and data                                              |
| `timestamp`       | `Date`                              | `new Date()`                          | When the error was created (readonly)                                    |
| `handlingOptions` | `ErrorHandlingOptions \| undefined` | `undefined`                           | UI behavior and application actions with display destinations (readonly) |
| `stack`           | `string`                            | Auto-generated                        | Stack trace with preservation and cleaning (inherited from Error)        |
| `cause`           | `unknown`                           | `undefined`                           | Original error that caused this (preserves full error chain)             |

### Handling Targets

The `targets` property accepts an array of `HandlingTarget` values, which can be either predefined enum values or custom strings. This provides flexibility while maintaining type safety.

```typescript
import { HandlingTargets, type HandlingTarget } from 'error-x'

// Using predefined enum values
const error1 = new ErrorX({
  message: 'Database error',
  handlingOptions: {
    targets: [HandlingTargets.MODAL, HandlingTargets.TOAST]
  }
})

// Using custom string values for custom UI components
const error2 = new ErrorX({
  message: 'Custom error',
  handlingOptions: {
    targets: ['sidebar-notification', 'status-bar', 'custom-popup']
  }
})

// Mixing both predefined and custom targets
const error3 = new ErrorX({
  message: 'Mixed error',
  handlingOptions: {
    targets: [
      HandlingTargets.CONSOLE,  // Predefined
      'my-custom-logger',            // Custom
      HandlingTargets.BANNER,   // Predefined
      'analytics-tracker'            // Custom
    ]
  }
})
```

**Predefined Display Targets:**

- `HandlingTargets.MODAL` - Display in a modal dialog
- `HandlingTargets.TOAST` - Display as a toast notification
- `HandlingTargets.INLINE` - Display inline with content
- `HandlingTargets.BANNER` - Display as a banner/alert bar
- `HandlingTargets.CONSOLE` - Log to browser/server console
- `HandlingTargets.LOGGER` - Send to logging service
- `HandlingTargets.NOTIFICATION` - System notification

### Static Methods

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

#### `ErrorX.isErrorX(value)`

Type guard to check if a value is an ErrorX instance.

```typescript
if (ErrorX.isErrorX(error)) {
  console.log(error.code) // TypeScript knows this is ErrorX
}
```

#### `ErrorX.processStack(error, delimiter)`

Processes an error's stack trace to trim it after a specified delimiter.

```typescript
const error = new Error('Something failed')
const cleanStack = ErrorX.processStack(error, 'my-app-entry')
// Returns stack trace starting after the line containing 'my-app-entry'
```

#### `ErrorX.fromJSON(serialized)`

Deserializes a JSON object back into an ErrorX instance with full error chain reconstruction.

```typescript
const serializedError = {
  name: 'DatabaseError',
  message: 'Connection failed.',
  code: 'DB_CONN_FAILED',
  uiMessage: 'Database is temporarily unavailable',
  metadata: { host: 'localhost' },
  timestamp: '2024-01-15T10:30:45.123Z'
}

const error = ErrorX.fromJSON(serializedError)
// Fully restored ErrorX instance with all properties
```

### Instance Methods

#### `withMetadata(additionalMetadata)`

Returns a new ErrorX instance with merged metadata while preserving stack traces.

```typescript
const error = new ErrorX({ message: 'API request failed' })
const enrichedError = error.withMetadata({ 
  endpoint: '/api/users',
  retryCount: 3,
  userId: 123
})
```

#### `cleanStackTrace(delimiter?)`

Returns a new ErrorX instance with cleaned stack trace using the specified delimiter.

```typescript
const error = new ErrorX({ message: 'Database error' })
const cleanedError = error.cleanStackTrace('database-layer')
// Returns new ErrorX with stack trace starting after 'database-layer'
```

#### `toJSON()`

Serializes the ErrorX instance to a JSON-compatible object with full error chain serialization.

```typescript
const error = new ErrorX({
  message: 'API request failed',
  code: 'API_ERROR',
  metadata: { endpoint: '/users', status: 500 }
})

const serialized = error.toJSON()
// Can be safely passed to JSON.stringify() or sent over network
```

#### `toString()`

Converts the ErrorX instance to a detailed string representation with all properties and stack trace.

```typescript
const error = new ErrorX({
  message: 'Database connection failed',
  name: 'DatabaseError',
  code: 'DB_CONN_FAILED',
  metadata: { host: 'localhost', port: 5432 }
})

console.log(error.toString())
// Output: "DatabaseError: Database connection failed. [DB_CONN_FAILED] (2024-01-15T10:30:45.123Z) metadata: {...}"
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
      throw new ErrorX({
        message: `Failed to fetch user: ${response.statusText}`,
        code: `HTTP_${response.status}`,
        uiMessage: 'Unable to load user data',
        metadata: { status: response.status, statusText: response.statusText }
      })
    }
    return response.json()
  } catch (error) {
    // Convert any error to ErrorX and add context
    const errorX = ErrorX.toErrorX(error)
    throw errorX.withMetadata({
      userId: id,
      operation: 'fetchUser',
      timestamp: new Date().toISOString()
    })
  }
}
```

### Error Chaining and Stack Trace Preservation

```typescript
try {
  await database.transaction(async (tx) => {
    await tx.users.create(userData)
  })
} catch (dbError) {
  // Create new ErrorX while preserving the original error in the cause chain
  const error = new ErrorX({
    message: 'User creation failed',
    name: 'UserCreationError',
    code: 'USER_CREATE_FAILED',
    uiMessage: 'Unable to create user account',
    cause: dbError, // Preserves original stack trace and error details
    metadata: {
      operation: 'userRegistration',
      timestamp: new Date().toISOString(),
      userData: { email: userData.email } // Don't log sensitive data
    }
  })
  
  // Add more context while preserving the error chain
  throw error.withMetadata({
    requestId: generateRequestId(),
    userAgent: request.headers['user-agent']
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

## License

MIT
