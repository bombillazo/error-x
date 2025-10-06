import type { ErrorXOptions } from './types.js';

/**
 * HTTP error presets for common HTTP status codes.
 *
 * These presets provide pre-configured error options for standard HTTP error responses,
 * including appropriate status codes, error codes, names, messages (sentence case), and user-friendly UI messages.
 *
 * ## Usage Patterns
 *
 * ### 1. Use Preset Directly
 * Create an error with all preset values:
 * ```typescript
 * throw new ErrorX(http[404])
 * // Result: 404 error with message "Not found.", code, name, uiMessage, and type
 * ```
 *
 * ### 2. Override Specific Fields
 * Customize the error while keeping other preset values:
 * ```typescript
 * throw new ErrorX({
 *   ...http[404],
 *   message: 'User not found',
 *   metadata: { userId: 123 }
 * })
 * // Result: 404 error with custom message but keeps httpStatus, code, name, uiMessage, type
 * ```
 *
 * ### 3. Add Metadata
 * Enhance presets with additional context:
 * ```typescript
 * throw new ErrorX({
 *   ...http[401],
 *   metadata: { attemptedAction: 'viewProfile', userId: 456 }
 * })
 * ```
 *
 * ### 4. Add Error Cause
 * Chain errors by adding a cause:
 * ```typescript
 * try {
 *   // some operation
 * } catch (originalError) {
 *   throw new ErrorX({
 *     ...http[500],
 *     cause: originalError,
 *     metadata: { operation: 'database-query' }
 *   })
 * }
 * ```
 *
 * ## Common HTTP Presets
 *
 * ### 4xx Client Errors
 * - `400` - Bad Request - Invalid request data
 * - `401` - Unauthorized - Authentication required
 * - `403` - Forbidden - Insufficient permissions
 * - `404` - Not Found - Resource not found
 * - `405` - Method Not Allowed - HTTP method not allowed
 * - `409` - Conflict - Resource conflict
 * - `422` - Unprocessable Entity - Validation failed
 * - `429` - Too Many Requests - Rate limit exceeded
 *
 * ### 5xx Server Errors
 * - `500` - Internal Server Error - Unexpected server error
 * - `501` - Not Implemented - Feature not implemented
 * - `502` - Bad Gateway - Upstream server error
 * - `503` - Service Unavailable - Service temporarily down
 * - `504` - Gateway Timeout - Upstream timeout
 *
 * @example
 * ```typescript
 * // API endpoint example
 * app.get('/users/:id', async (req, res) => {
 *   const user = await db.users.findById(req.params.id)
 *
 *   if (!user) {
 *     throw new ErrorX({
 *       ...http[404],
 *       message: 'User not found',
 *       metadata: { userId: req.params.id }
 *     })
 *   }
 *
 *   res.json(user)
 * })
 *
 * // Authentication middleware example
 * const requireAuth = (req, res, next) => {
 *   if (!req.user) {
 *     throw new ErrorX(http[401])
 *   }
 *   next()
 * }
 *
 * // Rate limiting example
 * if (isRateLimited(req.ip)) {
 *   throw new ErrorX({
 *     ...http[429],
 *     metadata: {
 *       ip: req.ip,
 *       retryAfter: 60
 *     }
 *   })
 * }
 * ```
 *
 * @public
 */
