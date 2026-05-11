"use client";
import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error(
    "NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set.",
  );
}

export const supabase: SupabaseClient = createBrowserClient(url, anonKey);

export type JobRow = {
  id: string;
  store_id: string | null;
  source_filename: string;
  storage_key: string;
  status: string;
  total_items: number;
  completed_items: number;
  failed_items: number;
  started_at: string | null;
  finished_at: string | null;
  error: string | null;
  meta: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type ProductRow = {
  id: string;
  store_id: string;
  job_item_id: string | null;
  source_url: string;
  source_supplier: string;
  title: string | null;
  description_raw: string | null;
  category: string | null;
  status: string;
  shopify_product_id: string | null;
  shopify_handle: string | null;
  created_at: string;
  updated_at: string;
};

export type StoreRow = {
  id: string;
  name: string;
  shop_domain: string;
  api_version: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};
