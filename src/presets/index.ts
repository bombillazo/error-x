/**
 * Pre-built error classes for common use cases.
 *
 * @remarks
 * This module exports specialized ErrorX subclasses with preset configurations:
 *
 * **HTTPErrorX** - HTTP errors with status code presets (400-511)
 * - Use `HTTPErrorX.create(404)` for quick error creation
 * - Automatic `httpStatus` from preset key
 * - Includes user-friendly messages via `httpErrorUiMessages`
 *
 * **DBErrorX** - Database errors with common scenario presets
 * - Use `DBErrorX.create('CONNECTION_FAILED')` for preset creation
 * - Automatic `DB_` code prefix via transform
 * - Includes user-friendly messages via `dbErrorUiMessages`
 *
 * **ValidationErrorX** - Validation errors with Zod integration
 * - Use `ValidationErrorX.fromZodError(zodError)` for Zod errors
 * - Use `ValidationErrorX.forField(field, message)` for manual errors
 * - Automatic `VALIDATION_` code prefix via transform
 *
 * @example
 * ```typescript
 * import { HTTPErrorX, DBErrorX, ValidationErrorX } from 'error-x';
 *
 * // HTTP errors
 * throw HTTPErrorX.create(404, { message: 'User not found' });
 *
 * // Database errors
 * throw DBErrorX.create('QUERY_TIMEOUT', { metadata: { query: sql } });
 *
 * // Validation errors
 * throw ValidationErrorX.fromZodError(zodError);
 * ```
 *
 * @packageDocumentation
 */

/**
 * Database error exports.
 *
 * @remarks
 * - {@link DBErrorX} - Database error class with presets
 * - {@link DBErrorXMetadata} - Typed metadata for DB context (query, table, operation, etc.)
 * - {@link DBErrorPreset} - Union type of valid preset keys
 * - {@link dbErrorUiMessages} - User-friendly messages keyed by preset
 */
export {
  DBErrorX,
  type DBErrorXMetadata,
  type DBErrorXPresetKey as DBErrorPreset,
  dbErrorUiMessages,
} from './db-error';

/**
 * HTTP error exports.
 *
 * @remarks
 * - {@link HTTPErrorX} - HTTP error class with status code presets
 * - {@link HTTPErrorXMetadata} - Typed metadata for HTTP context (endpoint, method, etc.)
 * - {@link HTTPStatusCode} - Union type of valid status codes
 * - {@link httpErrorUiMessages} - User-friendly messages keyed by status code
 */
export {
  HTTPErrorX,
  type HTTPErrorXMetadata,
  type HTTPErrorXPresetKey as HTTPStatusCode,
  httpErrorUiMessages,
} from './http-error';

/**
 * Validation error exports.
 *
 * @remarks
 * - {@link ValidationErrorX} - Validation error class with Zod integration
 * - {@link ValidationErrorXMetadata} - Typed metadata for validation context
 * - {@link validationErrorUiMessage} - Default user-friendly message
 * - {@link ZodIssue} - Type-compatible Zod issue structure
 */
export {
  ValidationErrorX,
  type ValidationErrorXMetadata,
  validationErrorUiMessage,
  type ZodIssue,
} from './validation-error';
