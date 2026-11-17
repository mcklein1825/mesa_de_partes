-- Adjunto (PDF, JPG o PNG, máximo 5 MB) para Memorandos múltiples.
--
-- Además, al editar un memorando múltiple ya no se pierde el estado, la observación ni la
-- fecha de entrega de cada destinatario (antes se borraban y todos volvían a "Pendiente").
--
-- Cómo usarlo: pegar todo este archivo en Supabase > SQL Editor y pulsar Run.
-- Requiere haber ejecutado antes 20261111_document_crud.sql. Es seguro ejecutarlo más de una vez.
begin;

do $preflight$
begin
  if to_regprocedure('public.document_actor_is_authenticated()') is null then
    raise exception 'Primero ejecute 20261111_document_crud.sql; no se aplicó ningún cambio';
  end if;
  if to_regclass('public.memorandos_multiples') is null then
    raise exception 'No existe la tabla memorandos_multiples; no se aplicó ningún cambio';
  end if;
end;
$preflight$;

alter table public.memorandos_multiples
  add column if not exists archivo text,
  add column if not exists archivo_data text,
  add column if not exists archivo_tipo text,
  add column if not exists archivo_tamano bigint;

-- Valida los datos del adjunto: devuelve false si no hay adjunto y true si hay uno válido.
-- Misma regla que los Oficios: PDF/JPG/JPEG/PNG, máximo 5 MB.
create or replace function public.validar_adjunto_documento(
  p_archivo text,
  p_archivo_data text,
  p_archivo_tipo text,
  p_archivo_tamano bigint
)
returns boolean
language plpgsql
immutable
set search_path to ''
as $$
begin
  if p_archivo is null and p_archivo_data is null and p_archivo_tipo is null and p_archivo_tamano is null then
    return false;
  end if;

  if p_archivo is null or p_archivo_data is null or p_archivo_tipo is null
     or p_archivo_tamano is null or p_archivo_tamano <= 0 or p_archivo_tamano > 5242880 then
    raise exception 'Los datos del archivo no son válidos (máximo 5 MB)' using errcode = '22023';
  end if;

  if p_archivo !~* '\.(pdf|jpe?g|png)$'
     or p_archivo_tipo not in ('application/pdf', 'image/jpeg', 'image/png')
     or p_archivo_data not like 'data:' || p_archivo_tipo || ';base64,%' then
    raise exception 'Solo se permiten archivos PDF, JPG, JPEG o PNG' using errcode = '22023';
  end if;

  return true;
end;
$$;

revoke all on function public.validar_adjunto_documento(text, text, text, bigint) from public, anon;
grant execute on function public.validar_adjunto_documento(text, text, text, bigint) to authenticated;

-- ---------------------------------------------------------------------------
-- Registrar: se reemplaza la función por una que acepta el adjunto (opcional).
-- ---------------------------------------------------------------------------
drop function if exists public.registrar_memorando_multiple(bigint, text, date, text, jsonb);

