import { ErrorX } from '../error';
import type { ErrorXOptions, ErrorXTransform } from '../types';

/**
 * Zod issue structure for type compatibility.
 * Matches the shape of Zod's ZodIssue type.
 *
 * @public
 */
export type ZodIssue = {
  code: string;
  path: (string | number)[];
  message: string;
  expected?: string;
  received?: string;
  minimum?: number;
  maximum?: number;
  inclusive?: boolean;
  exact?: boolean;
  type?: string;
};

/**
 * Metadata type for validation errors.
 * Designed to capture all relevant Zod validation context.
 *
 * @public
 */
export type ValidationErrorXMetadata = {
  /** The field that failed validation (dot-notation path) */
  field?: string;
  /** The full path to the field (for nested objects) */
  path?: (string | number)[];
  /** The Zod issue code (e.g., 'invalid_type', 'too_small') */
  zodCode?: string;
  /** The expected type or value */
  expected?: string;
  /** The received value (sanitized for safety) */
  received?: string;
  /** Total number of validation issues */
  issueCount?: number;
  /** All Zod issues (for multi-error handling) */
  issues?: ZodIssue[];
};

/**
 * Validation Error class designed for Zod integration.
 *
 * This class demonstrates how to map external library data (Zod) to ErrorX.
 * Instead of using presets, it dynamically creates errors from Zod's validation output.
 *
 * Key features:
 * - `fromZodError()` - Primary factory method for Zod integration
 * - Dynamic code mapping from Zod issue codes
 * - Full `instanceof` support for catch blocks
 * - Typed metadata capturing all Zod context
 *
 * @example
 * ```typescript
 * import { z } from 'zod'
 * import { ValidationErrorX } from 'error-x'
 *
 * const userSchema = z.object({
 *   email: z.string().email(),
 *   age: z.number().min(18),
 * })
 *
 * // Primary usage: fromZodError()
 * try {
 *   userSchema.parse({ email: 'invalid', age: 15 })
 * } catch (err) {
 *   if (err instanceof z.ZodError) {
 *     throw ValidationErrorX.fromZodError(err)
 *     // → code: 'VALIDATION_INVALID_STRING'
 *     // → message: 'Invalid email'
 *     // → metadata.field: 'email'
 *     // → metadata.zodCode: 'invalid_string'
 *   }
 * }
 *
 * // With overrides
 * ValidationErrorX.fromZodError(zodError, {
 *   uiMessage: 'Please check your input',
 *   httpStatus: 422,
 * })
 *
 * // Direct creation (without Zod)
 * ValidationErrorX.create({
 *   message: 'Invalid email format',
 *   code: 'INVALID_EMAIL',
 *   metadata: { field: 'email' }
 * })
 *
 * // instanceof in catch blocks
 * try {
 *   await processRequest(data)
 * } catch (err) {
 *   if (err instanceof ValidationErrorX) {
 *     return res.status(err.httpStatus).json({
 *       error: err.code,
 *       message: err.uiMessage,
 *       field: err.metadata?.field,
 *     })
 *   }
 * }
 * ```
 *
 * @public
 */
export class ValidationErrorX extends ErrorX<ValidationErrorXMetadata> {
  /** Default httpStatus for validation errors (400 = bad request) */
  static defaults = {
    httpStatus: 400,
    name: 'ValidationErrorX',
    code: 'VALIDATION_ERROR',
    message: 'Validation failed.',
    uiMessage: 'The provided input is invalid. Please check your data.',
  };

  /**
   * Transform that maps Zod issue codes to VALIDATION_ prefixed codes.
   * Converts Zod's snake_case codes to SCREAMING_SNAKE_CASE.
   */
  static transform: ErrorXTransform<ValidationErrorXMetadata> = (opts, _ctx) => {
    const code = String(opts.code ?? 'ERROR').toUpperCase();
    return {
      ...opts,
      code: code.startsWith('VALIDATION_') ? code : `VALIDATION_${code}`,
    };
  };

