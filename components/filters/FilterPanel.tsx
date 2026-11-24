"use client";

import React, { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, RotateCcw, X } from "lucide-react";
import clsx from "clsx";
import { getHeadColor } from "@/lib/client/colors";
import { formatClaimedLabel } from "@/lib/client/format";
import { FilterOptions, FilterState, Stats } from "@/lib/client/types";
import { MonthChips } from "./MonthChips";
import { MultiSelect, MultiSelectItem } from "./MultiSelect";
import { YearChips } from "./YearChips";

interface FilterPanelProps {
  options: FilterOptions | null;
  filters: FilterState;
  stats?: Stats | null;
  onChange: (patch: Partial<FilterState>) => void;
  onReset: () => void;
  activeFilterCount: number;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

function CollapsibleSection({
  title,
  badgeCount,
  defaultOpen = true,
  children,
}: {
  title: string;
  badgeCount?: number;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-slate-200/80 dark:border-slate-800/80 py-3.5 last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between text-left text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded"
      >
        <span className="flex items-center gap-2">
          <span>{title}</span>
          {badgeCount !== undefined && badgeCount > 0 && (
            <span className="rounded-full bg-indigo-100 dark:bg-indigo-950 px-1.5 py-0.2 text-[10px] font-semibold text-indigo-700 dark:text-indigo-300">
              {badgeCount}
            </span>
          )}
        </span>
        <ChevronDown
          className={clsx(
            "h-3.5 w-3.5 transition-transform duration-200",
            open && "rotate-180"
          )}
        />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className="pt-2.5">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function FilterPanel({
  options,
  filters,
  stats,
  onChange,
  onReset,
  activeFilterCount,
  mobileOpen = false,
  onCloseMobile,
}: FilterPanelProps) {
  const yearDynamicCounts = useMemo(() => {
    if (!stats || filters.year.length > 0) return undefined;
    const map: Record<number, number> = {};
    stats.byYear.forEach((y) => {
      map[y.value] = y.count;
    });
    return map;
  }, [stats, filters.year.length]);

  const monthDynamicCounts = useMemo(() => {
    if (!stats || filters.month.length > 0) return undefined;
    const map: Record<number, number> = {};
    stats.byMonth.forEach((m) => {
      map[Number(m.value)] = m.count;
    });
    return map;
  }, [stats, filters.month.length]);

  const districtItems: MultiSelectItem[] = useMemo(() => {
    if (!options) return [];
    const dynamicMap = new Map<string, number>();
    if (stats && filters.district.length === 0) {
      stats.byDistrict.forEach((d) => dynamicMap.set(String(d.value), d.count));
    }
    return options.districts
      .filter((d) => !filters.region || d.region === filters.region)
      .map((d) => {
        const val = String(d.value);
        return {
          value: val,
          label: val,
          group: d.region,
          count:
            stats && filters.district.length === 0
              ? dynamicMap.get(val) ?? 0
              : d.count,
        };
      });
  }, [options, stats, filters.region, filters.district.length]);

  const headItems: MultiSelectItem[] = useMemo(() => {
    if (!options) return [];
    const dynamicMap = new Map<string, number>();
    if (stats && filters.head.length === 0) {
      stats.byHead.forEach((h) => dynamicMap.set(String(h.value), h.count));
    }
    return options.heads.map((h) => {
      const val = String(h.value);
      return {
        value: val,
        label: val,
        colorDot: getHeadColor(val),
        count:
          stats && filters.head.length === 0 ? dynamicMap.get(val) ?? 0 : h.count,
      };
    });
  }, [options, stats, filters.head.length]);

  const targetItems: MultiSelectItem[] = useMemo(() => {
    if (!options) return [];
    const dynamicMap = new Map<string, number>();
    if (stats && filters.target.length === 0) {
      stats.byTarget.forEach((t) => dynamicMap.set(String(t.value), t.count));
    }
    return options.targets.map((t) => {
      const val = String(t.value);
      return {
        value: val,
        label: val,
        count:
          stats && filters.target.length === 0
            ? dynamicMap.get(val) ?? 0
            : t.count,
      };
    });
  }, [options, stats, filters.target.length]);

  const claimedItems: MultiSelectItem[] = useMemo(() => {
    if (!options) return [];
    const dynamicMap = new Map<string, number>();
    if (stats && filters.claimed.length === 0) {
      stats.byClaimed.forEach((c) => dynamicMap.set(String(c.value), c.count));
    }
    return options.claimed.map((c) => {
      const val = String(c.value);
      return {
        value: val,
        label: formatClaimedLabel(val),
        count:
          stats && filters.claimed.length === 0
            ? dynamicMap.get(val) ?? 0
            : c.count,
      };
    });
  }, [options, stats, filters.claimed.length]);

  const content = (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Filters
          </h2>
          {activeFilterCount > 0 && (
            <span className="rounded-full bg-indigo-600 px-2 py-0.5 text-[11px] font-semibold text-white">
              {activeFilterCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={onReset}
              className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline focus:outline-none"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Reset filters</span>
            </button>
          )}
          {onCloseMobile && (
            <button
              type="button"
              onClick={onCloseMobile}
              aria-label="Close filters"
              className="lg:hidden rounded-lg p-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pr-1">
        {/* Year */}
        <CollapsibleSection title="Year" badgeCount={filters.year.length}>
          {options ? (
            <YearChips
              options={options.years}
              selected={filters.year}
              onChange={(year) => onChange({ year })}
              dynamicCounts={yearDynamicCounts}
            />
          ) : (
            <div className="h-16 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
          )}
        </CollapsibleSection>

        {/* Month */}
        <CollapsibleSection
          title="Month"
          badgeCount={filters.month.length}
          defaultOpen={filters.month.length > 0}
        >
          {options ? (
            <MonthChips
              options={options.months}
              selected={filters.month}
              onChange={(month) => onChange({ month })}
              dynamicCounts={monthDynamicCounts}
            />
          ) : (
            <div className="h-20 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
          )}
        </CollapsibleSection>

        {/* Category */}
        <CollapsibleSection
          title="Category"
          badgeCount={filters.category ? 1 : 0}
        >
          <div className="grid grid-cols-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100/80 dark:bg-slate-900 p-0.5 text-xs">
            {(
              [
                { label: "All", val: "" },
                { label: "Major", val: "MAJOR" },
                { label: "Other", val: "OTHER" },
              ] as const
            ).map((opt) => {
              const active = filters.category === opt.val;
              return (
                <button
                  key={opt.label}
                  type="button"
                  aria-pressed={active}
                  onClick={() => onChange({ category: opt.val })}
                  className={clsx(
                    "rounded-md py-1.5 font-medium transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500",
                    active
                      ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-xs"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                  )}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </CollapsibleSection>

        {/* Region */}
        <CollapsibleSection
          title="Region"
          badgeCount={filters.region ? 1 : 0}
        >
          <div className="grid grid-cols-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100/80 dark:bg-slate-900 p-0.5 text-xs">
            {(
              [
                { label: "All", val: "" },
                { label: "Karachi", val: "Karachi" },
                { label: "Interior", val: "Interior Sindh" },
              ] as const
            ).map((opt) => {
              const active = filters.region === opt.val;
              return (
                <button
                  key={opt.label}
                  type="button"
                  aria-pressed={active}
                  onClick={() => onChange({ region: opt.val })}
                  className={clsx(
                    "rounded-md py-1.5 font-medium transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500",
                    active
                      ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-xs"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                  )}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </CollapsibleSection>

        {/* Head of crime */}
        <CollapsibleSection
          title="Head of Crime"
          badgeCount={filters.head.length}
        >
          <MultiSelect
            items={headItems}
            selected={filters.head}
            onChange={(head) => onChange({ head })}
            placeholder="Search crime type..."
          />
        </CollapsibleSection>

        {/* District */}
        <CollapsibleSection
          title="District"
          badgeCount={filters.district.length}
        >
          <MultiSelect
            items={districtItems}
            selected={filters.district}
            onChange={(district) => onChange({ district })}
            placeholder="Search district..."
            grouped
          />
        </CollapsibleSection>

        {/* Target */}
        <CollapsibleSection
          title="Target"
          badgeCount={filters.target.length}
          defaultOpen={filters.target.length > 0}
        >
          <MultiSelect
            items={targetItems}
            selected={filters.target}
            onChange={(target) => onChange({ target })}
            placeholder="Search target..."
          />
        </CollapsibleSection>

        {/* Claimed by */}
        <CollapsibleSection
          title="Claimed By"
          badgeCount={filters.claimed.length}
          defaultOpen={filters.claimed.length > 0}
        >
          <MultiSelect
            items={claimedItems}
            selected={filters.claimed}
            onChange={(claimed) => onChange({ claimed })}
            placeholder="Search organization..."
          />
        </CollapsibleSection>

        {/* Date range */}
        <CollapsibleSection
          title="Date Range"
          badgeCount={(filters.from ? 1 : 0) + (filters.to ? 1 : 0)}
          defaultOpen={Boolean(filters.from || filters.to)}
        >
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                From
              </label>
              <input
                type="date"
                value={filters.from}
                min={options?.dateRange.min}
                max={filters.to || options?.dateRange.max}
                onChange={(e) => onChange({ from: e.target.value })}
                aria-label="Date from"
                className="w-full rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-2 py-1 text-xs text-slate-900 dark:text-slate-100 focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                To
              </label>
              <input
                type="date"
                value={filters.to}
                min={filters.from || options?.dateRange.min}
                max={options?.dateRange.max}
                onChange={(e) => onChange({ to: e.target.value })}
                aria-label="Date to"
                className="w-full rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-2 py-1 text-xs text-slate-900 dark:text-slate-100 focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>
        </CollapsibleSection>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sticky Sidebar */}
      <aside className="hidden lg:block w-72 shrink-0">
        <div className="sticky top-[4.25rem] max-h-[calc(100vh-5rem)] overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs flex flex-col">
          {content}
        </div>
      </aside>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <div className="fixed inset-0 z-50 lg:hidden flex">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onCloseMobile}
              className="fixed inset-0 bg-slate-950/50 backdrop-blur-[1px]"
            />
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 360, damping: 34 }}
              className="relative z-10 w-80 max-w-[85vw] bg-white dark:bg-slate-900 p-4 shadow-2xl h-full overflow-hidden flex flex-col"
            >
              {content}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
