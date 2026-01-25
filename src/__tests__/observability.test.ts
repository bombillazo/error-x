import { describe, expect, it, vi } from 'vitest';
import { ErrorX } from '../error';
import {
  generateFingerprint,
  type OtelSpanLike,
  recordError,
  toLogEntry,
  toOtelAttributes,
} from '../observability';

describe('generateFingerprint', () => {
  it('generates consistent fingerprints for identical errors', () => {
    const error1 = new ErrorX({
      message: 'Database connection failed',
      name: 'DatabaseError',
      code: 'DB_CONN_FAILED',
    });
    const error2 = new ErrorX({
      message: 'Database connection failed',
      name: 'DatabaseError',
      code: 'DB_CONN_FAILED',
    });

    const fp1 = generateFingerprint(error1);
    const fp2 = generateFingerprint(error2);

    expect(fp1).toBe(fp2);
    expect(fp1).toMatch(/^[a-f0-9]{8}$/);
  });

  it('generates different fingerprints for different error codes', () => {
    const error1 = new ErrorX({
      message: 'Error occurred',
      code: 'ERROR_A',
    });
    const error2 = new ErrorX({
      message: 'Error occurred',
      code: 'ERROR_B',
    });

    expect(generateFingerprint(error1)).not.toBe(generateFingerprint(error2));
  });

  it('generates different fingerprints for different error names', () => {
    const error1 = new ErrorX({
      message: 'Error occurred',
      name: 'TypeA',
    });
    const error2 = new ErrorX({
      message: 'Error occurred',
      name: 'TypeB',
    });

    expect(generateFingerprint(error1)).not.toBe(generateFingerprint(error2));
  });

  it('generates different fingerprints for different messages', () => {
    const error1 = new ErrorX({
      message: 'Message A',
      code: 'ERROR',
    });
    const error2 = new ErrorX({
      message: 'Message B',
      code: 'ERROR',
    });

    expect(generateFingerprint(error1)).not.toBe(generateFingerprint(error2));
  });

  it('can exclude components from fingerprint', () => {
    const error = new ErrorX({
      message: 'Same message',
      name: 'DifferentName',
      code: 'SAME_CODE',
    });

    // Without name, errors with same message and code should have same fingerprint
    const fpWithoutName = generateFingerprint(error, { includeName: false });
    const error2 = new ErrorX({
      message: 'Same message',
      name: 'AnotherName',
      code: 'SAME_CODE',
    });
    const fpWithoutName2 = generateFingerprint(error2, { includeName: false });

    expect(fpWithoutName).toBe(fpWithoutName2);
  });

  it('can include specific metadata keys', () => {
    const error1 = new ErrorX({
      message: 'Error',
      code: 'ERROR',
      metadata: { userId: 123, requestId: 'abc' },
    });
    const error2 = new ErrorX({
      message: 'Error',
      code: 'ERROR',
      metadata: { userId: 456, requestId: 'abc' },
    });

    // Without metadata, fingerprints should match
    expect(generateFingerprint(error1)).toBe(generateFingerprint(error2));

    // With userId in fingerprint, they should differ
    const fp1 = generateFingerprint(error1, { includeMetadataKeys: ['userId'] });
    const fp2 = generateFingerprint(error2, { includeMetadataKeys: ['userId'] });
    expect(fp1).not.toBe(fp2);
  });

  it('can use custom hash function', () => {
    const error = new ErrorX({ message: 'Test', code: 'TEST' });
    const customHash = vi.fn().mockReturnValue('custom-hash');

    const fp = generateFingerprint(error, { hashFunction: customHash });

    expect(fp).toBe('custom-hash');
    expect(customHash).toHaveBeenCalledWith(expect.stringContaining('name:'));
  });

  it('handles errors without metadata gracefully', () => {
    const error = new ErrorX({ message: 'No metadata' });

    const fp = generateFingerprint(error, { includeMetadataKeys: ['nonexistent'] });
    expect(fp).toMatch(/^[a-f0-9]{8}$/);
  });
});

