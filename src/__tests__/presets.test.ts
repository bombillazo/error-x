import { describe, expect, it } from 'vitest';
import { ErrorX, HTTPErrorX, ValidationErrorX } from '../index';

describe('HTTPErrorX', () => {
  describe('Basic usage', () => {
    it('should create error with 404 preset', () => {
      const error = HTTPErrorX.create(404);

      expect(error.code).toBe('NOT_FOUND');
      expect(error.name).toBe('NotFoundError');
      expect(error.message).toBe('Not found.');
      expect(error.httpStatus).toBe(404);
    });

    it('should create error with 401 preset', () => {
      const error = HTTPErrorX.create(401);

      expect(error.code).toBe('UNAUTHORIZED');
      expect(error.name).toBe('UnauthorizedError');
      expect(error.message).toBe('Unauthorized.');
      expect(error.httpStatus).toBe(401);
    });

    it('should create error with 500 preset', () => {
      const error = HTTPErrorX.create(500);

      expect(error.code).toBe('INTERNAL_SERVER_ERROR');
      expect(error.name).toBe('InternalServerError');
      expect(error.message).toBe('Internal server error.');
      expect(error.httpStatus).toBe(500);
    });

    it('should default to 500 when no preset key provided', () => {
      const error = HTTPErrorX.create();

      expect(error.code).toBe('INTERNAL_SERVER_ERROR');
      expect(error.httpStatus).toBe(500);
    });
  });

  describe('instanceof support', () => {
    it('should be instanceof HTTPErrorX, ErrorX, and Error', () => {
      const error = HTTPErrorX.create(404);

      expect(error).toBeInstanceOf(HTTPErrorX);
      expect(error).toBeInstanceOf(ErrorX);
      expect(error).toBeInstanceOf(Error);
    });

    it('should allow catching HTTPErrorX specifically', () => {
      const error = HTTPErrorX.create(404);
      let caught = false;

      try {
        throw error;
      } catch (e) {
        if (e instanceof HTTPErrorX) {
          caught = true;
          expect(e.httpStatus).toBe(404);
        }
      }

      expect(caught).toBe(true);
    });
  });

  describe('Overrides', () => {
    it('should override preset message', () => {
      const error = HTTPErrorX.create(404, { message: 'User not found' });

      expect(error.code).toBe('NOT_FOUND');
      expect(error.name).toBe('NotFoundError');
      expect(error.message).toBe('User not found');
      expect(error.httpStatus).toBe(404);
    });

    it('should override preset code', () => {
      const error = HTTPErrorX.create(400, { code: 'VALIDATION_ERROR' });

      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.name).toBe('BadRequestError');
      expect(error.httpStatus).toBe(400);
    });

    it('should override preset name', () => {
      const error = HTTPErrorX.create(403, { name: 'AccessDeniedError' });

      expect(error.code).toBe('FORBIDDEN');
      expect(error.name).toBe('AccessDeniedError');
      expect(error.httpStatus).toBe(403);
    });

    it('should override multiple preset values', () => {
      const error = HTTPErrorX.create(404, {
        message: 'Product not found',
        code: 'PRODUCT_NOT_FOUND',
        name: 'ProductNotFoundError',
      });

      expect(error.code).toBe('PRODUCT_NOT_FOUND');
      expect(error.name).toBe('ProductNotFoundError');
      expect(error.message).toBe('Product not found');
      expect(error.httpStatus).toBe(404);
    });
  });

  describe('Metadata', () => {
    it('should add metadata to error', () => {
      const error = HTTPErrorX.create(404, {
        metadata: { endpoint: '/api/users/123', method: 'GET' },
      });

      expect(error.metadata).toEqual({ endpoint: '/api/users/123', method: 'GET' });
      expect(error.httpStatus).toBe(404);
    });
  });

  describe('Error chaining', () => {
    it('should add cause to error', () => {
      const originalError = new Error('Database connection failed');
      const error = HTTPErrorX.create(500, { cause: originalError });

      expect(error.parent).toBeInstanceOf(ErrorX);
      expect(error.parent?.message).toBe(originalError.message);
      expect(error.parent?.original).toEqual({
        message: originalError.message,
        name: originalError.name,
        stack: originalError.stack,
      });
      expect(error.httpStatus).toBe(500);
    });
  });

  describe('Call signatures', () => {
    it('create() - uses default 500', () => {
      const error = HTTPErrorX.create();

      expect(error.httpStatus).toBe(500);
      expect(error.code).toBe('INTERNAL_SERVER_ERROR');
    });

    it('create(statusCode) - uses specified preset', () => {
      const error = HTTPErrorX.create(404);

      expect(error.httpStatus).toBe(404);
      expect(error.code).toBe('NOT_FOUND');
    });

    it('create(statusCode, overrides) - preset with overrides', () => {
      const error = HTTPErrorX.create(404, { message: 'Custom message' });

      expect(error.httpStatus).toBe(404);
      expect(error.message).toBe('Custom message');
    });

    it('create(overrides) - just overrides, uses default 500', () => {
      const error = HTTPErrorX.create({ message: 'Custom error' });

      expect(error.httpStatus).toBe(500);
      expect(error.message).toBe('Custom error');
    });
  });

  describe('All status codes', () => {
    it('should have all 4xx client error presets', () => {
      const clientErrors = [
        400, 401, 402, 403, 404, 405, 406, 407, 408, 409, 410, 411, 412, 413, 414, 415, 416, 417,
        418, 422, 423, 424, 425, 426, 428, 429, 431, 451,
      ];

      for (const status of clientErrors) {
        const error = HTTPErrorX.create(status);
        expect(error.httpStatus).toBe(status);
        expect(error.code).toBeTruthy();
        expect(error.message).toBeTruthy();
      }
    });

    it('should have all 5xx server error presets', () => {
      const serverErrors = [500, 501, 502, 503, 504, 505, 506, 507, 508, 510, 511];

      for (const status of serverErrors) {
        const error = HTTPErrorX.create(status);
        expect(error.httpStatus).toBe(status);
        expect(error.code).toBeTruthy();
        expect(error.message).toBeTruthy();
      }
    });
  });

  describe('Serialization', () => {
    it('should serialize HTTPErrorX', () => {
      const error = HTTPErrorX.create(404, {
        metadata: { userId: 123 },
      });

      const json = error.toJSON();

      expect(json).toMatchObject({
        code: 'NOT_FOUND',
        name: 'NotFoundError',
        message: 'Not found.',
        httpStatus: 404,
        metadata: { userId: 123 },
      });
    });

    it('should deserialize to ErrorX (not HTTPErrorX)', () => {
      const error = HTTPErrorX.create(401);
      const serialized = error.toJSON();
      const deserialized = ErrorX.fromJSON(serialized);

      // Note: fromJSON returns ErrorX, not HTTPErrorX
      // This is expected - type info is lost during serialization
      expect(deserialized).toBeInstanceOf(ErrorX);
      expect(deserialized.code).toBe('UNAUTHORIZED');
      expect(deserialized.httpStatus).toBe(401);
    });
  });

  describe('Unknown status codes', () => {
    it('should fall back to 500 for unknown status code', () => {
      const error = HTTPErrorX.create(999);

      // Falls back to defaultPreset (500)
      expect(error.httpStatus).toBe(500);
      expect(error.code).toBe('INTERNAL_SERVER_ERROR');
    });
  });
});

