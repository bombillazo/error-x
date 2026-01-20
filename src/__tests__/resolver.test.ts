import { describe, expect, it, vi } from 'vitest';
import { ErrorX } from '../error';
import { ErrorXResolver } from '../resolver';
import type { ErrorXResolverConfig } from '../types';

describe('ErrorXResolver', () => {
  describe('constructor', () => {
    it('should create resolver with minimal config', () => {
      const resolver = new ErrorXResolver({
        onResolveType: () => 'general',
        configs: {
          general: {
            namespace: 'errors',
          },
        },
      });

      expect(resolver).toBeInstanceOf(ErrorXResolver);
    });
  });

  describe('resolve', () => {
    it('should return ResolveContext with basic config', () => {
      const resolver = new ErrorXResolver({
        onResolveType: () => 'general',
        configs: {
          general: {
            namespace: 'errors',
          },
        },
      });

      const error = new ErrorX({ code: 'TEST_ERROR' });
      const result = resolver.resolve(error);

      expect(result).toEqual({
        uiMessage: undefined,
        docsUrl: '',
        i18nKey: 'errors.TEST_ERROR',
        errorType: 'general',
        config: {
          namespace: 'errors',
        },
      });
    });
  });

  describe('config hierarchy', () => {
    it('should merge defaults with type config', () => {
      type MyConfig = ErrorXResolverConfig<{ severity: string }>;

      const resolver = new ErrorXResolver<MyConfig>({
        onResolveType: () => 'api',
        defaults: {
          namespace: 'errors',
          severity: 'error',
        },
        configs: {
          api: {
            namespace: 'errors.api',
            // severity not specified, should come from defaults
          },
        },
      });

      const error = new ErrorX({ code: 'TEST' });
      const result = resolver.resolve(error);

      expect(result.config.namespace).toBe('errors.api');
      expect(result.config.severity).toBe('error');
    });

    it('should merge preset config over type config', () => {
      type MyConfig = ErrorXResolverConfig<{
        severity: string;
        retryable: boolean;
      }>;

      const resolver = new ErrorXResolver<MyConfig>({
        onResolveType: () => 'api',
        defaults: {
          namespace: 'errors',
          severity: 'error',
          retryable: false,
        },
        configs: {
          api: {
            namespace: 'errors.api',
            severity: 'error',
            retryable: false,
            presets: {
              NETWORK_TIMEOUT: {
                retryable: true,
                severity: 'warning',
              },
            },
          },
        },
      });

      const error = new ErrorX({ code: 'NETWORK_TIMEOUT' });
      const result = resolver.resolve(error);

      expect(result.config.namespace).toBe('errors.api');
      expect(result.config.severity).toBe('warning');
      expect(result.config.retryable).toBe(true);
    });

    it('should use defaults when type config is missing', () => {
      type MyConfig = ErrorXResolverConfig<{ severity: string }>;

      const resolver = new ErrorXResolver<MyConfig>({
        onResolveType: () => 'unknown',
        defaults: {
          namespace: 'errors.fallback',
          severity: 'error',
        },
        configs: {
          api: {
            namespace: 'errors.api',
            severity: 'warning',
          },
        },
      });

      const error = new ErrorX({ code: 'TEST' });
      const result = resolver.resolve(error);

      expect(result.config.namespace).toBe('errors.fallback');
      expect(result.config.severity).toBe('error');
    });
  });

  describe('i18n', () => {
    it('should build i18n key from default template', () => {
      const resolver = new ErrorXResolver({
        onResolveType: () => 'api',
        configs: {
          api: { namespace: 'errors.api' },
        },
      });

      const error = new ErrorX({ code: 'AUTH_EXPIRED' });
      const result = resolver.resolve(error);

      expect(result.i18nKey).toBe('errors.api.AUTH_EXPIRED');
    });

    it('should build i18n key from custom template', () => {
      const resolver = new ErrorXResolver({
        i18n: {
          resolver: (key) => key,
          keyTemplate: '{errorType}.{namespace}.codes.{code}',
        },
        onResolveType: () => 'api',
        configs: {
          api: { namespace: 'errors.api' },
        },
      });

      const error = new ErrorX({ code: 'AUTH_EXPIRED' });
      const result = resolver.resolve(error);

      expect(result.i18nKey).toBe('api.errors.api.codes.AUTH_EXPIRED');
    });

    it('should resolve uiMessage from i18n resolver', () => {
      const mockResolver = (key: string, params?: Record<string, unknown>) => {
        if (key === 'errors.api.AUTH_EXPIRED') {
          return `Session expired for user ${params?.userId}`;
        }
        return key;
      };

      const resolver = new ErrorXResolver({
        i18n: { resolver: mockResolver },
        onResolveType: () => 'api',
        configs: {
          api: { namespace: 'errors.api' },
        },
      });

      const error = new ErrorX({
        code: 'AUTH_EXPIRED',
        metadata: { userId: 123 },
      });
      const result = resolver.resolve(error);

      expect(result.uiMessage).toBe('Session expired for user 123');
    });

    it('should pass error.metadata to i18n resolver', () => {
      const mockResolver = vi.fn((key: string) => key);

      const resolver = new ErrorXResolver({
        i18n: { resolver: mockResolver },
        onResolveType: () => 'api',
        configs: {
          api: { namespace: 'errors.api' },
        },
      });

      const metadata = { userId: 123, action: 'login' };
      const error = new ErrorX({ code: 'TEST', metadata });
      resolver.resolve(error);

      expect(mockResolver).toHaveBeenCalledWith('errors.api.TEST', metadata);
    });
  });

  describe('uiMessage resolution order', () => {
    it('should prioritize preset uiMessage over i18n', () => {
      const mockResolver = vi.fn(() => 'from i18n');

      const resolver = new ErrorXResolver({
        i18n: { resolver: mockResolver },
        onResolveType: () => 'api',
        configs: {
          api: {
            namespace: 'errors.api',
            presets: {
              AUTH_EXPIRED: {
                uiMessage: 'from preset',
              },
            },
          },
        },
      });

      const error = new ErrorX({ code: 'AUTH_EXPIRED' });
      const result = resolver.resolve(error);

      expect(result.uiMessage).toBe('from preset');
      expect(mockResolver).not.toHaveBeenCalled();
    });

    it('should fall back to type uiMessage when no i18n', () => {
      const resolver = new ErrorXResolver({
        // No i18n configured
        onResolveType: () => 'api',
        configs: {
          api: {
            namespace: 'errors.api',
            uiMessage: 'API error occurred',
          },
        },
      });

      const error = new ErrorX({ code: 'UNKNOWN_ERROR' });
      const result = resolver.resolve(error);

      expect(result.uiMessage).toBe('API error occurred');
    });

    it('should fall back to defaults uiMessage when type has none', () => {
      const resolver = new ErrorXResolver({
        onResolveType: () => 'api',
        defaults: {
          namespace: 'errors',
          uiMessage: 'An error occurred',
        },
        configs: {
          api: {
            namespace: 'errors.api',
            // no uiMessage
          },
        },
      });

      const error = new ErrorX({ code: 'UNKNOWN_ERROR' });
      const result = resolver.resolve(error);

      expect(result.uiMessage).toBe('An error occurred');
    });

    it('should return undefined when no uiMessage configured anywhere', () => {
      const resolver = new ErrorXResolver({
        onResolveType: () => 'api',
        configs: {
          api: {
            namespace: 'errors.api',
          },
        },
      });

      const error = new ErrorX({ code: 'UNKNOWN_ERROR' });
      const result = resolver.resolve(error);

      expect(result.uiMessage).toBeUndefined();
    });

    it('should use i18n over type/defaults uiMessage', () => {
      const resolver = new ErrorXResolver({
        i18n: { resolver: () => 'from i18n' },
        onResolveType: () => 'api',
        defaults: {
          namespace: 'errors',
          uiMessage: 'from defaults',
        },
        configs: {
          api: {
            namespace: 'errors.api',
            uiMessage: 'from type config',
          },
        },
      });

      const error = new ErrorX({ code: 'TEST' });
      const result = resolver.resolve(error);

      expect(result.uiMessage).toBe('from i18n');
    });
  });

  describe('docs URL', () => {
    it('should build docs URL from baseUrl and docsPath', () => {
      const resolver = new ErrorXResolver({
        docs: { baseUrl: 'https://docs.example.com/errors' },
        onResolveType: () => 'api',
        configs: {
          api: {
            namespace: 'errors.api',
            docsPath: '/api',
          },
        },
      });

      const error = new ErrorX({ code: 'AUTH_EXPIRED' });
      const result = resolver.resolve(error);

      expect(result.docsUrl).toBe('https://docs.example.com/errors/api#AUTH_EXPIRED');
    });

    it('should return empty string when no docs configured', () => {
      const resolver = new ErrorXResolver({
        onResolveType: () => 'api',
        configs: {
          api: { namespace: 'errors.api' },
        },
      });

      const error = new ErrorX({ code: 'TEST' });
      const result = resolver.resolve(error);

      expect(result.docsUrl).toBe('');
    });

    it('should use docsPath from preset if specified', () => {
      const resolver = new ErrorXResolver({
        docs: { baseUrl: 'https://docs.example.com' },
        onResolveType: () => 'api',
        configs: {
          api: {
            namespace: 'errors.api',
            docsPath: '/api',
            presets: {
              SPECIAL_ERROR: {
                docsPath: '/special',
              },
            },
          },
        },
      });

      const error = new ErrorX({ code: 'SPECIAL_ERROR' });
      const result = resolver.resolve(error);

      expect(result.docsUrl).toBe('https://docs.example.com/special#SPECIAL_ERROR');
    });
  });

  describe('onResolve callback', () => {
    it('should return custom result when onResolve is provided', () => {
      type MyConfig = ErrorXResolverConfig<{ severity: string }>;
      type MyResult = { msg: string; level: string };

      const resolver = new ErrorXResolver<MyConfig, MyResult>({
        onResolveType: () => 'api',
        onResolve: (error, context) => ({
          msg: context.uiMessage ?? error.message,
          level: context.config.severity,
        }),
        defaults: {
          namespace: 'errors',
          severity: 'error',
          uiMessage: 'Something went wrong',
        },
        configs: {
          api: {
            namespace: 'errors.api',
            severity: 'warning',
          },
        },
      });

      const error = new ErrorX({ code: 'TEST', message: 'Test error' });
      const result = resolver.resolve(error);

      expect(result).toEqual({
        msg: 'Something went wrong',
        level: 'warning',
      });
    });

    it('should pass error object to onResolve callback', () => {
      const onResolve = vi.fn((error, _context) => ({
        code: error.code,
        status: error.httpStatus,
        meta: error.metadata,
      }));

      const resolver = new ErrorXResolver({
        onResolveType: () => 'api',
        onResolve,
        configs: {
          api: { namespace: 'errors.api' },
        },
      });

      const error = new ErrorX({
        code: 'AUTH_EXPIRED',
        httpStatus: 401,
        metadata: { userId: 123 },
      });
      resolver.resolve(error);

      expect(onResolve).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          errorType: 'api',
          i18nKey: 'errors.api.AUTH_EXPIRED',
        })
      );
    });
  });
});
