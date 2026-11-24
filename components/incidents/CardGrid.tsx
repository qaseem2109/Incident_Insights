"use client";

import React from "react";
import { AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, SearchX } from "lucide-react";
import { Incident } from "@/lib/client/types";
import { IncidentCard } from "./IncidentCard";
import { CardGridSkeleton } from "./Skeletons";

interface CardGridProps {
  incidents: Incident[];
  loading: boolean;
  page: number;
  pages: number;
  onPageChange: (page: number) => void;
  onSelectIncident: (incident: Incident) => void;
  onClearFilters: () => void;
  highlightedId?: number | null;
}

export function CardGrid({
  incidents,
  loading,
  page,
  pages,
  onPageChange,
  onSelectIncident,
  onClearFilters,
  highlightedId,
}: CardGridProps) {
  if (loading && incidents.length === 0) {
    return <CardGridSkeleton count={8} />;
  }

  if (!loading && incidents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-6 py-16 text-center">
        <SearchX className="h-10 w-10 text-slate-400 mb-3" />
        <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
          No incidents match these filters
        </h3>
        <p className="mt-1 max-w-md text-sm text-slate-500 dark:text-slate-400">
          Try widening the year or date range, or clear active filters to view all recorded incidents.
        </p>
        <button
          type="button"
          onClick={onClearFilters}
          className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
        >
          Clear filters
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
        <AnimatePresence mode="popLayout">
          {incidents.map((incident) => (
            <IncidentCard
              key={incident.id}
              incident={incident}
              highlighted={highlightedId === incident.id}
              onSelect={onSelectIncident}
            />
          ))}
        </AnimatePresence>
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-between rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-2.5 text-sm">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Page <strong className="text-slate-800 dark:text-slate-200">{page}</strong> of{" "}
            <strong className="text-slate-800 dark:text-slate-200">{pages}</strong>
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
              aria-label="Previous page"
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-800 px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              <span>Previous</span>
            </button>
            <button
              type="button"
              disabled={page >= pages}
              onClick={() => onPageChange(page + 1)}
              aria-label="Next page"
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-800 px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            >
              <span>Next</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
