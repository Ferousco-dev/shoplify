-- Store per-store integration credentials (Airtable, etc.)
-- Run this once in the Supabase SQL editor.
create table if not exists public.store_integrations (
  id               uuid primary key default gen_random_uuid(),
  store_id         uuid not null references public.stores(id) on delete cascade,
  integration_type varchar(64) not null,
  config           jsonb not null default '{}'::jsonb,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (store_id, integration_type)
);

-- Add meta column to job_items for storing airtable_record_id etc.
alter table public.job_items
  add column if not exists meta jsonb not null default '{}'::jsonb;
