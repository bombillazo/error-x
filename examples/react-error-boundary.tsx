/**
 * React Error Boundary Integration Example
 *
 * This example shows how to integrate error-x with React error boundaries
 * for consistent error handling in React applications.
 *
 * @example
 * ```bash
 * pnpm add react react-dom @bombillazo/error-x
 * pnpm add -D @types/react @types/react-dom
 * ```
 */

import React, { Component, createContext, useContext, useCallback, useState } from 'react'
import type { ReactNode, ErrorInfo } from 'react'
import {
  ErrorX,
  HTTPErrorX,
  httpErrorUiMessages,
  toLogEntry,
  generateFingerprint,
  type ErrorXSerialized,
} from '@bombillazo/error-x'

// ============================================================================
// Types
// ============================================================================

type ErrorBoundaryProps = {
  children: ReactNode
  /** Custom fallback UI component */
  fallback?: React.ComponentType<ErrorFallbackProps>
  /** Called when an error is caught */
  onError?: (error: ErrorX, errorInfo: ErrorInfo) => void
  /** Called when user clicks retry */
  onRetry?: () => void
  /** Show detailed error info (default: false in production) */
  showDetails?: boolean
}

type ErrorBoundaryState = {
  error: ErrorX | null
  errorInfo: ErrorInfo | null
}

type ErrorFallbackProps = {
  error: ErrorX
  errorInfo: ErrorInfo | null
  resetError: () => void
  showDetails: boolean
}

type ErrorContextValue = {
  /** Report a caught error to the error boundary */
  reportError: (error: unknown) => void
  /** Clear the current error state */
  clearError: () => void
  /** Current error if any */
  error: ErrorX | null
}

// ============================================================================
// Error Context
// ============================================================================

const ErrorContext = createContext<ErrorContextValue | null>(null)

/**
 * Hook to access error boundary context.
 * Allows components to report errors imperatively.
 *
 * @example
 * ```tsx
 * const MyComponent = () => {
 *   const { reportError } = useErrorBoundary()
 *
 *   const handleClick = async () => {
 *     try {
 *       await riskyOperation()
 *     } catch (err) {
 *       reportError(err)
 *     }
 *   }
 *
 *   return <button onClick={handleClick}>Do Something</button>
 * }
 * ```
 */
export const useErrorBoundary = (): ErrorContextValue => {
  const context = useContext(ErrorContext)
  if (!context) {
    throw new Error('useErrorBoundary must be used within an ErrorBoundaryProvider')
  }
  return context
}

// ============================================================================
// Error Boundary Component
// ============================================================================

/**
 * React Error Boundary that converts all errors to ErrorX.
 *
 * @example
 * ```tsx
 * <ErrorBoundary
 *   onError={(error, info) => {
 *     // Send to error tracking service
 *     trackError(error, info)
 *   }}
 *   fallback={CustomErrorUI}
 * >
 *   <App />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    error: null,
    errorInfo: null,
  }

  static getDerivedStateFromError(err: unknown): Partial<ErrorBoundaryState> {
    // Convert to ErrorX for consistent handling
    const error = ErrorX.isErrorX(err)
      ? err
      : ErrorX.from(err, { name: 'ReactError', code: 'REACT_ERROR' })

    return { error }
  }

  componentDidCatch(err: unknown, errorInfo: ErrorInfo): void {
    const error = this.state.error ?? ErrorX.from(err)

    // Update state with error info
    this.setState({ errorInfo })

    // Call custom error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }

    // Log error with context
    const logEntry = toLogEntry(error, {
      includeStack: true,
      context: {
        componentStack: errorInfo.componentStack,
        fingerprint: generateFingerprint(error),
      },
    })
    console.error('[ErrorBoundary]', logEntry)
  }

  resetError = (): void => {
    this.setState({ error: null, errorInfo: null })
    this.props.onRetry?.()
  }

  render(): ReactNode {
    const { error, errorInfo } = this.state
    const { children, fallback: Fallback, showDetails = process.env.NODE_ENV !== 'production' } = this.props

    if (error) {
      if (Fallback) {
        return (
          <Fallback
            error={error}
            errorInfo={errorInfo}
            resetError={this.resetError}
            showDetails={showDetails}
          />
        )
      }

      return (
        <DefaultErrorFallback
          error={error}
          errorInfo={errorInfo}
          resetError={this.resetError}
          showDetails={showDetails}
        />
      )
    }

    return (
      <ErrorContext.Provider
        value={{
          reportError: (err) => {
            const error = ErrorX.from(err)
            this.setState({ error, errorInfo: null })
          },
          clearError: this.resetError,
          error: this.state.error,
        }}
      >
        {children}
      </ErrorContext.Provider>
    )
  }
}

// ============================================================================
// Default Fallback UI
// ============================================================================

/**
 * Default error fallback component with sensible styling.
 */
