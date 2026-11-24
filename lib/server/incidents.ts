import type Database from "better-sqlite3";
import { getDb } from "./db";
import { placeInDistrict } from "./geo";
import {
  estimateCount, formatDateTimeRaw, monthNameFromDate, normalizeCategory, normalizeClaimed,
  normalizeHead, normalizeTarget,
} from "./normalize";

// ------------------------------------------------------------------ types ----

export interface Incident {
  id: number;
  category: "MAJOR" | "OTHER";
  source_sno: number | null;
  incident_date: string | null;
  incident_time: string | null;
  date_time_raw: string | null;
  year: number | null;
  month: number | null;
  month_raw: string | null;
  head_of_crime: string;
  target: string;
  importance: string | null;
  fir_details: string | null;
  district: string;
  district_raw: string | null;
  place: string | null;
  killed_names: string | null;
  injured_names: string | null;
  accused: string | null;
  claimed_by: string | null;
  brief_details: string | null;
  killed_count: number | null;
  injured_count: number | null;
  latitude: number | null;
  longitude: number | null;
  coord_source: "district" | "manual";
  created_at: string;
  updated_at: string;
}

export class ApiError extends Error {
  constructor(public status: number, message: string, public fields?: Record<string, string>) {
    super(message);
  }
}

const COLS = `id, category, source_sno, incident_date, incident_time, date_time_raw, year, month, month_raw,
  head_of_crime, target, importance, fir_details, district, district_raw, place, killed_names, injured_names,
  accused, claimed_by, brief_details, killed_count, injured_count, latitude, longitude, coord_source,
  created_at, updated_at`;

// ---------------------------------------------------------------- filters ----

export interface Filters {
  year: number[]; month: number[]; district: string[]; region: string[]; head: string[];
  target: string[]; claimed: string[]; category: string[]; q: string; from: string; to: string;
}

const list = (sp: URLSearchParams, key: string) =>
  sp.getAll(key).flatMap((v) => v.split("|")).map((v) => v.trim()).filter(Boolean);
// NOTE: values are separated by "|" (not ",") because names like "Central, Karachi" may contain commas.
// Repeating the key also works:  ?year=2021&year=2022

export function parseFilters(sp: URLSearchParams): Filters {
  const nums = (k: string) => list(sp, k).map(Number).filter((n) => Number.isInteger(n));
  return {
    year: nums("year"), month: nums("month"),
    district: list(sp, "district"), region: list(sp, "region"),
    head: list(sp, "head"), target: list(sp, "target"), claimed: list(sp, "claimed"),
    category: list(sp, "category").map((c) => c.toUpperCase()),
    q: (sp.get("q") ?? "").trim(), from: sp.get("from") ?? "", to: sp.get("to") ?? "",
  };
}

export function buildWhere(f: Filters, skip?: keyof Filters): { sql: string; params: unknown[] } {
  const w: string[] = [], p: unknown[] = [];
  const inList = (col: string, vals: unknown[], key: keyof Filters) => {
    if (key === skip || !vals.length) return;
    w.push(`${col} IN (${vals.map(() => "?").join(",")})`); p.push(...vals);
  };
  inList("i.year", f.year, "year");
  inList("i.month", f.month, "month");
  inList("i.district", f.district, "district");
  inList("d.region", f.region, "region");
  inList("i.head_of_crime", f.head, "head");
  inList("i.target", f.target, "target");
  inList("i.category", f.category, "category");
  if (skip !== "claimed" && f.claimed.length) {
    const named = f.claimed.filter((c) => c !== "(none)");
    const parts: string[] = [];
    if (named.length) { parts.push(`i.claimed_by IN (${named.map(() => "?").join(",")})`); p.push(...named); }
    if (named.length !== f.claimed.length) parts.push("i.claimed_by IS NULL");
    w.push(`(${parts.join(" OR ")})`);
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(f.from)) { w.push("i.incident_date >= ?"); p.push(f.from); }
  if (/^\d{4}-\d{2}-\d{2}$/.test(f.to)) { w.push("i.incident_date <= ?"); p.push(f.to); }
  if (f.q) {
    const like = `%${f.q.toLowerCase()}%`;
    const cols = ["place", "brief_details", "killed_names", "injured_names", "accused", "fir_details",
      "importance", "target", "head_of_crime", "district", "claimed_by"];
    w.push("(" + cols.map((c) => `LOWER(COALESCE(i.${c},'')) LIKE ?`).join(" OR ") + ")");
    p.push(...cols.map(() => like));
  }
  return { sql: w.length ? "WHERE " + w.join(" AND ") : "", params: p };
}

