/**
 * Core type definitions for ErrorX.
 *
 * @remarks
 * These types define the fundamental structures for creating and configuring ErrorX instances:
 * - {@link ErrorXOptions} - Constructor options for creating errors
 * - {@link ErrorXMetadata} - Type-safe metadata storage
 * - {@link ErrorXSnapshot} - Serialized representation of original errors
 * - {@link ErrorXOptionField} - Valid option field names
 * - {@link ErrorXBasePresetKey} - Base type for preset keys
 *
 * @packageDocumentation
 */

// Core types
export {
  ERROR_X_OPTION_FIELDS,
  type ErrorXBasePresetKey,
  type ErrorXMetadata,
  type ErrorXOptionField,
  type ErrorXOptions,
  type ErrorXSnapshot,
} from './core.types';

/**
 * Resolver type definitions for ErrorXResolver.
 *
 * @remarks
 * These types support the ErrorXResolver class for error presentation:
 * - {@link ErrorXResolverOptions} - Full configuration for resolver instances
 * - {@link ErrorXResolverConfig} - Type helper for custom config extensions
 * - {@link ErrorXBaseConfig} - Base configuration properties
 * - {@link ResolveContext} - Context object returned by resolve()
 */
export type {
  ErrorXBaseConfig,
  ErrorXResolverConfig,
  ErrorXResolverDocsConfig,
  ErrorXResolverI18nConfig,
  ErrorXResolverOptions,
  ErrorXResolverTypeConfig,
  ResolveContext,
} from './resolver.types';

/**
 * Serialization type definitions.
 *
 * @remarks
 * {@link ErrorXSerialized} - JSON-serializable representation for network transmission
 * and storage. Used by `toJSON()` and `fromJSON()` methods.
 */
export type { ErrorXSerialized } from './serialization.types';

/**
 * Transform type definitions for custom error classes.
 *
 * @remarks
 * These types support the `.create()` factory method's transform feature:
 * - {@link ErrorXTransform} - Function signature for option transformation
 * - {@link ErrorXTransformContext} - Context passed to transform functions
 */
export type { ErrorXTransform, ErrorXTransformContext } from './transform.types';
