"use client";

import React, { useMemo, useState } from "react";
import { Check, Search } from "lucide-react";
import clsx from "clsx";
import { formatNumber } from "@/lib/client/format";

export interface MultiSelectItem {
  value: string;
  label: string;
  count: number;
  group?: string;
  colorDot?: string;
}

interface MultiSelectProps {
  items: MultiSelectItem[];
  selected: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  grouped?: boolean;
  maxHeightClass?: string;
}

export function MultiSelect({
  items,
  selected,
  onChange,
  placeholder = "Filter list...",
  grouped = false,
  maxHeightClass = "max-h-44",
}: MultiSelectProps) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => item.label.toLowerCase().includes(q));
  }, [items, query]);

  const toggle = (val: string) => {
    if (selected.includes(val)) {
      onChange(selected.filter((s) => s !== val));
    } else {
      onChange([...selected, val]);
    }
  };

  const groups = useMemo(() => {
    if (!grouped) return [{ name: "", entries: filtered }];
    const map = new Map<string, MultiSelectItem[]>();
    filtered.forEach((item) => {
      const g = item.group || "Other";
      if (!map.has(g)) map.set(g, []);
      map.get(g)!.push(item);
    });
    return Array.from(map.entries()).map(([name, entries]) => ({
      name,
      entries,
    }));
  }, [filtered, grouped]);

  return (
    <div className="space-y-1.5">
      {items.length > 6 && (
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder}
            aria-label={placeholder}
            className="h-7 w-full rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 pl-7 pr-2 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-none"
          />
        </div>
      )}

      <div
        className={clsx(
          "overflow-y-auto pr-1 space-y-2 scrollbar-thin",
          maxHeightClass
        )}
      >
        {filtered.length === 0 ? (
          <p className="py-2 text-center text-xs text-slate-400">No matches</p>
        ) : (
          groups.map((group) => (
            <div key={group.name || "default"} className="space-y-0.5">
              {group.name && (
                <div className="px-1.5 pt-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  {group.name}
                </div>
              )}
              {group.entries.map((item) => {
                const isSelected = selected.includes(item.value);
                const dimmed = !isSelected && item.count === 0;
                return (
                  <button
                    key={item.value}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => toggle(item.value)}
                    className={clsx(
                      "flex w-full items-center justify-between gap-2 rounded-md px-2 py-1 text-left text-xs transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500",
                      isSelected
                        ? "bg-indigo-50 text-indigo-900 font-medium dark:bg-indigo-950/80 dark:text-indigo-200"
                        : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70",
                      dimmed && "opacity-45"
                    )}
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <span
                        className={clsx(
                          "flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border transition-colors",
                          isSelected
                            ? "border-indigo-600 bg-indigo-600 text-white"
                            : "border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
                        )}
                      >
                        {isSelected && <Check className="h-2.5 w-2.5 stroke-[3]" />}
                      </span>
                      {item.colorDot && (
                        <span
                          className="h-2 w-2 rounded-full shrink-0"
                          style={{ backgroundColor: item.colorDot }}
                        />
                      )}
                      <span className="truncate">{item.label}</span>
                    </span>
                    <span className="shrink-0 text-[11px] text-slate-400 dark:text-slate-500 tabular-nums">
                      {formatNumber(item.count)}
                    </span>
                  </button>
                );
              })}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
