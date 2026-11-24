"use client";

import React, { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, X } from "lucide-react";
import clsx from "clsx";
import { createIncident, updateIncident } from "@/lib/client/api";
import {
  ApiValidationError,
  FilterOptions,
  Incident,
  IncidentPayload,
} from "@/lib/client/types";
import { LocationPicker } from "@/components/map/LocationPicker";
import { Combobox } from "@/components/ui/Combobox";
import { useToast } from "@/components/ui/Toast";

interface IncidentFormDialogProps {
  open: boolean;
  onClose: () => void;
  options: FilterOptions | null;
  editIncident?: Incident | null;
  onSuccess: (saved: Incident, isEdit: boolean) => void;
}

interface FormState {
  category: "MAJOR" | "OTHER";
  head_of_crime: string;
  target: string;
  claimed_by: string;
  incident_date: string;
  incident_time: string;
  district: string;
  place: string;
  importance: string;
  fir_details: string;
  brief_details: string;
  killed_names: string;
  injured_names: string;
  accused: string;
  killed_count: string;
  injured_count: string;
  latitude: number | null;
  longitude: number | null;
}

function buildInitialState(inc?: Incident | null): FormState {
  if (!inc) {
    return {
      category: "OTHER",
      head_of_crime: "",
      target: "",
      claimed_by: "",
      incident_date: "",
      incident_time: "",
      district: "",
      place: "",
      importance: "",
      fir_details: "",
      brief_details: "",
      killed_names: "",
      injured_names: "",
      accused: "",
      killed_count: "",
      injured_count: "",
      latitude: null,
      longitude: null,
    };
  }

  const hasManualCoords = inc.coord_source === "manual";

  return {
    category: inc.category,
    head_of_crime: inc.head_of_crime || "",
    target: inc.target || "",
    claimed_by: inc.claimed_by || "",
    incident_date: inc.incident_date || "",
    incident_time: inc.incident_time || "",
    district: inc.district || "",
    place: inc.place || "",
    importance: inc.importance || "",
    fir_details: inc.fir_details || "",
    brief_details: inc.brief_details || "",
    killed_names: inc.killed_names || "",
    injured_names: inc.injured_names || "",
    accused: inc.accused || "",
    killed_count:
      inc.killed_count !== null && inc.killed_count !== undefined
        ? String(inc.killed_count)
        : "",
    injured_count:
      inc.injured_count !== null && inc.injured_count !== undefined
        ? String(inc.injured_count)
        : "",
    latitude: hasManualCoords ? inc.latitude : null,
    longitude: hasManualCoords ? inc.longitude : null,
  };
}

