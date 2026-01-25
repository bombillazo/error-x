import i18next from 'i18next';
import { beforeEach, describe, expect, it } from 'vitest';
import { DBErrorX, ErrorX, ErrorXResolver, HTTPErrorX } from '../index';

/**
 * Integration tests with real i18next library.
 * Tests the ErrorXResolver with actual i18next translation functionality.
 */
describe('i18next Integration', () => {
  beforeEach(async () => {
    // Initialize i18next with test translations
    await i18next.init({
      lng: 'en',
      resources: {
        en: {
          translation: {
            errors: {
              api: {
                AUTH_EXPIRED: 'Your session has expired. Please log in again.',
                UNAUTHORIZED: 'You are not authorized to perform this action.',
                NOT_FOUND: 'The requested resource was not found.',
              },
              validation: {
                REQUIRED: 'The {{field}} field is required.',
                INVALID_FORMAT: 'The {{field}} field has an invalid format.',
                TOO_LONG: 'The {{field}} field must be at most {{max}} characters.',
              },
              db: {
                DB_CONNECTION_FAILED: 'Unable to connect to the database.',
                DB_QUERY_TIMEOUT: 'Database query timed out.',
                DB_UNIQUE_VIOLATION: 'A record with this {{field}} already exists.',
              },
            },
          },
        },
        es: {
          translation: {
            errors: {
              api: {
                AUTH_EXPIRED: 'Tu sesión ha expirado. Por favor, inicia sesión de nuevo.',
                UNAUTHORIZED: 'No estás autorizado para realizar esta acción.',
                NOT_FOUND: 'El recurso solicitado no fue encontrado.',
              },
            },
          },
        },
      },
    });
  });

  describe('ErrorXResolver with i18next', () => {
    it('should resolve translated messages from i18next', () => {
      const resolver = new ErrorXResolver({
        i18n: {
          resolver: (key, params) => {
            const translation = i18next.t(key, params);
            return translation !== key ? translation : undefined;
          },
        },
        onResolveType: () => 'api',
        configs: {
          api: { namespace: 'errors.api' },
        },
      });

      const error = new ErrorX({ code: 'AUTH_EXPIRED' });
      const result = resolver.resolve(error);

      expect(result.i18nKey).toBe('errors.api.AUTH_EXPIRED');
      expect(result.uiMessage).toBe('Your session has expired. Please log in again.');
    });

    it('should pass metadata to i18next for interpolation', () => {
      const resolver = new ErrorXResolver({
        i18n: {
          resolver: (key, params) => {
            const translation = i18next.t(key, params);
            return translation !== key ? translation : undefined;
          },
        },
        onResolveType: () => 'validation',
        configs: {
          validation: { namespace: 'errors.validation' },
        },
      });

      const error = new ErrorX({
        code: 'REQUIRED',
        metadata: { field: 'email' },
      });
      const result = resolver.resolve(error);

      expect(result.uiMessage).toBe('The email field is required.');
    });

    it('should handle multiple interpolation params', () => {
      const resolver = new ErrorXResolver({
        i18n: {
          resolver: (key, params) => {
            const translation = i18next.t(key, params);
            return translation !== key ? translation : undefined;
          },
        },
        onResolveType: () => 'validation',
        configs: {
          validation: { namespace: 'errors.validation' },
        },
      });

      const error = new ErrorX({
        code: 'TOO_LONG',
        metadata: { field: 'username', max: 20 },
      });
      const result = resolver.resolve(error);

      expect(result.uiMessage).toBe('The username field must be at most 20 characters.');
    });

    it('should fall back gracefully when translation is missing', () => {
      // When i18n.resolver is configured, it takes priority - if it returns undefined,
      // that's what the resolver returns (by design). To have fallback behavior,
      // the i18n resolver itself should implement the fallback.
      const resolver = new ErrorXResolver({
        i18n: {
          resolver: (key, params) => {
            const translation = i18next.t(key, params);
            // Return translation if found, otherwise return a fallback message
            return translation !== key ? translation : 'An error occurred. Please try again.';
          },
        },
        onResolveType: () => 'api',
        configs: {
          api: { namespace: 'errors.api' },
        },
      });

      const error = new ErrorX({ code: 'UNKNOWN_CODE' });
      const result = resolver.resolve(error);

      // The i18n resolver implements the fallback behavior
      expect(result.uiMessage).toBe('An error occurred. Please try again.');
    });

    it('should use defaults uiMessage when no i18n is configured', () => {
      // When i18n is NOT configured, the resolver uses type-level or defaults uiMessage
      const resolver = new ErrorXResolver({
        // No i18n configured
        onResolveType: () => 'api',
        defaults: {
          namespace: 'errors',
          uiMessage: 'An error occurred. Please try again.',
        },
        configs: {
          api: { namespace: 'errors.api' },
        },
      });

      const error = new ErrorX({ code: 'UNKNOWN_CODE' });
      const result = resolver.resolve(error);

      // Falls back to defaults uiMessage since no i18n is configured
      expect(result.uiMessage).toBe('An error occurred. Please try again.');
    });

    it('should work with language switching', async () => {
      const resolver = new ErrorXResolver({
        i18n: {
          resolver: (key, params) => {
            const translation = i18next.t(key, params);
            return translation !== key ? translation : undefined;
          },
        },
        onResolveType: () => 'api',
        configs: {
          api: { namespace: 'errors.api' },
        },
      });

      const error = new ErrorX({ code: 'AUTH_EXPIRED' });

      // English
      const enResult = resolver.resolve(error);
      expect(enResult.uiMessage).toBe('Your session has expired. Please log in again.');

      // Switch to Spanish
      await i18next.changeLanguage('es');
      const esResult = resolver.resolve(error);
      expect(esResult.uiMessage).toBe('Tu sesión ha expirado. Por favor, inicia sesión de nuevo.');

      // Reset to English for other tests
      await i18next.changeLanguage('en');
    });

    it('should integrate with HTTPErrorX presets', () => {
      const resolver = new ErrorXResolver({
        i18n: {
          resolver: (key, params) => {
            const translation = i18next.t(key, params);
            return translation !== key ? translation : undefined;
          },
        },
        onResolveType: (error) => {
          if (error instanceof HTTPErrorX) return 'api';
          return 'general';
        },
        configs: {
          api: { namespace: 'errors.api' },
          general: { namespace: 'errors' },
        },
      });

      const error = HTTPErrorX.create(404);
      const result = resolver.resolve(error);

      expect(result.i18nKey).toBe('errors.api.NOT_FOUND');
      expect(result.uiMessage).toBe('The requested resource was not found.');
    });

    it('should integrate with DBErrorX presets', () => {
      const resolver = new ErrorXResolver({
        i18n: {
          resolver: (key, params) => {
            const translation = i18next.t(key, params);
            return translation !== key ? translation : undefined;
          },
        },
        onResolveType: (error) => {
          if (error instanceof DBErrorX) return 'db';
          return 'general';
        },
        configs: {
          db: { namespace: 'errors.db' },
          general: { namespace: 'errors' },
        },
      });

      const error = DBErrorX.create('CONNECTION_FAILED');
      const result = resolver.resolve(error);

      expect(result.i18nKey).toBe('errors.db.DB_CONNECTION_FAILED');
      expect(result.uiMessage).toBe('Unable to connect to the database.');
    });

    it('should handle DB errors with metadata interpolation', () => {
      const resolver = new ErrorXResolver({
        i18n: {
          resolver: (key, params) => {
            const translation = i18next.t(key, params);
            return translation !== key ? translation : undefined;
          },
        },
        onResolveType: () => 'db',
        configs: {
          db: { namespace: 'errors.db' },
        },
      });

      const error = DBErrorX.create('UNIQUE_VIOLATION', {
        metadata: { field: 'email', table: 'users' },
      });
      const result = resolver.resolve(error);

      expect(result.uiMessage).toBe('A record with this email already exists.');
    });
  });

  describe('Real-world scenarios', () => {
    it('should handle API error flow with resolver and i18n', () => {
      const resolver = new ErrorXResolver({
        i18n: {
          resolver: (key, params) => {
            const translation = i18next.t(key, params);
            return translation !== key ? translation : undefined;
          },
        },
        onResolveType: (error) => {
          if (error.httpStatus && error.httpStatus >= 400 && error.httpStatus < 500) {
            return 'client';
          }
          if (error.httpStatus && error.httpStatus >= 500) {
            return 'server';
          }
          return 'general';
        },
        defaults: {
          namespace: 'errors',
          uiMessage: 'An unexpected error occurred.',
        },
        configs: {
          client: { namespace: 'errors.api' },
          server: { namespace: 'errors.api' },
          general: { namespace: 'errors' },
        },
      });

      // Simulate API returning 401
      const apiError = HTTPErrorX.create(401);
      const resolved = resolver.resolve(apiError);

      expect(resolved.errorType).toBe('client');
      expect(resolved.uiMessage).toBe('You are not authorized to perform this action.');
    });

    it('should handle validation error with custom key template', () => {
      const resolver = new ErrorXResolver({
        i18n: {
          resolver: (key, params) => {
            const translation = i18next.t(key, params);
            return translation !== key ? translation : undefined;
          },
          keyTemplate: '{namespace}.{code}',
        },
        onResolveType: () => 'validation',
        configs: {
          validation: { namespace: 'errors.validation' },
        },
      });

      // Use plain ErrorX to avoid ValidationErrorX's transform that adds VALIDATION_ prefix
      const error = new ErrorX({
        code: 'INVALID_FORMAT',
        metadata: { field: 'phone' },
      });
      const resolved = resolver.resolve(error);

      expect(resolved.i18nKey).toBe('errors.validation.INVALID_FORMAT');
      expect(resolved.uiMessage).toBe('The phone field has an invalid format.');
    });
  });
});
