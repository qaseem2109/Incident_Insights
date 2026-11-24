"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  FilterState,
  SortField,
  SortOrder,
  ViewMode,
} from "@/lib/client/types";
import { useDebounce } from "./useDebounce";

const VALID_VIEWS: ViewMode[] = ["cards", "table", "map", "insights"];
const VALID_SORTS: SortField[] = [
  "date",
  "id",
  "district",
  "head",
  "target",
  "category",
  "killed",
  "injured",
];

const VIEW_STORAGE_KEY = "sindh_incidents_last_view";

function parsePipeNumbers(raw: string | null): number[] {
  if (!raw) return [];
  return raw
    .split("|")
    .map((v) => Number(v.trim()))
    .filter((n) => Number.isInteger(n) && n > 0);
}

function parsePipeStrings(raw: string | null): string[] {
  if (!raw) return [];
  return raw
    .split("|")
    .map((v) => v.trim())
    .filter(Boolean);
}

export function useFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Read initial/current URL values
  const filtersFromUrl: FilterState = useMemo(() => {
    const rawCat = searchParams.get("category");
    const category = rawCat === "MAJOR" || rawCat === "OTHER" ? rawCat : "";
    const rawRegion = searchParams.get("region");
    const region =
      rawRegion === "Karachi" || rawRegion === "Interior Sindh" ? rawRegion : "";

    return {
      year: parsePipeNumbers(searchParams.get("year")),
      month: parsePipeNumbers(searchParams.get("month")),
      category,
      region,
      district: parsePipeStrings(searchParams.get("district")),
      head: parsePipeStrings(searchParams.get("head")),
      target: parsePipeStrings(searchParams.get("target")),
      claimed: parsePipeStrings(searchParams.get("claimed")),
      from: searchParams.get("from") || "",
      to: searchParams.get("to") || "",
      q: searchParams.get("q") || "",
    };
  }, [searchParams]);

  const [searchInput, setSearchInput] = useState<string>(filtersFromUrl.q);
  const debouncedSearch = useDebounce(searchInput, 300);

  // Sync external URL changes (back/forward) into searchInput
  useEffect(() => {
    setSearchInput(filtersFromUrl.q);
  }, [filtersFromUrl.q]);

  const view: ViewMode = useMemo(() => {
    const v = searchParams.get("view") as ViewMode | null;
    if (v && VALID_VIEWS.includes(v)) return v;
    if (typeof window !== "undefined") {
      const saved = window.localStorage.getItem(VIEW_STORAGE_KEY) as ViewMode | null;
      if (saved && VALID_VIEWS.includes(saved)) return saved;
    }
    return "cards";
  }, [searchParams]);

  const sort: SortField = useMemo(() => {
    const s = searchParams.get("sort") as SortField | null;
    return s && VALID_SORTS.includes(s) ? s : "date";
  }, [searchParams]);

  const order: SortOrder = useMemo(() => {
    const o = searchParams.get("order");
    return o === "asc" || o === "desc" ? o : "desc";
  }, [searchParams]);

  const page: number = useMemo(() => {
    const p = Number(searchParams.get("page"));
    return Number.isInteger(p) && p >= 1 ? p : 1;
  }, [searchParams]);

  const replaceUrl = useCallback(
    (mutator: (params: URLSearchParams) => void) => {
      const next = new URLSearchParams(searchParams.toString());
      mutator(next);
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  // Push debounced search query to URL
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    const trimmed = debouncedSearch.trim();
    if (trimmed === filtersFromUrl.q) return;
    replaceUrl((params) => {
      if (trimmed) {
        params.set("q", trimmed);
      } else {
        params.delete("q");
      }
      params.delete("page");
    });
  }, [debouncedSearch, filtersFromUrl.q, replaceUrl]);

  const setView = useCallback(
    (nextView: ViewMode) => {
      if (typeof window !== "undefined") {
        window.localStorage.setItem(VIEW_STORAGE_KEY, nextView);
      }
      replaceUrl((params) => {
        if (nextView === "cards") {
          params.delete("view");
        } else {
          params.set("view", nextView);
        }
      });
    },
    [replaceUrl]
  );

  const setSort = useCallback(
    (nextSort: SortField, nextOrder?: SortOrder) => {
      replaceUrl((params) => {
        const resolvedOrder =
          nextOrder ?? (sort === nextSort && order === "desc" ? "asc" : "desc");
        if (nextSort === "date" && resolvedOrder === "desc") {
          params.delete("sort");
          params.delete("order");
        } else {
          params.set("sort", nextSort);
          params.set("order", resolvedOrder);
        }
        params.delete("page");
      });
    },
    [order, replaceUrl, sort]
  );

  const setPage = useCallback(
    (nextPage: number) => {
      replaceUrl((params) => {
        if (nextPage <= 1) {
          params.delete("page");
        } else {
          params.set("page", String(nextPage));
        }
      });
    },
    [replaceUrl]
  );

  const updateFilters = useCallback(
    (patch: Partial<FilterState>) => {
      if (patch.q !== undefined) {
        setSearchInput(patch.q);
      }
      replaceUrl((params) => {
        const merged: FilterState = { ...filtersFromUrl, ...patch };

        if (merged.year.length > 0) params.set("year", merged.year.join("|"));
        else params.delete("year");

        if (merged.month.length > 0) params.set("month", merged.month.join("|"));
        else params.delete("month");

        if (merged.category) params.set("category", merged.category);
        else params.delete("category");

        if (merged.region) params.set("region", merged.region);
        else params.delete("region");

        if (merged.district.length > 0)
          params.set("district", merged.district.join("|"));
        else params.delete("district");

        if (merged.head.length > 0) params.set("head", merged.head.join("|"));
        else params.delete("head");

        if (merged.target.length > 0)
          params.set("target", merged.target.join("|"));
        else params.delete("target");

        if (merged.claimed.length > 0)
          params.set("claimed", merged.claimed.join("|"));
        else params.delete("claimed");

        if (merged.from) params.set("from", merged.from);
        else params.delete("from");

        if (merged.to) params.set("to", merged.to);
        else params.delete("to");

        if (patch.q !== undefined) {
          if (patch.q.trim()) params.set("q", patch.q.trim());
          else params.delete("q");
        }

        params.delete("page");
      });
    },
    [filtersFromUrl, replaceUrl]
  );

  const clearAllFilters = useCallback(() => {
    setSearchInput("");
    replaceUrl((params) => {
      const keepView = params.get("view");
      const keepSort = params.get("sort");
      const keepOrder = params.get("order");
      Array.from(params.keys()).forEach((k) => params.delete(k));
      if (keepView) params.set("view", keepView);
      if (keepSort) params.set("sort", keepSort);
      if (keepOrder) params.set("order", keepOrder);
    });
  }, [replaceUrl]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    count += filtersFromUrl.year.length;
    count += filtersFromUrl.month.length;
    if (filtersFromUrl.category) count += 1;
    if (filtersFromUrl.region) count += 1;
    count += filtersFromUrl.district.length;
    count += filtersFromUrl.head.length;
    count += filtersFromUrl.target.length;
    count += filtersFromUrl.claimed.length;
    if (filtersFromUrl.from) count += 1;
    if (filtersFromUrl.to) count += 1;
    if (filtersFromUrl.q) count += 1;
    return count;
  }, [filtersFromUrl]);

  return {
    filters: filtersFromUrl,
    searchInput,
    setSearchInput,
    view,
    setView,
    sort,
    order,
    setSort,
    page,
    setPage,
    updateFilters,
    clearAllFilters,
    activeFilterCount,
  };
}
