import { NextResponse } from "next/server";
import { requireStore } from "@/lib/session";
import { recoverStuckItems } from "@/lib/pipeline";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  const auth = await requireStore();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const url = new URL(req.url);
  const grace = Math.max(
    1,
    Math.min(60, Number(url.searchParams.get("graceMinutes") || "10")),
  );
  const result = await recoverStuckItems(auth.storeId, grace);
  return NextResponse.json({ ok: true, ...result });
}
