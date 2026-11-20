create table if not exists public.memorandos_multiples (
  id uuid primary key default gen_random_uuid(),
  expediente_id bigint references public.mesa_partes_2026(id),
  nro_expediente text not null default '',
  nro_registro integer not null,
  fecha date not null default current_date,
  asunto text not null,
  realizado_por text not null default 'No registrado',
  estado text not null default 'Pendiente'
    check (estado in ('Pendiente', 'Entregado', 'Atendido')),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

alter table public.memorandos_multiples
  add column if not exists expediente_id bigint references public.mesa_partes_2026(id),
  add column if not exists nro_expediente text not null default '';

create table if not exists public.memorandos_multiples_destinatarios (
  id uuid primary key default gen_random_uuid(),
  memorando_id uuid not null references public.memorandos_multiples(id) on delete cascade,
  categoria text not null
    check (categoria in ('Área / Jefatura', 'Consejo Directivo', 'Comité', 'Grupo institucional')),
  nombre text not null,
  medio_entrega text not null
    check (medio_entrega in ('Correo', 'Presencial')),
  estado text not null default 'Pendiente'
    check (estado in ('Pendiente', 'Entregado', 'Atendido')),
  observacion text,
  fecha_entrega date,
  created_at timestamptz not null default now()
);

create index if not exists memorandos_multiples_fecha_idx
  on public.memorandos_multiples (fecha desc);
create index if not exists memorandos_multiples_expediente_idx
  on public.memorandos_multiples (expediente_id);
create index if not exists memorandos_multiples_destinatarios_memo_idx
  on public.memorandos_multiples_destinatarios (memorando_id);
create index if not exists memorandos_multiples_destinatarios_categoria_idx
  on public.memorandos_multiples_destinatarios (categoria);
create unique index if not exists memorandos_multiples_numero_anual_idx
  on public.memorandos_multiples (extract(year from fecha), nro_registro);

alter table public.memorandos_multiples enable row level security;
alter table public.memorandos_multiples_destinatarios enable row level security;

drop policy if exists memorandos_multiples_select_authenticated
  on public.memorandos_multiples;
create policy memorandos_multiples_select_authenticated
  on public.memorandos_multiples for select to authenticated
  using (true);

drop policy if exists memorandos_multiples_destinatarios_select_authenticated
  on public.memorandos_multiples_destinatarios;
create policy memorandos_multiples_destinatarios_select_authenticated
  on public.memorandos_multiples_destinatarios for select to authenticated
  using (true);

drop function if exists public.registrar_memorando_multiple(date, text, jsonb);

create or replace function public.registrar_memorando_multiple(
  p_expediente_id bigint,
  p_nro_expediente text,
  p_fecha date,
  p_asunto text,
  p_destinatarios jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $memorando$
declare
  v_id uuid;
  v_registro integer;
  v_realizado_por text;
  v_anio integer := extract(year from p_fecha)::integer;
begin
  if auth.uid() is null then
    raise exception 'Sesión no autenticada';
  end if;

  if p_expediente_id is null or nullif(trim(p_nro_expediente), '') is null then
    raise exception 'El expediente relacionado es obligatorio';
  end if;

  if not exists (
    select 1 from public.mesa_partes_2026
    where id = p_expediente_id
  ) then
    raise exception 'El expediente relacionado no existe';
  end if;

  perform pg_advisory_xact_lock(hashtext('memorandos_multiples_' || v_anio::text));

  if nullif(trim(p_asunto), '') is null then
    raise exception 'El asunto es obligatorio';
  end if;

  if jsonb_typeof(p_destinatarios) <> 'array' or jsonb_array_length(p_destinatarios) = 0 then
    raise exception 'Debe registrar al menos un destinatario';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_destinatarios) item
    where item->>'categoria' not in ('Área / Jefatura', 'Consejo Directivo', 'Comité', 'Grupo institucional')
      or item->>'medio_entrega' not in ('Correo', 'Presencial')
      or nullif(trim(item->>'nombre'), '') is null
  ) then
    raise exception 'Destinatario inválido';
  end if;

  select coalesce(max(nro_registro), 0) + 1
    into v_registro
    from public.memorandos_multiples
   where extract(year from fecha)::integer = v_anio;

  select coalesce(nullif(trim(nombre), ''), 'No registrado')
    into v_realizado_por
    from public.perfiles
   where id = auth.uid()
   limit 1;

  insert into public.memorandos_multiples (
    expediente_id, nro_expediente, nro_registro, fecha, asunto, realizado_por, created_by
  )
  values (
    p_expediente_id, trim(p_nro_expediente), v_registro, p_fecha, trim(p_asunto), v_realizado_por, auth.uid()
  )
  returning id into v_id;

  insert into public.memorandos_multiples_destinatarios (
    memorando_id, categoria, nombre, medio_entrega
  )
  select
    v_id,
    item->>'categoria',
    trim(item->>'nombre'),
    item->>'medio_entrega'
  from jsonb_array_elements(p_destinatarios) item;

  return jsonb_build_object(
    'id', v_id,
    'expediente_id', p_expediente_id,
    'nro_expediente', trim(p_nro_expediente),
    'nro_registro', v_registro,
    'fecha', p_fecha,
    'asunto', trim(p_asunto),
    'realizado_por', v_realizado_por,
    'estado', 'Pendiente',
    'created_at', now(),
    'memorandos_multiples_destinatarios', (
      select jsonb_agg(to_jsonb(destinatario))
      from public.memorandos_multiples_destinatarios destinatario
      where destinatario.memorando_id = v_id
    )
  );
end;
$memorando$;

revoke all on function public.registrar_memorando_multiple(bigint, text, date, text, jsonb)
  from public, anon;
grant execute on function public.registrar_memorando_multiple(bigint, text, date, text, jsonb)
  to authenticated;
