# error-x

> TypeScript error handling library with type-safe metadata, error chaining, serialization, and preset-based error classes.

## Quick Start

```typescript
import { ErrorX, HTTPErrorX, DBErrorX, ValidationErrorX } from '@bombillazo/error-x';

// Basic usage
throw new ErrorX({ message: 'Operation failed', code: 'OP_FAILED' });

// HTTP errors with status code presets
throw HTTPErrorX.create(404, { message: 'User not found' });

// Database errors with presets
throw DBErrorX.create('CONNECTION_TIMEOUT', { metadata: { host: 'db.example.com' } });

// Validation errors from Zod
throw ValidationErrorX.fromZodError(zodError);

// Error chaining (preserves cause chain)
throw new ErrorX({ message: 'High-level error', cause: originalError });

// Type-safe metadata
const error = new ErrorX<{ userId: number }>({
  message: 'User error',
  metadata: { userId: 123 }
});
console.log(error.metadata?.userId); // TypeScript knows this is number
```

## Core Concepts

### ErrorX Class

The base error class extending native `Error` with enhanced capabilities:

| Property | Type | Description |
|----------|------|-------------|
| `code` | `string` | Error identifier (auto-generated from name as UPPER_SNAKE_CASE if not provided) |
| `metadata` | `TMetadata \| undefined` | Type-safe additional context |
| `timestamp` | `number` | Unix epoch when created |
| `httpStatus` | `number \| undefined` | Associated HTTP status code |
| `original` | `ErrorXSnapshot \| undefined` | Snapshot of wrapped non-ErrorX source (from `ErrorX.from()`) |
| `parent` | `ErrorX \| undefined` | Immediate parent in error chain |
| `root` | `ErrorX \| undefined` | Deepest cause in chain |
| `chain` | `readonly ErrorX[]` | Full chain `[this, parent, grandparent, ...]` |

### Constructor Signatures

```typescript
new ErrorX()                              // Default message "An error occurred"
new ErrorX('Message string')              // String message
new ErrorX({ message, name, code, cause, metadata, httpStatus })  // Full options
new ErrorX<TMetadata>({ metadata: {...} }) // Type-safe metadata
```

### Static Methods

| Method | Description |
|--------|-------------|
| `ErrorX.from(value, overrides?)` | Wraps any value into ErrorX. Stores original in `.original` property. |
| `ErrorX.fromJSON(serialized)` | Reconstructs ErrorX from serialized form |
| `ErrorX.isErrorX(value)` | Type guard: `value is ErrorX` |
| `ErrorX.isErrorXOptions(value)` | Validates if object is valid ErrorXOptions |
| `ErrorX.configure(config)` | Set global config (cleanStack, cleanStackDelimiter) |
| `ErrorX.getConfig()` | Get current global config |
| `ErrorX.resetConfig()` | Reset global config to null |
| `ErrorX.cleanStack(stack?, delimiter?)` | Clean internal frames from stack trace |

### Instance Methods

| Method | Description |
|--------|-------------|
| `.withMetadata(additional)` | Returns new ErrorX with merged metadata |
| `.toJSON()` | Serializes to JSON-compatible object |
| `.toString()` | Detailed string representation |

## Preset Error Classes

### HTTPErrorX

HTTP errors with status code presets (400-511):

```typescript
HTTPErrorX.create(404)                    // NotFoundError with httpStatus: 404
HTTPErrorX.create(401, { message: 'Invalid token' })
HTTPErrorX.create({ message: 'Error' })   // Uses default 500

// Available presets: 400, 401, 402, 403, 404, 405, 406, 407, 408, 409, 410,
// 411, 412, 413, 414, 415, 416, 417, 418, 422, 423, 424, 425, 426, 428, 429,
// 431, 451, 500, 501, 502, 503, 504, 505, 506, 507, 508, 510, 511
```

### DBErrorX

Database errors with string presets:

```typescript
DBErrorX.create('CONNECTION_FAILED')
DBErrorX.create('QUERY_TIMEOUT', { metadata: { query: 'SELECT...' } })
DBErrorX.create({ message: 'Custom DB error' })  // Uses default UNKNOWN

// Available presets: CONNECTION_FAILED, CONNECTION_TIMEOUT, CONNECTION_REFUSED,
// CONNECTION_LOST, QUERY_FAILED, QUERY_TIMEOUT, SYNTAX_ERROR, UNIQUE_VIOLATION,
// FOREIGN_KEY_VIOLATION, NOT_NULL_VIOLATION, CHECK_VIOLATION, TRANSACTION_FAILED,
// DEADLOCK, NOT_FOUND, UNKNOWN
```

### ValidationErrorX

Validation errors with Zod integration:

```typescript
// From Zod error
ValidationErrorX.fromZodError(zodError)
ValidationErrorX.fromZodError(zodError, { httpStatus: 422 })

// For specific field
ValidationErrorX.forField('email', 'Invalid format')
ValidationErrorX.forField('age', 'Must be 18+', { code: 'TOO_YOUNG' })

// Direct creation
ValidationErrorX.create({ message: 'Validation failed', metadata: { field: 'email' } })
```

## Error Chaining

```typescript
// Chain via cause option
const dbError = new ErrorX({ message: 'DB query failed' });
const serviceError = new ErrorX({ message: 'User fetch failed', cause: dbError });
const apiError = new ErrorX({ message: 'API request failed', cause: serviceError });

// Navigate chain
apiError.parent;        // serviceError
apiError.root;          // dbError
apiError.chain;         // [apiError, serviceError, dbError]
apiError.chain.length;  // 3

// Auto-wrapping: non-ErrorX causes are automatically wrapped
new ErrorX({ cause: new Error('native') });  // Works, wraps into ErrorX
```

## Serialization

```typescript
// Serialize
const json = error.toJSON();
// Returns ErrorXSerialized: { name, message, code, metadata, timestamp, stack?, httpStatus?, original?, chain? }

// Deserialize
const restored = ErrorX.fromJSON(json);

// Works with JSON.stringify
JSON.stringify(error);  // Uses toJSON() automatically
```

## ErrorXResolver

Resolves errors to user-friendly presentations with i18n support:

```typescript
import { ErrorXResolver } from 'error-x';

const resolver = new ErrorXResolver({
  i18n: {
    resolver: (key, params) => i18next.t(key, params),
    keyTemplate: '{namespace}.{code}',  // Default
  },
  docs: { baseUrl: 'https://docs.example.com' },
  onResolveType: (error) => {
    if (error instanceof HTTPErrorX) return 'http';
    if (error instanceof DBErrorX) return 'database';
    return 'general';
  },
  defaults: { namespace: 'errors', uiMessage: 'An error occurred' },
  configs: {
    http: { namespace: 'errors.http', docsPath: '/http' },
    database: { namespace: 'errors.db', docsPath: '/db' },
    general: { namespace: 'errors' },
  },
});

const result = resolver.resolve(error, 'en');
// { uiMessage, docsUrl, i18nKey, errorType, config }
```

## Creating Custom Error Classes

```typescript
type PaymentMetadata = { transactionId?: string; amount?: number };

class PaymentErrorX extends ErrorX<PaymentMetadata> {
  static presets = {
    DECLINED: { message: 'Payment declined', code: 'DECLINED', httpStatus: 402 },
    EXPIRED: { message: 'Card expired', code: 'EXPIRED', httpStatus: 400 },
    INSUFFICIENT: { message: 'Insufficient funds', code: 'INSUFFICIENT', httpStatus: 402 },
  };
  static defaultPreset = 'DECLINED';
  static defaults = { name: 'PaymentError', httpStatus: 400 };
  static transform: ErrorXTransform<PaymentMetadata> = (opts) => ({
    ...opts,
    code: `PAYMENT_${opts.code}`,
  });

  static override create(
    preset?: keyof typeof PaymentErrorX.presets,
    overrides?: Partial<ErrorXOptions<PaymentMetadata>>
  ): PaymentErrorX {
    return ErrorX.create.call(PaymentErrorX, preset, overrides) as PaymentErrorX;
  }
}

PaymentErrorX.create('DECLINED', { metadata: { transactionId: 'tx_123' } });
```

