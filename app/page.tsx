"use client";

import React, { Suspense, useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { deleteIncident } from "@/lib/client/api";
import { Incident } from "@/lib/client/types";
import { useFilterOptions } from "@/hooks/useFilterOptions";
import { useFilters } from "@/hooks/useFilters";
import { useIncidents } from "@/hooks/useIncidents";
import { useStats } from "@/hooks/useStats";
import { ExportDialog } from "@/components/dialogs/ExportDialog";
import { IncidentFormDialog } from "@/components/dialogs/IncidentFormDialog";
import { ActiveFilters } from "@/components/filters/ActiveFilters";
import { FilterPanel } from "@/components/filters/FilterPanel";
import { CardGrid } from "@/components/incidents/CardGrid";
import { DetailDrawer } from "@/components/incidents/DetailDrawer";
import { IncidentTable } from "@/components/incidents/IncidentTable";
import { InsightsView } from "@/components/insights/InsightsView";
import { IncidentMap } from "@/components/map/IncidentMap";
import { TopBar } from "@/components/shell/TopBar";
import { ViewSwitcher } from "@/components/shell/ViewSwitcher";
import { useToast } from "@/components/ui/Toast";

function DashboardContent() {
  const { showToast } = useToast();
  const {
    filters,
    searchInput,
    setSearchInput,
    view,
    setView,
    sort,
    order,
    setSort,
    page,
    setPage,
    updateFilters,
    clearAllFilters,
    activeFilterCount,
  } = useFilters();

  const { options, reload: reloadOptions } = useFilterOptions();
  const { stats, loading: statsLoading, refetch: refetchStats } = useStats(filters);

  const pageSize = view === "table" ? 50 : 24;

  // Paginated list for Cards / Table
  const {
    data: pagedIncidents,
    total: pagedTotal,
    pages,
    loading: pagedLoading,
    refetch: refetchPaged,
  } = useIncidents({
    filters,
    page,
    pageSize,
    sort,
    order,
    all: false,
    enabled: view === "cards" || view === "table",
  });

  // All matching incidents for Map view
  const {
    data: mapIncidents,
    total: mapTotal,
    loading: mapLoading,
    refetch: refetchMap,
  } = useIncidents({
    filters,
    sort,
    order,
    all: true,
    enabled: view === "map",
  });

  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingIncident, setEditingIncident] = useState<Incident | null>(null);
  const [highlightedId, setHighlightedId] = useState<number | null>(null);

  const activeTotal =
    view === "map"
      ? mapTotal
      : view === "insights"
      ? stats?.totals.incidents ?? pagedTotal
      : pagedTotal;

  const activeLoading =
    view === "map"
      ? mapLoading
      : view === "insights"
      ? statsLoading
      : pagedLoading;

  const handleSavedIncident = useCallback(
    (saved: Incident, isEdit: boolean) => {
      refetchPaged();
      refetchMap();
      refetchStats();
      reloadOptions();
      if (isEdit) {
        setSelectedIncident(saved);
      }
      setHighlightedId(saved.id);
      window.setTimeout(() => {
        const el = document.getElementById(`incident-card-${saved.id}`);
        el?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 250);
    },
    [refetchMap, refetchPaged, refetchStats, reloadOptions]
  );

  useEffect(() => {
    if (highlightedId === null) return;
    const t = window.setTimeout(() => setHighlightedId(null), 4000);
    return () => window.clearTimeout(t);
  }, [highlightedId]);

  const handleDeleteIncident = useCallback(
    async (id: number) => {
      await deleteIncident(id);
      showToast("Incident deleted", "info");
      refetchPaged();
      refetchMap();
      refetchStats();
      reloadOptions();
    },
    [refetchMap, refetchPaged, refetchStats, reloadOptions, showToast]
  );

  const handleToggleDistrictFromMap = useCallback(
    (district: string) => {
      const exists = filters.district.includes(district);
      updateFilters({
        district: exists
          ? filters.district.filter((d) => d !== district)
          : [...filters.district, district],
      });
    },
    [filters.district, updateFilters]
  );

  return (
    <div className="min-h-screen flex flex-col">
      <TopBar
        searchInput={searchInput}
        onSearchChange={setSearchInput}
        onOpenAdd={() => {
          setEditingIncident(null);
          setFormOpen(true);
        }}
        onOpenExport={() => setExportOpen(true)}
        onOpenMobileFilters={() => setMobileFiltersOpen(true)}
        activeFilterCount={activeFilterCount}
      />

      <div className="mx-auto flex w-full max-w-[1600px] flex-1 gap-6 px-4 py-5 lg:px-6">
        <FilterPanel
          options={options}
          filters={filters}
          stats={stats}
          onChange={updateFilters}
          onReset={clearAllFilters}
          activeFilterCount={activeFilterCount}
          mobileOpen={mobileFiltersOpen}
          onCloseMobile={() => setMobileFiltersOpen(false)}
        />

        <main className="min-w-0 flex-1 space-y-4">
          {/* View Header */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <ViewSwitcher value={view} onChange={setView} />
          </div>

          {/* Active Filters + Live Counter */}
          <ActiveFilters
            filters={filters}
            totalCount={activeTotal}
            loading={activeLoading}
            onChange={updateFilters}
            onClearAll={clearAllFilters}
          />

          {/* Main View Content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={view}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.16, ease: "easeOut" }}
            >
              {view === "cards" && (
                <CardGrid
                  incidents={pagedIncidents}
                  loading={pagedLoading}
                  page={page}
                  pages={pages}
                  onPageChange={setPage}
                  onSelectIncident={setSelectedIncident}
                  onClearFilters={clearAllFilters}
                  highlightedId={highlightedId}
                />
              )}

              {view === "table" && (
                <IncidentTable
                  incidents={pagedIncidents}
                  loading={pagedLoading}
                  sort={sort}
                  order={order}
                  onSort={setSort}
                  page={page}
                  pages={pages}
                  onPageChange={setPage}
                  onSelectIncident={setSelectedIncident}
                  onClearFilters={clearAllFilters}
                />
              )}

              {view === "map" && (
                <IncidentMap
                  incidents={mapIncidents}
                  loading={mapLoading}
                  selectedDistricts={filters.district}
                  onToggleDistrictFilter={handleToggleDistrictFromMap}
                  onSelectIncident={setSelectedIncident}
                  highlightedId={highlightedId}
                />
              )}

              {view === "insights" && (
                <InsightsView
                  stats={stats}
                  loading={statsLoading}
                  filters={filters}
                  onApplyFilter={updateFilters}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Right Detail Drawer */}
      <DetailDrawer
        incident={selectedIncident}
        onClose={() => setSelectedIncident(null)}
        onEdit={(inc) => {
          setEditingIncident(inc);
          setFormOpen(true);
        }}
        onDelete={handleDeleteIncident}
      />

      {/* Export Dialog */}
      <ExportDialog
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        initialFilters={filters}
        options={options}
      />

      {/* Add / Edit Incident Dialog */}
      <IncidentFormDialog
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditingIncident(null);
        }}
        options={options}
        editIncident={editingIncident}
        onSuccess={handleSavedIncident}
      />
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-sm text-slate-500">
          Loading Sindh Incidents dashboard...
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
