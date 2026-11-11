import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

export default function ErrorState({ error, onRetry }) {
  if (!error) return null;

  return (
    <div className="w-full max-w-3xl mx-auto my-4 p-4 rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-300 flex items-start justify-between gap-3">
      <div className="flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
        <div>
          <h4 className="text-sm font-semibold">Error retrieving answer</h4>
          <p className="text-xs text-rose-600 dark:text-rose-400 mt-0.5">{error}</p>
        </div>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-rose-100 dark:bg-rose-900/40 hover:bg-rose-200 dark:hover:bg-rose-900/60 transition-colors shrink-0"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Retry
        </button>
      )}
    </div>
  );
}
