import type { ErrorXMetadata, ErrorXOptions } from './core.types';

/**
 * Context passed to the transform function when creating errors via `.create()`.
 * Contains information about the preset being used.
 *
 * @public
 */
export type ErrorXTransformContext = {
  /** The preset key used (if any) */
  presetKey: string | number | undefined;
};

/**
 * Transform function signature for custom error classes.
 * Transforms options after merge but before instantiation.
 *
 * @public
 */
export type ErrorXTransform<TMetadata extends ErrorXMetadata = ErrorXMetadata> = (
  opts: ErrorXOptions<ErrorXMetadata>,
  ctx: ErrorXTransformContext
) => ErrorXOptions<TMetadata>;
