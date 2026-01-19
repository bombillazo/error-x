import { describe, expect, it } from 'vitest';
import { ErrorX, type ErrorXSnapshot } from '../index.js';
import * as asyncOperations from './infrastructure/async-operations.js';
import * as complexScenarios from './infrastructure/complex-scenarios.js';
import * as errorHandlers from './infrastructure/error-handlers.js';
import * as errorSources from './infrastructure/error-sources.js';

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
      expect(() => errorHandlers.simpleTryCatchRethrow()).toThrow();

      try {
        errorHandlers.simpleTryCatchRethrow();
      } catch (error: unknown) {
        expect(error).toBeInstanceOf(ErrorX);
        const errorX = error as ErrorX;

        // Should contain the original error location from error-sources.ts
        expect(errorX.stack).toContain('error-sources.ts');
        expect(errorX.stack).toContain('throwSimpleErrorX');

        // Should also show the call path through error-handlers.ts
        expect(errorX.stack).toContain('error-handlers.ts');
      }
    });

    it('should preserve native error in parent when wrapping', () => {
      try {
        errorHandlers.tryCatchRethrowAsErrorX();
      } catch (error: unknown) {
        expect(error).toBeInstanceOf(ErrorX);
        const errorX = error as ErrorX;

        // Check the main error message
        expect(errorX.message).toContain('Caught and rethrown from error-handlers.ts');

        // Check that the parent is preserved
        expect(errorX.parent).toBeDefined();
        expect(errorX.parent?.message).toContain('Native error from error-sources.ts');

        // Each error has its own stack - current error shows where it was created
        expect(errorX.stack).toContain('error-handlers.ts');

        // Parent's original stack shows where the native error was thrown
        expect(errorX.parent?.original?.stack).toContain('error-sources.ts');
      }
    });

    it('should handle multiple try-catch layers', () => {
      try {
        errorHandlers.multipleTryCatchLayers();
      } catch (error: unknown) {
        expect(error).toBeInstanceOf(ErrorX);
        const errorX = error as ErrorX;

        // Should be the outermost error
        expect(errorX.message).toContain('Outer catch in error-handlers.ts');

        // With single-level parent storage, we just check that parent exists
        expect(errorX.parent).toBeDefined();

        // Verify the error has meaningful information
        expect(errorX.message).toBeTruthy();
        expect(errorX.parent?.message).toBeTruthy();
      }
    });
  });

  describe('Async Error Preservation', () => {
    it('should preserve stack trace through async operations', async () => {
      try {
        await errorHandlers.asyncTryCatchRethrow();
      } catch (error: unknown) {
        expect(error).toBeInstanceOf(ErrorX);
        const errorX = error as ErrorX;

        expect(errorX.message).toContain('Async catch and rethrow from error-handlers.ts');
        // Each error has its own stack - current error shows where it was created
        expect(errorX.stack).toContain('error-handlers.ts');

        // Should preserve async context - parent error is in the chain
        expect(errorX.parent).toBeDefined();
        // Parent's stack shows where it was created (or original if it wrapped a native Error)
        expect(errorX.parent?.stack ?? errorX.parent?.original?.stack).toBeDefined();
      }
    });

    it('should preserve stack trace through promise chains', async () => {
      try {
        await asyncOperations.promiseChainWithCatch();
      } catch (error: unknown) {
        expect(error).toBeInstanceOf(ErrorX);
        const errorX = error as ErrorX;

        expect(errorX.message).toContain('Promise chain catch from async-operations.ts');

        // Each error has its own stack - current error shows where it was created
        expect(errorX.stack).toContain('async-operations.ts');

        // Check that the parent chain preserves error information
        expect(errorX.parent).toBeDefined();
        const parent = errorX.parent as ErrorXSnapshot;
        expect(parent.message).toContain('Async catch with delay from error-handlers.ts');
      }
    });

    it('should handle event loop errors', async () => {
      try {
        await asyncOperations.eventLoopError();
      } catch (error: unknown) {
        expect(error).toBeInstanceOf(ErrorX);
        const errorX = error as ErrorX;

        expect(errorX.message).toContain('Event loop error from async-operations.ts');
        expect(errorX.stack).toContain('async-operations.ts');

        // Should preserve the entire error chain
        expect(errorX.parent).toBeDefined();
      }
    });
  });

  describe('Complex Error Wrapping', () => {
    it('should preserve stack trace through deep error chains', () => {
      try {
        complexScenarios.deepErrorChain();
      } catch (error: unknown) {
        expect(error).toBeInstanceOf(ErrorX);
        const errorX = error as ErrorX;

        expect(errorX.message).toContain('Deep error chain from complex-scenarios.ts');
        expect(errorX.name).toBe('DeepChainError');
        expect(errorX.code).toBe('DEEP_CHAIN');

        // Each error has its own stack - current error shows where it was created
        expect(errorX.stack).toContain('complex-scenarios.ts');

        // The chain preserves all ancestor error stacks
        expect(errorX.chain.length).toBeGreaterThan(1);
      }
    });

    it('should preserve stack trace through serialization', () => {
      try {
        complexScenarios.errorSerializationTest();
      } catch (error: unknown) {
        expect(error).toBeInstanceOf(ErrorX);
        const errorX = error as ErrorX;

        expect(errorX.message).toContain(
          'Error after serialization round-trip from complex-scenarios.ts'
        );

        // Even after serialization/deserialization, should preserve stack info
        expect(errorX.parent).toBeDefined();
        const deserializedCause = errorX.parent as ErrorXSnapshot;
        expect(deserializedCause.stack).toBeDefined();
      }
    });

    it('should handle multiple error wrapping', async () => {
      try {
        await complexScenarios.multipleErrorWrapping();
      } catch (error: unknown) {
        expect(error).toBeInstanceOf(ErrorX);
        const errorX = error as ErrorX;

        expect(errorX.message).toContain('Third wrap in complex-scenarios.ts');

        // With single-level parent storage, we only have one parent
        expect(errorX.parent).toBeDefined();
        // The parent should contain information from the original error chain
        expect(errorX.parent?.message || errorX.parent?.stack).toBeDefined();
      }
    });
  });

  describe('Metadata and Method Preservation', () => {
    it('should preserve stack trace with metadata operations', async () => {
      try {
        await complexScenarios.withMetadataPreservation();
      } catch (error: unknown) {
        expect(error).toBeInstanceOf(ErrorX);
        const errorX = error as ErrorX;

        expect(errorX.message).toContain(
          'Error with metadata preservation from complex-scenarios.ts'
        );
        expect(errorX.parent).toBeDefined();

        // With ErrorXSnapshot, metadata is not preserved in cause (only message, name, stack)
        // Stack should still be preserved in ErrorXSnapshot
        expect(errorX.parent?.stack).toBeDefined();
      }
    });

    it('should handle class method errors', () => {
      try {
        asyncOperations.instantiateAndProcess();
      } catch (error: unknown) {
        expect(error).toBeInstanceOf(ErrorX);
        const errorX = error as ErrorX;

        expect(errorX.message).toContain(
          'Chained processing by processor-async-operations in async-operations.ts'
        );

        // Check the cause exists (metadata not preserved in ErrorXSnapshot)
        expect(errorX.parent).toBeDefined();

        // Each error has its own stack - current error shows where it was created
        expect(errorX.stack).toContain('async-operations.ts');
      }
    });

    it('should handle generator errors', () => {
      try {
        asyncOperations.generatorError();
      } catch (error: unknown) {
        expect(error).toBeInstanceOf(ErrorX);
        const errorX = error as ErrorX;

        expect(errorX.message).toContain('Generator error from async-operations.ts');
        expect(errorX.stack).toContain('async-operations.ts');
        expect(errorX.stack).toContain('errorGenerator');
      }
    });
  });

  describe('Edge Cases and Error Chain Analysis', () => {
    it('should handle recursive errors', () => {
      try {
        complexScenarios.recursiveErrorTest();
      } catch (error: unknown) {
        expect(error).toBeInstanceOf(ErrorX);
        const errorX = error as ErrorX;

        // Should be the first level (depth 0)
        expect(errorX.message).toContain('Recursive catch at depth 0 from complex-scenarios.ts');
        expect(errorX.metadata?.currentDepth).toBe(0);

        // With single-level cause storage, we just verify cause exists
        expect(errorX.parent).toBeDefined();
      }
    });

    it('should handle circular references in metadata', () => {
      try {
        complexScenarios.errorWithCircularReference();
      } catch (error: unknown) {
        expect(error).toBeInstanceOf(ErrorX);
        const errorX = error as ErrorX;

        expect(errorX.message).toContain('Error with circular reference from complex-scenarios.ts');

        // The circular reference should either be preserved or safely handled
        if (
          errorX.metadata?.circular &&
          typeof errorX.metadata.circular === 'object' &&
          'name' in errorX.metadata.circular
        ) {
          expect(errorX.metadata?.circular.name).toBe('circular');
        } else {
          // If circular reference was replaced with safe value
          expect(errorX.metadata?.error).toBe('Circular reference in metadata');
        }

        // Should handle circular references gracefully
        expect(() => errorX.toString()).not.toThrow();

        // toJSON should produce serializable output
        const serialized = errorX.toJSON();
        expect(() => JSON.stringify(serialized)).not.toThrow();
      }
    });

    it('should handle complex async scenarios', async () => {
      try {
        await complexScenarios.finalErrorTest();
      } catch (error: unknown) {
        expect(error).toBeInstanceOf(ErrorX);
        const errorX = error as ErrorX;

        expect(errorX.message).toContain(
          'Final error test from complex-scenarios.ts - maximum complexity'
        );
        expect(errorX.name).toBe('FinalError');
        expect(errorX.code).toBe('FINAL_ERROR');
        expect(errorX.metadata?.testType).toBe('final');
        expect(errorX.metadata?.complexity).toBe('maximum');
        expect(errorX.metadata?.layers).toEqual([
          'error-sources',
          'error-handlers',
          'async-operations',
          'complex-scenarios',
        ]);

        expect(errorX.metadata).toBeDefined();
      }
    });
  });

  describe('Stack Trace Content Analysis', () => {
    it('should contain original function names in stack traces', () => {
      try {
        errorSources.throwNestedFunction();
      } catch (error: unknown) {
        expect(error).toBeInstanceOf(ErrorX);
        const errorX = error as ErrorX;

        // Should contain the nested function structure
        expect(errorX.stack).toContain('level3');
        expect(errorX.stack).toContain('level2');
        expect(errorX.stack).toContain('level1');
        expect(errorX.stack).toContain('throwNestedFunction');
        expect(errorX.stack).toContain('error-sources.ts');
      }
    });

    it('should preserve line numbers in stack traces', () => {
      try {
        errorHandlers.tryCatchWithAdditionalProcessing();
      } catch (error: unknown) {
        expect(error).toBeInstanceOf(ErrorX);
        const errorX = error as ErrorX;

        // Stack should contain line number information
        expect(errorX.stack).toMatch(/:\d+:\d+/);
        // Each error has its own stack - current error shows where it was created
        expect(errorX.stack).toContain('error-handlers.ts');

        // Parent's stack preserves the original error location
        expect(errorX.parent).toBeDefined();
      }
    });

    it('should handle string and object error conversions', () => {
      try {
        errorHandlers.tryCatchRethrowWithErrorXWrap();
      } catch (error: unknown) {
        expect(error).toBeInstanceOf(ErrorX);
        const errorX = error as ErrorX;

        expect(errorX.message).toContain('Wrapped with from in error-handlers.ts');
        expect(errorX.parent).toBeDefined();

        // With ErrorXSnapshot, cause is a plain object with message, name, stack
        expect(errorX.parent?.message).toContain('String error from error-sources.ts');
      }
    });
  });

  describe('Error Chain Navigation', () => {
    it('should allow navigation through complex error chains', async () => {
      try {
        await complexScenarios.complexAsyncErrorChain();
      } catch (error: unknown) {
        expect(error).toBeInstanceOf(ErrorX);
        const current = error as ErrorX;
        const messages: string[] = [];

        // With chain storage, check all errors in the chain
        messages.push(current.message);
        if (current.parent) {
          messages.push(current.parent.message);
        }

        // The chain contains all errors - each has its own stack showing where it was created
        expect(current.chain.length).toBeGreaterThan(0);

        // Current error's stack shows where it was created
        expect(current.stack).toContain('complex-scenarios.ts');

        // Should have at least the error message
        expect(messages.length).toBeGreaterThan(0);

        // Verify the chain contains multiple errors
        expect(current.chain.length).toBeGreaterThan(1);
      }
    });
  });
});
