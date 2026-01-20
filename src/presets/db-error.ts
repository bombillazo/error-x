import { ErrorX } from '../error';
import type { ErrorXBasePresetKey, ErrorXMetadata, ErrorXOptions, ErrorXTransform } from '../types';

/**
 * Database error presets for common scenarios.
 * Defined outside the class to enable type inference for preset keys.
 */
const dbPresets = {
  // Connection errors
  CONNECTION_FAILED: {
    code: 'CONNECTION_FAILED',
    name: 'DBConnectionError',
    message: 'Failed to connect to database.',
  },
  CONNECTION_TIMEOUT: {
    code: 'CONNECTION_TIMEOUT',
    name: 'DBConnectionTimeoutError',
    message: 'Database connection timed out.',
  },
  CONNECTION_REFUSED: {
    code: 'CONNECTION_REFUSED',
    name: 'DBConnectionRefusedError',
    message: 'Database connection refused.',
  },
  CONNECTION_LOST: {
    code: 'CONNECTION_LOST',
    name: 'DBConnectionLostError',
    message: 'Database connection lost.',
  },

  // Query errors
  QUERY_FAILED: {
    code: 'QUERY_FAILED',
    name: 'DBQueryError',
    message: 'Database query failed.',
  },
  QUERY_TIMEOUT: {
    code: 'QUERY_TIMEOUT',
    name: 'DBQueryTimeoutError',
    message: 'Database query timed out.',
  },
  SYNTAX_ERROR: {
    code: 'SYNTAX_ERROR',
    name: 'DBSyntaxError',
    message: 'Invalid query syntax.',
  },

  // Constraint errors
  UNIQUE_VIOLATION: {
    code: 'UNIQUE_VIOLATION',
    name: 'DBUniqueViolationError',
    message: 'Unique constraint violation.',
    httpStatus: 409,
  },
  FOREIGN_KEY_VIOLATION: {
    code: 'FOREIGN_KEY_VIOLATION',
    name: 'DBForeignKeyError',
    message: 'Foreign key constraint violation.',
    httpStatus: 400,
  },
  NOT_NULL_VIOLATION: {
    code: 'NOT_NULL_VIOLATION',
    name: 'DBNotNullError',
    message: 'Not null constraint violation.',
    httpStatus: 400,
  },
  CHECK_VIOLATION: {
    code: 'CHECK_VIOLATION',
    name: 'DBCheckViolationError',
    message: 'Check constraint violation.',
    httpStatus: 400,
  },

  // Transaction errors
  TRANSACTION_FAILED: {
    code: 'TRANSACTION_FAILED',
    name: 'DBTransactionError',
    message: 'Database transaction failed.',
  },
  DEADLOCK: {
    code: 'DEADLOCK',
    name: 'DBDeadlockError',
    message: 'Database deadlock detected.',
    httpStatus: 409,
  },

  // Record errors
  NOT_FOUND: {
    code: 'NOT_FOUND',
    name: 'DBNotFoundError',
    message: 'Record not found.',
    httpStatus: 404,
  },

  // Generic
  UNKNOWN: {
    code: 'UNKNOWN',
    name: 'DBErrorX',
    message: 'An unknown database error occurred.',
  },
} as const satisfies Record<string, ErrorXOptions<ErrorXMetadata>>;

/**
 * User-friendly messages for database error presets.
 * Keyed by preset name.
 */
export const dbErrorUiMessages: Record<keyof typeof dbPresets, string> = {
  // Connection errors
  CONNECTION_FAILED: 'Unable to connect to the database. Please try again later.',
  CONNECTION_TIMEOUT: 'The database connection timed out. Please try again.',
  CONNECTION_REFUSED: 'Unable to connect to the database. Please try again later.',
  CONNECTION_LOST: 'The database connection was lost. Please try again.',
  // Query errors
  QUERY_FAILED: 'The database operation failed. Please try again.',
  QUERY_TIMEOUT: 'The database operation took too long. Please try again.',
  SYNTAX_ERROR: 'An internal error occurred. Please contact support.',
  // Constraint errors
  UNIQUE_VIOLATION: 'This record already exists.',
  FOREIGN_KEY_VIOLATION: 'This operation references a record that does not exist.',
  NOT_NULL_VIOLATION: 'A required field is missing.',
  CHECK_VIOLATION: 'The provided data is invalid.',
  // Transaction errors
  TRANSACTION_FAILED: 'The operation failed. Please try again.',
  DEADLOCK: 'The operation encountered a conflict. Please try again.',
  // Record errors
  NOT_FOUND: 'The requested record was not found.',
  // Generic
  UNKNOWN: 'A database error occurred. Please try again later.',
};