const FROM = "FROM incidents i JOIN districts d ON d.name = i.district";

// ------------------------------------------------------------------ list ----

const SORTABLE: Record<string, string> = {
  date: "i.incident_date", id: "i.id", district: "i.district", head: "i.head_of_crime",
  target: "i.target", category: "i.category", killed: "i.killed_count", injured: "i.injured_count",
};

export interface ListOptions { sort?: string; order?: string; page?: number; pageSize?: number; all?: boolean }

export function listIncidents(f: Filters, o: ListOptions = {}, db: Database.Database = getDb()) {
  const { sql, params } = buildWhere(f);
  const total = (db.prepare(`SELECT COUNT(*) n ${FROM} ${sql}`).get(...params) as { n: number }).n;
  const col = SORTABLE[o.sort ?? "date"] ?? SORTABLE.date;
  const dir = (o.order ?? "desc").toLowerCase() === "asc" ? "ASC" : "DESC";
  const order = `ORDER BY ${col} IS NULL, ${col} ${dir}, i.id ${dir}`;
  const pageSize = o.all ? total || 1 : Math.min(Math.max(o.pageSize ?? 24, 1), 500);
  const page = o.all ? 1 : Math.max(o.page ?? 1, 1);
  const data = db
    .prepare(`SELECT ${COLS.replace(/\b(\w+)(,|$)/g, "i.$1$2")} ${FROM} ${sql} ${order} LIMIT ? OFFSET ?`)
    .all(...params, pageSize, (page - 1) * pageSize) as Incident[];
  return { data, total, page, pageSize, pages: Math.max(1, Math.ceil(total / pageSize)) };
}

/** Rows for export: MAJOR first, then OTHER, each in chronological order (as in the source sheet). */
export function incidentsForExport(f: Filters, db: Database.Database = getDb()): Incident[] {
  const { sql, params } = buildWhere(f);
  return db
    .prepare(`SELECT ${COLS.replace(/\b(\w+)(,|$)/g, "i.$1$2")} ${FROM} ${sql}
              ORDER BY (i.category <> 'MAJOR'), i.incident_date IS NULL, i.incident_date ASC, i.id ASC`)
    .all(...params) as Incident[];
}

export function getIncident(id: number, db: Database.Database = getDb()): Incident | undefined {
  return db.prepare(`SELECT ${COLS} FROM incidents WHERE id = ?`).get(id) as Incident | undefined;
}

// ---------------------------------------------------------- filter options ----

export function getFilterOptions(db: Database.Database = getDb()) {
  const rows = (sql: string) => db.prepare(sql).all();
  return {
    years: rows("SELECT year value, COUNT(*) count FROM incidents WHERE year IS NOT NULL GROUP BY year ORDER BY year"),
    months: rows("SELECT month value, COUNT(*) count FROM incidents WHERE month IS NOT NULL GROUP BY month ORDER BY month"),
    categories: rows("SELECT category value, COUNT(*) count FROM incidents GROUP BY category"),
    districts: rows(`SELECT d.name value, d.region, COUNT(i.id) count, d.latitude, d.longitude
                     FROM districts d LEFT JOIN incidents i ON i.district = d.name GROUP BY d.name ORDER BY d.region, d.name`),
    heads: rows("SELECT head_of_crime value, COUNT(*) count FROM incidents GROUP BY 1 ORDER BY count DESC"),
    targets: rows("SELECT target value, COUNT(*) count FROM incidents GROUP BY 1 ORDER BY count DESC"),
    claimed: rows("SELECT COALESCE(claimed_by,'(none)') value, COUNT(*) count FROM incidents GROUP BY 1 ORDER BY count DESC"),
    dateRange: db.prepare("SELECT MIN(incident_date) min, MAX(incident_date) max FROM incidents").get(),
  };
}

