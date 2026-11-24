"use client";

import React, { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Download, FileSpreadsheet, Loader2, X } from "lucide-react";
import clsx from "clsx";
import { fetchIncidents, getExportUrl } from "@/lib/client/api";
import { getHeadColor } from "@/lib/client/colors";
import { formatClaimedLabel, formatNumber } from "@/lib/client/format";
import { FilterOptions, FilterState } from "@/lib/client/types";
import { useDebounce } from "@/hooks/useDebounce";
import { MonthChips } from "@/components/filters/MonthChips";
import { MultiSelect } from "@/components/filters/MultiSelect";
import { YearChips } from "@/components/filters/YearChips";
import { useToast } from "@/components/ui/Toast";

interface ExportDialogProps {
  open: boolean;
  onClose: () => void;
  initialFilters: FilterState;
  options: FilterOptions | null;
}

export function ExportDialog({
  open,
  onClose,
  initialFilters,
  options,
}: ExportDialogProps) {
  const { showToast } = useToast();
  const [draft, setDraft] = useState<FilterState>(initialFilters);
  const [previewCount, setPreviewCount] = useState<number | null>(null);
  const [counting, setCounting] = useState<boolean>(false);
  const [downloading, setDownloading] = useState<boolean>(false);

  // Sync from global filters each time dialog opens
  useEffect(() => {
    if (open) {
      setDraft(initialFilters);
    }
  }, [open, initialFilters]);

  // Escape handler
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  const debouncedDraft = useDebounce(draft, 250);
  const draftKey = JSON.stringify(debouncedDraft);

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    setCounting(true);

    fetchIncidents({
      filters: debouncedDraft,
      page: 1,
      pageSize: 1,
      signal: controller.signal,
    })
      .then((res) => {
        setPreviewCount(res.total);
        setCounting(false);
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setCounting(false);
      });

    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, draftKey]);

  const districtItems = useMemo(() => {
    if (!options) return [];
    return options.districts
      .filter((d) => !draft.region || d.region === draft.region)
      .map((d) => ({
        value: String(d.value),
        label: String(d.value),
        group: d.region,
        count: d.count,
      }));
  }, [options, draft.region]);

  const headItems = useMemo(() => {
    if (!options) return [];
    return options.heads.map((h) => ({
      value: String(h.value),
      label: String(h.value),
      colorDot: getHeadColor(String(h.value)),
      count: h.count,
    }));
  }, [options]);

  const targetItems = useMemo(() => {
    if (!options) return [];
    return options.targets.map((t) => ({
      value: String(t.value),
      label: String(t.value),
      count: t.count,
    }));
  }, [options]);

  const claimedItems = useMemo(() => {
    if (!options) return [];
    return options.claimed.map((c) => ({
      value: String(c.value),
      label: formatClaimedLabel(c.value),
      count: c.count,
    }));
  }, [options]);

  const handleDownload = () => {
    setDownloading(true);
    const url = getExportUrl(draft);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast(
      `Exporting ${formatNumber(previewCount ?? 0)} incidents to Excel (.xlsx)`,
      "success"
    );
    window.setTimeout(() => {
      setDownloading(false);
      onClose();
    }, 450);
  };

  return (
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="export-dialog-title"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-950/50 backdrop-blur-[1px]"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="relative z-10 flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-6 py-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
                  <FileSpreadsheet className="h-5 w-5" />
                </div>
                <div>
                  <h2
                    id="export-dialog-title"
                    className="text-base font-semibold text-slate-900 dark:text-slate-100"
                  >
                    Export to Excel
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    The file keeps the same layout as the original workbook (3 sheets).
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close export dialog"
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5 text-sm">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Year */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Year
                  </label>
                  {options && (
                    <YearChips
                      options={options.years}
                      selected={draft.year}
                      onChange={(year) => setDraft((d) => ({ ...d, year }))}
                    />
                  )}
                </div>

                {/* Month */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Month
                  </label>
                  {options && (
                    <MonthChips
                      options={options.months}
                      selected={draft.month}
                      onChange={(month) => setDraft((d) => ({ ...d, month }))}
                    />
                  )}
                </div>

                {/* Category & Region */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Category
                  </label>
                  <div className="grid grid-cols-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100/80 dark:bg-slate-950 p-0.5 text-xs">
                    {(
                      [
                        { label: "All", val: "" },
                        { label: "Major", val: "MAJOR" },
                        { label: "Other", val: "OTHER" },
                      ] as const
                    ).map((opt) => (
                      <button
                        key={opt.label}
                        type="button"
                        onClick={() =>
                          setDraft((d) => ({ ...d, category: opt.val }))
                        }
                        className={clsx(
                          "rounded-md py-1.5 font-medium transition-all",
                          draft.category === opt.val
                            ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-xs"
                            : "text-slate-600 dark:text-slate-400"
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Region
                  </label>
                  <div className="grid grid-cols-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100/80 dark:bg-slate-950 p-0.5 text-xs">
                    {(
                      [
                        { label: "All", val: "" },
                        { label: "Karachi", val: "Karachi" },
                        { label: "Interior", val: "Interior Sindh" },
                      ] as const
                    ).map((opt) => (
                      <button
                        key={opt.label}
                        type="button"
                        onClick={() =>
                          setDraft((d) => ({ ...d, region: opt.val }))
                        }
                        className={clsx(
                          "rounded-md py-1.5 font-medium transition-all",
                          draft.region === opt.val
                            ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-xs"
                            : "text-slate-600 dark:text-slate-400"
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* District */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    District
                  </label>
                  <MultiSelect
                    items={districtItems}
                    selected={draft.district}
                    onChange={(district) => setDraft((d) => ({ ...d, district }))}
                    placeholder="Filter districts..."
                    grouped
                    maxHeightClass="max-h-36"
                  />
                </div>

                {/* Head of Crime */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Head of Crime
                  </label>
                  <MultiSelect
                    items={headItems}
                    selected={draft.head}
                    onChange={(head) => setDraft((d) => ({ ...d, head }))}
                    placeholder="Filter crime types..."
                    maxHeightClass="max-h-36"
                  />
                </div>

                {/* Target */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Target
                  </label>
                  <MultiSelect
                    items={targetItems}
                    selected={draft.target}
                    onChange={(target) => setDraft((d) => ({ ...d, target }))}
                    placeholder="Filter targets..."
                    maxHeightClass="max-h-36"
                  />
                </div>

                {/* Claimed By */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Claimed By
                  </label>
                  <MultiSelect
                    items={claimedItems}
                    selected={draft.claimed}
                    onChange={(claimed) => setDraft((d) => ({ ...d, claimed }))}
                    placeholder="Filter claimed by..."
                    maxHeightClass="max-h-36"
                  />
                </div>
              </div>

              {/* Date range */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                    From Date
                  </label>
                  <input
                    type="date"
                    value={draft.from}
                    min={options?.dateRange.min}
                    max={draft.to || options?.dateRange.max}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, from: e.target.value }))
                    }
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                    To Date
                  </label>
                  <input
                    type="date"
                    value={draft.to}
                    min={draft.from || options?.dateRange.min}
                    max={options?.dateRange.max}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, to: e.target.value }))
                    }
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 px-6 py-4">
              <div className="text-sm text-slate-700 dark:text-slate-300">
                {counting ? (
                  <span className="inline-flex items-center gap-1.5 text-slate-500">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Calculating matching rows...</span>
                  </span>
                ) : (
                  <span>
                    <strong className="font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
                      {formatNumber(previewCount ?? 0)}
                    </strong>{" "}
                    {previewCount === 1 ? "incident" : "incidents"} will be exported
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={counting || downloading || (previewCount ?? 0) === 0}
                  onClick={handleDownload}
                  className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-xs hover:bg-emerald-700 disabled:opacity-45 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                >
                  {downloading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                  <span>Download .xlsx</span>
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
