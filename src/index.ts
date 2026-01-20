export { ErrorX, type ErrorXConfig } from './error';
export {
  dbErrorUiMessages,
  type DBErrorPreset,
  DBErrorX,
  type DBErrorXMetadata,
  httpErrorUiMessages,
  HTTPErrorX,
  type HTTPErrorXMetadata,
  type HTTPStatusCode,
  validationErrorUiMessage,
  ValidationErrorX,
  type ValidationErrorXMetadata,
  type ZodIssue,
} from './presets/index';
export { ErrorXResolver } from './resolver';
export type {
  ErrorXBaseConfig,
  ErrorXMetadata,
  ErrorXOptions,
  ErrorXResolverConfig,
  ErrorXResolverDocsConfig,
  ErrorXResolverI18nConfig,
  ErrorXResolverOptions,
  ErrorXResolverTypeConfig,
  ErrorXSerialized,
  ErrorXSnapshot,
  ErrorXTransform,
  ErrorXTransformContext,
  ResolveContext,
} from './types';
