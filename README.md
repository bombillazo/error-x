# error-x

[![npm downloads](https://img.shields.io/npm/dm/@bombillazo/error-x.svg?style=for-the-badge)](https://www.npmjs.com/package/@bombillazo/error-x)
[![npm](https://img.shields.io/npm/dt/@bombillazo/error-x.svg?style=for-the-badge)](https://www.npmjs.com/package/@bombillazo/error-x)
[![npm](https://img.shields.io/npm/l/@bombillazo/error-x?style=for-the-badge)](https://github.com/bombillazo/error-x/blob/master/LICENSE)

🚨❌

A smart, isomorphic, and type-safe error library for TypeScript applications. Provides excellent DX with intelligent error conversion, stack trace preservation, serialization support, error chaining, flexible custom error classes, and more.

## Features

- **Built in TypeScript** for full Type-safe error handling support and generics
- **Isomorphic** - works in Node.js and browsers
- **Smart error conversion** from different sources (API responses, strings, Error objects)
- **Error chaining** for full error sequence
- **Factory method** `.create()` for preset-based error creation
- **Custom metadata** with type-safe generics for additional context
- **Global configuration** for stack cleaning and defaults
- **Serialization/deserialization** for network transfer and storage
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

> [!WARNING]
>
> This library is currently in pre-v1.0 development. Breaking changes may occur. We recommend pinning to specific versions and reviewing release notes when updating.
>
> Once we reach version 1.0, we plan to minimize API changes and follow semantic versioning.

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
  uiMessage: "Please check your credentials",
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

| Property     | Type                       | Description                                                    |
| ------------ | -------------------------- | -------------------------------------------------------------- |
| `message`    | `string`                   | Technical error message                                        |
| `name`       | `string`                   | Error type/name                                                |
| `code`       | `string`                   | Error identifier code (auto-generated from name if not set)    |
| `uiMessage`  | `string \| undefined`      | User-friendly message for UI display                           |
| `httpStatus` | `number \| undefined`      | HTTP status code associated with this error                    |
| `metadata`   | `TMetadata \| undefined`   | Additional context (type-safe with generics)                   |
| `timestamp`  | `number`                   | Unix epoch timestamp (ms) when error was created               |
| `stack`      | `string \| undefined`      | Stack trace (inherited from Error)                             |
| `chain`      | `readonly ErrorX[]`        | Full error sequence: `[this, parent, grandparent, ..., root]`  |
| `root`       | `ErrorX \| undefined`      | Error that started the whole error chain                       |
| `parent`     | `ErrorX \| undefined`      | Error that immediately precedes this error in the chain        |
| `original`   | `ErrorXSnapshot \| undefined` | Stores the original non-ErrorX error used to create this error |

#### Static Methods

| Method                | Description                                                         |
| --------------------- | ------------------------------------------------------------------- |
| `from(value, opts?)`  | Convert any value to ErrorX with intelligent property extraction    |
| `fromJSON(json)`      | Deserialize JSON back to ErrorX instance                            |
| `create(key?, opts?)` | Factory method for preset-based error creation (used by subclasses) |
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
  uiMessage: "The requested user does not exist",
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
| uiMessage  | `string`           | `undefined`           | User-friendly message                     |
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
// { name, message, code, uiMessage, stack, metadata, timestamp, httpStatus, original, chain }

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
  uiMessage: "Please check your input",
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
    uiMessage: "Your payment method has insufficient funds.",
    httpStatus: 402,
  },
  CARD_DECLINED: {
    code: "CARD_DECLINED",
    name: "PaymentError",
    message: "Card declined.",
    uiMessage: "Your card was declined. Please try another payment method.",
    httpStatus: 402,
  },
  EXPIRED_CARD: {
    code: "EXPIRED_CARD",
    name: "PaymentError",
    message: "Card expired.",
    uiMessage: "Your card has expired. Please update your payment method.",
    httpStatus: 402,
  },
} as const satisfies Record<string, ErrorXOptions>;

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

## License

MIT
