"use client";

import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import clsx from "clsx";

const OTHER_OPTION_LABEL = "Other (type a new one)…";
const OTHER_SENTINEL = "__OTHER_NEW_VALUE__";

interface ComboboxProps {
  id?: string;
  value: string;
  onChange: (val: string) => void;
  options: string[];
  placeholder?: string;
  error?: string;
  ariaLabel?: string;
  allowOther?: boolean;
  otherLabel?: string;
  otherPlaceholder?: string;
}

export function Combobox({
  id,
  value,
  onChange,
  options,
  placeholder = "Select or type...",
  error,
  ariaLabel,
  allowOther = false,
  otherLabel = "New value",
  otherPlaceholder = "Type a new value (2–60 chars)...",
}: ComboboxProps) {
  const generatedId = useId();
  const inputId = id || generatedId;
  const customInputId = `${inputId}-custom`;
  const listId = `${inputId}-listbox`;

  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [customDraft, setCustomDraft] = useState("");
  const [customError, setCustomError] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const customInputRef = useRef<HTMLInputElement>(null);

  const listItems = useMemo(() => {
    const q = value.trim().toLowerCase();
    const base = !q
      ? options
      : options.filter((opt) => opt.toLowerCase().includes(q));

    if (!allowOther) {
      return base.map((opt) => ({ label: opt, value: opt, isOther: false }));
    }

    return [
      ...base.map((opt) => ({ label: opt, value: opt, isOther: false })),
      {
        label: OTHER_OPTION_LABEL,
        value: OTHER_SENTINEL,
        isOther: true,
      },
    ];
  }, [options, value, allowOther]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (isCustomMode) {
      customInputRef.current?.focus();
    }
  }, [isCustomMode]);

  const commitCustomValue = (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) {
      setCustomError(null);
      onChange("");
      return;
    }

    if (trimmed.length < 2) {
      setCustomError("Enter at least 2 characters.");
      return;
    }

    if (trimmed.length > 60) {
      setCustomError("Must be 60 characters or fewer.");
      return;
    }

    const existingMatch = options.find(
      (opt) => opt.trim().toLowerCase() === trimmed.toLowerCase()
    );
    if (existingMatch) {
      setCustomError(null);
      setCustomDraft(existingMatch);
      onChange(existingMatch);
      return;
    }

    setCustomError(null);
    onChange(trimmed);
  };

  const enterCustomMode = () => {
    setOpen(false);
    setActiveIndex(-1);
    setIsCustomMode(true);
    setCustomDraft(value);
    setCustomError(null);
  };

  const exitCustomMode = () => {
    setIsCustomMode(false);
    setCustomError(null);
    const matchesExisting = options.some(
      (opt) => opt.toLowerCase() === value.trim().toLowerCase()
    );
    if (!matchesExisting) {
      onChange("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActiveIndex((prev) => (prev + 1 < listItems.length ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setOpen(true);
      setActiveIndex((prev) => (prev - 1 >= 0 ? prev - 1 : listItems.length - 1));
    } else if (e.key === "Enter" && open && activeIndex >= 0 && listItems[activeIndex]) {
      e.preventDefault();
      const chosen = listItems[activeIndex];
      if (chosen.isOther) {
        enterCustomMode();
      } else {
        onChange(chosen.value);
        setOpen(false);
        setActiveIndex(-1);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
      setActiveIndex(-1);
    }
  };

  if (allowOther && isCustomMode) {
    const combinedError = customError || error;
    return (
      <div ref={containerRef} className="space-y-1">
        <div className="flex items-center justify-between gap-2">
          <label
            htmlFor={customInputId}
            className="text-[11px] font-medium text-slate-600 dark:text-slate-400"
          >
            {otherLabel}
          </label>
          <button
            type="button"
            onClick={exitCustomMode}
            className="text-[11px] font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 underline-offset-2 hover:underline"
          >
            Back to list
          </button>
        </div>

        <input
          ref={customInputRef}
          id={customInputId}
          type="text"
          maxLength={60}
          value={customDraft}
          placeholder={otherPlaceholder}
          aria-label={otherLabel}
          onChange={(e) => {
            const next = e.target.value;
            setCustomDraft(next);
            const trimmed = next.trim();
            if (!trimmed) {
              setCustomError(null);
              onChange("");
              return;
            }
            if (trimmed.length < 2) {
              setCustomError("Enter at least 2 characters.");
              onChange(next);
              return;
            }
            const existingMatch = options.find(
              (opt) => opt.trim().toLowerCase() === trimmed.toLowerCase()
            );
            setCustomError(null);
            onChange(existingMatch || trimmed);
          }}
          onBlur={(e) => commitCustomValue(e.target.value)}
          className={clsx(
            "w-full rounded-lg border bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 transition",
            combinedError
              ? "border-red-500 focus:ring-red-500/30"
              : "border-slate-300 dark:border-slate-700 focus:border-indigo-500 focus:ring-indigo-500/30"
          )}
        />

        <p className="text-[11px] text-slate-500 dark:text-slate-400">
          This will be added to the filter lists.
        </p>

        {customError && (
          <p className="text-xs text-red-600">{customError}</p>
        )}
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <input
          id={inputId}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-label={ariaLabel}
          value={value}
          placeholder={placeholder}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
            setActiveIndex(-1);
          }}
          onKeyDown={handleKeyDown}
          className={clsx(
            "w-full rounded-lg border bg-white dark:bg-slate-900 px-3 py-2 pr-8 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 transition",
            error
              ? "border-red-500 focus:ring-red-500/30"
              : "border-slate-300 dark:border-slate-700 focus:border-indigo-500 focus:ring-indigo-500/30"
          )}
        />
        <button
          type="button"
          tabIndex={-1}
          aria-label="Toggle suggestions"
          onClick={() => setOpen((o) => !o)}
          className="absolute inset-y-0 right-0 flex items-center px-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
        >
          <ChevronDown className="h-4 w-4" />
        </button>
      </div>

      {open && listItems.length > 0 && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-30 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 py-1 shadow-lg text-sm"
        >
          {listItems.map((item, idx) => (
            <li
              key={item.isOther ? OTHER_SENTINEL : item.value}
              role="option"
              aria-selected={!item.isOther && item.value === value}
              onMouseDown={(e) => {
                e.preventDefault();
                if (item.isOther) {
                  enterCustomMode();
                } else {
                  onChange(item.value);
                  setOpen(false);
                }
              }}
              className={clsx(
                "cursor-pointer px-3 py-1.5 select-none transition-colors",
                item.isOther &&
                  "border-t border-slate-100 dark:border-slate-800 mt-1 pt-2 font-medium text-indigo-600 dark:text-indigo-400",
                idx === activeIndex
                  ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-200"
                  : !item.isOther && item.value === value
                  ? "bg-slate-100 dark:bg-slate-800 font-medium text-slate-900 dark:text-slate-100"
                  : !item.isOther &&
                    "text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/70"
              )}
            >
              {item.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
