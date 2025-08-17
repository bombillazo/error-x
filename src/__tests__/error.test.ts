import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { type ErrorMetadata, ErrorX, type SerializableError, ErrorUIMode, type ErrorHandlingOptions } from '../index.js'

describe('ErrorX', () => {
  let mockDate: Date
  let originalCaptureStackTrace: unknown

  beforeEach(() => {
    // Mock Date for consistent timestamps
    mockDate = new Date('2024-01-15T10:30:45.123Z')
    vi.setSystemTime(mockDate)

    // Store original captureStackTrace
    originalCaptureStackTrace = Error.captureStackTrace
  })

  afterEach(() => {
    vi.useRealTimers()
    // Restore original captureStackTrace
    if (originalCaptureStackTrace) {
      ; (Error as any).captureStackTrace = originalCaptureStackTrace
    }
  })

  describe('Constructor', () => {
    it('should create error with minimal options', () => {
      const error = new ErrorX({ message: 'test error' })

      expect(error.message).toBe('Test error.')
      expect(error.name).toBe('Error')
      expect(error.code).toBe('ERROR')
      expect(error.uiMessage).toBe('Something went wrong. Please try again.')
      expect(error.metadata).toEqual({})
      expect(error.timestamp).toEqual(mockDate)
      expect(error).toBeInstanceOf(Error)
      expect(error).toBeInstanceOf(ErrorX)
    })

    it('should create error with all options', () => {
      const metadata = { userId: 123, action: 'login' }
      const cause = new Error('Original error')

      const error = new ErrorX({
        message: 'authentication failed',
        name: 'AuthError',
        code: 'AUTH_FAILED',
        uiMessage: 'Please check your credentials',
        cause,
        metadata,
      })

      expect(error.message).toBe('Authentication failed.')
      expect(error.name).toBe('AuthError')
      expect(error.code).toBe('AUTH_FAILED')
      expect(error.uiMessage).toBe('Please check your credentials')
      expect(error.metadata).toEqual(metadata)
      expect(error.cause).toBe(cause)
      expect(error.timestamp).toEqual(mockDate)
    })

    it('should create error with number code', () => {
      const error = new ErrorX({
        message: 'HTTP error',
        name: 'HTTPError',
        code: 404,
        uiMessage: 'Page not found',
      })

      expect(error.message).toBe('HTTP error.')
      expect(error.name).toBe('HTTPError')
      expect(error.code).toBe('404')
      expect(error.uiMessage).toBe('Page not found')
    })

    it('should create error with handlingOptions', () => {
      const handlingOptions: ErrorHandlingOptions = {
        logout: true,
        redirect: '/login',
        ui_mode: ErrorUIMode.MODAL
      }

      const error = new ErrorX({
        message: 'Authentication expired',
        name: 'AuthExpiredError',
        code: 'AUTH_EXPIRED',
        handlingOptions
      })

      expect(error.message).toBe('Authentication expired.')
      expect(error.name).toBe('AuthExpiredError')
      expect(error.code).toBe('AUTH_EXPIRED')
      expect(error.handlingOptions).toEqual(handlingOptions)
    })

    it('should create error with no options', () => {
      const error = new ErrorX()

      expect(error.message).toBe('An error occurred')
      expect(error.name).toBe('Error')
      expect(error.code).toBe('ERROR')
      expect(error.uiMessage).toBe('Something went wrong. Please try again.')
      expect(error.metadata).toEqual({})
      expect(error.handlingOptions).toEqual({})
      expect(error.timestamp).toEqual(mockDate)
      expect(error).toBeInstanceOf(Error)
      expect(error).toBeInstanceOf(ErrorX)
    })

    it('should create error with empty options object', () => {
      const error = new ErrorX({})

      expect(error.message).toBe('An error occurred')
      expect(error.name).toBe('Error')
      expect(error.code).toBe('ERROR')
      expect(error.uiMessage).toBe('Something went wrong. Please try again.')
      expect(error.metadata).toEqual({})
      expect(error.handlingOptions).toEqual({})
      expect(error.timestamp).toEqual(mockDate)
    })

    it('should create error with partial options', () => {
      const error = new ErrorX({ name: 'CustomError' })

      expect(error.message).toBe('An error occurred')
      expect(error.name).toBe('CustomError')
      expect(error.code).toBe('CUSTOM_ERROR')
      expect(error.uiMessage).toBe('Something went wrong. Please try again.')
      expect(error.metadata).toEqual({})
      expect(error.handlingOptions).toEqual({})
    })

    it('should format messages correctly', () => {
      const testCases = [
        { input: 'simple message', expected: 'Simple message.' },
        { input: 'already capitalized', expected: 'Already capitalized.' },
        {
          input: 'multiple sentences. second sentence',
          expected: 'Multiple sentences. Second sentence.',
        },
        { input: 'ends with period.', expected: 'Ends with period.' },
        { input: 'ends with exclamation!', expected: 'Ends with exclamation!' },
        { input: 'ends with question?', expected: 'Ends with question?' },
        { input: 'ends with paren)', expected: 'Ends with paren)' },
        { input: '', expected: 'An error occurred' },
        { input: '   ', expected: 'An error occurred' },
      ]

      for (const { input, expected } of testCases) {
        const error = new ErrorX({ message: input })
        expect(error.message).toBe(expected)
      }
    })

    it('should generate default codes from names', () => {
      const testCases = [
        { name: 'DatabaseError', expected: 'DATABASE_ERROR' },
        { name: 'userAuthError', expected: 'USER_AUTH_ERROR' },
        { name: 'API Timeout', expected: 'API_TIMEOUT' },
        { name: 'Simple', expected: 'SIMPLE' },
        { name: 'special-chars!@#', expected: 'SPECIALCHARS' },
        { name: '', expected: 'ERROR' },
        { name: undefined, expected: 'ERROR' },
      ]

      for (const { name, expected } of testCases) {
        const error = new ErrorX({
          message: 'test',
          name: name as string | undefined,
        })
        expect(error.code).toBe(expected)
      }
    })

    it('should preserve original stack when cause is Error', () => {
      const originalError = new Error('Original error')
      originalError.stack =
        'Error: Original error\n    at someFunction (file.js:10:5)\n    at anotherFunction (file.js:20:10)'

      const wrappedError = new ErrorX({
        message: 'Wrapped error',
        cause: originalError,
      })

      expect(wrappedError.stack).toContain('Error: Wrapped error.')
      expect(wrappedError.stack).toContain('at someFunction (file.js:10:5)')
      expect(wrappedError.stack).toContain('at anotherFunction (file.js:20:10)')
    })

    it('should clean stack when no cause provided', () => {
      const error = new ErrorX({ message: 'test error' })

      // Should not contain ErrorX internal calls
      expect(error.stack).not.toContain('new ErrorX')
      expect(error.stack).not.toContain('ErrorX.constructor')
      expect(error.stack).not.toContain('error-x/src/error.ts')
    })
  })

  describe('Default Values', () => {
    it('should use correct default name', () => {
      const error = new ErrorX({ message: 'test' })
      expect(error.name).toBe('Error')
    })

    it('should use correct default UI message', () => {
      const error = new ErrorX({ message: 'test' })
      expect(error.uiMessage).toBe('Something went wrong. Please try again.')
    })

    it('should generate default code when no name provided', () => {
      const error = new ErrorX({ message: 'test' })
      expect(error.code).toBe('ERROR')
    })

    it('should use empty metadata by default', () => {
      const error = new ErrorX({ message: 'test' })
      expect(error.metadata).toEqual({})
    })
  })

  describe('Static Methods', () => {
    describe('isErrorX', () => {
      it('should return true for ErrorX instances', () => {
        const error = new ErrorX({ message: 'test' })
        expect(ErrorX.isErrorX(error)).toBe(true)
      })

      it('should return false for regular Error instances', () => {
        const error = new Error('test')
        expect(ErrorX.isErrorX(error)).toBe(false)
      })

      it('should return false for non-error values', () => {
        expect(ErrorX.isErrorX(null)).toBe(false)
        expect(ErrorX.isErrorX(undefined)).toBe(false)
        expect(ErrorX.isErrorX('string')).toBe(false)
        expect(ErrorX.isErrorX({})).toBe(false)
        expect(ErrorX.isErrorX(123)).toBe(false)
      })
    })

    describe('toErrorX', () => {
      it('should return same ErrorX instance', () => {
        const original = new ErrorX({ message: 'test' })
        const result = ErrorX.toErrorX(original)
        expect(result).toBe(original)
      })

      it('should convert regular Error', () => {
        const error = new Error('test error')
        error.name = 'CustomError'

        const converted = ErrorX.toErrorX(error)

        expect(converted.message).toBe('Test error.')
        expect(converted.name).toBe('CustomError')
        expect(converted.cause).toBe(error.cause)
      })

      it('should convert string to ErrorX', () => {
        const converted = ErrorX.toErrorX('simple string error')

        expect(converted.message).toBe('Simple string error.')
        expect(converted.metadata.originalError).toBe('simple string error')
      })

      it('should extract properties from API-like objects', () => {
        const apiError = {
          message: 'user not found',
          name: 'NotFoundError',
          code: 'USER_404',
          uiMessage: 'User does not exist',
          statusText: 'Not Found',
          endpoint: '/api/users/123',
        }

        const converted = ErrorX.toErrorX(apiError)

        expect(converted.message).toBe('User not found.')
        expect(converted.name).toBe('NotFoundError')
        expect(converted.code).toBe('USER_404')
        expect(converted.uiMessage).toBe('User does not exist')
        expect(converted.metadata.originalError).toBe(apiError)
      })

      it('should extract number codes from objects', () => {
        const apiError = {
          message: 'HTTP request failed',
          name: 'HTTPError',
          code: 500,
          statusText: 'Internal Server Error',
        }

        const converted = ErrorX.toErrorX(apiError)

        expect(converted.message).toBe('HTTP request failed.')
        expect(converted.name).toBe('HTTPError')
        expect(converted.code).toBe('500')
        expect(converted.metadata.originalError).toBe(apiError)
      })

      it('should extract handlingOptions from objects', () => {
        const apiError = {
          message: 'Session expired',
          name: 'SessionError',
          code: 'SESSION_EXPIRED',
          handlingOptions: {
            logout: true,
            redirect: '/login',
            ui_mode: ErrorUIMode.TOAST
          }
        }

        const converted = ErrorX.toErrorX(apiError)

        expect(converted.message).toBe('Session expired.')
        expect(converted.name).toBe('SessionError')
        expect(converted.code).toBe('SESSION_EXPIRED')
        expect(converted.handlingOptions).toEqual(apiError.handlingOptions)
        expect(converted.metadata.originalError).toBe(apiError)
      })

      it('should extract from alternative property names', () => {
        const testCases = [
          { title: 'Custom Title', details: 'Detailed message' },
          { error: 'Error message', text: 'Text message' },
          { info: 'Info message', errorMessage: 'Error message prop' },
          { userMessage: 'User friendly message' },
        ]

        for (const errorObj of testCases) {
          const converted = ErrorX.toErrorX(errorObj)
          expect(converted.message).toBeTruthy()
          expect(converted.metadata.originalError).toBe(errorObj)
        }
      })

      it('should handle empty objects', () => {
        const converted = ErrorX.toErrorX({})
        expect(converted.message).toBe('Unknown error occurred.')
      })

      it('should handle null and undefined', () => {
        const convertedNull = ErrorX.toErrorX(null)
        const convertedUndefined = ErrorX.toErrorX(undefined)

        expect(convertedNull.message).toBe('Unknown error occurred.')
        expect(convertedUndefined.message).toBe('Unknown error occurred.')
      })
    })

    describe('processStack', () => {
      it('should process stack with delimiter', () => {
        const error = new Error('test error')
        error.stack =
          'Error: test error\n    at function1 (file1.js:10:5)\n    at delimiter-function (delim.js:5:1)\n    at function2 (file2.js:15:3)'

        const processed = ErrorX.processStack(error, 'delimiter-function')

        expect(processed).toBe('    at function2 (file2.js:15:3)')
      })

      it('should return original stack if delimiter not found', () => {
        const error = new Error('test error')
        error.stack = 'Error: test error\n    at function1 (file1.js:10:5)'

        const processed = ErrorX.processStack(error, 'nonexistent')

        expect(processed).toBe(error.stack)
      })
    })
  })

  describe('Instance Methods', () => {
    describe('withMetadata', () => {
      it('should add metadata to existing error', () => {
        const original = new ErrorX({
          message: 'test',
          metadata: { existing: 'data' },
        })

        const updated = original.withMetadata({
          additional: 'metadata',
          userId: 123,
        })

        expect(updated.metadata).toEqual({
          existing: 'data',
          additional: 'metadata',
          userId: 123,
        })
        expect(updated).not.toBe(original)
        expect(updated.message).toBe(original.message)
        expect(updated.name).toBe(original.name)
        expect(updated.code).toBe(original.code)
      })

      it('should override existing metadata properties', () => {
        const original = new ErrorX({
          message: 'test',
          metadata: { key: 'original', other: 'data' },
        })

        const updated = original.withMetadata({ key: 'updated' })

        expect(updated.metadata).toEqual({
          key: 'updated',
          other: 'data',
        })
      })

      it('should preserve stack trace', () => {
        const original = new ErrorX({ message: 'test' })
        const originalStack = original.stack

        const updated = original.withMetadata({ additional: 'data' })

        expect(updated.stack).toBe(originalStack)
      })
    })

    describe('cleanStackTrace', () => {
      it('should clean stack trace with delimiter', () => {
        const error = new ErrorX({ message: 'test' })
        error.stack =
          'Error: test\n    at function1 (file1.js:10:5)\n    at my-app-delimiter (delim.js:5:1)\n    at function2 (file2.js:15:3)'

        const cleaned = error.cleanStackTrace('my-app-delimiter')

        expect(cleaned.stack).toBe('    at function2 (file2.js:15:3)')
        expect(cleaned).not.toBe(error)
      })

      it('should return same error if no delimiter provided', () => {
        const error = new ErrorX({ message: 'test' })
        const result = error.cleanStackTrace()

        expect(result).toBe(error)
      })

      it('should return same error if no stack available', () => {
        const error = new ErrorX({ message: 'test' })
        error.stack = undefined

        const result = error.cleanStackTrace('delimiter')

        expect(result).toBe(error)
      })
    })
  })

  describe('Serialization', () => {
    describe('toString', () => {
      it('should format basic error', () => {
        const error = new ErrorX({
          message: 'test error',
          name: 'TestError',
          code: 'TEST_CODE',
        })

        const str = error.toString()

        expect(str).toContain('TestError: Test error.')
        expect(str).toContain('[TEST_CODE]')
        expect(str).toContain('(2024-01-15T10:30:45.123Z)')
      })

      it('should omit default error code', () => {
        const error = new ErrorX({
          message: 'test error',
          code: 'ERROR',
        })

        const str = error.toString()

        expect(str).not.toContain('[ERROR]')
        expect(str).toContain('Error: Test error.')
      })

      it('should include metadata', () => {
        const error = new ErrorX({
          message: 'test error',
          metadata: { userId: 123, action: 'login' },
        })

        const str = error.toString()

        expect(str).toContain('metadata: {"userId":123,"action":"login"}')
      })

      it('should include stack trace', () => {
        const error = new ErrorX({ message: 'test error' })
        error.stack = 'Error: test error\n    at someFunction (file.js:10:5)'

        const str = error.toString()

        expect(str).toContain('Error: test error\n    at someFunction (file.js:10:5)')
      })
    })

    describe('toJSON', () => {
      it('should serialize basic error', () => {
        const error = new ErrorX({
          message: 'test error',
          name: 'TestError',
          code: 'TEST_CODE',
          uiMessage: 'User message',
          metadata: { key: 'value' },
        })

        const json = error.toJSON()

        expect(json).toEqual({
          name: 'TestError',
          message: 'Test error.',
          code: 'TEST_CODE',
          uiMessage: 'User message',
          metadata: { key: 'value' },
          timestamp: '2024-01-15T10:30:45.123Z',
          stack: error.stack,
        })
      })

      it('should serialize error chain with ErrorX cause', () => {
        const rootCause = new ErrorX({
          message: 'root cause',
          code: 'ROOT_CAUSE',
        })

        const error = new ErrorX({
          message: 'wrapped error',
          cause: rootCause,
        })

        const json = error.toJSON()

        expect(json.cause).toBeDefined()
        expect(json.cause?.message).toBe('Root cause.')
        expect(json.cause?.code).toBe('ROOT_CAUSE')
      })

      it('should serialize error chain with regular Error cause', () => {
        const rootCause = new Error('original error')
        rootCause.name = 'OriginalError'

        const error = new ErrorX({
          message: 'wrapped error',
          cause: rootCause,
        })

        const json = error.toJSON()

        expect(json.cause).toBeDefined()
        expect(json.cause?.name).toBe('OriginalError')
        expect(json.cause?.message).toBe('original error')
        expect(json.cause?.code).toBe('ERROR')
      })

      it('should handle missing stack', () => {
        const error = new ErrorX({ message: 'test' })
        error.stack = undefined

        const json = error.toJSON()

        expect(json.stack).toBeUndefined()
      })

      it('should serialize error with handlingOptions', () => {
        const handlingOptions: ErrorHandlingOptions = {
          logout: true,
          redirect: '/dashboard',
          ui_mode: ErrorUIMode.BANNER
        }

        const error = new ErrorX({
          message: 'Permission denied',
          name: 'PermissionError',
          code: 'PERMISSION_DENIED',
          handlingOptions
        })

        const json = error.toJSON()

        expect(json.handlingOptions).toEqual(handlingOptions)
        expect(json.name).toBe('PermissionError')
        expect(json.code).toBe('PERMISSION_DENIED')
      })

      it('should not include handlingOptions in serialization if empty', () => {
        const error = new ErrorX({
          message: 'Simple error',
          code: 'SIMPLE'
        })

        const json = error.toJSON()

        expect(json.handlingOptions).toBeUndefined()
      })
    })

    describe('fromJSON', () => {
      it('should deserialize basic error', () => {
        const serialized: SerializableError = {
          name: 'TestError',
          message: 'Test error.',
          code: 'TEST_CODE',
          uiMessage: 'User message',
          metadata: { key: 'value' },
          timestamp: '2024-01-15T10:30:45.123Z',
          stack: 'Error: Test error.\n    at someFunction (file.js:10:5)',
        }

        const error = ErrorX.fromJSON(serialized)

        expect(error.name).toBe('TestError')
        expect(error.message).toBe('Test error.')
        expect(error.code).toBe('TEST_CODE')
        expect(error.uiMessage).toBe('User message')
        expect(error.metadata).toEqual({ key: 'value' })
        expect(error.timestamp).toEqual(new Date('2024-01-15T10:30:45.123Z'))
        expect(error.stack).toBe('Error: Test error.\n    at someFunction (file.js:10:5)')
      })

      it('should deserialize error chain', () => {
        const serialized: SerializableError = {
          name: 'WrapperError',
          message: 'Wrapped error.',
          code: 'WRAPPER',
          uiMessage: 'Something went wrong. Please try again.',
          metadata: {},
          timestamp: '2024-01-15T10:30:45.123Z',
          cause: {
            name: 'RootError',
            message: 'Root cause.',
            code: 'ROOT',
            uiMessage: 'Something went wrong. Please try again.',
            metadata: {},
            timestamp: '2024-01-15T10:30:45.123Z',
          },
        }

        const error = ErrorX.fromJSON(serialized)

        expect(error.name).toBe('WrapperError')
        expect(error.cause).toBeInstanceOf(ErrorX)
        expect((error.cause as ErrorX).name).toBe('RootError')
        expect((error.cause as ErrorX).code).toBe('ROOT')
      })

      it('should handle missing optional properties', () => {
        const serialized: SerializableError = {
          name: 'TestError',
          message: 'Test error.',
          code: 'TEST_CODE',
          uiMessage: 'User message',
          metadata: {},
          timestamp: '2024-01-15T10:30:45.123Z',
        }

        const error = ErrorX.fromJSON(serialized)

        // Stack will be generated but since no stack was provided in serialized data, it should be the new error's stack
        expect(error.stack).toBeDefined()
        expect(error.cause).toBeUndefined()
      })

      it('should deserialize error with handlingOptions', () => {
        const handlingOptions: ErrorHandlingOptions = {
          logout: false,
          redirect: '/error',
          ui_mode: ErrorUIMode.INLINE
        }

        const serialized: SerializableError = {
          name: 'HandlingOptionsError',
          message: 'Error with handlingOptions.',
          code: 'HANDLING_OPTIONS_ERROR',
          uiMessage: 'Something went wrong',
          metadata: {},
          timestamp: '2024-01-15T10:30:45.123Z',
          handlingOptions
        }

        const error = ErrorX.fromJSON(serialized)

        expect(error.name).toBe('HandlingOptionsError')
        expect(error.message).toBe('Error with handlingOptions.')
        expect(error.code).toBe('HANDLING_OPTIONS_ERROR')
        expect(error.handlingOptions).toEqual(handlingOptions)
      })
    })

    describe('JSON round trip', () => {
      it('should preserve all data through serialization cycle', () => {
        const rootCause = new ErrorX({
          message: 'root cause',
          name: 'RootError',
          code: 'ROOT_CAUSE',
          metadata: { rootData: 'value' },
        })

        const original = new ErrorX({
          message: 'wrapper error',
          name: 'WrapperError',
          code: 'WRAPPER',
          uiMessage: 'Custom UI message',
          cause: rootCause,
          metadata: { userId: 123, action: 'test' },
        })

        const serialized = original.toJSON()
        const deserialized = ErrorX.fromJSON(serialized)

        expect(deserialized.name).toBe(original.name)
        expect(deserialized.message).toBe(original.message)
        expect(deserialized.code).toBe(original.code)
        expect(deserialized.uiMessage).toBe(original.uiMessage)
        expect(deserialized.metadata).toEqual(original.metadata)
        expect(deserialized.timestamp).toEqual(original.timestamp)

        expect(deserialized.cause).toBeInstanceOf(ErrorX)
        const deserializedCause = deserialized.cause as ErrorX
        expect(deserializedCause.name).toBe(rootCause.name)
        expect(deserializedCause.message).toBe(rootCause.message)
        expect(deserializedCause.code).toBe(rootCause.code)
        expect(deserializedCause.metadata).toEqual(rootCause.metadata)
      })
    })
  })

  describe('Edge Cases', () => {
    it('should handle very long messages', () => {
      const longMessage = 'a'.repeat(10000)
      const error = new ErrorX({ message: longMessage })

      expect(error.message.charAt(0)).toBe('A') // First char capitalized
      expect(error.message.slice(1, 10000)).toBe('a'.repeat(9999)) // Rest lowercase
      expect(error.message.endsWith('.')).toBe(true)
    })

    it('should handle unicode characters', () => {
      const unicodeMessage = 'Error with émojis 🚀 and spëciàl characters'
      const error = new ErrorX({ message: unicodeMessage })

      expect(error.message).toBe('Error with émojis 🚀 and spëciàl characters.')
    })

    it('should handle very large metadata objects', () => {
      const largeMetadata: ErrorMetadata = {}
      for (let i = 0; i < 1000; i++) {
        largeMetadata[`key${i}`] = `value${i}`
      }

      const error = new ErrorX({
        message: 'test',
        metadata: largeMetadata,
      })

      expect(Object.keys(error.metadata)).toHaveLength(1000)
      expect(error.metadata.key999).toBe('value999')
    })

    it('should handle circular references in metadata', () => {
      const circularObj: any = { a: 1 }
      circularObj.self = circularObj

      const error = new ErrorX({
        message: 'test',
        metadata: { circular: circularObj },
      })

      // Should not throw when creating
      expect(error.metadata.circular).toBe(circularObj)

      // toString should handle circular references gracefully
      expect(() => error.toString()).not.toThrow()
    })

    it('should handle deep error chains', () => {
      let currentError: ErrorX | Error = new Error('Root error')

      // Create a chain of 10 wrapped errors
      for (let i = 0; i < 10; i++) {
        currentError = new ErrorX({
          message: `Level ${i} error`,
          code: `LEVEL_${i}`,
          cause: currentError,
        })
      }

      expect(currentError).toBeInstanceOf(ErrorX)

      // Should be able to serialize deep chains
      const serialized = (currentError as ErrorX).toJSON()
      expect(serialized.cause).toBeDefined()

      // Should be able to deserialize
      const deserialized = ErrorX.fromJSON(serialized)
      expect(deserialized.message).toBe('Level 9 error.')
    })

    it('should handle null prototype objects', () => {
      const nullProtoError = Object.create(null)
      nullProtoError.message = 'null proto error'
      nullProtoError.code = 'NULL_PROTO'

      const converted = ErrorX.toErrorX(nullProtoError)

      expect(converted.message).toBe('Null proto error.')
      expect(converted.code).toBe('NULL_PROTO')
    })
  })

  describe('Performance', () => {
    it('should handle rapid error creation', () => {
      const start = Date.now()
      const errors: ErrorX[] = []

      for (let i = 0; i < 1000; i++) {
        errors.push(
          new ErrorX({
            message: `Error ${i}`,
            metadata: { index: i },
          })
        )
      }

      const duration = Date.now() - start
      expect(duration).toBeLessThan(1000) // Should create 1000 errors in less than 1 second
      expect(errors).toHaveLength(1000)
    })

    it('should handle rapid serialization', () => {
      const error = new ErrorX({
        message: 'Test error',
        metadata: { data: 'value' },
      })

      const start = Date.now()

      for (let i = 0; i < 1000; i++) {
        error.toJSON()
      }

      const duration = Date.now() - start
      expect(duration).toBeLessThan(1000) // Should serialize 1000 times in less than 1 second
    })
  })
})
