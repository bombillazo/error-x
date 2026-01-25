# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.6.0] - 2026-01-20

### Added

- `ErrorXResolver` class for resolving ErrorX instances to enhanced presentation objects
  - Type-safe error type determination via `onResolveType` callback
  - i18n integration with custom resolver functions
  - Documentation URL building with `docs.baseUrl` and `docsPath` options
  - Custom config properties support for domain-specific needs
  - Config hierarchy: defaults → type config → preset config
  - Custom result type transformation via `onTransformResult`
- New type definitions in `types/resolver.types.ts` for resolver functionality

### Changed

- Refactored UI message exports for better organization
  - `httpErrorUiMessages` now keyed by status code
  - `dbErrorUiMessages` keyed by preset name
  - `validationErrorUiMessage` for default validation message
- Split type definitions into separate files for better maintainability:
  - `types/core.types.ts` - Core type definitions
  - `types/resolver.types.ts` - Resolver-specific types
  - `types/serialization.types.ts` - Serialization types
  - `types/transform.types.ts` - Transform types

### Removed

- `uiMessage` property from ErrorX class (use `ErrorXResolver` instead)

## [0.5.1] - 2026-01-19

### Changed

- Enhanced serialization and deserialization to preserve all properties in error chains
- Improved chain restoration from JSON with full property preservation
- Renamed `ErrorXCause` type to `ErrorXSnapshot` for clarity

## [0.5.0] - 2026-01-19

### Added

- `DBErrorX` class with presets for common database errors:
  - `CONNECTION_FAILED`, `QUERY_FAILED`, `UNIQUE_VIOLATION`, `FOREIGN_KEY_VIOLATION`
  - `NOT_NULL_VIOLATION`, `CHECK_VIOLATION`, `TIMEOUT`, `DEADLOCK`
  - `TRANSACTION_FAILED`, `SERIALIZATION_FAILURE`
- `ValidationErrorX` class with:
  - `fromZodError()` static method for Zod integration
  - `forField()` static method for field-specific validation errors
  - Presets: `INVALID_FORMAT`, `REQUIRED_FIELD`, `OUT_OF_RANGE`, `INVALID_TYPE`

### Changed

- Major internal refactoring for improved code organization
- Updated format script configuration

## [0.4.6] - 2025-10-06

### Added

- Documentation section in README
- GitHub Pages configuration for API documentation

### Changed

- Improved documentation generation scripts

## [0.4.5] - 2025-10-06

### Changed

- Enhanced ErrorX metadata extraction from source errors
- Updated documentation with improved examples

### Fixed

- Homepage URL in package.json to reflect correct repository

## [0.4.4] - 2025-10-06

### Changed

- `timestamp` property now uses Unix epoch (milliseconds) instead of ISO string
- `withMetadata()` signature updated to support additional metadata type parameter
- Improved `toString()` output format for better readability

## [0.4.3] - 2025-10-06

### Changed

- HTTP presets now indexed by status code (e.g., `HTTPErrorX.create(404)`)
- Improved consistency in preset usage patterns

## [0.4.2] - 2025-10-06

### Added

- `cleanStackDelimiter` configuration option for trimming stack traces at a specific line

### Changed

- Renamed stack cleaning configuration for clarity

## [0.4.1] - 2025-10-05

### Changed

- Updated ErrorX cause type to `ErrorXCause` for improved type safety
- Refactored error handling to use `ErrorXCause` format for cause property

## [0.4.0] - 2025-10-05

### Added

- `HTTPErrorX` class with presets for all standard HTTP status codes (400-511)
- Type-safe metadata support with generics
- `ErrorX.configure()` static method for global configuration
- `cleanStack` configuration option with customizable patterns
- Frozen HTTP presets for immutability

### Changed

- `code` field in `ErrorXOptions` now accepts both string and number types
- Improved HTTP error preset messages for consistency

### Fixed

- Message casing for HTTP error presets

## [0.3.0] - 2025-09-30

### Added

- Preset support integrated directly into ErrorX class
- `ErrorX.create()` factory method for preset-based creation

### Changed

- Refactored actions structure for consistency
- Removed separate presets module in favor of integrated approach

## [0.2.2] - 2025-09-30

### Added

- Enhanced README with error presets documentation
- API documentation improvements with usage patterns

## [0.2.1] - 2025-09-30

### Added

- `httpStatus` field for HTTP error status codes
- `type` field for error categorization
- Presets for common HTTP error configurations

### Fixed

- Metadata access using optional chaining for safety
- Validation for `httpStatus` and `type` in constructor

## [0.2.0] - 2025-09-29

### Added

- `ERROR_X_OPTION_FIELDS` constant for centralized validation
- Smart conversion in constructor (supports string messages directly)

### Changed

- Enhanced `ErrorXOptions` type for improved flexibility and ergonomics
- Streamlined options conversion logic in constructor
- Updated documentation links to use scoped package name

## [0.1.1] - 2025-08-18

### Added

- Initial release of error-x
- `ErrorX` class extending native `Error` with:
  - `code` property with automatic generation from name (UPPER_SNAKE_CASE)
  - `message` for technical error descriptions
  - `name` for error type identification
  - `metadata` for additional context
  - `timestamp` for error occurrence tracking
  - `chain` property for full error sequence access
  - `parent` and `root` properties for error chain navigation
  - `original` property for non-ErrorX wrapped entities
- `ErrorX.from()` static method for converting any value to ErrorX
- `ErrorX.fromJSON()` for deserialization
- `ErrorX.isErrorX()` type guard
- `ErrorX.cleanStack()` for removing internal frames from stack traces
- `withMetadata()` instance method for creating errors with merged metadata
- `toJSON()` for serialization
- `toString()` for detailed string representation
- Safe JSON serialization handling circular references
- Comprehensive test suite
- Initial documentation

[Unreleased]: https://github.com/bombillazo/error-x/compare/v0.6.0...HEAD
[0.6.0]: https://github.com/bombillazo/error-x/compare/v0.5.1...v0.6.0
[0.5.1]: https://github.com/bombillazo/error-x/compare/v0.5.0...v0.5.1
[0.5.0]: https://github.com/bombillazo/error-x/compare/v0.4.6...v0.5.0
[0.4.6]: https://github.com/bombillazo/error-x/compare/v0.4.5...v0.4.6
[0.4.5]: https://github.com/bombillazo/error-x/compare/v0.4.4...v0.4.5
[0.4.4]: https://github.com/bombillazo/error-x/compare/v0.4.3...v0.4.4
[0.4.3]: https://github.com/bombillazo/error-x/compare/v0.4.2...v0.4.3
[0.4.2]: https://github.com/bombillazo/error-x/compare/v0.4.1...v0.4.2
[0.4.1]: https://github.com/bombillazo/error-x/compare/v0.4.0...v0.4.1
[0.4.0]: https://github.com/bombillazo/error-x/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/bombillazo/error-x/compare/v0.2.2...v0.3.0
[0.2.2]: https://github.com/bombillazo/error-x/compare/v0.2.1...v0.2.2
[0.2.1]: https://github.com/bombillazo/error-x/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/bombillazo/error-x/compare/v0.1.1...v0.2.0
[0.1.1]: https://github.com/bombillazo/error-x/releases/tag/v0.1.1
