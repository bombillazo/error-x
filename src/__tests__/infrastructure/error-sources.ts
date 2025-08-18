import { ErrorX } from '../../index'

/**
 * Error Sources - Original error throwing functions for stack trace testing
 *
 * This module contains the fundamental error throwing functions that serve as
 * the source of all errors in the stack trace preservation test suite.
 * These functions represent the deepest level where actual errors occur
 * and test various error types and patterns.
 */

export function throwSimpleErrorX(): never {
  throw new ErrorX({ message: 'Original error from error-sources.ts throwSimpleErrorX' })
}

export function throwErrorXWithCause(): never {
  const originalError = new Error('Native error in error-sources.ts')
  throw new ErrorX({
    message: 'ErrorX with native cause from error-sources.ts',
    cause: originalError,
  })
}

export function throwNativeError(): never {
  throw new Error('Native error from error-sources.ts throwNativeError')
}

export function throwStringError(): never {
  throw 'String error from error-sources.ts throwStringError'
}

export function throwObjectError(): never {
  throw {
    message: 'Object error from error-sources.ts',
    code: 500,
    source: 'error-sources.ts',
  }
}

export function throwNestedFunction(): void {
  const level1 = () => {
    const level2 = () => {
      const level3 = () => {
        throw new ErrorX({ message: 'Deeply nested error from error-sources.ts' })
      }
      level3()
    }
    level2()
  }
  level1()
}

export async function throwAsyncError(): Promise<never> {
  await new Promise(resolve => setTimeout(resolve, 1))
  throw new ErrorX({ message: 'Async error from error-sources.ts' })
}

export function throwAfterDelay(): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => {
      reject(new ErrorX({ message: 'Delayed error from error-sources.ts' }))
    }, 1)
  })
}
