import { ErrorX } from '../../index'
import * as errorHandlers from './error-handlers'

/**
 * Async Operations - Complex async operations and nested calls for stack trace testing
 * 
 * This module contains functions that test stack trace preservation through async
 * boundaries, promise chains, event loop operations, and complex method chains.
 * It builds upon error-handlers.ts to test async scenarios while maintaining
 * proper error chain preservation.
 */

export async function asyncChainWithTryCatch(): Promise<void> {
  try {
    await errorHandlers.asyncTryCatchRethrow()
  } catch (error) {
    throw new ErrorX({
      message: 'Async chain error from async-operations.ts',
      cause: error
    })
  }
}

export function promiseChainWithCatch(): Promise<void> {
  return errorHandlers.asyncTryCatchWithDelay()
    .catch(error => {
      throw new ErrorX({
        message: 'Promise chain catch from async-operations.ts',
        cause: error
      })
    })
}

export async function parallelAsyncErrors(): Promise<never> {
  try {
    // Don't catch the errors here - let them bubble up to be caught by the try-catch
    await Promise.all([
      errorHandlers.asyncTryCatchRethrow(),
      errorHandlers.asyncTryCatchWithDelay()
    ])
  } catch (error) {
    throw new ErrorX({
      message: 'Parallel async errors from async-operations.ts',
      cause: error
    })
  }

  // Force an error after Promise.all
  throw new ErrorX({ message: 'Post-parallel error from async-operations.ts' })
}

export function nestedSyncAsyncMix(): Promise<never> {
  return new Promise((_resolve, reject) => {
    try {
      // Mix of sync and async operations
      errorHandlers.simpleTryCatchRethrow()
    } catch (syncError: unknown) {
      if (syncError instanceof Error) {
        errorHandlers.asyncTryCatchRethrow()
          .catch(asyncError => {
            reject(new ErrorX({
              message: 'Mixed sync/async error from async-operations.ts',
              cause: asyncError,
              metadata: { syncError: syncError.message }
            }))
          })
      }
    }
  })
}

export class ErrorProcessor {
  private id: string

  constructor(id: string) {
    this.id = id
  }

  processError(): never {
    try {
      errorHandlers.tryCatchRethrowAsErrorX()
    } catch (error) {
      throw new ErrorX({
        message: `Error processed by ${this.id} in async-operations.ts`,
        cause: error,
        metadata: { processorId: this.id }
      })
    }
  }

  async processErrorAsync(): Promise<void> {
    try {
      await errorHandlers.asyncTryCatchRethrow()
    } catch (error) {
      throw new ErrorX({
        message: `Async error processed by ${this.id} in async-operations.ts`,
        cause: error,
        metadata: { processorId: this.id }
      })
    }
  }

  chainedProcessing(): never {
    try {
      this.processError()
    } catch (error) {
      throw new ErrorX({
        message: `Chained processing by ${this.id} in async-operations.ts`,
        cause: error
      })
    }
  }
}

export function instantiateAndProcess(): never {
  const processor = new ErrorProcessor('processor-async-operations')
  return processor.chainedProcessing()
}

export async function eventLoopError(): Promise<never> {
  return new Promise((_resolve, reject) => {
    setImmediate(async () => {
      try {
        await errorHandlers.asyncTryCatchWithDelay()
      } catch (error) {
        reject(new ErrorX({
          message: 'Event loop error from async-operations.ts',
          cause: error
        }))
      }
    })
  })
}

export function generatorError(): never {
  function* errorGenerator() {
    try {
      yield errorHandlers.multipleTryCatchLayers()
    } catch (error) {
      throw new ErrorX({
        message: 'Generator error from async-operations.ts',
        cause: error
      })
    }
  }

  const gen = errorGenerator()
  gen.next() // This will throw
  throw new Error('Should never reach here')
}

export async function* asyncGeneratorError(): AsyncGenerator<never, void, never> {
  try {
    await errorHandlers.asyncTryCatchRethrow()
    yield undefined as never;
  } catch (error) {
    throw new ErrorX({
      message: 'Async generator error from async-operations.ts',
      cause: error
    })
  }
}
