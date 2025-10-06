import { describe, expect, it } from 'vitest';
import { ErrorX, http } from '../index.js';

describe('HTTP Presets', () => {
  describe('Basic preset usage', () => {
    it('should create error with notFound preset', () => {
      const error = new ErrorX(http.notFound);

      expect(error.httpStatus).toBe(404);
      expect(error.code).toBe('NOT_FOUND');
      expect(error.name).toBe('Not Found Error');
      expect(error.message).toBe('Not found.');
      expect(error.uiMessage).toBe('The requested resource could not be found.');
      expect(error.type).toBe('http');
      expect(error).toBeInstanceOf(ErrorX);
    });

    it('should create error with unauthorized preset', () => {
      const error = new ErrorX(http.unauthorized);

      expect(error.httpStatus).toBe(401);
      expect(error.code).toBe('UNAUTHORIZED');
      expect(error.name).toBe('Unauthorized Error');
      expect(error.message).toBe('Unauthorized.');
      expect(error.uiMessage).toBe('Authentication required. Please log in to continue.');
      expect(error.type).toBe('http');
    });

    it('should create error with internalServerError preset', () => {
      const error = new ErrorX(http.internalServerError);

      expect(error.httpStatus).toBe(500);
      expect(error.code).toBe('INTERNAL_SERVER_ERROR');
      expect(error.name).toBe('Internal Server Error');
      expect(error.message).toBe('Internal server error.');
      expect(error.uiMessage).toBe('An unexpected error occurred. Please try again later.');
      expect(error.type).toBe('http');
    });
  });

  describe('Preset override', () => {
    it('should override preset message', () => {
      const error = new ErrorX({
        ...http.notFound,
        message: 'User not found',
      });

      expect(error.httpStatus).toBe(404);
      expect(error.code).toBe('NOT_FOUND');
      expect(error.name).toBe('Not Found Error');
      expect(error.message).toBe('User not found');
    });

    it('should override preset code', () => {
      const error = new ErrorX({
        ...http.badRequest,
        code: 'VALIDATION_ERROR',
      });

      expect(error.httpStatus).toBe(400);
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.name).toBe('Bad Request Error');
    });

    it('should override preset name', () => {
      const error = new ErrorX({
        ...http.forbidden,
        name: 'AccessDeniedError',
      });

      expect(error.httpStatus).toBe(403);
      expect(error.code).toBe('FORBIDDEN');
      expect(error.name).toBe('AccessDeniedError');
    });

    it('should override multiple preset values', () => {
      const error = new ErrorX({
        ...http.notFound,
        message: 'Product not found',
        code: 'PRODUCT_NOT_FOUND',
        name: 'ProductNotFoundError',
      });

      expect(error.httpStatus).toBe(404);
      expect(error.code).toBe('PRODUCT_NOT_FOUND');
      expect(error.name).toBe('ProductNotFoundError');
      expect(error.message).toBe('Product not found');
    });
  });

  describe('Preset with additional options', () => {
    it('should add metadata to preset', () => {
      const error = new ErrorX({
        ...http.notFound,
        metadata: { userId: 123, resource: 'user' },
      });

      expect(error.httpStatus).toBe(404);
      expect(error.metadata).toEqual({ userId: 123, resource: 'user' });
    });

    it('should override uiMessage from preset', () => {
      const error = new ErrorX({
        ...http.unauthorized,
        uiMessage: 'Custom message: Please log in',
      });

      expect(error.httpStatus).toBe(401);
      expect(error.uiMessage).toBe('Custom message: Please log in');
    });

    it('should add cause to preset', () => {
      const originalError = new Error('Database connection failed');
      const error = new ErrorX({
        ...http.internalServerError,
        cause: originalError,
      });

      expect(error.httpStatus).toBe(500);
      expect(error.cause).toEqual({
        message: originalError.message,
        name: originalError.name,
        stack: originalError.stack,
      });
    });
  });

  describe('Common HTTP status codes', () => {
    it('should have correct 4xx client error presets', () => {
      expect(http.badRequest.httpStatus).toBe(400);
      expect(http.unauthorized.httpStatus).toBe(401);
      expect(http.forbidden.httpStatus).toBe(403);
      expect(http.notFound.httpStatus).toBe(404);
      expect(http.methodNotAllowed.httpStatus).toBe(405);
      expect(http.conflict.httpStatus).toBe(409);
      expect(http.unprocessableEntity.httpStatus).toBe(422);
      expect(http.tooManyRequests.httpStatus).toBe(429);
    });

    it('should have correct 5xx server error presets', () => {
      expect(http.internalServerError.httpStatus).toBe(500);
      expect(http.notImplemented.httpStatus).toBe(501);
      expect(http.badGateway.httpStatus).toBe(502);
      expect(http.serviceUnavailable.httpStatus).toBe(503);
      expect(http.gatewayTimeout.httpStatus).toBe(504);
    });
  });

  describe('Serialization', () => {
    it('should serialize preset-based error', () => {
      const error = new ErrorX({
        ...http.notFound,
        metadata: { userId: 123 },
      });

      const json = error.toJSON();

      expect(json).toMatchObject({
        httpStatus: 404,
        code: 'NOT_FOUND',
        name: 'Not Found Error',
        message: 'Not found.',
        uiMessage: 'The requested resource could not be found.',
        metadata: { userId: 123 },
      });
    });

    it('should deserialize preset-based error', () => {
      const serialized = {
        httpStatus: 401,
        code: 'UNAUTHORIZED',
        name: 'Unauthorized Error',
        message: 'Unauthorized.',
        uiMessage: 'Authentication required. Please log in to continue.',
        metadata: undefined,
        timestamp: '2024-01-15T10:30:45.123Z',
      };

      const error = ErrorX.fromJSON(serialized);

      expect(error.httpStatus).toBe(401);
      expect(error.code).toBe('UNAUTHORIZED');
      expect(error.name).toBe('Unauthorized Error');
      expect(error.message).toBe('Unauthorized.');
      expect(error.uiMessage).toBe('Authentication required. Please log in to continue.');
    });
  });

  describe('Type safety', () => {
    it('should maintain proper types when spreading presets', () => {
      const options = {
        ...http.badRequest,
        metadata: { field: 'email' },
      };

      // TypeScript should infer this correctly
      const error = new ErrorX(options);

      expect(error.httpStatus).toBe(400);
      expect(error.metadata).toEqual({ field: 'email' });
    });
  });
});
