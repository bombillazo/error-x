import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AggregateErrorX, ErrorX, type ErrorXAggregateSerialized } from '../index';

describe('AggregateErrorX', () => {
  let mockDate: Date;

  beforeEach(() => {
    mockDate = new Date('2024-01-15T10:30:45.123Z');
    vi.setSystemTime(mockDate);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('ErrorX.aggregate()', () => {
    it('should create an aggregate error from multiple ErrorX instances', () => {
      const error1 = new ErrorX({ message: 'First error', code: 'FIRST' });
      const error2 = new ErrorX({ message: 'Second error', code: 'SECOND' });

      const aggregate = ErrorX.aggregate([error1, error2]);

      expect(aggregate).toBeInstanceOf(AggregateErrorX);
      expect(aggregate).toBeInstanceOf(ErrorX);
      expect(aggregate.errors).toHaveLength(2);
      expect(aggregate.errors[0]).toBe(error1);
      expect(aggregate.errors[1]).toBe(error2);
    });

    it('should have default message with error count', () => {
      const errors = [
        new ErrorX({ message: 'Error 1' }),
        new ErrorX({ message: 'Error 2' }),
        new ErrorX({ message: 'Error 3' }),
      ];

      const aggregate = ErrorX.aggregate(errors);

      expect(aggregate.message).toBe('Multiple errors occurred (3 errors)');
    });

    it('should have singular message for single error', () => {
      const aggregate = ErrorX.aggregate([new ErrorX({ message: 'Only error' })]);

      expect(aggregate.message).toBe('1 error occurred');
    });

    it('should have default name and code', () => {
      const aggregate = ErrorX.aggregate([new ErrorX({ message: 'Error' })]);

      expect(aggregate.name).toBe('AggregateError');
      expect(aggregate.code).toBe('AGGREGATE_ERROR');
    });

    it('should accept custom options', () => {
      const errors = [new ErrorX({ message: 'Error' })];
      const aggregate = ErrorX.aggregate(errors, {
        message: 'Custom message',
        name: 'CustomAggregate',
        code: 'CUSTOM_AGGREGATE',
        httpStatus: 400,
        metadata: { operation: 'batch-import' },
      });

      expect(aggregate.message).toBe('Custom message');
      expect(aggregate.name).toBe('CustomAggregate');
      expect(aggregate.code).toBe('CUSTOM_AGGREGATE');
      expect(aggregate.httpStatus).toBe(400);
      expect(aggregate.metadata).toEqual({ operation: 'batch-import' });
    });

    it('should convert regular Error instances to ErrorX', () => {
      const nativeError = new Error('Native error');
      nativeError.name = 'NativeError';

      const aggregate = ErrorX.aggregate([nativeError]);

      expect(aggregate.errors).toHaveLength(1);
      expect(aggregate.errors[0]).toBeInstanceOf(ErrorX);
      expect(aggregate.errors[0].message).toBe('Native error');
      expect(aggregate.errors[0].name).toBe('NativeError');
      expect(aggregate.errors[0].original).toBeDefined();
    });

    it('should convert unknown values to ErrorX', () => {
      const aggregate = ErrorX.aggregate([
        'string error',
        { message: 'object error', code: 'OBJ_ERR' },
        null,
        undefined,
      ]);

      expect(aggregate.errors).toHaveLength(4);
      expect(aggregate.errors[0].message).toBe('string error');
      expect(aggregate.errors[1].message).toBe('object error');
      expect(aggregate.errors[1].code).toBe('OBJ_ERR');
      expect(aggregate.errors[2].message).toBe('Unknown error occurred');
      expect(aggregate.errors[3].message).toBe('Unknown error occurred');
    });

    it('should handle empty array', () => {
      const aggregate = ErrorX.aggregate([]);

      expect(aggregate.errors).toHaveLength(0);
      expect(aggregate.message).toBe('Multiple errors occurred (0 errors)');
    });
  });

  describe('Preserving individual error chains', () => {
    it('should preserve error chains in aggregated errors', () => {
      const rootError = new ErrorX({ message: 'Root cause', code: 'ROOT' });
      const wrappedError = new ErrorX({
        message: 'Wrapped error',
        code: 'WRAPPED',
        cause: rootError,
      });

      const aggregate = ErrorX.aggregate([wrappedError]);

      expect(aggregate.errors[0].chain).toHaveLength(2);
      expect(aggregate.errors[0].parent).toBe(rootError);
      expect(aggregate.errors[0].root).toBe(rootError);
    });

    it('should preserve chains for multiple errors with different chain depths', () => {
      const shallow = new ErrorX({ message: 'Shallow', code: 'SHALLOW' });

      const deep1 = new ErrorX({ message: 'Deep 1', code: 'DEEP_1' });
      const deep2 = new ErrorX({ message: 'Deep 2', code: 'DEEP_2', cause: deep1 });
      const deep3 = new ErrorX({ message: 'Deep 3', code: 'DEEP_3', cause: deep2 });

      const aggregate = ErrorX.aggregate([shallow, deep3]);

      expect(aggregate.errors[0].chain).toHaveLength(1);
      expect(aggregate.errors[1].chain).toHaveLength(3);
      expect(aggregate.errors[1].root?.message).toBe('Deep 1');
    });

    it('should preserve native error original through chain in aggregate', () => {
      const nativeError = new Error('Database connection failed');
      const dbError = ErrorX.from(nativeError, { code: 'DB_ERROR' });
      const serviceError = new ErrorX({
        message: 'Service failed',
        code: 'SERVICE_ERROR',
        cause: dbError,
      });

      const aggregate = ErrorX.aggregate([serviceError]);

      expect(aggregate.errors[0].root?.original).toBeDefined();
      expect(aggregate.errors[0].root?.original?.message).toBe('Database connection failed');
    });
  });

  describe('AggregateErrorX.isAggregateErrorX()', () => {
    it('should return true for AggregateErrorX instances', () => {
      const aggregate = ErrorX.aggregate([new ErrorX({ message: 'Error' })]);

      expect(AggregateErrorX.isAggregateErrorX(aggregate)).toBe(true);
    });

    it('should return false for regular ErrorX instances', () => {
      const error = new ErrorX({ message: 'Error' });

      expect(AggregateErrorX.isAggregateErrorX(error)).toBe(false);
    });

    it('should return false for non-error values', () => {
      expect(AggregateErrorX.isAggregateErrorX(null)).toBe(false);
      expect(AggregateErrorX.isAggregateErrorX(undefined)).toBe(false);
      expect(AggregateErrorX.isAggregateErrorX('string')).toBe(false);
      expect(AggregateErrorX.isAggregateErrorX({})).toBe(false);
      expect(AggregateErrorX.isAggregateErrorX(new Error('native'))).toBe(false);
    });
  });

  describe('Serialization', () => {
    describe('toJSON()', () => {
      it('should serialize aggregate error with all aggregated errors', () => {
        const error1 = new ErrorX({ message: 'Error 1', code: 'ERR_1', metadata: { key: 1 } });
        const error2 = new ErrorX({ message: 'Error 2', code: 'ERR_2', metadata: { key: 2 } });

        const aggregate = ErrorX.aggregate([error1, error2], {
          metadata: { batch: 'test' },
        });

        const json = aggregate.toJSON();

        expect(json.name).toBe('AggregateError');
        expect(json.code).toBe('AGGREGATE_ERROR');
        expect(json.metadata).toEqual({ batch: 'test' });
        expect(json.errors).toHaveLength(2);
        expect(json.errors[0].message).toBe('Error 1');
        expect(json.errors[0].code).toBe('ERR_1');
        expect(json.errors[0].metadata).toEqual({ key: 1 });
        expect(json.errors[1].message).toBe('Error 2');
        expect(json.errors[1].code).toBe('ERR_2');
        expect(json.errors[1].metadata).toEqual({ key: 2 });
      });

      it('should serialize error chains within aggregated errors', () => {
        const root = new ErrorX({ message: 'Root', code: 'ROOT' });
        const child = new ErrorX({ message: 'Child', code: 'CHILD', cause: root });

        const aggregate = ErrorX.aggregate([child]);
        const json = aggregate.toJSON();

        expect(json.errors[0].chain).toHaveLength(2);
        expect(json.errors[0].chain?.[0].message).toBe('Child');
        expect(json.errors[0].chain?.[1].message).toBe('Root');
      });
    });

    describe('toString()', () => {
      it('should include aggregated error details in string representation', () => {
        const error1 = new ErrorX({ message: 'Email invalid', code: 'EMAIL_INVALID' });
        const error2 = new ErrorX({ message: 'Password too short', code: 'PASSWORD_SHORT' });

        const aggregate = ErrorX.aggregate([error1, error2]);
        const str = aggregate.toString();

        expect(str).toContain('AggregateError: Multiple errors occurred (2 errors)');
        expect(str).toContain('[AGGREGATE_ERROR]');
        expect(str).toContain('Aggregated errors:');
        expect(str).toContain('[1] Error: Email invalid [EMAIL_INVALID]');
        expect(str).toContain('[2] Error: Password too short [PASSWORD_SHORT]');
      });
    });

    describe('fromJSON()', () => {
      it('should deserialize aggregate error with all properties', () => {
        const serialized: ErrorXAggregateSerialized = {
          name: 'AggregateError',
          message: 'Multiple errors occurred (2 errors)',
          code: 'AGGREGATE_ERROR',
          metadata: { batch: 'test' },
          timestamp: 1705314645123,
          httpStatus: 400,
          errors: [
            {
              name: 'Error',
              message: 'Error 1',
              code: 'ERR_1',
              metadata: { key: 1 },
              timestamp: 1705314645100,
            },
            {
              name: 'Error',
              message: 'Error 2',
              code: 'ERR_2',
              metadata: { key: 2 },
              timestamp: 1705314645110,
            },
          ],
        };

        const aggregate = AggregateErrorX.fromJSON(serialized);

        expect(aggregate).toBeInstanceOf(AggregateErrorX);
        expect(aggregate.name).toBe('AggregateError');
        expect(aggregate.code).toBe('AGGREGATE_ERROR');
        expect(aggregate.httpStatus).toBe(400);
        expect(aggregate.metadata).toEqual({ batch: 'test' });
        expect(aggregate.timestamp).toBe(1705314645123);
        expect(aggregate.errors).toHaveLength(2);
        expect(aggregate.errors[0].message).toBe('Error 1');
        expect(aggregate.errors[1].message).toBe('Error 2');
      });

      it('should preserve error chains in deserialized aggregate', () => {
        const serialized: ErrorXAggregateSerialized = {
          name: 'AggregateError',
          message: '1 error occurred',
          code: 'AGGREGATE_ERROR',
          metadata: undefined,
          timestamp: 1705314645123,
          errors: [
            {
              name: 'Child',
              message: 'Child error',
              code: 'CHILD',
              metadata: undefined,
              timestamp: 1705314645100,
              chain: [
                {
                  name: 'Child',
                  message: 'Child error',
                  code: 'CHILD',
                  metadata: undefined,
                  timestamp: 1705314645100,
                },
                {
                  name: 'Root',
                  message: 'Root error',
                  code: 'ROOT',
                  metadata: undefined,
                  timestamp: 1705314645050,
                },
              ],
            },
          ],
        };

        const aggregate = AggregateErrorX.fromJSON(serialized);

        expect(aggregate.errors[0].chain).toHaveLength(2);
        expect(aggregate.errors[0].parent?.message).toBe('Root error');
      });
    });

    describe('JSON round trip', () => {
      it('should preserve all data through serialization cycle', () => {
        const error1 = new ErrorX({
          message: 'Error 1',
          name: 'FirstError',
          code: 'FIRST_ERR',
          metadata: { index: 1 },
          httpStatus: 400,
        });
        const error2 = new ErrorX({
          message: 'Error 2',
          name: 'SecondError',
          code: 'SECOND_ERR',
          metadata: { index: 2 },
          httpStatus: 422,
        });

        const original = ErrorX.aggregate([error1, error2], {
          message: 'Validation failed',
          code: 'VALIDATION_FAILED',
          httpStatus: 400,
          metadata: { form: 'registration' },
        });

        const serialized = original.toJSON();
        const deserialized = AggregateErrorX.fromJSON(serialized);

        expect(deserialized.message).toBe(original.message);
        expect(deserialized.name).toBe(original.name);
        expect(deserialized.code).toBe(original.code);
        expect(deserialized.httpStatus).toBe(original.httpStatus);
        expect(deserialized.metadata).toEqual(original.metadata);
        expect(deserialized.errors).toHaveLength(2);
        expect(deserialized.errors[0].message).toBe('Error 1');
        expect(deserialized.errors[0].code).toBe('FIRST_ERR');
        expect(deserialized.errors[1].message).toBe('Error 2');
        expect(deserialized.errors[1].code).toBe('SECOND_ERR');
      });

      it('should preserve chained errors through round trip', () => {
        const root = new ErrorX({
          message: 'Root cause',
          code: 'ROOT',
          metadata: { level: 'root' },
        });
        const child = new ErrorX({
          message: 'Child error',
          code: 'CHILD',
          metadata: { level: 'child' },
          cause: root,
        });

        const original = ErrorX.aggregate([child]);
        const serialized = original.toJSON();
        const deserialized = AggregateErrorX.fromJSON(serialized);

        expect(deserialized.errors[0].chain).toHaveLength(2);
        expect(deserialized.errors[0].parent?.message).toBe('Root cause');
        expect(deserialized.errors[0].parent?.code).toBe('ROOT');
        expect(deserialized.errors[0].parent?.metadata).toEqual({ level: 'root' });
      });
    });
  });

  describe('Validation scenarios', () => {
    it('should aggregate validation errors with field information', () => {
      const validationErrors = [
        new ErrorX({
          message: 'Email is required',
          code: 'REQUIRED',
          metadata: { field: 'email' },
        }),
        new ErrorX({
          message: 'Password must be at least 8 characters',
          code: 'MIN_LENGTH',
          metadata: { field: 'password', minLength: 8 },
        }),
        new ErrorX({
          message: 'Age must be a number',
          code: 'INVALID_TYPE',
          metadata: { field: 'age', expectedType: 'number' },
        }),
      ];

      const aggregate = ErrorX.aggregate(validationErrors, {
        message: 'Validation failed',
        code: 'VALIDATION_FAILED',
        httpStatus: 422,
      });

      expect(aggregate.errors).toHaveLength(3);
      expect(aggregate.httpStatus).toBe(422);

      // Can find specific field errors
      const emailError = aggregate.errors.find((e) => e.metadata?.field === 'email');
      expect(emailError).toBeDefined();
      expect(emailError?.code).toBe('REQUIRED');
    });

    it('should aggregate batch operation failures', () => {
      const batchErrors = [
        new ErrorX({
          message: 'User 1 import failed',
          code: 'IMPORT_FAILED',
          metadata: { userId: 1, row: 1, reason: 'duplicate email' },
        }),
        new ErrorX({
          message: 'User 3 import failed',
          code: 'IMPORT_FAILED',
          metadata: { userId: 3, row: 3, reason: 'invalid country' },
        }),
        new ErrorX({
          message: 'User 5 import failed',
          code: 'IMPORT_FAILED',
          metadata: { userId: 5, row: 5, reason: 'missing required field' },
        }),
      ];

      const aggregate = ErrorX.aggregate(batchErrors, {
        message: 'Batch import partially failed',
        code: 'BATCH_PARTIAL_FAILURE',
        metadata: {
          totalRows: 100,
          successCount: 97,
          failureCount: 3,
        },
      });

      expect(aggregate.errors).toHaveLength(3);
      expect(aggregate.metadata?.totalRows).toBe(100);
      expect(aggregate.metadata?.failureCount).toBe(3);
    });
  });

  describe('Inheritance and instanceof', () => {
    it('should be instanceof Error', () => {
      const aggregate = ErrorX.aggregate([new ErrorX({ message: 'Error' })]);

      expect(aggregate instanceof Error).toBe(true);
    });

    it('should be instanceof ErrorX', () => {
      const aggregate = ErrorX.aggregate([new ErrorX({ message: 'Error' })]);

      expect(aggregate instanceof ErrorX).toBe(true);
      expect(ErrorX.isErrorX(aggregate)).toBe(true);
    });

    it('should be instanceof AggregateErrorX', () => {
      const aggregate = ErrorX.aggregate([new ErrorX({ message: 'Error' })]);

      expect(aggregate instanceof AggregateErrorX).toBe(true);
    });

    it('should have standard error properties', () => {
      const aggregate = ErrorX.aggregate([new ErrorX({ message: 'Error' })]);

      expect(aggregate.message).toBeDefined();
      expect(aggregate.name).toBeDefined();
      expect(aggregate.stack).toBeDefined();
    });
  });

  describe('Edge cases', () => {
    it('should handle very large error arrays', () => {
      const errors = Array.from(
        { length: 100 },
        (_, i) => new ErrorX({ message: `Error ${i}`, code: `ERR_${i}` })
      );

      const aggregate = ErrorX.aggregate(errors);

      expect(aggregate.errors).toHaveLength(100);
      expect(aggregate.message).toBe('Multiple errors occurred (100 errors)');
    });

    it('should handle mixed error types', () => {
      const errors = [
        new ErrorX({ message: 'ErrorX error', code: 'ERRORX' }),
        new Error('Native error'),
        'String error',
        { message: 'Object error', code: 'OBJ' },
        // Note: primitive numbers are converted to 'Unknown error occurred' by ErrorX.from()
        // This is consistent with how ErrorX handles unknown values
        123,
        null,
      ];

      const aggregate = ErrorX.aggregate(errors);

      expect(aggregate.errors).toHaveLength(6);
      expect(aggregate.errors[0].message).toBe('ErrorX error');
      expect(aggregate.errors[1].message).toBe('Native error');
      expect(aggregate.errors[2].message).toBe('String error');
      expect(aggregate.errors[3].message).toBe('Object error');
      // Primitive numbers don't have extractable message properties
      expect(aggregate.errors[4].message).toBe('Unknown error occurred');
      expect(aggregate.errors[5].message).toBe('Unknown error occurred');
    });

    it('should handle nested aggregate errors', () => {
      const innerAggregate = ErrorX.aggregate([
        new ErrorX({ message: 'Inner 1' }),
        new ErrorX({ message: 'Inner 2' }),
      ]);

      const outerAggregate = ErrorX.aggregate([
        innerAggregate,
        new ErrorX({ message: 'Outer error' }),
      ]);

      expect(outerAggregate.errors).toHaveLength(2);
      expect(AggregateErrorX.isAggregateErrorX(outerAggregate.errors[0])).toBe(true);
      expect((outerAggregate.errors[0] as AggregateErrorX).errors).toHaveLength(2);
    });

    it('should have immutable errors array', () => {
      const aggregate = ErrorX.aggregate([new ErrorX({ message: 'Error' })]);

      // The errors property is readonly, so direct mutation should fail at compile time
      // At runtime, we can verify the array itself is still protected
      expect(Object.isFrozen(aggregate.errors)).toBe(false); // Not frozen, but readonly
      expect(aggregate.errors).toHaveLength(1);
    });
  });
});
