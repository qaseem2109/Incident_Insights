"use client";

import dynamic from "next/dynamic";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Check, Loader2, MapPin, Pencil, Search, X } from "lucide-react";
import type { FilterOptions } from "@/lib/client/types";

const LocationPickerCanvas = dynamic(() => import("./LocationPickerCanvas"), {
  ssr: false,
  loading: () => (
    <div className="h-52 w-full rounded-lg bg-slate-100 dark:bg-slate-800 animate-pulse" />
  ),
});

interface NominatimHit {
  place_id: number | string;
  display_name: string;
  lat: string;
  lon: string;
}

interface LocationPickerProps {
  latitude: number | null;
  longitude: number | null;
  coordSource?: "manual" | "district" | null;
  place?: string;
  district?: string;
  districts?: FilterOptions["districts"];
  onChange: (lat: number | null, lng: number | null) => void;
}

const SINDH_LAT_MIN = 23.0;
const SINDH_LAT_MAX = 28.9;
const SINDH_LNG_MIN = 66.0;
const SINDH_LNG_MAX = 71.2;

function isInsideSindh(lat: number, lng: number): boolean {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= SINDH_LAT_MIN &&
    lat <= SINDH_LAT_MAX &&
    lng >= SINDH_LNG_MIN &&
    lng <= SINDH_LNG_MAX
  );
}

function parseCoordinatesOrMapsUrl(
  raw: string
): { lat: number; lng: number } | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const urlMatch = trimmed.match(
    /(?:@|[?&]q=)(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/
  );
  if (urlMatch) {
    const lat = Number(urlMatch[1]);
    const lng = Number(urlMatch[2]);
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      return { lat, lng };
    }
  }

  const pairMatch = trimmed.match(
    /^(-?\d+(?:\.\d+)?)(?:\s*,\s*|\s+)(\-?\d+(?:\.\d+)?)$/
  );
  if (pairMatch) {
    const lat = Number(pairMatch[1]);
    const lng = Number(pairMatch[2]);
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      return { lat, lng };
    }
  }

  return null;
}

function formatDefaultQuery(place?: string, district?: string): string {
  const p = (place || "").trim();
  const d = (district || "").trim();
  if (p && d) return `${p}, ${d}`;
  return p || d || "";
}

