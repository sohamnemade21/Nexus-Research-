import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    if (import.meta.env.DEV) {
      console.error('ErrorBoundary caught:', error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center h-screen bg-[#fafafa] dark:bg-[#0f1117]">
          <div className="text-center p-8 max-w-md">
            <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-rose-100 dark:bg-rose-950 flex items-center justify-center">
              <AlertTriangle className="w-7 h-7 text-rose-500" />
            </div>
            <h2 className="text-xl font-bold text-neutral-900 dark:text-white mb-2">
              Something went wrong
            </h2>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-6 leading-relaxed">
              An unexpected error occurred in the application. Please refresh the page to try again.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-sm font-medium transition-colors shadow-md shadow-sky-500/20"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh Page
            </button>
            {import.meta.env.DEV && this.state.error && (
              <pre className="mt-6 p-3 rounded-lg bg-neutral-100 dark:bg-neutral-900 text-xs text-left overflow-auto max-h-40 text-rose-600 dark:text-rose-400 border border-neutral-200 dark:border-neutral-800">
                {this.state.error.toString()}
              </pre>
            )}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
