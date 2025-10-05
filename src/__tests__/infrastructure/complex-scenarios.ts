import { ErrorX } from '../../index';
import * as asyncOperations from './async-operations';

/**
 * Complex Scenarios - Advanced error wrapping and edge case testing
 *
 * This module contains the most sophisticated error handling scenarios including
 * deep error chains, serialization/deserialization, multiple error wrapping,
 * recursive errors, circular references, and metadata preservation.
 * It represents the final layer of stack trace preservation testing.
 */

export function deepErrorChain(): never {
  try {
    asyncOperations.instantiateAndProcess();
  } catch (error) {
    throw new ErrorX({
      message: 'Deep error chain from complex-scenarios.ts',
      name: 'DeepChainError',
      code: 'DEEP_CHAIN',
      cause: error,
      metadata: { layer: 'file3', depth: 'maximum' },
    });
  }
}

export async function complexAsyncErrorChain(): Promise<void> {
  try {
    await asyncOperations.asyncChainWithTryCatch();
  } catch (error) {
    throw new ErrorX({
      message: 'Complex async error chain from complex-scenarios.ts',
      cause: error,
    });
  }
}

export function errorSerializationTest(): never {
  try {
    asyncOperations.generatorError();
  } catch (error) {
    // Test that serialization/deserialization preserves stack traces
    const errorX = ErrorX.from(error);
    const serialized = errorX.toJSON();
    const deserialized = ErrorX.fromJSON(serialized);

    throw new ErrorX({
      message: 'Error after serialization round-trip from complex-scenarios.ts',
      cause: deserialized,
    });
  }
}

export async function multipleErrorWrapping(): Promise<void> {
  try {
    await asyncOperations.promiseChainWithCatch();
  } catch (error) {
    // Wrap multiple times to test stack preservation
    const wrapped1 = new ErrorX({
      message: 'First wrap in complex-scenarios.ts',
      cause: error,
    });

    const wrapped2 = new ErrorX({
      message: 'Second wrap in complex-scenarios.ts',
      cause: wrapped1,
    });

    const wrapped3 = new ErrorX({
      message: 'Third wrap in complex-scenarios.ts',
      cause: wrapped2,
    });

    throw wrapped3;
  }
}

export async function withMetadataPreservation(): Promise<void> {
  try {
    await asyncOperations.eventLoopError();
  } catch (error) {
    if (error instanceof ErrorX) {
      // Test that withMetadata preserves stack traces
      const enriched = error.withMetadata({
        enrichedIn: 'complex-scenarios.ts',
        originalStack: error.stack,
      });

      throw new ErrorX({
        message: 'Error with metadata preservation from complex-scenarios.ts',
        cause: enriched,
      });
    }
    throw error;
  }
}

export async function stackCleaningTest(): Promise<void> {
  try {
    await asyncOperations.nestedSyncAsyncMix();
  } catch (error) {
    if (error instanceof ErrorX) {
      // Test stack cleaning functionality
      const cleaned = error.cleanStackTrace('asyncOperations.ts');
      throw new ErrorX({
        message: 'Error after stack cleaning from complex-scenarios.ts',
        cause: cleaned,
      });
    }
    throw error;
  }
}

export class ComplexErrorHandler {
  private static instances = 0;
  private id: number;

  constructor() {
    this.id = ++ComplexErrorHandler.instances;
  }

  async handleError(source: string): Promise<void> {
    try {
      switch (source) {
        // biome-ignore lint/suspicious/noFallthroughSwitchClause: This function throws
        case 'deep':
          this.deepErrorChain();
        // No break needed - function throws
        case 'async':
          await this.complexAsyncErrorChain();
          break;
        default:
          await asyncOperations.parallelAsyncErrors();
      }
    } catch (error) {
      throw new ErrorX({
        message: `Complex error handling by instance ${this.id} from complex-scenarios.ts`,
        cause: error,
        metadata: {
          handlerId: this.id,
          source,
          handlerClass: 'ComplexErrorHandler',
        },
      });
    }
  }

  private deepErrorChain(): never {
    return deepErrorChain();
  }

  private async complexAsyncErrorChain(): Promise<void> {
    return complexAsyncErrorChain();
  }
}

export function recursiveErrorTest(depth = 0): never {
  if (depth > 3) {
    throw new ErrorX({
      message: `Recursive error at depth ${depth} from complex-scenarios.ts`,
      metadata: { recursionDepth: depth },
    });
  }

  try {
    recursiveErrorTest(depth + 1);
  } catch (error) {
    throw new ErrorX({
      message: `Recursive catch at depth ${depth} from complex-scenarios.ts`,
      cause: error,
      metadata: { currentDepth: depth },
    });
  }
}

export function errorWithCircularReference(): never {
  // biome-ignore lint/suspicious/noExplicitAny: Test requires any type for circular reference
  const obj: any = { name: 'circular' };
  obj.self = obj;
  obj.nested = { parent: obj };

  try {
    asyncOperations.instantiateAndProcess();
  } catch (error) {
    throw new ErrorX({
      message: 'Error with circular reference from complex-scenarios.ts',
      cause: error,
      metadata: { circular: obj },
    });
  }
}

export async function finalErrorTest(): Promise<void> {
  const handler = new ComplexErrorHandler();

  try {
    // Use the deep error chain to create maximum complexity
    await handler.handleError('deep');
  } catch (error) {
    throw new ErrorX({
      message: 'Final error test from complex-scenarios.ts - maximum complexity',
      name: 'FinalError',
      code: 'FINAL_ERROR',
      cause: error,
      metadata: {
        testType: 'final',
        complexity: 'maximum',
        layers: ['error-sources', 'error-handlers', 'async-operations', 'complex-scenarios'],
      },
    });
  }
}
