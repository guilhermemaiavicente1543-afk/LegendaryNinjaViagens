-- LN Digital / ShinobiDex — ANCED curado
-- Rode no SQL Editor do Supabase antes do apply.

alter table public.technique_catalog
  add column if not exists anced_curated_rank text,
  add column if not exists anced_curated_total integer,
  add column if not exists anced_curated_details text,
  add column if not exists anced_curated_status text,
  add column if not exists anced_curated_batch text,
  add column if not exists anced_curated_payload jsonb,
  add column if not exists anced_curated_at timestamptz,
  add column if not exists anced_needs_review boolean default false;

create index if not exists technique_catalog_anced_curated_rank_idx
  on public.technique_catalog (anced_curated_rank);

create index if not exists technique_catalog_anced_curated_status_idx
  on public.technique_catalog (anced_curated_status);
