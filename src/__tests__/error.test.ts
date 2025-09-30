import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  type ErrorAction,
  type ErrorMetadata,
  ErrorX,
  HandlingTargets,
  type SerializableError,
} from '../index.js';

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
      (Error as any).captureStackTrace = originalCaptureStackTrace;
    }
  });

  describe('Constructor', () => {
    it('should create error with string message only', () => {
      const error = new ErrorX('test error');

      expect(error.message).toBe('Test error.');
      expect(error.name).toBe('Error');
      expect(error.code).toBe('ERROR');
      expect(error.uiMessage).toBeUndefined();
      expect(error.metadata).toBeUndefined();
      expect(error.type).toBeUndefined();
      expect(error.timestamp).toEqual(mockDate);
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(ErrorX);
    });

    it('should create error with string message and additional options', () => {
      const metadata = { userId: 123, action: 'login' };

      const error = new ErrorX('authentication failed', {
        name: 'AuthError',
        code: 'AUTH_FAILED',
        uiMessage: 'Please check your credentials',
        metadata,
      });

      expect(error.message).toBe('Authentication failed.');
      expect(error.name).toBe('AuthError');
      expect(error.code).toBe('AUTH_FAILED');
      expect(error.uiMessage).toBe('Please check your credentials');
      expect(error.metadata).toEqual(metadata);
      expect(error.timestamp).toEqual(mockDate);
    });

    it('should create error with minimal options', () => {
      const error = new ErrorX({ message: 'test error' });

      expect(error.message).toBe('Test error.');
      expect(error.name).toBe('Error');
      expect(error.code).toBe('ERROR');
      expect(error.uiMessage).toBeUndefined();
      expect(error.metadata).toBeUndefined();
      expect(error.timestamp).toEqual(mockDate);
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

      expect(error.message).toBe('Authentication failed.');
      expect(error.name).toBe('AuthError');
      expect(error.code).toBe('AUTH_FAILED');
      expect(error.uiMessage).toBe('Please check your credentials');
      expect(error.metadata).toEqual(metadata);
      expect(error.cause).toBe(cause);
      expect(error.timestamp).toEqual(mockDate);
    });

    it('should create error with number code', () => {
      const error = new ErrorX({
        message: 'HTTP error',
        name: 'HTTPError',
        code: 404,
        uiMessage: 'Page not found',
      });

      expect(error.message).toBe('HTTP error.');
      expect(error.name).toBe('HTTPError');
      expect(error.code).toBe('404');
      expect(error.uiMessage).toBe('Page not found');
    });

    it('should create error with actions system', () => {
      const actions: ErrorAction[] = [
        { action: 'notify', payload: { targets: [HandlingTargets.MODAL] } },
        { action: 'logout', payload: { clearStorage: true } },
        { action: 'redirect', payload: { redirectURL: '/login', delay: 1000 } },
      ];

      const error = new ErrorX({
        message: 'Authentication expired',
        name: 'AuthExpiredError',
        code: 'AUTH_EXPIRED',
        actions,
      });

      expect(error.message).toBe('Authentication expired.');
      expect(error.name).toBe('AuthExpiredError');
      expect(error.code).toBe('AUTH_EXPIRED');
      expect(error.actions).toEqual(actions);
    });

    it('should create error without actions', () => {
      const error = new ErrorX({
        message: 'Simple test',
        name: 'SimpleError',
        code: 'SIMPLE_TEST',
      });

      expect(error.message).toBe('Simple test.');
      expect(error.name).toBe('SimpleError');
      expect(error.code).toBe('SIMPLE_TEST');
      expect(error.actions).toBeUndefined();
    });

    it('should create error with mixed targets and custom actions', () => {
      const actions: ErrorAction[] = [
        {
          action: 'notify',
          payload: {
            targets: [
              HandlingTargets.TOAST,
              'custom-sidebar',
              HandlingTargets.CONSOLE,
              'analytics-tracker',
            ],
          },
        },
        { action: 'custom-analytics', payload: { event: 'error_occurred', severity: 'high' } },
      ];

      const error = new ErrorX({
        message: 'Mixed actions test',
        name: 'MixedError',
        code: 'MIXED_ACTIONS',
        actions,
      });

      expect(error.message).toBe('Mixed actions test.');
      expect(error.name).toBe('MixedError');
      expect(error.code).toBe('MIXED_ACTIONS');
      expect(error.actions).toEqual(actions);
    });

    it('should create error with no options', () => {
      const error = new ErrorX();

      expect(error.message).toBe('An error occurred');
      expect(error.name).toBe('Error');
      expect(error.code).toBe('ERROR');
      expect(error.uiMessage).toBeUndefined();
      expect(error.metadata).toBeUndefined();
      expect(error.actions).toBeUndefined();
      expect(error.timestamp).toEqual(mockDate);
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
      expect(error.actions).toBeUndefined();
      expect(error.timestamp).toEqual(mockDate);
    });

    it('should create error with partial options', () => {
      const error = new ErrorX({ name: 'CustomError' });

      expect(error.message).toBe('An error occurred');
      expect(error.name).toBe('CustomError');
      expect(error.code).toBe('CUSTOM_ERROR');
      expect(error.uiMessage).toBeUndefined();
      expect(error.metadata).toBeUndefined();
      expect(error.actions).toBeUndefined();
    });

    it('should format messages correctly', () => {
      const testCases = [
        { input: 'simple message', expected: 'Simple message.' },
        { input: 'already capitalized', expected: 'Already capitalized.' },
        {
          input: 'multiple sentences. second sentence',
          expected: 'Multiple sentences. Second sentence.',
        },
        { input: 'ends with period.', expected: 'Ends with period.' },
        { input: 'ends with exclamation!', expected: 'Ends with exclamation!' },
        { input: 'ends with question?', expected: 'Ends with question?' },
        { input: 'ends with paren)', expected: 'Ends with paren)' },
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

    it('should preserve original stack when cause is Error', () => {
      const originalError = new Error('Original error');
      originalError.stack =
        'Error: Original error\n    at someFunction (file.js:10:5)\n    at anotherFunction (file.js:20:10)';

      const wrappedError = new ErrorX({
        message: 'Wrapped error',
        cause: originalError,
      });

      expect(wrappedError.stack).toContain('Error: Wrapped error.');
      expect(wrappedError.stack).toContain('at someFunction (file.js:10:5)');
      expect(wrappedError.stack).toContain('at anotherFunction (file.js:20:10)');
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

      const error = new ErrorX(originalError);

      expect(error.message).toBe('Original error message.');
      expect(error.name).toBe('CustomError');
      expect(error.cause).toBe(originalError.cause);
    });

    it('should create error from API-like object with ErrorX properties', () => {
      const apiError = {
        message: 'user not found',
        name: 'NotFoundError',
        code: 'USER_404',
        uiMessage: 'User does not exist',
      };

      const error = new ErrorX(apiError);

      expect(error.message).toBe('User not found.');
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

      const error = new ErrorX(apiError);

      expect(error.message).toBe('User not found.');
      expect(error.code).toBe('ERROR');
      expect(error.metadata?.originalError).toBe(apiError);
    });

    it('should create error from object with actions', () => {
      const apiError = {
        message: 'Session expired',
        name: 'SessionError',
        code: 'SESSION_EXPIRED',
        actions: [
          { action: 'notify', payload: { targets: [HandlingTargets.TOAST] } },
          { action: 'logout', payload: { clearStorage: true } },
        ],
      };

      const error = new ErrorX(apiError);

      expect(error.message).toBe('Session expired.');
      expect(error.name).toBe('SessionError');
      expect(error.code).toBe('SESSION_EXPIRED');
      expect(error.actions).toEqual(apiError.actions);
    });

    it('should treat object with only ErrorXOptions fields as ErrorXOptions', () => {
      const options = {
        message: 'Valid ErrorXOptions',
        code: 'VALID',
        metadata: { key: 'value' },
      };

      const error = new ErrorX(options);

      expect(error.message).toBe('Valid ErrorXOptions.');
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

      const error = new ErrorX(apiError);

      expect(error.message).toBe('Has extra fields.');
      expect(error.code).toBe('ERR');
      expect(error.metadata?.originalError).toBe(apiError);
    });

    it('should convert object with mixed ErrorXOptions and non-ErrorXOptions fields', () => {
      const mixedObject = {
        message: 'Mixed object',
        statusCode: 404, // Not an ErrorXOptions field
        url: '/api/users', // Not an ErrorXOptions field
      };

      const error = new ErrorX(mixedObject);

      expect(error.message).toBe('Mixed object.');
      // Should be treated as unknown and converted
      expect(error.metadata?.originalError).toBe(mixedObject);
    });

    it('should handle object with only non-ErrorXOptions fields', () => {
      const apiResponse = {
        status: 500,
        statusText: 'Internal Server Error',
        url: '/api/data',
      };

      const error = new ErrorX(apiResponse);

      expect(error.message).toBe('Internal Server Error.');
      expect(error.metadata?.originalError).toBe(apiResponse);
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

    describe('toErrorX', () => {
      it('should return same ErrorX instance', () => {
        const original = new ErrorX({ message: 'test' });
        const result = ErrorX.toErrorX(original);
        expect(result).toBe(original);
      });

      it('should convert regular Error', () => {
        const error = new Error('test error');
        error.name = 'CustomError';

        const converted = ErrorX.toErrorX(error);

        expect(converted.message).toBe('Test error.');
        expect(converted.name).toBe('CustomError');
        expect(converted.cause).toBe(error.cause);
      });

      it('should convert string to ErrorX', () => {
        const converted = ErrorX.toErrorX('simple string error');

        expect(converted.message).toBe('Simple string error.');
        expect(converted.metadata.originalError).toBe('simple string error');
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

        const converted = ErrorX.toErrorX(apiError);

        expect(converted.message).toBe('User not found.');
        expect(converted.name).toBe('NotFoundError');
        expect(converted.code).toBe('USER_404');
        expect(converted.uiMessage).toBe('User does not exist');
        expect(converted.metadata.originalError).toBe(apiError);
      });

      it('should extract number codes from objects', () => {
        const apiError = {
          message: 'HTTP request failed',
          name: 'HTTPError',
          code: 500,
          statusText: 'Internal Server Error',
        };

        const converted = ErrorX.toErrorX(apiError);

        expect(converted.message).toBe('HTTP request failed.');
        expect(converted.name).toBe('HTTPError');
        expect(converted.code).toBe('500');
        expect(converted.metadata.originalError).toBe(apiError);
      });

      it('should extract actions from objects', () => {
        const apiError = {
          message: 'Session expired',
          name: 'SessionError',
          code: 'SESSION_EXPIRED',
          actions: [
            { action: 'notify', payload: { targets: [HandlingTargets.TOAST] } },
            { action: 'logout', payload: { clearStorage: true } },
          ],
        };

        const converted = ErrorX.toErrorX(apiError);

        expect(converted.message).toBe('Session expired.');
        expect(converted.name).toBe('SessionError');
        expect(converted.code).toBe('SESSION_EXPIRED');
        expect(converted.actions).toEqual(apiError.actions);
        expect(converted.metadata.originalError).toBe(apiError);
      });

      it('should handle objects without actions', () => {
        const apiError = {
          message: 'Session expired',
          name: 'SessionError',
          code: 'SESSION_EXPIRED',
        };

        const converted = ErrorX.toErrorX(apiError);

        expect(converted.message).toBe('Session expired.');
        expect(converted.name).toBe('SessionError');
        expect(converted.code).toBe('SESSION_EXPIRED');
        expect(converted.actions).toBeUndefined();
        expect(converted.metadata.originalError).toBe(apiError);
      });

      it('should extract from alternative property names', () => {
        const testCases = [
          { title: 'Custom Title', details: 'Detailed message' },
          { error: 'Error message', text: 'Text message' },
          { info: 'Info message', errorMessage: 'Error message prop' },
          { userMessage: 'User friendly message' },
        ];

        for (const errorObj of testCases) {
          const converted = ErrorX.toErrorX(errorObj);
          expect(converted.message).toBeTruthy();
          expect(converted.metadata.originalError).toBe(errorObj);
        }
      });

      it('should handle empty objects', () => {
        const converted = ErrorX.toErrorX({});
        expect(converted.message).toBe('Unknown error occurred.');
      });

      it('should handle null and undefined', () => {
        const convertedNull = ErrorX.toErrorX(null);
        const convertedUndefined = ErrorX.toErrorX(undefined);

        expect(convertedNull.message).toBe('Unknown error occurred.');
        expect(convertedUndefined.message).toBe('Unknown error occurred.');
      });
    });

    describe('processStack', () => {
      it('should process stack with delimiter', () => {
        const error = new Error('test error');
        error.stack =
          'Error: test error\n    at function1 (file1.js:10:5)\n    at delimiter-function (delim.js:5:1)\n    at function2 (file2.js:15:3)';

        const processed = ErrorX.processStack(error, 'delimiter-function');

        expect(processed).toBe('    at function2 (file2.js:15:3)');
      });

      it('should return original stack if delimiter not found', () => {
        const error = new Error('test error');
        error.stack = 'Error: test error\n    at function1 (file1.js:10:5)';

        const processed = ErrorX.processStack(error, 'nonexistent');

        expect(processed).toBe(error.stack);
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

    describe('cleanStackTrace', () => {
      it('should clean stack trace with delimiter', () => {
        const error = new ErrorX({ message: 'test' });
        error.stack =
          'Error: test\n    at function1 (file1.js:10:5)\n    at my-app-delimiter (delim.js:5:1)\n    at function2 (file2.js:15:3)';

        const cleaned = error.cleanStackTrace('my-app-delimiter');

        expect(cleaned.stack).toBe('    at function2 (file2.js:15:3)');
        expect(cleaned).not.toBe(error);
      });

      it('should return same error if no delimiter provided', () => {
        const error = new ErrorX({ message: 'test' });
        const result = error.cleanStackTrace();

        expect(result).toBe(error);
      });

      it('should return same error if no stack available', () => {
        const error = new ErrorX({ message: 'test' });
        error.stack = undefined;

        const result = error.cleanStackTrace('delimiter');

        expect(result).toBe(error);
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

        expect(str).toContain('TestError: Test error.');
        expect(str).toContain('[TEST_CODE]');
        expect(str).toContain('(2024-01-15T10:30:45.123Z)');
      });

      it('should omit default error code', () => {
        const error = new ErrorX({
          message: 'test error',
          code: 'ERROR',
        });

        const str = error.toString();

        expect(str).not.toContain('[ERROR]');
        expect(str).toContain('Error: Test error.');
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
          message: 'Test error.',
          code: 'TEST_CODE',
          uiMessage: 'User message',
          metadata: { key: 'value' },
          timestamp: '2024-01-15T10:30:45.123Z',
          stack: error.stack,
        });
      });

      it('should serialize error chain with ErrorX cause', () => {
        const rootCause = new ErrorX({
          message: 'root cause',
          code: 'ROOT_CAUSE',
        });

        const error = new ErrorX({
          message: 'wrapped error',
          cause: rootCause,
        });

        const json = error.toJSON();

        expect(json.cause).toBeDefined();
        expect(json.cause?.message).toBe('Root cause.');
        expect(json.cause?.code).toBe('ROOT_CAUSE');
      });

      it('should serialize error chain with regular Error cause', () => {
        const rootCause = new Error('original error');
        rootCause.name = 'OriginalError';

        const error = new ErrorX({
          message: 'wrapped error',
          cause: rootCause,
        });

        const json = error.toJSON();

        expect(json.cause).toBeDefined();
        expect(json.cause?.name).toBe('OriginalError');
        expect(json.cause?.message).toBe('original error');
        expect(json.cause?.code).toBe('ERROR');
      });

      it('should handle missing stack', () => {
        const error = new ErrorX({ message: 'test' });
        error.stack = undefined;

        const json = error.toJSON();

        expect(json.stack).toBeUndefined();
      });

      it('should serialize error with actions', () => {
        const actions: ErrorAction[] = [
          { action: 'notify', payload: { targets: [HandlingTargets.BANNER] } },
          { action: 'logout', payload: { clearStorage: true } },
          { action: 'redirect', payload: { redirectURL: '/dashboard', delay: 1000 } },
        ];

        const error = new ErrorX({
          message: 'Permission denied',
          name: 'PermissionError',
          code: 'PERMISSION_DENIED',
          actions,
        });

        const json = error.toJSON();

        expect(json.actions).toEqual(actions);
        expect(json.name).toBe('PermissionError');
        expect(json.code).toBe('PERMISSION_DENIED');
      });

      it('should serialize error without actions', () => {
        const error = new ErrorX({
          message: 'Simple error',
          name: 'SimpleError',
          code: 'SIMPLE_ERROR',
        });

        const json = error.toJSON();

        expect(json.actions).toBeUndefined();
        expect(json.name).toBe('SimpleError');
        expect(json.code).toBe('SIMPLE_ERROR');
      });

      it('should not include actions in serialization if empty', () => {
        const error = new ErrorX({
          message: 'Simple error',
          code: 'SIMPLE',
        });

        const json = error.toJSON();

        expect(json.actions).toBeUndefined();
      });
    });

    describe('fromJSON', () => {
      it('should deserialize basic error', () => {
        const serialized: SerializableError = {
          name: 'TestError',
          message: 'Test error.',
          code: 'TEST_CODE',
          uiMessage: 'User message',
          metadata: { key: 'value' },
          timestamp: '2024-01-15T10:30:45.123Z',
          stack: 'Error: Test error.\n    at someFunction (file.js:10:5)',
        };

        const error = ErrorX.fromJSON(serialized);

        expect(error.name).toBe('TestError');
        expect(error.message).toBe('Test error.');
        expect(error.code).toBe('TEST_CODE');
        expect(error.uiMessage).toBe('User message');
        expect(error.metadata).toEqual({ key: 'value' });
        expect(error.timestamp).toEqual(new Date('2024-01-15T10:30:45.123Z'));
        expect(error.stack).toBe('Error: Test error.\n    at someFunction (file.js:10:5)');
      });

      it('should deserialize error chain', () => {
        const serialized: SerializableError = {
          name: 'WrapperError',
          message: 'Wrapped error.',
          code: 'WRAPPER',
          uiMessage: 'Something went wrong. Please try again.',
          metadata: {},
          timestamp: '2024-01-15T10:30:45.123Z',
          cause: {
            name: 'RootError',
            message: 'Root cause.',
            code: 'ROOT',
            uiMessage: 'Something went wrong. Please try again.',
            metadata: {},
            timestamp: '2024-01-15T10:30:45.123Z',
          },
        };

        const error = ErrorX.fromJSON(serialized);

        expect(error.name).toBe('WrapperError');
        expect(error.cause).toBeInstanceOf(ErrorX);
        expect((error.cause as ErrorX).name).toBe('RootError');
        expect((error.cause as ErrorX).code).toBe('ROOT');
      });

      it('should handle missing optional properties', () => {
        const serialized: SerializableError = {
          name: 'TestError',
          message: 'Test error.',
          code: 'TEST_CODE',
          uiMessage: 'User message',
          metadata: {},
          timestamp: '2024-01-15T10:30:45.123Z',
        };

        const error = ErrorX.fromJSON(serialized);

        // Stack will be generated but since no stack was provided in serialized data, it should be the new error's stack
        expect(error.stack).toBeDefined();
        expect(error.cause).toBeUndefined();
      });

      it('should deserialize error with actions', () => {
        const actions: ErrorAction[] = [
          { action: 'notify', payload: { targets: [HandlingTargets.INLINE] } },
          { action: 'redirect', payload: { redirectURL: '/error' } },
        ];

        const serialized: SerializableError = {
          name: 'ActionsError',
          message: 'Error with actions.',
          code: 'ACTIONS_ERROR',
          uiMessage: 'Something went wrong',
          metadata: {},
          timestamp: '2024-01-15T10:30:45.123Z',
          actions,
        };

        const error = ErrorX.fromJSON(serialized);

        expect(error.name).toBe('ActionsError');
        expect(error.message).toBe('Error with actions.');
        expect(error.code).toBe('ACTIONS_ERROR');
        expect(error.actions).toEqual(actions);
      });
    });

    describe('JSON round trip', () => {
      it('should preserve all data through serialization cycle', () => {
        const rootCause = new ErrorX({
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
          cause: rootCause,
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

        expect(deserialized.cause).toBeInstanceOf(ErrorX);
        const deserializedCause = deserialized.cause as ErrorX;
        expect(deserializedCause.name).toBe(rootCause.name);
        expect(deserializedCause.message).toBe(rootCause.message);
        expect(deserializedCause.code).toBe(rootCause.code);
        expect(deserializedCause.metadata).toEqual(rootCause.metadata);
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long messages', () => {
      const longMessage = 'a'.repeat(10000);
      const error = new ErrorX({ message: longMessage });

      expect(error.message.charAt(0)).toBe('A'); // First char capitalized
      expect(error.message.slice(1, 10000)).toBe('a'.repeat(9999)); // Rest lowercase
      expect(error.message.endsWith('.')).toBe(true);
    });

    it('should handle unicode characters', () => {
      const unicodeMessage = 'Error with émojis 🚀 and spëciàl characters';
      const error = new ErrorX({ message: unicodeMessage });

      expect(error.message).toBe('Error with émojis 🚀 and spëciàl characters.');
    });

    it('should handle very large metadata objects', () => {
      const largeMetadata: ErrorMetadata = {};
      for (let i = 0; i < 1000; i++) {
        largeMetadata[`key${i}`] = `value${i}`;
      }

      const error = new ErrorX({
        message: 'test',
        metadata: largeMetadata,
      });

      expect(Object.keys(error.metadata)).toHaveLength(1000);
      expect(error.metadata.key999).toBe('value999');
    });

    it('should handle circular references in metadata', () => {
      const circularObj: any = { a: 1 };
      circularObj.self = circularObj;

      const error = new ErrorX({
        message: 'test',
        metadata: { circular: circularObj },
      });

      // Should not throw when creating
      expect(error.metadata.circular).toBe(circularObj);

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
      expect(serialized.cause).toBeDefined();

      // Should be able to deserialize
      const deserialized = ErrorX.fromJSON(serialized);
      expect(deserialized.message).toBe('Level 9 error.');
    });

    it('should handle null prototype objects', () => {
      const nullProtoError = Object.create(null);
      nullProtoError.message = 'null proto error';
      nullProtoError.code = 'NULL_PROTO';

      const converted = ErrorX.toErrorX(nullProtoError);

      expect(converted.message).toBe('Null proto error.');
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

  describe('Type field', () => {
    it('should create error with type field', () => {
      const error = new ErrorX({
        message: 'Validation failed',
        type: 'validation',
      });

      expect(error.type).toBe('validation');
      expect(error.message).toBe('Validation failed.');
    });

    it('should create error without type field', () => {
      const error = new ErrorX({
        message: 'Generic error',
      });

      expect(error.type).toBeUndefined();
    });

    it('should create error with type and other fields', () => {
      const error = new ErrorX({
        message: 'Authentication failed',
        name: 'AuthError',
        code: 'AUTH_FAILED',
        type: 'authentication',
        metadata: { userId: 123 },
      });

      expect(error.type).toBe('authentication');
      expect(error.name).toBe('AuthError');
      expect(error.code).toBe('AUTH_FAILED');
      expect(error.metadata).toEqual({ userId: 123 });
    });

    it('should preserve type in withMetadata', () => {
      const error = new ErrorX({
        message: 'Network error',
        type: 'network',
        metadata: { endpoint: '/api/users' },
      });

      const enriched = error.withMetadata({ retryCount: 3 });

      expect(enriched.type).toBe('network');
      expect(enriched.metadata).toEqual({
        endpoint: '/api/users',
        retryCount: 3,
      });
    });

    it('should preserve type in cleanStackTrace', () => {
      const error = new ErrorX({
        message: 'Database error',
        type: 'database',
      });

      const cleaned = error.cleanStackTrace('test');

      expect(cleaned.type).toBe('database');
    });

    it('should serialize error with type', () => {
      const error = new ErrorX({
        message: 'Validation error',
        type: 'validation',
        code: 'VAL_ERROR',
      });

      const json = error.toJSON();

      expect(json.type).toBe('validation');
      expect(json.message).toBe('Validation error.');
      expect(json.code).toBe('VAL_ERROR');
    });

    it('should not include type in serialization if undefined', () => {
      const error = new ErrorX({
        message: 'Generic error',
      });

      const json = error.toJSON();

      expect(json.type).toBeUndefined();
    });

    it('should deserialize error with type', () => {
      const serialized: SerializableError = {
        name: 'ValidationError',
        message: 'Validation failed.',
        code: 'VAL_ERROR',
        uiMessage: 'Please check your input',
        metadata: undefined,
        timestamp: '2024-01-15T10:30:45.123Z',
        type: 'validation',
      };

      const error = ErrorX.fromJSON(serialized);

      expect(error.type).toBe('validation');
      expect(error.name).toBe('ValidationError');
      expect(error.message).toBe('Validation failed.');
    });

    it('should deserialize error without type', () => {
      const serialized: SerializableError = {
        name: 'GenericError',
        message: 'Generic error.',
        code: 'GENERIC',
        uiMessage: undefined,
        metadata: undefined,
        timestamp: '2024-01-15T10:30:45.123Z',
      };

      const error = ErrorX.fromJSON(serialized);

      expect(error.type).toBeUndefined();
    });

    it('should preserve type through JSON round trip', () => {
      const original = new ErrorX({
        message: 'Network timeout',
        type: 'network',
        code: 'TIMEOUT',
        metadata: { endpoint: '/api/data', timeout: 5000 },
      });

      const serialized = original.toJSON();
      const deserialized = ErrorX.fromJSON(serialized);

      expect(deserialized.type).toBe(original.type);
      expect(deserialized.message).toBe(original.message);
      expect(deserialized.code).toBe(original.code);
      expect(deserialized.metadata).toEqual(original.metadata);
    });

    it('should convert unknown objects with type field', () => {
      const apiError = {
        message: 'Request failed',
        code: 'REQ_FAILED',
        type: 'network',
        status: 500,
      };

      const error = new ErrorX(apiError);

      expect(error.type).toBe('network');
      expect(error.message).toBe('Request failed.');
      expect(error.code).toBe('REQ_FAILED');
    });

    it('should convert unknown objects without type field', () => {
      const apiError = {
        message: 'Request failed',
        code: 'REQ_FAILED',
      };

      const error = new ErrorX(apiError);

      expect(error.type).toBeUndefined();
    });

    it('should handle common type values', () => {
      const types = ['validation', 'authentication', 'network', 'database', 'business', 'system'];

      for (const type of types) {
        const error = new ErrorX({
          message: `${type} error`,
          type,
        });

        expect(error.type).toBe(type);
      }
    });

    it('should convert type to string from unknown input', () => {
      const apiError = {
        message: 'Test error',
        type: 123, // number
      };

      const error = new ErrorX(apiError);

      expect(error.type).toBe('123');
    });

    it('should not set type if it is empty string', () => {
      const apiError = {
        message: 'Test error',
        type: '',
      };

      const error = new ErrorX(apiError);

      expect(error.type).toBeUndefined();
    });
  });
});
