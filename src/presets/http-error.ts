import { ErrorX } from '../error';
import type { ErrorXBasePresetKey, ErrorXMetadata, ErrorXOptions, ErrorXTransform } from '../types';

/**
 * HTTP status code presets for all standard codes.
 * Defined outside the class to enable type inference for preset keys.
 */
const httpPresets = {
  // 4xx Client Errors
  400: {
    code: 'BAD_REQUEST',
    name: 'BadRequestError',
    message: 'Bad request.',
    uiMessage: 'The request could not be processed. Please check your input and try again.',
  },
  401: {
    code: 'UNAUTHORIZED',
    name: 'UnauthorizedError',
    message: 'Unauthorized.',
    uiMessage: 'Authentication required. Please log in to continue.',
  },
  402: {
    code: 'PAYMENT_REQUIRED',
    name: 'PaymentRequiredError',
    message: 'Payment required.',
    uiMessage: 'Payment is required to access this resource.',
  },
  403: {
    code: 'FORBIDDEN',
    name: 'ForbiddenError',
    message: 'Forbidden.',
    uiMessage: 'You do not have permission to access this resource.',
  },
  404: {
    code: 'NOT_FOUND',
    name: 'NotFoundError',
    message: 'Not found.',
    uiMessage: 'The requested resource could not be found.',
  },
  405: {
    code: 'METHOD_NOT_ALLOWED',
    name: 'MethodNotAllowedError',
    message: 'Method not allowed.',
    uiMessage: 'This action is not allowed for the requested resource.',
  },
  406: {
    code: 'NOT_ACCEPTABLE',
    name: 'NotAcceptableError',
    message: 'Not acceptable.',
    uiMessage: 'The requested format is not supported.',
  },
  407: {
    code: 'PROXY_AUTHENTICATION_REQUIRED',
    name: 'ProxyAuthenticationRequiredError',
    message: 'Proxy authentication required.',
    uiMessage: 'Proxy authentication is required to access this resource.',
  },
  408: {
    code: 'REQUEST_TIMEOUT',
    name: 'RequestTimeoutError',
    message: 'Request timeout.',
    uiMessage: 'The request took too long to complete. Please try again.',
  },
  409: {
    code: 'CONFLICT',
    name: 'ConflictError',
    message: 'Conflict.',
    uiMessage: 'The request conflicts with the current state. Please refresh and try again.',
  },
  410: {
    code: 'GONE',
    name: 'GoneError',
    message: 'Gone.',
    uiMessage: 'This resource is no longer available.',
  },
  411: {
    code: 'LENGTH_REQUIRED',
    name: 'LengthRequiredError',
    message: 'Length required.',
    uiMessage: 'The request is missing required length information.',
  },
  412: {
    code: 'PRECONDITION_FAILED',
    name: 'PreconditionFailedError',
    message: 'Precondition failed.',
    uiMessage: 'A required condition was not met. Please try again.',
  },
  413: {
    code: 'PAYLOAD_TOO_LARGE',
    name: 'PayloadTooLargeError',
    message: 'Payload too large.',
    uiMessage: 'The request is too large. Please reduce the size and try again.',
  },
  414: {
    code: 'URI_TOO_LONG',
    name: 'UriTooLongError',
    message: 'URI too long.',
    uiMessage: 'The request URL is too long.',
  },
  415: {
    code: 'UNSUPPORTED_MEDIA_TYPE',
    name: 'UnsupportedMediaTypeError',
    message: 'Unsupported media type.',
    uiMessage: 'The file type is not supported.',
  },
  416: {
    code: 'RANGE_NOT_SATISFIABLE',
    name: 'RangeNotSatisfiableError',
    message: 'Range not satisfiable.',
    uiMessage: 'The requested range cannot be satisfied.',
  },
  417: {
    code: 'EXPECTATION_FAILED',
    name: 'ExpectationFailedError',
    message: 'Expectation failed.',
    uiMessage: 'The server cannot meet the requirements of the request.',
  },
  418: {
    code: 'IM_A_TEAPOT',
    name: 'ImATeapotError',
    message: "I'm a teapot.",
    uiMessage: "I'm a teapot and cannot brew coffee.",
  },
  422: {
    code: 'UNPROCESSABLE_ENTITY',
    name: 'UnprocessableEntityError',
    message: 'Unprocessable entity.',
    uiMessage: 'The request contains invalid data. Please check your input.',
  },
  423: {
    code: 'LOCKED',
    name: 'LockedError',
    message: 'Locked.',
    uiMessage: 'This resource is locked and cannot be modified.',
  },
  424: {
    code: 'FAILED_DEPENDENCY',
    name: 'FailedDependencyError',
    message: 'Failed dependency.',
    uiMessage: 'The request failed due to a dependency error.',
  },
  425: {
    code: 'TOO_EARLY',
    name: 'TooEarlyError',
    message: 'Too early.',
    uiMessage: 'The request was sent too early. Please try again later.',
  },
  426: {
    code: 'UPGRADE_REQUIRED',
    name: 'UpgradeRequiredError',
    message: 'Upgrade required.',
    uiMessage: 'Please upgrade to continue using this service.',
  },
  428: {
    code: 'PRECONDITION_REQUIRED',
    name: 'PreconditionRequiredError',
    message: 'Precondition required.',
    uiMessage: 'Required conditions are missing from the request.',
  },
  429: {
    code: 'TOO_MANY_REQUESTS',
    name: 'TooManyRequestsError',
    message: 'Too many requests.',
    uiMessage: 'You have made too many requests. Please wait and try again.',
  },
  431: {
    code: 'REQUEST_HEADER_FIELDS_TOO_LARGE',
    name: 'RequestHeaderFieldsTooLargeError',
    message: 'Request header fields too large.',
    uiMessage: 'The request headers are too large.',
  },
  451: {
    code: 'UNAVAILABLE_FOR_LEGAL_REASONS',
    name: 'UnavailableForLegalReasonsError',
    message: 'Unavailable for legal reasons.',
    uiMessage: 'This content is unavailable for legal reasons.',
  },

  // 5xx Server Errors
  500: {
    code: 'INTERNAL_SERVER_ERROR',
    name: 'InternalServerError',
    message: 'Internal server error.',
    uiMessage: 'An unexpected error occurred. Please try again later.',
  },
  501: {
    code: 'NOT_IMPLEMENTED',
    name: 'NotImplementedError',
    message: 'Not implemented.',
    uiMessage: 'This feature is not yet available.',
  },
  502: {
    code: 'BAD_GATEWAY',
    name: 'BadGatewayError',
    message: 'Bad gateway.',
    uiMessage: 'Unable to connect to the server. Please try again later.',
  },
  503: {
    code: 'SERVICE_UNAVAILABLE',
    name: 'ServiceUnavailableError',
    message: 'Service unavailable.',
    uiMessage: 'The service is temporarily unavailable. Please try again later.',
  },
  504: {
    code: 'GATEWAY_TIMEOUT',
    name: 'GatewayTimeoutError',
    message: 'Gateway timeout.',
    uiMessage: 'The server took too long to respond. Please try again.',
  },
  505: {
    code: 'HTTP_VERSION_NOT_SUPPORTED',
    name: 'HttpVersionNotSupportedError',
    message: 'HTTP version not supported.',
    uiMessage: 'Your browser version is not supported.',
  },
  506: {
    code: 'VARIANT_ALSO_NEGOTIATES',
    name: 'VariantAlsoNegotiatesError',
    message: 'Variant also negotiates.',
    uiMessage: 'The server has an internal configuration error.',
  },
  507: {
    code: 'INSUFFICIENT_STORAGE',
    name: 'InsufficientStorageError',
    message: 'Insufficient storage.',
    uiMessage: 'The server has insufficient storage to complete the request.',
  },
  508: {
    code: 'LOOP_DETECTED',
    name: 'LoopDetectedError',
    message: 'Loop detected.',
    uiMessage: 'The server detected an infinite loop.',
  },
  510: {
    code: 'NOT_EXTENDED',
    name: 'NotExtendedError',
    message: 'Not extended.',
    uiMessage: 'Additional extensions are required.',
  },
  511: {
    code: 'NETWORK_AUTHENTICATION_REQUIRED',
    name: 'NetworkAuthenticationRequiredError',
    message: 'Network authentication required.',
    uiMessage: 'Network authentication is required to access this resource.',
  },
} as const satisfies Record<number, ErrorXOptions<ErrorXMetadata>>;

