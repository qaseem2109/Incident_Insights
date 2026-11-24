"use client";

import React from "react";
import { motion } from "framer-motion";
import { Crosshair, MapPin, Shield, Skull, HeartPulse } from "lucide-react";
import clsx from "clsx";
import { getHeadColor } from "@/lib/client/colors";
import { formatDateTime, formatEstimate } from "@/lib/client/format";
import { Incident } from "@/lib/client/types";
import { CategoryBadge } from "@/components/ui/Badge";

interface IncidentCardProps {
  incident: Incident;
  highlighted?: boolean;
  onSelect: (incident: Incident) => void;
}

export function IncidentCard({
  incident,
  highlighted = false,
  onSelect,
}: IncidentCardProps) {
  const accentColor = getHeadColor(incident.head_of_crime);
  const dateLabel = formatDateTime(
    incident.incident_date,
    incident.incident_time,
    incident.date_time_raw
  );

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      whileHover={{ y: -2 }}
      id={`incident-card-${incident.id}`}
      onClick={() => onSelect(incident)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(incident);
        }
      }}
      tabIndex={0}
      role="button"
      aria-label={`${incident.head_of_crime} in ${incident.district} on ${dateLabel}`}
      className={clsx(
        "group relative flex flex-col justify-between overflow-hidden rounded-xl border bg-white dark:bg-slate-900 p-4 pl-5 text-left shadow-2xs hover:shadow-md transition-shadow cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500",
        highlighted
          ? "border-indigo-500 ring-2 ring-indigo-500/40"
          : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
      )}
    >
      {/* Left colour stripe */}
      <span
        aria-hidden="true"
        className="absolute inset-y-0 left-0 w-1.5"
        style={{ backgroundColor: accentColor }}
      />

      <div>
        {/* Header row */}
        <div className="flex items-center justify-between gap-2 mb-2">
          <CategoryBadge category={incident.category} />
          <time className="text-xs font-medium text-slate-500 dark:text-slate-400 tabular-nums">
            {dateLabel}
          </time>
        </div>

        {/* Crime Type + Target */}
        <div className="mb-2">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors leading-snug">
            {incident.head_of_crime}
          </h3>
          <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
            <Crosshair className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            <span className="truncate font-medium">{incident.target}</span>
          </div>
        </div>

        {/* District & Place */}
        <div className="mb-2.5 flex items-start gap-1.5 text-xs text-slate-600 dark:text-slate-400">
          <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
          <p className="line-clamp-2 leading-relaxed">
            <span className="font-medium text-slate-800 dark:text-slate-200">
              {incident.district}
            </span>
            {incident.place ? ` — ${incident.place}` : ""}
          </p>
        </div>

        {/* Brief Details */}
        {incident.brief_details && (
          <p className="mb-3 line-clamp-3 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            {incident.brief_details}
          </p>
        )}
      </div>

      {/* Footer Stat Chips */}
      <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <span
            title="Estimated from the names listed; may be higher"
            className="inline-flex items-center gap-1 rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[11px] font-medium text-slate-700 dark:text-slate-300 tabular-nums"
          >
            <Skull className="h-3 w-3 text-red-600 dark:text-red-400" />
            <span>Killed {formatEstimate(incident.killed_count)}</span>
          </span>
          <span
            title="Estimated from the names listed; may be higher"
            className="inline-flex items-center gap-1 rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[11px] font-medium text-slate-700 dark:text-slate-300 tabular-nums"
          >
            <HeartPulse className="h-3 w-3 text-amber-600 dark:text-amber-400" />
            <span>Injured {formatEstimate(incident.injured_count)}</span>
          </span>
        </div>

        {incident.claimed_by && (
          <span className="inline-flex items-center gap-1 rounded-md border border-slate-200 dark:border-slate-700 px-1.5 py-0.5 text-[11px] font-medium text-slate-600 dark:text-slate-300 max-w-[110px] truncate">
            <Shield className="h-2.5 w-2.5 shrink-0 text-slate-400" />
            <span className="truncate">{incident.claimed_by}</span>
          </span>
        )}
      </div>
    </motion.article>
  );
}
