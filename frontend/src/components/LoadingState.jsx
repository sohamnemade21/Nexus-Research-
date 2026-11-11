import React from 'react';
import { Layers, Sparkles } from 'lucide-react';

export default function LoadingState() {
  return (
    <div className="w-full max-w-3xl mx-auto py-6 animate-pulse">
      {/* Sources Skeleton */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Layers className="w-4 h-4 text-neutral-300 dark:text-neutral-700" />
          <div className="h-3 w-20 bg-neutral-200 dark:bg-neutral-800 rounded" />
        </div>
        <div className="flex gap-2.5 overflow-hidden">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="min-w-[200px] h-24 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-900/50 p-3 flex flex-col justify-between"
            >
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-neutral-200 dark:bg-neutral-800" />
                <div className="h-3 w-16 bg-neutral-200 dark:bg-neutral-800 rounded" />
              </div>
              <div className="h-3 w-full bg-neutral-200 dark:bg-neutral-800 rounded" />
              <div className="h-2 w-3/4 bg-neutral-200 dark:bg-neutral-800 rounded" />
            </div>
          ))}
        </div>
      </div>

      {/* Answer Skeleton */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-neutral-300 dark:text-neutral-700" />
          <div className="h-3 w-16 bg-neutral-200 dark:bg-neutral-800 rounded" />
        </div>
        <div className="space-y-2.5">
          <div className="h-4 bg-neutral-200 dark:bg-neutral-800 rounded w-full" />
          <div className="h-4 bg-neutral-200 dark:bg-neutral-800 rounded w-5/6" />
          <div className="h-4 bg-neutral-200 dark:bg-neutral-800 rounded w-4/6" />
        </div>
      </div>
    </div>
  );
}
