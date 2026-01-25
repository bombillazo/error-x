# error-x

[![npm downloads](https://img.shields.io/npm/dm/@bombillazo/error-x.svg?style=for-the-badge)](https://www.npmjs.com/package/@bombillazo/error-x)
[![npm](https://img.shields.io/npm/dt/@bombillazo/error-x.svg?style=for-the-badge)](https://www.npmjs.com/package/@bombillazo/error-x)
[![npm](https://img.shields.io/npm/l/@bombillazo/error-x?style=for-the-badge)](https://github.com/bombillazo/error-x/blob/master/LICENSE)
[![codecov](https://img.shields.io/codecov/c/github/bombillazo/error-x?style=for-the-badge)](https://codecov.io/gh/bombillazo/error-x)

🚨❌

A smart, isomorphic, and type-safe error library for TypeScript applications. Provides excellent DX with intelligent error conversion, stack trace preservation, serialization support, error chaining, flexible custom error classes, and more.

## Features

- **Built in TypeScript** for full Type-safe error handling support and generics
- **Isomorphic** - works in Node.js and browsers
- **Smart error conversion** from different sources (API responses, strings, Error objects)
- **Error chaining** for full error sequence
- **Error aggregation** for batch operations with multiple failures
- **Factory method** `.create()` for preset-based error creation
- **Custom metadata** with type-safe generics for additional context
- **Global configuration** for stack cleaning and defaults
- **Serialization/deserialization** for network transfer and storage
- **ErrorXResolver** for i18n, documentation URLs, and custom presentation logic
- **Observability** - fingerprinting, structured logging, OpenTelemetry integration
- **Custom ErrorX class** examples:
  - `HTTPErrorX` - HTTP status code presets (400-511)
  - `DBErrorX` - Database error presets (connection, query, constraints)
  - `ValidationErrorX` - Validation errors with Zod integration

## Installation

```bash
pnpm add @bombillazo/error-x
# or
npm install @bombillazo/error-x
# or
yarn add @bombillazo/error-x
```

### Requirements

- **Node.js**: 18 or higher
- **TypeScript**: 5.0 or higher
- **Target Environment**: ES2022+

This library uses modern JavaScript features and ES2022 APIs. For browser compatibility, ensure your build tool (e.g., Vite, webpack, esbuild) is configured to target ES2022 or transpile accordingly.

> [!NOTE]
>
> This library follows [Semantic Versioning](https://semver.org/). The API is now stable - breaking changes will only occur in major version updates.

## Quick Start

```typescript
import { ErrorX, HTTPErrorX, DBErrorX } from "@bombillazo/error-x";

// Simple usage
throw new ErrorX("Something went wrong");

// A fully defined error
throw new ErrorX({
  message: "User authentication failed",
  name: "AuthError",
  code: "AUTH_FAILED",
  httpStatus: 401,
  metadata: { userId: 123 },
});

// Using specialized error classes
throw HTTPErrorX.create(404);
throw DBErrorX.create("CONNECTION_FAILED");

// Convert unknown errors
const errorX = ErrorX.from(unknownError);
```

## Documentation

[Full Documentation](docs/index.md)

---

## API Reference

### ErrorX Class

The base error class that extends the native `Error` with enhanced capabilities.

#### Properties

| Property     | Type                          | Description                                                    |
| ------------ | ----------------------------- | -------------------------------------------------------------- |
| `message`    | `string`                      | Technical error message                                        |
| `name`       | `string`                      | Error type/name                                                |
| `code`       | `string`                      | Error identifier code (auto-generated from name if not set)    |
| `httpStatus` | `number \| undefined`         | HTTP status code associated with this error                    |
| `metadata`   | `TMetadata \| undefined`      | Additional context (type-safe with generics)                   |
| `timestamp`  | `number`                      | Unix epoch timestamp (ms) when error was created               |
| `stack`      | `string \| undefined`         | Stack trace (inherited from Error)                             |
| `chain`      | `readonly ErrorX[]`           | Full error sequence: `[this, parent, grandparent, ..., root]`  |
| `root`       | `ErrorX \| undefined`         | Error that started the whole error chain                       |
| `parent`     | `ErrorX \| undefined`         | Error that immediately precedes this error in the chain        |
| `original`   | `ErrorXSnapshot \| undefined` | Stores the original non-ErrorX error used to create this error |

#### Static Methods

| Method                | Description                                                         |
| --------------------- | ------------------------------------------------------------------- |
| `from(value, opts?)`  | Convert any value to ErrorX with intelligent property extraction    |
| `fromJSON(json)`      | Deserialize JSON back to ErrorX instance                            |
| `create(key?, opts?)` | Factory method for preset-based error creation (used by subclasses) |
| `aggregate(errors, opts?)` | Combine multiple errors into an AggregateErrorX instance       |
| `isErrorX(value)`     | Type guard to check if value is an ErrorX instance                  |
| `isErrorXOptions(v)`  | Check if value is a valid ErrorXOptions object                      |
| `configure(config)`   | Set global configuration (stack cleaning, defaults)                 |
| `getConfig()`         | Get current global configuration                                    |
| `resetConfig()`       | Reset global configuration to defaults                              |
| `cleanStack(stack)`   | Clean internal frames from stack trace                              |

#### Instance Methods

| Method               | Description                                       |
| -------------------- | ------------------------------------------------- |
| `withMetadata(meta)` | Create new ErrorX with additional metadata merged |
| `toJSON()`           | Serialize to JSON-compatible object               |
| `toString()`         | Detailed string representation with metadata      |

---

## Constructor

```typescript
new ErrorX(input?: string | ErrorXOptions)
```

Create a new ErrorX instance. All parameters are optional with sensible defaults.

```typescript
// String message
new ErrorX("Database connection failed");

// Options object
new ErrorX({
  message: "User not found",
  name: "NotFoundError",
  code: "USER_NOT_FOUND",
  httpStatus: 404,
  metadata: { userId: 123 },
});

// With type-safe metadata
type UserMeta = { userId: number; action: string };
new ErrorX<UserMeta>({
  message: "Action failed",
  metadata: { userId: 123, action: "delete" },
});
```

### ErrorXOptions

| Property   | Type               | Default               | Description                               |
| ---------- | ------------------ | --------------------- | ----------------------------------------- |
| message    | `string`           | `'An error occurred'` | Technical error message                   |
| name       | `string`           | `'Error'`             | Error type/name                           |
| code       | `string \| number` | Auto-generated        | Error identifier (UPPER_SNAKE_CASE)       |
| httpStatus | `number`           | `undefined`           | HTTP status code                          |
| metadata   | `TMetadata`        | `undefined`           | Additional context                        |
| cause      | `unknown`          | `undefined`           | Error that caused this (builds the chain) |

## Global Configuration

Configure stack trace cleaning and other global settings.

```typescript
import { ErrorX } from "@bombillazo/error-x";

// Enable stack cleaning with custom delimiter
ErrorX.configure({
  cleanStack: true,
  cleanStackDelimiter: "my-app-entry",
});

// Custom patterns to remove from stack traces
ErrorX.configure({
  cleanStack: ["node_modules", "internal/"],
});

// Disable stack cleaning
ErrorX.configure({ cleanStack: false });

// Get current config
const config = ErrorX.getConfig();

// Reset to defaults
ErrorX.resetConfig();
```

### Auto Code Generation

Error codes are automatically generated from names in UPPER_SNAKE_CASE when not provided:

```typescript
new ErrorX({ name: "DatabaseError" });
// → code: 'DATABASE_ERROR'

new ErrorX({ name: "userAuthError" });
// → code: 'USER_AUTH_ERROR'

new ErrorX({ name: "API Timeout" });
// → code: 'API_TIMEOUT'
```

### Message Formatting

ErrorX does NOT auto-format messages. Messages are passed through as-is:

```typescript
new ErrorX({ message: "test error" });
// → message: 'test error'

new ErrorX({ message: "Test error." });
// → message: 'Test error.'
```

Empty or whitespace-only messages default to `'An error occurred'`:

```typescript
new ErrorX({ message: "" });
// → message: 'An error occurred'
```

Preset messages in specialized classes (HTTPErrorX, DBErrorX) are properly formatted with sentence casing and periods.

---

## Common Methods

### ErrorX.from()

Convert any value into an ErrorX instance with intelligent property extraction.

```typescript
static from<T>(payload: unknown, overrides?: Partial<ErrorXOptions<T>>): ErrorX<T>
```

Handles strings, Error objects, API responses, and unknown values. Extracts common properties like `message`, `code`, `status`, `statusCode`, and `metadata`.

```typescript
// Convert string
ErrorX.from("Something went wrong");

// Convert Error
ErrorX.from(new Error("Connection failed"));

// Convert API response
ErrorX.from({
  message: "User not found",
  code: "USER_404",
  status: 404,
  metadata: { userId: 123 },
});

// With overrides (deep merged)
ErrorX.from(error, {
  httpStatus: 500,
  metadata: { context: "db-layer" },
});
```

### ErrorX.isErrorX()

Type guard to check if a value is an ErrorX instance.

```typescript
static isErrorX<T>(value: unknown): value is ErrorX<T>
```

```typescript
try {
  await riskyOperation();
} catch (error) {
  if (ErrorX.isErrorX(error)) {
    console.log(error.code, error.metadata);
  }
}
```

### withMetadata()

Create a new ErrorX with additional metadata merged with existing metadata.

```typescript
withMetadata<T>(additionalMetadata: T): ErrorX<TMetadata & T>
```

```typescript
const error = new ErrorX({
  message: "Request failed",
  metadata: { endpoint: "/api/users" },
});

const enriched = error.withMetadata({ retryCount: 3, userId: 123 });
// metadata: { endpoint: '/api/users', retryCount: 3, userId: 123 }
```

### Serialization

Serialize ErrorX instances for network transfer or storage.

```typescript
// Serialize
const json = error.toJSON();
// { name, message, code, stack, metadata, timestamp, httpStatus, original, chain }

// Deserialize
const restored = ErrorX.fromJSON(json);
```

### Error Chaining

Build error timelines by passing `cause` to preserve the full error history.

```typescript
// Build an error chain
const dbError = ErrorX.from(new Error("ECONNREFUSED"));
const repoError = new ErrorX({ message: "Query failed", cause: dbError });
const serviceError = new ErrorX({
  message: "User fetch failed",
  cause: repoError,
});

// Access chain information
serviceError.chain.length; // 3: [serviceError, repoError, dbError]
serviceError.parent; // repoError
serviceError.root; // dbError
dbError.original; // { message: 'ECONNREFUSED', name: 'Error', stack: '...' }
```

```typescript
// Practical example
try {
  await database.query(sql);
} catch (dbError) {
  throw DBErrorX.create("QUERY_FAILED", {
    cause: dbError,
    metadata: { query: sql, table: "users" },
  });
}

// Later, inspect the chain
if (ErrorX.isErrorX(error)) {
  console.log(
    "Error chain:",
    error.chain.map((e) => e.name),
  );
  console.log("Root cause:", error.root?.original);
}
```

### Error Aggregation

Combine multiple errors into a single `AggregateErrorX` instance. Useful for batch operations, parallel processing, or validation scenarios where multiple failures can occur.

```typescript
import { ErrorX, AggregateErrorX } from "@bombillazo/error-x";

// Aggregate multiple validation errors
const validationErrors = [
  new ErrorX({ message: "Email is required", code: "EMAIL_REQUIRED" }),
  new ErrorX({ message: "Password too short", code: "PASSWORD_SHORT" }),
  new ErrorX({ message: "Invalid phone format", code: "PHONE_INVALID" }),
];

const aggregate = ErrorX.aggregate(validationErrors);
// → message: 'Multiple errors occurred (3 errors)'
// → code: 'AGGREGATE_ERROR'
// → errors: [ErrorX, ErrorX, ErrorX]

// With custom options
const batchError = ErrorX.aggregate(errors, {
  message: "Batch import failed",
  code: "BATCH_IMPORT_FAILED",
  httpStatus: 400,
  metadata: { batchId: "batch_123", failedCount: 3 },
});

// Access individual errors
for (const error of aggregate.errors) {
  console.log(error.code, error.message);
  // Each error preserves its chain: error.chain, error.root, error.parent
}

// Type guard
if (AggregateErrorX.isAggregateErrorX(error)) {
  console.log(`Found ${error.errors.length} errors`);
  error.errors.forEach((e) => console.log(e.code));
}

// Serialization (preserves all aggregated errors)
const serialized = aggregate.toJSON();
const restored = AggregateErrorX.fromJSON(serialized);
```

#### AggregateErrorX Properties

| Property | Type | Description |
| -------- | ---- | ----------- |
| `errors` | `readonly ErrorX[]` | Array of all aggregated errors |
| _...inherited_ | | All ErrorX properties (message, code, metadata, etc.) |

#### Static Methods

| Method | Description |
| ------ | ----------- |
| `ErrorX.aggregate(errors, opts?)` | Create an AggregateErrorX from an array of errors |
| `AggregateErrorX.isAggregateErrorX(value)` | Type guard to check if value is an AggregateErrorX |
| `AggregateErrorX.fromJSON(serialized)` | Deserialize back to AggregateErrorX instance |

---

## Custom Error Classes

error-x includes several custom error classes out of the box:

- **Ready-to-use** - Practical error classes for common scenarios (HTTP, database, validation)
- **Educational** - Demonstrate how to use presets, defaults, and transforms
- **Extensible** - Serve as templates and inspiration for your own domain-specific error classes

### HTTPErrorX

HTTP errors with presets for all standard status codes (400-511).

```typescript
import { HTTPErrorX } from "@bombillazo/error-x";

// Create by status code
HTTPErrorX.create(404);
// → code: 'NOT_FOUND', name: 'NotFoundError', httpStatus: 404

HTTPErrorX.create(401);
// → code: 'UNAUTHORIZED', name: 'UnauthorizedError', httpStatus: 401

// With overrides
HTTPErrorX.create(404, {
  message: "User not found",
  metadata: { userId: 123 },
});

// With error chaining
HTTPErrorX.create(500, { cause: originalError });

// instanceof checks
if (error instanceof HTTPErrorX) {
  console.log(error.httpStatus);
}
```

**Available Presets:** All 4xx client errors (400-451) and 5xx server errors (500-511).

### DBErrorX

Database errors with presets for common database scenarios. All codes are automatically prefixed with `DB_`.

```typescript
import { DBErrorX } from "@bombillazo/error-x";

// Connection errors
DBErrorX.create("CONNECTION_FAILED"); // → code: 'DB_CONNECTION_FAILED'
DBErrorX.create("CONNECTION_TIMEOUT");
DBErrorX.create("CONNECTION_REFUSED");
DBErrorX.create("CONNECTION_LOST");

// Query errors
DBErrorX.create("QUERY_FAILED");
DBErrorX.create("QUERY_TIMEOUT");
DBErrorX.create("SYNTAX_ERROR");

// Constraint errors (with appropriate httpStatus)
DBErrorX.create("UNIQUE_VIOLATION"); // httpStatus: 409
DBErrorX.create("FOREIGN_KEY_VIOLATION"); // httpStatus: 400
DBErrorX.create("NOT_NULL_VIOLATION"); // httpStatus: 400
DBErrorX.create("CHECK_VIOLATION"); // httpStatus: 400

// Transaction errors
DBErrorX.create("TRANSACTION_FAILED");
DBErrorX.create("DEADLOCK"); // httpStatus: 409

// Record errors
DBErrorX.create("NOT_FOUND"); // httpStatus: 404

// With metadata
DBErrorX.create("QUERY_FAILED", {
  message: "Failed to fetch user",
  metadata: {
    query: "SELECT * FROM users WHERE id = ?",
    table: "users",
    operation: "SELECT",
  },
});

// instanceof checks
if (error instanceof DBErrorX) {
  console.log(error.metadata?.table);
}
```

### ValidationErrorX

Validation errors with Zod integration. All codes are prefixed with `VALIDATION_`.

```typescript
import { z } from "zod";
import { ValidationErrorX } from "@bombillazo/error-x";

// From Zod errors
const schema = z.object({
  email: z.string().email(),
  age: z.number().min(18),
});

try {
  schema.parse({ email: "invalid", age: 15 });
} catch (err) {
  if (err instanceof z.ZodError) {
    throw ValidationErrorX.fromZodError(err);
    // → code: 'VALIDATION_INVALID_STRING'
    // → metadata.field: 'email'
    // → metadata.zodCode: 'invalid_string'
    // → httpStatus: 400
  }
}

// With overrides
ValidationErrorX.fromZodError(zodError, {
  httpStatus: 422,
});

// Field-specific errors (without Zod)
ValidationErrorX.forField("email", "Invalid email format");
ValidationErrorX.forField("age", "Must be 18 or older", { code: "TOO_YOUNG" });

// Direct creation
ValidationErrorX.create({
  message: "Invalid input",
  code: "INVALID_INPUT",
  metadata: { field: "email" },
});

// instanceof checks
if (error instanceof ValidationErrorX) {
  console.log(error.metadata?.field);
}
```

### Creating Custom Error Classes

Extend `ErrorX` to create domain-specific error classes with presets, defaults, and transforms.

```typescript
import {
  ErrorX,
  type ErrorXOptions,
  type ErrorXTransform,
} from "@bombillazo/error-x";

// 1. Define your metadata type
type PaymentMetadata = {
  transactionId?: string;
  amount?: number;
  currency?: string;
};

// 2. Define presets outside the class for type inference
const paymentPresets = {
  INSUFFICIENT_FUNDS: {
    code: "INSUFFICIENT_FUNDS",
    name: "PaymentError",
    message: "Insufficient funds.",
    httpStatus: 402,
  },
  CARD_DECLINED: {
    code: "CARD_DECLINED",
    name: "PaymentError",
    message: "Card declined.",
    httpStatus: 402,
  },
  EXPIRED_CARD: {
    code: "EXPIRED_CARD",
    name: "PaymentError",
    message: "Card expired.",
    httpStatus: 402,
  },
} as const satisfies Record<string, ErrorXOptions>;

// Optional: Define user-friendly messages separately
export const paymentErrorUiMessages: Record<keyof typeof paymentPresets, string> = {
  INSUFFICIENT_FUNDS: "Your payment method has insufficient funds.",
  CARD_DECLINED: "Your card was declined. Please try another payment method.",
  EXPIRED_CARD: "Your card has expired. Please update your payment method.",
};

// 3. Derive preset key type
type PaymentPresetKey = keyof typeof paymentPresets | (string & {});

// 4. Create the class
export class PaymentErrorX extends ErrorX<PaymentMetadata> {
  static presets = paymentPresets;
  static defaultPreset = "CARD_DECLINED";
  static defaults = { httpStatus: 402 };

  // Optional: transform to prefix codes
  static transform: ErrorXTransform<PaymentMetadata> = (opts) => ({
    ...opts,
    code: `PAYMENT_${opts.code}`,
  });

  // Override create for proper typing
  static override create(
    presetKey?: PaymentPresetKey,
    overrides?: Partial<ErrorXOptions<PaymentMetadata>>,
  ): PaymentErrorX {
    return ErrorX.create.call(
      PaymentErrorX,
      presetKey,
      overrides,
    ) as PaymentErrorX;
  }
}

// Usage
throw PaymentErrorX.create("INSUFFICIENT_FUNDS");
throw PaymentErrorX.create("CARD_DECLINED", {
  metadata: { transactionId: "tx_123", amount: 99.99, currency: "USD" },
});

// instanceof works
if (error instanceof PaymentErrorX) {
  console.log(error.metadata?.transactionId);
}
```

---

## ErrorXResolver

The `ErrorXResolver` class resolves `ErrorX` instances to enhanced presentation objects with i18n support, documentation URLs, and custom properties.

### Basic Usage

```typescript
import { ErrorXResolver, HTTPErrorX } from "@bombillazo/error-x";

const resolver = new ErrorXResolver({
  // Required: determine error type from error instance
  onResolveType: (error) => {
    if (error instanceof HTTPErrorX) return "http";
    return "general";
  },
  // Per-type configuration
  configs: {
    http: { namespace: "errors.http" },
    general: { namespace: "errors" },
  },
});

const error = HTTPErrorX.create(404);
const result = resolver.resolve(error);
// → { uiMessage: undefined, docsUrl: '', i18nKey: 'errors.http.NOT_FOUND', errorType: 'http', config: {...} }
```

### With i18n Integration

```typescript
import i18next from "i18next";

const resolver = new ErrorXResolver({
  i18n: {
    resolver: (key, params) => i18next.t(key, params),
    keyTemplate: "{namespace}.{code}", // default
  },
  docs: {
    baseUrl: "https://docs.example.com/errors",
  },
  onResolveType: (error) => (error.code.startsWith("HTTP_") ? "http" : "general"),
  configs: {
    http: { namespace: "errors.http", docsPath: "/http" },
    general: { namespace: "errors.general" },
  },
});

const result = resolver.resolve(error);
// → { uiMessage: 'Not found', docsUrl: 'https://docs.example.com/errors/http#NOT_FOUND', ... }
```

### Custom Config Properties

Extend the resolver with custom properties for your domain:

```typescript
import { ErrorXResolver, type ErrorXResolverConfig } from "@bombillazo/error-x";

// Define custom config with additional properties
type MyConfig = ErrorXResolverConfig<{
  severity: "error" | "warning" | "info";
  retryable: boolean;
}>;

const resolver = new ErrorXResolver<MyConfig>({
  onResolveType: (error) => "api",
  defaults: {
    namespace: "errors",
    severity: "error",
    retryable: false,
  },
  configs: {
    api: {
      namespace: "errors.api",
      severity: "warning",
      retryable: true,
      // Per-code overrides
      presets: {
        NOT_FOUND: { severity: "info", retryable: false },
      },
    },
  },
});
```

### Custom Result Type

Transform the resolve output to match your API:

```typescript
type MyResult = { message: string; docs: string; canRetry: boolean };

const resolver = new ErrorXResolver<MyConfig, MyResult>({
  onResolveType: (error) => "api",
  onResolve: (error, context) => ({
    message: context.uiMessage ?? error.message,
    docs: context.docsUrl,
    canRetry: context.config.retryable,
  }),
  configs: { api: { namespace: "errors.api", retryable: true } },
});
```

---

## Performance

ErrorX is designed to be fast enough for production use while providing rich error handling capabilities. Here are the key performance characteristics:

### Benchmarks

Run benchmarks locally with `pnpm bench`. Results from a typical run (Apple M2):

| Operation | ops/sec | Notes |
|-----------|---------|-------|
| `new Error()` (native) | ~525k | Baseline comparison |
| `new ErrorX()` | ~38k | ~14x slower than native Error |
| `new ErrorX(options)` | ~40k | Similar to basic ErrorX |
| `ErrorX.from(ErrorX)` | ~21M | Passthrough is extremely fast |
| `ErrorX.from(Error)` | ~32k | Converts native errors |
| `toJSON()` (simple) | ~5.4M | Very fast serialization |
| `toJSON()` (with chain) | ~1.4M | Chain adds overhead |
| `fromJSON()` (simple) | ~32k | Deserialization |
| `isErrorX()` | ~21M | Near-instant type guard |
| `aggregate()` (3 errors) | ~30k | Aggregation overhead |

### Performance Characteristics

**Error Creation (~38k ops/sec)**
- Creating an ErrorX is ~14x slower than native `Error` due to stack cleaning, timestamp generation, and chain management
- Adding metadata or httpStatus has negligible impact
- Adding a cause (chaining) reduces performance by ~2x due to chain flattening

**Serialization (toJSON)**
- Simple errors: ~5.4M ops/sec (extremely fast)
- With metadata: ~346k ops/sec (JSON serialization overhead)
- With error chain: ~1.4M ops/sec (iterates chain)

**Deserialization (fromJSON)**
- ~32k ops/sec regardless of metadata
- Chain reconstruction adds ~3x overhead per chained error

**Type Guards**
- `isErrorX()` and `isAggregateErrorX()`: ~21M ops/sec (instant)
- `isErrorXOptions()`: ~15M ops/sec (object key checking)

**Memory Considerations**
- Deep chains (50+ levels) process at ~343 ops/sec for full create/serialize/deserialize cycle
- Large aggregates (100 errors) process at ~135 ops/sec
- No memory leaks detected in chain or aggregate handling

### When to Use ErrorX

ErrorX is suitable for:
- Application-level error handling (not hot loops)
- API error responses
- Error logging and monitoring
- Domain error modeling

For performance-critical code paths (>100k errors/sec), consider using native `Error` and converting to `ErrorX` at boundaries.

---

## UI Messages

User-friendly messages are provided separately from error presets. This allows errors to remain technical while UI messages can be managed independently (e.g., for i18n).

### Available Exports

```typescript
import {
  httpErrorUiMessages,
  dbErrorUiMessages,
  validationErrorUiMessage,
} from "@bombillazo/error-x";

// HTTP error messages keyed by status code
httpErrorUiMessages[404]; // "The requested resource could not be found."
httpErrorUiMessages[500]; // "An unexpected error occurred. Please try again later."

// Database error messages keyed by preset name
dbErrorUiMessages.CONNECTION_FAILED; // "Unable to connect to the database. Please try again later."
dbErrorUiMessages.UNIQUE_VIOLATION; // "This record already exists."

// Validation error default message
validationErrorUiMessage; // "The provided input is invalid. Please check your data."
```

### Usage with ErrorXResolver

```typescript
import { ErrorXResolver, HTTPErrorX, httpErrorUiMessages } from "@bombillazo/error-x";

const resolver = new ErrorXResolver({
  onResolveType: () => "http",
  configs: {
    http: {
      namespace: "errors.http",
      presets: {
        // Use provided UI messages as static fallbacks
        NOT_FOUND: { uiMessage: httpErrorUiMessages[404] },
        UNAUTHORIZED: { uiMessage: httpErrorUiMessages[401] },
      },
    },
  },
});
```

## Observability

error-x provides built-in observability utilities for error fingerprinting, structured logging, and OpenTelemetry integration.

### Error Fingerprinting

Generate stable fingerprints for error deduplication and grouping:

```typescript
import { generateFingerprint } from "@bombillazo/error-x";

const error = new ErrorX({
  message: "Database connection failed",
  code: "DB_CONN_FAILED",
  name: "DatabaseError",
});

const fingerprint = generateFingerprint(error);
// → "a1b2c3d4" (stable hash based on error properties)

// Same error type always produces the same fingerprint
const error2 = new ErrorX({
  message: "Database connection failed",
  code: "DB_CONN_FAILED",
  name: "DatabaseError",
});
generateFingerprint(error2) === fingerprint; // true

// Customize what's included in the fingerprint
generateFingerprint(error, {
  includeCode: true, // default: true
  includeName: true, // default: true
  includeMessage: true, // default: true
  includeMetadataKeys: ["userId", "endpoint"], // specific metadata keys
  hashFunction: customHashFn, // custom hash function
});
```

### Structured Logging

Create structured log entries compatible with pino, winston, and other logging libraries:

```typescript
import { toLogEntry } from "@bombillazo/error-x";

const error = new ErrorX({
  message: "User not found",
  code: "USER_NOT_FOUND",
  httpStatus: 404,
  metadata: { userId: 123 },
});

const logEntry = toLogEntry(error);
// {
//   level: 'error',
//   message: 'User not found',
//   fingerprint: 'abc123',
//   errorName: 'Error',
//   errorCode: 'USER_NOT_FOUND',
//   timestamp: 1704067200000,
//   timestampIso: '2024-01-01T00:00:00.000Z',
//   httpStatus: 404,
//   metadata: { userId: 123 },
//   chainDepth: 1,
// }

// With options
const debugEntry = toLogEntry(error, {
  level: "warn", // 'error' | 'warn' | 'info'
  includeStack: true, // include stack trace
  includeFull: true, // include full serialized error
  context: { requestId: "req-123" }, // merge additional context
});

// Use with pino
import pino from "pino";
const logger = pino();
logger.error(toLogEntry(error, { includeStack: true }));
```

### OpenTelemetry Integration

Create span attributes following OpenTelemetry semantic conventions:

```typescript
import { toOtelAttributes, recordError } from "@bombillazo/error-x";
import { trace, SpanStatusCode } from "@opentelemetry/api";

const tracer = trace.getTracer("my-service");
const span = tracer.startSpan("operation");

try {
  await riskyOperation();
} catch (err) {
  const error = ErrorX.from(err);

  // Get OTel-compatible attributes
  const attributes = toOtelAttributes(error);
  // {
  //   'exception.type': 'DatabaseError',
  //   'exception.message': 'Connection failed',
  //   'exception.stacktrace': '...',
  //   'error.code': 'DB_CONN_FAILED',
  //   'error.fingerprint': 'abc123',
  //   'error.chain_depth': 1,
  //   'error.is_aggregate': false,
  //   'error.timestamp': 1704067200000,
  //   'http.status_code': 500,
  // }

  span.setAttributes(attributes);
  span.recordException(error);
  span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
}

// Or use the helper function
const { attributes, applyToSpan } = recordError(error);
applyToSpan(span, { setStatus: true, recordException: true });

// Include metadata as span attributes
const attrs = toOtelAttributes(error, {
  includeStack: true, // default: true
  includeMetadata: true, // default: false
  metadataPrefix: "app.error.", // default: 'error.metadata.'
});
// Includes: { 'app.error.userId': 123, ... }
```

### Observability API Reference

| Function | Description |
| -------- | ----------- |
| `generateFingerprint(error, opts?)` | Generate stable hash for error deduplication |
| `toLogEntry(error, opts?)` | Create structured log entry for logging libraries |
| `toOtelAttributes(error, opts?)` | Create OpenTelemetry span attributes |
| `recordError(error, opts?)` | Helper to apply error info to OTel spans |

---

## Ecosystem Integrations

error-x includes example integrations with popular frameworks and libraries in the `/examples` directory:

### Server Frameworks

**Hono.js / Express.js** - Error handling middleware with consistent JSON responses, request ID tracking, and structured logging.

```typescript
// Hono.js
import { HTTPErrorX } from "@bombillazo/error-x";

app.get("/user/:id", async (c) => {
  const user = await getUser(c.req.param("id"));
  if (!user) {
    throw HTTPErrorX.create(404, { message: "User not found" });
  }
  return c.json(user);
});

app.onError(errorMiddleware()); // Consistent JSON error responses
```

### Frontend

**React Error Boundaries** - Error boundary components with ErrorX integration, user-friendly error display, and error tracking hooks.

```tsx
<ErrorBoundary onError={(error, info) => trackError(error)}>
  <App />
</ErrorBoundary>
```

### API Frameworks

**tRPC** - Type-safe error handling with ErrorX-to-TRPCError conversion and custom error formatting.

**GraphQL** - Apollo Server and graphql-yoga integrations with consistent error extensions and user-friendly messages.

### Logging

**Pino / Winston** - Structured error logging with fingerprinting, deduplication, and request context.

```typescript
import { toLogEntry, generateFingerprint } from "@bombillazo/error-x";

const entry = toLogEntry(error, { includeStack: true });
logger.error(entry);
```

### Validation

**Zod** - Advanced validation patterns beyond the built-in `ValidationErrorX.fromZodError()`.

See the [/examples](./examples) directory for complete integration examples with usage documentation.

## License

MIT
