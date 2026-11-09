-- Add optional PDF/JPG/JPEG/PNG attachments to Oficios.
-- Review before running this patch in the Supabase SQL Editor.

BEGIN;

DO $preflight$
BEGIN
  IF to_regprocedure('public.registrar_oficio(jsonb)') IS NULL THEN
    RAISE EXCEPTION
      'public.registrar_oficio(jsonb) was not found; no changes were applied';
  END IF;
END;
$preflight$;

ALTER TABLE public.oficios
  ADD COLUMN IF NOT EXISTS archivo text,
  ADD COLUMN IF NOT EXISTS archivo_data text,
  ADD COLUMN IF NOT EXISTS archivo_tipo text,
  ADD COLUMN IF NOT EXISTS archivo_tamano bigint;

CREATE OR REPLACE FUNCTION public.registrar_oficio(p_datos jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_actor_id uuid := auth.uid();
  v_perfil public.perfiles%ROWTYPE;
  v_expediente public.mesa_partes_2026%ROWTYPE;
  v_oficio public.oficios%ROWTYPE;
  v_fecha date;
  v_anio integer;
  v_nro_expediente text;
  v_historial jsonb;
  v_archivo text;
  v_archivo_data text;
  v_archivo_tipo text;
  v_archivo_tamano bigint;
BEGIN
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Se requiere una sesión autenticada'
      USING ERRCODE = '28000';
  END IF;

  SELECT *
  INTO v_perfil
  FROM public.perfiles
  WHERE id = v_actor_id
    AND activo = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'El usuario no tiene un perfil activo'
      USING ERRCODE = '42501';
  END IF;

  IF NOT (
    v_perfil.rol IN ('MesaPartes', 'Administrador')
    OR (
      v_perfil.rol = 'AreaOperativa'
      AND v_perfil.area = 'Dirección General'
    )
  ) THEN
    RAISE EXCEPTION 'No tiene permiso para emitir Oficios'
      USING ERRCODE = '42501';
  END IF;

  IF p_datos IS NULL OR jsonb_typeof(p_datos) <> 'object' THEN
    RAISE EXCEPTION 'Los datos del Oficio deben ser un objeto JSON'
      USING ERRCODE = '22023';
  END IF;

  IF NULLIF(btrim(p_datos ->> 'expediente_id'), '') IS NULL THEN
    RAISE EXCEPTION 'El expediente es obligatorio'
      USING ERRCODE = '22023';
  END IF;

  SELECT *
  INTO v_expediente
  FROM public.mesa_partes_2026
  WHERE id = (p_datos ->> 'expediente_id')::bigint
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No se encontró el expediente'
      USING ERRCODE = 'P0002';
  END IF;

  IF v_expediente.estado = 'Archivado' THEN
    RAISE EXCEPTION 'No se puede registrar un Oficio para un expediente archivado'
      USING ERRCODE = '42501';
  END IF;

  IF v_expediente.nro_exp IS NULL THEN
    RAISE EXCEPTION 'El expediente no tiene número asignado'
      USING ERRCODE = '22023';
  END IF;

  IF NULLIF(btrim(p_datos ->> 'fecha'), '') IS NULL
     OR NULLIF(btrim(p_datos ->> 'destinatario'), '') IS NULL
     OR NULLIF(btrim(p_datos ->> 'asunto_detalle'), '') IS NULL
     OR NULLIF(btrim(p_datos ->> 'area_destino'), '') IS NULL
  THEN
    RAISE EXCEPTION 'Fecha, destinatario, detalle y área destinataria son obligatorios'
      USING ERRCODE = '22023';
  END IF;

  v_fecha := (p_datos ->> 'fecha')::date;
  v_anio := EXTRACT(YEAR FROM v_fecha)::integer;

  v_nro_expediente :=
    'EXP-'
    || EXTRACT(
      YEAR FROM COALESCE(v_expediente.fecha_ingreso, CURRENT_DATE)
    )::integer
    || '-'
    || lpad(v_expediente.nro_exp::text, 5, '0');

  v_archivo := NULLIF(btrim(p_datos ->> 'archivo'), '');
  v_archivo_data := NULLIF(p_datos ->> 'archivo_data', '');
  v_archivo_tipo := NULLIF(btrim(p_datos ->> 'archivo_tipo'), '');
  v_archivo_tamano := NULLIF(p_datos ->> 'archivo_tamano', '')::bigint;

  IF v_archivo IS NOT NULL
     OR v_archivo_data IS NOT NULL
     OR v_archivo_tipo IS NOT NULL
     OR v_archivo_tamano IS NOT NULL
  THEN
    IF v_archivo IS NULL
       OR v_archivo_data IS NULL
       OR v_archivo_tipo IS NULL
       OR v_archivo_tamano IS NULL
       OR v_archivo_tamano <= 0
       OR v_archivo_tamano > 5242880
    THEN
      RAISE EXCEPTION 'Los datos del archivo no son válidos (máximo 5 MB)'
        USING ERRCODE = '22023';
    END IF;

    IF v_archivo !~* '\.(pdf|jpe?g|png)$'
       OR v_archivo_tipo NOT IN ('application/pdf', 'image/jpeg', 'image/png')
       OR v_archivo_data NOT LIKE
         'data:' || v_archivo_tipo || ';base64,%'
    THEN
      RAISE EXCEPTION 'El adjunto debe ser un PDF, JPG, JPEG o PNG válido'
        USING ERRCODE = '22023';
    END IF;
  END IF;

  INSERT INTO public.oficios (
    expediente_id,
    nro_expediente,
    fecha,
    destinatario,
    asunto_tipo,
    asunto_detalle,
    responsable,
    codigo_oad,
    codigo_ogesup,
    anio,
    area_destino,
    estado,
    fecha_registro,
    created_at,
    archivo,
    archivo_data,
    archivo_tipo,
    archivo_tamano
  )
  VALUES (
    v_expediente.id,
    v_nro_expediente,
    v_fecha,
    btrim(p_datos ->> 'destinatario'),
    NULLIF(btrim(p_datos ->> 'asunto_tipo'), ''),
    btrim(p_datos ->> 'asunto_detalle'),
    NULLIF(btrim(p_datos ->> 'responsable'), ''),
    NULLIF(btrim(p_datos ->> 'codigo_oad'), ''),
    NULLIF(btrim(p_datos ->> 'codigo_ogesup'), ''),
    v_anio,
    btrim(p_datos ->> 'area_destino'),
    'Enviado',
    now(),
    now(),
    v_archivo,
    v_archivo_data,
    v_archivo_tipo,
    v_archivo_tamano
  )
  RETURNING * INTO v_oficio;

  v_historial := COALESCE(v_expediente.historial, '[]'::jsonb)
    || jsonb_build_array(
      jsonb_build_object(
        'fechaHora', now(),
        'fechaIngreso', v_fecha,
        'areaOrigen', v_perfil.area,
        'areaDestino', btrim(p_datos ->> 'area_destino'),
        'accion', 'Oficio registrado',
        'observacion',
          'Oficio '
          || v_oficio.n_registro::text
          || ' dirigido a '
          || btrim(p_datos ->> 'destinatario')
          || '.',
        'responsable', v_perfil.nombre
      )
    );

  -- The recipient does not change the expediente's area or status.
  UPDATE public.mesa_partes_2026
  SET historial = v_historial
  WHERE id = v_expediente.id
  RETURNING * INTO v_expediente;

  INSERT INTO public.expediente_eventos (
    expediente_id,
    actor_id,
    actor_rol,
    area_propietaria,
    tipo_evento,
    estado_anterior,
    estado_nuevo,
    detalle
  )
  VALUES (
    v_expediente.id,
    v_actor_id,
    v_perfil.rol,
    'Dirección General',
    'oficio_registrado',
    v_expediente.estado,
    v_expediente.estado,
    jsonb_build_object(
      'oficio_id', v_oficio.id,
      'n_registro', v_oficio.n_registro,
      'destinatario', v_oficio.destinatario,
      'area_destino', v_oficio.area_destino,
      'archivo', v_oficio.archivo
    )
  );

  RETURN to_jsonb(v_oficio)
    || jsonb_build_object(
      'expediente',
      jsonb_build_object(
        'id', v_expediente.id,
        'estado', v_expediente.estado,
        'historial', v_expediente.historial
      )
    );
END;
$function$;

COMMIT;