create or replace function public.registrar_memorando_multiple(
  p_expediente_id bigint,
  p_nro_expediente text,
  p_fecha date,
  p_asunto text,
  p_destinatarios jsonb,
  p_archivo text default null,
  p_archivo_data text default null,
  p_archivo_tipo text default null,
  p_archivo_tamano bigint default null
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
  v_tiene_archivo boolean;
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

  v_tiene_archivo := public.validar_adjunto_documento(
    nullif(btrim(p_archivo), ''), nullif(p_archivo_data, ''), nullif(btrim(p_archivo_tipo), ''), p_archivo_tamano
  );

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
    expediente_id, nro_expediente, nro_registro, fecha, asunto, realizado_por, created_by,
    archivo, archivo_data, archivo_tipo, archivo_tamano
  )
  values (
    p_expediente_id, trim(p_nro_expediente), v_registro, p_fecha, trim(p_asunto), v_realizado_por, auth.uid(),
    case when v_tiene_archivo then btrim(p_archivo) end,
    case when v_tiene_archivo then p_archivo_data end,
    case when v_tiene_archivo then btrim(p_archivo_tipo) end,
    case when v_tiene_archivo then p_archivo_tamano end
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

  return (
    select to_jsonb(m) || jsonb_build_object(
      'memorandos_multiples_destinatarios', (
        select jsonb_agg(to_jsonb(destinatario))
        from public.memorandos_multiples_destinatarios destinatario
        where destinatario.memorando_id = v_id
      )
    )
    from public.memorandos_multiples m
    where m.id = v_id
  );
end;
$memorando$;

revoke all on function public.registrar_memorando_multiple(bigint, text, date, text, jsonb, text, text, text, bigint)
  from public, anon;
grant execute on function public.registrar_memorando_multiple(bigint, text, date, text, jsonb, text, text, text, bigint)
  to authenticated;

-- ---------------------------------------------------------------------------
-- Actualizar: acepta un adjunto nuevo (si no se envía, se conserva el actual) y conserva el
-- estado, la observación y la fecha de entrega de los destinatarios que siguen en la lista.
-- ---------------------------------------------------------------------------
drop function if exists public.actualizar_memorando_multiple(uuid, date, text, jsonb);

create or replace function public.actualizar_memorando_multiple(
  p_id uuid,
  p_fecha date,
  p_asunto text,
  p_destinatarios jsonb,
  p_archivo text default null,
  p_archivo_data text default null,
  p_archivo_tipo text default null,
  p_archivo_tamano bigint default null
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_row jsonb;
  v_tiene_archivo boolean;
begin
  if not public.document_actor_is_authenticated() then
    raise exception 'Se requiere una sesión autenticada' using errcode = '42501';
  end if;

  if nullif(trim(coalesce(p_asunto, '')), '') is null then
    raise exception 'El asunto es obligatorio';
  end if;

  if p_destinatarios is null or jsonb_typeof(p_destinatarios) <> 'array' or jsonb_array_length(p_destinatarios) = 0 then
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

  v_tiene_archivo := public.validar_adjunto_documento(
    nullif(btrim(p_archivo), ''), nullif(p_archivo_data, ''), nullif(btrim(p_archivo_tipo), ''), p_archivo_tamano
  );

  update public.memorandos_multiples
  set fecha = p_fecha,
      asunto = trim(p_asunto),
      archivo = case when v_tiene_archivo then btrim(p_archivo) else archivo end,
      archivo_data = case when v_tiene_archivo then p_archivo_data else archivo_data end,
      archivo_tipo = case when v_tiene_archivo then btrim(p_archivo_tipo) else archivo_tipo end,
      archivo_tamano = case when v_tiene_archivo then p_archivo_tamano else archivo_tamano end
  where id = p_id;

  if not found then
    raise exception 'No se encontró el memorando múltiple' using errcode = 'P0002';
  end if;

  -- Quitar solo los destinatarios que ya no están en la lista.
  delete from public.memorandos_multiples_destinatarios d
  where d.memorando_id = p_id
    and not exists (
      select 1
      from jsonb_array_elements(p_destinatarios) item
      where lower(trim(item->>'nombre')) = lower(trim(d.nombre))
        and item->>'categoria' = d.categoria
    );

  -- Los que siguen conservan su estado; solo se actualiza el medio de entrega.
  update public.memorandos_multiples_destinatarios d
  set medio_entrega = item->>'medio_entrega'
  from jsonb_array_elements(p_destinatarios) item
  where d.memorando_id = p_id
    and lower(trim(item->>'nombre')) = lower(trim(d.nombre))
    and item->>'categoria' = d.categoria;

  -- Agregar los destinatarios nuevos.
  insert into public.memorandos_multiples_destinatarios (memorando_id, categoria, nombre, medio_entrega)
  select p_id, nuevo.categoria, nuevo.nombre, nuevo.medio_entrega
  from (
    select distinct on (item->>'categoria', lower(trim(item->>'nombre')))
      item->>'categoria' as categoria,
      trim(item->>'nombre') as nombre,
      item->>'medio_entrega' as medio_entrega
    from jsonb_array_elements(p_destinatarios) item
  ) nuevo
  where not exists (
    select 1
    from public.memorandos_multiples_destinatarios d
    where d.memorando_id = p_id
      and lower(trim(d.nombre)) = lower(nuevo.nombre)
      and d.categoria = nuevo.categoria
  );

  select to_jsonb(m) || jsonb_build_object(
    'memorandos_multiples_destinatarios', (
      select jsonb_agg(to_jsonb(d) order by d.created_at, d.id)
      from public.memorandos_multiples_destinatarios d
      where d.memorando_id = p_id
    )
  )
  into v_row
  from public.memorandos_multiples m
  where m.id = p_id;

  return v_row;
end;
$$;

revoke all on function public.actualizar_memorando_multiple(uuid, date, text, jsonb, text, text, text, bigint)
  from public, anon;
grant execute on function public.actualizar_memorando_multiple(uuid, date, text, jsonb, text, text, text, bigint)
  to authenticated;

commit;

notify pgrst, 'reload schema';
