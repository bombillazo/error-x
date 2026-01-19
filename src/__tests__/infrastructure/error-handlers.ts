import { ErrorX } from '../../index';
import * as errorSources from './error-sources';

/**
 * Error Handlers - Try-catch and rethrow scenarios for stack trace testing
 *
 * This module contains functions that catch errors from error-sources.ts and
 * test various error handling patterns including direct rethrows, error wrapping,
 * multiple try-catch layers, and async error handling. These functions test that
 * stack traces are preserved through various catch-rethrow patterns.
 */

export function simpleTryCatchRethrow(): never {
  try {
    errorSources.throwSimpleErrorX();
  } catch (error) {
    // Direct rethrow - should preserve original stack (this is intentional for testing)
    // biome-ignore lint/complexity/noUselessCatch: This is a test case
    throw error;
  }
}

export function tryCatchRethrowAsErrorX(): never {
  try {
    errorSources.throwNativeError();
  } catch (error) {
    // Convert to ErrorX and rethrow - should preserve original stack in cause
    throw new ErrorX({
      message: 'Caught and rethrown from error-handlers.ts',
      cause: error,
    });
  }
}

export function tryCatchRethrowWithErrorXWrap(): never {
  try {
    errorSources.throwStringError();
  } catch (error) {
    // Use ErrorX.from to convert and rethrow
    const errorX = ErrorX.from(error);
    throw new ErrorX({
      message: 'Wrapped with from in error-handlers.ts',
      cause: errorX,
    });
  }
}

export function multipleTryCatchLayers(): never {
  try {
    try {
      try {
        errorSources.throwObjectError();
      } catch (innerError) {
        throw new ErrorX({
          message: 'Inner catch in error-handlers.ts',
          cause: innerError,
        });
      }
    } catch (middleError) {
      throw new ErrorX({
        message: 'Middle catch in error-handlers.ts',
        cause: middleError,
      });
    }
  } catch (outerError) {
    throw new ErrorX({
      message: 'Outer catch in error-handlers.ts',
      cause: outerError,
    });
  }
}

export function tryCatchWithAdditionalProcessing(): never {
  try {
    errorSources.throwErrorXWithCause();
  } catch (error) {
    const processed = error instanceof ErrorX ? error : ErrorX.from(error);

    throw processed.withMetadata({
      processedIn: 'error-handlers.ts',
      timestamp: new Date().toISOString(),
    });
  }
}

export async function asyncTryCatchRethrow(): Promise<void> {
  try {
    await errorSources.throwAsyncError();
  } catch (error) {
    // Async rethrow - stack should be preserved
    throw new ErrorX({
      message: 'Async catch and rethrow from error-handlers.ts',
      cause: error,
    });
  }
}

export async function asyncTryCatchWithDelay(): Promise<void> {
  try {
    await errorSources.throwAfterDelay();
  } catch (error) {
    // Add some async delay before rethrowing
    await new Promise((resolve) => setTimeout(resolve, 1));
    throw new ErrorX({
      message: 'Async catch with delay from error-handlers.ts',
      cause: error,
    });
  }
}

export function catchAndThrowDifferentError(): void {
  try {
    errorSources.throwNestedFunction();
  } catch (originalError) {
    // Completely different error - but original should be preserved in cause
    throw new ErrorX({
      message: 'Completely different error from error-handlers.ts',
      name: 'DifferentError',
      code: 'DIFFERENT_ERROR',
      cause: originalError,
    });
  }
}
