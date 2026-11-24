"use client";

import React from "react";
import { Stats } from "@/lib/client/types";
import { AnimatedCounter } from "@/components/ui/AnimatedCounter";

interface StatTilesProps {
  stats: Stats;
}

export function StatTiles({ stats }: StatTilesProps) {
  const { totals } = stats;

  const tiles = [
    {
      label: "Total Incidents",
      value: totals.incidents,
      prefix: "",
      note: "Matching active filters",
      accent: "text-slate-900 dark:text-slate-100",
    },
    {
      label: "Major Cases",
      value: totals.major,
      prefix: "",
      note: "High-severity incidents",
      accent: "text-red-600 dark:text-red-400",
    },
    {
      label: "Other Cases",
      value: totals.other,
      prefix: "",
      note: "Standard category",
      accent: "text-indigo-600 dark:text-indigo-400",
    },
    {
      label: "Killed ≥",
      value: totals.killed_est,
      prefix: "≥ ",
      note: "Estimated from names listed",
      accent: "text-slate-900 dark:text-slate-100",
    },
    {
      label: "Injured ≥",
      value: totals.injured_est,
      prefix: "≥ ",
      note: "Estimated from names listed",
      accent: "text-slate-900 dark:text-slate-100",
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
      {tiles.map((tile) => (
        <div
          key={tile.label}
          className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-2xs"
        >
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
            {tile.label}
          </div>
          <div
            className={`mt-1.5 text-2xl font-bold tracking-tight tabular-nums ${tile.accent}`}
          >
            <AnimatedCounter value={tile.value} prefix={tile.prefix} />
          </div>
          <div className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
            {tile.note}
          </div>
        </div>
      ))}
    </div>
  );
}