export const http = {
  // 4xx Client Errors
  400: {
    code: 'BAD_REQUEST',
    name: 'Bad Request Error',
    message: 'Bad request.',
    uiMessage: 'The request could not be processed. Please check your input and try again.',
    metadata: { status: 400 },
  } satisfies ErrorXOptions,

  401: {
    code: 'UNAUTHORIZED',
    name: 'Unauthorized Error',
    message: 'Unauthorized.',
    uiMessage: 'Authentication required. Please log in to continue.',
    metadata: { status: 401 },
  } satisfies ErrorXOptions,

  402: {
    code: 'PAYMENT_REQUIRED',
    name: 'Payment Required Error',
    message: 'Payment required.',
    uiMessage: 'Payment is required to access this resource.',
    metadata: { status: 402 },
  } satisfies ErrorXOptions,

  403: {
    code: 'FORBIDDEN',
    name: 'Forbidden Error',
    message: 'Forbidden.',
    uiMessage: 'You do not have permission to access this resource.',
    metadata: { status: 403 },
  } satisfies ErrorXOptions,

  404: {
    code: 'NOT_FOUND',
    name: 'Not Found Error',
    message: 'Not found.',
    uiMessage: 'The requested resource could not be found.',
    metadata: { status: 404 },
  } satisfies ErrorXOptions,

  405: {
    code: 'METHOD_NOT_ALLOWED',
    name: 'Method Not Allowed Error',
    message: 'Method not allowed.',
    uiMessage: 'This action is not allowed for the requested resource.',
    metadata: { status: 405 },
  } satisfies ErrorXOptions,

  406: {
    code: 'NOT_ACCEPTABLE',
    name: 'Not Acceptable Error',
    message: 'Not acceptable.',
    uiMessage: 'The requested format is not supported.',
    metadata: { status: 406 },
  } satisfies ErrorXOptions,

  407: {
    code: 'PROXY_AUTHENTICATION_REQUIRED',
    name: 'Proxy Authentication Required Error',
    message: 'Proxy authentication required.',
    uiMessage: 'Proxy authentication is required to access this resource.',
    metadata: { status: 407 },
  } satisfies ErrorXOptions,

  408: {
    code: 'REQUEST_TIMEOUT',
    name: 'Request Timeout Error',
    message: 'Request timeout.',
    uiMessage: 'The request took too long to complete. Please try again.',
    metadata: { status: 408 },
  } satisfies ErrorXOptions,

  409: {
    code: 'CONFLICT',
    name: 'Conflict Error',
    message: 'Conflict.',
    uiMessage: 'The request conflicts with the current state. Please refresh and try again.',
    metadata: { status: 409 },
  } satisfies ErrorXOptions,

  410: {
    code: 'GONE',
    name: 'Gone Error',
    message: 'Gone.',
    uiMessage: 'This resource is no longer available.',
    metadata: { status: 410 },
  } satisfies ErrorXOptions,

  411: {
    code: 'LENGTH_REQUIRED',
    name: 'Length Required Error',
    message: 'Length required.',
    uiMessage: 'The request is missing required length information.',
    metadata: { status: 411 },
  } satisfies ErrorXOptions,

  412: {
    code: 'PRECONDITION_FAILED',
    name: 'Precondition Failed Error',
    message: 'Precondition failed.',
    uiMessage: 'A required condition was not met. Please try again.',
    metadata: { status: 412 },
  } satisfies ErrorXOptions,

  413: {
    code: 'PAYLOAD_TOO_LARGE',
    name: 'Payload Too Large Error',
    message: 'Payload too large.',
    uiMessage: 'The request is too large. Please reduce the size and try again.',
    metadata: { status: 413 },
  } satisfies ErrorXOptions,

  414: {
    code: 'URI_TOO_LONG',
    name: 'URI Too Long Error',
    message: 'URI too long.',
    uiMessage: 'The request URL is too long.',
    metadata: { status: 414 },
  } satisfies ErrorXOptions,

  415: {
    code: 'UNSUPPORTED_MEDIA_TYPE',
    name: 'Unsupported Media Type Error',
    message: 'Unsupported media type.',
    uiMessage: 'The file type is not supported.',
    metadata: { status: 415 },
  } satisfies ErrorXOptions,

  416: {
    code: 'RANGE_NOT_SATISFIABLE',
    name: 'Range Not Satisfiable Error',
    message: 'Range not satisfiable.',
    uiMessage: 'The requested range cannot be satisfied.',
    metadata: { status: 416 },
  } satisfies ErrorXOptions,

  417: {
    code: 'EXPECTATION_FAILED',
    name: 'Expectation Failed Error',
    message: 'Expectation failed.',
    uiMessage: 'The server cannot meet the requirements of the request.',
    metadata: { status: 417 },
  } satisfies ErrorXOptions,

  418: {
    code: 'IM_A_TEAPOT',
    name: 'Im A Teapot Error',
    message: "I'm a teapot.",
    uiMessage: "I'm a teapot and cannot brew coffee.",
    metadata: { status: 418 },
  } satisfies ErrorXOptions,

  422: {
    code: 'UNPROCESSABLE_ENTITY',
    name: 'Unprocessable Entity Error',
    message: 'Unprocessable entity.',
    uiMessage: 'The request contains invalid data. Please check your input.',
    metadata: { status: 422 },
  } satisfies ErrorXOptions,

  423: {
    code: 'LOCKED',
    name: 'Locked Error',
    message: 'Locked.',
    uiMessage: 'This resource is locked and cannot be modified.',
    metadata: { status: 423 },
  } satisfies ErrorXOptions,

  424: {
    code: 'FAILED_DEPENDENCY',
    name: 'Failed Dependency Error',
    message: 'Failed dependency.',
    uiMessage: 'The request failed due to a dependency error.',
    metadata: { status: 424 },
  } satisfies ErrorXOptions,

  425: {
    code: 'TOO_EARLY',
    name: 'Too Early Error',
    message: 'Too early.',
    uiMessage: 'The request was sent too early. Please try again later.',
    metadata: { status: 425 },
  } satisfies ErrorXOptions,

  426: {
    code: 'UPGRADE_REQUIRED',
    name: 'Upgrade Required Error',
    message: 'Upgrade required.',
    uiMessage: 'Please upgrade to continue using this service.',
    metadata: { status: 426 },
  } satisfies ErrorXOptions,

  428: {
    code: 'PRECONDITION_REQUIRED',
    name: 'Precondition Required Error',
    message: 'Precondition required.',
    uiMessage: 'Required conditions are missing from the request.',
    metadata: { status: 428 },
  } satisfies ErrorXOptions,

  429: {
    code: 'TOO_MANY_REQUESTS',
    name: 'Too Many Requests Error',
    message: 'Too many requests.',
    uiMessage: 'You have made too many requests. Please wait and try again.',
    metadata: { status: 429 },
  } satisfies ErrorXOptions,

  431: {
    code: 'REQUEST_HEADER_FIELDS_TOO_LARGE',
    name: 'Request Header Fields Too Large Error',
    message: 'Request header fields too large.',
    uiMessage: 'The request headers are too large.',
    metadata: { status: 431 },
  } satisfies ErrorXOptions,

  451: {
    code: 'UNAVAILABLE_FOR_LEGAL_REASONS',
    name: 'Unavailable For Legal Reasons Error',
    message: 'Unavailable for legal reasons.',
    uiMessage: 'This content is unavailable for legal reasons.',
    metadata: { status: 451 },
  } satisfies ErrorXOptions,

  // 5xx Server Errors
  500: {
    code: 'INTERNAL_SERVER_ERROR',
    name: 'Internal Server Error',
    message: 'Internal server error.',
    uiMessage: 'An unexpected error occurred. Please try again later.',
    metadata: { status: 500 },
  } satisfies ErrorXOptions,

  501: {
    code: 'NOT_IMPLEMENTED',
    name: 'Not Implemented Error',
    message: 'Not implemented.',
    uiMessage: 'This feature is not yet available.',
    metadata: { status: 501 },
  } satisfies ErrorXOptions,

  502: {
    code: 'BAD_GATEWAY',
    name: 'Bad Gateway Error',
    message: 'Bad gateway.',
    uiMessage: 'Unable to connect to the server. Please try again later.',
    metadata: { status: 502 },
  } satisfies ErrorXOptions,

  503: {
    code: 'SERVICE_UNAVAILABLE',
    name: 'Service Unavailable Error',
    message: 'Service unavailable.',
    uiMessage: 'The service is temporarily unavailable. Please try again later.',
    metadata: { status: 503 },
  } satisfies ErrorXOptions,

  504: {
    code: 'GATEWAY_TIMEOUT',
    name: 'Gateway Timeout Error',
    message: 'Gateway timeout.',
    uiMessage: 'The server took too long to respond. Please try again.',
    metadata: { status: 504 },
  } satisfies ErrorXOptions,

  505: {
    code: 'HTTP_VERSION_NOT_SUPPORTED',
    name: 'HTTP Version Not Supported Error',
    message: 'HTTP version not supported.',
    uiMessage: 'Your browser version is not supported.',
    metadata: { status: 505 },
  } satisfies ErrorXOptions,

  506: {
    code: 'VARIANT_ALSO_NEGOTIATES',
    name: 'Variant Also Negotiates Error',
    message: 'Variant also negotiates.',
    uiMessage: 'The server has an internal configuration error.',
    metadata: { status: 506 },
  } satisfies ErrorXOptions,

  507: {
    code: 'INSUFFICIENT_STORAGE',
    name: 'Insufficient Storage Error',
    message: 'Insufficient storage.',
    uiMessage: 'The server has insufficient storage to complete the request.',
    metadata: { status: 507 },
  } satisfies ErrorXOptions,

  508: {
    code: 'LOOP_DETECTED',
    name: 'Loop Detected Error',
    message: 'Loop detected.',
    uiMessage: 'The server detected an infinite loop.',
    metadata: { status: 508 },
  } satisfies ErrorXOptions,

  510: {
    code: 'NOT_EXTENDED',
    name: 'Not Extended Error',
    message: 'Not extended.',
    uiMessage: 'Additional extensions are required.',
    metadata: { status: 510 },
  } satisfies ErrorXOptions,

  511: {
    code: 'NETWORK_AUTHENTICATION_REQUIRED',
    name: 'Network Authentication Required Error',
    message: 'Network authentication required.',
    uiMessage: 'Network authentication is required to access this resource.',
    metadata: { status: 511 },
  } satisfies ErrorXOptions,
} as const;