/**
 * Valid preset keys for DBErrorX.create()
 * Derived from the presets object. Provides autocomplete for known presets
 * while allowing any string for flexibility.
 */
export type DBErrorXPresetKey = keyof typeof dbPresets | ErrorXBasePresetKey;

/**
 * Metadata type for database errors.
 * Provides context about the database operation that failed.
 *
 * @public
 */
export type DBErrorXMetadata = {
  /** The SQL query or operation that failed */
  query?: string;
  /** The table involved in the operation */
  table?: string;
  /** The database name */
  database?: string;
  /** The operation type (SELECT, INSERT, UPDATE, DELETE, etc.) */
  operation?: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'TRANSACTION' | 'CONNECTION' | string;
  /** The column involved (for constraint errors) */
  column?: string;
  /** The constraint name (for constraint violations) */
  constraint?: string;
  /** Duration of the operation in milliseconds */
  duration?: number;
};

/**
 * Database Error class with presets for common database error scenarios.
 *
 * Provides a type-safe way to create database errors with:
 * - Common error presets (connection, query, timeout, constraints)
 * - Automatic code prefixing with `DB_`
 * - Full `instanceof` support
 * - Typed metadata for database context
 *
 * @example
 * ```typescript
 * // Basic usage with preset
 * throw DBErrorX.create('CONNECTION_FAILED')
 * throw DBErrorX.create('QUERY_FAILED')
 * throw DBErrorX.create('TIMEOUT')
 *
 * // With metadata
 * throw DBErrorX.create('QUERY_FAILED', {
 *   message: 'Failed to fetch user',
 *   metadata: {
 *     query: 'SELECT * FROM users WHERE id = ?',
 *     table: 'users',
 *     operation: 'SELECT'
 *   }
 * })
 *
 * // With error chaining
 * try {
 *   await db.query(sql)
 * } catch (err) {
 *   throw DBErrorX.create('QUERY_FAILED', { cause: err })
 * }
 *
 * // Just overrides (uses default UNKNOWN)
 * throw DBErrorX.create({ message: 'Database error' })
 *
 * // instanceof checks
 * if (error instanceof DBErrorX) {
 *   console.log(error.metadata?.table)
 * }
 * ```
 *
 * @public
 */
export class DBErrorX extends ErrorX<DBErrorXMetadata> {
  /**
   * Database error presets for common scenarios.
   */
  static presets = dbPresets;

  /** Default to UNKNOWN when no preset specified */
  static defaultPreset = 'UNKNOWN';

  /** Default httpStatus for database errors (500 = server error) */
  static defaults = { httpStatus: 500 };

  /**
   * Transform that prefixes all codes with `DB_`.
   */
  static transform: ErrorXTransform<DBErrorXMetadata> = (opts, _ctx) => {
    const code = String(opts.code ?? 'UNKNOWN');
    return {
      ...opts,
      code: code.startsWith('DB_') ? code : `DB_${code}`,
    };
  };

  /**
   * Creates a DBErrorX from a preset key.
   *
   * @param presetKey - Preset key (provides autocomplete for known presets)
   * @param overrides - Optional overrides for the preset values
   * @returns DBErrorX instance
   */
  static override create(
    presetKey?: DBErrorXPresetKey,
    overrides?: Partial<ErrorXOptions<DBErrorXMetadata>>
  ): DBErrorX;
  static override create(overrides?: Partial<ErrorXOptions<DBErrorXMetadata>>): DBErrorX;
  static override create(
    presetKeyOrOverrides?: DBErrorXPresetKey | Partial<ErrorXOptions<DBErrorXMetadata>>,
    overrides?: Partial<ErrorXOptions<DBErrorXMetadata>>
  ): DBErrorX {
    return ErrorX.create.call(
      DBErrorX,
      presetKeyOrOverrides as string | Partial<ErrorXOptions<ErrorXMetadata>>,
      overrides
    ) as DBErrorX;
  }
}
