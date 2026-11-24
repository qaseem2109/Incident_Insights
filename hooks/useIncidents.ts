"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchIncidents } from "@/lib/client/api";
import {
  FilterState,
  Incident,
  SortField,
  SortOrder,
} from "@/lib/client/types";

interface UseIncidentsParams {
  filters: FilterState;
  page?: number;
  pageSize?: number;
  sort?: SortField;
  order?: SortOrder;
  all?: boolean;
  enabled?: boolean;
}

export function useIncidents({
  filters,
  page = 1,
  pageSize = 24,
  sort = "date",
  order = "desc",
  all = false,
  enabled = true,
}: UseIncidentsParams) {
  const [data, setData] = useState<Incident[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [pages, setPages] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(enabled);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  const refetch = useCallback(() => setNonce((n) => n + 1), []);

  const filterKey = JSON.stringify(filters);

  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    fetchIncidents({
      filters,
      page,
      pageSize,
      sort,
      order,
      all,
      signal: controller.signal,
    })
      .then((res) => {
        setData(res.data);
        setTotal(res.total);
        setPages(res.pages);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(err instanceof Error ? err.message : "Failed to load incidents");
        setLoading(false);
      });

    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterKey, page, pageSize, sort, order, all, enabled, nonce]);

  return { data, total, pages, loading, error, refetch };
}
