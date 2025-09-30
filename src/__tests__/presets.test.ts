import { describe, expect, it } from 'vitest';
import { ErrorX } from '../error.js';
import { PRESETS } from '../presets.js';

describe('PRESETS', () => {
  describe('Basic preset usage', () => {
    it('should create error with NOT_FOUND preset', () => {
      const error = new ErrorX(PRESETS.HTTP.NOT_FOUND);

      expect(error.httpStatus).toBe(404);
      expect(error.code).toBe('NOT_FOUND');
      expect(error.name).toBe('NotFoundError');
      expect(error.message).toBe('Not found.');
      expect(error.uiMessage).toBe('The requested resource could not be found.');
      expect(error.type).toBe('http');
      expect(error).toBeInstanceOf(ErrorX);
    });

    it('should create error with UNAUTHORIZED preset', () => {
      const error = new ErrorX(PRESETS.HTTP.UNAUTHORIZED);

      expect(error.httpStatus).toBe(401);
      expect(error.code).toBe('UNAUTHORIZED');
      expect(error.name).toBe('UnauthorizedError');
      expect(error.message).toBe('Unauthorized.');
      expect(error.uiMessage).toBe('Authentication required. Please log in to continue.');
      expect(error.type).toBe('http');
    });

    it('should create error with INTERNAL_SERVER_ERROR preset', () => {
      const error = new ErrorX(PRESETS.HTTP.INTERNAL_SERVER_ERROR);

      expect(error.httpStatus).toBe(500);
      expect(error.code).toBe('INTERNAL_SERVER_ERROR');
      expect(error.name).toBe('InternalServerError');
      expect(error.message).toBe('Internal server error.');
      expect(error.uiMessage).toBe('An unexpected error occurred. Please try again later.');
      expect(error.type).toBe('http');
    });
  });

  describe('Preset override', () => {
    it('should override preset message', () => {
      const error = new ErrorX({
        ...PRESETS.HTTP.NOT_FOUND,
        message: 'User not found',
      });

      expect(error.httpStatus).toBe(404);
      expect(error.code).toBe('NOT_FOUND');
      expect(error.name).toBe('NotFoundError');
      expect(error.message).toBe('User not found.');
    });

    it('should override preset code', () => {
      const error = new ErrorX({
        ...PRESETS.HTTP.BAD_REQUEST,
        code: 'VALIDATION_ERROR',
      });

      expect(error.httpStatus).toBe(400);
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.name).toBe('BadRequestError');
    });

    it('should override preset name', () => {
      const error = new ErrorX({
        ...PRESETS.HTTP.FORBIDDEN,
        name: 'AccessDeniedError',
      });

      expect(error.httpStatus).toBe(403);
      expect(error.code).toBe('FORBIDDEN');
      expect(error.name).toBe('AccessDeniedError');
    });

    it('should override multiple preset values', () => {
      const error = new ErrorX({
        ...PRESETS.HTTP.NOT_FOUND,
        message: 'Product not found',
        code: 'PRODUCT_NOT_FOUND',
        name: 'ProductNotFoundError',
      });

      expect(error.httpStatus).toBe(404);
      expect(error.code).toBe('PRODUCT_NOT_FOUND');
      expect(error.name).toBe('ProductNotFoundError');
      expect(error.message).toBe('Product not found.');
    });
  });

  describe('Preset with additional options', () => {
    it('should add metadata to preset', () => {
      const error = new ErrorX({
        ...PRESETS.HTTP.NOT_FOUND,
        metadata: { userId: 123, resource: 'user' },
      });

      expect(error.httpStatus).toBe(404);
      expect(error.metadata).toEqual({ userId: 123, resource: 'user' });
    });

    it('should override uiMessage from preset', () => {
      const error = new ErrorX({
        ...PRESETS.HTTP.UNAUTHORIZED,
        uiMessage: 'Custom message: Please log in',
      });

      expect(error.httpStatus).toBe(401);
      expect(error.uiMessage).toBe('Custom message: Please log in');
    });

    it('should add actions to preset', () => {
      const error = new ErrorX({
        ...PRESETS.HTTP.UNAUTHORIZED,
        actions: [
          {
            action: 'redirect',
            payload: { redirectURL: '/login' },
          },
        ],
      });

      expect(error.httpStatus).toBe(401);
      expect(error.actions).toEqual([
        {
          action: 'redirect',
          payload: { redirectURL: '/login' },
        },
      ]);
    });

    it('should add cause to preset', () => {
      const originalError = new Error('Database connection failed');
      const error = new ErrorX({
        ...PRESETS.HTTP.INTERNAL_SERVER_ERROR,
        cause: originalError,
      });

      expect(error.httpStatus).toBe(500);
      expect(error.cause).toBe(originalError);
    });
  });

  describe('Common HTTP status codes', () => {
    it('should have correct 4xx client error presets', () => {
      expect(PRESETS.HTTP.BAD_REQUEST.httpStatus).toBe(400);
      expect(PRESETS.HTTP.UNAUTHORIZED.httpStatus).toBe(401);
      expect(PRESETS.HTTP.FORBIDDEN.httpStatus).toBe(403);
      expect(PRESETS.HTTP.NOT_FOUND.httpStatus).toBe(404);
      expect(PRESETS.HTTP.METHOD_NOT_ALLOWED.httpStatus).toBe(405);
      expect(PRESETS.HTTP.CONFLICT.httpStatus).toBe(409);
      expect(PRESETS.HTTP.UNPROCESSABLE_ENTITY.httpStatus).toBe(422);
      expect(PRESETS.HTTP.TOO_MANY_REQUESTS.httpStatus).toBe(429);
    });

    it('should have correct 5xx server error presets', () => {
      expect(PRESETS.HTTP.INTERNAL_SERVER_ERROR.httpStatus).toBe(500);
      expect(PRESETS.HTTP.NOT_IMPLEMENTED.httpStatus).toBe(501);
      expect(PRESETS.HTTP.BAD_GATEWAY.httpStatus).toBe(502);
      expect(PRESETS.HTTP.SERVICE_UNAVAILABLE.httpStatus).toBe(503);
      expect(PRESETS.HTTP.GATEWAY_TIMEOUT.httpStatus).toBe(504);
    });
  });

  describe('Serialization', () => {
    it('should serialize preset-based error', () => {
      const error = new ErrorX({
        ...PRESETS.HTTP.NOT_FOUND,
        metadata: { userId: 123 },
      });

      const json = error.toJSON();

      expect(json).toMatchObject({
        httpStatus: 404,
        code: 'NOT_FOUND',
        name: 'NotFoundError',
        message: 'Not found.',
        uiMessage: 'The requested resource could not be found.',
        metadata: { userId: 123 },
      });
    });

    it('should deserialize preset-based error', () => {
      const serialized = {
        httpStatus: 401,
        code: 'UNAUTHORIZED',
        name: 'UnauthorizedError',
        message: 'Unauthorized.',
        uiMessage: 'Authentication required. Please log in to continue.',
        metadata: undefined,
        timestamp: '2024-01-15T10:30:45.123Z',
      };

      const error = ErrorX.fromJSON(serialized);

      expect(error.httpStatus).toBe(401);
      expect(error.code).toBe('UNAUTHORIZED');
      expect(error.name).toBe('UnauthorizedError');
      expect(error.message).toBe('Unauthorized.');
      expect(error.uiMessage).toBe('Authentication required. Please log in to continue.');
    });
  });

  describe('Type safety', () => {
    it('should maintain proper types when spreading presets', () => {
      const options = {
        ...PRESETS.HTTP.BAD_REQUEST,
        metadata: { field: 'email' },
      };

      // TypeScript should infer this correctly
      const error = new ErrorX(options);

      expect(error.httpStatus).toBe(400);
      expect(error.metadata).toEqual({ field: 'email' });
    });
  });
});
