import type { ErrorXOptions } from './types.js'

/**
 * Preset configurations for common errors organized by category.
 * Each preset includes httpStatus (for HTTP errors), code, name, message, and uiMessage.
 *
 * @example
 * ```typescript
 * import { ErrorX, ErrorPresets } from '@bombillazo/error-x'
 *
 * // Use preset directly
 * const error = new ErrorX(ErrorPresets.HTTP.NOT_FOUND)
 *
 * // Override preset values
 * const error = new ErrorX({
 *   ...ErrorPresets.HTTP.NOT_FOUND,
 *   message: 'User not found',
 *   metadata: { userId: 123 }
 * })
 *
 * // Use with additional options
 * const error = new ErrorX({
 *   ...ErrorPresets.HTTP.UNAUTHORIZED,
 *   actions: [{ action: 'redirect', payload: { redirectURL: '/login' } }]
 * })
 * ```
 *
 * @public
 */
export const PRESETS = {
  /**
   * HTTP error presets for common HTTP status codes.
   * Includes both 4xx client errors and 5xx server errors.
   */
  HTTP: {
    // 4xx Client Errors
    BAD_REQUEST: {
      httpStatus: 400,
      code: 'BAD_REQUEST',
      name: 'BadRequestError',
      message: 'Bad request',
      uiMessage: 'The request could not be processed. Please check your input and try again.',
      type: 'http',
    } satisfies ErrorXOptions,

    UNAUTHORIZED: {
      httpStatus: 401,
      code: 'UNAUTHORIZED',
      name: 'UnauthorizedError',
      message: 'Unauthorized',
      uiMessage: 'Authentication required. Please log in to continue.',
      type: 'http',
    } satisfies ErrorXOptions,

    PAYMENT_REQUIRED: {
      httpStatus: 402,
      code: 'PAYMENT_REQUIRED',
      name: 'PaymentRequiredError',
      message: 'Payment required',
      uiMessage: 'Payment is required to access this resource.',
      type: 'http',
    } satisfies ErrorXOptions,

    FORBIDDEN: {
      httpStatus: 403,
      code: 'FORBIDDEN',
      name: 'ForbiddenError',
      message: 'Forbidden',
      uiMessage: 'You do not have permission to access this resource.',
      type: 'http',
    } satisfies ErrorXOptions,

    NOT_FOUND: {
      httpStatus: 404,
      code: 'NOT_FOUND',
      name: 'NotFoundError',
      message: 'Not found',
      uiMessage: 'The requested resource could not be found.',
      type: 'http',
    } satisfies ErrorXOptions,

    METHOD_NOT_ALLOWED: {
      httpStatus: 405,
      code: 'METHOD_NOT_ALLOWED',
      name: 'MethodNotAllowedError',
      message: 'Method not allowed',
      uiMessage: 'This action is not allowed for the requested resource.',
      type: 'http',
    } satisfies ErrorXOptions,

    NOT_ACCEPTABLE: {
      httpStatus: 406,
      code: 'NOT_ACCEPTABLE',
      name: 'NotAcceptableError',
      message: 'Not acceptable',
      uiMessage: 'The requested format is not supported.',
      type: 'http',
    } satisfies ErrorXOptions,

    PROXY_AUTHENTICATION_REQUIRED: {
      httpStatus: 407,
      code: 'PROXY_AUTHENTICATION_REQUIRED',
      name: 'ProxyAuthenticationRequiredError',
      message: 'Proxy authentication required',
      uiMessage: 'Proxy authentication is required to access this resource.',
      type: 'http',
    } satisfies ErrorXOptions,

    REQUEST_TIMEOUT: {
      httpStatus: 408,
      code: 'REQUEST_TIMEOUT',
      name: 'RequestTimeoutError',
      message: 'Request timeout',
      uiMessage: 'The request took too long to complete. Please try again.',
      type: 'http',
    } satisfies ErrorXOptions,

    CONFLICT: {
      httpStatus: 409,
      code: 'CONFLICT',
      name: 'ConflictError',
      message: 'Conflict',
      uiMessage: 'The request conflicts with the current state. Please refresh and try again.',
      type: 'http',
    } satisfies ErrorXOptions,

    GONE: {
      httpStatus: 410,
      code: 'GONE',
      name: 'GoneError',
      message: 'Gone',
      uiMessage: 'This resource is no longer available.',
      type: 'http',
    } satisfies ErrorXOptions,

    LENGTH_REQUIRED: {
      httpStatus: 411,
      code: 'LENGTH_REQUIRED',
      name: 'LengthRequiredError',
      message: 'Length required',
      uiMessage: 'The request is missing required length information.',
      type: 'http',
    } satisfies ErrorXOptions,

    PRECONDITION_FAILED: {
      httpStatus: 412,
      code: 'PRECONDITION_FAILED',
      name: 'PreconditionFailedError',
      message: 'Precondition failed',
      uiMessage: 'A required condition was not met. Please try again.',
      type: 'http',
    } satisfies ErrorXOptions,

    PAYLOAD_TOO_LARGE: {
      httpStatus: 413,
      code: 'PAYLOAD_TOO_LARGE',
      name: 'PayloadTooLargeError',
      message: 'Payload too large',
      uiMessage: 'The request is too large. Please reduce the size and try again.',
      type: 'http',
    } satisfies ErrorXOptions,

    URI_TOO_LONG: {
      httpStatus: 414,
      code: 'URI_TOO_LONG',
      name: 'URITooLongError',
      message: 'URI too long',
      uiMessage: 'The request URL is too long.',
      type: 'http',
    } satisfies ErrorXOptions,

    UNSUPPORTED_MEDIA_TYPE: {
      httpStatus: 415,
      code: 'UNSUPPORTED_MEDIA_TYPE',
      name: 'UnsupportedMediaTypeError',
      message: 'Unsupported media type',
      uiMessage: 'The file type is not supported.',
      type: 'http',
    } satisfies ErrorXOptions,

    RANGE_NOT_SATISFIABLE: {
      httpStatus: 416,
      code: 'RANGE_NOT_SATISFIABLE',
      name: 'RangeNotSatisfiableError',
      message: 'Range not satisfiable',
      uiMessage: 'The requested range cannot be satisfied.',
      type: 'http',
    } satisfies ErrorXOptions,

    EXPECTATION_FAILED: {
      httpStatus: 417,
      code: 'EXPECTATION_FAILED',
      name: 'ExpectationFailedError',
      message: 'Expectation failed',
      uiMessage: 'The server cannot meet the requirements of the request.',
      type: 'http',
    } satisfies ErrorXOptions,

    IM_A_TEAPOT: {
      httpStatus: 418,
      code: 'IM_A_TEAPOT',
      name: 'ImATeapotError',
      message: "I'm a teapot",
      uiMessage: "I'm a teapot and cannot brew coffee.",
      type: 'http',
    } satisfies ErrorXOptions,

    UNPROCESSABLE_ENTITY: {
      httpStatus: 422,
      code: 'UNPROCESSABLE_ENTITY',
      name: 'UnprocessableEntityError',
      message: 'Unprocessable entity',
      uiMessage: 'The request contains invalid data. Please check your input.',
      type: 'http',
    } satisfies ErrorXOptions,

    LOCKED: {
      httpStatus: 423,
      code: 'LOCKED',
      name: 'LockedError',
      message: 'Locked',
      uiMessage: 'This resource is locked and cannot be modified.',
      type: 'http',
    } satisfies ErrorXOptions,

    FAILED_DEPENDENCY: {
      httpStatus: 424,
      code: 'FAILED_DEPENDENCY',
      name: 'FailedDependencyError',
      message: 'Failed dependency',
      uiMessage: 'The request failed due to a dependency error.',
      type: 'http',
    } satisfies ErrorXOptions,

    TOO_EARLY: {
      httpStatus: 425,
      code: 'TOO_EARLY',
      name: 'TooEarlyError',
      message: 'Too early',
      uiMessage: 'The request was sent too early. Please try again later.',
      type: 'http',
    } satisfies ErrorXOptions,

    UPGRADE_REQUIRED: {
      httpStatus: 426,
      code: 'UPGRADE_REQUIRED',
      name: 'UpgradeRequiredError',
      message: 'Upgrade required',
      uiMessage: 'Please upgrade to continue using this service.',
      type: 'http',
    } satisfies ErrorXOptions,

    PRECONDITION_REQUIRED: {
      httpStatus: 428,
      code: 'PRECONDITION_REQUIRED',
      name: 'PreconditionRequiredError',
      message: 'Precondition required',
      uiMessage: 'Required conditions are missing from the request.',
      type: 'http',
    } satisfies ErrorXOptions,

    TOO_MANY_REQUESTS: {
      httpStatus: 429,
      code: 'TOO_MANY_REQUESTS',
      name: 'TooManyRequestsError',
      message: 'Too many requests',
      uiMessage: 'You have made too many requests. Please wait and try again.',
      type: 'http',
    } satisfies ErrorXOptions,

    REQUEST_HEADER_FIELDS_TOO_LARGE: {
      httpStatus: 431,
      code: 'REQUEST_HEADER_FIELDS_TOO_LARGE',
      name: 'RequestHeaderFieldsTooLargeError',
      message: 'Request header fields too large',
      uiMessage: 'The request headers are too large.',
      type: 'http',
    } satisfies ErrorXOptions,

    UNAVAILABLE_FOR_LEGAL_REASONS: {
      httpStatus: 451,
      code: 'UNAVAILABLE_FOR_LEGAL_REASONS',
      name: 'UnavailableForLegalReasonsError',
      message: 'Unavailable for legal reasons',
      uiMessage: 'This content is unavailable for legal reasons.',
      type: 'http',
    } satisfies ErrorXOptions,

    // 5xx Server Errors
    INTERNAL_SERVER_ERROR: {
      httpStatus: 500,
      code: 'INTERNAL_SERVER_ERROR',
      name: 'InternalServerError',
      message: 'Internal server error',
      uiMessage: 'An unexpected error occurred. Please try again later.',
      type: 'http',
    } satisfies ErrorXOptions,

    NOT_IMPLEMENTED: {
      httpStatus: 501,
      code: 'NOT_IMPLEMENTED',
      name: 'NotImplementedError',
      message: 'Not implemented',
      uiMessage: 'This feature is not yet available.',
      type: 'http',
    } satisfies ErrorXOptions,

    BAD_GATEWAY: {
      httpStatus: 502,
      code: 'BAD_GATEWAY',
      name: 'BadGatewayError',
      message: 'Bad gateway',
      uiMessage: 'Unable to connect to the server. Please try again later.',
      type: 'http',
    } satisfies ErrorXOptions,

    SERVICE_UNAVAILABLE: {
      httpStatus: 503,
      code: 'SERVICE_UNAVAILABLE',
      name: 'ServiceUnavailableError',
      message: 'Service unavailable',
      uiMessage: 'The service is temporarily unavailable. Please try again later.',
      type: 'http',
    } satisfies ErrorXOptions,

    GATEWAY_TIMEOUT: {
      httpStatus: 504,
      code: 'GATEWAY_TIMEOUT',
      name: 'GatewayTimeoutError',
      message: 'Gateway timeout',
      uiMessage: 'The server took too long to respond. Please try again.',
      type: 'http',
    } satisfies ErrorXOptions,

    HTTP_VERSION_NOT_SUPPORTED: {
      httpStatus: 505,
      code: 'HTTP_VERSION_NOT_SUPPORTED',
      name: 'HTTPVersionNotSupportedError',
      message: 'HTTP version not supported',
      uiMessage: 'Your browser version is not supported.',
      type: 'http',
    } satisfies ErrorXOptions,

    VARIANT_ALSO_NEGOTIATES: {
      httpStatus: 506,
      code: 'VARIANT_ALSO_NEGOTIATES',
      name: 'VariantAlsoNegotiatesError',
      message: 'Variant also negotiates',
      uiMessage: 'The server has an internal configuration error.',
      type: 'http',
    } satisfies ErrorXOptions,

    INSUFFICIENT_STORAGE: {
      httpStatus: 507,
      code: 'INSUFFICIENT_STORAGE',
      name: 'InsufficientStorageError',
      message: 'Insufficient storage',
      uiMessage: 'The server has insufficient storage to complete the request.',
      type: 'http',
    } satisfies ErrorXOptions,

    LOOP_DETECTED: {
      httpStatus: 508,
      code: 'LOOP_DETECTED',
      name: 'LoopDetectedError',
      message: 'Loop detected',
      uiMessage: 'The server detected an infinite loop.',
      type: 'http',
    } satisfies ErrorXOptions,

    NOT_EXTENDED: {
      httpStatus: 510,
      code: 'NOT_EXTENDED',
      name: 'NotExtendedError',
      message: 'Not extended',
      uiMessage: 'Additional extensions are required.',
      type: 'http',
    } satisfies ErrorXOptions,

    NETWORK_AUTHENTICATION_REQUIRED: {
      httpStatus: 511,
      code: 'NETWORK_AUTHENTICATION_REQUIRED',
      name: 'NetworkAuthenticationRequiredError',
      message: 'Network authentication required',
      uiMessage: 'Network authentication is required to access this resource.',
      type: 'http',
    } satisfies ErrorXOptions,
  },
} as const