// ------------------------------------------------------------------ stats ----

export function getStats(f: Filters, db: Database.Database = getDb()) {
  const { sql, params } = buildWhere(f);
  const one = (q: string) => db.prepare(q).get(...params);
  const many = (q: string) => db.prepare(q).all(...params);
  return {
    totals: one(`SELECT COUNT(*) incidents,
        SUM(i.category='MAJOR') major, SUM(i.category='OTHER') other,
        COALESCE(SUM(i.killed_count),0) killed_est, COALESCE(SUM(i.injured_count),0) injured_est,
        SUM(i.killed_count IS NULL OR i.injured_count IS NULL) unknown_counts
        ${FROM} ${sql}`),
    byYear: many(`SELECT i.year value, COUNT(*) count, SUM(i.category='MAJOR') major ${FROM} ${sql} GROUP BY i.year ORDER BY i.year`),
    byMonth: many(`SELECT i.month value, COUNT(*) count ${FROM} ${sql} GROUP BY i.month ORDER BY i.month`),
    byHead: many(`SELECT i.head_of_crime value, COUNT(*) count ${FROM} ${sql} GROUP BY 1 ORDER BY count DESC`),
    byTarget: many(`SELECT i.target value, COUNT(*) count ${FROM} ${sql} GROUP BY 1 ORDER BY count DESC LIMIT 12`),
    byDistrict: many(`SELECT i.district value, COUNT(*) count ${FROM} ${sql} GROUP BY 1 ORDER BY count DESC`),
    yearlyCasualties: db
      .prepare(`SELECT * FROM yearly_casualties ${f.year.length ? `WHERE year IN (${f.year.map(() => "?").join(",")})` : ""} ORDER BY year`)
      .all(...f.year),
    byClaimed: many(`SELECT COALESCE(i.claimed_by,'(none)') value, COUNT(*) count ${FROM} ${sql} GROUP BY 1 ORDER BY count DESC`),
  };
}

// ------------------------------------------------- create / update / delete ----

const TEXT_FIELDS = [
  "importance", "fir_details", "place", "killed_names", "injured_names", "accused", "brief_details",
] as const;

const SINDH_BOX = { latMin: 23.0, latMax: 28.9, lngMin: 66.0, lngMax: 71.2 };

type Input = Record<string, unknown>;

function toCount(v: unknown, field: string, errs: Record<string, string>): number | null | undefined {
  if (v === undefined) return undefined;
  if (v === null || v === "") return null;
  const n = Number(v);
  if (!Number.isInteger(n) || n < 0 || n > 10000) { errs[field] = "must be a whole number ≥ 0"; return undefined; }
  return n;
}

