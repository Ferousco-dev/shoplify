import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getSession } from "@/lib/session";

export type StoreSummary = {
  id: string;
  name: string;
  shop_domain: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("stores")
    .select("id, name, shop_domain, is_active, created_at, updated_at")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ stores: (data ?? []) as StoreSummary[] });
}

export async function DELETE(req: Request) {
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  const mode = url.searchParams.get("mode") || "hard";

  if (!id) {
    return NextResponse.json({ error: "id query param required" }, { status: 400 });
  }

  const { data: store, error: fetchErr } = await supabaseAdmin
    .from("stores")
    .select("id, shop_domain")
    .eq("id", id)
    .maybeSingle();
  if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 });
  if (!store) return NextResponse.json({ error: "Store not found" }, { status: 404 });

  if (mode === "soft") {
    const { error } = await supabaseAdmin
      .from("stores")
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  } else {
    const { error } = await supabaseAdmin.from("stores").delete().eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const session = await getSession();
  if (session.shopDomain === store.shop_domain) {
    session.destroy();
  }

  return NextResponse.json({ ok: true });
}