export function LocationPicker({
  latitude,
  longitude,
  coordSource = null,
  place = "",
  district = "",
  districts = [],
  onChange,
}: LocationPickerProps) {
  const [searchQuery, setSearchQuery] = useState<string>(() =>
    formatDefaultQuery(place, district)
  );
  const userEditedSearchRef = useRef(false);

  const [draftCoords, setDraftCoords] = useState<{
    lat: number;
    lng: number;
  } | null>(() =>
    coordSource === "manual" && latitude !== null && longitude !== null
      ? { lat: latitude, lng: longitude }
      : null
  );

  const [isConfirmed, setIsConfirmed] = useState<boolean>(
    () => coordSource === "manual" && latitude !== null && longitude !== null
  );

  const [flyToTrigger, setFlyToTrigger] = useState(0);
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<NominatimHit[]>([]);
  const [locationMessage, setLocationMessage] = useState<{
    type: "error" | "info";
    text: string;
  } | null>(null);

  useEffect(() => {
    if (coordSource === "manual" && latitude !== null && longitude !== null) {
      setDraftCoords({ lat: latitude, lng: longitude });
      setIsConfirmed(true);
      setLocationMessage(null);
    } else if (latitude === null && longitude === null) {
      setDraftCoords(null);
      setIsConfirmed(false);
    } else {
      setDraftCoords(null);
      setIsConfirmed(false);
    }
  }, [coordSource, latitude, longitude]);

  useEffect(() => {
    if (!userEditedSearchRef.current) {
      setSearchQuery(formatDefaultQuery(place, district));
    }
  }, [place, district]);

  const applyCandidatePin = useCallback((lat: number, lng: number) => {
    const roundedLat = Number(lat.toFixed(5));
    const roundedLng = Number(lng.toFixed(5));

    if (!isInsideSindh(roundedLat, roundedLng)) {
      setLocationMessage({
        type: "error",
        text: "Selected coordinates must be inside Sindh (lat 23.0–28.9, lng 66.0–71.2).",
      });
      return;
    }

    setLocationMessage(null);
    setSearchResults([]);
    setDraftCoords({ lat: roundedLat, lng: roundedLng });
    setIsConfirmed(false);
    setFlyToTrigger((n) => n + 1);
  }, []);

  const handleSearch = async () => {
    const query = searchQuery.trim();
    if (!query) return;

    setLocationMessage(null);
    setSearchResults([]);

    // 1. Coordinates or Google Maps URL
    const parsedCoords = parseCoordinatesOrMapsUrl(query);
    if (parsedCoords) {
      if (!isInsideSindh(parsedCoords.lat, parsedCoords.lng)) {
        setLocationMessage({
          type: "error",
          text: "Coordinates must be within Sindh (lat 23.0–28.9, lng 66.0–71.2).",
        });
        return;
      }
      applyCandidatePin(parsedCoords.lat, parsedCoords.lng);
      return;
    }

    // 2. District match from /api/filters districts list (case-insensitive)
    const matchedDistrict = districts.find(
      (d) => String(d.value).trim().toLowerCase() === query.toLowerCase()
    );
    if (
      matchedDistrict &&
      typeof matchedDistrict.latitude === "number" &&
      typeof matchedDistrict.longitude === "number"
    ) {
      applyCandidatePin(matchedDistrict.latitude, matchedDistrict.longitude);
      return;
    }

    // 3. Online search via Nominatim (8s timeout)
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setLocationMessage({
        type: "info",
        text: "Couldn't find this place. Click the map to drop a pin, or enter coordinates.",
      });
      return;
    }

    setSearching(true);
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 8000);

    try {
      const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&countrycodes=pk&viewbox=66.0,28.9,71.2,23.0&bounded=1&q=${encodeURIComponent(
        query
      )}`;
      const res = await fetch(url, { signal: controller.signal });
      if (!res.ok) {
        throw new Error(`Search request failed (${res.status})`);
      }
      const data = (await res.json()) as NominatimHit[];
      const validHits = Array.isArray(data)
        ? data.filter((item) => {
            const lat = Number(item.lat);
            const lng = Number(item.lon);
            return isInsideSindh(lat, lng);
          })
        : [];

      if (validHits.length === 0) {
        setLocationMessage({
          type: "info",
          text: "Couldn't find this place. Click the map to drop a pin, or enter coordinates.",
        });
      } else if (validHits.length === 1) {
        applyCandidatePin(Number(validHits[0].lat), Number(validHits[0].lon));
      } else {
        setSearchResults(validHits);
      }
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "AbortError") {
        setLocationMessage({
          type: "info",
          text: "Location search timed out. Couldn't find this place. Click the map to drop a pin, or enter coordinates.",
        });
      } else {
        setLocationMessage({
          type: "info",
          text: "Couldn't find this place. Click the map to drop a pin, or enter coordinates.",
        });
      }
    } finally {
      window.clearTimeout(timeoutId);
      setSearching(false);
    }
  };

  const handleConfirmLocation = () => {
    if (!draftCoords) return;
    if (!isInsideSindh(draftCoords.lat, draftCoords.lng)) {
      setLocationMessage({
        type: "error",
        text: "Selected pin is outside Sindh (lat 23.0–28.9, lng 66.0–71.2).",
      });
      return;
    }
    setLocationMessage(null);
    setIsConfirmed(true);
    onChange(draftCoords.lat, draftCoords.lng);
  };

  const handleChangeLocation = () => {
    setIsConfirmed(false);
    setLocationMessage(null);
    if (latitude !== null && longitude !== null) {
      setDraftCoords({ lat: latitude, lng: longitude });
      setFlyToTrigger((n) => n + 1);
    }
  };

  const handleClearLocation = () => {
    setDraftCoords(null);
    setIsConfirmed(false);
    setSearchResults([]);
    setLocationMessage(null);
    onChange(null, null);
  };

  const mapLat = draftCoords ? draftCoords.lat : latitude;
  const mapLng = draftCoords ? draftCoords.lng : longitude;
  const hasConfirmedCoords =
    isConfirmed && latitude !== null && longitude !== null;
  const isApproximateDistrict =
    !hasConfirmedCoords && !draftCoords && coordSource === "district";

  return (
    <div className="space-y-2.5">
      {/* Search location bar */}
      <div className="space-y-1.5">
        <label
          htmlFor="incident-location-search"
          className="block text-xs font-medium text-slate-700 dark:text-slate-300"
        >
          Search location
        </label>
        <div className="flex gap-2">
          <input
            id="incident-location-search"
            type="text"
            value={searchQuery}
            placeholder="Place, district, lat/lng, or Google Maps link"
            onChange={(e) => {
              userEditedSearchRef.current = true;
              setSearchQuery(e.target.value);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleSearch();
              }
            }}
            className="flex-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
          />
          <button
            type="button"
            disabled={searching}
            onClick={handleSearch}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50"
          >
            {searching ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Search className="h-3.5 w-3.5" />
            )}
            <span>Find on map</span>
          </button>
        </div>

        {/* Multiple search candidates */}
        {searchResults.length > 0 && (
          <ul className="max-h-40 overflow-auto rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 divide-y divide-slate-100 dark:divide-slate-800 text-xs shadow-sm">
            {searchResults.map((hit) => (
              <li key={String(hit.place_id)}>
                <button
                  type="button"
                  onClick={() =>
                    applyCandidatePin(Number(hit.lat), Number(hit.lon))
                  }
                  className="w-full px-3 py-2 text-left text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition-colors"
                >
                  {hit.display_name}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Status / confirmation bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        {hasConfirmedCoords ? (
          <span className="inline-flex items-center gap-1.5 font-mono font-medium text-emerald-700 dark:text-emerald-400">
            <Check className="h-3.5 w-3.5 shrink-0" />
            <span>
              Location confirmed ✓ {latitude!.toFixed(5)}, {longitude!.toFixed(5)}
            </span>
          </span>
        ) : draftCoords ? (
          <span className="inline-flex items-center gap-1.5 font-mono text-slate-700 dark:text-slate-300">
            <MapPin className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <span>
              Pin: {draftCoords.lat.toFixed(5)}, {draftCoords.lng.toFixed(5)} (drag
              pin or click map to adjust)
            </span>
          </span>
        ) : isApproximateDistrict ? (
          <span className="inline-flex items-center gap-1.5 text-amber-700 dark:text-amber-400">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span>Approximate (district level)</span>
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
            <MapPin className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <span>Click anywhere on the map to pin coordinates</span>
          </span>
        )}

        <div className="flex items-center gap-1.5">
          {draftCoords && !isConfirmed && (
            <button
              type="button"
              onClick={handleConfirmLocation}
              className="inline-flex items-center gap-1 rounded-md bg-indigo-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-indigo-700"
            >
              <Check className="h-3 w-3" />
              <span>Confirm location</span>
            </button>
          )}

          {hasConfirmedCoords && (
            <button
              type="button"
              onClick={handleChangeLocation}
              className="inline-flex items-center gap-1 rounded-md border border-slate-200 dark:border-slate-700 px-2 py-0.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <Pencil className="h-3 w-3" />
              <span>Change</span>
            </button>
          )}

          {(hasConfirmedCoords || draftCoords) && (
            <button
              type="button"
              onClick={handleClearLocation}
              className="inline-flex items-center gap-1 rounded-md border border-slate-200 dark:border-slate-700 px-2 py-0.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X className="h-3 w-3" />
              <span>Clear</span>
            </button>
          )}
        </div>
      </div>

      {locationMessage && (
        <p
          className={
            locationMessage.type === "error"
              ? "text-xs text-red-600"
              : "text-xs text-slate-600 dark:text-slate-400"
          }
        >
          {locationMessage.text}
        </p>
      )}

      <LocationPickerCanvas
        latitude={mapLat}
        longitude={mapLng}
        flyToTrigger={flyToTrigger}
        onChange={(lat, lng) => {
          setLocationMessage(null);
          setSearchResults([]);
          setDraftCoords({ lat, lng });
          setIsConfirmed(false);
        }}
      />

      <p className="text-[11px] text-slate-500 dark:text-slate-400">
        If you skip this, the incident is placed automatically inside the selected district.
      </p>
    </div>
  );
}
