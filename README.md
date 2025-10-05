# error-x

[![npm downloads](https://img.shields.io/npm/dm/@bombillazo/error-x.svg?style=for-the-badge)](https://www.npmjs.com/package/@bombillazo/error-x)
[![npm](https://img.shields.io/npm/dt/@bombillazo/error-x.svg?style=for-the-badge)](https://www.npmjs.com/package/@bombillazo/error-x)
[![npm](https://img.shields.io/npm/l/@bombillazo/error-x?style=for-the-badge)](https://github.com/bombillazo/error-x/blob/master/LICENSE)

A smart, isomorphic, and opinionated error library for TypeScript applications. Provides type-safe error handling with great DX, solving common pain points like unknown error types, lost stack traces, async error handling, and error serialization.

## Features

- 🎯 **Type-safe error handling** for great DX
- 🔄 **Smart error conversion** from various formats (API responses, strings, Error objects)
- 📝 **Auto-formatted messages and error codes** with proper capitalization and punctuation
- 👤 **User-friendly messages** separate from technical messages
- 🔗 **Error chaining** with cause preservation and stack trace preservation
- 📊 **Flexible metadata** for additional context
- 🎛️ **Error handling options** for UI behavior and application actions
- 📦 **Serialization/deserialization** support for network transfer and storage
- 🎨 **Pre-configured error presets** for common error types

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
import { ErrorX, type ErrorXAction } from '@bombillazo/error-x'

// Minimal usage (all parameters optional)
const error = new ErrorX()

// Simple string message
const error = new ErrorX('Database connection failed')

// String message with additional options
const error = new ErrorX('User authentication failed', {
  name: 'AuthError',
  code: 'AUTH_FAILED',
  uiMessage: 'Please check your credentials and try again',
  metadata: { userId: 123, loginAttempt: 3 },
  url: 'https://api.example.com/auth',
  source: 'auth-service'
})

// Options object
const error = new ErrorX({
  message: 'User authentication failed',
  name: 'AuthError',
  code: 'AUTH_FAILED',
  uiMessage: 'Please check your credentials and try again',
  cause: originalError, // Chain errors while preserving stack traces
  metadata: {
    userId: 123,
    loginAttempt: 3,
  },
  actions: [
    { action: 'notify', targets: ['toast', 'banner'] },
    { action: 'redirect', redirectURL: '/login', delay: 1000 },
    { action: 'custom', type: 'analytics', event: 'auth_failed', userId: 123, category: 'errors', severity: 'high' }
  ],
  url: 'https://api.example.com/auth',
  href: 'https://docs.example.com/errors#auth-failed',
  source: 'auth-service',
  httpStatus: 401
})

// Smart conversion from unknown errors
const apiError = { message: 'User not found', code: 404, statusText: 'Not Found' }
const error = new ErrorX(apiError)
```

## Documentation

### API Reference

For complete API documentation with detailed descriptions, examples, and type information, see:

- **[📖 Complete API Documentation](docs/api/error-x.md)** - Full API reference with examples
- **[🏗️ ErrorX Class](docs/api/error-x.errorx.md)** - Main ErrorX class documentation
- **[🔧 Types](docs/api/error-x.md#type-aliases)** - All available types and interfaces

### Constructor

```typescript
// String message signature
new ErrorX(message: string, options?: {
  name?: string                      // Optional: Error type
  code?: string | number             // Optional: Error code (auto-generated from name if not provided)
  uiMessage?: string                 // Optional: User-friendly message
  cause?: Error | unknown            // Optional: Original error that caused this (preserves stack traces)
  metadata?: Record<string, any>     // Optional: Additional context data
  actions?: ErrorAction[]            // Optional: Configuration for application actions to perform when error occurs
})

// Options object signature (backward compatible)
new ErrorX(options?: {
  name?: string                      // Optional: Error type
  message?: string                   // Optional: Technical error message (default: 'An error occurred')
  code?: string | number             // Optional: Error code (auto-generated from name if not provided)
  uiMessage?: string                 // Optional: User-friendly message
  cause?: Error | unknown            // Optional: Original error that caused this (preserves stack traces)
  metadata?: Record<string, any>     // Optional: Additional context data
  actions?: ErrorAction[]            // Optional: Configuration for application actions to perform when error occurs
})
```

**For converting unknown errors** (like caught errors, API responses, etc.), use the static `toErrorX()` method:

```typescript
// Convert unknown error to ErrorX
try {
  await someOperation()
} catch (error) {
  const errorX = ErrorX.toErrorX(error) // Smart conversion from any error type
  throw errorX
}
```

**All parameters are optional** - ErrorX uses sensible defaults and auto-generates missing values.

### Properties

| Property  | Type                         | Default Value                         | Description                                                       |
| --------- | ---------------------------- | ------------------------------------- | ----------------------------------------------------------------- |
| actions   | `ErrorAction[] \| undefined` | `undefined`                           | Array of actions to perform when error occurs                     |
| cause     | `unknown`                    | `undefined`                           | Original error that caused this (preserves full error chain)      |
| code      | `string`                     | Auto-generated from name or `'ERROR'` | Error identifier (auto-generated from name in UPPER_SNAKE_CASE)   |
| href      | `string \| undefined`        | `undefined`                           | Documentation URL for this specific error                         |
| httpStatus | `number \| undefined`       | `undefined`                           | HTTP status code (100-599) for HTTP-related errors               |
| message   | `string`                     | `'An error occurred'`                 | Auto-formatted technical error message                            |
| metadata  | `Record<string, any> \| undefined` | `undefined`                        | Additional context and data                                       |
| name      | `string`                     | `'Error'`                             | Error type/title                                                  |
| source    | `string \| undefined`        | `undefined` or from `ERROR_X_CONFIG`  | Where the error originated (service name, module, component)      |
| stack     | `string`                     | Auto-generated                        | Stack trace with preservation and cleaning (inherited from Error) |
| timestamp | `Date`                       | `new Date()`                          | When the error was created                                        |
| type      | `string \| undefined`        | `undefined`                           | Error type for categorization                                     |
| uiMessage | `string \| undefined`        | `undefined`                           | User-friendly message for display                                 |
| url       | `string \| undefined`        | `undefined`                           | URL related to the error (API endpoint, page URL, resource URL)   |

### Actions System

The `actions` property allows errors to trigger application logic, passing along the necessary data. Your application error handler can route or execute these actions to achieve the desired behavior.

`actions` accepts an array of `ErrorAction` objects. The library provides predefined action types with type-safe properties, and a `CustomAction` type for application-specific actions.

#### Action Types

| Action Type | Action Value | Required Properties | Description |
| ----------- | ------------ | ------------------- | ----------- |
| CustomAction | `'custom'` | Any additional properties | Application-specific actions with flexible structure |
| LogoutAction | `'logout'` | Any additional properties | Log out the current user |
| NotifyAction | `'notify'` | `targets: string[]` + any additional properties | Display notification in specified UI targets |
| RedirectAction | `'redirect'` | `redirectURL: string` + any additional properties | Redirect to a specific URL |

```typescript
import { type ErrorAction, type CustomAction } from 'error-x'

// Predefined actions with typed properties
const error1 = new ErrorX({
  message: 'Payment failed',
  actions: [
    { action: 'notify', targets: ['modal'] },
    { action: 'redirect', redirectURL: '/payment', delay: 2000 }
  ]
})

// Logout action
const error2 = new ErrorX({
  message: 'Session expired',
  actions: [
    { action: 'logout', clearStorage: true },
    { action: 'notify', targets: ['toast'] }
  ]
})

// Custom actions for application-specific logic
const error3 = new ErrorX({
  message: 'API rate limit exceeded',
  actions: [
    {
      action: 'custom',
      type: 'show-rate-limit-modal',
      resetTime: Date.now() + 60000,
      message: 'Too many requests. Please wait.'
    },
    {
      action: 'custom',
      type: 'analytics-track',
      event: 'rate_limit_hit',
      severity: 'warning',
      category: 'api'
    },
    {
      action: 'custom',
      type: 'cache-request',
      retryAfter: 60,
      endpoint: '/api/users'
    }
  ]
})
```

### Notify Targets

For the `NotifyAction`, notify targets can be predefined enum values or custom strings for flexibility:

#### Predefined Display Targets

| Target | Enum Value | Description |
| ------ | ---------- | ----------- |
| MODAL | `'modal'` | Display in a modal dialog |
| TOAST | `'toast'` | Display as a toast notification |
| INLINE | `'inline'` | Display inline with content |
| BANNER | `'banner'` | Display as a banner/alert bar |
| CONSOLE | `'console'` | Log to browser/server console |
| LOGGER | `'logger'` | Send to logging service |
| NOTIFICATION | `'notification'` | System notification |

```typescript
const error = new ErrorX({
  message: 'Mixed error',
  actions: [
    {
      action: 'notify',
      targets: [
        'console',
        'my-custom-logger',
        'banner',
        'analytics-tracker'
      ]
    }
  ]
})
```

## Error Presets

ErrorX provides pre-configured error templates for common scenarios, making it easy to create consistent, well-structured errors without repetition. All HTTP presets (400-511) are included with proper status codes, messages, and user-friendly text.

### Features

- ✅ **Pre-configured templates** with httpStatus, code, name, message, and uiMessage
- ✅ **Type-safe** with full TypeScript support
- ✅ **Fully customizable** via destructuring and override pattern
- ✅ **Categorized by type** - all HTTP presets include `type: 'http'` for easy filtering
- ✅ **User-friendly messages** included for all presets

### Usage Patterns

#### 1. Direct Usage

Use a preset as-is without modifications:

```typescript
import { ErrorX } from '@bombillazo/error-x'

// Simple usage
throw new ErrorX(ErrorX.HTTP.NOT_FOUND)
// Result: 404 error with default message and UI message
```

#### 2. Override Specific Fields

Customize the error while keeping other preset values:

```typescript
throw new ErrorX({
  ...ErrorX.HTTP.NOT_FOUND,
  message: 'User not found',
  metadata: { userId: 123 }
})
// Result: 404 error with custom message but keeps httpStatus, code, name, uiMessage, type
```

#### 3. Add Metadata and Actions

Enhance presets with additional context and behaviors:

```typescript
throw new ErrorX({
  ...ErrorX.HTTP.UNAUTHORIZED,
  metadata: { attemptedAction: 'viewProfile', userId: 456 },
  actions: [
    { action: 'logout', clearStorage: true },
    { action: 'redirect', redirectURL: '/login' }
  ]
})
```

#### 4. Add Error Cause

Chain errors by adding a cause:

```typescript
try {
  // some operation
} catch (originalError) {
  throw new ErrorX({
    ...ErrorX.HTTP.INTERNAL_SERVER_ERROR,
    cause: originalError,
    metadata: { operation: 'database-query' }
  })
}
```

### Available HTTP Presets

#### 4xx Client Errors

| Preset | Status | Description |
| ------ | ------ | ----------- |
| BAD_REQUEST | 400 | Invalid request data |
| UNAUTHORIZED | 401 | Authentication required |
| PAYMENT_REQUIRED | 402 | Payment required to access resource |
| FORBIDDEN | 403 | Insufficient permissions |
| NOT_FOUND | 404 | Resource not found |
| METHOD_NOT_ALLOWED | 405 | HTTP method not allowed |
| NOT_ACCEPTABLE | 406 | Requested format not supported |
| PROXY_AUTHENTICATION_REQUIRED | 407 | Proxy authentication required |
| REQUEST_TIMEOUT | 408 | Request took too long |
| CONFLICT | 409 | Resource conflict |
| GONE | 410 | Resource no longer available |
| LENGTH_REQUIRED | 411 | Missing length information |
| PRECONDITION_FAILED | 412 | Required condition not met |
| PAYLOAD_TOO_LARGE | 413 | Request payload too large |
| URI_TOO_LONG | 414 | Request URL too long |
| UNSUPPORTED_MEDIA_TYPE | 415 | File type not supported |
| RANGE_NOT_SATISFIABLE | 416 | Requested range cannot be satisfied |
| EXPECTATION_FAILED | 417 | Server cannot meet request requirements |
| IM_A_TEAPOT | 418 | I'm a teapot (RFC 2324) |
| UNPROCESSABLE_ENTITY | 422 | Validation failed |
| LOCKED | 423 | Resource is locked |
| FAILED_DEPENDENCY | 424 | Request failed due to dependency error |
| TOO_EARLY | 425 | Request sent too early |
| UPGRADE_REQUIRED | 426 | Upgrade required to continue |
| PRECONDITION_REQUIRED | 428 | Required conditions missing |
| TOO_MANY_REQUESTS | 429 | Rate limit exceeded |
| REQUEST_HEADER_FIELDS_TOO_LARGE | 431 | Request headers too large |
| UNAVAILABLE_FOR_LEGAL_REASONS | 451 | Content unavailable for legal reasons |

#### 5xx Server Errors

| Preset | Status | Description |
| ------ | ------ | ----------- |
| INTERNAL_SERVER_ERROR | 500 | Unexpected server error |
| NOT_IMPLEMENTED | 501 | Feature not implemented |
| BAD_GATEWAY | 502 | Upstream server error |
| SERVICE_UNAVAILABLE | 503 | Service temporarily down |
| GATEWAY_TIMEOUT | 504 | Upstream timeout |
| HTTP_VERSION_NOT_SUPPORTED | 505 | HTTP version not supported |
| VARIANT_ALSO_NEGOTIATES | 506 | Internal configuration error |
| INSUFFICIENT_STORAGE | 507 | Insufficient storage |
| LOOP_DETECTED | 508 | Infinite loop detected |
| NOT_EXTENDED | 510 | Additional extensions required |
| NETWORK_AUTHENTICATION_REQUIRED | 511 | Network authentication required |

### Real-World Examples

#### API Endpoint

```typescript
import { ErrorX } from '@bombillazo/error-x'

app.get('/users/:id', async (req, res) => {
  const user = await db.users.findById(req.params.id)

  if (!user) {
    throw new ErrorX({
      ...ErrorX.HTTP.NOT_FOUND,
      message: 'User not found',
      metadata: { userId: req.params.id }
    })
  }

  res.json(user)
})
```

#### Authentication Middleware

```typescript
const requireAuth = (req, res, next) => {
  if (!req.user) {
    throw new ErrorX({
      ...ErrorX.HTTP.UNAUTHORIZED,
      actions: [
        { action: 'redirect', redirectURL: '/login' }
      ]
    })
  }
  next()
}
```

#### Rate Limiting

```typescript
if (isRateLimited(req.ip)) {
  throw new ErrorX({
    ...ErrorX.HTTP.TOO_MANY_REQUESTS,
    metadata: {
      ip: req.ip,
      retryAfter: 60
    }
  })
}
```

## Environment Configuration

ErrorX can be configured via the `ERROR_X_CONFIG` environment variable to set default values across your application.

### Configuration Structure

Set the `ERROR_X_CONFIG` environment variable to a JSON string with the following structure:

```json
{
  "source": "my-service-name",
  "docsBaseURL": "https://docs.example.com/errors/",
  "docsMap": {
    "AUTH_FAILED": "authentication#auth-failed",
    "NOT_FOUND": "common#not-found",
    "VALIDATION_ERROR": "validation#errors"
  }
}
```

### Configuration Options

| Option | Type | Description |
| ------ | ---- | ----------- |
| `source` | `string` | Default source value for all ErrorX instances in your application |
| `docsBaseURL` | `string` | Base URL for error documentation |
| `docsMap` | `Record<string, string>` | Maps error codes to documentation paths |

### How It Works

1. **Default Source**: If `source` is configured and not provided when creating an error, the configured value is used
2. **Auto-Generated href**: If both `docsBaseURL` and `docsMap` are configured, and the error's code matches a key in `docsMap`, the `href` is automatically generated as: `docsBaseURL + docsMap[code]`
3. **Manual Override**: Values provided directly to ErrorX constructor take precedence over environment config

### Example Usage

```bash
# Set environment variable
export ERROR_X_CONFIG='{"source":"auth-service","docsBaseURL":"https://docs.example.com/errors/","docsMap":{"AUTH_FAILED":"auth#failed"}}'
```

```typescript
// This error will have:
// - source: 'auth-service' (from config)
// - href: 'https://docs.example.com/errors/auth#failed' (auto-generated)
const error = new ErrorX({
  message: 'Authentication failed',
  code: 'AUTH_FAILED'
})

// Manual values override config
const error2 = new ErrorX({
  message: 'Another auth error',
  code: 'AUTH_FAILED',
  source: 'custom-service', // Overrides config
  href: 'https://custom-docs.com/auth' // Overrides auto-generated href
})
```

### Node.js and Isomorphic Support

The environment configuration works in Node.js environments where `process.env` is available. In browser environments, the configuration is safely ignored (no errors thrown).

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

### Smart Error Conversion

The `ErrorX.toErrorX()` static method intelligently converts any error type to ErrorX:

```typescript
// Convert Error instances
try {
  throw new Error('Something failed')
} catch (error) {
  const errorX = ErrorX.toErrorX(error)
  // Preserves name, message, cause, and stack
}

// Convert API error responses
const apiError = {
  status: 404,
  statusText: 'Not Found',
  error: 'User not found'
}
const errorX = ErrorX.toErrorX(apiError)
// Extracts: message, httpStatus, and stores original in metadata

// Convert any unknown value
const errorX = ErrorX.toErrorX('Something went wrong')
// Creates ErrorX with the string as the message
```

## Usage Examples

### Basic Error Handling

```typescript
import { ErrorX } from 'error-x'

function validateUser(user: unknown) {
  if (!user) {
    throw new ErrorX('User validation failed: user is required', {
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
      throw new ErrorX(`Failed to fetch user: ${response.statusText}`, {
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
  const error = new ErrorX('User creation failed', {
    name: 'UserCreationError',
    code: 'USER_CREATE_FAILED',
    uiMessage: 'Unable to create user account',
    cause: dbError, // Preserves original stack trace and error details
    metadata: {
      operation: 'userRegistration',
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

## FAQ

### Why use action type "custom" instead of an open string type for CustomAction?

The `ErrorAction` type uses a discriminated union based on the `action` property. When you use arbitrary values instead of the predefined action types (`notify`, `logout`, `redirect`, `custom`), it breaks TypeScript's ability to properly narrow the property types.

**The Problem:** If `ErrorAction` allowed any string as the action type, TypeScript would default to the most permissive type (`{ ...any }`) for all actions, causing type definition to leak between different action types.

```typescript
// ❌ Cannot be done - breaks discriminated union
const error = new ErrorX({
  actions: [
    { action: 'analytics', event: 'error' }, // Loses type safety
    { action: 'notify', targets: ['toast'] }, // Type becomes too permissive
    { action: 'redirect', redirectURL: '/home' } // Required properties not enforced
  ]
})

// ✅ Do this - maintains proper type discrimination
const error = new ErrorX({
  actions: [
    { action: 'custom', type: 'analytics', event: 'error' },
    { action: 'notify', targets: ['toast'] }, // Properly typed with required 'targets'
    { action: 'redirect', redirectURL: '/home' } // Properly typed with required 'redirectURL'
  ]
})
```

**The Solution:** Using `action: 'custom'` with a discriminating `type` property preserves the discriminated union while allowing unlimited flexibility for custom actions. This approach:

- Maintains type safety for predefined actions (`notify`, `logout`, `redirect`)
- Provides a structured way to handle custom application logic
- Allows your error handlers to properly switch on action types
- Enables you to create your own discriminated unions within custom actions

Ideally, we would support custom action types directly. If there is a solution to this problem, we are more than happy to review it. Please open an issue or PR!.

## License

MIT
