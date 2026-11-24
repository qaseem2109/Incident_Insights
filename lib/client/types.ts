export interface Incident {
  id: number;
  category: "MAJOR" | "OTHER";
  source_sno: number | null;
  incident_date: string | null;      // "2021-03-23"
  incident_time: string | null;      // "10:50"
  date_time_raw: string | null;      // original text e.g. "19.06.2020 at 1020 hrs"
  year: number | null;
  month: number | null;              // 1-12
  month_raw: string | null;
  head_of_crime: string;             // e.g. "Target Killing", "IED Blast", "Hand Grenade"
  target: string;                    // e.g. "Police", "Civilian", "Rangers"
  importance: string | null;         // "Importance of the Case"
  fir_details: string | null;
  district: string;                  // canonical, e.g. "Karachi East", "Larkana"
  district_raw: string | null;
  place: string | null;
  killed_names: string | null;       // multi-line free text ("1. Name\n2. Name")
  injured_names: string | null;
  accused: string | null;
  claimed_by: string | null;         // "SRA", "BLA", "Unclaimed", null …
  brief_details: string | null;
  killed_count: number | null;       // ESTIMATE (lower bound) – null = unknown
  injured_count: number | null;      // ESTIMATE
  latitude: number | null;
  longitude: number | null;
  coord_source: "district" | "manual"; // "district" = approximate position inside the district
  created_at: string;
  updated_at: string;
}

export interface Option {
  value: string | number;
  count: number;
}

export interface DistrictOption extends Option {
  region: "Karachi" | "Interior Sindh";
  latitude: number;
  longitude: number;
}

export interface FilterOptions {
  years: Option[];
  months: Option[];
  categories: Option[];
  districts: DistrictOption[];
  heads: Option[];
  targets: Option[];
  claimed: Option[];
  dateRange: { min: string; max: string };
}

export interface ListResponse {
  data: Incident[];
  total: number;
  page: number;
  pageSize: number;
  pages: number;
}

export interface Stats {
  totals: {
    incidents: number;
    major: number;
    other: number;
    killed_est: number;
    injured_est: number;
    unknown_counts: number;
  };
  byYear: { value: number; count: number; major: number }[];
  byMonth: Option[];
  byHead: Option[];
  byTarget: Option[];
  byDistrict: Option[];
  byClaimed: Option[];
  yearlyCasualties: {
    year: number;
    civilian_martyred: number | null;
    civilian_injured: number | null;
    leas_martyred: number | null;
    leas_injured: number | null;
  }[];
}

export type ViewMode = "cards" | "table" | "map" | "insights";

export type SortField = "date" | "id" | "district" | "head" | "target" | "category" | "killed" | "injured";
export type SortOrder = "asc" | "desc";

export interface FilterState {
  year: number[];
  month: number[];
  category: "MAJOR" | "OTHER" | "";
  region: "Karachi" | "Interior Sindh" | "";
  district: string[];
  head: string[];
  target: string[];
  claimed: string[];
  from: string;
  to: string;
  q: string;
}

export interface IncidentPayload {
  category: "MAJOR" | "OTHER";
  incident_date: string;
  incident_time?: string | null;
  head_of_crime: string;
  target: string;
  district: string;
  place?: string | null;
  importance?: string | null;
  fir_details?: string | null;
  brief_details?: string | null;
  killed_names?: string | null;
  injured_names?: string | null;
  accused?: string | null;
  claimed_by?: string | null;
  killed_count?: number | null;
  injured_count?: number | null;
  latitude?: number | null;
  longitude?: number | null;
}

export class ApiValidationError extends Error {
  fields: Record<string, string>;
  constructor(message: string, fields: Record<string, string> = {}) {
    super(message);
    this.name = "ApiValidationError";
    this.fields = fields;
  }
}
