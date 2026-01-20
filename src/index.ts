export { ErrorX, type ErrorXConfig } from './error';
export {
  type DBErrorPreset,
  DBErrorX,
  type DBErrorXMetadata,
  dbErrorUiMessages,
  HTTPErrorX,
  type HTTPErrorXMetadata,
  type HTTPStatusCode,
  httpErrorUiMessages,
  ValidationErrorX,
  type ValidationErrorXMetadata,
  validationErrorUiMessage,
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
