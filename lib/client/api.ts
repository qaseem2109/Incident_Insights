import {
  ApiValidationError,
  FilterOptions,
  FilterState,
  Incident,
  IncidentPayload,
  ListResponse,
  SortField,
  SortOrder,
  Stats,
} from "./types";

export function buildFilterSearchParams(filters: Partial<FilterState>): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.year && filters.year.length > 0) {
    params.set("year", filters.year.join("|"));
  }
  if (filters.month && filters.month.length > 0) {
    params.set("month", filters.month.join("|"));
  }
  if (filters.category) {
    params.set("category", filters.category);
  }
  if (filters.region) {
    params.set("region", filters.region);
  }
  if (filters.district && filters.district.length > 0) {
    params.set("district", filters.district.join("|"));
  }
  if (filters.head && filters.head.length > 0) {
    params.set("head", filters.head.join("|"));
  }
  if (filters.target && filters.target.length > 0) {
    params.set("target", filters.target.join("|"));
  }
  if (filters.claimed && filters.claimed.length > 0) {
    params.set("claimed", filters.claimed.join("|"));
  }
  if (filters.from) {
    params.set("from", filters.from);
  }
  if (filters.to) {
    params.set("to", filters.to);
  }
  if (filters.q && filters.q.trim()) {
    params.set("q", filters.q.trim());
  }
  return params;
}

async function handleJsonResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let body: unknown = null;
    try {
      body = await res.json();
    } catch {
      // ignore non-json
    }
    if (
      res.status === 422 &&
      body &&
      typeof body === "object" &&
      "fields" in body
    ) {
      const errObj = body as { error?: string; fields?: Record<string, string> };
      throw new ApiValidationError(
        errObj.error || "Validation failed",
        errObj.fields || {}
      );
    }
    const msg =
      body && typeof body === "object" && "error" in body
        ? String((body as { error: unknown }).error)
        : `Request failed with status ${res.status}`;
    throw new Error(msg);
  }
  return (await res.json()) as T;
}

export async function fetchFilterOptions(signal?: AbortSignal): Promise<FilterOptions> {
  const res = await fetch("/api/filters", { signal });
  return handleJsonResponse<FilterOptions>(res);
}

export interface FetchIncidentsOptions {
  filters: Partial<FilterState>;
  page?: number;
  pageSize?: number;
  sort?: SortField;
  order?: SortOrder;
  all?: boolean;
  signal?: AbortSignal;
}

export async function fetchIncidents(opts: FetchIncidentsOptions): Promise<ListResponse> {
  const params = buildFilterSearchParams(opts.filters);
  if (opts.all) {
    params.set("all", "1");
  } else {
    params.set("page", String(opts.page ?? 1));
    params.set("pageSize", String(opts.pageSize ?? 24));
  }
  if (opts.sort) params.set("sort", opts.sort);
  if (opts.order) params.set("order", opts.order);

  const qs = params.toString();
  const url = qs ? `/api/incidents?${qs}` : "/api/incidents";
  const res = await fetch(url, { signal: opts.signal });
  return handleJsonResponse<ListResponse>(res);
}

export async function fetchStats(
  filters: Partial<FilterState>,
  signal?: AbortSignal
): Promise<Stats> {
  const params = buildFilterSearchParams(filters);
  const qs = params.toString();
  const url = qs ? `/api/stats?${qs}` : "/api/stats";
  const res = await fetch(url, { signal });
  return handleJsonResponse<Stats>(res);
}

export async function createIncident(payload: IncidentPayload): Promise<Incident> {
  const res = await fetch("/api/incidents", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return handleJsonResponse<Incident>(res);
}

export async function updateIncident(
  id: number,
  payload: Partial<IncidentPayload>
): Promise<Incident> {
  const res = await fetch(`/api/incidents/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return handleJsonResponse<Incident>(res);
}

export async function deleteIncident(id: number): Promise<{ ok: boolean }> {
  const res = await fetch(`/api/incidents/${id}`, {
    method: "DELETE",
  });
  return handleJsonResponse<{ ok: boolean }>(res);
}

export function getExportUrl(filters: Partial<FilterState>): string {
  const params = buildFilterSearchParams(filters);
  const qs = params.toString();
  return qs ? `/api/export?${qs}` : "/api/export";
}
