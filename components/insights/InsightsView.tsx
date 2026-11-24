"use client";

import React from "react";
import { FilterState, Stats } from "@/lib/client/types";
import { CasualtyTable } from "./CasualtyTable";
import { Charts } from "./Charts";
import { StatTiles } from "./StatTiles";

interface InsightsViewProps {
  stats: Stats | null;
  loading: boolean;
  filters: FilterState;
  onApplyFilter: (patch: Partial<FilterState>) => void;
}

export function InsightsView({
  stats,
  loading,
  filters,
  onApplyFilter,
}: InsightsViewProps) {
  if (loading && !stats) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-24 rounded-xl bg-slate-200/70 dark:bg-slate-800 animate-pulse"
            />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-72 rounded-xl bg-slate-200/70 dark:bg-slate-800 animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="space-y-5">
      <StatTiles stats={stats} />
      <Charts stats={stats} filters={filters} onApplyFilter={onApplyFilter} />
      <CasualtyTable rows={stats.yearlyCasualties} />
    </div>
  );
}
