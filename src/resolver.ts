import { deepmerge } from 'deepmerge-ts';
import type { ErrorX } from './error';
import type {
  ErrorXBaseConfig,
  ErrorXResolverOptions,
  ErrorXResolverTypeConfig,
  ResolveContext,
} from './types';

/**
 * Resolves ErrorX errors to enhanced presentation objects.
 * Supports i18n translations, documentation URLs, and custom properties.
 *
 * @example
 * ```typescript
 * const resolver = new ErrorXResolver({
 *   i18n: { resolver: i18next.t },
 *   docs: { baseUrl: 'https://docs.example.com' },
 *   onResolveType: (error) => error.code.startsWith('API_') ? 'api' : 'general',
 *   configs: {
 *     api: { namespace: 'errors.api', docsPath: '/api' },
 *     general: { namespace: 'errors' },
 *   },
 * });
 *
 * const result = resolver.resolve(error, 'es');
 * ```
 *
 * @public
 */
export class ErrorXResolver<
  TConfig extends ErrorXBaseConfig = ErrorXBaseConfig,
  TResult = ResolveContext<TConfig>,
> {
  private readonly options: ErrorXResolverOptions<TConfig, TResult>;
  private readonly defaultKeyTemplate = '{namespace}.{code}';

  constructor(options: ErrorXResolverOptions<TConfig, TResult>) {
    this.options = options;
  }

  /**
   * Resolves an error to its enhanced representation.
   *
   * @param error - The ErrorX instance to resolve
   * @param _locale - Optional locale for i18n (passed to resolver function)
   * @returns The resolved result (ResolveContext or custom TResult)
   */
  resolve(error: ErrorX, _locale?: string): TResult {
    const errorType = this.options.onResolveType(error);
    const config = this.mergeConfig(error, errorType);
    const i18nKey = this.buildI18nKey(error, config, errorType);
    const uiMessage = this.resolveUiMessage(error, config, i18nKey, errorType);
    const docsUrl = this.buildDocsUrl(error, config);

    const context: ResolveContext<TConfig> = {
      uiMessage,
      docsUrl,
      i18nKey,
      errorType,
      config,
    };

    if (this.options.onResolve) {
      return this.options.onResolve(error, context);
    }

    return context as TResult;
  }

  /**
   * Merges configuration from multiple layers in priority order.
   *
   * Configuration is merged in this order (later values override earlier):
   * 1. `defaults` - Base configuration for all error types
   * 2. `configs[errorType]` - Type-specific configuration
   * 3. `configs[errorType].presets[error.code]` - Per-error-code overrides
   *
   * @param error - The ErrorX instance being resolved
   * @param errorType - The error type key returned by `onResolveType`
   * @returns Merged configuration object
   *
   * @example
   * ```typescript
   * // Given this resolver setup:
   * // defaults: { namespace: 'errors' }
   * // configs.api: { namespace: 'errors.api', docsPath: '/api' }
   * // configs.api.presets.AUTH_EXPIRED: { docsPath: '/api/auth' }
   *
   * // For an error with code 'AUTH_EXPIRED' and type 'api':
   * // Result: { namespace: 'errors.api', docsPath: '/api/auth' }
   * ```
   */
  private mergeConfig(error: ErrorX, errorType: string): TConfig {
    const typeConfig = this.options.configs[errorType] as
      | ErrorXResolverTypeConfig<TConfig>
      | undefined;
    const presetConfig = typeConfig?.presets?.[error.code];

    // Remove presets from typeConfig before merging (it's meta, not a config property)
    const { presets: _, ...typeConfigWithoutPresets } = typeConfig ?? {};

    const merged = deepmerge(
      this.options.defaults ?? {},
      typeConfigWithoutPresets,
      presetConfig ?? {}
    ) as TConfig;

    return merged;
  }

  /**
   * Builds the i18n translation key from the configured template.
   *
   * Supports these placeholders in the template:
   * - `{namespace}` - Replaced with `config.namespace`
   * - `{code}` - Replaced with `error.code`
   * - `{name}` - Replaced with `error.name`
   * - `{errorType}` - Replaced with the resolved error type
   *
   * @param error - The ErrorX instance being resolved
   * @param config - The merged configuration for this error
   * @param errorType - The error type key returned by `onResolveType`
   * @returns The built translation key string
   *
   * @example
   * ```typescript
   * // With template '{namespace}.{code}' (default):
   * // namespace: 'errors.api', code: 'AUTH_EXPIRED'
   * // Result: 'errors.api.AUTH_EXPIRED'
   *
   * // With template '{errorType}.{name}.{code}':
   * // errorType: 'api', name: 'AuthError', code: 'AUTH_EXPIRED'
   * // Result: 'api.AuthError.AUTH_EXPIRED'
   * ```
   */
  private buildI18nKey(error: ErrorX, config: TConfig, errorType: string): string {
    const template = this.options.i18n?.keyTemplate ?? this.defaultKeyTemplate;
    const namespace = (config as { namespace?: string }).namespace ?? '';

    return template
      .replace('{namespace}', namespace)
      .replace('{code}', error.code)
      .replace('{name}', error.name)
      .replace('{errorType}', errorType);
  }

  /**
   * Resolves the user-friendly message for an error.
   *
   * Resolution follows this priority order (first defined value wins):
   * 1. `configs[errorType].presets[code].uiMessage` - Most specific override
   * 2. `i18n.resolver(key, params)` - Translation from i18n library (if configured)
   * 3. `configs[errorType].uiMessage` - Type-level fallback message
   * 4. `defaults.uiMessage` - Global fallback message
   * 5. `undefined` - No message available
   *
   * When using i18n, the resolver function receives the built i18n key and
   * the error's metadata as interpolation parameters.
   *
   * @param error - The ErrorX instance being resolved
   * @param _config - The merged configuration (unused, config accessed via options)
   * @param i18nKey - The pre-built translation key
   * @param errorType - The error type key returned by `onResolveType`
   * @returns The resolved user-friendly message, or undefined
   *
   * @example
   * ```typescript
   * // Priority 1: Preset-specific message
   * // configs.api.presets.AUTH_EXPIRED.uiMessage: 'Your session has expired'
   * // Result: 'Your session has expired'
   *
   * // Priority 2: i18n translation (if no preset message)
   * // i18n.resolver('errors.api.AUTH_EXPIRED', { userId: 123 })
   * // Result: Translation from i18n library
   * ```
   */
  private resolveUiMessage(
    error: ErrorX,
    _config: TConfig,
    i18nKey: string,
    errorType: string
  ): string | undefined {
    const typeConfig = this.options.configs[errorType];
    const presetUiMessage = typeConfig?.presets?.[error.code]?.uiMessage as string | undefined;

    // 1. Preset-level uiMessage (highest priority override)
    if (presetUiMessage !== undefined) {
      return presetUiMessage;
    }

    // 2. i18n resolver (if configured)
    if (this.options.i18n?.resolver) {
      const params = error.metadata ?? {};
      // Note: locale handling depends on the user's i18n library
      // They can use it in their resolver function as needed
      return this.options.i18n.resolver(i18nKey, params);
    }

    // 3. Type-level uiMessage
    const typeUiMessage = (typeConfig as { uiMessage?: string } | undefined)?.uiMessage;
    if (typeUiMessage !== undefined) {
      return typeUiMessage;
    }

    // 4. Defaults uiMessage
    const defaultsUiMessage = (this.options.defaults as { uiMessage?: string } | undefined)
      ?.uiMessage;
    if (defaultsUiMessage !== undefined) {
      return defaultsUiMessage;
    }

    // 5. undefined
    return undefined;
  }

  /**
   * Builds the full documentation URL for an error.
   *
   * Constructs the URL by combining:
   * - `docs.baseUrl` - The base documentation URL (e.g., 'https://docs.example.com')
   * - `config.docsPath` - The path segment for this error type (e.g., '/api')
   * - `#error.code` - Hash fragment for the specific error code
   *
   * Returns an empty string if both baseUrl and docsPath are empty.
   *
   * @param error - The ErrorX instance being resolved
   * @param config - The merged configuration for this error
   * @returns The full documentation URL, or empty string if not configured
   *
   * @example
   * ```typescript
   * // docs.baseUrl: 'https://docs.example.com'
   * // config.docsPath: '/api/errors'
   * // error.code: 'AUTH_EXPIRED'
   * // Result: 'https://docs.example.com/api/errors#AUTH_EXPIRED'
   * ```
   */
  private buildDocsUrl(error: ErrorX, config: TConfig): string {
    const baseUrl = this.options.docs?.baseUrl ?? '';
    const docsPath = (config as { docsPath?: string }).docsPath ?? '';

    if (!baseUrl && !docsPath) {
      return '';
    }

    return `${baseUrl}${docsPath}#${error.code}`;
  }
}
