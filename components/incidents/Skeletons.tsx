import React from "react";

export function CardGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className="relative overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 pl-5 space-y-3"
        >
          <div className="absolute inset-y-0 left-0 w-1.5 bg-slate-200 dark:bg-slate-800" />
          <div className="flex items-center justify-between">
            <div className="h-5 w-16 rounded bg-slate-200 dark:bg-slate-800 animate-pulse" />
            <div className="h-4 w-24 rounded bg-slate-100 dark:bg-slate-800/70 animate-pulse" />
          </div>
          <div className="space-y-1.5">
            <div className="h-5 w-3/4 rounded bg-slate-200 dark:bg-slate-800 animate-pulse" />
            <div className="h-3.5 w-1/2 rounded bg-slate-100 dark:bg-slate-800/70 animate-pulse" />
          </div>
          <div className="space-y-1.5 pt-1">
            <div className="h-3.5 w-full rounded bg-slate-100 dark:bg-slate-800/70 animate-pulse" />
            <div className="h-3.5 w-5/6 rounded bg-slate-100 dark:bg-slate-800/70 animate-pulse" />
          </div>
          <div className="flex items-center gap-2 pt-2">
            <div className="h-6 w-20 rounded-md bg-slate-100 dark:bg-slate-800 animate-pulse" />
            <div className="h-6 w-20 rounded-md bg-slate-100 dark:bg-slate-800 animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}
