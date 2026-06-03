-- Tabela opcional para o Painel ADM corrigir ranks ANCED sem apagar a curadoria original.
-- A verdade final do RPG pode vir daqui quando override_status = 'approved'.

create table if not exists public.anced_overrides (
  id uuid primary key default gen_random_uuid(),
  technique_id uuid not null references public.technique_catalog(id) on delete cascade,
  override_rank text,
  override_total integer,
  override_details text,
  override_payload jsonb,
  reason text,
  override_status text not null default 'pending',
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists anced_overrides_technique_id_idx
  on public.anced_overrides (technique_id);

create index if not exists anced_overrides_status_idx
  on public.anced_overrides (override_status);

-- Ajuste RLS conforme o padrão do seu ADM.
-- Sugestão: habilitar RLS e permitir escrita apenas para admins.
-- alter table public.anced_overrides enable row level security;
