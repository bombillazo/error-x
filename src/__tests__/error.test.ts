import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ErrorX, type ErrorXMetadata, type ErrorXSerialized } from '../index.js';

describe('ErrorX', () => {
  let mockDate: Date;
  let originalCaptureStackTrace: unknown;

  beforeEach(() => {
    // Mock Date for consistent timestamps
    mockDate = new Date('2024-01-15T10:30:45.123Z');
    vi.setSystemTime(mockDate);

    // Store original captureStackTrace
    originalCaptureStackTrace = Error.captureStackTrace;
  });

  afterEach(() => {
    vi.useRealTimers();
    // Restore original captureStackTrace
    if (originalCaptureStackTrace) {
      // biome-ignore lint/suspicious/noExplicitAny: Need to restore Error.captureStackTrace which is not typed
      (Error as any).captureStackTrace = originalCaptureStackTrace;
    }
  });

  describe('Constructor', () => {
    it('should create error with string message only', () => {
      const error = new ErrorX('test error');

      expect(error.message).toBe('test error');
      expect(error.name).toBe('Error');
      expect(error.code).toBe('ERROR');
      expect(error.uiMessage).toBeUndefined();
      expect(error.metadata).toBeUndefined();
      expect(error.timestamp).toEqual(mockDate.getTime());
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(ErrorX);
    });

    it('should create error with options including message', () => {
      const metadata = { userId: 123, action: 'login' };

      const error = new ErrorX({
        message: 'authentication failed',
        name: 'AuthError',
        code: 'AUTH_FAILED',
        uiMessage: 'Please check your credentials',
        metadata,
      });

      expect(error.message).toBe('authentication failed');
      expect(error.name).toBe('AuthError');
      expect(error.code).toBe('AUTH_FAILED');
      expect(error.uiMessage).toBe('Please check your credentials');
      expect(error.metadata).toEqual(metadata);
      expect(error.timestamp).toEqual(mockDate.getTime());
    });

    it('should create error with minimal options', () => {
      const error = new ErrorX({ message: 'test error' });

      expect(error.message).toBe('test error');
      expect(error.name).toBe('Error');
      expect(error.code).toBe('ERROR');
      expect(error.uiMessage).toBeUndefined();
      expect(error.metadata).toBeUndefined();
      expect(error.timestamp).toEqual(mockDate.getTime());
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(ErrorX);
    });

    it('should create error with all options', () => {
      const metadata = { userId: 123, action: 'login' };
      const cause = new Error('Original error');

      const error = new ErrorX({
        message: 'authentication failed',
        name: 'AuthError',
        code: 'AUTH_FAILED',
        uiMessage: 'Please check your credentials',
        cause,
        metadata,
      });

      expect(error.message).toBe('authentication failed');
      expect(error.name).toBe('AuthError');
      expect(error.code).toBe('AUTH_FAILED');
      expect(error.uiMessage).toBe('Please check your credentials');
      expect(error.metadata).toEqual(metadata);
      // cause is now an ErrorX instance (wrapped native error)
      expect(error.parent).toBeInstanceOf(ErrorX);
      expect(error.parent?.message).toBe(cause.message);
      expect(error.parent?.original).toEqual({
        message: cause.message,
        name: cause.name,
        stack: cause.stack,
      });
      expect(error.timestamp).toEqual(mockDate.getTime());
    });

    it('should create error with number code', () => {
      const error = new ErrorX({
        message: 'HTTP error',
        name: 'HTTPError',
        code: 404,
        uiMessage: 'Page not found',
      });

      expect(error.message).toBe('HTTP error');
      expect(error.name).toBe('HTTPError');
      expect(error.code).toBe('404');
      expect(error.uiMessage).toBe('Page not found');
    });

    it('should create error', () => {
      const error = new ErrorX({
        message: 'Simple test',
        name: 'SimpleError',
        code: 'SIMPLE_TEST',
      });

      expect(error.message).toBe('Simple test');
      expect(error.name).toBe('SimpleError');
      expect(error.code).toBe('SIMPLE_TEST');
    });

    it('should create error with no options', () => {
      const error = new ErrorX();

      expect(error.message).toBe('An error occurred');
      expect(error.name).toBe('Error');
      expect(error.code).toBe('ERROR');
      expect(error.uiMessage).toBeUndefined();
      expect(error.metadata).toBeUndefined();
      expect(error.timestamp).toEqual(mockDate.getTime());
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(ErrorX);
    });

    it('should create error with empty options object', () => {
      const error = new ErrorX({});

      expect(error.message).toBe('An error occurred');
      expect(error.name).toBe('Error');
      expect(error.code).toBe('ERROR');
      expect(error.uiMessage).toBeUndefined();
      expect(error.metadata).toBeUndefined();
      expect(error.timestamp).toEqual(mockDate.getTime());
    });

    it('should create error with partial options', () => {
      const error = new ErrorX({ name: 'CustomError' });

      expect(error.message).toBe('An error occurred');
      expect(error.name).toBe('CustomError');
      expect(error.code).toBe('CUSTOM_ERROR');
      expect(error.uiMessage).toBeUndefined();
      expect(error.metadata).toBeUndefined();
    });

    it('should pass messages through as-is without formatting', () => {
      const testCases = [
        { input: 'simple message', expected: 'simple message' },
        { input: 'already capitalized', expected: 'already capitalized' },
        { input: 'ends with period.', expected: 'ends with period.' },
        { input: 'ends with exclamation!', expected: 'ends with exclamation!' },
        { input: 'ends with question?', expected: 'ends with question?' },
        { input: 'ends with paren)', expected: 'ends with paren)' },
        { input: '', expected: 'An error occurred' },
        { input: '   ', expected: 'An error occurred' },
      ];

      for (const { input, expected } of testCases) {
        const error = new ErrorX({ message: input });
        expect(error.message).toBe(expected);
      }
    });

    it('should generate default codes from names', () => {
      const testCases = [
        { name: 'DatabaseError', expected: 'DATABASE_ERROR' },
        { name: 'userAuthError', expected: 'USER_AUTH_ERROR' },
        { name: 'API Timeout', expected: 'API_TIMEOUT' },
        { name: 'Simple', expected: 'SIMPLE' },
        { name: 'special-chars!@#', expected: 'SPECIALCHARS' },
        { name: '', expected: 'ERROR' },
        { name: undefined, expected: 'ERROR' },
      ];

      for (const { name, expected } of testCases) {
        const error = new ErrorX({
          message: 'test',
          name: name as string | undefined,
        });
        expect(error.code).toBe(expected);
      }
    });

    it('should store own stack and preserve original in chain', () => {
      const originalError = new Error('Original error');
      originalError.stack =
        'Error: Original error\n    at someFunction (file.js:10:5)\n    at anotherFunction (file.js:20:10)';

      const wrappedError = new ErrorX({
        message: 'Wrapped error',
        cause: originalError,
      });

      // Wrapped error has its own stack (where it was created)
      expect(wrappedError.stack).toContain('Error: Wrapped error');
      // Stack contains frames (internal ErrorX frames are cleaned)
      expect(wrappedError.stack).toBeDefined();

      // Original error's stack is preserved in the chain via the parent's original property
      const parent = wrappedError.parent;
      expect(parent?.original?.stack).toContain('at someFunction (file.js:10:5)');
      expect(parent?.original?.stack).toContain('at anotherFunction (file.js:20:10)');
    });

    it('should clean stack when no cause provided', () => {
      const error = new ErrorX({ message: 'test error' });

      // Should not contain ErrorX internal calls
      expect(error.stack).not.toContain('new ErrorX');
      expect(error.stack).not.toContain('ErrorX.constructor');
      expect(error.stack).not.toContain('error-x/src/error.ts');
    });

    it('should create error from regular Error instance', () => {
      const originalError = new Error('Original error message');
      originalError.name = 'CustomError';

      const error = ErrorX.from(originalError);

      expect(error.message).toBe('Original error message');
      expect(error.name).toBe('CustomError');
      expect(error.parent).toBe(originalError.cause);
    });

    it('should create error from API-like object with ErrorX properties', () => {
      const apiError = {
        message: 'user not found',
        name: 'NotFoundError',
        code: 'USER_404',
        uiMessage: 'User does not exist',
      };

      const error = new ErrorX(apiError);

      expect(error.message).toBe('user not found');
      expect(error.name).toBe('NotFoundError');
      expect(error.code).toBe('USER_404');
      expect(error.uiMessage).toBe('User does not exist');
      // When object has ErrorX properties, it's treated as ErrorXOptions directly
      expect(error.metadata).toBeUndefined();
    });

    it('should create error from API-like object without ErrorX properties', () => {
      const apiError = {
        error: 'user not found',
        status: 404,
      };

      const error = ErrorX.from(apiError);

      expect(error.message).toBe('user not found');
      expect(error.code).toBe('ERROR');
      expect(error.metadata).toBeUndefined();
    });

    it('should treat object with only ErrorXOptions fields as ErrorXOptions', () => {
      const options = {
        message: 'Valid ErrorXOptions',
        code: 'VALID',
        metadata: { key: 'value' },
      };

      const error = new ErrorX(options);

      expect(error.message).toBe('Valid ErrorXOptions');
      expect(error.code).toBe('VALID');
      expect(error.metadata).toEqual({ key: 'value' });
    });

    it('should convert object with extra fields not in ErrorXOptions', () => {
      const apiError = {
        message: 'Has extra fields',
        code: 'ERR',
        extraField: 'not in ErrorXOptions',
        anotherField: 123,
      };

      const error = ErrorX.from(apiError);

      expect(error.message).toBe('Has extra fields');
      expect(error.code).toBe('ERR');
      expect(error.metadata).toBeUndefined();
    });

    it('should convert object with mixed ErrorXOptions and non-ErrorXOptions fields', () => {
      const mixedObject = {
        message: 'Mixed object',
        statusCode: 404, // Not an ErrorXOptions field
        url: '/api/users', // Not an ErrorXOptions field
      };

      const error = ErrorX.from(mixedObject);

      expect(error.message).toBe('Mixed object');
      expect(error.metadata).toBeUndefined();
    });

    it('should handle object with only non-ErrorXOptions fields', () => {
      const apiResponse = {
        status: 500,
        statusText: 'Internal Server Error',
        url: '/api/data',
      };

      const error = ErrorX.from(apiResponse);

      expect(error.message).toBe('Internal Server Error');
      expect(error.metadata).toBeUndefined();
    });
  });

  describe('Default Values', () => {
    it('should use correct default name', () => {
      const error = new ErrorX({ message: 'test' });
      expect(error.name).toBe('Error');
    });

    it('should use correct default UI message', () => {
      const error = new ErrorX({ message: 'test' });
      expect(error.uiMessage).toBeUndefined();
    });

    it('should generate default code when no name provided', () => {
      const error = new ErrorX({ message: 'test' });
      expect(error.code).toBe('ERROR');
    });

    it('should use undefined metadata by default', () => {
      const error = new ErrorX({ message: 'test' });
      expect(error.metadata).toBeUndefined();
    });
  });

  describe('Static Methods', () => {
    describe('isErrorX', () => {
      it('should return true for ErrorX instances', () => {
        const error = new ErrorX({ message: 'test' });
        expect(ErrorX.isErrorX(error)).toBe(true);
      });

      it('should return false for regular Error instances', () => {
        const error = new Error('test');
        expect(ErrorX.isErrorX(error)).toBe(false);
      });

      it('should return false for non-error values', () => {
        expect(ErrorX.isErrorX(null)).toBe(false);
        expect(ErrorX.isErrorX(undefined)).toBe(false);
        expect(ErrorX.isErrorX('string')).toBe(false);
        expect(ErrorX.isErrorX({})).toBe(false);
        expect(ErrorX.isErrorX(123)).toBe(false);
      });
    });

    describe('from', () => {
      it('should return same ErrorX instance', () => {
        const original = new ErrorX({ message: 'test' });
        const result = ErrorX.from(original);
        expect(result).toBe(original);
      });

      it('should convert regular Error', () => {
        const error = new Error('test error');
        error.name = 'CustomError';

        const converted = ErrorX.from(error);

        expect(converted.message).toBe('test error');
        expect(converted.name).toBe('CustomError');
        expect(converted.parent).toBe(error.cause);
      });

      it('should convert string to ErrorX', () => {
        const converted = ErrorX.from('simple string error');

        expect(converted.message).toBe('simple string error');
        expect(converted.metadata).toBeUndefined();
      });

      it('should extract properties from API-like objects', () => {
        const apiError = {
          message: 'user not found',
          name: 'NotFoundError',
          code: 'USER_404',
          uiMessage: 'User does not exist',
          statusText: 'Not Found',
          endpoint: '/api/users/123',
        };

        const converted = ErrorX.from(apiError);

        expect(converted.message).toBe('user not found');
        expect(converted.name).toBe('NotFoundError');
        expect(converted.code).toBe('USER_404');
        expect(converted.uiMessage).toBe('User does not exist');
        expect(converted.metadata).toBeUndefined();
      });

      it('should extract number codes from objects', () => {
        const apiError = {
          message: 'HTTP request failed',
          name: 'HTTPError',
          code: 500,
          statusText: 'Internal Server Error',
        };

        const converted = ErrorX.from(apiError);

        expect(converted.message).toBe('HTTP request failed');
        expect(converted.name).toBe('HTTPError');
        expect(converted.code).toBe('500');
        expect(converted.metadata).toBeUndefined();
      });

      it('should handle objects', () => {
        const apiError = {
          message: 'Session expired',
          name: 'SessionError',
          code: 'SESSION_EXPIRED',
        };

        const converted = ErrorX.from(apiError);

        expect(converted.message).toBe('Session expired');
        expect(converted.name).toBe('SessionError');
        expect(converted.code).toBe('SESSION_EXPIRED');
        expect(converted.metadata).toBeUndefined();
      });

      it('should extract from alternative property names', () => {
        const testCases = [
          { title: 'Custom Title', details: 'Detailed message' },
          { error: 'Error message', text: 'Text message' },
          { info: 'Info message', errorMessage: 'Error message prop' },
          { userMessage: 'User friendly message' },
        ];

        for (const errorObj of testCases) {
          const converted = ErrorX.from(errorObj);
          expect(converted.message).toBeTruthy();
        }
      });

      it('should handle empty objects', () => {
        const converted = ErrorX.from({});
        expect(converted.message).toBe('Unknown error occurred');
      });

      it('should handle null and undefined', () => {
        const convertedNull = ErrorX.from(null);
        const convertedUndefined = ErrorX.from(undefined);

        expect(convertedNull.message).toBe('Unknown error occurred');
        expect(convertedUndefined.message).toBe('Unknown error occurred');
      });
    });
  });

  describe('Instance Methods', () => {
    describe('withMetadata', () => {
      it('should add metadata to existing error', () => {
        const original = new ErrorX({
          message: 'test',
          metadata: { existing: 'data' },
        });

        const updated = original.withMetadata({
          additional: 'metadata',
          userId: 123,
        });

        expect(updated.metadata).toEqual({
          existing: 'data',
          additional: 'metadata',
          userId: 123,
        });
        expect(updated).not.toBe(original);
        expect(updated.message).toBe(original.message);
        expect(updated.name).toBe(original.name);
        expect(updated.code).toBe(original.code);
      });

      it('should override existing metadata properties', () => {
        const original = new ErrorX({
          message: 'test',
          metadata: { key: 'original', other: 'data' },
        });

        const updated = original.withMetadata({ key: 'updated' });

        expect(updated.metadata).toEqual({
          key: 'updated',
          other: 'data',
        });
      });

      it('should preserve stack trace', () => {
        const original = new ErrorX({ message: 'test' });
        const originalStack = original.stack;

        const updated = original.withMetadata({ additional: 'data' });

        expect(updated.stack).toBe(originalStack);
      });
    });

    describe('cleanStack', () => {
      it('should clean stack trace with delimiter', () => {
        const error = new ErrorX({ message: 'test' });
        error.stack =
          'Error: test\n    at function1 (file1.js:10:5)\n    at my-app-delimiter (delim.js:5:1)\n    at function2 (file2.js:15:3)';

        const cleaned = ErrorX.cleanStack(error.stack, 'my-app-delimiter');

        expect(cleaned).toBe('    at function2 (file2.js:15:3)');
      });

      it('should return empty string if no stack available', () => {
        const result = ErrorX.cleanStack(undefined);

        expect(result).toBe('');
      });

      it('should use config delimiter if no delimiter provided', () => {
        ErrorX.configure({ cleanStackDelimiter: 'config-delimiter' });

        const error = new ErrorX({ message: 'test' });
        error.stack =
          'Error: test\n    at function1 (file1.js:10:5)\n    at config-delimiter (delim.js:5:1)\n    at function2 (file2.js:15:3)';

        const cleaned = ErrorX.cleanStack(error.stack);

        expect(cleaned).toBe('    at function2 (file2.js:15:3)');

        // Reset config
        ErrorX.resetConfig();
      });

      it('should prioritize parameter delimiter over config delimiter', () => {
        ErrorX.configure({ cleanStackDelimiter: 'config-delimiter' });

        const error = new ErrorX({ message: 'test' });
        error.stack =
          'Error: test\n    at config-delimiter (delim1.js:5:1)\n    at param-delimiter (delim2.js:5:1)\n    at function2 (file2.js:15:3)';

        const cleaned = ErrorX.cleanStack(error.stack, 'param-delimiter');

        expect(cleaned).toBe('    at function2 (file2.js:15:3)');

        // Reset config
        ErrorX.resetConfig();
      });

      it('should only remove internal ErrorX frames, not user code in error-x directory', () => {
        // This tests that the default patterns are specific enough to only remove
        // internal ErrorX implementation frames, not all files in error-x/src/
        const stack = `Error: test
    at throwError (/projects/error-x/src/__tests__/my-test.ts:10:5)
    at new ErrorX (/projects/error-x/src/error.ts:150:10)
    at Function.create (/projects/error-x/src/presets/http-error.ts:50:20)
    at userFunction (/projects/my-app/src/handler.ts:25:15)`;

        const cleaned = ErrorX.cleanStack(stack);

        // Should preserve user test file (even though it's in error-x/src/__tests__)
        expect(cleaned).toContain('my-test.ts');
        // Should preserve preset files (like http-error.ts)
        expect(cleaned).toContain('http-error.ts');
        // Should preserve user app code
        expect(cleaned).toContain('my-app/src/handler.ts');
        // Should remove internal ErrorX constructor frame
        expect(cleaned).not.toContain('new ErrorX');
        // Should remove error.ts internal frames
        expect(cleaned).not.toContain('error-x/src/error.ts');
      });

      it('should preserve each errors own stack location in a chain', () => {
        // Simulates: native Error at line 10 -> wrapped at line 20 -> wrapped again at line 30
        // Each error should have its own creation location, not inherit from parent

        // Create a native error (simulating line 10)
        const nativeError = new Error('Original error');
        nativeError.stack = `Error: Original error
    at originalThrow (app.ts:10:5)
    at caller (app.ts:50:10)`;

        // Wrap it in ErrorX (simulating line 20)
        const firstWrap = new ErrorX({
          message: 'First wrap',
          cause: nativeError,
        });

        // Wrap again (simulating line 30)
        const secondWrap = new ErrorX({
          message: 'Second wrap',
          cause: firstWrap,
        });

        // Each error in the chain should have distinct stack information
        expect(secondWrap.chain.length).toBe(3);

        // The outermost error (secondWrap) should have its own stack
        expect(secondWrap.stack).toContain('Second wrap');

        // The middle error (firstWrap) should have its own stack
        const middleError = secondWrap.chain[1];
        expect(middleError.stack).toContain('First wrap');

        // The root error should preserve original location
        const rootError = secondWrap.chain[2];
        expect(rootError.stack).toContain('app.ts:10:5');

        // Verify they're not all the same
        expect(secondWrap.stack).not.toBe(firstWrap.stack);
      });
    });
  });

  describe('Error Chain', () => {
    describe('chain property', () => {
      it('should have chain with only self when no cause', () => {
        const error = new ErrorX({ message: 'standalone error' });

        expect(error.chain).toHaveLength(1);
        expect(error.chain[0]).toBe(error);
      });

      it('should flatten chain when cause is ErrorX', () => {
        const root = new ErrorX({ message: 'root', code: 'ROOT' });
        const middle = new ErrorX({
          message: 'middle',
          code: 'MIDDLE',
          cause: root,
        });
        const top = new ErrorX({ message: 'top', code: 'TOP', cause: middle });

        expect(top.chain).toHaveLength(3);
        expect(top.chain[0]).toBe(top);
        expect(top.chain[1]).toBe(middle);
        expect(top.chain[2]).toBe(root);
      });

      it('should wrap native Error and add to chain', () => {
        const nativeError = new Error('native error');
        const errorX = new ErrorX({ message: 'wrapped', cause: nativeError });

        expect(errorX.chain).toHaveLength(2);
        expect(errorX.chain[0]).toBe(errorX);
        expect(errorX.chain[1]).toBeInstanceOf(ErrorX);
        expect(errorX.chain[1].message).toBe('native error');
      });
    });

    describe('cause getter', () => {
      it('should return undefined when no cause', () => {
        const error = new ErrorX({ message: 'no cause' });

        expect(error.parent).toBeUndefined();
      });

      it('should return immediate parent ErrorX', () => {
        const parent = new ErrorX({ message: 'parent', code: 'PARENT' });
        const child = new ErrorX({ message: 'child', cause: parent });

        expect(child.parent).toBe(parent);
        expect(child.parent?.code).toBe('PARENT');
      });

      it('should return wrapped ErrorX when cause is native Error', () => {
        const nativeError = new Error('native');
        const errorX = new ErrorX({ message: 'wrapper', cause: nativeError });

        expect(errorX.parent).toBeInstanceOf(ErrorX);
        expect(errorX.parent?.message).toBe('native');
      });
    });

    describe('root getter', () => {
      it('should return undefined when chain has only self', () => {
        const error = new ErrorX({ message: 'standalone' });

        expect(error.root).toBeUndefined();
      });

      it('should return deepest error in chain', () => {
        const root = new ErrorX({ message: 'root', code: 'ROOT' });
        const middle = new ErrorX({ message: 'middle', cause: root });
        const top = new ErrorX({ message: 'top', cause: middle });

        expect(top.root).toBe(root);
        expect(top.root?.code).toBe('ROOT');
      });

      it('should return wrapped native error as root', () => {
        const nativeError = new Error('native root');
        const middle = new ErrorX({ message: 'middle', cause: nativeError });
        const top = new ErrorX({ message: 'top', cause: middle });

        expect(top.root).toBeInstanceOf(ErrorX);
        expect(top.root?.message).toBe('native root');
        expect(top.root?.original).toBeDefined();
      });
    });

    describe('original property', () => {
      it('should be undefined for ErrorX created directly', () => {
        const error = new ErrorX({ message: 'direct' });

        expect(error.original).toBeUndefined();
      });

      it('should be set when wrapping via ErrorX.from()', () => {
        const nativeError = new Error('native');
        nativeError.name = 'NativeError';
        const wrapped = ErrorX.from(nativeError);

        expect(wrapped.original).toBeDefined();
        expect(wrapped.original?.message).toBe('native');
        expect(wrapped.original?.name).toBe('NativeError');
        expect(wrapped.original?.stack).toBeDefined();
      });

      it('should preserve original through chain', () => {
        const nativeError = new Error('original native');
        const wrapped = ErrorX.from(nativeError);
        const chained = new ErrorX({ message: 'chained', cause: wrapped });

        // The wrapped error in the chain should have original
        expect(chained.parent?.original).toBeDefined();
        expect(chained.parent?.original?.message).toBe('original native');
      });

      it('should be set when native Error is auto-wrapped as cause', () => {
        const nativeError = new Error('auto-wrapped');
        const errorX = new ErrorX({ message: 'parent', cause: nativeError });

        // The cause should have original set
        expect(errorX.parent?.original).toBeDefined();
        expect(errorX.parent?.original?.message).toBe('auto-wrapped');
      });
    });

    describe('ErrorX.from() with overrides', () => {
      it('should apply overrides when wrapping native Error', () => {
        const nativeError = new Error('native');
        const wrapped = ErrorX.from(nativeError, {
          httpStatus: 500,
          code: 'WRAPPED_ERROR',
        });

        expect(wrapped.message).toBe('native');
        expect(wrapped.httpStatus).toBe(500);
        expect(wrapped.code).toBe('WRAPPED_ERROR');
        expect(wrapped.original).toBeDefined();
      });

      it('should deep merge metadata in overrides', () => {
        const apiError = {
          message: 'API error',
          metadata: { endpoint: '/api/users', method: 'GET' },
        };
        const wrapped = ErrorX.from(apiError, {
          metadata: { userId: 123, extra: 'data' },
        });

        expect(wrapped.metadata).toEqual({
          endpoint: '/api/users',
          method: 'GET',
          userId: 123,
          extra: 'data',
        });
      });

      it('should truly deep merge nested metadata objects', () => {
        const apiError = {
          message: 'API error',
          metadata: {
            user: { name: 'Alice', id: 1, preferences: { theme: 'dark' } },
            request: { method: 'GET', headers: { auth: 'token123' } },
          },
        };
        const wrapped = ErrorX.from(apiError, {
          metadata: {
            user: { name: 'Bob', role: 'admin' },
            request: { headers: { contentType: 'application/json' } },
            extra: 'data',
          },
        });

        // Verify deep merge preserves nested properties
        expect(wrapped.metadata).toEqual({
          user: {
            name: 'Bob', // overridden
            id: 1, // preserved from original
            preferences: { theme: 'dark' }, // preserved nested object
            role: 'admin', // added from override
          },
          request: {
            method: 'GET', // preserved from original
            headers: {
              auth: 'token123', // preserved from original
              contentType: 'application/json', // added from override
            },
          },
          extra: 'data', // added from override
        });
      });

      it('should truly deep merge metadata when applying overrides to existing ErrorX', () => {
        const existing = new ErrorX({
          message: 'existing',
          metadata: {
            config: { timeout: 5000, retries: 3, options: { verbose: true } },
          },
        });
        const updated = ErrorX.from(existing, {
          metadata: {
            config: { retries: 5, options: { debug: true } },
            newField: 'value',
          },
        });

        expect(updated.metadata).toEqual({
          config: {
            timeout: 5000, // preserved
            retries: 5, // overridden
            options: {
              verbose: true, // preserved
              debug: true, // added
            },
          },
          newField: 'value', // added
        });
      });

      it('should apply overrides to existing ErrorX', () => {
        const existing = new ErrorX({
          message: 'existing',
          httpStatus: 400,
          metadata: { key: 'value' },
        });
        const updated = ErrorX.from(existing, {
          httpStatus: 500,
          metadata: { newKey: 'newValue' },
        });

        expect(updated).not.toBe(existing); // New instance
        expect(updated.httpStatus).toBe(500);
        expect(updated.metadata).toEqual({ key: 'value', newKey: 'newValue' });
      });

      it('should return same ErrorX if no overrides provided', () => {
        const existing = new ErrorX({ message: 'existing' });
        const result = ErrorX.from(existing);

        expect(result).toBe(existing);
      });
    });

    describe('chain flattening', () => {
      it('should not duplicate errors when chaining', () => {
        const a = new ErrorX({ message: 'A' });
        const b = new ErrorX({ message: 'B', cause: a });
        const c = new ErrorX({ message: 'C', cause: b });
        const d = new ErrorX({ message: 'D', cause: c });

        expect(d.chain).toHaveLength(4);
        expect(d.chain.map((e) => e.message)).toEqual(['D', 'C', 'B', 'A']);
      });

      it('should handle mixed ErrorX and native Error chain', () => {
        const native = new Error('native');
        const errorX1 = new ErrorX({ message: 'errorX1', cause: native });
        const errorX2 = new ErrorX({ message: 'errorX2', cause: errorX1 });

        expect(errorX2.chain).toHaveLength(3);
        expect(errorX2.chain[0].message).toBe('errorX2');
        expect(errorX2.chain[1].message).toBe('errorX1');
        expect(errorX2.chain[2].message).toBe('native');
        expect(errorX2.chain[2].original).toBeDefined();
      });
    });

    describe('accessing chain information', () => {
      it('should find specific error in chain by code', () => {
        const dbError = new ErrorX({ message: 'DB error', code: 'DB_ERROR' });
        const repoError = new ErrorX({
          message: 'Repo error',
          code: 'REPO_ERROR',
          cause: dbError,
        });
        const serviceError = new ErrorX({
          message: 'Service error',
          code: 'SERVICE_ERROR',
          cause: repoError,
        });

        const foundDbError = serviceError.chain.find((e) => e.code === 'DB_ERROR');

        expect(foundDbError).toBe(dbError);
        expect(foundDbError?.message).toBe('DB error');
      });

      it('should access root original for native error info', () => {
        const nativeError = new Error('ECONNREFUSED');
        nativeError.name = 'NetworkError';
        const dbError = ErrorX.from(nativeError, { code: 'DB_CONNECTION' });
        const serviceError = new ErrorX({
          message: 'Service failed',
          cause: dbError,
        });

        expect(serviceError.root?.original?.message).toBe('ECONNREFUSED');
        expect(serviceError.root?.original?.name).toBe('NetworkError');
      });
    });
  });

  describe('Serialization', () => {
    describe('toString', () => {
      it('should format basic error', () => {
        const error = new ErrorX({
          message: 'test error',
          name: 'TestError',
          code: 'TEST_CODE',
        });

        const str = error.toString();

        expect(str).toContain('TestError: test error');
        expect(str).toContain('[TEST_CODE]');
        expect(str).toContain('2024-01-15T10:30:45.123Z (1705314645123)');
      });

      it('should omit default error code', () => {
        const error = new ErrorX({
          message: 'test error',
          code: 'ERROR',
        });

        const str = error.toString();

        expect(str).not.toContain('[ERROR]');
        expect(str).toContain('Error: test error');
      });

      it('should include metadata', () => {
        const error = new ErrorX({
          message: 'test error',
          metadata: { userId: 123, action: 'login' },
        });

        const str = error.toString();

        expect(str).toContain('metadata: {"userId":123,"action":"login"}');
      });

      it('should include stack trace', () => {
        const error = new ErrorX({ message: 'test error' });
        error.stack = 'Error: test error\n    at someFunction (file.js:10:5)';

        const str = error.toString();

        expect(str).toContain('Error: test error\n    at someFunction (file.js:10:5)');
      });
    });

    describe('toJSON', () => {
      it('should serialize basic error', () => {
        const error = new ErrorX({
          message: 'test error',
          name: 'TestError',
          code: 'TEST_CODE',
          uiMessage: 'User message',
          metadata: { key: 'value' },
        });

        const json = error.toJSON();

        expect(json).toEqual({
          name: 'TestError',
          message: 'test error',
          code: 'TEST_CODE',
          uiMessage: 'User message',
          metadata: { key: 'value' },
          timestamp: mockDate.getTime(),
          stack: error.stack,
        });
      });

      it('should serialize error chain with ErrorX cause', () => {
        const root = new ErrorX({
          message: 'root cause',
          code: 'ROOT_CAUSE',
          name: 'RootError',
        });

        const error = new ErrorX({
          message: 'wrapped error',
          cause: root,
        });

        const json = error.toJSON();

        // chain contains serialized ErrorXSnapshot objects for each error in the chain
        expect(json.chain).toBeDefined();
        expect(json.chain).toHaveLength(2);
        expect(json.chain?.[0].message).toBe('wrapped error');
        expect(json.chain?.[1].message).toBe('root cause');
        expect(json.chain?.[1].name).toBe('RootError');
      });

      it('should serialize error chain with regular Error cause', () => {
        const root = new Error('original error');
        root.name = 'OriginalError';

        const error = new ErrorX({
          message: 'wrapped error',
          cause: root,
        });

        const json = error.toJSON();

        // chain contains serialized ErrorXSnapshot objects
        expect(json.chain).toBeDefined();
        expect(json.chain).toHaveLength(2);
        expect(json.chain?.[0].message).toBe('wrapped error');
        expect(json.chain?.[1].name).toBe('OriginalError');
        expect(json.chain?.[1].message).toBe('original error');
        // The wrapped cause should have original set
        expect(error.parent?.original).toBeDefined();
      });

      it('should handle missing stack', () => {
        const error = new ErrorX({ message: 'test' });
        error.stack = undefined;

        const json = error.toJSON();

        expect(json.stack).toBeUndefined();
      });

      it('should serialize error', () => {
        const error = new ErrorX({
          message: 'Simple error',
          name: 'SimpleError',
          code: 'SIMPLE_ERROR',
        });

        const json = error.toJSON();

        expect(json.name).toBe('SimpleError');
        expect(json.code).toBe('SIMPLE_ERROR');
      });
    });

    describe('fromJSON', () => {
      it('should deserialize basic error', () => {
        const serialized: ErrorXSerialized = {
          name: 'TestError',
          message: 'Test error.',
          code: 'TEST_CODE',
          uiMessage: 'User message',
          metadata: { key: 'value' },
          timestamp: 1705314645123,
          stack: 'Error: Test error.\n    at someFunction (file.js:10:5)',
        };

        const error = ErrorX.fromJSON(serialized);

        expect(error.name).toBe('TestError');
        expect(error.message).toBe('Test error.');
        expect(error.code).toBe('TEST_CODE');
        expect(error.uiMessage).toBe('User message');
        expect(error.metadata).toEqual({ key: 'value' });
        expect(error.timestamp).toEqual(1705314645123);
        expect(error.stack).toBe('Error: Test error.\n    at someFunction (file.js:10:5)');
      });

      it('should deserialize error chain', () => {
        const serialized: ErrorXSerialized = {
          name: 'WrapperError',
          message: 'Wrapped error.',
          code: 'WRAPPER',
          uiMessage: 'Something went wrong. Please try again.',
          metadata: {},
          timestamp: 1705314645123,
          chain: [
            {
              name: 'WrapperError',
              message: 'Wrapped error.',
              stack: 'Error: Wrapped error.\n    at wrapper (file.js:5:1)',
              code: 'WRAPPER',
              uiMessage: 'Something went wrong. Please try again.',
              metadata: {},
              timestamp: 1705314645123,
            },
            {
              name: 'RootError',
              message: 'Root cause.',
              stack: 'Error: Root cause.\n    at test (file.js:1:1)',
              code: 'ROOT_CAUSE',
              uiMessage: 'The root error occurred.',
              metadata: { detail: 'root detail' },
              timestamp: 1705314645120,
            },
          ],
        };

        const error = ErrorX.fromJSON(serialized);

        expect(error.name).toBe('WrapperError');
        expect(error.chain).toHaveLength(2);
        expect(error.parent).toBeInstanceOf(ErrorX);
        expect(error.parent?.name).toBe('RootError');
        expect(error.parent?.message).toBe('Root cause.');
      });

      it('should handle missing optional properties', () => {
        const serialized: ErrorXSerialized = {
          name: 'TestError',
          message: 'Test error.',
          code: 'TEST_CODE',
          uiMessage: 'User message',
          metadata: {},
          timestamp: 1705314645123,
        };

        const error = ErrorX.fromJSON(serialized);

        // Stack will be generated but since no stack was provided in serialized data, it should be the new error's stack
        expect(error.stack).toBeDefined();
        expect(error.parent).toBeUndefined();
      });
    });

    describe('JSON round trip', () => {
      it('should preserve all data through serialization cycle', () => {
        const root = new ErrorX({
          message: 'root cause',
          name: 'RootError',
          code: 'ROOT_CAUSE',
          metadata: { rootData: 'value' },
        });

        const original = new ErrorX({
          message: 'wrapper error',
          name: 'WrapperError',
          code: 'WRAPPER',
          uiMessage: 'Custom UI message',
          cause: root,
          metadata: { userId: 123, action: 'test' },
        });

        const serialized = original.toJSON();
        const deserialized = ErrorX.fromJSON(serialized);

        expect(deserialized.name).toBe(original.name);
        expect(deserialized.message).toBe(original.message);
        expect(deserialized.code).toBe(original.code);
        expect(deserialized.uiMessage).toBe(original.uiMessage);
        expect(deserialized.metadata).toEqual(original.metadata);
        expect(deserialized.timestamp).toEqual(original.timestamp);

        // cause is now an ErrorX instance from the chain
        expect(deserialized.parent).toBeInstanceOf(ErrorX);
        expect(deserialized.parent?.name).toBe(root.name);
        expect(deserialized.parent?.message).toBe(root.message);
        expect(deserialized.parent?.stack).toBeDefined();
      });

      it('should preserve ALL properties for chain members (not just message, name, stack)', () => {
        const root = new ErrorX({
          message: 'root error',
          name: 'RootError',
          code: 'ROOT_CODE',
          uiMessage: 'Root UI message',
          httpStatus: 500,
          metadata: { rootKey: 'rootValue', nested: { deep: true } },
        });

        const middle = new ErrorX({
          message: 'middle error',
          name: 'MiddleError',
          code: 'MIDDLE_CODE',
          uiMessage: 'Middle UI message',
          httpStatus: 502,
          metadata: { middleKey: 'middleValue' },
          cause: root,
        });

        const top = new ErrorX({
          message: 'top error',
          name: 'TopError',
          code: 'TOP_CODE',
          uiMessage: 'Top UI message',
          httpStatus: 503,
          metadata: { topKey: 'topValue' },
          cause: middle,
        });

        const serialized = top.toJSON();
        const restored = ErrorX.fromJSON(serialized);

        // Verify top-level error (already covered)
        expect(restored.message).toBe('top error');
        expect(restored.code).toBe('TOP_CODE');
        expect(restored.httpStatus).toBe(503);

        // Verify middle error preserves ALL properties
        const restoredMiddle = restored.parent;
        expect(restoredMiddle).toBeInstanceOf(ErrorX);
        expect(restoredMiddle?.message).toBe('middle error');
        expect(restoredMiddle?.name).toBe('MiddleError');
        expect(restoredMiddle?.code).toBe('MIDDLE_CODE');
        expect(restoredMiddle?.uiMessage).toBe('Middle UI message');
        expect(restoredMiddle?.httpStatus).toBe(502);
        expect(restoredMiddle?.metadata).toEqual({ middleKey: 'middleValue' });
        expect(restoredMiddle?.timestamp).toBe(middle.timestamp);

        // Verify root error preserves ALL properties
        const restoredRoot = restored.parent?.parent;
        expect(restoredRoot).toBeInstanceOf(ErrorX);
        expect(restoredRoot?.message).toBe('root error');
        expect(restoredRoot?.name).toBe('RootError');
        expect(restoredRoot?.code).toBe('ROOT_CODE');
        expect(restoredRoot?.uiMessage).toBe('Root UI message');
        expect(restoredRoot?.httpStatus).toBe(500);
        expect(restoredRoot?.metadata).toEqual({
          rootKey: 'rootValue',
          nested: { deep: true },
        });
        expect(restoredRoot?.timestamp).toBe(root.timestamp);
      });

      it('should preserve chain navigation from any point (parent.parent, parent.root)', () => {
        const root = new ErrorX({
          message: 'root',
          code: 'ROOT',
        });

        const middle = new ErrorX({
          message: 'middle',
          code: 'MIDDLE',
          cause: root,
        });

        const top = new ErrorX({
          message: 'top',
          code: 'TOP',
          cause: middle,
        });

        const serialized = top.toJSON();
        const restored = ErrorX.fromJSON(serialized);

        // Chain navigation from top
        expect(restored.parent?.parent).toBeDefined();
        expect(restored.parent?.parent?.message).toBe('root');
        expect(restored.root?.message).toBe('root');

        // Chain navigation from middle (parent)
        expect(restored.parent?.root).toBeDefined();
        expect(restored.parent?.root?.message).toBe('root');
        expect(restored.parent?.root).toBe(restored.root);

        // parent.parent should equal root
        expect(restored.parent?.parent).toBe(restored.root);
      });

      it('should handle backward compatibility with old ErrorXSnapshot format (only message, name, stack)', () => {
        // Simulate old serialized format that only has message, name, stack in chain
        const oldFormatSerialized = {
          name: 'TopError',
          message: 'Top error',
          code: 'TOP_CODE',
          uiMessage: 'Top UI',
          metadata: { key: 'value' },
          timestamp: Date.now(),
          chain: [
            {
              name: 'TopError',
              message: 'Top error',
              stack: 'Error: Top error\n    at test',
            },
            {
              name: 'RootError',
              message: 'Root error',
              stack: 'Error: Root error\n    at test',
              // Note: no code, uiMessage, metadata, httpStatus, timestamp
            },
          ],
        };

        // Should not throw when deserializing old format
        const restored = ErrorX.fromJSON(oldFormatSerialized as unknown as ErrorXSerialized);

        expect(restored.message).toBe('Top error');
        expect(restored.parent).toBeInstanceOf(ErrorX);
        expect(restored.parent?.message).toBe('Root error');
        expect(restored.parent?.name).toBe('RootError');
        // These should be defaults for old format
        expect(restored.parent?.code).toBeDefined(); // Auto-generated from name
      });

      it('should preserve original property in chain members', () => {
        const nativeError = new Error('Native error');
        const wrapped = ErrorX.from(nativeError, { code: 'WRAPPED' });

        const top = new ErrorX({
          message: 'top error',
          code: 'TOP',
          cause: wrapped,
        });

        const serialized = top.toJSON();
        const restored = ErrorX.fromJSON(serialized);

        // The wrapped error should have its original preserved
        expect(restored.parent?.original).toBeDefined();
        expect(restored.parent?.original?.message).toBe('Native error');
        expect(restored.parent?.original?.name).toBe('Error');
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long messages', () => {
      const longMessage = 'a'.repeat(10000);
      const error = new ErrorX({ message: longMessage });

      expect(error.message).toBe(longMessage);
      expect(error.message.length).toBe(10000);
    });

    it('should handle unicode characters', () => {
      const unicodeMessage = 'Error with émojis 🚀 and spëciàl characters';
      const error = new ErrorX({ message: unicodeMessage });

      expect(error.message).toBe('Error with émojis 🚀 and spëciàl characters');
    });

    it('should handle very large metadata objects', () => {
      const largeMetadata: ErrorXMetadata = {};
      for (let i = 0; i < 1000; i++) {
        largeMetadata[`key${i}`] = `value${i}`;
      }

      const error = new ErrorX({
        message: 'test',
        metadata: largeMetadata,
      });

      expect(Object.keys(error.metadata || {})).toHaveLength(1000);
      expect(error.metadata?.key999).toBe('value999');
    });

    it('should handle circular references in metadata', () => {
      const circularObj: Record<string, unknown> = { a: 1 };
      circularObj.self = circularObj;

      const error = new ErrorX({
        message: 'test',
        metadata: { circular: circularObj },
      });

      // Should not throw when creating
      expect(error.metadata?.circular).toBe(circularObj);

      // toString should handle circular references gracefully
      expect(() => error.toString()).not.toThrow();
    });

    it('should handle deep error chains', () => {
      let currentError: ErrorX | Error = new Error('Root error');

      // Create a chain of 10 wrapped errors
      for (let i = 0; i < 10; i++) {
        currentError = new ErrorX({
          message: `Level ${i} error`,
          code: `LEVEL_${i}`,
          cause: currentError,
        });
      }

      expect(currentError).toBeInstanceOf(ErrorX);

      // Should be able to serialize deep chains
      const serialized = (currentError as ErrorX).toJSON();
      expect(serialized.chain).toBeDefined();
      expect(serialized.chain).toHaveLength(11); // 10 levels + 1 wrapped root error

      // Should be able to deserialize
      const deserialized = ErrorX.fromJSON(serialized);
      expect(deserialized.message).toBe('Level 9 error');
      expect(deserialized.chain).toHaveLength(11);
    });

    it('should handle null prototype objects', () => {
      const nullProtoError = Object.create(null);
      nullProtoError.message = 'null proto error';
      nullProtoError.code = 'NULL_PROTO';

      const converted = ErrorX.from(nullProtoError);

      expect(converted.message).toBe('null proto error');
      expect(converted.code).toBe('NULL_PROTO');
    });
  });

  describe('Performance', () => {
    it('should handle rapid error creation', () => {
      const start = Date.now();
      const errors: ErrorX[] = [];

      for (let i = 0; i < 1000; i++) {
        errors.push(
          new ErrorX({
            message: `Error ${i}`,
            metadata: { index: i },
          })
        );
      }

      const duration = Date.now() - start;
      expect(duration).toBeLessThan(1000); // Should create 1000 errors in less than 1 second
      expect(errors).toHaveLength(1000);
    });

    it('should handle rapid serialization', () => {
      const error = new ErrorX({
        message: 'Test error',
        metadata: { data: 'value' },
      });

      const start = Date.now();

      for (let i = 0; i < 1000; i++) {
        error.toJSON();
      }

      const duration = Date.now() - start;
      expect(duration).toBeLessThan(1000); // Should serialize 1000 times in less than 1 second
    });
  });

  describe('Configuration API', () => {
    it('should return null when no configuration is set initially', () => {
      const config = ErrorX.getConfig();
      expect(config).toBeNull();
    });

    it('should allow setting global configuration', () => {
      ErrorX.configure({
        cleanStack: true,
        cleanStackDelimiter: 'my-delimiter',
      });

      const config = ErrorX.getConfig();
      expect(config).toEqual({
        cleanStack: true,
        cleanStackDelimiter: 'my-delimiter',
      });
    });

    it('should update configuration when configure is called multiple times', () => {
      ErrorX.configure({ cleanStackDelimiter: 'delimiter-1' });
      expect(ErrorX.getConfig()?.cleanStackDelimiter).toBe('delimiter-1');

      ErrorX.configure({ cleanStackDelimiter: 'delimiter-2' });
      expect(ErrorX.getConfig()?.cleanStackDelimiter).toBe('delimiter-2');
    });
  });
});
