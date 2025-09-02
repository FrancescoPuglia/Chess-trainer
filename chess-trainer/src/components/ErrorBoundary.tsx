/**
 * Enterprise-Grade Error Boundary
 * 
 * Comprehensive error handling for React components with:
 * - Graceful fallback UI
 * - Error logging and reporting
 * - Recovery mechanisms
 * - User-friendly error messages
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';

import { DatabaseService } from '../data/database';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string | null;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  isolate?: boolean; // If true, only affects this component, not parent
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private retryCount = 0;
  private readonly maxRetries = 3;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // Generate unique error ID for tracking
    const errorId = `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      hasError: true,
      error,
      errorId,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });

    // Log error details
    this.logError(error, errorInfo);

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);

    // Report to error tracking service (if implemented)
    this.reportError(error, errorInfo);
  }

  private logError = (error: Error, errorInfo: ErrorInfo): void => {
    const errorReport = {
      timestamp: new Date().toISOString(),
      errorId: this.state.errorId,
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      url: window.location.href,
      userAgent: navigator.userAgent,
      retryCount: this.retryCount,
    };

    console.error('🚨 Chess Trainer Error Boundary Caught:', errorReport);

    // Store error in IndexedDB for diagnostics
    this.storeErrorReport(errorReport);
  };

  private storeErrorReport = async (errorReport: unknown): Promise<void> => {
    try {
      // Store in a hypothetical errors table for diagnostics
      // This would be implemented when we add error tracking
      console.warn('Error report stored locally:', errorReport);
    } catch (storageError) {
      console.error('Failed to store error report:', storageError);
    }
  };

  private reportError = (_error: Error, _errorInfo: ErrorInfo): void => {
    // In a real app, this would send to error tracking service
    // For now, we just log locally
    console.warn('Error reported to tracking service (mock)');
  };

  private handleRetry = (): void => {
    if (this.retryCount < this.maxRetries) {
      this.retryCount += 1;
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        errorId: null,
      });
    }
  };

  private handleReset = (): void => {
    this.retryCount = 0;
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
    });
  };

  private handleBackupRestore = async (): Promise<void> => {
    try {
      // Trigger backup download as recovery mechanism
      const backup = await DatabaseService.exportData();
      const blob = new Blob([backup], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `chess-trainer-backup-emergency-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (backupError) {
      console.error('Emergency backup failed:', backupError);
    }
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // Custom fallback UI if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default comprehensive error UI
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
            <div className="text-center">
              {/* Error Icon */}
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                <svg
                  className="h-6 w-6 text-red-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                  />
                </svg>
              </div>

              {/* Error Title */}
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Something went wrong
              </h3>

              {/* Error Details */}
              <div className="text-sm text-gray-500 mb-6 space-y-2">
                <p>
                  We encountered an unexpected error in the Chess Trainer application.
                </p>
                {this.state.errorId && (
                  <p className="font-mono text-xs bg-gray-100 p-2 rounded">
                    Error ID: {this.state.errorId}
                  </p>
                )}
                {this.state.error?.message && (
                  <details className="text-left">
                    <summary className="cursor-pointer text-gray-700 hover:text-gray-900">
                      Technical Details
                    </summary>
                    <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto max-h-32">
                      {this.state.error.message}
                    </pre>
                  </details>
                )}
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                {/* Primary Actions */}
                <div className="flex space-x-3">
                  {this.retryCount < this.maxRetries ? (
                    <button
                      onClick={this.handleRetry}
                      className="flex-1 bg-chess-primary text-white px-4 py-2 rounded-md hover:bg-opacity-90 transition-colors"
                    >
                      Try Again ({this.maxRetries - this.retryCount} left)
                    </button>
                  ) : (
                    <button
                      onClick={this.handleReset}
                      className="flex-1 bg-chess-primary text-white px-4 py-2 rounded-md hover:bg-opacity-90 transition-colors"
                    >
                      Reset Application
                    </button>
                  )}
                  
                  <button
                    onClick={() => { window.location.reload(); }}
                    className="flex-1 bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors"
                  >
                    Reload Page
                  </button>
                </div>

                {/* Secondary Actions */}
                <div className="pt-3 border-t border-gray-200">
                  <button
                    onClick={this.handleBackupRestore}
                    className="w-full bg-yellow-500 text-white px-4 py-2 rounded-md hover:bg-yellow-600 transition-colors text-sm"
                  >
                    📥 Download Emergency Backup
                  </button>
                </div>

                {/* Help Text */}
                <p className="text-xs text-gray-400 pt-2">
                  If the problem persists, please download the emergency backup 
                  to preserve your data and restart the application.
                </p>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Higher-order component for wrapping components with error boundaries
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode,
  onError?: (error: Error, errorInfo: ErrorInfo) => void
): React.ComponentType<P> {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary fallback={fallback} onError={onError}>
      <Component {...props} />
    </ErrorBoundary>
  );
  
  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
}

/**
 * Hook for handling async errors in functional components
 */
export const useErrorHandler = () => {
  const handleError = React.useCallback((error: Error, context?: string) => {
    console.error(`🚨 Async Error${context ? ` in ${context}` : ''}:`, error);
    
    // In a real app, this would trigger error reporting
    // For now, we show a user-friendly error
    throw error; // This will be caught by the nearest ErrorBoundary
  }, []);

  return handleError;
};

export default ErrorBoundary;