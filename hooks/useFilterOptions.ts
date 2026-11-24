"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchFilterOptions } from "@/lib/client/api";
import { FilterOptions } from "@/lib/client/types";

export function useFilterOptions() {
  const [options, setOptions] = useState<FilterOptions | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    fetchFilterOptions(controller.signal)
      .then((data) => {
        setOptions(data);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(err instanceof Error ? err.message : "Failed to load filter options");
        setLoading(false);
      });

    return () => controller.abort();
  }, [nonce]);

  return { options, loading, error, reload };
}
