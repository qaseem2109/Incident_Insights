import { NextRequest } from "next/server";
import { handle } from "@/lib/server/http";
import { getStats, parseFilters } from "@/lib/server/incidents";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Same filter parameters as /api/incidents – returns totals + breakdowns for the dashboard. */
export function GET(req: NextRequest) {
  return handle(() => getStats(parseFilters(req.nextUrl.searchParams)));
}