describe('toLogEntry', () => {
  it('creates a structured log entry with required fields', () => {
    const error = new ErrorX({
      message: 'User not found',
      name: 'NotFoundError',
      code: 'USER_NOT_FOUND',
      httpStatus: 404,
      metadata: { userId: 123 },
    });

    const entry = toLogEntry(error);

    expect(entry.level).toBe('error');
    expect(entry.message).toBe('User not found');
    expect(entry.errorName).toBe('NotFoundError');
    expect(entry.errorCode).toBe('USER_NOT_FOUND');
    expect(entry.httpStatus).toBe(404);
    expect(entry.metadata).toEqual({ userId: 123 });
    expect(entry.fingerprint).toMatch(/^[a-f0-9]{8}$/);
    expect(entry.timestamp).toBe(error.timestamp);
    expect(entry.timestampIso).toBe(new Date(error.timestamp).toISOString());
    expect(entry.chainDepth).toBe(1);
  });

  it('allows custom log level', () => {
    const error = new ErrorX({ message: 'Warning' });

    const warnEntry = toLogEntry(error, { level: 'warn' });
    expect(warnEntry.level).toBe('warn');

    const infoEntry = toLogEntry(error, { level: 'info' });
    expect(infoEntry.level).toBe('info');
  });

  it('includes stack trace when requested', () => {
    const error = new ErrorX({ message: 'With stack' });

    const entryWithoutStack = toLogEntry(error);
    expect(entryWithoutStack.stack).toBeUndefined();

    const entryWithStack = toLogEntry(error, { includeStack: true });
    expect(entryWithStack.stack).toBeDefined();
    expect(entryWithStack.stack).toContain('Error');
  });

  it('includes full serialized error when requested', () => {
    const error = new ErrorX({
      message: 'Full error',
      code: 'FULL',
      metadata: { test: true },
    });

    const entry = toLogEntry(error, { includeFull: true });

    expect(entry.error).toBeDefined();
    expect(entry.error?.message).toBe('Full error');
    expect(entry.error?.code).toBe('FULL');
    expect(entry.error?.metadata).toEqual({ test: true });
  });

  it('includes root cause for chained errors', () => {
    const rootCause = new ErrorX({
      message: 'Root cause',
      name: 'RootError',
      code: 'ROOT',
    });
    const error = new ErrorX({
      message: 'Wrapper error',
      name: 'WrapperError',
      code: 'WRAPPER',
      cause: rootCause,
    });

    const entry = toLogEntry(error);

    expect(entry.chainDepth).toBe(2);
    expect(entry.rootCause).toEqual({
      name: 'RootError',
      message: 'Root cause',
      code: 'ROOT',
    });
  });

  it('merges additional context', () => {
    const error = new ErrorX({ message: 'Test' });

    const entry = toLogEntry(error, {
      context: {
        requestId: 'req-123',
        service: 'api',
      },
    });

    expect((entry as Record<string, unknown>).requestId).toBe('req-123');
    expect((entry as Record<string, unknown>).service).toBe('api');
  });

  it('omits undefined optional fields', () => {
    const error = new ErrorX({ message: 'Minimal' });

    const entry = toLogEntry(error);

    expect(entry.httpStatus).toBeUndefined();
    expect(entry.metadata).toBeUndefined();
    expect(entry.rootCause).toBeUndefined();
    expect(entry.stack).toBeUndefined();
    expect(entry.error).toBeUndefined();
  });
});