export function IncidentFormDialog({
  open,
  onClose,
  options,
  editIncident = null,
  onSuccess,
}: IncidentFormDialogProps) {
  const { showToast } = useToast();
  const isEdit = Boolean(editIncident);

  const [form, setForm] = useState<FormState>(() =>
    buildInitialState(editIncident)
  );
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(buildInitialState(editIncident));
      setFieldErrors({});
    }
  }, [open, editIncident]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !submitting) onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, submitting, onClose]);

  const headOptions = useMemo(
    () => (options?.heads || []).map((h) => String(h.value)),
    [options]
  );

  const targetOptions = useMemo(
    () => (options?.targets || []).map((t) => String(t.value)),
    [options]
  );

  const claimedOptions = useMemo(
    () =>
      (options?.claimed || [])
        .map((c) => String(c.value))
        .filter((v) => v !== "(none)"),
    [options]
  );

  const groupedDistricts = useMemo(() => {
    const karachi: string[] = [];
    const interior: string[] = [];
    (options?.districts || []).forEach((d) => {
      const name = String(d.value);
      if (d.region === "Karachi") karachi.push(name);
      else interior.push(name);
    });
    return { karachi, interior };
  }, [options]);

  const validateClient = (): boolean => {
    const errors: Record<string, string> = {};
    if (!form.category) errors.category = "Category is required";
    if (!form.incident_date) errors.incident_date = "Incident date is required";
    if (!form.head_of_crime.trim())
      errors.head_of_crime = "Head of crime is required";
    if (!form.target.trim()) errors.target = "Target is required";
    if (!form.district.trim()) errors.district = "District is required";

    if (
      (form.latitude !== null && form.longitude === null) ||
      (form.latitude === null && form.longitude !== null)
    ) {
      errors.latitude = "Provide both latitude and longitude or clear both";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const toNormalizedPayload = (state: FormState): IncidentPayload => {
    const killedParsed =
      state.killed_count.trim() === "" ? null : Number(state.killed_count);
    const injuredParsed =
      state.injured_count.trim() === "" ? null : Number(state.injured_count);

    return {
      category: state.category,
      incident_date: state.incident_date,
      incident_time: state.incident_time.trim() || null,
      head_of_crime: state.head_of_crime.trim(),
      target: state.target.trim(),
      district: state.district.trim(),
      place: state.place.trim() || null,
      importance: state.importance.trim() || null,
      fir_details: state.fir_details.trim() || null,
      brief_details: state.brief_details.trim() || null,
      killed_names: state.killed_names.trim() || null,
      injured_names: state.injured_names.trim() || null,
      accused: state.accused.trim() || null,
      claimed_by: state.claimed_by.trim() || null,
      killed_count:
        killedParsed !== null && !Number.isNaN(killedParsed)
          ? killedParsed
          : null,
      injured_count:
        injuredParsed !== null && !Number.isNaN(injuredParsed)
          ? injuredParsed
          : null,
      latitude: state.latitude,
      longitude: state.longitude,
    };
  };

  const refetchFilters = async () => {
    try {
      await fetch("/api/filters", { cache: "no-store" });
    } catch {
      // Non-blocking refresh
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateClient()) return;

    setSubmitting(true);
    setFieldErrors({});

    try {
      const fullPayload = toNormalizedPayload(form);

      if (isEdit && editIncident) {
        const baseline = toNormalizedPayload(buildInitialState(editIncident));
        const diff: Partial<IncidentPayload> = {};
        (Object.keys(fullPayload) as (keyof IncidentPayload)[]).forEach((key) => {
          if (fullPayload[key] !== baseline[key]) {
            // @ts-expect-error key assignment verified
            diff[key] = fullPayload[key];
          }
        });

        const updated = await updateIncident(editIncident.id, diff);
        await refetchFilters();
        showToast("Incident updated", "success");
        onSuccess(updated, true);
        onClose();
      } else {
        const created = await createIncident(fullPayload);
        await refetchFilters();
        showToast("Incident added", "success");
        onSuccess(created, false);
        onClose();
      }
    } catch (err: unknown) {
      if (err instanceof ApiValidationError) {
        setFieldErrors(err.fields);
        showToast("Please review the highlighted fields", "error");
      } else {
        showToast(
          err instanceof Error ? err.message : "Failed to save incident",
          "error"
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (fieldErrors[key]) {
      setFieldErrors((prev) => {
        const copy = { ...prev };
        delete copy[key];
        return copy;
      });
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="incident-form-title"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => !submitting && onClose()}
            className="fixed inset-0 bg-slate-950/55 backdrop-blur-[1px]"
          />

          <motion.form
            onSubmit={handleSubmit}
            initial={{ opacity: 0, scale: 0.97, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 12 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="relative z-10 flex h-full sm:h-auto sm:max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden sm:rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-6 py-4 shrink-0">
              <div>
                <h2
                  id="incident-form-title"
                  className="text-base font-semibold text-slate-900 dark:text-slate-100"
                >
                  {isEdit ? `Edit Incident #${editIncident?.id}` : "Add New Incident"}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Fields marked with * are required.
                </p>
              </div>
              <button
                type="button"
                disabled={submitting}
                onClick={onClose}
                aria-label="Close form"
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6 text-sm">
              {/* 1. Classification */}
              <section className="space-y-3.5">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                  1. Classification
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Category *
                    </label>
                    <div className="grid grid-cols-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-950 p-0.5 text-xs">
                      {(["MAJOR", "OTHER"] as const).map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setField("category", cat)}
                          className={clsx(
                            "rounded-md py-1.5 font-semibold transition-all",
                            form.category === cat
                              ? cat === "MAJOR"
                                ? "bg-red-600 text-white shadow-xs"
                                : "bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-xs"
                              : "text-slate-600 dark:text-slate-400"
                          )}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                    {fieldErrors.category && (
                      <p className="mt-1 text-xs text-red-600">
                        {fieldErrors.category}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Claimed By
                    </label>
                    <Combobox
                      value={form.claimed_by}
                      onChange={(val) => setField("claimed_by", val)}
                      options={claimedOptions}
                      placeholder="e.g. SRA, BLA, Unclaimed"
                      error={fieldErrors.claimed_by}
                      allowOther
                      otherLabel="New claimed-by organisation"
                      otherPlaceholder="Enter organisation name..."
                    />
                    {fieldErrors.claimed_by && (
                      <p className="mt-1 text-xs text-red-600">
                        {fieldErrors.claimed_by}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Head of Crime *
                    </label>
                    <Combobox
                      value={form.head_of_crime}
                      onChange={(val) => setField("head_of_crime", val)}
                      options={headOptions}
                      placeholder="Select or type crime type..."
                      error={fieldErrors.head_of_crime}
                      allowOther
                      otherLabel="New head of crime"
                      otherPlaceholder="Enter head of crime..."
                    />
                    {fieldErrors.head_of_crime && (
                      <p className="mt-1 text-xs text-red-600">
                        {fieldErrors.head_of_crime}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Target *
                    </label>
                    <Combobox
                      value={form.target}
                      onChange={(val) => setField("target", val)}
                      options={targetOptions}
                      placeholder="e.g. Police, Civilian, Rangers"
                      error={fieldErrors.target}
                      allowOther
                      otherLabel="New target"
                      otherPlaceholder="Enter target..."
                    />
                    {fieldErrors.target && (
                      <p className="mt-1 text-xs text-red-600">
                        {fieldErrors.target}
                      </p>
                    )}
                  </div>
                </div>
              </section>

              {/* 2. When & Where */}
              <section className="space-y-3.5 border-t border-slate-200/80 dark:border-slate-800 pt-5">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                  2. When &amp; Where
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Date *
                    </label>
                    <input
                      type="date"
                      value={form.incident_date}
                      onChange={(e) => setField("incident_date", e.target.value)}
                      className={clsx(
                        "w-full rounded-lg border bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2",
                        fieldErrors.incident_date
                          ? "border-red-500 focus:ring-red-500/30"
                          : "border-slate-300 dark:border-slate-700 focus:border-indigo-500 focus:ring-indigo-500/30"
                      )}
                    />
                    {fieldErrors.incident_date && (
                      <p className="mt-1 text-xs text-red-600">
                        {fieldErrors.incident_date}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Time (24h, optional)
                    </label>
                    <input
                      type="time"
                      value={form.incident_time}
                      onChange={(e) => setField("incident_time", e.target.value)}
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                    />
                    {fieldErrors.incident_time && (
                      <p className="mt-1 text-xs text-red-600">
                        {fieldErrors.incident_time}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      District *
                    </label>
                    <select
                      value={form.district}
                      onChange={(e) => setField("district", e.target.value)}
                      className={clsx(
                        "w-full rounded-lg border bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2",
                        fieldErrors.district
                          ? "border-red-500 focus:ring-red-500/30"
                          : "border-slate-300 dark:border-slate-700 focus:border-indigo-500 focus:ring-indigo-500/30"
                      )}
                    >
                      <option value="">Select district...</option>
                      {groupedDistricts.karachi.length > 0 && (
                        <optgroup label="Karachi">
                          {groupedDistricts.karachi.map((d) => (
                            <option key={d} value={d}>
                              {d}
                            </option>
                          ))}
                        </optgroup>
                      )}
                      {groupedDistricts.interior.length > 0 && (
                        <optgroup label="Interior Sindh">
                          {groupedDistricts.interior.map((d) => (
                            <option key={d} value={d}>
                              {d}
                            </option>
                          ))}
                        </optgroup>
                      )}
                    </select>
                    {fieldErrors.district && (
                      <p className="mt-1 text-xs text-red-600">
                        {fieldErrors.district}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Place of Incident
                  </label>
                  <input
                    type="text"
                    value={form.place}
                    onChange={(e) => setField("place", e.target.value)}
                    placeholder="Specific street, area, police station jurisdiction, or landmark"
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                  />
                  {fieldErrors.place && (
                    <p className="mt-1 text-xs text-red-600">{fieldErrors.place}</p>
                  )}
                </div>
              </section>

              {/* 3. Case Details */}
              <section className="space-y-3.5 border-t border-slate-200/80 dark:border-slate-800 pt-5">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                  3. Case Details
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Importance of the Case
                    </label>
                    <input
                      type="text"
                      value={form.importance}
                      onChange={(e) => setField("importance", e.target.value)}
                      placeholder="e.g. High profile, Attack on LEAs"
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      FIR Details
                    </label>
                    <input
                      type="text"
                      value={form.fir_details}
                      onChange={(e) => setField("fir_details", e.target.value)}
                      placeholder="FIR number, sections, police station"
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Brief Details
                  </label>
                  <textarea
                    rows={3}
                    value={form.brief_details}
                    onChange={(e) => setField("brief_details", e.target.value)}
                    placeholder="Factual summary of the incident..."
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                  />
                </div>
              </section>

              {/* 4. People */}
              <section className="space-y-3.5 border-t border-slate-200/80 dark:border-slate-800 pt-5">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                  4. People &amp; Casualties
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Name of Killed / Shaheed
                    </label>
                    <textarea
                      rows={3}
                      value={form.killed_names}
                      onChange={(e) => setField("killed_names", e.target.value)}
                      placeholder={"1. Name2. Name"}
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                    />
                    <p className="mt-1 text-[11px] text-slate-400">
                      One per line, e.g. 1. Name
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Name of Injured
                    </label>
                    <textarea
                      rows={3}
                      value={form.injured_names}
                      onChange={(e) => setField("injured_names", e.target.value)}
                      placeholder={"1. Name2. Name"}
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                    />
                    <p className="mt-1 text-[11px] text-slate-400">
                      One per line, e.g. 1. Name
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Accused Involved
                  </label>
                  <textarea
                    rows={2}
                    value={form.accused}
                    onChange={(e) => setField("accused", e.target.value)}
                    placeholder="Details of suspects or accused individuals..."
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Killed Count (optional)
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={form.killed_count}
                      onChange={(e) => setField("killed_count", e.target.value)}
                      placeholder="Auto"
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:border-indigo-500 focus:outline-none"
                    />
                    <p className="mt-1 text-[11px] text-slate-400">
                      Leave empty to count automatically from the names
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Injured Count (optional)
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={form.injured_count}
                      onChange={(e) => setField("injured_count", e.target.value)}
                      placeholder="Auto"
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:border-indigo-500 focus:outline-none"
                    />
                    <p className="mt-1 text-[11px] text-slate-400">
                      Leave empty to count automatically from the names
                    </p>
                  </div>
                </div>
              </section>

              {/* 5. Map Position */}
              <section className="space-y-2.5 border-t border-slate-200/80 dark:border-slate-800 pt-5">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                  5. Map Position (Optional)
                </h3>
                <LocationPicker
                  latitude={form.latitude}
                  longitude={form.longitude}
                  coordSource={editIncident?.coord_source ?? null}
                  place={form.place}
                  district={form.district}
                  districts={options?.districts || []}
                  onChange={(lat, lng) => {
                    setField("latitude", lat);
                    setField("longitude", lng);
                  }}
                />
                {fieldErrors.latitude && (
                  <p className="text-xs text-red-600">{fieldErrors.latitude}</p>
                )}
              </section>
            </div>

            {/* Sticky Footer */}
            <div className="flex items-center justify-end gap-2.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/70 px-6 py-4 shrink-0">
              <button
                type="button"
                disabled={submitting}
                onClick={onClose}
                className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-xs hover:bg-indigo-700 disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              >
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                <span>{isEdit ? "Save changes" : "Save incident"}</span>
              </button>
            </div>
          </motion.form>
        </div>
      )}
    </AnimatePresence>
  );
}