const DefaultErrorFallback: React.FC<ErrorFallbackProps> = ({
  error,
  errorInfo,
  resetError,
  showDetails,
}) => {
  const [showStack, setShowStack] = useState(false)

  // Get user-friendly message if it's an HTTP error
  const userMessage = error.httpStatus
    ? httpErrorUiMessages[error.httpStatus as keyof typeof httpErrorUiMessages]
    : undefined

  return (
    <div style={styles.container}>
      <div style={styles.content}>
        <h1 style={styles.title}>Something went wrong</h1>

        <p style={styles.message}>
          {userMessage ?? error.message}
        </p>

        {error.code && (
          <p style={styles.code}>
            Error Code: <code>{error.code}</code>
          </p>
        )}

        <div style={styles.actions}>
          <button onClick={resetError} style={styles.primaryButton}>
            Try Again
          </button>
          <button onClick={() => window.location.reload()} style={styles.secondaryButton}>
            Reload Page
          </button>
        </div>

        {showDetails && (
          <div style={styles.details}>
            <button
              onClick={() => setShowStack(!showStack)}
              style={styles.toggleButton}
            >
              {showStack ? 'Hide' : 'Show'} Technical Details
            </button>

            {showStack && (
              <pre style={styles.stack}>
                <strong>Error:</strong> {error.name}: {error.message}
                {'\n\n'}
                <strong>Code:</strong> {error.code}
                {'\n'}
                <strong>Timestamp:</strong> {new Date(error.timestamp).toISOString()}
                {error.httpStatus && (
                  <>
                    {'\n'}
                    <strong>HTTP Status:</strong> {error.httpStatus}
                  </>
                )}
                {error.metadata && (
                  <>
                    {'\n\n'}
                    <strong>Metadata:</strong>
                    {'\n'}
                    {JSON.stringify(error.metadata, null, 2)}
                  </>
                )}
                {error.stack && (
                  <>
                    {'\n\n'}
                    <strong>Stack Trace:</strong>
                    {'\n'}
                    {error.stack}
                  </>
                )}
                {errorInfo?.componentStack && (
                  <>
                    {'\n\n'}
                    <strong>Component Stack:</strong>
                    {errorInfo.componentStack}
                  </>
                )}
              </pre>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================================================
// Styles
// ============================================================================

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    padding: '2rem',
    backgroundColor: '#f8f9fa',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  content: {
    maxWidth: '600px',
    padding: '2rem',
    backgroundColor: '#fff',
    borderRadius: '8px',
    boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
    textAlign: 'center',
  },
  title: {
    margin: '0 0 1rem',
    color: '#dc3545',
    fontSize: '1.5rem',
  },
  message: {
    margin: '0 0 1rem',
    color: '#333',
    fontSize: '1rem',
    lineHeight: '1.5',
  },
  code: {
    margin: '0 0 1.5rem',
    color: '#666',
    fontSize: '0.875rem',
  },
  actions: {
    display: 'flex',
    gap: '1rem',
    justifyContent: 'center',
    marginBottom: '1.5rem',
  },
  primaryButton: {
    padding: '0.75rem 1.5rem',
    backgroundColor: '#007bff',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '1rem',
  },
  secondaryButton: {
    padding: '0.75rem 1.5rem',
    backgroundColor: '#fff',
    color: '#333',
    border: '1px solid #ccc',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '1rem',
  },
  details: {
    borderTop: '1px solid #eee',
    paddingTop: '1rem',
    textAlign: 'left',
  },
  toggleButton: {
    padding: '0.5rem 1rem',
    backgroundColor: 'transparent',
    color: '#666',
    border: '1px solid #ddd',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.875rem',
  },
  stack: {
    marginTop: '1rem',
    padding: '1rem',
    backgroundColor: '#f8f9fa',
    borderRadius: '4px',
    fontSize: '0.75rem',
    overflow: 'auto',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    textAlign: 'left',
  },
}

// ============================================================================
// Utility Hooks
// ============================================================================

/**
 * Hook for handling async operations with automatic error reporting.
 *
 * @example
 * ```tsx
 * const MyComponent = () => {
 *   const { execute, loading, error } = useAsyncError()
 *
 *   const handleSubmit = () => {
 *     execute(async () => {
 *       await submitForm(data)
 *     })
 *   }
 *
 *   return (
 *     <button onClick={handleSubmit} disabled={loading}>
 *       {loading ? 'Submitting...' : 'Submit'}
 *     </button>
 *   )
 * }
 * ```
 */
export const useAsyncError = () => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<ErrorX | null>(null)

  const execute = useCallback(async <T>(fn: () => Promise<T>): Promise<T | undefined> => {
    setLoading(true)
    setError(null)

    try {
      const result = await fn()
      return result
    } catch (err) {
      const errorX = ErrorX.from(err)
      setError(errorX)
      return undefined
    } finally {
      setLoading(false)
    }
  }, [])

  const clearError = useCallback(() => setError(null), [])

  return { execute, loading, error, clearError }
}

// ============================================================================
// Usage Examples
// ============================================================================

/**
 * ## Complete Usage Example
 *
 * ```tsx
 * import { ErrorBoundary, useErrorBoundary, useAsyncError } from './react-error-boundary'
 * import { ErrorX, HTTPErrorX } from '@bombillazo/error-x'
 *
 * // Custom fallback component
 * const CustomErrorFallback = ({ error, resetError, showDetails }) => (
 *   <div className="error-screen">
 *     <h1>Oops!</h1>
 *     <p>{error.message}</p>
 *     <button onClick={resetError}>Try Again</button>
 *   </div>
 * )
 *
 * // App with error boundary
 * const App = () => (
 *   <ErrorBoundary
 *     fallback={CustomErrorFallback}
 *     onError={(error, info) => {
 *       // Send to Sentry, LogRocket, etc.
 *       errorTracker.capture(error, {
 *         extra: {
 *           componentStack: info.componentStack,
 *           errorCode: error.code,
 *           fingerprint: generateFingerprint(error)
 *         }
 *       })
 *     }}
 *   >
 *     <MainContent />
 *   </ErrorBoundary>
 * )
 *
 * // Component using error boundary hook
 * const DataFetcher = () => {
 *   const { reportError } = useErrorBoundary()
 *   const { execute, loading, error } = useAsyncError()
 *
 *   useEffect(() => {
 *     execute(async () => {
 *       const response = await fetch('/api/data')
 *       if (!response.ok) {
 *         throw HTTPErrorX.create(response.status)
 *       }
 *       return response.json()
 *     })
 *   }, [])
 *
 *   // For critical errors, report to boundary (shows full-page error)
 *   const handleCriticalOperation = async () => {
 *     try {
 *       await criticalOperation()
 *     } catch (err) {
 *       reportError(err)  // Shows error boundary fallback
 *     }
 *   }
 *
 *   // For non-critical errors, handle locally
 *   if (error) {
 *     return <InlineError error={error} />
 *   }
 *
 *   if (loading) return <Spinner />
 *
 *   return <DataDisplay />
 * }
 * ```
 *
 * ## With Error Tracking Services
 *
 * ```tsx
 * import * as Sentry from '@sentry/react'
 *
 * <ErrorBoundary
 *   onError={(error, errorInfo) => {
 *     Sentry.withScope((scope) => {
 *       scope.setExtras({
 *         componentStack: errorInfo.componentStack,
 *         errorCode: error.code,
 *         errorTimestamp: error.timestamp,
 *         metadata: error.metadata,
 *         chain: error.chain.map(e => e.code)
 *       })
 *       Sentry.captureException(error)
 *     })
 *   }}
 * >
 *   <App />
 * </ErrorBoundary>
 * ```
 */

export { ErrorX, HTTPErrorX, generateFingerprint }
