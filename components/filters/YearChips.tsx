"use client";

import React from "react";
import clsx from "clsx";
import { Option } from "@/lib/client/types";
import { formatNumber } from "@/lib/client/format";

interface YearChipsProps {
  options: Option[];
  selected: number[];
  onChange: (next: number[]) => void;
  dynamicCounts?: Record<number, number>;
}

export function YearChips({
  options,
  selected,
  onChange,
  dynamicCounts,
}: YearChipsProps) {
  const toggle = (yr: number) => {
    if (selected.includes(yr)) {
      onChange(selected.filter((y) => y !== yr));
    } else {
      onChange([...selected, yr].sort((a, b) => a - b));
    }
  };

  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => {
        const yr = Number(opt.value);
        const isSelected = selected.includes(yr);
        const count =
          dynamicCounts && yr in dynamicCounts ? dynamicCounts[yr] : opt.count;
        const dimmed = !isSelected && count === 0;

        return (
          <button
            key={yr}
            type="button"
            aria-pressed={isSelected}
            onClick={() => toggle(yr)}
            className={clsx(
              "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500",
              isSelected
                ? "border-indigo-600 bg-indigo-600 text-white shadow-xs"
                : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700",
              dimmed && "opacity-45"
            )}
          >
            <span>{yr}</span>
            <span
              className={clsx(
                "text-[11px]",
                isSelected
                  ? "text-indigo-100"
                  : "text-slate-400 dark:text-slate-500"
              )}
            >
              {formatNumber(count)}
            </span>
          </button>
        );
      })}
    </div>
  );
}
