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
    const uiMessage = this.resolveUiMessage(error, config, i18nKey);
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
   * Merges config from defaults → type → preset
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
   * Builds the i18n key from template
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
   * Resolves uiMessage following the priority order:
   * 1. presets[code].uiMessage (already merged into config if from preset)
   * 2. i18n resolver result (if configured)
   * 3. configs[errorType].uiMessage (fallback)
   * 4. defaults.uiMessage (fallback)
   * 5. undefined
   */
  private resolveUiMessage(error: ErrorX, _config: TConfig, i18nKey: string): string | undefined {
    const typeConfig = this.options.configs[this.options.onResolveType(error)];
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
   * Builds the full documentation URL
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
