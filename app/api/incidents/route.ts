import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { handle } from "@/lib/server/http";
import { createIncident, listIncidents, parseFilters } from "@/lib/server/incidents";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/incidents?year=2021&month=3|4&district=Karachi East&q=police&page=1&pageSize=24&sort=date&order=desc
 *  Add `all=1` to get every matching row in one response (used for the map). */
export function GET(req: NextRequest) {
  return handle(() => {
    const sp = req.nextUrl.searchParams;
    return listIncidents(parseFilters(sp), {
      sort: sp.get("sort") ?? undefined,
      order: sp.get("order") ?? undefined,
      page: Number(sp.get("page")) || 1,
      pageSize: Number(sp.get("pageSize")) || 24,
      all: sp.get("all") === "1",
    });
  });
}

/** POST /api/incidents  (JSON body) – creates an incident, returns it with 201. */
export function POST(req: NextRequest) {
  return handle(async () => {
    const body = await req.json().catch(() => ({}));
    return NextResponse.json(createIncident(body), { status: 201 });
  });
}
