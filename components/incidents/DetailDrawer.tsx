"use client";

import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "framer-motion";
import {
  Calendar,
  Edit3,
  FileText,
  Info,
  MapPin,
  Shield,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { getHeadColor } from "@/lib/client/colors";
import { formatDateTime, formatEstimate } from "@/lib/client/format";
import { Incident } from "@/lib/client/types";
import { CategoryBadge } from "@/components/ui/Badge";
import { ConfirmDialog } from "@/components/dialogs/ConfirmDialog";

const MiniMap = dynamic(() => import("@/components/map/MiniMap"), {
  ssr: false,
  loading: () => (
    <div className="h-44 w-full rounded-lg bg-slate-100 dark:bg-slate-800 animate-pulse" />
  ),
});

interface DetailDrawerProps {
  incident: Incident | null;
  onClose: () => void;
  onEdit: (incident: Incident) => void;
  onDelete: (id: number) => Promise<void>;
}

export function DetailDrawer({
  incident,
  onClose,
  onEdit,
  onDelete,
}: DetailDrawerProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!incident) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !confirmOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [incident, confirmOpen, onClose]);

  const handleConfirmDelete = async () => {
    if (!incident) return;
    setDeleting(true);
    try {
      await onDelete(incident.id);
      setConfirmOpen(false);
      onClose();
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <AnimatePresence>
        {incident && (
          <div
            className="fixed inset-0 z-50 flex justify-end"
            role="dialog"
            aria-modal="true"
            aria-labelledby="detail-drawer-title"
          >
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={onClose}
              className="fixed inset-0 bg-slate-950/45 backdrop-blur-[1px]"
            />

            {/* Drawer Panel */}
            <motion.aside
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 360, damping: 36 }}
              className="relative z-10 flex h-full w-full max-w-xl flex-col border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl"
            >
              {/* Top Accent Bar */}
              <div
                className="h-1.5 w-full shrink-0"
                style={{ backgroundColor: getHeadColor(incident.head_of_crime) }}
              />

              {/* Header */}
              <div className="flex items-start justify-between gap-4 border-b border-slate-200 dark:border-slate-800 px-6 py-4">
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <CategoryBadge category={incident.category} />
                    <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                      Record #{incident.id}
                      {incident.source_sno !== null
                        ? ` (S# ${incident.source_sno})`
                        : ""}
                    </span>
                  </div>
                  <h2
                    id="detail-drawer-title"
                    className="text-lg font-semibold text-slate-900 dark:text-slate-100"
                  >
                    {incident.head_of_crime}
                  </h2>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => onEdit(incident)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                    <span>Edit</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmOpen(true)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 dark:border-red-900/70 bg-red-50/60 dark:bg-red-950/40 px-2.5 py-1.5 text-xs font-medium text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Delete</span>
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    aria-label="Close detail drawer"
                    className="ml-1 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Scrollable Body */}
              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6 text-sm">
                {/* Overview */}
                <section className="space-y-3">
                  <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>Overview</span>
                  </h3>
                  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50 p-3.5">
                    <div>
                      <dt className="text-xs text-slate-500 dark:text-slate-400">
                        Date &amp; Time
                      </dt>
                      <dd className="mt-0.5 font-medium text-slate-900 dark:text-slate-100">
                        {formatDateTime(
                          incident.incident_date,
                          incident.incident_time,
                          incident.date_time_raw
                        )}
                      </dd>
                      {incident.date_time_raw && incident.incident_date && (
                        <dd className="text-[11px] text-slate-400">
                          Raw: {incident.date_time_raw}
                        </dd>
                      )}
                    </div>
                    <div>
                      <dt className="text-xs text-slate-500 dark:text-slate-400">
                        Target
                      </dt>
                      <dd className="mt-0.5 font-medium text-slate-900 dark:text-slate-100">
                        {incident.target}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-slate-500 dark:text-slate-400">
                        Claimed By
                      </dt>
                      <dd className="mt-0.5 font-medium text-slate-900 dark:text-slate-100">
                        {incident.claimed_by || "Not recorded"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-slate-500 dark:text-slate-400">
                        Importance of the Case
                      </dt>
                      <dd className="mt-0.5 font-medium text-slate-900 dark:text-slate-100">
                        {incident.importance || "–"}
                      </dd>
                    </div>
                  </dl>
                </section>

                {/* Location */}
                <section className="space-y-2.5">
                  <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    <MapPin className="h-3.5 w-3.5" />
                    <span>Location</span>
                  </h3>
                  <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 p-3.5 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          District
                        </div>
                        <div className="font-medium text-slate-900 dark:text-slate-100">
                          {incident.district}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          Place of Incident
                        </div>
                        <div className="font-medium text-slate-900 dark:text-slate-100">
                          {incident.place || "–"}
                        </div>
                      </div>
                    </div>

                    {incident.latitude !== null && incident.longitude !== null && (
                      <div className="space-y-1.5">
                        <MiniMap
                          latitude={incident.latitude}
                          longitude={incident.longitude}
                          headOfCrime={incident.head_of_crime}
                        />
                        <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                          <span>
                            {incident.latitude.toFixed(4)},{" "}
                            {incident.longitude.toFixed(4)}
                          </span>
                          {incident.coord_source === "district" && (
                            <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-400">
                              <Info className="h-3 w-3" />
                              Approximate location (district level)
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </section>

                {/* Casualties */}
                <section className="space-y-2.5">
                  <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    <Users className="h-3.5 w-3.5" />
                    <span>Casualties</span>
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50 p-3">
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        Killed / Shaheed (est.)
                      </div>
                      <div className="mt-0.5 text-lg font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
                        {formatEstimate(incident.killed_count)}
                      </div>
                    </div>
                    <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50 p-3">
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        Injured (est.)
                      </div>
                      <div className="mt-0.5 text-lg font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
                        {formatEstimate(incident.injured_count)}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 pt-1">
                    <div>
                      <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                        Name of Killed / Shaheed
                      </div>
                      <div className="rounded-lg border border-slate-200/80 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-950/40 p-3 text-xs text-slate-800 dark:text-slate-200 whitespace-pre-line leading-relaxed">
                        {incident.killed_names || "None recorded"}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                        Name of Injured
                      </div>
                      <div className="rounded-lg border border-slate-200/80 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-950/40 p-3 text-xs text-slate-800 dark:text-slate-200 whitespace-pre-line leading-relaxed">
                        {incident.injured_names || "None recorded"}
                      </div>
                    </div>
                  </div>
                </section>

                {/* FIR & Accused */}
                <section className="space-y-2.5">
                  <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    <Shield className="h-3.5 w-3.5" />
                    <span>Investigation &amp; Legal</span>
                  </h3>
                  <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 p-3.5 space-y-3">
                    <div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        FIR Details
                      </div>
                      <div className="mt-0.5 text-slate-900 dark:text-slate-100 whitespace-pre-line">
                        {incident.fir_details || "–"}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        Accused Involved
                      </div>
                      <div className="mt-0.5 text-slate-900 dark:text-slate-100 whitespace-pre-line">
                        {incident.accused || "–"}
                      </div>
                    </div>
                  </div>
                </section>

                {/* Full Brief Details */}
                <section className="space-y-2">
                  <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    <FileText className="h-3.5 w-3.5" />
                    <span>Brief Details</span>
                  </h3>
                  <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/50 p-4 text-slate-800 dark:text-slate-200 whitespace-pre-line leading-relaxed">
                    {incident.brief_details || "No narrative recorded."}
                  </div>
                </section>
              </div>
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      <ConfirmDialog
        open={confirmOpen}
        title="Delete incident record?"
        description="This permanently removes the incident from the database. This action cannot be undone."
        confirmLabel="Delete incident"
        loading={deleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmOpen(false)}
      />
    </>
  );
}
