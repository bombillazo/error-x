import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ErrorX, type ErrorXTransform, type ErrorXTransformContext } from '../index';

describe('Custom Error Classes with Factory Pattern', () => {
  let mockDate: Date;

  beforeEach(() => {
    // Mock Date for consistent timestamps
    mockDate = new Date('2024-01-15T10:30:45.123Z');
    vi.setSystemTime(mockDate);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Basic Custom Error Class', () => {
    type DBMetadata = { query?: string; table?: string };

    class DBError extends ErrorX<DBMetadata> {
      static presets = {
        9333: { message: 'Connection timeout', code: 'TIMEOUT' },
        9334: { message: 'Query failed', code: 'QUERY_FAILED' },
        CONN_REFUSED: { message: 'Connection refused', code: 'CONN_REFUSED', httpStatus: 503 },
        GENERIC: { message: 'A database error occurred', code: 'ERROR' },
      };

      static defaultPreset = 'GENERIC' as const;

      static defaults = { httpStatus: 500 };

      static transform: ErrorXTransform<DBMetadata> = (opts, _ctx) => ({
        ...opts,
        code: `DB_${opts.code}`,
        metadata: {
          query: (opts.metadata as DBMetadata | undefined)?.query,
          table: (opts.metadata as DBMetadata | undefined)?.table,
        },
      });
    }

    it('should be instanceof both ErrorX and custom class', () => {
      const error = DBError.create();

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(ErrorX);
      expect(error).toBeInstanceOf(DBError);
    });

    it('should use defaultPreset when no preset key provided', () => {
      const error = DBError.create();

      expect(error.message).toBe('A database error occurred');
      expect(error.code).toBe('DB_ERROR');
      expect(error.httpStatus).toBe(500);
    });

    it('should look up preset by numeric key', () => {
      const error = DBError.create(9333);

      expect(error.message).toBe('Connection timeout');
      expect(error.code).toBe('DB_TIMEOUT');
      expect(error.httpStatus).toBe(500); // From defaults
    });

    it('should look up preset by string key', () => {
      const error = DBError.create('CONN_REFUSED');

      expect(error.message).toBe('Connection refused');
      expect(error.code).toBe('DB_CONN_REFUSED');
      expect(error.httpStatus).toBe(503); // From preset
    });

    it('should fall back to defaultPreset when preset key not found', () => {
      const error = DBError.create(9999); // Not in presets

      expect(error.message).toBe('A database error occurred');
      expect(error.code).toBe('DB_ERROR');
    });

    it('should deep merge overrides with preset', () => {
      const error = DBError.create(9333, { message: 'Custom timeout message' });

      expect(error.message).toBe('Custom timeout message');
      expect(error.code).toBe('DB_TIMEOUT'); // From preset, transformed
      expect(error.httpStatus).toBe(500); // From defaults
    });

    it('should apply transform function', () => {
      const error = DBError.create(9334, {
        metadata: { query: 'SELECT * FROM users', table: 'users' },
      });

      expect(error.code).toBe('DB_QUERY_FAILED');
      expect(error.metadata?.query).toBe('SELECT * FROM users');
      expect(error.metadata?.table).toBe('users');
    });

    it('should support create(overrides) signature', () => {
      const error = DBError.create({ message: 'Custom message', code: 'CUSTOM' });

      expect(error.message).toBe('Custom message');
      expect(error.code).toBe('DB_CUSTOM'); // Still transformed
      expect(error.httpStatus).toBe(500); // From defaults
    });

    it('should merge defaultPreset with overrides when using create(overrides)', () => {
      const error = DBError.create({ metadata: { query: 'SELECT 1' } });

      // Should get defaultPreset values merged with overrides
      expect(error.message).toBe('A database error occurred'); // From GENERIC preset
      expect(error.code).toBe('DB_ERROR'); // From GENERIC preset, transformed
      expect(error.metadata?.query).toBe('SELECT 1'); // From overrides
    });
  });

  describe('Call Signatures', () => {
    class FlexibleError extends ErrorX<{ context?: string }> {
      static presets = {
        A: { message: 'Preset A', code: 'A' },
        B: { message: 'Preset B', code: 'B' },
      };
      static defaultPreset = 'A';
      static defaults = { httpStatus: 400 };
    }

    it('create() - no args, uses defaultPreset', () => {
      const error = FlexibleError.create();

      expect(error.message).toBe('Preset A');
      expect(error.code).toBe('A');
      expect(error.httpStatus).toBe(400);
    });

    it('create(presetKey) - uses specified preset', () => {
      const error = FlexibleError.create('B');

      expect(error.message).toBe('Preset B');
      expect(error.code).toBe('B');
    });

    it('create(presetKey, overrides) - preset with overrides', () => {
      const error = FlexibleError.create('B', { httpStatus: 500 });

      expect(error.message).toBe('Preset B');
      expect(error.httpStatus).toBe(500);
    });

    it('create(overrides) - just overrides, uses defaultPreset', () => {
      const error = FlexibleError.create({ message: 'Custom', httpStatus: 500 });

      expect(error.message).toBe('Custom');
      expect(error.code).toBe('A'); // From defaultPreset
      expect(error.httpStatus).toBe(500); // From overrides
    });

    it('create(overrides) with no defaultPreset falls through to base defaults', () => {
      class NoDefaultError extends ErrorX {
        static presets = { X: { message: 'X', code: 'X' } };
        static defaults = { httpStatus: 400 };
      }

      const error = NoDefaultError.create({ message: 'Direct override' });

      expect(error.message).toBe('Direct override');
      expect(error.httpStatus).toBe(400);
    });
  });

  describe('HTTP Error Class', () => {
    type HTTPMetadata = { endpoint?: string; method?: string };

    class HTTPError extends ErrorX<HTTPMetadata> {
      static presets = {
        400: { message: 'Bad Request', code: 'BAD_REQUEST' },
        401: { message: 'Unauthorized', code: 'UNAUTHORIZED' },
        404: { message: 'Not Found', code: 'NOT_FOUND' },
        500: { message: 'Internal Server Error', code: 'INTERNAL' },
      };

      static defaultPreset = 500;

      static transform: ErrorXTransform<HTTPMetadata> = (opts, { presetKey }) => ({
        ...opts,
        httpStatus: typeof presetKey === 'number' ? presetKey : opts.httpStatus,
        code: `HTTP_${opts.code}`,
      });
    }

    it('should use numeric presetKey as httpStatus', () => {
      const error = HTTPError.create(404);

      expect(error.message).toBe('Not Found');
      expect(error.code).toBe('HTTP_NOT_FOUND');
      expect(error.httpStatus).toBe(404);
    });

    it('should handle multiple HTTP error codes', () => {
      const err400 = HTTPError.create(400);
      const err401 = HTTPError.create(401);
      const err500 = HTTPError.create(500);

      expect(err400.httpStatus).toBe(400);
      expect(err401.httpStatus).toBe(401);
      expect(err500.httpStatus).toBe(500);
    });

    it('should merge metadata with overrides', () => {
      const error = HTTPError.create(401, {
        metadata: { endpoint: '/api/users', method: 'GET' },
      });

      expect(error.httpStatus).toBe(401);
      expect(error.metadata?.endpoint).toBe('/api/users');
      expect(error.metadata?.method).toBe('GET');
    });
  });

  describe('Class Without Presets', () => {
    class SimpleError extends ErrorX {
      static defaults = { name: 'SimpleError', httpStatus: 400 };
    }

    it('should use defaults only', () => {
      const error = SimpleError.create();

      expect(error.name).toBe('SimpleError');
      expect(error.httpStatus).toBe(400);
    });

    it('should apply overrides', () => {
      const error = SimpleError.create(undefined, {
        message: 'Custom message',
        code: 'CUSTOM',
      });

      expect(error.message).toBe('Custom message');
      expect(error.code).toBe('CUSTOM');
      expect(error.httpStatus).toBe(400);
    });
  });

  describe('Class With Only Transform', () => {
    class PrefixedError extends ErrorX {
      static transform: ErrorXTransform = (opts) => ({
        ...opts,
        code: `PREFIXED_${opts.code ?? 'ERROR'}`,
      });
    }

    it('should apply transform without presets', () => {
      const error = PrefixedError.create(undefined, {
        message: 'Test error',
        code: 'TEST',
      });

      expect(error.code).toBe('PREFIXED_TEST');
    });

    it('should apply transform with default code', () => {
      const error = PrefixedError.create(undefined, {
        message: 'Test error',
      });

      expect(error.code).toBe('PREFIXED_ERROR');
    });
  });

  describe('Deep Merge Behavior', () => {
    type NestedMetadata = {
      config?: {
        timeout?: number;
        retries?: number;
        options?: { verbose?: boolean; debug?: boolean };
      };
    };

    class ConfigError extends ErrorX<NestedMetadata> {
      static defaults = {
        metadata: {
          config: {
            timeout: 5000,
            retries: 3,
            options: { verbose: false },
          },
        },
      };

      static presets = {
        HIGH_PRIORITY: {
          message: 'High priority error',
          metadata: {
            config: {
              retries: 5,
              options: { debug: true },
            },
          },
        },
      };
    }

    it('should deep merge defaults, preset, and overrides', () => {
      const error = ConfigError.create('HIGH_PRIORITY', {
        metadata: {
          config: {
            timeout: 10000,
          },
        },
      });

      expect(error.metadata?.config?.timeout).toBe(10000); // Override
      expect(error.metadata?.config?.retries).toBe(5); // Preset
      expect(error.metadata?.config?.options?.verbose).toBe(false); // Default
      expect(error.metadata?.config?.options?.debug).toBe(true); // Preset
    });
  });

  describe('Transform Context', () => {
    class ContextAwareError extends ErrorX {
      static capturedContexts: ErrorXTransformContext[] = [];

      static presets = {
        TEST: { message: 'Test', code: 'TEST' },
      };

      static defaultPreset = 'TEST';

      static transform: ErrorXTransform = (opts, ctx) => {
        ContextAwareError.capturedContexts.push({ ...ctx });
        return opts;
      };
    }

    beforeEach(() => {
      ContextAwareError.capturedContexts = [];
    });

    it('should pass presetKey in context when provided', () => {
      ContextAwareError.create('TEST');

      expect(ContextAwareError.capturedContexts).toHaveLength(1);
      expect(ContextAwareError.capturedContexts[0]?.presetKey).toBe('TEST');
    });

    it('should pass undefined presetKey when not provided', () => {
      ContextAwareError.create();

      expect(ContextAwareError.capturedContexts).toHaveLength(1);
      expect(ContextAwareError.capturedContexts[0]?.presetKey).toBeUndefined();
    });

    it('should pass numeric presetKey', () => {
      class NumericPresetError extends ErrorX {
        static presets = { 100: { message: 'Preset 100', code: 'P100' } };
        static capturedContext: ErrorXTransformContext | null = null;
        static transform: ErrorXTransform = (opts, ctx) => {
          NumericPresetError.capturedContext = ctx;
          return opts;
        };
      }

      NumericPresetError.create(100);

      expect(NumericPresetError.capturedContext?.presetKey).toBe(100);
    });
  });

  describe('Inheritance Chain', () => {
    class BaseAPIError extends ErrorX<{ endpoint?: string }> {
      static defaults = { httpStatus: 500 };
    }

    class AuthError extends BaseAPIError {
      static presets = {
        INVALID_TOKEN: { message: 'Invalid token', code: 'INVALID_TOKEN', httpStatus: 401 },
        EXPIRED_TOKEN: { message: 'Token expired', code: 'EXPIRED_TOKEN', httpStatus: 401 },
      };

      static defaultPreset = 'INVALID_TOKEN';
    }

    it('should work with inherited classes', () => {
      const error = AuthError.create('EXPIRED_TOKEN');

      expect(error).toBeInstanceOf(AuthError);
      expect(error).toBeInstanceOf(BaseAPIError);
      expect(error).toBeInstanceOf(ErrorX);
      expect(error.message).toBe('Token expired');
      expect(error.httpStatus).toBe(401);
    });
  });

  describe('Type Safety', () => {
    it('should maintain typed metadata through factory', () => {
      type StrictMetadata = { userId: number; action: string };

      class TypedError extends ErrorX<StrictMetadata> {
        static transform: ErrorXTransform<StrictMetadata> = (opts) => ({
          ...opts,
          metadata: {
            userId: (opts.metadata as StrictMetadata | undefined)?.userId ?? 0,
            action: (opts.metadata as StrictMetadata | undefined)?.action ?? 'unknown',
          },
        });
      }

      const error = TypedError.create(undefined, {
        message: 'Test',
        metadata: { userId: 123, action: 'login' },
      });

      // TypeScript should recognize these as typed
      expect(error.metadata?.userId).toBe(123);
      expect(error.metadata?.action).toBe('login');
    });
  });

  describe('Real-World Usage Patterns', () => {
    describe('Database Error with Query Truncation', () => {
      type DBMeta = { query?: string; table?: string; docsUrl?: string };

      class DBError extends ErrorX<DBMeta> {
        static docsBaseUrl = 'https://docs.example.com/db';

        static presets = {
          TIMEOUT: { message: 'Connection timeout', code: 'TIMEOUT' },
          QUERY_FAILED: { message: 'Query execution failed', code: 'QUERY_FAILED' },
          GENERIC: { message: 'Database error', code: 'ERROR' },
        };

        static defaultPreset = 'GENERIC';
        static defaults = { httpStatus: 500 };

        static transform: ErrorXTransform<DBMeta> = (opts) => ({
          ...opts,
          code: `DB_${opts.code}`,
          metadata: {
            query: (opts.metadata as DBMeta | undefined)?.query?.substring(0, 100),
            table: (opts.metadata as DBMeta | undefined)?.table,
            docsUrl: `${DBError.docsBaseUrl}#${opts.code}`,
          },
        });
      }

      it('should truncate long queries', () => {
        const longQuery = 'SELECT '.padEnd(200, 'x');
        const error = DBError.create('QUERY_FAILED', {
          metadata: { query: longQuery },
        });

        expect(error.metadata?.query?.length).toBe(100);
      });

      it('should generate docs URL', () => {
        const error = DBError.create('TIMEOUT');

        expect(error.metadata?.docsUrl).toBe('https://docs.example.com/db#TIMEOUT');
      });
    });

    describe('Validation Error with Field Info', () => {
      type ValidationMeta = { field?: string; constraint?: string; value?: unknown };

      class ValidationError extends ErrorX<ValidationMeta> {
        static presets = {
          REQUIRED: { message: 'Field is required', code: 'REQUIRED' },
          INVALID_FORMAT: { message: 'Invalid format', code: 'INVALID_FORMAT' },
          OUT_OF_RANGE: { message: 'Value out of range', code: 'OUT_OF_RANGE' },
        };

        static defaults = { httpStatus: 400 };

        static transform: ErrorXTransform<ValidationMeta> = (opts, { presetKey: _presetKey }) => {
          const meta = opts.metadata as ValidationMeta | undefined;
          return {
            ...opts,
            message: meta?.field ? `${meta.field}: ${opts.message}` : opts.message,
            code: `VALIDATION_${opts.code}`,
          };
        };
      }

      it('should prefix message with field name', () => {
        const error = ValidationError.create('REQUIRED', {
          metadata: { field: 'email' },
        });

        expect(error.message).toBe('email: Field is required');
        expect(error.code).toBe('VALIDATION_REQUIRED');
        expect(error.httpStatus).toBe(400);
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty presets object', () => {
      class EmptyPresetsError extends ErrorX {
        static presets = {};
        static defaultPreset = 'NONE';
      }

      const error = EmptyPresetsError.create('NONE');

      expect(error).toBeInstanceOf(ErrorX);
      expect(error.message).toBe('An error occurred'); // Default
    });

    it('should handle class with no static properties', () => {
      class BareError extends ErrorX {}

      const error = BareError.create(undefined, { message: 'Custom' });

      expect(error).toBeInstanceOf(BareError);
      expect(error.message).toBe('Custom');
    });

    it('should handle undefined defaultPreset gracefully', () => {
      class NoDefaultError extends ErrorX {
        static presets = {
          ONLY: { message: 'Only preset', code: 'ONLY' },
        };
        // No defaultPreset
      }

      const error = NoDefaultError.create(); // No key, no default

      expect(error).toBeInstanceOf(NoDefaultError);
      expect(error.message).toBe('An error occurred'); // Falls through to base defaults
    });

    it('should handle preset key that matches JavaScript built-in property names', () => {
      class BuiltinKeyError extends ErrorX {
        static presets = {
          toString: { message: 'toString preset', code: 'TO_STRING' },
          constructor: { message: 'constructor preset', code: 'CONSTRUCTOR' },
        };
      }

      const error1 = BuiltinKeyError.create('toString');
      const error2 = BuiltinKeyError.create('constructor');

      expect(error1.message).toBe('toString preset');
      expect(error2.message).toBe('constructor preset');
    });
  });
});