describe('toOtelAttributes', () => {
  it('creates OpenTelemetry-compatible attributes', () => {
    const error = new ErrorX({
      message: 'Operation failed',
      name: 'OperationError',
      code: 'OP_FAILED',
      httpStatus: 500,
    });

    const attrs = toOtelAttributes(error);

    expect(attrs['exception.type']).toBe('OperationError');
    expect(attrs['exception.message']).toBe('Operation failed');
    expect(attrs['error.code']).toBe('OP_FAILED');
    expect(attrs['error.fingerprint']).toMatch(/^[a-f0-9]{8}$/);
    expect(attrs['http.status_code']).toBe(500);
    expect(attrs['error.chain_depth']).toBe(1);
    expect(attrs['error.is_aggregate']).toBe(false);
    expect(attrs['error.timestamp']).toBe(error.timestamp);
  });

  it('includes stack trace by default', () => {
    const error = new ErrorX({ message: 'With stack' });

    const attrs = toOtelAttributes(error);

    expect(attrs['exception.stacktrace']).toBeDefined();
  });

  it('can exclude stack trace', () => {
    const error = new ErrorX({ message: 'Without stack' });

    const attrs = toOtelAttributes(error, { includeStack: false });

    expect(attrs['exception.stacktrace']).toBeUndefined();
  });

  it('identifies aggregate errors', () => {
    const errors = [
      new ErrorX({ message: 'Error 1' }),
      new ErrorX({ message: 'Error 2' }),
      new ErrorX({ message: 'Error 3' }),
    ];
    const aggregate = ErrorX.aggregate(errors);

    const attrs = toOtelAttributes(aggregate);

    expect(attrs['error.is_aggregate']).toBe(true);
    expect(attrs['error.aggregate_count']).toBe(3);
  });

  it('includes metadata as span attributes when requested', () => {
    const error = new ErrorX({
      message: 'With metadata',
      metadata: {
        userId: 123,
        action: 'delete',
        isAdmin: true,
        nested: { not: 'included' },
      },
    });

    const attrs = toOtelAttributes(error, { includeMetadata: true });

    expect(attrs['error.metadata.userId']).toBe(123);
    expect(attrs['error.metadata.action']).toBe('delete');
    expect(attrs['error.metadata.isAdmin']).toBe(true);
    // Nested objects are not included (only primitives)
    expect(attrs['error.metadata.nested']).toBeUndefined();
  });

  it('uses custom metadata prefix', () => {
    const error = new ErrorX({
      message: 'Custom prefix',
      metadata: { key: 'value' },
    });

    const attrs = toOtelAttributes(error, {
      includeMetadata: true,
      metadataPrefix: 'app.context.',
    });

    expect(attrs['app.context.key']).toBe('value');
    expect(attrs['error.metadata.key']).toBeUndefined();
  });

  it('omits http.status_code when not set', () => {
    const error = new ErrorX({ message: 'No status' });

    const attrs = toOtelAttributes(error);

    expect(attrs['http.status_code']).toBeUndefined();
  });

  it('correctly reports chain depth for nested errors', () => {
    const root = new ErrorX({ message: 'Root' });
    const middle = new ErrorX({ message: 'Middle', cause: root });
    const top = new ErrorX({ message: 'Top', cause: middle });

    const attrs = toOtelAttributes(top);

    expect(attrs['error.chain_depth']).toBe(3);
  });
});

describe('recordError', () => {
  it('returns attributes and applyToSpan helper', () => {
    const error = new ErrorX({
      message: 'Test error',
      code: 'TEST',
    });

    const result = recordError(error);

    expect(result.attributes).toBeDefined();
    expect(result.attributes['exception.type']).toBe('Error');
    expect(result.attributes['exception.message']).toBe('Test error');
    expect(typeof result.applyToSpan).toBe('function');
  });

  it('applies error info to span', () => {
    const error = new ErrorX({
      message: 'Span error',
      code: 'SPAN_ERROR',
    });

    const mockSpan: OtelSpanLike = {
      setAttributes: vi.fn(),
      recordException: vi.fn(),
      setStatus: vi.fn(),
    };

    const { applyToSpan } = recordError(error);
    applyToSpan(mockSpan);

    expect(mockSpan.setAttributes).toHaveBeenCalledWith(
      expect.objectContaining({
        'exception.type': 'Error',
        'exception.message': 'Span error',
        'error.code': 'SPAN_ERROR',
      })
    );
    expect(mockSpan.recordException).toHaveBeenCalledWith(error);
    expect(mockSpan.setStatus).toHaveBeenCalledWith({
      code: 2, // SpanStatusCode.ERROR
      message: 'Span error',
    });
  });

  it('can skip recordException', () => {
    const error = new ErrorX({ message: 'Test' });

    const mockSpan: OtelSpanLike = {
      setAttributes: vi.fn(),
      recordException: vi.fn(),
      setStatus: vi.fn(),
    };

    const { applyToSpan } = recordError(error);
    applyToSpan(mockSpan, { recordException: false });

    expect(mockSpan.setAttributes).toHaveBeenCalled();
    expect(mockSpan.recordException).not.toHaveBeenCalled();
    expect(mockSpan.setStatus).toHaveBeenCalled();
  });

  it('can skip setStatus', () => {
    const error = new ErrorX({ message: 'Test' });

    const mockSpan: OtelSpanLike = {
      setAttributes: vi.fn(),
      recordException: vi.fn(),
      setStatus: vi.fn(),
    };

    const { applyToSpan } = recordError(error);
    applyToSpan(mockSpan, { setStatus: false });

    expect(mockSpan.setAttributes).toHaveBeenCalled();
    expect(mockSpan.recordException).toHaveBeenCalled();
    expect(mockSpan.setStatus).not.toHaveBeenCalled();
  });

  it('works with minimal span interface', () => {
    const error = new ErrorX({ message: 'Test' });

    // Minimal span with only setAttributes
    const minimalSpan: OtelSpanLike = {
      setAttributes: vi.fn(),
    };

    const { applyToSpan } = recordError(error);

    // Should not throw even without optional methods
    expect(() => applyToSpan(minimalSpan)).not.toThrow();
    expect(minimalSpan.setAttributes).toHaveBeenCalled();
  });

  it('passes through attribute options', () => {
    const error = new ErrorX({
      message: 'Test',
      metadata: { key: 'value' },
    });

    const result = recordError(error, { includeMetadata: true });

    expect(result.attributes['error.metadata.key']).toBe('value');
  });
});

