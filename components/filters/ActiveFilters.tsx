"use client";

import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { MONTH_SHORT, formatClaimedLabel } from "@/lib/client/format";
import { FilterState } from "@/lib/client/types";
import { AnimatedCounter } from "@/components/ui/AnimatedCounter";

interface ActiveFiltersProps {
  filters: FilterState;
  totalCount: number;
  loading: boolean;
  onChange: (patch: Partial<FilterState>) => void;
  onClearAll: () => void;
}

interface ChipItem {
  key: string;
  label: string;
  onRemove: () => void;
}

export function ActiveFilters({
  filters,
  totalCount,
  loading,
  onChange,
  onClearAll,
}: ActiveFiltersProps) {
  const chips: ChipItem[] = [];

  filters.year.forEach((y) =>
    chips.push({
      key: `year-${y}`,
      label: `Year: ${y}`,
      onRemove: () => onChange({ year: filters.year.filter((v) => v !== y) }),
    })
  );

  filters.month.forEach((m) =>
    chips.push({
      key: `month-${m}`,
      label: `Month: ${MONTH_SHORT[m - 1] || m}`,
      onRemove: () => onChange({ month: filters.month.filter((v) => v !== m) }),
    })
  );

  if (filters.category) {
    chips.push({
      key: `cat-${filters.category}`,
      label: `Category: ${filters.category}`,
      onRemove: () => onChange({ category: "" }),
    });
  }

  if (filters.region) {
    chips.push({
      key: `reg-${filters.region}`,
      label: `Region: ${filters.region}`,
      onRemove: () => onChange({ region: "" }),
    });
  }

  filters.district.forEach((d) =>
    chips.push({
      key: `dist-${d}`,
      label: `District: ${d}`,
      onRemove: () =>
        onChange({ district: filters.district.filter((v) => v !== d) }),
    })
  );

  filters.head.forEach((h) =>
    chips.push({
      key: `head-${h}`,
      label: `Type: ${h}`,
      onRemove: () => onChange({ head: filters.head.filter((v) => v !== h) }),
    })
  );

  filters.target.forEach((t) =>
    chips.push({
      key: `target-${t}`,
      label: `Target: ${t}`,
      onRemove: () =>
        onChange({ target: filters.target.filter((v) => v !== t) }),
    })
  );

  filters.claimed.forEach((c) =>
    chips.push({
      key: `claimed-${c}`,
      label: `Claimed: ${formatClaimedLabel(c)}`,
      onRemove: () =>
        onChange({ claimed: filters.claimed.filter((v) => v !== c) }),
    })
  );

  if (filters.from) {
    chips.push({
      key: `from-${filters.from}`,
      label: `From: ${filters.from}`,
      onRemove: () => onChange({ from: "" }),
    });
  }

  if (filters.to) {
    chips.push({
      key: `to-${filters.to}`,
      label: `To: ${filters.to}`,
      onRemove: () => onChange({ to: "" }),
    });
  }

  if (filters.q) {
    chips.push({
      key: `q-${filters.q}`,
      label: `Search: "${filters.q}"`,
      onRemove: () => onChange({ q: "" }),
    });
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 px-3.5 py-2.5 shadow-2xs">
      <div className="flex flex-wrap items-center gap-2 min-h-[28px]">
        <div className="text-sm text-slate-600 dark:text-slate-400 mr-1">
          <AnimatedCounter
            value={totalCount}
            className="font-semibold text-slate-900 dark:text-slate-100 tabular-nums"
          />{" "}
          <span>{totalCount === 1 ? "incident" : "incidents"}</span>
          {loading && (
            <span className="ml-2 inline-block h-1.5 w-1.5 rounded-full bg-indigo-500 animate-ping" />
          )}
        </div>

        <AnimatePresence initial={false}>
          {chips.map((chip) => (
            <motion.span
              key={chip.key}
              layout
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85 }}
              transition={{ duration: 0.15 }}
              className="inline-flex items-center gap-1 rounded-full border border-indigo-200 dark:border-indigo-800/80 bg-indigo-50/90 dark:bg-indigo-950/70 pl-2.5 pr-1.5 py-0.5 text-xs font-medium text-indigo-800 dark:text-indigo-200"
            >
              <span>{chip.label}</span>
              <button
                type="button"
                onClick={chip.onRemove}
                aria-label={`Remove filter ${chip.label}`}
                className="rounded-full p-0.5 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-200/70 dark:hover:bg-indigo-900 focus:outline-none"
              >
                <X className="h-3 w-3" />
              </button>
            </motion.span>
          ))}
        </AnimatePresence>

        {chips.length > 0 && (
          <button
            type="button"
            onClick={onClearAll}
            className="text-xs font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 underline-offset-2 hover:underline px-1"
          >
            Clear all
          </button>
        )}
      </div>
    </div>
  );
}
