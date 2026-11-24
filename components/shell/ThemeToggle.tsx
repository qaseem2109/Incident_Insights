"use client";

import React, { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

const THEME_KEY = "sindh_incidents_theme";

export function ThemeToggle() {
  const [dark, setDark] = useState<boolean>(false);
  const [mounted, setMounted] = useState<boolean>(false);

  useEffect(() => {
    setMounted(true);
    const stored = window.localStorage.getItem(THEME_KEY);
    if (stored === "dark") {
      document.documentElement.classList.add("dark");
      setDark(true);
    } else if (stored === "light") {
      document.documentElement.classList.remove("dark");
      setDark(false);
    } else {
      const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      document.documentElement.classList.toggle("dark", systemDark);
      setDark(systemDark);
    }
  }, []);

  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    window.localStorage.setItem(THEME_KEY, next ? "dark" : "light");
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
      title={dark ? "Switch to light theme" : "Switch to dark theme"}
      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
    >
      {mounted ? (
        dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />
      ) : (
        <Moon className="h-4 w-4 opacity-50" />
      )}
    </button>
  );
}
