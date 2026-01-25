/**
 * Zod Integration Example
 *
 * This example shows comprehensive Zod integration patterns with error-x.
 * The library already includes ValidationErrorX with built-in Zod support,
 * but this example demonstrates advanced usage patterns.
 *
 * @example
 * ```bash
 * pnpm add zod @bombillazo/error-x
 * ```
 */

import { z, ZodError, ZodIssue } from 'zod'
import {
  ErrorX,
  ValidationErrorX,
  AggregateErrorX,
  type ErrorXOptions,
} from '@bombillazo/error-x'

// ============================================================================
// Basic Usage (Built-in Support)
// ============================================================================

/**
 * The simplest way to use Zod with error-x is through ValidationErrorX.fromZodError().
 *
 * @example
 * ```typescript
 * import { z } from 'zod'
 * import { ValidationErrorX } from '@bombillazo/error-x'
 *
 * const userSchema = z.object({
 *   email: z.string().email(),
 *   age: z.number().min(18)
 * })
 *
 * try {
 *   userSchema.parse({ email: 'invalid', age: 15 })
 * } catch (err) {
 *   if (err instanceof z.ZodError) {
 *     throw ValidationErrorX.fromZodError(err)
 *   }
 *   throw err
 * }
 * ```
 */

// ============================================================================
// Advanced: Safe Parse Wrapper
// ============================================================================

/**
 * Wrapper for Zod's safeParse that returns ErrorX on failure.
 *
 * @example
 * ```typescript
 * const result = safeValidate(userSchema, { email: 'test@example.com', age: 25 })
 * if (result.success) {
 *   console.log(result.data)
 * } else {
 *   console.log(result.error.code) // VALIDATION_INVALID_STRING or similar
 * }
 * ```
 */
export const safeValidate = <T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: ValidationErrorX } => {
  const result = schema.safeParse(data)

  if (result.success) {
    return { success: true, data: result.data }
  }

  return {
    success: false,
    error: ValidationErrorX.fromZodError(result.error),
  }
}

/**
 * Async version for schemas with async refinements.
 */
export const safeValidateAsync = async <T>(
  schema: z.ZodSchema<T>,
  data: unknown
): Promise<{ success: true; data: T } | { success: false; error: ValidationErrorX }> => {
  const result = await schema.safeParseAsync(data)

  if (result.success) {
    return { success: true, data: result.data }
  }

  return {
    success: false,
    error: ValidationErrorX.fromZodError(result.error),
  }
}

// ============================================================================
// Aggregate Validation Errors
// ============================================================================

/**
 * Collect all validation errors instead of failing on the first one.
 *
 * @example
 * ```typescript
 * const result = validateAll(userSchema, { email: 'invalid', age: -5 })
 * if (!result.success) {
 *   console.log(result.errors.length) // 2 errors
 *   result.errors.forEach(e => console.log(e.metadata?.field, e.message))
 * }
 * ```
 */
export const validateAll = <T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: ValidationErrorX[]; aggregate: AggregateErrorX } => {
  const result = schema.safeParse(data)

  if (result.success) {
    return { success: true, data: result.data }
  }

  // Convert each Zod issue to a ValidationErrorX
  const errors = result.error.issues.map((issue) =>
    ValidationErrorX.forField(
      issue.path.join('.'),
      issue.message,
      {
        code: `VALIDATION_${issue.code.toUpperCase()}`,
        metadata: {
          zodCode: issue.code,
          path: issue.path,
          ...(issue.code === 'invalid_type' && {
            expected: (issue as z.ZodInvalidTypeIssue).expected,
            received: (issue as z.ZodInvalidTypeIssue).received,
          }),
        },
      }
    )
  )

  const aggregate = ErrorX.aggregate(errors, {
    message: `Validation failed with ${errors.length} error${errors.length > 1 ? 's' : ''}`,
    code: 'VALIDATION_FAILED',
    httpStatus: 400,
  })

  return { success: false, errors, aggregate }
}

// ============================================================================
// Form Validation Helper
// ============================================================================

/**
 * Format validation errors for form display.
 */
type FormErrors = Record<string, string[]>

/**
 * Convert Zod errors to a form-friendly format.
 *
 * @example
 * ```typescript
 * const formSchema = z.object({
 *   username: z.string().min(3).max(20),
 *   email: z.string().email(),
 *   password: z.string().min(8),
 *   confirmPassword: z.string()
 * }).refine(data => data.password === data.confirmPassword, {
 *   message: 'Passwords do not match',
 *   path: ['confirmPassword']
 * })
 *
 * const { errors, fieldErrors } = validateForm(formSchema, formData)
 * // fieldErrors: { email: ['Invalid email'], confirmPassword: ['Passwords do not match'] }
 * ```
 */