/**
 * Valid HTTP status codes for HTTPErrorX.create()
 * Derived from the presets object. Provides autocomplete for known codes
 * while allowing any number for flexibility.
 */
export type HTTPErrorXPresetKey = keyof typeof httpPresets | ErrorXBasePresetKey;

/**
 * Metadata type for HTTP errors.
 * Provides context about the HTTP request that failed.
 *
 * @public
 */
export type HTTPErrorXMetadata = {
  /** The endpoint/URL that was requested */
  endpoint?: string;
  /** The HTTP method used (GET, POST, etc.) */
  method?: string;
  /** Additional metadata */
  [key: string]: unknown;
};

/**
 * HTTP Error class with presets for all standard HTTP status codes.
 *
 * Provides a type-safe, ergonomic way to create HTTP errors with:
 * - Numeric status code presets (400, 401, 404, 500, etc.)
 * - Automatic httpStatus from preset key
 * - Full `instanceof` support
 * - Typed metadata for HTTP context
 *
 * @example
 * ```typescript
 * // Basic usage with status code
 * throw HTTPErrorX.create(404)
 * throw HTTPErrorX.create(401)
 * throw HTTPErrorX.create(500)
 *
 * // With custom message
 * throw HTTPErrorX.create(404, { message: 'User not found' })
 *
 * // With metadata
 * throw HTTPErrorX.create(401, {
 *   message: 'Invalid token',
 *   metadata: { endpoint: '/api/users', method: 'GET' }
 * })
 *
 * // With error chaining
 * try {
 *   await fetchUser(id)
 * } catch (err) {
 *   throw HTTPErrorX.create(500, { cause: err })
 * }
 *
 * // Just overrides (uses default 500)
 * throw HTTPErrorX.create({ message: 'Something went wrong' })
 *
 * // instanceof checks
 * if (error instanceof HTTPErrorX) {
 *   console.log(error.httpStatus) // 404
 * }
 * ```
 *
 * @public
 */
