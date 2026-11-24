"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchStats } from "@/lib/client/api";
import { FilterState, Stats } from "@/lib/client/types";

export function useStats(filters: FilterState) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  const refetch = useCallback(() => setNonce((n) => n + 1), []);
  const filterKey = JSON.stringify(filters);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    fetchStats(filters, controller.signal)
      .then((res) => {
        setStats(res);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(err instanceof Error ? err.message : "Failed to load statistics");
        setLoading(false);
      });

    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterKey, nonce]);

  return { stats, loading, error, refetch };
}