  /**
   * Creates a ValidationErrorX from a Zod error.
   *
   * Maps Zod's error structure to ErrorX:
   * - Uses first issue's message as the error message
   * - Converts Zod issue code to ErrorX code (e.g., 'invalid_type' → 'VALIDATION_INVALID_TYPE')
   * - Captures all issues in metadata for multi-error handling
   *
   * @param zodError - The Zod error object (or any object with `issues` array)
   * @param overrides - Optional overrides for any ErrorX options
   * @returns ValidationErrorX instance
   *
   * @example
   * ```typescript
   * // Basic usage
   * try {
   *   schema.parse(data)
   * } catch (err) {
   *   if (err instanceof ZodError) {
   *     throw ValidationErrorX.fromZodError(err)
   *   }
   * }
   *
   * // With custom uiMessage
   * ValidationErrorX.fromZodError(zodError, {
   *   uiMessage: 'Please fix the form errors',
   * })
   *
   * // Access all issues
   * const error = ValidationErrorX.fromZodError(zodError)
   * error.metadata?.issues?.forEach(issue => {
   *   console.log(`${issue.path.join('.')}: ${issue.message}`)
   * })
   * ```
   */
  static fromZodError(
    zodError: { issues: ZodIssue[] },
    overrides?: Partial<ErrorXOptions<ValidationErrorXMetadata>>
  ): ValidationErrorX {
    const firstIssue = zodError.issues[0];
    const fieldPath = firstIssue?.path.join('.');

    // Map Zod issue code to ErrorX code (e.g., 'invalid_type' → 'INVALID_TYPE')
    const zodCode = firstIssue?.code ?? 'unknown';
    const errorCode = zodCode.toUpperCase().replace(/-/g, '_');

    // Build metadata, only including defined values (for exactOptionalPropertyTypes)
    const metadata: ValidationErrorXMetadata = {
      zodCode,
      issueCount: zodError.issues.length,
      issues: zodError.issues,
    };
    if (fieldPath) metadata.field = fieldPath;
    if (firstIssue?.path) metadata.path = firstIssue.path;
    if (firstIssue?.expected) metadata.expected = firstIssue.expected;
    if (firstIssue?.received) metadata.received = firstIssue.received;

    // Merge options and apply transform for consistency with .create()
    const mergedOpts = {
      ...ValidationErrorX.defaults,
      code: errorCode,
      message: firstIssue?.message ?? 'Validation failed',
      metadata,
      ...overrides,
    };
    const transformedOpts = ValidationErrorX.transform(mergedOpts, { presetKey: undefined });

    return new ValidationErrorX(transformedOpts);
  }

  /**
   * Creates a ValidationErrorX for a specific field.
   * Convenience method for manual validation errors.
   *
   * @param field - The field name that failed validation
   * @param message - The error message
   * @param options - Additional options
   * @returns ValidationErrorX instance
   *
   * @example
   * ```typescript
   * // Simple field error
   * throw ValidationErrorX.forField('email', 'Invalid email format')
   *
   * // With code
   * throw ValidationErrorX.forField('age', 'Must be 18 or older', {
   *   code: 'TOO_YOUNG',
   * })
   * ```
   */
  static forField(
    field: string,
    message: string,
    options?: Partial<ErrorXOptions<ValidationErrorXMetadata>>
  ): ValidationErrorX {
    // Merge options and apply transform for consistency with .create()
    const mergedOpts = {
      ...ValidationErrorX.defaults,
      message,
      code: options?.code ?? 'INVALID_FIELD',
      metadata: {
        field,
        path: field.split('.'),
        ...options?.metadata,
      },
      ...options,
    };
    const transformedOpts = ValidationErrorX.transform(mergedOpts, { presetKey: undefined });

    return new ValidationErrorX(transformedOpts);
  }
}