export class HTTPErrorX extends ErrorX<HTTPErrorXMetadata> {
  /**
   * HTTP status code presets for all standard codes.
   * Keys are numeric status codes (400, 401, 404, 500, etc.)
   */
  static presets = httpPresets;

  /** Default to 500 Internal Server Error when no preset specified */
  static defaultPreset = 500;

  /** Default httpStatus for all HTTPErrorXs */
  static defaults = { httpStatus: 500 };

  /**
   * Transform that automatically sets httpStatus from the preset key.
   * Only sets httpStatus from presetKey if it matches a known preset.
   */
  static transform: ErrorXTransform<HTTPErrorXMetadata> = (opts, { presetKey }) => ({
    ...opts,
    httpStatus:
      typeof presetKey === 'number' && presetKey in httpPresets ? presetKey : opts.httpStatus,
  });

  /**
   * Creates an HTTPErrorX from a status code preset.
   *
   * @param statusCode - HTTP status code (provides autocomplete for standard codes)
   * @param overrides - Optional overrides for the preset values
   * @returns HTTPErrorX instance
   */
  static override create(
    statusCode?: HTTPErrorXPresetKey,
    overrides?: Partial<ErrorXOptions<HTTPErrorXMetadata>>
  ): HTTPErrorX;
  static override create(overrides?: Partial<ErrorXOptions<HTTPErrorXMetadata>>): HTTPErrorX;
  static override create(
    statusCodeOrOverrides?: HTTPErrorXPresetKey | Partial<ErrorXOptions<HTTPErrorXMetadata>>,
    overrides?: Partial<ErrorXOptions<HTTPErrorXMetadata>>
  ): HTTPErrorX {
    return ErrorX.create.call(
      HTTPErrorX,
      statusCodeOrOverrides as number | Partial<ErrorXOptions<ErrorXMetadata>>,
      overrides
    ) as HTTPErrorX;
  }
}
