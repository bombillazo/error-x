import { bench, describe } from 'vitest';
import { AggregateErrorX, ErrorX } from '../error';

// =============================================================================
// Error Creation Benchmarks
// =============================================================================
describe('Error Creation', () => {
  bench('new Error() - native', () => {
    new Error('Test error message');
  });

  bench('new ErrorX() - default', () => {
    new ErrorX();
  });

  bench('new ErrorX(string)', () => {
    new ErrorX('Test error message');
  });

  bench('new ErrorX(options) - basic', () => {
    new ErrorX({
      message: 'Test error message',
      name: 'TestError',
      code: 'TEST_ERROR',
    });
  });

  bench('new ErrorX(options) - with metadata', () => {
    new ErrorX({
      message: 'Test error message',
      name: 'TestError',
      code: 'TEST_ERROR',
      metadata: { userId: 123, action: 'test' },
      httpStatus: 500,
    });
  });

  bench('new ErrorX(options) - with cause (ErrorX)', () => {
    const cause = new ErrorX('Root cause');
    new ErrorX({
      message: 'Test error message',
      cause,
    });
  });

  bench('new ErrorX(options) - with cause (native Error)', () => {
    const cause = new Error('Root cause');
    new ErrorX({
      message: 'Test error message',
      cause,
    });
  });
});

// =============================================================================
// Error Conversion Benchmarks
// =============================================================================
describe('Error Conversion (ErrorX.from)', () => {
  const nativeError = new Error('Test error');
  const errorX = new ErrorX('Test error');
  const apiResponse = {
    message: 'User not found',
    code: 'USER_404',
    status: 404,
    metadata: { userId: 123 },
  };

  bench('from(string)', () => {
    ErrorX.from('Test error message');
  });

  bench('from(Error)', () => {
    ErrorX.from(nativeError);
  });

  bench('from(ErrorX) - passthrough', () => {
    ErrorX.from(errorX);
  });

  bench('from(ErrorX) - with overrides', () => {
    ErrorX.from(errorX, { httpStatus: 500 });
  });

  bench('from(object) - API response', () => {
    ErrorX.from(apiResponse);
  });
});

// =============================================================================
// Serialization Benchmarks
// =============================================================================
describe('Serialization', () => {
  const simpleError = new ErrorX({
    message: 'Simple error',
    code: 'SIMPLE',
  });

  const errorWithMetadata = new ErrorX({
    message: 'Error with metadata',
    code: 'WITH_META',
    metadata: {
      userId: 123,
      action: 'test',
      nested: { a: 1, b: 2 },
      array: [1, 2, 3],
    },
    httpStatus: 500,
  });

  const rootCause = new ErrorX({ message: 'Root cause', code: 'ROOT' });
  const middleError = new ErrorX({ message: 'Middle error', code: 'MIDDLE', cause: rootCause });
  const chainedError = new ErrorX({ message: 'Top error', code: 'TOP', cause: middleError });

  bench('toJSON() - simple', () => {
    simpleError.toJSON();
  });

  bench('toJSON() - with metadata', () => {
    errorWithMetadata.toJSON();
  });

  bench('toJSON() - with chain (3 levels)', () => {
    chainedError.toJSON();
  });

  bench('toString() - simple', () => {
    simpleError.toString();
  });

  bench('toString() - with metadata', () => {
    errorWithMetadata.toString();
  });
});

// =============================================================================
// Deserialization Benchmarks
// =============================================================================
describe('Deserialization', () => {
  const simpleError = new ErrorX({ message: 'Simple error', code: 'SIMPLE' });
  const simpleSerialized = simpleError.toJSON();

  const errorWithMetadata = new ErrorX({
    message: 'Error with metadata',
    code: 'WITH_META',
    metadata: { userId: 123, action: 'test' },
    httpStatus: 500,
  });
  const metadataSerialized = errorWithMetadata.toJSON();

  const rootCause = new ErrorX({ message: 'Root cause', code: 'ROOT' });
  const middleError = new ErrorX({ message: 'Middle error', code: 'MIDDLE', cause: rootCause });
  const chainedError = new ErrorX({ message: 'Top error', code: 'TOP', cause: middleError });
  const chainedSerialized = chainedError.toJSON();

  bench('fromJSON() - simple', () => {
    ErrorX.fromJSON(simpleSerialized);
  });

  bench('fromJSON() - with metadata', () => {
    ErrorX.fromJSON(metadataSerialized);
  });

  bench('fromJSON() - with chain (3 levels)', () => {
    ErrorX.fromJSON(chainedSerialized);
  });
});

