"use client";

import React, { useState } from "react";
import { ChevronDown, ChevronUp, Layers, Tag } from "lucide-react";
import clsx from "clsx";
import { getHeadColor } from "@/lib/client/colors";
import { formatNumber } from "@/lib/client/format";

export interface LegendEntry {
  head: string;
  count: number;
}

interface MapLegendProps {
  entries: LegendEntry[];
  hiddenHeads: Set<string>;
  onToggleHead: (head: string) => void;
  onShowAllHeads: () => void;
  clustering: boolean;
  onToggleClustering: () => void;
  showLabels: boolean;
  onToggleLabels: () => void;
}

export function MapLegend({
  entries,
  hiddenHeads,
  onToggleHead,
  onShowAllHeads,
  clustering,
  onToggleClustering,
  showLabels,
  onToggleLabels,
}: MapLegendProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="absolute bottom-4 left-4 z-[500] w-64 max-w-[calc(100vw-2rem)] rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm shadow-lg text-xs">
      {/* Controls bar */}
      <div className="flex items-center justify-between gap-1.5 border-b border-slate-200/80 dark:border-slate-800 px-3 py-2">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onToggleClustering}
            aria-pressed={clustering}
            className={clsx(
              "inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-medium transition-colors",
              clustering
                ? "border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-800 dark:bg-indigo-950 dark:text-indigo-300"
                : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
            )}
          >
            <Layers className="h-3 w-3" />
            <span>Cluster</span>
          </button>
          <button
            type="button"
            onClick={onToggleLabels}
            aria-pressed={showLabels}
            className={clsx(
              "inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-medium transition-colors",
              showLabels
                ? "border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-800 dark:bg-indigo-950 dark:text-indigo-300"
                : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
            )}
          >
            <Tag className="h-3 w-3" />
            <span>Districts</span>
          </button>
        </div>

        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          aria-label={collapsed ? "Expand legend" : "Collapse legend"}
          className="rounded p-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          {collapsed ? (
            <ChevronUp className="h-3.5 w-3.5" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5" />
          )}
        </button>
      </div>

      {/* Legend list */}
      {!collapsed && (
        <div className="p-2.5 space-y-1.5">
          <div className="flex items-center justify-between px-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Head of Crime (click to toggle)
            </span>
            {hiddenHeads.size > 0 && (
              <button
                type="button"
                onClick={onShowAllHeads}
                className="text-[11px] font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                Show all
              </button>
            )}
          </div>

          <div className="max-h-48 overflow-y-auto space-y-0.5 pr-1">
            {entries.length === 0 ? (
              <p className="px-1 py-2 text-slate-400">No active markers</p>
            ) : (
              entries.map((entry) => {
                const hidden = hiddenHeads.has(entry.head);
                const color = getHeadColor(entry.head);
                return (
                  <button
                    key={entry.head}
                    type="button"
                    aria-pressed={!hidden}
                    onClick={() => onToggleHead(entry.head)}
                    className={clsx(
                      "flex w-full items-center justify-between gap-2 rounded-md px-1.5 py-1 text-left transition-opacity hover:bg-slate-100 dark:hover:bg-slate-800/70",
                      hidden && "opacity-40 line-through"
                    )}
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <span
                        className="h-2.5 w-2.5 rounded-full shrink-0 border border-white/60 shadow-2xs"
                        style={{ backgroundColor: color }}
                      />
                      <span className="truncate text-slate-700 dark:text-slate-200">
                        {entry.head}
                      </span>
                    </span>
                    <span className="shrink-0 text-[11px] text-slate-400 tabular-nums">
                      {formatNumber(entry.count)}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
