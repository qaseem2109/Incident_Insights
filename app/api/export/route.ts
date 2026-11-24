import { NextRequest } from "next/server";
import { buildWorkbook } from "@/lib/server/export";
import { handle } from "@/lib/server/http";
import { incidentsForExport, parseFilters } from "@/lib/server/incidents";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/export?year=2021&month=3  → downloads an .xlsx in the same layout as the source workbook. */
export function GET(req: NextRequest) {
  return handle(async () => {
    const f = parseFilters(req.nextUrl.searchParams);
    const rows = incidentsForExport(f);
    const buf = await buildWorkbook(rows, f);
    const tag = [f.year.join("-"), f.month.length ? "m" + f.month.join("-") : ""].filter(Boolean).join("_") || "all";
    return new Response(new Uint8Array(buf), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="Sindh_Incidents_${tag}.xlsx"`,
        "X-Row-Count": String(rows.length),
        "Cache-Control": "no-store",
      },
    });
  });
}
