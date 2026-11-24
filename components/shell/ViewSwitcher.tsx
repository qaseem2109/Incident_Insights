"use client";

import React from "react";
import { BarChart3, LayoutGrid, Map as MapIcon, Table as TableIcon } from "lucide-react";
import clsx from "clsx";
import { ViewMode } from "@/lib/client/types";

interface ViewSwitcherProps {
  value: ViewMode;
  onChange: (view: ViewMode) => void;
}

const ITEMS: { id: ViewMode; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "cards", label: "Cards", icon: LayoutGrid },
  { id: "table", label: "Table", icon: TableIcon },
  { id: "map", label: "Map", icon: MapIcon },
  { id: "insights", label: "Insights", icon: BarChart3 },
];

export function ViewSwitcher({ value, onChange }: ViewSwitcherProps) {
  return (
    <div
      role="tablist"
      aria-label="Data view mode"
      className="inline-flex rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100/80 dark:bg-slate-900 p-1"
    >
      {ITEMS.map((item) => {
        const Icon = item.icon;
        const active = value === item.id;
        return (
          <button
            key={item.id}
            role="tab"
            type="button"
            aria-selected={active}
            onClick={() => onChange(item.id)}
            className={clsx(
              "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs sm:text-sm font-medium transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500",
              active
                ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            )}
          >
            <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span>{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}