## Type Exports

```typescript
// Core types
import type {
  ErrorXOptions,      // Constructor options
  ErrorXMetadata,     // Record<string, unknown>
  ErrorXSerialized,   // Serialized form
  ErrorXSnapshot,     // Original error snapshot
  ErrorXConfig,       // Global configuration
  ErrorXOptionField,  // Valid option field names
} from 'error-x';

// Transform types
import type {
  ErrorXTransform,        // Transform function signature
  ErrorXTransformContext, // Context passed to transform
} from 'error-x';

// Resolver types
import type {
  ErrorXResolverOptions,    // Full resolver options
  ErrorXResolverConfig,     // Type helper for custom config
  ErrorXBaseConfig,         // Base resolver config
  ErrorXResolverTypeConfig, // Per-type config
  ErrorXResolverI18nConfig, // i18n configuration
  ErrorXResolverDocsConfig, // Docs configuration
  ResolveContext,           // Context passed to onResolve
} from 'error-x';

// Preset types
import type {
  HTTPErrorXMetadata,       // { endpoint?, method?, [key]: unknown }
  HTTPStatusCode,           // Union of status code numbers
  DBErrorXMetadata,         // { query?, table?, database?, operation?, ... }
  DBErrorPreset,            // Union of DB preset strings
  ValidationErrorXMetadata, // { field?, path?, zodCode?, expected?, ... }
  ZodIssue,                 // Zod issue structure
} from 'error-x';
```

## UI Message Objects

Pre-defined user-friendly messages for presets:

```typescript
import { httpErrorUiMessages, dbErrorUiMessages, validationErrorUiMessage } from 'error-x';

httpErrorUiMessages[404];  // "The requested resource could not be found."
dbErrorUiMessages['UNIQUE_VIOLATION'];  // "This record already exists."
validationErrorUiMessage;  // "The provided input is invalid. Please check your data."
```

## Global Configuration

```typescript
ErrorX.configure({
  cleanStack: true,                    // Enable stack cleaning (default)
  cleanStack: false,                   // Disable stack cleaning
  cleanStack: ['pattern1', 'pattern2'], // Custom patterns to remove
  cleanStackDelimiter: 'app-entry',    // Trim stack after this line
});

ErrorX.getConfig();   // Get current config
ErrorX.resetConfig(); // Reset to null
```

## Common Patterns

### Catch and Wrap

```typescript
try {
  await riskyOperation();
} catch (err) {
  throw new ErrorX({ message: 'Operation failed', cause: err });
}
```

### Type Narrowing

```typescript
try {
  await fetchData();
} catch (err) {
  if (ErrorX.isErrorX(err)) {
    console.log(err.code, err.metadata);
  }
  if (err instanceof HTTPErrorX) {
    console.log(err.httpStatus);
  }
  if (err instanceof ValidationErrorX) {
    console.log(err.metadata?.field, err.metadata?.issues);
  }
}
```

### Enriching Errors

```typescript
const error = new ErrorX({ message: 'API failed', metadata: { endpoint: '/api' } });
const enriched = error.withMetadata({ userId: 123, retryCount: 3 });
// metadata: { endpoint: '/api', userId: 123, retryCount: 3 }
```

### Error Conversion

```typescript
// ErrorX.from() extracts properties from various error formats:
// - Standard Error: extracts name, message, stack, cause
// - API objects: extracts message/details/text/info/error/errorMessage,
//                name/title, code, status/statusCode/httpStatus, metadata
// - Strings: uses as message
// - Unknown: converts to string message

const apiResponse = { error: 'Not found', code: 404, status: 404 };
const error = ErrorX.from(apiResponse);
// message: 'Not found', code: '404', httpStatus: 404
```
