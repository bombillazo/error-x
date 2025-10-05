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
 * throw new ErrorX(http.notFound)
 * // Result: 404 error with message "Not found.", code, name, uiMessage, and type
 * ```
 *
 * ### 2. Override Specific Fields
 * Customize the error while keeping other preset values:
 * ```typescript
 * throw new ErrorX({
 *   ...http.notFound,
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
 *   ...http.unauthorized,
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
 *     ...http.internalServerError,
 *     cause: originalError,
 *     metadata: { operation: 'database-query' }
 *   })
 * }
 * ```
 *
 * ## Common HTTP Presets
 *
 * ### 4xx Client Errors
 * - `badRequest` (400) - Invalid request data
 * - `unauthorized` (401) - Authentication required
 * - `forbidden` (403) - Insufficient permissions
 * - `notFound` (404) - Resource not found
 * - `methodNotAllowed` (405) - HTTP method not allowed
 * - `conflict` (409) - Resource conflict
 * - `unprocessableEntity` (422) - Validation failed
 * - `tooManyRequests` (429) - Rate limit exceeded
 *
 * ### 5xx Server Errors
 * - `internalServerError` (500) - Unexpected server error
 * - `notImplemented` (501) - Feature not implemented
 * - `badGateway` (502) - Upstream server error
 * - `serviceUnavailable` (503) - Service temporarily down
 * - `gatewayTimeout` (504) - Upstream timeout
 *
 * @example
 * ```typescript
 * // API endpoint example
 * app.get('/users/:id', async (req, res) => {
 *   const user = await db.users.findById(req.params.id)
 *
 *   if (!user) {
 *     throw new ErrorX({
 *       ...http.notFound,
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
 *     throw new ErrorX(http.unauthorized)
 *   }
 *   next()
 * }
 *
 * // Rate limiting example
 * if (isRateLimited(req.ip)) {
 *   throw new ErrorX({
 *     ...http.tooManyRequests,
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
  badRequest: {
    httpStatus: 400,
    code: 'BAD_REQUEST',
    name: 'Bad Request Error',
    message: 'Bad request.',
    uiMessage: 'The request could not be processed. Please check your input and try again.',
    type: 'http',
  } satisfies ErrorXOptions,

  unauthorized: {
    httpStatus: 401,
    code: 'UNAUTHORIZED',
    name: 'Unauthorized Error',
    message: 'Unauthorized.',
    uiMessage: 'Authentication required. Please log in to continue.',
    type: 'http',
  } satisfies ErrorXOptions,

  paymentRequired: {
    httpStatus: 402,
    code: 'PAYMENT_REQUIRED',
    name: 'Payment Required Error',
    message: 'Payment required.',
    uiMessage: 'Payment is required to access this resource.',
    type: 'http',
  } satisfies ErrorXOptions,

  forbidden: {
    httpStatus: 403,
    code: 'FORBIDDEN',
    name: 'Forbidden Error',
    message: 'Forbidden.',
    uiMessage: 'You do not have permission to access this resource.',
    type: 'http',
  } satisfies ErrorXOptions,

  notFound: {
    httpStatus: 404,
    code: 'NOT_FOUND',
    name: 'Not Found Error',
    message: 'Not found.',
    uiMessage: 'The requested resource could not be found.',
    type: 'http',
  } satisfies ErrorXOptions,

  methodNotAllowed: {
    httpStatus: 405,
    code: 'METHOD_NOT_ALLOWED',
    name: 'Method Not Allowed Error',
    message: 'Method not allowed.',
    uiMessage: 'This action is not allowed for the requested resource.',
    type: 'http',
  } satisfies ErrorXOptions,

  notAcceptable: {
    httpStatus: 406,
    code: 'NOT_ACCEPTABLE',
    name: 'Not Acceptable Error',
    message: 'Not acceptable.',
    uiMessage: 'The requested format is not supported.',
    type: 'http',
  } satisfies ErrorXOptions,

  proxyAuthenticationRequired: {
    httpStatus: 407,
    code: 'PROXY_AUTHENTICATION_REQUIRED',
    name: 'Proxy Authentication Required Error',
    message: 'Proxy authentication required.',
    uiMessage: 'Proxy authentication is required to access this resource.',
    type: 'http',
  } satisfies ErrorXOptions,

  requestTimeout: {
    httpStatus: 408,
    code: 'REQUEST_TIMEOUT',
    name: 'Request Timeout Error',
    message: 'Request timeout.',
    uiMessage: 'The request took too long to complete. Please try again.',
    type: 'http',
  } satisfies ErrorXOptions,

  conflict: {
    httpStatus: 409,
    code: 'CONFLICT',
    name: 'Conflict Error',
    message: 'Conflict.',
    uiMessage: 'The request conflicts with the current state. Please refresh and try again.',
    type: 'http',
  } satisfies ErrorXOptions,

  gone: {
    httpStatus: 410,
    code: 'GONE',
    name: 'Gone Error',
    message: 'Gone.',
    uiMessage: 'This resource is no longer available.',
    type: 'http',
  } satisfies ErrorXOptions,

  lengthRequired: {
    httpStatus: 411,
    code: 'LENGTH_REQUIRED',
    name: 'Length Required Error',
    message: 'Length required.',
    uiMessage: 'The request is missing required length information.',
    type: 'http',
  } satisfies ErrorXOptions,

  preconditionFailed: {
    httpStatus: 412,
    code: 'PRECONDITION_FAILED',
    name: 'Precondition Failed Error',
    message: 'Precondition failed.',
    uiMessage: 'A required condition was not met. Please try again.',
    type: 'http',
  } satisfies ErrorXOptions,

  payloadTooLarge: {
    httpStatus: 413,
    code: 'PAYLOAD_TOO_LARGE',
    name: 'Payload Too Large Error',
    message: 'Payload too large.',
    uiMessage: 'The request is too large. Please reduce the size and try again.',
    type: 'http',
  } satisfies ErrorXOptions,

  uriTooLong: {
    httpStatus: 414,
    code: 'URI_TOO_LONG',
    name: 'URI Too Long Error',
    message: 'URI too long.',
    uiMessage: 'The request URL is too long.',
    type: 'http',
  } satisfies ErrorXOptions,

  unsupportedMediaType: {
    httpStatus: 415,
    code: 'UNSUPPORTED_MEDIA_TYPE',
    name: 'Unsupported Media Type Error',
    message: 'Unsupported media type.',
    uiMessage: 'The file type is not supported.',
    type: 'http',
  } satisfies ErrorXOptions,

  rangeNotSatisfiable: {
    httpStatus: 416,
    code: 'RANGE_NOT_SATISFIABLE',
    name: 'Range Not Satisfiable Error',
    message: 'Range not satisfiable.',
    uiMessage: 'The requested range cannot be satisfied.',
    type: 'http',
  } satisfies ErrorXOptions,

  expectationFailed: {
    httpStatus: 417,
    code: 'EXPECTATION_FAILED',
    name: 'Expectation Failed Error',
    message: 'Expectation failed.',
    uiMessage: 'The server cannot meet the requirements of the request.',
    type: 'http',
  } satisfies ErrorXOptions,

  imATeapot: {
    httpStatus: 418,
    code: 'IM_A_TEAPOT',
    name: 'Im A Teapot Error',
    message: "I'm a teapot.",
    uiMessage: "I'm a teapot and cannot brew coffee.",
    type: 'http',
  } satisfies ErrorXOptions,

  unprocessableEntity: {
    httpStatus: 422,
    code: 'UNPROCESSABLE_ENTITY',
    name: 'Unprocessable Entity Error',
    message: 'Unprocessable entity.',
    uiMessage: 'The request contains invalid data. Please check your input.',
    type: 'http',
  } satisfies ErrorXOptions,

  locked: {
    httpStatus: 423,
    code: 'LOCKED',
    name: 'Locked Error',
    message: 'Locked.',
    uiMessage: 'This resource is locked and cannot be modified.',
    type: 'http',
  } satisfies ErrorXOptions,

  failedDependency: {
    httpStatus: 424,
    code: 'FAILED_DEPENDENCY',
    name: 'Failed Dependency Error',
    message: 'Failed dependency.',
    uiMessage: 'The request failed due to a dependency error.',
    type: 'http',
  } satisfies ErrorXOptions,

  tooEarly: {
    httpStatus: 425,
    code: 'TOO_EARLY',
    name: 'Too Early Error',
    message: 'Too early.',
    uiMessage: 'The request was sent too early. Please try again later.',
    type: 'http',
  } satisfies ErrorXOptions,

  upgradeRequired: {
    httpStatus: 426,
    code: 'UPGRADE_REQUIRED',
    name: 'Upgrade Required Error',
    message: 'Upgrade required.',
    uiMessage: 'Please upgrade to continue using this service.',
    type: 'http',
  } satisfies ErrorXOptions,

  preconditionRequired: {
    httpStatus: 428,
    code: 'PRECONDITION_REQUIRED',
    name: 'Precondition Required Error',
    message: 'Precondition required.',
    uiMessage: 'Required conditions are missing from the request.',
    type: 'http',
  } satisfies ErrorXOptions,

  tooManyRequests: {
    httpStatus: 429,
    code: 'TOO_MANY_REQUESTS',
    name: 'Too Many Requests Error',
    message: 'Too many requests.',
    uiMessage: 'You have made too many requests. Please wait and try again.',
    type: 'http',
  } satisfies ErrorXOptions,

  requestHeaderFieldsTooLarge: {
    httpStatus: 431,
    code: 'REQUEST_HEADER_FIELDS_TOO_LARGE',
    name: 'Request Header Fields Too Large Error',
    message: 'Request header fields too large.',
    uiMessage: 'The request headers are too large.',
    type: 'http',
  } satisfies ErrorXOptions,

  unavailableForLegalReasons: {
    httpStatus: 451,
    code: 'UNAVAILABLE_FOR_LEGAL_REASONS',
    name: 'Unavailable For Legal Reasons Error',
    message: 'Unavailable for legal reasons.',
    uiMessage: 'This content is unavailable for legal reasons.',
    type: 'http',
  } satisfies ErrorXOptions,

  // 5xx Server Errors
  internalServerError: {
    httpStatus: 500,
    code: 'INTERNAL_SERVER_ERROR',
    name: 'Internal Server Error',
    message: 'Internal server error.',
    uiMessage: 'An unexpected error occurred. Please try again later.',
    type: 'http',
  } satisfies ErrorXOptions,

  notImplemented: {
    httpStatus: 501,
    code: 'NOT_IMPLEMENTED',
    name: 'Not Implemented Error',
    message: 'Not implemented.',
    uiMessage: 'This feature is not yet available.',
    type: 'http',
  } satisfies ErrorXOptions,

  badGateway: {
    httpStatus: 502,
    code: 'BAD_GATEWAY',
    name: 'Bad Gateway Error',
    message: 'Bad gateway.',
    uiMessage: 'Unable to connect to the server. Please try again later.',
    type: 'http',
  } satisfies ErrorXOptions,

  serviceUnavailable: {
    httpStatus: 503,
    code: 'SERVICE_UNAVAILABLE',
    name: 'Service Unavailable Error',
    message: 'Service unavailable.',
    uiMessage: 'The service is temporarily unavailable. Please try again later.',
    type: 'http',
  } satisfies ErrorXOptions,

  gatewayTimeout: {
    httpStatus: 504,
    code: 'GATEWAY_TIMEOUT',
    name: 'Gateway Timeout Error',
    message: 'Gateway timeout.',
    uiMessage: 'The server took too long to respond. Please try again.',
    type: 'http',
  } satisfies ErrorXOptions,

  httpVersionNotSupported: {
    httpStatus: 505,
    code: 'HTTP_VERSION_NOT_SUPPORTED',
    name: 'HTTP Version Not Supported Error',
    message: 'HTTP version not supported.',
    uiMessage: 'Your browser version is not supported.',
    type: 'http',
  } satisfies ErrorXOptions,

  variantAlsoNegotiates: {
    httpStatus: 506,
    code: 'VARIANT_ALSO_NEGOTIATES',
    name: 'Variant Also Negotiates Error',
    message: 'Variant also negotiates.',
    uiMessage: 'The server has an internal configuration error.',
    type: 'http',
  } satisfies ErrorXOptions,

  insufficientStorage: {
    httpStatus: 507,
    code: 'INSUFFICIENT_STORAGE',
    name: 'Insufficient Storage Error',
    message: 'Insufficient storage.',
    uiMessage: 'The server has insufficient storage to complete the request.',
    type: 'http',
  } satisfies ErrorXOptions,

  loopDetected: {
    httpStatus: 508,
    code: 'LOOP_DETECTED',
    name: 'Loop Detected Error',
    message: 'Loop detected.',
    uiMessage: 'The server detected an infinite loop.',
    type: 'http',
  } satisfies ErrorXOptions,

  notExtended: {
    httpStatus: 510,
    code: 'NOT_EXTENDED',
    name: 'Not Extended Error',
    message: 'Not extended.',
    uiMessage: 'Additional extensions are required.',
    type: 'http',
  } satisfies ErrorXOptions,

  networkAuthenticationRequired: {
    httpStatus: 511,
    code: 'NETWORK_AUTHENTICATION_REQUIRED',
    name: 'Network Authentication Required Error',
    message: 'Network authentication required.',
    uiMessage: 'Network authentication is required to access this resource.',
    type: 'http',
  } satisfies ErrorXOptions,
} as const;
