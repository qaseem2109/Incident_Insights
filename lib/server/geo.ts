import fs from "node:fs";
import path from "node:path";

type Ring = number[][]; // [lng, lat][]

interface Poly { rings: Ring[]; }
interface GeoDistrict { name: string; polys: Poly[]; }

let cache: Map<string, GeoDistrict> | null = null;

export const GEOJSON_PATH = path.join(process.cwd(), "public/geo/sindh_districts.geojson");

function load(): Map<string, GeoDistrict> {
  if (cache) return cache;
  const gj = JSON.parse(fs.readFileSync(GEOJSON_PATH, "utf8"));
  cache = new Map();
  for (const f of gj.features) {
    const g = f.geometry;
    const polys: Poly[] = g.type === "Polygon" ? [{ rings: g.coordinates }] : g.coordinates.map((c: Ring[]) => ({ rings: c }));
    cache.set(f.properties.name, { name: f.properties.name, polys });
  }
  return cache;
}

function ringArea(r: Ring): number {
  let a = 0;
  for (let i = 0, j = r.length - 1; i < r.length; j = i++) a += r[j][0] * r[i][1] - r[i][0] * r[j][1];
  return a / 2;
}

function ringCentroid(r: Ring): [number, number] {
  let a = 0, cx = 0, cy = 0;
  for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
    const f = r[j][0] * r[i][1] - r[i][0] * r[j][1];
    a += f; cx += (r[j][0] + r[i][0]) * f; cy += (r[j][1] + r[i][1]) * f;
  }
  a /= 2;
  return [cx / (6 * a), cy / (6 * a)]; // [lng, lat]
}

function inRing(x: number, y: number, r: Ring): boolean {
  let inside = false;
  for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
    const [xi, yi] = r[i], [xj, yj] = r[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function inPoly(x: number, y: number, p: Poly): boolean {
  if (!inRing(x, y, p.rings[0])) return false;
  for (let i = 1; i < p.rings.length; i++) if (inRing(x, y, p.rings[i])) return false;
  return true;
}

/** Centroid of the LARGEST polygon of a district (so island fragments don't skew it). */
export function districtCentroid(geoName: string): { lat: number; lng: number } | null {
  const d = load().get(geoName);
  if (!d) return null;
  const biggest = d.polys.reduce((a, b) => (Math.abs(ringArea(b.rings[0])) > Math.abs(ringArea(a.rings[0])) ? b : a));
  const [lng, lat] = ringCentroid(biggest.rings[0]);
  if (inPoly(lng, lat, biggest)) return { lat, lng };
  // concave shape: fall back to first interior vertex average that lies inside
  const r = biggest.rings[0];
  for (let i = 0; i < r.length; i += Math.max(1, Math.floor(r.length / 50)))
    for (let j = i + 3; j < r.length; j += 7) {
      const x = (r[i][0] + r[j][0]) / 2, y = (r[i][1] + r[j][1]) / 2;
      if (inPoly(x, y, biggest)) return { lat: y, lng: x };
    }
  return { lat, lng };
}

/** small deterministic PRNG so re-imports give identical positions */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Pick an approximate point for an incident that only has a district.
 * Spreads points around the district centre (inside the district polygon) so
 * markers do not stack on top of each other. Result is flagged coord_source='district'.
 */
export function placeInDistrict(
  centre: { lat: number; lng: number },
  geoName: string | null,
  seed: number,
  spread = 0.55,
): { lat: number; lng: number } {
  const rnd = mulberry32(seed * 2654435761);
  const d = geoName ? load().get(geoName) : undefined;
  if (!d) {
    // fixed-centre district: small box (~±3 km) so markers don't stack exactly
    const r = 0.03;
    return { lat: +(centre.lat + (rnd() * 2 - 1) * r).toFixed(5), lng: +(centre.lng + (rnd() * 2 - 1) * r).toFixed(5) };
  }
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const p of d.polys) for (const [x, y] of p.rings[0]) {
    minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y);
  }
  const hw = ((maxX - minX) / 2) * spread, hh = ((maxY - minY) / 2) * spread;
  for (let i = 0; i < 60; i++) {
    const x = centre.lng + (rnd() * 2 - 1) * hw;
    const y = centre.lat + (rnd() * 2 - 1) * hh;
    if (d.polys.some((p) => inPoly(x, y, p))) return { lat: +y.toFixed(5), lng: +x.toFixed(5) };
  }
  return centre;
}
