"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import type { GeoJsonObject } from "geojson";
import {
  GeoJSON,
  MapContainer,
  Marker,
  useMap,
  useMapEvents,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";

interface LocationPickerCanvasProps {
  latitude: number | null;
  longitude: number | null;
  flyToTrigger?: number;
  onChange: (lat: number, lng: number) => void;
}

const SINDH_BOUNDS: L.LatLngBoundsExpression = [
  [23.5, 66.6],
  [28.6, 71.1],
];

const pinIcon = L.divIcon({
  className: "custom-draggable-pin",
  html: `<div style="width:18px;height:18px;border-radius:9999px;background:#4f46e5;border:3px solid #ffffff;box-shadow:0 2px 6px rgba(15,23,42,0.45);transform:translate(-9px,-9px);"></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

function ClickHandler({
  onSelect,
}: {
  onSelect: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(e) {
      onSelect(
        Number(e.latlng.lat.toFixed(5)),
        Number(e.latlng.lng.toFixed(5))
      );
    },
  });
  return null;
}

function CenterUpdater({
  latitude,
  longitude,
  flyToTrigger,
}: {
  latitude: number | null;
  longitude: number | null;
  flyToTrigger?: number;
}) {
  const map = useMap();
  const lastFlyRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (latitude !== null && longitude !== null) {
      const shouldFly = flyToTrigger !== lastFlyRef.current;
      lastFlyRef.current = flyToTrigger;
      map.setView([latitude, longitude], Math.max(map.getZoom(), shouldFly ? 11 : 9), {
        animate: true,
      });
    }
  }, [latitude, longitude, flyToTrigger, map]);

  return null;
}

function DraggablePin({
  latitude,
  longitude,
  onChange,
}: {
  latitude: number;
  longitude: number;
  onChange: (lat: number, lng: number) => void;
}) {
  const markerRef = useRef<L.Marker | null>(null);

  const eventHandlers = useMemo(
    () => ({
      dragend() {
        const marker = markerRef.current;
        if (marker) {
          const pos = marker.getLatLng();
          onChange(Number(pos.lat.toFixed(5)), Number(pos.lng.toFixed(5)));
        }
      },
    }),
    [onChange]
  );

  return (
    <Marker
      ref={markerRef}
      position={[latitude, longitude]}
      icon={pinIcon}
      draggable
      eventHandlers={eventHandlers}
    />
  );
}

export default function LocationPickerCanvas({
  latitude,
  longitude,
  flyToTrigger,
  onChange,
}: LocationPickerCanvasProps) {
  const [geoData, setGeoData] = useState<GeoJsonObject | null>(null);

  useEffect(() => {
    fetch("/geo/sindh_districts.geojson")
      .then((r) => r.json())
      .then((d: GeoJsonObject) => setGeoData(d))
      .catch(() => {});
  }, []);

  return (
    <div className="h-52 w-full overflow-hidden rounded-lg border border-slate-300 dark:border-slate-700 sindh-offline-map">
      <MapContainer
        bounds={SINDH_BOUNDS}
        minZoom={6}
        maxZoom={13}
        className="h-full w-full cursor-crosshair"
      >
        {geoData && (
          <GeoJSON
            data={geoData}
            style={{
              fillColor: "var(--map-land)",
              fillOpacity: 1,
              color: "var(--map-border)",
              weight: 1,
            }}
          />
        )}
        <ClickHandler onSelect={onChange} />
        <CenterUpdater
          latitude={latitude}
          longitude={longitude}
          flyToTrigger={flyToTrigger}
        />
        {latitude !== null && longitude !== null && (
          <DraggablePin
            latitude={latitude}
            longitude={longitude}
            onChange={onChange}
          />
        )}
      </MapContainer>
    </div>
  );
}
