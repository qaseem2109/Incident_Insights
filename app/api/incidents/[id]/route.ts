import { NextRequest } from "next/server";
import { handle, parseId } from "@/lib/server/http";
import { ApiError, deleteIncident, getIncident, updateIncident } from "@/lib/server/incidents";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export function GET(_req: NextRequest, { params }: Ctx) {
  return handle(async () => {
    const row = getIncident(parseId((await params).id));
    if (!row) throw new ApiError(404, "Incident not found");
    return row;
  });
}

/** PUT /api/incidents/:id – send only the fields you want to change. */
export function PUT(req: NextRequest, { params }: Ctx) {
  return handle(async () => updateIncident(parseId((await params).id), await req.json().catch(() => ({}))));
}

export function DELETE(_req: NextRequest, { params }: Ctx) {
  return handle(async () => {
    deleteIncident(parseId((await params).id));
    return { ok: true };
  });
}
