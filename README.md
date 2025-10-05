# error-x

[![npm downloads](https://img.shields.io/npm/dm/@bombillazo/error-x.svg?style=for-the-badge)](https://www.npmjs.com/package/@bombillazo/error-x)
[![npm](https://img.shields.io/npm/dt/@bombillazo/error-x.svg?style=for-the-badge)](https://www.npmjs.com/package/@bombillazo/error-x)
[![npm](https://img.shields.io/npm/l/@bombillazo/error-x?style=for-the-badge)](https://github.com/bombillazo/error-x/blob/master/LICENSE)

A smart, isomorphic, and type-safe error library for TypeScript applications. Provides excellent DX with intelligent error conversion, stack trace preservation, serialization support, and HTTP error presets.

## Features

- 🎯 **Type-safe error handling** with full TypeScript support
- 🔄 **Smart error conversion** from various formats (API responses, strings, Error objects)
- 👤 **User-friendly messages** separate from technical messages
- 🔗 **Error chaining** with cause preservation and stack trace preservation
- 📊 **Flexible metadata** for additional context
- 📦 **Serialization/deserialization** for network transfer and storage
- 🎨 **HTTP error presets** for all status codes (400-511)
- 🌐 **Isomorphic** - works in Node.js and browsers
- ⚙️ **Global configuration** for defaults and documentation URLs

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
> This library is currently in pre-v1.0 development. While we strive to minimize breaking changes, the API may evolve based on feedback and real-world usage. We recommend pinning to specific versions and reviewing release notes when updating.
>
> Once we reach version 1.0, we plan to minimize API changes and follow semantic versioning.

## Quick Start

```typescript
import { ErrorX, http } from '@bombillazo/error-x'

// Simple usage
throw new ErrorX('Database connection failed')

// With options
throw new ErrorX({
  message: 'User authentication failed',
  name: 'AuthError',
  code: 'AUTH_FAILED',
  uiMessage: 'Please check your credentials and try again',
  metadata: { userId: 123, loginAttempt: 3 },
  sourceUrl: 'https://api.example.com/auth',
  source: 'auth-service',
  httpStatus: 401
})

// Using HTTP presets
throw new ErrorX(http.notFound)

// Customizing presets
throw new ErrorX({
  ...http.unauthorized,
  message: 'Session expired',
  metadata: { userId: 123 }
})

// Smart conversion from unknown errors
try {
  await someOperation()
} catch (error) {
  const errorX = ErrorX.from(error)
  throw errorX.withMetadata({ context: 'additional info' })
}
```

## Documentation

### Constructor

```typescript
new ErrorX(message?: string | ErrorXOptions)
```

All parameters are optional. ErrorX uses sensible defaults:

| Property  | Type                         | Default Value                         | Description                                                       |
| --------- | ---------------------------- | ------------------------------------- | ----------------------------------------------------------------- |
| message   | `string`                     | `'An error occurred'`                 | Technical error message (pass-through, no auto-formatting)        |
| name      | `string`                     | `'Error'`                             | Error type/title                                                  |
| code      | `string \| number`           | Auto-generated from name or `'ERROR'` | Error identifier (auto-generated from name in UPPER_SNAKE_CASE)   |
| uiMessage | `string \| undefined`        | `undefined`                           | User-friendly message for display                                 |
| cause     | `Error \| unknown`           | `undefined`                           | Original error that caused this (preserves full error chain)      |
| metadata  | `Record<string, unknown> \| undefined` | `undefined`                        | Additional context and data                                       |
| httpStatus | `number \| undefined`       | `undefined`                           | HTTP status code (100-599) for HTTP-related errors               |
| type      | `string \| undefined`        | `undefined`                           | Error type for categorization (e.g., 'http', 'validation')       |
| sourceUrl | `string \| undefined`        | `undefined`                           | URL related to the error (API endpoint, page URL, resource URL)   |
| docsUrl   | `string \| undefined`        | `undefined` or auto-generated         | Documentation URL for this specific error                         |
| source    | `string \| undefined`        | `undefined` or from config            | Where the error originated (service name, module, component)      |
| timestamp | `Date`                       | `new Date()`                          | When the error was created (read-only)                            |
| stack     | `string`                     | Auto-generated                        | Stack trace with preservation and cleaning (inherited from Error) |

### HTTP Error Presets

ErrorX provides pre-configured error templates via the `http` export:

```typescript
import { ErrorX, http } from '@bombillazo/error-x'

// Use preset directly
throw new ErrorX(http.notFound)
// Result: 404 error with message "Not found.", code "NOT_FOUND", etc.

// Override specific fields
throw new ErrorX({
  ...http.notFound,
  message: 'User not found',
  metadata: { userId: 123 }
})

// Add error cause
try {
  // some operation
} catch (originalError) {
  throw new ErrorX({
    ...http.internalServerError,
    cause: originalError,
    metadata: { operation: 'database-query' }
  })
}
```

#### Available Presets

All presets use **camelCase naming** and include:
- `httpStatus`: HTTP status code
- `code`: Error code in UPPER_SNAKE_CASE
- `name`: Descriptive error name
- `message`: Technical message with proper sentence casing and period
- `uiMessage`: User-friendly message
- `type`: Set to `'http'` for all HTTP presets

**4xx Client Errors:**
`badRequest`, `unauthorized`, `paymentRequired`, `forbidden`, `notFound`, `methodNotAllowed`, `notAcceptable`, `proxyAuthenticationRequired`, `requestTimeout`, `conflict`, `gone`, `lengthRequired`, `preconditionFailed`, `payloadTooLarge`, `uriTooLong`, `unsupportedMediaType`, `rangeNotSatisfiable`, `expectationFailed`, `imATeapot`, `unprocessableEntity`, `locked`, `failedDependency`, `tooEarly`, `upgradeRequired`, `preconditionRequired`, `tooManyRequests`, `requestHeaderFieldsTooLarge`, `unavailableForLegalReasons`

**5xx Server Errors:**
`internalServerError`, `notImplemented`, `badGateway`, `serviceUnavailable`, `gatewayTimeout`, `httpVersionNotSupported`, `variantAlsoNegotiates`, `insufficientStorage`, `loopDetected`, `notExtended`, `networkAuthenticationRequired`

### Static Methods

#### `ErrorX.from(error: unknown): ErrorX`

Converts any error type to ErrorX with intelligent property extraction:

```typescript
// Convert Error instances
const error = new Error('Something failed')
const errorX = ErrorX.from(error)
// Preserves: name, message, cause, stack

// Convert API responses
const apiError = { status: 404, statusText: 'Not Found', error: 'User not found' }
const errorX = ErrorX.from(apiError)
// Extracts: message, httpStatus, stores original in metadata

// Convert strings
const errorX = ErrorX.from('Something went wrong')
// Creates ErrorX with string as message

// Already ErrorX? Returns as-is
const errorX = ErrorX.from(new ErrorX('test'))
// Returns the same instance
```

#### `ErrorX.isErrorX(value: unknown): value is ErrorX`

Type guard to check if a value is an ErrorX instance:

```typescript
if (ErrorX.isErrorX(error)) {
  console.log(error.code, error.uiMessage)
}
```

#### `ErrorX.configure(config: ErrorXConfig): void`

Set global defaults for all ErrorX instances:

```typescript
ErrorX.configure({
  source: 'my-api-service',
  docsBaseURL: 'https://docs.example.com',
  docsMap: {
    'AUTH_FAILED': 'errors/authentication',
    'NOT_FOUND': 'errors/not-found'
  }
})

// Now all errors automatically get:
// - source: 'my-api-service' (unless overridden)
// - docsUrl: auto-generated from docsBaseURL + docsMap[code]
```

#### `ErrorX.getConfig(): ErrorXConfig | null`

Get the current global configuration:

```typescript
const config = ErrorX.getConfig()
console.log(config?.source) // 'my-api-service'
```

### Instance Methods

#### `withMetadata(additionalMetadata: Record<string, unknown>): ErrorX`

Creates a new ErrorX instance with merged metadata:

```typescript
const error = new ErrorX({ message: 'test', metadata: { a: 1 } })
const enriched = error.withMetadata({ b: 2 })
// enriched.metadata = { a: 1, b: 2 }
```

#### `cleanStackTrace(delimiter?: string): ErrorX`

Removes stack trace lines before a delimiter:

```typescript
const error = new ErrorX('test')
const cleaned = error.cleanStackTrace('my-app-boundary')
// Stack trace only includes lines after 'my-app-boundary'
```

#### `toJSON(): ErrorXSerialized`

Serializes the error for network transfer:

```typescript
const error = new ErrorX({ message: 'test', code: 'TEST' })
const json = error.toJSON()
// Returns plain object with all error properties
```

#### `fromJSON(serialized: ErrorXSerialized): ErrorX`

Deserializes a JSON object back to ErrorX:

```typescript
const json = { name: 'TestError', message: 'test', code: 'TEST', ... }
const error = ErrorX.fromJSON(json)
// Returns fully reconstructed ErrorX instance
```

## Usage Examples

### Basic Error Handling

```typescript
import { ErrorX } from '@bombillazo/error-x'

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
        ...http[response.status === 404 ? 'notFound' : 'internalServerError'],
        metadata: { status: response.status, statusText: response.statusText }
      })
    }
    return response.json()
  } catch (error) {
    const errorX = ErrorX.from(error)
    throw errorX.withMetadata({ userId: id, operation: 'fetchUser' })
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
  throw new ErrorX({
    message: 'User creation failed',
    name: 'UserCreationError',
    code: 'USER_CREATE_FAILED',
    uiMessage: 'Unable to create user account',
    cause: dbError, // Preserves original stack trace
    metadata: {
      operation: 'userRegistration',
      email: userData.email
    }
  })
}
```

## Message Formatting

**Important:** ErrorX does NOT auto-format messages. Messages are passed through as-is:

```typescript
new ErrorX({ message: 'test error' })
// message: 'test error' (exactly as provided)

new ErrorX({ message: 'Test error.' })
// message: 'Test error.' (exactly as provided)
```

Empty or whitespace-only messages default to `'An error occurred'`:

```typescript
new ErrorX({ message: '' })
// message: 'An error occurred'

new ErrorX({ message: '   ' })
// message: 'An error occurred'
```

HTTP presets provide properly formatted messages with sentence casing and periods.

## Auto Code Generation

Error codes are automatically generated from names when not provided:

```typescript
new ErrorX({ message: 'Failed', name: 'DatabaseError' })
// code: 'DATABASE_ERROR'

new ErrorX({ message: 'Failed', name: 'userAuthError' })
// code: 'USER_AUTH_ERROR'

new ErrorX({ message: 'Failed', name: 'API Timeout' })
// code: 'API_TIMEOUT'
```

## License

MIT
