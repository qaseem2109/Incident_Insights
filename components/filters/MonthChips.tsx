"use client";

import React from "react";
import clsx from "clsx";
import { MONTH_SHORT } from "@/lib/client/format";
import { Option } from "@/lib/client/types";

interface MonthChipsProps {
  options: Option[];
  selected: number[];
  onChange: (next: number[]) => void;
  dynamicCounts?: Record<number, number>;
}

export function MonthChips({
  options,
  selected,
  onChange,
  dynamicCounts,
}: MonthChipsProps) {
  const countMap = new Map<number, number>();
  options.forEach((o) => countMap.set(Number(o.value), o.count));

  const toggle = (m: number) => {
    if (selected.includes(m)) {
      onChange(selected.filter((x) => x !== m));
    } else {
      onChange([...selected, m].sort((a, b) => a - b));
    }
  };

  return (
    <div className="grid grid-cols-4 gap-1.5">
      {MONTH_SHORT.map((label, idx) => {
        const monthNum = idx + 1;
        const isSelected = selected.includes(monthNum);
        const count =
          dynamicCounts && monthNum in dynamicCounts
            ? dynamicCounts[monthNum]
            : countMap.get(monthNum) ?? 0;
        const dimmed = !isSelected && count === 0;

        return (
          <button
            key={monthNum}
            type="button"
            aria-pressed={isSelected}
            onClick={() => toggle(monthNum)}
            title={`${label} (${count})`}
            className={clsx(
              "flex flex-col items-center justify-center rounded-lg border py-1 text-xs font-medium transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500",
              isSelected
                ? "border-indigo-600 bg-indigo-600 text-white"
                : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700",
              dimmed && "opacity-45"
            )}
          >
            <span>{label}</span>
          </button>
        );
      })}
    </div>
  );
}
