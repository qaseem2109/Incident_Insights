"use client";

import dynamic from "next/dynamic";
import React from "react";
import { Incident } from "@/lib/client/types";

const IncidentMapCanvas = dynamic(() => import("./IncidentMapCanvas"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[calc(100vh-12.5rem)] min-h-[520px] w-full items-center justify-center rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-900 text-sm text-slate-500">
      Loading Sindh cartographic map...
    </div>
  ),
});

interface IncidentMapProps {
  incidents: Incident[];
  loading: boolean;
  selectedDistricts: string[];
  onToggleDistrictFilter: (district: string) => void;
  onSelectIncident: (incident: Incident) => void;
  highlightedId?: number | null;
}

export function IncidentMap(props: IncidentMapProps) {
  return <IncidentMapCanvas {...props} />;
}
