"use client";

import React, { useEffect, useState } from "react";
import { CircleMarker, GeoJSON, MapContainer } from "react-leaflet";
import type { GeoJsonObject } from "geojson";
import { getHeadColor } from "@/lib/client/colors";

interface MiniMapProps {
  latitude: number;
  longitude: number;
  headOfCrime: string;
}

export default function MiniMap({ latitude, longitude, headOfCrime }: MiniMapProps) {
  const [geoData, setGeoData] = useState<GeoJsonObject | null>(null);

  useEffect(() => {
    fetch("/geo/sindh_districts.geojson")
      .then((r) => r.json())
      .then((data: GeoJsonObject) => setGeoData(data))
      .catch(() => {});
  }, []);

  const color = getHeadColor(headOfCrime);

  return (
    <div className="h-44 w-full overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800 sindh-offline-map">
      <MapContainer
        center={[latitude, longitude]}
        zoom={10}
        zoomControl={false}
        attributionControl={false}
        dragging={false}
        scrollWheelZoom={false}
        doubleClickZoom={false}
        className="h-full w-full"
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
        <CircleMarker
          center={[latitude, longitude]}
          radius={8}
          pathOptions={{
            color: "#ffffff",
            weight: 2,
            fillColor: color,
            fillOpacity: 0.95,
          }}
        />
      </MapContainer>
    </div>
  );
}
