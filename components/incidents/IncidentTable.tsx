"use client";

import React from "react";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  SearchX,
} from "lucide-react";
import clsx from "clsx";
import { getHeadColor } from "@/lib/client/colors";
import { formatEstimate, formatIncidentDate } from "@/lib/client/format";
import { Incident, SortField, SortOrder } from "@/lib/client/types";
import { CategoryBadge } from "@/components/ui/Badge";

interface IncidentTableProps {
  incidents: Incident[];
  loading: boolean;
  sort: SortField;
  order: SortOrder;
  onSort: (field: SortField) => void;
  page: number;
  pages: number;
  onPageChange: (page: number) => void;
  onSelectIncident: (incident: Incident) => void;
  onClearFilters: () => void;
}

interface ColumnDef {
  label: string;
  sortKey?: SortField;
  align?: "left" | "right";
}

const COLUMNS: ColumnDef[] = [
  { label: "S#", sortKey: "id" },
  { label: "Date", sortKey: "date" },
  { label: "Time" },
  { label: "Category", sortKey: "category" },
  { label: "Head of crime", sortKey: "head" },
  { label: "Target", sortKey: "target" },
  { label: "District", sortKey: "district" },
  { label: "Place" },
  { label: "Killed≥", sortKey: "killed", align: "right" },
  { label: "Injured≥", sortKey: "injured", align: "right" },
  { label: "Claimed by" },
];

export function IncidentTable({
  incidents,
  loading,
  sort,
  order,
  onSort,
  page,
  pages,
  onPageChange,
  onSelectIncident,
  onClearFilters,
}: IncidentTableProps) {
  if (!loading && incidents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-6 py-16 text-center">
        <SearchX className="h-10 w-10 text-slate-400 mb-3" />
        <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
          No incidents match these filters
        </h3>
        <button
          type="button"
          onClick={onClearFilters}
          className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          Clear filters
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs">
        <div className="overflow-x-auto max-h-[72vh]">
          <table className="w-full border-collapse text-left text-xs">
            <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
              <tr>
                {COLUMNS.map((col) => {
                  const isSorted = col.sortKey && sort === col.sortKey;
                  return (
                    <th
                      key={col.label}
                      className={clsx(
                        "whitespace-nowrap px-3 py-2.5",
                        col.align === "right" && "text-right"
                      )}
                    >
                      {col.sortKey ? (
                        <button
                          type="button"
                          onClick={() => onSort(col.sortKey!)}
                          className={clsx(
                            "inline-flex items-center gap-1 hover:text-slate-900 dark:hover:text-slate-100 focus:outline-none",
                            col.align === "right" && "flex-row-reverse"
                          )}
                        >
                          <span>{col.label}</span>
                          {isSorted ? (
                            order === "asc" ? (
                              <ArrowUp className="h-3 w-3 text-indigo-600 dark:text-indigo-400" />
                            ) : (
                              <ArrowDown className="h-3 w-3 text-indigo-600 dark:text-indigo-400" />
                            )
                          ) : (
                            <ArrowUpDown className="h-3 w-3 opacity-35" />
                          )}
                        </button>
                      ) : (
                        col.label
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {loading && incidents.length === 0
                ? Array.from({ length: 10 }).map((_, idx) => (
                    <tr key={idx}>
                      {COLUMNS.map((c) => (
                        <td key={c.label} className="px-3 py-2.5">
                          <div className="h-4 w-full rounded bg-slate-100 dark:bg-slate-800 animate-pulse" />
                        </td>
                      ))}
                    </tr>
                  ))
                : incidents.map((inc) => (
                    <tr
                      key={inc.id}
                      onClick={() => onSelectIncident(inc)}
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          onSelectIncident(inc);
                        }
                      }}
                      className="odd:bg-white even:bg-slate-50/50 dark:odd:bg-slate-900 dark:even:bg-slate-900/50 hover:bg-indigo-50/60 dark:hover:bg-indigo-950/40 cursor-pointer transition-colors focus:outline-none focus-visible:bg-indigo-50 dark:focus-visible:bg-indigo-950"
                    >
                      <td className="whitespace-nowrap px-3 py-2.5 font-mono text-slate-500 dark:text-slate-400">
                        {inc.source_sno ?? inc.id}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 font-medium text-slate-800 dark:text-slate-200 tabular-nums">
                        {formatIncidentDate(inc.incident_date, inc.date_time_raw)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-slate-500 dark:text-slate-400 tabular-nums">
                        {inc.incident_time || "–"}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5">
                        <CategoryBadge category={inc.category} />
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 font-medium text-slate-900 dark:text-slate-100">
                        <span className="inline-flex items-center gap-1.5">
                          <span
                            className="h-2 w-2 rounded-full shrink-0"
                            style={{ backgroundColor: getHeadColor(inc.head_of_crime) }}
                          />
                          <span>{inc.head_of_crime}</span>
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-slate-700 dark:text-slate-300">
                        {inc.target}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 font-medium text-slate-800 dark:text-slate-200">
                        {inc.district}
                      </td>
                      <td className="max-w-[240px] truncate px-3 py-2.5 text-slate-600 dark:text-slate-400" title={inc.place || undefined}>
                        {inc.place || "–"}
                      </td>
                      <td
                        className="whitespace-nowrap px-3 py-2.5 text-right font-medium text-slate-800 dark:text-slate-200 tabular-nums"
                        title="Estimated from the names listed; may be higher"
                      >
                        {formatEstimate(inc.killed_count)}
                      </td>
                      <td
                        className="whitespace-nowrap px-3 py-2.5 text-right font-medium text-slate-800 dark:text-slate-200 tabular-nums"
                        title="Estimated from the names listed; may be higher"
                      >
                        {formatEstimate(inc.injured_count)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-slate-600 dark:text-slate-400">
                        {inc.claimed_by || "–"}
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pager */}
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
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-800 px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              <span>Previous</span>
            </button>
            <button
              type="button"
              disabled={page >= pages}
              onClick={() => onPageChange(page + 1)}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-800 px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40"
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
