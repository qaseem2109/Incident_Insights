import type Database from "better-sqlite3";
import { districtCentroid } from "./geo";

/** [canonical name, region, name in the boundary GeoJSON (null = fixed centre, tight spread), optional fixed centre [lat,lng]] */
export const DISTRICT_DEFS: [string, "Karachi" | "Interior Sindh", string | null, [number, number]?][] = [
  ["Karachi Central", "Karachi", "Central Karachi"],
  ["Karachi East", "Karachi", "East Karachi"],
  // The boundary file's "South" polygon stretches far west, so pin it to the real urban centre (Saddar / Clifton / Lyari)
  ["Karachi South", "Karachi", null, [24.855, 67.015]],
  ["Karachi West", "Karachi", "West Karachi"],
  ["Karachi Malir", "Karachi", "Malir Karachi"],
  ["Karachi Korangi", "Karachi", "Korangi Karachi"],
  // Keamari was carved out of West in 2020; the boundary file predates it, so use a fixed centre
  ["Karachi Keamari", "Karachi", null, [24.83, 66.97]],
  ["Badin", "Interior Sindh", "Badin"],
  ["Dadu", "Interior Sindh", "Dadu"],
  ["Ghotki", "Interior Sindh", "Ghotki"],
  ["Hyderabad", "Interior Sindh", "Hyderabad"],
  ["Jacobabad", "Interior Sindh", "Jacobabad"],
  ["Jamshoro", "Interior Sindh", "Jamshoro"],
  ["Kambar Shahdadkot", "Interior Sindh", "Kambar Shahdad Kot"],
  ["Kashmore", "Interior Sindh", "Kashmore"],
  ["Khairpur", "Interior Sindh", "Khairpur"],
  ["Larkana", "Interior Sindh", "Larkana"],
  ["Matiari", "Interior Sindh", "Matiari"],
  ["Mirpur Khas", "Interior Sindh", "Mirpur Khas"],
  ["Naushahro Feroze", "Interior Sindh", "Naushahro Feroze"],
  ["Sanghar", "Interior Sindh", "Sanghar"],
  ["Shaheed Benazirabad", "Interior Sindh", "Shaheed Benazir Abad"],
  ["Shikarpur", "Interior Sindh", "Shikarpur"],
  ["Sujawal", "Interior Sindh", "Sujawal"],
  ["Sukkur", "Interior Sindh", "Sukkur"],
  ["Tando Allahyar", "Interior Sindh", "Tando Allahyar"],
  ["Tando Muhammad Khan", "Interior Sindh", "Tando Muhammad Khan"],
  ["Tharparkar", "Interior Sindh", "Tharparkar"],
  ["Thatta", "Interior Sindh", "Thatta"],
  ["Umerkot", "Interior Sindh", "Umer Kot"],
];

/** (Re)fills the `districts` table; centroids are computed from the bundled boundary file. */
export function seedDistricts(db: Database.Database) {
  const up = db.prepare(
    `INSERT INTO districts (name, region, latitude, longitude, geo_name) VALUES (@name,@region,@lat,@lng,@geo)
     ON CONFLICT(name) DO UPDATE SET region=excluded.region, latitude=excluded.latitude,
       longitude=excluded.longitude, geo_name=excluded.geo_name`,
  );
  db.transaction(() => {
    for (const [name, region, geo, fixed] of DISTRICT_DEFS) {
      const c = fixed ? { lat: fixed[0], lng: fixed[1] } : geo ? districtCentroid(geo) : null;
      if (!c) throw new Error(`No boundary found for district ${name} (${geo})`);
      up.run({ name, region, lat: +c.lat.toFixed(5), lng: +c.lng.toFixed(5), geo });
    }
  })();
}