describe('ValidationErrorX', () => {
  describe('fromZodError', () => {
    it('should create error from Zod error with single issue', () => {
      const zodError = {
        issues: [
          {
            code: 'invalid_type',
            path: ['email'],
            message: 'Expected string, received number',
            expected: 'string',
            received: 'number',
          },
        ],
      };

      const error = ValidationErrorX.fromZodError(zodError);

      expect(error.code).toBe('VALIDATION_INVALID_TYPE');
      expect(error.message).toBe('Expected string, received number');
      expect(error.metadata?.field).toBe('email');
      expect(error.metadata?.path).toEqual(['email']);
      expect(error.metadata?.zodCode).toBe('invalid_type');
      expect(error.metadata?.expected).toBe('string');
      expect(error.metadata?.received).toBe('number');
      expect(error.metadata?.issueCount).toBe(1);
      expect(error.metadata?.issues).toHaveLength(1);
      expect(error.httpStatus).toBe(400);
    });

    it('should create error from Zod error with nested path', () => {
      const zodError = {
        issues: [
          {
            code: 'too_small',
            path: ['user', 'address', 'zipCode'],
            message: 'String must contain at least 5 character(s)',
          },
        ],
      };

      const error = ValidationErrorX.fromZodError(zodError);

      expect(error.code).toBe('VALIDATION_TOO_SMALL');
      expect(error.metadata?.field).toBe('user.address.zipCode');
      expect(error.metadata?.path).toEqual(['user', 'address', 'zipCode']);
    });

    it('should handle multiple issues and report count', () => {
      const zodError = {
        issues: [
          { code: 'invalid_type', path: ['name'], message: 'Required' },
          { code: 'invalid_type', path: ['email'], message: 'Required' },
          { code: 'too_small', path: ['age'], message: 'Must be >= 18' },
        ],
      };

      const error = ValidationErrorX.fromZodError(zodError);

      // Uses first issue for primary fields
      expect(error.code).toBe('VALIDATION_INVALID_TYPE');
      expect(error.metadata?.field).toBe('name');
      expect(error.metadata?.issueCount).toBe(3);
      expect(error.metadata?.issues).toHaveLength(3);
    });

    it('should allow overrides', () => {
      const zodError = {
        issues: [{ code: 'custom', path: ['field'], message: 'Error' }],
      };

      const error = ValidationErrorX.fromZodError(zodError, {
        message: 'Please fix the form errors',
        code: 'FORM_INVALID',
      });

      expect(error.message).toBe('Please fix the form errors');
      // Transform still applies the VALIDATION_ prefix
      expect(error.code).toBe('VALIDATION_FORM_INVALID');
    });

    it('should handle empty issues array', () => {
      const zodError = { issues: [] };

      const error = ValidationErrorX.fromZodError(zodError);

      expect(error.code).toBe('VALIDATION_UNKNOWN');
      expect(error.message).toBe('Validation failed');
      expect(error.metadata?.issueCount).toBe(0);
    });
  });

  describe('forField', () => {
    it('should create error for a specific field', () => {
      const error = ValidationErrorX.forField('email', 'Invalid email format');

      expect(error.code).toBe('VALIDATION_INVALID_FIELD');
      expect(error.message).toBe('Invalid email format');
      expect(error.metadata?.field).toBe('email');
      expect(error.metadata?.path).toEqual(['email']);
      expect(error.httpStatus).toBe(400);
    });

    it('should handle nested field path', () => {
      const error = ValidationErrorX.forField('user.profile.bio', 'Bio is too long');

      expect(error.metadata?.field).toBe('user.profile.bio');
      expect(error.metadata?.path).toEqual(['user', 'profile', 'bio']);
    });

    it('should allow custom code', () => {
      const error = ValidationErrorX.forField('age', 'Must be 18 or older', {
        code: 'TOO_YOUNG',
      });

      expect(error.code).toBe('VALIDATION_TOO_YOUNG');
      expect(error.message).toBe('Must be 18 or older');
    });
  });

  describe('instanceof support', () => {
    it('should be instanceof ValidationErrorX, ErrorX, and Error', () => {
      const zodError = {
        issues: [{ code: 'custom', path: ['test'], message: 'Test' }],
      };
      const error = ValidationErrorX.fromZodError(zodError);

      expect(error).toBeInstanceOf(ValidationErrorX);
      expect(error).toBeInstanceOf(ErrorX);
      expect(error).toBeInstanceOf(Error);
    });

    it('should allow catching ValidationErrorX specifically', () => {
      const zodError = {
        issues: [{ code: 'custom', path: ['test'], message: 'Test' }],
      };
      let caught = false;

      try {
        throw ValidationErrorX.fromZodError(zodError);
      } catch (e) {
        if (e instanceof ValidationErrorX) {
          caught = true;
          expect(e.metadata?.field).toBe('test');
        }
      }

      expect(caught).toBe(true);
    });
  });

  describe('create (using defaults)', () => {
    it('should create a basic validation error with defaults', () => {
      const error = ValidationErrorX.create();

      // Default code already has VALIDATION_ prefix, transform doesn't double it
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.httpStatus).toBe(400);
      expect(error.name).toBe('ValidationErrorX');
    });

    it('should allow overrides via create', () => {
      const error = ValidationErrorX.create({
        message: 'Custom validation message',
        code: 'CUSTOM_CHECK',
      });

      expect(error.code).toBe('VALIDATION_CUSTOM_CHECK');
      expect(error.message).toBe('Custom validation message');
    });
  });

  describe('Serialization', () => {
    it('should serialize ValidationErrorX with metadata', () => {
      const zodError = {
        issues: [
          {
            code: 'invalid_type',
            path: ['email'],
            message: 'Invalid email',
            expected: 'string',
            received: 'number',
          },
        ],
      };
      const error = ValidationErrorX.fromZodError(zodError);
      const json = error.toJSON();

      expect(json).toMatchObject({
        code: 'VALIDATION_INVALID_TYPE',
        name: 'ValidationErrorX',
        httpStatus: 400,
        metadata: {
          field: 'email',
          zodCode: 'invalid_type',
          issueCount: 1,
        },
      });
    });
  });
});