// =============================================================================
// Error Chain Benchmarks
// =============================================================================
describe('Error Chaining', () => {
  bench('chain access - root', () => {
    const root = new ErrorX({ message: 'Root', code: 'ROOT' });
    const middle = new ErrorX({ message: 'Middle', cause: root });
    const top = new ErrorX({ message: 'Top', cause: middle });
    top.root;
  });

  bench('chain access - parent', () => {
    const root = new ErrorX({ message: 'Root', code: 'ROOT' });
    const middle = new ErrorX({ message: 'Middle', cause: root });
    const top = new ErrorX({ message: 'Top', cause: middle });
    top.parent;
  });

  bench('chain access - full chain', () => {
    const root = new ErrorX({ message: 'Root', code: 'ROOT' });
    const middle = new ErrorX({ message: 'Middle', cause: root });
    const top = new ErrorX({ message: 'Top', cause: middle });
    top.chain;
  });

  bench('build deep chain (10 levels)', () => {
    let current = new ErrorX({ message: 'Level 0', code: 'LEVEL_0' });
    for (let i = 1; i < 10; i++) {
      current = new ErrorX({ message: `Level ${i}`, cause: current });
    }
  });
});

// =============================================================================
// Aggregation Benchmarks
// =============================================================================
describe('Error Aggregation', () => {
  const singleError = [new ErrorX({ message: 'Error 1', code: 'E1' })];

  const threeErrors = [
    new ErrorX({ message: 'Error 1', code: 'E1' }),
    new ErrorX({ message: 'Error 2', code: 'E2' }),
    new ErrorX({ message: 'Error 3', code: 'E3' }),
  ];

  const tenErrors = Array.from(
    { length: 10 },
    (_, i) => new ErrorX({ message: `Error ${i}`, code: `E${i}` })
  );

  const mixedErrors = [
    new ErrorX({ message: 'Error 1', code: 'E1' }),
    new Error('Native error'),
    { message: 'Object error', code: 'OBJ' },
    'String error',
  ];

  bench('aggregate() - 1 error', () => {
    ErrorX.aggregate(singleError);
  });

  bench('aggregate() - 3 errors', () => {
    ErrorX.aggregate(threeErrors);
  });

  bench('aggregate() - 10 errors', () => {
    ErrorX.aggregate(tenErrors);
  });

  bench('aggregate() - mixed types', () => {
    ErrorX.aggregate(mixedErrors);
  });

  bench('AggregateErrorX.toJSON() - 3 errors', () => {
    const agg = ErrorX.aggregate(threeErrors);
    agg.toJSON();
  });

  bench('AggregateErrorX.fromJSON() - 3 errors', () => {
    const agg = ErrorX.aggregate(threeErrors);
    const serialized = agg.toJSON();
    AggregateErrorX.fromJSON(serialized);
  });
});

// =============================================================================
// Metadata Operations Benchmarks
// =============================================================================
describe('Metadata Operations', () => {
  const baseError = new ErrorX({
    message: 'Base error',
    code: 'BASE',
    metadata: { userId: 123, action: 'test' },
  });

  bench('withMetadata() - add new field', () => {
    baseError.withMetadata({ timestamp: Date.now() });
  });

  bench('withMetadata() - add multiple fields', () => {
    baseError.withMetadata({
      timestamp: Date.now(),
      requestId: 'req_123',
      extra: { nested: true },
    });
  });
});

// =============================================================================
// Type Guards Benchmarks
// =============================================================================
describe('Type Guards', () => {
  const errorX = new ErrorX('Test');
  const nativeError = new Error('Test');
  const aggregateError = ErrorX.aggregate([errorX]);
  const plainObject = { message: 'test' };

  bench('isErrorX() - ErrorX', () => {
    ErrorX.isErrorX(errorX);
  });

  bench('isErrorX() - native Error', () => {
    ErrorX.isErrorX(nativeError);
  });

  bench('isErrorX() - object', () => {
    ErrorX.isErrorX(plainObject);
  });

  bench('isAggregateErrorX() - AggregateErrorX', () => {
    AggregateErrorX.isAggregateErrorX(aggregateError);
  });

  bench('isAggregateErrorX() - ErrorX', () => {
    AggregateErrorX.isAggregateErrorX(errorX);
  });

  bench('isErrorXOptions() - valid', () => {
    ErrorX.isErrorXOptions({ message: 'test', code: 'TEST' });
  });

  bench('isErrorXOptions() - invalid', () => {
    ErrorX.isErrorXOptions({ foo: 'bar' });
  });
});

// =============================================================================
// Memory Leak Check - Deep Chain Creation
// =============================================================================
describe('Memory - Deep Chain Handling', () => {
  bench('create and serialize deep chain (50 levels)', () => {
    let current = new ErrorX({ message: 'Level 0', code: 'LEVEL_0' });
    for (let i = 1; i < 50; i++) {
      current = new ErrorX({ message: `Level ${i}`, cause: current });
    }
    const serialized = current.toJSON();
    ErrorX.fromJSON(serialized);
  });

  bench('create and serialize large aggregate (100 errors)', () => {
    const errors = Array.from(
      { length: 100 },
      (_, i) => new ErrorX({ message: `Error ${i}`, code: `E${i}` })
    );
    const aggregate = ErrorX.aggregate(errors);
    const serialized = aggregate.toJSON();
    AggregateErrorX.fromJSON(serialized);
  });
});
