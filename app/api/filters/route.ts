import { handle } from "@/lib/server/http";
import { getFilterOptions } from "@/lib/server/incidents";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Every dropdown / chip list the UI needs, with counts. */
export function GET() {
  return handle(() => getFilterOptions());
}