/** Validates + normalises user input. `partial` = PUT/patch (only provided keys are checked). */
function prepare(input: Input, partial: boolean, db: Database.Database, current?: Incident) {
  const errs: Record<string, string> = {};
  const out: Record<string, unknown> = {};
  const has = (k: string) => input[k] !== undefined;
  const req = (k: string) => !partial || has(k);

  if (req("category")) {
    const c = normalizeCategory(input.category);
    if (!c) errs.category = "must be MAJOR or OTHER"; else out.category = c;
  }
  if (req("incident_date")) {
    const d = String(input.incident_date ?? "");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d) || Number.isNaN(Date.parse(d))) errs.incident_date = "required, format YYYY-MM-DD";
    else out.incident_date = d;
  }
  if (has("incident_time")) {
    const t = String(input.incident_time ?? "").trim();
    if (t && !/^([01]\d|2[0-3]):[0-5]\d$/.test(t)) errs.incident_time = "format HH:MM (24h)";
    else out.incident_time = t || null;
  }
  if (req("head_of_crime")) {
    if (!String(input.head_of_crime ?? "").trim()) errs.head_of_crime = "required"; else out.head_of_crime = normalizeHead(input.head_of_crime);
  }
  if (req("target")) {
    if (!String(input.target ?? "").trim()) errs.target = "required"; else out.target = normalizeTarget(input.target);
  }
  if (has("claimed_by")) out.claimed_by = normalizeClaimed(input.claimed_by);
  if (req("district")) {
    const row = db.prepare("SELECT name FROM districts WHERE name = ?").get(String(input.district ?? ""));
    if (!row) errs.district = "unknown district – pick one from GET /api/filters → districts";
    else { out.district = String(input.district); }
  }
  for (const k of TEXT_FIELDS) if (has(k)) out[k] = String(input[k] ?? "").trim() || null;

  const kc = toCount(input.killed_count, "killed_count", errs);
  const ic = toCount(input.injured_count, "injured_count", errs);
  if (kc !== undefined) out.killed_count = kc;
  if (ic !== undefined) out.injured_count = ic;

  // coordinates: both or neither
  const hasLat = input.latitude !== undefined && input.latitude !== null && input.latitude !== "";
  const hasLng = input.longitude !== undefined && input.longitude !== null && input.longitude !== "";
  if (hasLat !== hasLng) errs.latitude = "latitude and longitude must be given together";
  else if (hasLat) {
    const la = Number(input.latitude), ln = Number(input.longitude);
    if (!(la >= SINDH_BOX.latMin && la <= SINDH_BOX.latMax && ln >= SINDH_BOX.lngMin && ln <= SINDH_BOX.lngMax))
      errs.latitude = "coordinates must be inside Sindh";
    else { out.latitude = la; out.longitude = ln; out.coord_source = "manual"; }
  } else if (input.latitude === null && input.longitude === null) {
    out.coord_source = "district"; out.latitude = null; out.longitude = null; // reset to approximate
  }

  if (Object.keys(errs).length) throw new ApiError(422, "Validation failed", errs);

  // derived fields
  const date = (out.incident_date ?? current?.incident_date ?? null) as string | null;
  const time = (out.incident_time !== undefined ? out.incident_time : current?.incident_time ?? null) as string | null;
  if (out.incident_date !== undefined || out.incident_time !== undefined) {
    out.date_time_raw = formatDateTimeRaw(date, time);
    out.month_raw = monthNameFromDate(date);
  }
  if (out.killed_count === undefined && has("killed_names")) out.killed_count = estimateCount(out.killed_names);
  if (out.injured_count === undefined && has("injured_names")) out.injured_count = estimateCount(out.injured_names);

  // place on the map when needed
  const district = (out.district ?? current?.district) as string | undefined;
  const needsPlacement =
    out.coord_source !== "manual" &&
    (!current || out.latitude === null || (out.district && out.district !== current.district && current.coord_source === "district"));
  if (district && needsPlacement) {
    const d = db.prepare("SELECT latitude, longitude, geo_name FROM districts WHERE name = ?").get(district) as
      { latitude: number; longitude: number; geo_name: string | null };
    const pt = placeInDistrict({ lat: d.latitude, lng: d.longitude }, d.geo_name, Date.now() % 1_000_000);
    out.latitude = pt.lat; out.longitude = pt.lng; out.coord_source = "district";
  }
  return out;
}

export function createIncident(input: Input, db: Database.Database = getDb()): Incident {
  const row = prepare(input, false, db);
  const next = db.prepare("SELECT COALESCE(MAX(source_sno),0)+1 n FROM incidents WHERE category = ?").get(row.category) as { n: number };
  row.source_sno = next.n;
  row.district_raw = row.district;
  const keys = Object.keys(row);
  const info = db
    .prepare(`INSERT INTO incidents (${keys.join(",")}) VALUES (${keys.map((k) => "@" + k).join(",")})`)
    .run(row);
  return getIncident(Number(info.lastInsertRowid), db)!;
}

export function updateIncident(id: number, input: Input, db: Database.Database = getDb()): Incident {
  const cur = getIncident(id, db);
  if (!cur) throw new ApiError(404, "Incident not found");
  const row = prepare(input, true, db, cur);
  const keys = Object.keys(row);
  if (keys.length) {
    db.prepare(`UPDATE incidents SET ${keys.map((k) => `${k}=@${k}`).join(",")}, updated_at=datetime('now') WHERE id=@__id`)
      .run({ ...row, __id: id });
  }
  return getIncident(id, db)!;
}

export function deleteIncident(id: number, db: Database.Database = getDb()): void {
  const r = db.prepare("DELETE FROM incidents WHERE id = ?").run(id);
  if (!r.changes) throw new ApiError(404, "Incident not found");
}
