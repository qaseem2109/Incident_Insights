import React from "react";
import clsx from "clsx";

interface CategoryBadgeProps {
  category: "MAJOR" | "OTHER";
  className?: string;
}

export function CategoryBadge({ category, className }: CategoryBadgeProps) {
  const isMajor = category === "MAJOR";
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold tracking-wider uppercase border",
        isMajor
          ? "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/70 dark:text-red-300 dark:border-red-800/80"
          : "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
        className
      )}
    >
      {category}
    </span>
  );
}
