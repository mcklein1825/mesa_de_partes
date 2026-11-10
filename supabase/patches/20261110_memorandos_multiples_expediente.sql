alter table public.memorandos_multiples
  add column if not exists expediente_id bigint references public.mesa_partes_2026(id),
  add column if not exists nro_expediente text not null default '';

create index if not exists memorandos_multiples_expediente_idx
  on public.memorandos_multiples (expediente_id);

drop function if exists public.registrar_memorando_multiple(date, text, jsonb);

notify pgrst, 'reload schema';
