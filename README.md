# error-x

[![npm downloads](https://img.shields.io/npm/dm/@bombillazo/error-x.svg?style=for-the-badge)](https://www.npmjs.com/package/@bombillazo/error-x)
[![npm](https://img.shields.io/npm/dt/@bombillazo/error-x.svg?style=for-the-badge)](https://www.npmjs.com/package/@bombillazo/error-x)
[![npm](https://img.shields.io/npm/l/@bombillazo/error-x?style=for-the-badge)](https://github.com/bombillazo/error-x/blob/master/LICENSE)

A smart, isomorphic, and satisfying error library for TypeScript applications. Provides type-safe error handling with great DX, solving common pain points like unknown error types, lost stack traces, async error handling, and error serialization.

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
> This library is currently in pre-v1.0 development. While we strive to minimize breaking changes, the API may evolve based on feedback and real-world usage. We recommend pinning to specific versions and reviewing release notes when updating.
>
> Once we reach version 1.0, we plan to minimize API changes and follow semantic versioning.

## Quick Start

```typescript
import { ErrorX, HandlingTargets, type HandlingTarget, type ErrorAction } from 'error-x'

// Minimal usage (all parameters optional)
const error = new ErrorX()

// Simple string message
const error = new ErrorX('Database connection failed')

// String message with additional options
const error = new ErrorX('User authentication failed', {
  name: 'AuthError',
  code: 'AUTH_FAILED',
  uiMessage: 'Please check your credentials and try again',
  metadata: { userId: 123, loginAttempt: 3 }
})

// Options object (backward compatible)
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
    { action: 'notify', payload: { targets: [HandlingTargets.TOAST, HandlingTargets.BANNER] } },
    { action: 'redirect', payload: { redirectURL: '/login', delay: 1000 } },
    { action: 'custom', payload: { type: 'analytics', event: 'auth_failed', userId: 123, category: 'errors', severity: 'high' } }
  ]
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

// Smart conversion signature (converts any unknown input)
new ErrorX(input: unknown)
```

**All parameters are optional** - ErrorX uses sensible defaults and auto-generates missing values.

### Properties

| Property  | Type                         | Default Value                         | Description                                                       |
| --------- | ---------------------------- | ------------------------------------- | ----------------------------------------------------------------- |
| name      | `string`                     | `'Error'`                             | Error type/title                                                  |
| code      | `string`                     | Auto-generated from name or `'ERROR'` | Error identifier (auto-generated from name in UPPER_SNAKE_CASE)   |
| message   | `string`                     | `'An error occurred'`                 | Auto-formatted technical error message                            |
| uiMessage | `string \| undefined`        | `undefined`                           | User-friendly message for display                                 |
| stack     | `string`                     | Auto-generated                        | Stack trace with preservation and cleaning (inherited from Error) |
| cause     | `unknown`                    | `undefined`                           | Original error that caused this (preserves full error chain)      |
| timestamp | `Date`                       | `new Date()`                          | When the error was created (readonly)                             |
| metadata  | `Record<string, any> \| undefined` | `undefined`                        | Additional context and data                                       |
| actions   | `ErrorAction[] \| undefined` | `undefined`                           | Array of actions to perform when error occurs (readonly)          |

### Actions System

The `actions` property allows errors to trigger application logic, passing along the necessary data. Your application error handler can route or execute these actions to achieve the desired behavior.

`actions` accepts an array of `ErrorAction` objects. The library provides predefined action types with type-safe payloads, and a `CustomAction` type for application-specific actions.

#### Action Types

| Action Type | Action Value | Required Payload | Description |
| ----------- | ------------ | ---------------- | ----------- |
| NotifyAction | `'notify'` | `{ targets: HandlingTarget[], ...any }` | Display notification in specified UI targets |
| LogoutAction | `'logout'` | `{ ...any }` (optional) | Log out the current user |
| RedirectAction | `'redirect'` | `{ redirectURL: string, ...any }` | Redirect to a specific URL |
| CustomAction | `'custom'` | `{ ...any }` (optional) | Application-specific actions with flexible payload structure |

```typescript
import { HandlingTargets, type ErrorAction, type CustomAction } from 'error-x'

// Predefined actions with typed payloads
const error1 = new ErrorX({
  message: 'Payment failed',
  actions: [
    { action: 'notify', payload: { targets: [HandlingTargets.MODAL] } },
    { action: 'redirect', payload: { redirectURL: '/payment', delay: 2000 } }
  ]
})

// Logout action
const error2 = new ErrorX({
  message: 'Session expired',
  actions: [
    { action: 'logout', payload: { clearStorage: true } },
    { action: 'notify', payload: { targets: [HandlingTargets.TOAST] } }
  ]
})

// Custom actions for application-specific logic
const error3 = new ErrorX({
  message: 'API rate limit exceeded',
  actions: [
    { 
      action: 'custom', 
      payload: { 
        type: 'show-rate-limit-modal', 
        resetTime: Date.now() + 60000,
        message: 'Too many requests. Please wait.' 
      } 
    },
    { 
      action: 'custom', 
      payload: { 
        type: 'analytics-track', 
        event: 'rate_limit_hit', 
        severity: 'warning',
        category: 'api'
      } 
    },
    { 
      action: 'custom', 
      payload: { 
        type: 'cache-request', 
        retryAfter: 60,
        endpoint: '/api/users'
      } 
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
import { HandlingTargets, type HandlingTarget } from 'error-x'

const error = new ErrorX({
  message: 'Mixed error',
  actions: [
    { 
      action: 'notify', 
      payload: { 
        targets: [
          HandlingTargets.CONSOLE,  // Predefined
          'my-custom-logger',       // Custom
          HandlingTargets.BANNER,   // Predefined
          'analytics-tracker'       // Custom
        ]
      }
    }
  ]
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
    const errorX = new ErrorX(error)
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

The `ErrorAction` type uses a discriminated union based on the `action` property. When you use arbitrary values instead of the predefined action types (`'notify'`, `'logout'`, `'redirect'`, `'custom'`), it breaks TypeScript's ability to properly narrow the payload types.

**The Problem:** If `ErrorAction` allowed any string as the action type, TypeScript would default to the most permissive payload type (`{ ...any }`) for all actions, causing type definition to leak between different action types.

```typescript
// ❌ Cannot be done - breaks discriminated union
const error = new ErrorX({
  actions: [
    { action: 'analytics', payload: { event: 'error' } }, // Loses type safety
    { action: 'notify', payload: { targets: ['toast'] } }, // Payload type becomes too permissive
    { action: 'redirect', payload: { redirectURL: '/home' } } // Required properties not enforced
  ]
})

// ✅ Do this - maintains proper type discrimination
const error = new ErrorX({
  actions: [
    { action: 'custom', payload: { type: 'analytics', event: 'error' } },
    { action: 'notify', payload: { targets: ['toast'] } }, // Properly typed with required 'targets'
    { action: 'redirect', payload: { redirectURL: '/home' } } // Properly typed with required 'redirectURL'
  ]
})
```

**The Solution:** Using `action: 'custom'` with a discriminating `type` property in the payload preserves the discriminated union while allowing unlimited flexibility for custom actions. This approach:

- Maintains type safety for predefined actions (`notify`, `logout`, `redirect`)
- Provides a structured way to handle custom application logic
- Allows your error handlers to properly switch on action types
- Enables you to create your own discriminated unions within custom payloads

Ideally, we would support custom action types directly in the action. If there is a solution to this problem, we are more than happy to review it. Please open an issue or PR!.

## License

MIT