export const validateForm = <T>(
  schema: z.ZodSchema<T>,
  data: unknown
): {
  success: boolean
  data?: T
  errors: ValidationErrorX[]
  fieldErrors: FormErrors
  firstError?: ValidationErrorX
} => {
  const result = schema.safeParse(data)

  if (result.success) {
    return {
      success: true,
      data: result.data,
      errors: [],
      fieldErrors: {},
    }
  }

  const errors: ValidationErrorX[] = []
  const fieldErrors: FormErrors = {}

  for (const issue of result.error.issues) {
    const fieldPath = issue.path.join('.') || '_root'

    // Add to field errors
    if (!fieldErrors[fieldPath]) {
      fieldErrors[fieldPath] = []
    }
    fieldErrors[fieldPath].push(issue.message)

    // Create ValidationErrorX
    errors.push(
      ValidationErrorX.forField(fieldPath, issue.message, {
        metadata: { zodCode: issue.code, path: issue.path },
      })
    )
  }

  return {
    success: false,
    errors,
    fieldErrors,
    firstError: errors[0],
  }
}

// ============================================================================
// Schema Builder with Error Customization
// ============================================================================

/**
 * Create a Zod schema with custom error messages using error-x codes.
 *
 * @example
 * ```typescript
 * const userSchema = createSchema({
 *   email: {
 *     schema: z.string().email(),
 *     errorCode: 'INVALID_EMAIL',
 *     message: 'Please enter a valid email address'
 *   },
 *   age: {
 *     schema: z.number().min(18),
 *     errorCode: 'UNDERAGE',
 *     message: 'You must be at least 18 years old'
 *   }
 * })
 * ```
 */
type SchemaFieldConfig<T> = {
  schema: z.ZodSchema<T>
  errorCode?: string
  message?: string
}

export const createSchema = <T extends Record<string, SchemaFieldConfig<unknown>>>(
  fields: T
): z.ZodObject<{ [K in keyof T]: T[K]['schema'] }> => {
  const shape: Record<string, z.ZodSchema> = {}

  for (const [key, config] of Object.entries(fields)) {
    shape[key] = config.schema
  }

  return z.object(shape) as z.ZodObject<{ [K in keyof T]: T[K]['schema'] }>
}

/**
 * Validate with custom error codes.
 */
export const validateWithCustomErrors = <T extends Record<string, SchemaFieldConfig<unknown>>>(
  fields: T,
  data: unknown
): {
  success: boolean
  data?: z.infer<ReturnType<typeof createSchema<T>>>
  errors: ValidationErrorX[]
} => {
  const schema = createSchema(fields)
  const result = schema.safeParse(data)

  if (result.success) {
    return { success: true, data: result.data, errors: [] }
  }

  const errors: ValidationErrorX[] = []

  for (const issue of result.error.issues) {
    const fieldName = issue.path[0] as string
    const fieldConfig = fields[fieldName]

    errors.push(
      ValidationErrorX.forField(fieldName, fieldConfig?.message ?? issue.message, {
        code: fieldConfig?.errorCode,
        metadata: { zodCode: issue.code, path: issue.path },
      })
    )
  }

  return { success: false, errors }
}

// ============================================================================
// API Request Validation
// ============================================================================

/**
 * Validate API request body with detailed error response.
 *
 * @example
 * ```typescript
 * // Express/Hono route handler
 * app.post('/api/users', async (c) => {
 *   const validation = validateRequest(createUserSchema, await c.req.json())
 *
 *   if (!validation.success) {
 *     return c.json(validation.errorResponse, 400)
 *   }
 *
 *   const user = await createUser(validation.data)
 *   return c.json(user, 201)
 * })
 * ```
 */
export const validateRequest = <T>(
  schema: z.ZodSchema<T>,
  data: unknown
): {
  success: true
  data: T
} | {
  success: false
  error: ValidationErrorX
  errorResponse: {
    success: false
    error: {
      code: string
      message: string
      fields: Array<{
        field: string
        message: string
        code: string
      }>
    }
  }
} => {
  const result = schema.safeParse(data)

  if (result.success) {
    return { success: true, data: result.data }
  }

  const error = ValidationErrorX.fromZodError(result.error)

  const errorResponse = {
    success: false as const,
    error: {
      code: error.code,
      message: 'Validation failed',
      fields: result.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
        code: `VALIDATION_${issue.code.toUpperCase()}`,
      })),
    },
  }

  return { success: false, error, errorResponse }
}

// ============================================================================
// Zod Extensions
// ============================================================================

/**
 * Extend Zod with error-x integration.
 *
 * @example
 * ```typescript
 * const schema = z.string().email().errorX({ code: 'INVALID_EMAIL' })
 *
 * try {
 *   schema.parse('invalid')
 * } catch (err) {
 *   // err is already a ValidationErrorX with code 'INVALID_EMAIL'
 * }
 * ```
 */
export const extendZod = () => {
  // This is a demonstration of the pattern - in practice you might use
  // Zod's built-in error customization or wrap at the validation boundary

  const originalParse = z.ZodSchema.prototype.parse

  z.ZodSchema.prototype.parse = function (data: unknown, params?: Partial<z.ParseParams>) {
    try {
      return originalParse.call(this, data, params)
    } catch (err) {
      if (err instanceof ZodError) {
        throw ValidationErrorX.fromZodError(err)
      }
      throw err
    }
  }
}

