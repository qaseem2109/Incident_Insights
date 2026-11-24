"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import type { Feature, FeatureCollection, Geometry } from "geojson";
import {
  GeoJSON,
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";

import { getHeadColor } from "@/lib/client/colors";
import { formatDateTime } from "@/lib/client/format";
import {
  getDistrictCountForGeoPolygon,
  mapGeoJsonNameToDbDistrict,
} from "@/lib/client/geoMapping";
import { Incident } from "@/lib/client/types";
import { LegendEntry, MapLegend } from "./MapLegend";

interface IncidentMapCanvasProps {
  incidents: Incident[];
  loading: boolean;
  selectedDistricts: string[];
  onToggleDistrictFilter: (district: string) => void;
  onSelectIncident: (incident: Incident) => void;
  highlightedId?: number | null;
}

const SINDH_BOUNDS: L.LatLngBoundsExpression = [
  [23.5, 66.6],
  [28.6, 71.1],
];

const TRANSPARENT_PIXEL =
  "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

function createIncidentDivIcon(incident: Incident, highlighted: boolean): L.DivIcon {
  const color = getHeadColor(incident.head_of_crime);
  const isMajor = incident.category === "MAJOR";
  const size = isMajor ? 18 : 13;
  const totalSize = isMajor ? 30 : 20;

  const html = `
    <div style="position:relative;width:${totalSize}px;height:${totalSize}px;display:flex;align-items:center;justify-content:center;">
      ${
        isMajor
          ? `<span class="sindh-major-pulse" style="position:absolute;width:${totalSize}px;height:${totalSize}px;border-radius:9999px;background:${color};opacity:0.35;"></span>`
          : ""
      }
      ${
        highlighted
          ? `<span style="position:absolute;width:${totalSize + 6}px;height:${totalSize + 6}px;border-radius:9999px;border:2.5px solid #4f46e5;"></span>`
          : ""
      }
      <span class="sindh-marker-dot" style="position:relative;width:${size}px;height:${size}px;border-radius:9999px;background:${color};border:2px solid #ffffff;box-shadow:0 1px 4px rgba(15,23,42,0.45);"></span>
    </div>
  `;

  return L.divIcon({
    html,
    className: "sindh-incident-div-icon",
    iconSize: [totalSize, totalSize],
    iconAnchor: [totalSize / 2, totalSize / 2],
    popupAnchor: [0, -totalSize / 2],
  });
}

function FitBoundsController({ incidents }: { incidents: Incident[] }) {
  const map = useMap();
  const prevSigRef = useRef<string>("");

  useEffect(() => {
    const valid = incidents.filter(
      (i) => i.latitude !== null && i.longitude !== null
    );
    const sig = valid.map((i) => i.id).join(",");
    if (sig === prevSigRef.current) return;
    prevSigRef.current = sig;

    if (valid.length === 0) {
      map.fitBounds(SINDH_BOUNDS, { padding: [20, 20], animate: true });
      return;
    }

    if (valid.length === 1) {
      map.setView([valid[0].latitude!, valid[0].longitude!], 10, {
        animate: true,
      });
      return;
    }

    const bounds = L.latLngBounds(
      valid.map((i) => [i.latitude!, i.longitude!] as [number, number])
    );
    map.fitBounds(bounds, {
      padding: [42, 42],
      maxZoom: 11,
      animate: true,
    });
  }, [incidents, map]);

  return null;
}

export default function IncidentMapCanvas({
  incidents,
  loading,
  selectedDistricts,
  onToggleDistrictFilter,
  onSelectIncident,
  highlightedId,
}: IncidentMapCanvasProps) {
  const [geoData, setGeoData] = useState<FeatureCollection | null>(null);
  const [hiddenHeads, setHiddenHeads] = useState<Set<string>>(new Set());
  const [clustering, setClustering] = useState<boolean>(true);
  const [showLabels, setShowLabels] = useState<boolean>(false);

  useEffect(() => {
    fetch("/geo/sindh_districts.geojson")
      .then((res) => res.json())
      .then((data: FeatureCollection) => setGeoData(data))
      .catch(() => {});
  }, []);

  // Counts per DB district for polygon tooltips
  const countsByDbDistrict = useMemo(() => {
    const counts: Record<string, number> = {};
    incidents.forEach((inc) => {
      counts[inc.district] = (counts[inc.district] || 0) + 1;
    });
    return counts;
  }, [incidents]);

  // Legend entries from currently filtered incidents
  const legendEntries: LegendEntry[] = useMemo(() => {
    const map = new Map<string, number>();
    incidents.forEach((inc) => {
      map.set(inc.head_of_crime, (map.get(inc.head_of_crime) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([head, count]) => ({ head, count }))
      .sort((a, b) => b.count - a.count);
  }, [incidents]);

  const visibleIncidents = useMemo(() => {
    return incidents.filter(
      (inc) =>
        inc.latitude !== null &&
        inc.longitude !== null &&
        !hiddenHeads.has(inc.head_of_crime)
    );
  }, [incidents, hiddenHeads]);

  const toggleHead = (head: string) => {
    setHiddenHeads((prev) => {
      const next = new Set(prev);
      if (next.has(head)) next.delete(head);
      else next.add(head);
      return next;
    });
  };

  const geoJsonKey = useMemo(() => {
    return `${selectedDistricts.join("|")}-${showLabels}-${incidents.length}`;
  }, [selectedDistricts, showLabels, incidents.length]);

  const markerElements = visibleIncidents.map((inc) => (
    <Marker
      key={inc.id}
      position={[inc.latitude!, inc.longitude!]}
      icon={createIncidentDivIcon(inc, highlightedId === inc.id)}
    >
      <Popup maxWidth={290} className="sindh-map-popup">
        <div className="p-1 text-slate-900 space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <span
              className="inline-block rounded px-1.5 py-0.5 text-[10px] font-bold uppercase text-white"
              style={{
                backgroundColor:
                  inc.category === "MAJOR" ? "#dc2626" : "#475569",
              }}
            >
              {inc.category}
            </span>
            <span className="text-[11px] text-slate-500">
              {formatDateTime(
                inc.incident_date,
                inc.incident_time,
                inc.date_time_raw
              )}
            </span>
          </div>

          <div className="font-semibold text-sm leading-snug">
            {inc.head_of_crime}
          </div>
          <div className="text-xs text-slate-600">
            <strong>Target:</strong> {inc.target}
          </div>
          <div className="text-xs text-slate-600">
            <strong>Location:</strong>{" "}
            {inc.place ? `${inc.place}, ${inc.district}` : inc.district}
          </div>

          {inc.coord_source === "district" && (
            <div className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
              Approximate location (district level)
            </div>
          )}

          <button
            type="button"
            onClick={() => onSelectIncident(inc)}
            className="mt-1.5 w-full rounded-md bg-indigo-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 transition-colors"
          >
            Open details
          </button>
        </div>
      </Popup>
    </Marker>
  ));

  return (
    <div className="relative h-[calc(100vh-12.5rem)] min-h-[520px] w-full overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs sindh-offline-map">
      <MapContainer
        bounds={SINDH_BOUNDS}
        maxBounds={[
          [22.5, 65.5],
          [29.5, 72.2],
        ]}
        minZoom={6}
        maxZoom={13}
        className="h-full w-full z-0"
      >
        {process.env.NEXT_PUBLIC_OFFLINE_TILES === "1" && (
          <TileLayer
            url="/tiles/{z}/{x}/{y}.png"
            errorTileUrl={TRANSPARENT_PIXEL}
          />
        )}

        {geoData && (
          <GeoJSON
            key={geoJsonKey}
            data={geoData}
            style={(feature?: Feature<Geometry, { name?: string }>) => {
              const rawName = feature?.properties?.name || "";
              const dbName = mapGeoJsonNameToDbDistrict(rawName);
              const isSelected = selectedDistricts.includes(dbName);
              return {
                fillColor: isSelected
                  ? "var(--map-land-selected)"
                  : "var(--map-land)",
                fillOpacity: 1,
                color: isSelected ? "#4f46e5" : "var(--map-border)",
                weight: isSelected ? 2 : 1,
              };
            }}
            onEachFeature={(
              feature: Feature<Geometry, { name?: string }>,
              layer: L.Layer
            ) => {
              const geoName = feature.properties?.name || "Unknown";
              const dbName = mapGeoJsonNameToDbDistrict(geoName);
              const count = getDistrictCountForGeoPolygon(
                geoName,
                countsByDbDistrict
              );

              layer.bindTooltip(
                `<div class="font-sans text-xs"><strong>${dbName}</strong>: ${count} incident${
                  count === 1 ? "" : "s"
                }</div>`,
                {
                  sticky: !showLabels,
                  permanent: showLabels,
                  direction: "center",
                  className: showLabels
                    ? "sindh-district-static-label"
                    : "sindh-district-tooltip",
                }
              );

              layer.on({
                mouseover: (e: L.LeafletMouseEvent) => {
                  const target = e.target as L.Path;
                  target.setStyle({
                    fillColor: "var(--map-land-hover)",
                    weight: 1.75,
                  });
                },
                mouseout: (e: L.LeafletMouseEvent) => {
                  const target = e.target as L.Path;
                  const isSelected = selectedDistricts.includes(dbName);
                  target.setStyle({
                    fillColor: isSelected
                      ? "var(--map-land-selected)"
                      : "var(--map-land)",
                    weight: isSelected ? 2 : 1,
                  });
                },
                click: () => {
                  onToggleDistrictFilter(dbName);
                },
              });
            }}
          />
        )}

        <FitBoundsController incidents={visibleIncidents} />

        {clustering ? (
          <MarkerClusterGroup
            chunkedLoading
            maxClusterRadius={42}
            spiderfyOnMaxZoom
            showCoverageOnHover={false}
          >
            {markerElements}
          </MarkerClusterGroup>
        ) : (
          markerElements
        )}
      </MapContainer>

      {/* Empty Overlay */}
      {!loading && incidents.length === 0 && (
        <div className="pointer-events-none absolute inset-0 z-[450] flex items-center justify-center bg-slate-950/15 backdrop-blur-[1px]">
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 px-5 py-3.5 text-center shadow-lg">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              No incidents for these filters
            </p>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Adjust or clear filters to display incidents on the map.
            </p>
          </div>
        </div>
      )}

      {/* Floating Legend */}
      <MapLegend
        entries={legendEntries}
        hiddenHeads={hiddenHeads}
        onToggleHead={toggleHead}
        onShowAllHeads={() => setHiddenHeads(new Set())}
        clustering={clustering}
        onToggleClustering={() => setClustering((c) => !c)}
        showLabels={showLabels}
        onToggleLabels={() => setShowLabels((l) => !l)}
      />
    </div>
  );
}
