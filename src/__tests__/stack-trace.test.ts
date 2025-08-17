import { describe, expect, it } from 'vitest'
import { ErrorX } from '../index.js'
import * as errorSources from './infrastructure/error-sources.js'
import * as errorHandlers from './infrastructure/error-handlers.js'
import * as asyncOperations from './infrastructure/async-operations.js'
import * as complexScenarios from './infrastructure/complex-scenarios.js'

/**
 * Comprehensive stack trace preservation tests across multiple files
 * Tests that ErrorX preserves original error locations even through:
 * - Try-catch and rethrow scenarios (error-handlers.ts)
 * - Async operations and promise chains (async-operations.ts)
 * - Complex error wrapping and metadata operations (complex-scenarios.ts)
 * - Serialization/deserialization and edge cases
 * 
 * Test infrastructure:
 * - error-sources.ts: Original error throwing functions
 * - error-handlers.ts: Try-catch and rethrow scenarios
 * - async-operations.ts: Complex async operations and nested calls
 * - complex-scenarios.ts: Complex error wrapping and edge case scenarios
 */

describe('Stack Trace Preservation', () => {

  describe('Basic Try-Catch Scenarios', () => {
    it('should preserve original stack trace in simple rethrow', () => {
      expect(() => errorHandlers.simpleTryCatchRethrow()).toThrow()

      try {
        errorHandlers.simpleTryCatchRethrow()
      } catch (error: unknown) {
        expect(error).toBeInstanceOf(ErrorX)
        const errorX = error as ErrorX

        // Should contain the original error location from error-sources.ts
        expect(errorX.stack).toContain('error-sources.ts')
        expect(errorX.stack).toContain('throwSimpleErrorX')

        // Should also show the call path through error-handlers.ts
        expect(errorX.stack).toContain('error-handlers.ts')
      }
    })

    it('should preserve native error in cause when wrapping', () => {
      try {
        errorHandlers.tryCatchRethrowAsErrorX()
      } catch (error: unknown) {
        expect(error).toBeInstanceOf(ErrorX)
        const errorX = error as ErrorX

        // Check the main error message
        expect(errorX.message).toContain('Caught and rethrown from error-handlers.ts')

        // Check that the cause is preserved
        expect(errorX.cause).toBeInstanceOf(Error)
        expect((errorX.cause as Error).message).toContain('Native error from error-sources.ts')

        // Stack should reference both files
        expect(errorX.stack).toContain('error-sources.ts')
        expect(errorX.stack).toContain('error-handlers.ts')
      }
    })

    it('should handle multiple try-catch layers', () => {
      try {
        errorHandlers.multipleTryCatchLayers()
      } catch (error: unknown) {
        expect(error).toBeInstanceOf(ErrorX)
        const errorX = error as ErrorX

        // Should be the outermost error
        expect(errorX.message).toContain('Outer catch in error-handlers.ts')

        // Check the error chain depth
        let current = errorX
        let depth = 0
        while (current.cause && depth < 10) { // Prevent infinite loops
          depth++
          if (current.cause instanceof ErrorX) {
            current = current.cause
          } else {
            break
          }
        }

        expect(depth).toBeGreaterThan(2) // Should have multiple layers

        // Original error should be traceable through the cause chain
        let foundOriginalError = false
        let currentError: ErrorX | null = errorX
        while (currentError && !foundOriginalError) {
          if (currentError.stack?.includes('error-sources.ts') ||
            currentError.message.includes('error-sources.ts') ||
            (currentError.metadata.originalError &&
              typeof currentError.metadata.originalError === 'object' &&
              'source' in currentError.metadata.originalError &&
              currentError.metadata.originalError.source === 'error-sources.ts')) {
            foundOriginalError = true
          }

          // Also check the final cause if it's a regular Error or Object
          if (!foundOriginalError && currentError.cause &&
            !(currentError.cause instanceof ErrorX)) {
            if (currentError.cause instanceof Error) {
              if (currentError.cause.stack?.includes('error-sources.ts') ||
                currentError.cause.message.includes('error-sources.ts')) {
                foundOriginalError = true
              }
            } else if (typeof currentError.cause === 'object' && currentError.cause !== null) {
              // Check if it's the object error from error-sources.ts
              const causeObj = currentError.cause as any
              if (causeObj.source === 'error-sources.ts' ||
                (causeObj.message?.includes('error-sources.ts'))) {
                foundOriginalError = true
              }
            }
          }

          currentError = currentError.cause instanceof ErrorX ? currentError.cause : null
        }
        expect(foundOriginalError).toBe(true)
      }
    })
  })

  describe('Async Error Preservation', () => {
    it('should preserve stack trace through async operations', async () => {
      try {
        await errorHandlers.asyncTryCatchRethrow()
      } catch (error: unknown) {
        expect(error).toBeInstanceOf(ErrorX)
        const errorX = error as ErrorX

        expect(errorX.message).toContain('Async catch and rethrow from error-handlers.ts')
        expect(errorX.stack).toContain('error-sources.ts')
        expect(errorX.stack).toContain('error-handlers.ts')

        // Should preserve async context
        expect(errorX.cause).toBeInstanceOf(ErrorX)
      }
    })

    it('should preserve stack trace through promise chains', async () => {
      try {
        await asyncOperations.promiseChainWithCatch()
      } catch (error: unknown) {
        expect(error).toBeInstanceOf(ErrorX)
        const errorX = error as ErrorX

        expect(errorX.message).toContain('Promise chain catch from async-operations.ts')

        // Should have the current error location
        expect(errorX.stack).toContain('error-sources.ts') // Original timeout location

        // Check that the cause chain preserves error information
        expect(errorX.cause).toBeInstanceOf(ErrorX)
        const cause = errorX.cause as ErrorX
        expect(cause.message).toContain('Async catch with delay from error-handlers.ts')
      }
    })

    it('should handle event loop errors', async () => {
      try {
        await asyncOperations.eventLoopError()
      } catch (error: unknown) {
        expect(error).toBeInstanceOf(ErrorX)
        const errorX = error as ErrorX

        expect(errorX.message).toContain('Event loop error from async-operations.ts')
        expect(errorX.stack).toContain('async-operations.ts')

        // Should preserve the entire error chain
        expect(errorX.cause).toBeInstanceOf(ErrorX)
      }
    })
  })

  describe('Complex Error Wrapping', () => {
    it('should preserve stack trace through deep error chains', () => {
      try {
        complexScenarios.deepErrorChain()
      } catch (error: unknown) {
        expect(error).toBeInstanceOf(ErrorX)
        const errorX = error as ErrorX

        expect(errorX.message).toContain('Deep error chain from complex-scenarios.ts')
        expect(errorX.name).toBe('DeepChainError')
        expect(errorX.code).toBe('DEEP_CHAIN')

        // Should trace through all files
        expect(errorX.stack).toContain('error-sources.ts')
        expect(errorX.stack).toContain('error-handlers.ts')
        expect(errorX.stack).toContain('async-operations.ts')
        expect(errorX.stack).toContain('complex-scenarios.ts')
      }
    })

    it('should preserve stack trace through serialization', () => {
      try {
        complexScenarios.errorSerializationTest()
      } catch (error: unknown) {
        expect(error).toBeInstanceOf(ErrorX)
        const errorX = error as ErrorX

        expect(errorX.message).toContain('Error after serialization round-trip from complex-scenarios.ts')

        // Even after serialization/deserialization, should preserve stack info
        expect(errorX.cause).toBeInstanceOf(ErrorX)
        const deserializedCause = errorX.cause as ErrorX
        expect(deserializedCause.stack).toBeDefined()
      }
    })

    it('should handle multiple error wrapping', async () => {
      try {
        await complexScenarios.multipleErrorWrapping()
      } catch (error: unknown) {
        expect(error).toBeInstanceOf(ErrorX)
        const errorX = error as ErrorX

        expect(errorX.message).toContain('Third wrap in complex-scenarios.ts')

        // Check the wrapping chain
        expect(errorX.cause).toBeInstanceOf(ErrorX)
        const firstWrap = errorX.cause as ErrorX
        expect(firstWrap.message).toContain('Second wrap in complex-scenarios.ts')

        expect(firstWrap.cause).toBeInstanceOf(ErrorX)
        const secondWrap = firstWrap.cause as ErrorX
        expect(secondWrap.message).toContain('First wrap in complex-scenarios.ts')

        // Original error should still be traceable
        expect(secondWrap.cause).toBeInstanceOf(ErrorX)
      }
    })
  })

  describe('Metadata and Method Preservation', () => {
    it('should preserve stack trace with metadata operations', async () => {
      try {
        await complexScenarios.withMetadataPreservation()
      } catch (error: unknown) {
        expect(error).toBeInstanceOf(ErrorX)
        const errorX = error as ErrorX

        expect(errorX.message).toContain('Error with metadata preservation from complex-scenarios.ts')
        expect(errorX.cause).toBeInstanceOf(ErrorX)

        const enriched = errorX.cause as ErrorX
        expect(enriched.metadata.enrichedIn).toBe('complex-scenarios.ts')
        expect(enriched.metadata.originalStack).toBeDefined()

        // Stack should still be preserved
        expect(enriched.stack).toBeDefined()
      }
    })

    it('should handle class method errors', () => {
      try {
        asyncOperations.instantiateAndProcess()
      } catch (error: unknown) {
        expect(error).toBeInstanceOf(ErrorX)
        const errorX = error as ErrorX

        expect(errorX.message).toContain('Chained processing by processor-async-operations in async-operations.ts')

        // Check the cause chain for metadata
        expect(errorX.cause).toBeInstanceOf(ErrorX)
        const cause = errorX.cause as ErrorX
        expect(cause.metadata.processorId).toBe('processor-async-operations')

        // Should trace through class methods
        expect(errorX.stack).toContain('async-operations.ts')
        expect(errorX.stack).toContain('ErrorProcessor')
      }
    })

    it('should handle generator errors', () => {
      try {
        asyncOperations.generatorError()
      } catch (error: unknown) {
        expect(error).toBeInstanceOf(ErrorX)
        const errorX = error as ErrorX

        expect(errorX.message).toContain('Generator error from async-operations.ts')
        expect(errorX.stack).toContain('async-operations.ts')
        expect(errorX.stack).toContain('errorGenerator')
      }
    })
  })

  describe('Edge Cases and Error Chain Analysis', () => {
    it('should handle recursive errors', () => {
      try {
        complexScenarios.recursiveErrorTest()
      } catch (error: unknown) {
        expect(error).toBeInstanceOf(ErrorX)
        const errorX = error as ErrorX

        // Should be the first level (depth 0)
        expect(errorX.message).toContain('Recursive catch at depth 0 from complex-scenarios.ts')
        expect(errorX.metadata.currentDepth).toBe(0)

        // Count recursion depth
        let current = errorX
        let depth = 0
        while (current.cause && depth < 10) {
          depth++
          if (current.cause instanceof ErrorX) {
            current = current.cause
          } else {
            break
          }
        }

        expect(depth).toBeGreaterThan(3) // Should have recursive layers
      }
    })

    it('should handle circular references in metadata', () => {
      try {
        complexScenarios.errorWithCircularReference()
      } catch (error: unknown) {
        expect(error).toBeInstanceOf(ErrorX)
        const errorX = error as ErrorX

        expect(errorX.message).toContain('Error with circular reference from complex-scenarios.ts')

        // The circular reference should either be preserved or safely handled
        if (errorX.metadata.circular) {
          expect(errorX.metadata.circular.name).toBe('circular')
        } else {
          // If circular reference was replaced with safe value
          expect(errorX.metadata.error).toBe('Circular reference in metadata')
        }

        // Should handle circular references gracefully
        expect(() => errorX.toString()).not.toThrow()

        // toJSON should produce serializable output
        const serialized = errorX.toJSON()
        expect(() => JSON.stringify(serialized)).not.toThrow()
      }
    })

    it('should handle complex async scenarios', async () => {
      try {
        await complexScenarios.finalErrorTest()
      } catch (error: unknown) {
        expect(error).toBeInstanceOf(ErrorX)
        const errorX = error as ErrorX

        expect(errorX.message).toContain('Final error test from complex-scenarios.ts - maximum complexity')
        expect(errorX.name).toBe('FinalError')
        expect(errorX.code).toBe('FINAL_ERROR')
        expect(errorX.metadata.testType).toBe('final')
        expect(errorX.metadata.complexity).toBe('maximum')
        expect(errorX.metadata.layers).toEqual(['error-sources', 'error-handlers', 'async-operations', 'complex-scenarios'])

        // Should have handling options
        expect(errorX.handlingOptions.ui_mode).toBe('banner')
        expect(errorX.handlingOptions.logout).toBe(false)
        expect(errorX.handlingOptions.redirect).toBe('/error-page')
      }
    })
  })

  describe('Stack Trace Content Analysis', () => {
    it('should contain original function names in stack traces', () => {
      try {
        errorSources.throwNestedFunction()
      } catch (error: unknown) {
        expect(error).toBeInstanceOf(ErrorX)
        const errorX = error as ErrorX

        // Should contain the nested function structure
        expect(errorX.stack).toContain('level3')
        expect(errorX.stack).toContain('level2')
        expect(errorX.stack).toContain('level1')
        expect(errorX.stack).toContain('throwNestedFunction')
        expect(errorX.stack).toContain('error-sources.ts')
      }
    })

    it('should preserve line numbers in stack traces', () => {
      try {
        errorHandlers.tryCatchWithAdditionalProcessing()
      } catch (error: unknown) {
        expect(error).toBeInstanceOf(ErrorX)
        const errorX = error as ErrorX

        // Stack should contain line number information
        expect(errorX.stack).toMatch(/:\d+:\d+/)
        expect(errorX.stack).toContain('error-sources.ts')
        expect(errorX.stack).toContain('error-handlers.ts')
      }
    })

    it('should handle string and object error conversions', () => {
      try {
        errorHandlers.tryCatchRethrowWithErrorXWrap()
      } catch (error: unknown) {
        expect(error).toBeInstanceOf(ErrorX)
        const errorX = error as ErrorX

        expect(errorX.message).toContain('Wrapped with toErrorX in error-handlers.ts')
        expect(errorX.cause).toBeInstanceOf(ErrorX)

        const converted = errorX.cause as ErrorX
        expect(converted.message).toContain('String error from error-sources.ts')
        expect(converted.metadata.originalError).toBe('String error from error-sources.ts throwStringError')
      }
    })
  })

  describe('Error Chain Navigation', () => {
    it('should allow navigation through complex error chains', async () => {
      try {
        await complexScenarios.complexAsyncErrorChain()
      } catch (error: unknown) {
        expect(error).toBeInstanceOf(ErrorX)
        let current = error as ErrorX
        const messages: string[] = []
        const files: string[] = []

        // Navigate through the error chain
        while (current && messages.length < 20) { // Prevent infinite loops
          messages.push(current.message)

          // Extract file references from stack or message
          if (current.stack?.includes('error-sources.ts')) files.push('error-sources.ts')
          if (current.stack?.includes('error-handlers.ts')) files.push('error-handlers.ts')
          if (current.stack?.includes('async-operations.ts')) files.push('async-operations.ts')
          if (current.stack?.includes('complex-scenarios.ts')) files.push('complex-scenarios.ts')

          if (current.cause instanceof ErrorX) {
            current = current.cause
          } else if (current.cause instanceof Error) {
            messages.push(current.cause.message)
            break
          } else {
            break
          }
        }

        // Should have traced through multiple layers
        expect(messages.length).toBeGreaterThan(2)
        expect(files.includes('error-sources.ts')).toBe(true)
        expect(files.includes('error-handlers.ts')).toBe(true)
        expect(files.includes('async-operations.ts')).toBe(true)
        expect(files.includes('complex-scenarios.ts')).toBe(true)
      }
    })
  })
})