// ============================================================================
// Complete Usage Examples
// ============================================================================

/**
 * ## Basic Form Validation
 *
 * ```typescript
 * import { z } from 'zod'
 * import { ValidationErrorX } from '@bombillazo/error-x'
 *
 * const loginSchema = z.object({
 *   email: z.string().email('Invalid email address'),
 *   password: z.string().min(8, 'Password must be at least 8 characters')
 * })
 *
 * // In your form handler
 * const handleSubmit = (formData: FormData) => {
 *   const data = Object.fromEntries(formData)
 *
 *   try {
 *     const validated = loginSchema.parse(data)
 *     return login(validated.email, validated.password)
 *   } catch (err) {
 *     if (err instanceof z.ZodError) {
 *       const error = ValidationErrorX.fromZodError(err)
 *       setFormError(error.metadata?.field, error.message)
 *     }
 *   }
 * }
 * ```
 *
 * ## API Endpoint Validation
 *
 * ```typescript
 * import { z } from 'zod'
 * import { validateRequest, ValidationErrorX } from '@bombillazo/error-x'
 *
 * const createUserSchema = z.object({
 *   username: z.string().min(3).max(20).regex(/^[a-z0-9_]+$/i),
 *   email: z.string().email(),
 *   password: z.string().min(8).max(100),
 *   role: z.enum(['user', 'admin']).default('user')
 * })
 *
 * // Hono handler
 * app.post('/api/users', async (c) => {
 *   const body = await c.req.json()
 *   const validation = validateRequest(createUserSchema, body)
 *
 *   if (!validation.success) {
 *     return c.json(validation.errorResponse, 400)
 *   }
 *
 *   const user = await db.user.create({ data: validation.data })
 *   return c.json({ success: true, data: user }, 201)
 * })
 * ```
 *
 * ## Complex Validation with Refinements
 *
 * ```typescript
 * import { z } from 'zod'
 * import { validateForm } from '@bombillazo/error-x'
 *
 * const registrationSchema = z.object({
 *   email: z.string().email(),
 *   password: z.string().min(8).regex(
 *     /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
 *     'Password must contain lowercase, uppercase, and number'
 *   ),
 *   confirmPassword: z.string(),
 *   age: z.number().min(13, 'Must be at least 13 years old'),
 *   acceptTerms: z.literal(true, {
 *     errorMap: () => ({ message: 'You must accept the terms' })
 *   })
 * })
 * .refine(data => data.password === data.confirmPassword, {
 *   message: 'Passwords do not match',
 *   path: ['confirmPassword']
 * })
 * .refine(async data => {
 *   const exists = await checkEmailExists(data.email)
 *   return !exists
 * }, {
 *   message: 'Email already registered',
 *   path: ['email']
 * })
 *
 * // In component
 * const RegisterForm = () => {
 *   const [errors, setErrors] = useState<FormErrors>({})
 *
 *   const handleSubmit = async (e: FormEvent) => {
 *     e.preventDefault()
 *     const formData = new FormData(e.target as HTMLFormElement)
 *     const data = Object.fromEntries(formData)
 *
 *     const result = await safeValidateAsync(registrationSchema, {
 *       ...data,
 *       age: Number(data.age),
 *       acceptTerms: data.acceptTerms === 'on'
 *     })
 *
 *     if (!result.success) {
 *       setErrors(convertToFormErrors(result.error))
 *       return
 *     }
 *
 *     await register(result.data)
 *   }
 *
 *   return (
 *     <form onSubmit={handleSubmit}>
 *       <TextField name="email" error={errors.email?.[0]} />
 *       <TextField name="password" type="password" error={errors.password?.[0]} />
 *       <TextField name="confirmPassword" type="password" error={errors.confirmPassword?.[0]} />
 *       {/* ... */}
 *     </form>
 *   )
 * }
 * ```
 *
 * ## Type-Safe Environment Variables
 *
 * ```typescript
 * import { z } from 'zod'
 * import { ValidationErrorX } from '@bombillazo/error-x'
 *
 * const envSchema = z.object({
 *   NODE_ENV: z.enum(['development', 'production', 'test']),
 *   DATABASE_URL: z.string().url(),
 *   API_KEY: z.string().min(32),
 *   PORT: z.string().transform(Number).pipe(z.number().min(1024).max(65535)),
 *   DEBUG: z.string().transform(v => v === 'true').default('false')
 * })
 *
 * export const loadEnv = () => {
 *   const result = envSchema.safeParse(process.env)
 *
 *   if (!result.success) {
 *     const error = ValidationErrorX.fromZodError(result.error, {
 *       message: 'Invalid environment configuration'
 *     })
 *     console.error('Environment validation failed:')
 *     result.error.issues.forEach(issue => {
 *       console.error(`  ${issue.path.join('.')}: ${issue.message}`)
 *     })
 *     throw error
 *   }
 *
 *   return result.data
 * }
 *
 * // Usage
 * export const env = loadEnv()
 * ```
 */

export {
  ErrorX,
  ValidationErrorX,
  AggregateErrorX,
  z,
  ZodError,
}