describe('integration scenarios', () => {
  it('deduplication workflow with fingerprints', () => {
    const seenFingerprints = new Set<string>();
    const errors: ErrorX[] = [];

    // Simulate receiving multiple similar errors
    for (let i = 0; i < 5; i++) {
      const error = new ErrorX({
        message: 'Database connection timeout',
        code: 'DB_TIMEOUT',
        metadata: { attempt: i, host: 'db.example.com' },
      });

      const fp = generateFingerprint(error);

      if (!seenFingerprints.has(fp)) {
        seenFingerprints.add(fp);
        errors.push(error);
      }
    }

    // All 5 errors should deduplicate to 1
    expect(errors.length).toBe(1);
    expect(seenFingerprints.size).toBe(1);
  });

  it('structured logging workflow', () => {
    const logs: unknown[] = [];
    const mockLogger = {
      error: (entry: unknown) => logs.push(entry),
    };

    const error = new ErrorX({
      message: 'API request failed',
      code: 'API_ERROR',
      httpStatus: 503,
      metadata: { endpoint: '/users', method: 'GET' },
    });

    const entry = toLogEntry(error, {
      context: {
        service: 'user-service',
        environment: 'production',
      },
    });

    mockLogger.error(entry);

    expect(logs.length).toBe(1);
    const logged = logs[0] as Record<string, unknown>;
    expect(logged.message).toBe('API request failed');
    expect(logged.service).toBe('user-service');
    expect(logged.fingerprint).toBeDefined();
  });

  it('OpenTelemetry tracing workflow', () => {
    const recordedAttributes: Record<string, unknown>[] = [];
    const recordedExceptions: Error[] = [];
    const statuses: Array<{ code: number; message?: string }> = [];

    const mockSpan: OtelSpanLike = {
      setAttributes: (attrs) => recordedAttributes.push(attrs),
      recordException: (err) => recordedExceptions.push(err),
      setStatus: (status) => statuses.push(status),
    };

    // Simulate an error in a traced operation
    const dbError = new ErrorX({
      message: 'Query execution failed',
      name: 'QueryError',
      code: 'QUERY_FAILED',
      metadata: { table: 'users', operation: 'SELECT' },
    });

    const serviceError = new ErrorX({
      message: 'User lookup failed',
      name: 'ServiceError',
      code: 'USER_LOOKUP_FAILED',
      httpStatus: 500,
      cause: dbError,
    });

    const { applyToSpan } = recordError(serviceError, { includeMetadata: true });
    applyToSpan(mockSpan);

    expect(recordedAttributes.length).toBe(1);
    expect(recordedAttributes[0]?.['exception.type']).toBe('ServiceError');
    expect(recordedAttributes[0]?.['error.chain_depth']).toBe(2);
    expect(recordedExceptions.length).toBe(1);
    expect(statuses[0]?.code).toBe(2); // ERROR
  });

  it('aggregate error observability', () => {
    const validationErrors = [
      new ErrorX({ message: 'Email is required', code: 'VALIDATION_EMAIL' }),
      new ErrorX({ message: 'Password too short', code: 'VALIDATION_PASSWORD' }),
      new ErrorX({ message: 'Name is required', code: 'VALIDATION_NAME' }),
    ];

    const aggregate = ErrorX.aggregate(validationErrors, {
      message: 'Validation failed',
      code: 'VALIDATION_FAILED',
      httpStatus: 400,
    });

    const logEntry = toLogEntry(aggregate, { includeFull: true });
    const otelAttrs = toOtelAttributes(aggregate);

    expect(logEntry.errorCode).toBe('VALIDATION_FAILED');
    expect(logEntry.httpStatus).toBe(400);

    expect(otelAttrs['error.is_aggregate']).toBe(true);
    expect(otelAttrs['error.aggregate_count']).toBe(3);
    expect(otelAttrs['http.status_code']).toBe(400);
  });
});
