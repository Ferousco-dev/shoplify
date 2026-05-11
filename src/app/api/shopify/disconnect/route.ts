import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function POST() {
  const s = await getSession();
  const domain = s.shopDomain;
  s.destroy();

  if (domain) {
    await supabaseAdmin
      .from("stores")
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq("shop_domain", domain);
  }

  return NextResponse.json({ ok: true });
}
