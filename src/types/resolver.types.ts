import type { ErrorX } from '../error';

/**
 * Base configuration properties provided by error-x.
 * Users extend this with their custom properties via ErrorXResolverConfig.
 *
 * @public
 */
export type ErrorXBaseConfig = {
  /** i18n namespace for translation key resolution (e.g., 'errors.api') */
  namespace: string;
  /** Path appended to docs base URL (e.g., '/api') */
  docsPath?: string;
  /** Static UI message - overrides i18n at preset level, fallback otherwise */
  uiMessage?: string;
};

/**
 * Type helper combining ErrorXBaseConfig with user's custom config properties.
 *
 * @example
 * ```typescript
 * type MyConfig = ErrorXResolverConfig<{
 *   severity: 'error' | 'warning' | 'info';
 *   retryable: boolean;
 * }>;
 * ```
 *
 * @public
 */
export type ErrorXResolverConfig<
  TCustom extends Record<string, unknown> = Record<string, unknown>,
> = ErrorXBaseConfig & TCustom;

/**
 * Context object passed to the onResolve callback.
 * Contains computed values and merged config for the error.
 *
 * @public
 */
export type ResolveContext<TConfig extends ErrorXBaseConfig = ErrorXBaseConfig> = {
  /** Resolved UI message (from i18n or static config) */
  uiMessage: string | undefined;
  /** Full documentation URL */
  docsUrl: string;
  /** The resolved i18n key (e.g., 'errors.api.AUTH_EXPIRED') */
  i18nKey: string;
  /** The error type returned by onResolveType callback */
  errorType: string;
  /** Merged config for this error (defaults + type + preset) */
  config: TConfig;
};

/**
 * i18n configuration for the resolver.
 *
 * @public
 */
export type ErrorXResolverI18nConfig = {
  /**
   * User-provided translation function.
   * Receives the i18n key and optional interpolation params (from error.metadata).
   *
   * @example
   * ```typescript
   * resolver: (key, params) => i18next.t(key, params)
   * ```
   */
  resolver: (key: string, params?: Record<string, unknown>) => string;
  /**
   * Template for building translation keys.
   * Available placeholders: {namespace}, {code}, {name}, {errorType}
   * @default '{namespace}.{code}'
   */
  keyTemplate?: string;
};

/**
 * Documentation configuration for the resolver.
 *
 * @public
 */
export type ErrorXResolverDocsConfig = {
  /**
   * Base URL for documentation.
   * @default '' (empty string)
   */
  baseUrl?: string;
};

/**
 * Per-error-type configuration with optional preset overrides.
 *
 * @public
 */
export type ErrorXResolverTypeConfig<TConfig extends ErrorXBaseConfig = ErrorXBaseConfig> = Omit<
  TConfig,
  'presets'
> & {
  /** Per-error-code overrides within this type */
  presets?: {
    [code: string]: Partial<ErrorXBaseConfig> & Partial<Omit<TConfig, keyof ErrorXBaseConfig>>;
  };
};

/**
 * Full configuration options for ErrorXResolver.
 *
 * @public
 */
export type ErrorXResolverOptions<
  TConfig extends ErrorXBaseConfig = ErrorXBaseConfig,
  TResult = ResolveContext<TConfig>,
> = {
  /** Optional i18n configuration. If not provided, relies on static uiMessage values. */
  i18n?: ErrorXResolverI18nConfig;

  /** Optional documentation URL configuration. */
  docs?: ErrorXResolverDocsConfig;

  /**
   * Callback to determine the error type key.
   * The returned string is used to look up config in the configs object.
   *
   * @example
   * ```typescript
   * onResolveType: (error) => {
   *   if (error instanceof APIErrorX) return 'api';
   *   if (error.code.startsWith('DB_')) return 'database';
   *   return 'general';
   * }
   * ```
   */
  onResolveType: (error: ErrorX) => string;

  /**
   * Optional callback to customize the resolve output.
   * If not provided, resolve() returns the ResolveContext directly.
   *
   * @example
   * ```typescript
   * onResolve: (error, context) => ({
   *   message: context.uiMessage,
   *   docs: context.docsUrl,
   *   severity: context.config.severity,
   * })
   * ```
   */
  onResolve?: (error: ErrorX, context: ResolveContext<TConfig>) => TResult;

  /** Default config values (fallback for all error types) */
  defaults?: Partial<ErrorXBaseConfig> & Partial<Omit<TConfig, keyof ErrorXBaseConfig>>;

  /** Per-error-type configurations (partial configs get merged with defaults) */
  configs: Record<string, Partial<ErrorXResolverTypeConfig<TConfig>>>;
};
