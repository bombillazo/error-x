import { describe, expect, it } from 'vitest';
import { ErrorX, http } from '../index.js';

describe('HTTP Presets', () => {
  describe('Basic preset usage', () => {
    it('should create error with 404 preset', () => {
      const error = new ErrorX(http[404]);

      expect(error.code).toBe('NOT_FOUND');
      expect(error.name).toBe('Not Found Error');
      expect(error.message).toBe('Not found.');
      expect(error.uiMessage).toBe('The requested resource could not be found.');
      expect(error.metadata).toEqual({ status: 404 });
      expect(error).toBeInstanceOf(ErrorX);
    });

    it('should create error with 401 preset', () => {
      const error = new ErrorX(http[401]);

      expect(error.code).toBe('UNAUTHORIZED');
      expect(error.name).toBe('Unauthorized Error');
      expect(error.message).toBe('Unauthorized.');
      expect(error.uiMessage).toBe('Authentication required. Please log in to continue.');
      expect(error.metadata).toEqual({ status: 401 });
    });

    it('should create error with 500 preset', () => {
      const error = new ErrorX(http[500]);

      expect(error.code).toBe('INTERNAL_SERVER_ERROR');
      expect(error.name).toBe('Internal Server Error');
      expect(error.message).toBe('Internal server error.');
      expect(error.uiMessage).toBe('An unexpected error occurred. Please try again later.');
      expect(error.metadata).toEqual({ status: 500 });
    });
  });

  describe('Preset override', () => {
    it('should override preset message', () => {
      const error = new ErrorX({
        ...http[404],
        message: 'User not found',
      });

      expect(error.code).toBe('NOT_FOUND');
      expect(error.name).toBe('Not Found Error');
      expect(error.message).toBe('User not found');
      expect(error.metadata).toEqual({ status: 404 });
    });

    it('should override preset code', () => {
      const error = new ErrorX({
        ...http[400],
        code: 'VALIDATION_ERROR',
      });

      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.name).toBe('Bad Request Error');
      expect(error.metadata).toEqual({ status: 400 });
    });

    it('should override preset name', () => {
      const error = new ErrorX({
        ...http[403],
        name: 'AccessDeniedError',
      });

      expect(error.code).toBe('FORBIDDEN');
      expect(error.name).toBe('AccessDeniedError');
      expect(error.metadata).toEqual({ status: 403 });
    });

    it('should override multiple preset values', () => {
      const error = new ErrorX({
        ...http[404],
        message: 'Product not found',
        code: 'PRODUCT_NOT_FOUND',
        name: 'ProductNotFoundError',
      });

      expect(error.code).toBe('PRODUCT_NOT_FOUND');
      expect(error.name).toBe('ProductNotFoundError');
      expect(error.message).toBe('Product not found');
      expect(error.metadata).toEqual({ status: 404 });
    });
  });

  describe('Preset with additional options', () => {
    it('should add metadata to preset', () => {
      const error = new ErrorX({
        ...http[404],
        metadata: { userId: 123, resource: 'user' },
      });

      expect(error.metadata).toEqual({ userId: 123, resource: 'user' });
    });

    it('should override uiMessage from preset', () => {
      const error = new ErrorX({
        ...http[401],
        uiMessage: 'Custom message: Please log in',
      });

      expect(error.uiMessage).toBe('Custom message: Please log in');
      expect(error.metadata).toEqual({ status: 401 });
    });

    it('should add cause to preset', () => {
      const originalError = new Error('Database connection failed');
      const error = new ErrorX({
        ...http[500],
        cause: originalError,
      });

      expect(error.cause).toEqual({
        message: originalError.message,
        name: originalError.name,
        stack: originalError.stack,
      });
      expect(error.metadata).toEqual({ status: 500 });
    });
  });

  describe('Common HTTP status codes', () => {
    it('should have correct 4xx client error presets', () => {
      expect(http[400].metadata).toEqual({ status: 400 });
      expect(http[401].metadata).toEqual({ status: 401 });
      expect(http[403].metadata).toEqual({ status: 403 });
      expect(http[404].metadata).toEqual({ status: 404 });
      expect(http[405].metadata).toEqual({ status: 405 });
      expect(http[409].metadata).toEqual({ status: 409 });
      expect(http[422].metadata).toEqual({ status: 422 });
      expect(http[429].metadata).toEqual({ status: 429 });
    });

    it('should have correct 5xx server error presets', () => {
      expect(http[500].metadata).toEqual({ status: 500 });
      expect(http[501].metadata).toEqual({ status: 501 });
      expect(http[502].metadata).toEqual({ status: 502 });
      expect(http[503].metadata).toEqual({ status: 503 });
      expect(http[504].metadata).toEqual({ status: 504 });
    });
  });

  describe('Serialization', () => {
    it('should serialize preset-based error', () => {
      const error = new ErrorX({
        ...http[404],
        metadata: { userId: 123 },
      });

      const json = error.toJSON();

      expect(json).toMatchObject({
        code: 'NOT_FOUND',
        name: 'Not Found Error',
        message: 'Not found.',
        uiMessage: 'The requested resource could not be found.',
        metadata: { userId: 123 },
      });
    });

    it('should deserialize preset-based error', () => {
      const serialized = {
        code: 'UNAUTHORIZED',
        name: 'Unauthorized Error',
        message: 'Unauthorized.',
        uiMessage: 'Authentication required. Please log in to continue.',
        metadata: { status: 401 },
        timestamp: 1705314645123,
      };

      const error = ErrorX.fromJSON(serialized);

      expect(error.code).toBe('UNAUTHORIZED');
      expect(error.name).toBe('Unauthorized Error');
      expect(error.message).toBe('Unauthorized.');
      expect(error.uiMessage).toBe('Authentication required. Please log in to continue.');
      expect(error.metadata).toEqual({ status: 401 });
    });
  });

  describe('Type safety', () => {
    it('should maintain proper types when spreading presets', () => {
      const options = {
        ...http[400],
        metadata: { field: 'email' },
      };

      // TypeScript should infer this correctly
      const error = new ErrorX(options);

      expect(error.metadata).toEqual({ field: 'email' });
    });
  });
});
