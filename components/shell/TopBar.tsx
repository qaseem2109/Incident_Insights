"use client";

import React from "react";
import {
  FileSpreadsheet,
  Filter,
  Plus,
  Search,
  ShieldAlert,
  X,
} from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";

interface TopBarProps {
  searchInput: string;
  onSearchChange: (val: string) => void;
  onOpenAdd: () => void;
  onOpenExport: () => void;
  onOpenMobileFilters: () => void;
  activeFilterCount: number;
}

export function TopBar({
  searchInput,
  onSearchChange,
  onOpenAdd,
  onOpenExport,
  onOpenMobileFilters,
  activeFilterCount,
}: TopBarProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-950/95 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-[1600px] items-center justify-between gap-3 px-4 lg:px-6">
        {/* Brand */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-sm">
            <ShieldAlert className="h-4 w-4" />
          </div>
          <div className="leading-tight">
            <h1 className="text-sm sm:text-base font-semibold tracking-tight text-slate-900 dark:text-slate-100">
              Sindh Incidents
            </h1>
            <p className="hidden md:block text-[11px] text-slate-500 dark:text-slate-400">
              Incident Analysis &amp; Case Registry
            </p>
          </div>
        </div>

        {/* Global Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="search"
            value={searchInput}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search place, details, names, FIR, accused..."
            aria-label="Search incidents"
            className="h-9 w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 pl-9 pr-8 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition"
          />
          {searchInput && (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onOpenMobileFilters}
            aria-label="Open filters"
            className="lg:hidden inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-2.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            <Filter className="h-3.5 w-3.5" />
            <span>Filters</span>
            {activeFilterCount > 0 && (
              <span className="rounded-full bg-indigo-600 px-1.5 py-0.2 text-[10px] font-semibold text-white">
                {activeFilterCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={onOpenExport}
            aria-label="Export to Excel"
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <span className="hidden sm:inline">Export</span>
          </button>

          <button
            type="button"
            onClick={onOpenAdd}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-indigo-600 px-3 text-xs sm:text-sm font-medium text-white shadow-sm hover:bg-indigo-700 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Add incident</span>
            <span className="sm:hidden">Add</span>
          </button>

          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
