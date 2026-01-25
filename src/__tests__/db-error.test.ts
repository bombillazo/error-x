import { describe, expect, it } from 'vitest';
import { DBErrorX, ErrorX } from '../index';

describe('DBErrorX', () => {
  describe('Basic usage', () => {
    it('should create error with CONNECTION_FAILED preset', () => {
      const error = DBErrorX.create('CONNECTION_FAILED');

      expect(error.code).toBe('DB_CONNECTION_FAILED');
      expect(error.name).toBe('DBConnectionError');
      expect(error.message).toBe('Failed to connect to database.');
    });

    it('should create error with QUERY_TIMEOUT preset', () => {
      const error = DBErrorX.create('QUERY_TIMEOUT');

      expect(error.code).toBe('DB_QUERY_TIMEOUT');
      expect(error.name).toBe('DBQueryTimeoutError');
      expect(error.message).toBe('Database query timed out.');
    });

    it('should create error with UNIQUE_VIOLATION preset', () => {
      const error = DBErrorX.create('UNIQUE_VIOLATION');

      expect(error.code).toBe('DB_UNIQUE_VIOLATION');
      expect(error.name).toBe('DBUniqueViolationError');
      expect(error.message).toBe('Unique constraint violation.');
      expect(error.httpStatus).toBe(409);
    });

    it('should create error with NOT_FOUND preset', () => {
      const error = DBErrorX.create('NOT_FOUND');

      expect(error.code).toBe('DB_NOT_FOUND');
      expect(error.name).toBe('DBNotFoundError');
      expect(error.message).toBe('Record not found.');
      expect(error.httpStatus).toBe(404);
    });

    it('should default to UNKNOWN when no preset key provided', () => {
      const error = DBErrorX.create();

      expect(error.code).toBe('DB_UNKNOWN');
      expect(error.name).toBe('DBErrorX');
      expect(error.message).toBe('An unknown database error occurred.');
    });

    it('should default to httpStatus 500', () => {
      const error = DBErrorX.create('QUERY_FAILED');

      expect(error.httpStatus).toBe(500);
    });
  });

  describe('Transform', () => {
    it('should prefix code with DB_', () => {
      const error = DBErrorX.create('CONNECTION_FAILED');

      expect(error.code).toBe('DB_CONNECTION_FAILED');
    });

    it('should not double-prefix if code already starts with DB_', () => {
      const error = DBErrorX.create({ code: 'DB_CUSTOM_ERROR' });

      expect(error.code).toBe('DB_CUSTOM_ERROR');
    });

    it('should transform custom codes', () => {
      const error = DBErrorX.create({ code: 'CUSTOM_ERROR' });

      expect(error.code).toBe('DB_CUSTOM_ERROR');
    });

    it('should handle undefined code in transform', () => {
      // When no code is provided and no preset is used, it defaults to UNKNOWN
      const error = DBErrorX.create({
        message: 'Custom error',
        name: 'CustomDBError',
      });

      // Code defaults to 'UNKNOWN' from defaultPreset, then gets DB_ prefix
      expect(error.code).toBe('DB_UNKNOWN');
      expect(error.name).toBe('CustomDBError');
      expect(error.message).toBe('Custom error');
    });
  });

  describe('instanceof support', () => {
    it('should be instanceof DBErrorX, ErrorX, and Error', () => {
      const error = DBErrorX.create('CONNECTION_FAILED');

      expect(error).toBeInstanceOf(DBErrorX);
      expect(error).toBeInstanceOf(ErrorX);
      expect(error).toBeInstanceOf(Error);
    });

    it('should allow catching DBErrorX specifically', () => {
      const error = DBErrorX.create('QUERY_TIMEOUT');
      let caught = false;

      try {
        throw error;
      } catch (e) {
        if (e instanceof DBErrorX) {
          caught = true;
          expect(e.code).toBe('DB_QUERY_TIMEOUT');
        }
      }

      expect(caught).toBe(true);
    });
  });

  describe('Overrides', () => {
    it('should override preset message', () => {
      const error = DBErrorX.create('CONNECTION_FAILED', {
        message: 'Cannot connect to PostgreSQL',
      });

      expect(error.code).toBe('DB_CONNECTION_FAILED');
      expect(error.name).toBe('DBConnectionError');
      expect(error.message).toBe('Cannot connect to PostgreSQL');
    });

    it('should override preset code', () => {
      const error = DBErrorX.create('QUERY_FAILED', { code: 'QUERY_EXECUTION_ERROR' });

      expect(error.code).toBe('DB_QUERY_EXECUTION_ERROR');
      expect(error.name).toBe('DBQueryError');
    });

    it('should override preset name', () => {
      const error = DBErrorX.create('DEADLOCK', { name: 'PostgresDeadlockError' });

      expect(error.code).toBe('DB_DEADLOCK');
      expect(error.name).toBe('PostgresDeadlockError');
    });

    it('should override multiple preset values', () => {
      const error = DBErrorX.create('CONNECTION_FAILED', {
        message: 'MySQL connection refused',
        code: 'MYSQL_CONNECTION_ERROR',
        name: 'MySQLConnectionError',
      });

      expect(error.code).toBe('DB_MYSQL_CONNECTION_ERROR');
      expect(error.name).toBe('MySQLConnectionError');
      expect(error.message).toBe('MySQL connection refused');
    });
  });

  describe('Metadata', () => {
    it('should support database-specific metadata', () => {
      const error = DBErrorX.create('QUERY_FAILED', {
        metadata: {
          query: 'SELECT * FROM users WHERE id = ?',
          table: 'users',
          operation: 'SELECT',
          database: 'production',
        },
      });

      expect(error.metadata?.query).toBe('SELECT * FROM users WHERE id = ?');
      expect(error.metadata?.table).toBe('users');
      expect(error.metadata?.operation).toBe('SELECT');
      expect(error.metadata?.database).toBe('production');
    });

    it('should support constraint metadata', () => {
      const error = DBErrorX.create('UNIQUE_VIOLATION', {
        metadata: {
          table: 'users',
          column: 'email',
          constraint: 'users_email_unique',
        },
      });

      expect(error.metadata?.column).toBe('email');
      expect(error.metadata?.constraint).toBe('users_email_unique');
    });

    it('should support duration metadata', () => {
      const error = DBErrorX.create('QUERY_TIMEOUT', {
        metadata: {
          query: 'SELECT * FROM large_table',
          duration: 30000,
        },
      });

      expect(error.metadata?.duration).toBe(30000);
    });
  });

  describe('Error chaining', () => {
    it('should support cause for error chaining', () => {
      const originalError = new Error('ECONNREFUSED');
      const error = DBErrorX.create('CONNECTION_REFUSED', { cause: originalError });

      expect(error.parent).toBeDefined();
      expect(error.parent?.message).toBe('ECONNREFUSED');
    });

    it('should chain multiple DB errors', () => {
      const connectionError = DBErrorX.create('CONNECTION_LOST');
      const queryError = DBErrorX.create('QUERY_FAILED', { cause: connectionError });

      expect(queryError.parent).toBe(connectionError);
      expect(queryError.root).toBe(connectionError);
      expect(queryError.chain).toHaveLength(2);
    });
  });

  describe('All presets', () => {
    it('should create CONNECTION_TIMEOUT error', () => {
      const error = DBErrorX.create('CONNECTION_TIMEOUT');
      expect(error.code).toBe('DB_CONNECTION_TIMEOUT');
      expect(error.name).toBe('DBConnectionTimeoutError');
    });

    it('should create CONNECTION_REFUSED error', () => {
      const error = DBErrorX.create('CONNECTION_REFUSED');
      expect(error.code).toBe('DB_CONNECTION_REFUSED');
      expect(error.name).toBe('DBConnectionRefusedError');
    });

    it('should create CONNECTION_LOST error', () => {
      const error = DBErrorX.create('CONNECTION_LOST');
      expect(error.code).toBe('DB_CONNECTION_LOST');
      expect(error.name).toBe('DBConnectionLostError');
    });

    it('should create SYNTAX_ERROR error', () => {
      const error = DBErrorX.create('SYNTAX_ERROR');
      expect(error.code).toBe('DB_SYNTAX_ERROR');
      expect(error.name).toBe('DBSyntaxError');
    });

    it('should create FOREIGN_KEY_VIOLATION error', () => {
      const error = DBErrorX.create('FOREIGN_KEY_VIOLATION');
      expect(error.code).toBe('DB_FOREIGN_KEY_VIOLATION');
      expect(error.name).toBe('DBForeignKeyError');
      expect(error.httpStatus).toBe(400);
    });

    it('should create NOT_NULL_VIOLATION error', () => {
      const error = DBErrorX.create('NOT_NULL_VIOLATION');
      expect(error.code).toBe('DB_NOT_NULL_VIOLATION');
      expect(error.name).toBe('DBNotNullError');
      expect(error.httpStatus).toBe(400);
    });

    it('should create CHECK_VIOLATION error', () => {
      const error = DBErrorX.create('CHECK_VIOLATION');
      expect(error.code).toBe('DB_CHECK_VIOLATION');
      expect(error.name).toBe('DBCheckViolationError');
      expect(error.httpStatus).toBe(400);
    });

    it('should create TRANSACTION_FAILED error', () => {
      const error = DBErrorX.create('TRANSACTION_FAILED');
      expect(error.code).toBe('DB_TRANSACTION_FAILED');
      expect(error.name).toBe('DBTransactionError');
    });

    it('should create DEADLOCK error', () => {
      const error = DBErrorX.create('DEADLOCK');
      expect(error.code).toBe('DB_DEADLOCK');
      expect(error.name).toBe('DBDeadlockError');
      expect(error.httpStatus).toBe(409);
    });
  });

  describe('Static properties', () => {
    it('should have presets defined', () => {
      expect(DBErrorX.presets).toBeDefined();
      expect(DBErrorX.presets.CONNECTION_FAILED).toBeDefined();
      expect(DBErrorX.presets.QUERY_TIMEOUT).toBeDefined();
    });

    it('should have defaultPreset as UNKNOWN', () => {
      expect(DBErrorX.defaultPreset).toBe('UNKNOWN');
    });

    it('should have defaults with httpStatus 500', () => {
      expect(DBErrorX.defaults.httpStatus).toBe(500);
    });

    it('should have transform function defined', () => {
      expect(DBErrorX.transform).toBeDefined();
      expect(typeof DBErrorX.transform).toBe('function');
    });
  });

  describe('create() overloads', () => {
    it('should create with just overrides object', () => {
      const error = DBErrorX.create({
        message: 'Custom database error',
        code: 'CUSTOM',
        metadata: { database: 'test' },
      });

      expect(error.code).toBe('DB_CUSTOM');
      expect(error.message).toBe('Custom database error');
      expect(error.metadata?.database).toBe('test');
    });

    it('should create with preset key and overrides', () => {
      const error = DBErrorX.create('CONNECTION_FAILED', {
        message: 'Custom connection failure message',
      });

      expect(error.code).toBe('DB_CONNECTION_FAILED');
      expect(error.message).toBe('Custom connection failure message');
    });

    it('should create with no arguments (uses default)', () => {
      const error = DBErrorX.create();

      expect(error.code).toBe('DB_UNKNOWN');
      expect(error.name).toBe('DBErrorX');
    });
  });
});
