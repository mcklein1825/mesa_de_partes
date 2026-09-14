create table if not exists public.expedientes (
  id text primary key,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists expedientes_set_updated_at on public.expedientes;
create trigger expedientes_set_updated_at
before update on public.expedientes
for each row execute function public.set_updated_at();

alter table public.expedientes enable row level security;

drop policy if exists "expedientes_select_anon" on public.expedientes;
create policy "expedientes_select_anon"
on public.expedientes for select
to anon
using (true);

drop policy if exists "expedientes_insert_anon" on public.expedientes;
create policy "expedientes_insert_anon"
on public.expedientes for insert
to anon
with check (true);

drop policy if exists "expedientes_update_anon" on public.expedientes;
create policy "expedientes_update_anon"
on public.expedientes for update
to anon
using (true)
with check (true);
