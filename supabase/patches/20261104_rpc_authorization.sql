-- Prepared from the live function definitions shared on 2026-11-04.
-- Review before running in Supabase SQL Editor. This script changes function
-- definitions and grants; do not run it against production without approval.
-- Authorization assumes every active profile belongs to an authorized
-- Dirección General secretary; the legacy perfil.rol value is not a gate.

BEGIN;

DO $preflight$
BEGIN
  IF to_regprocedure('public.asignar_tipo_documento(bigint,text)') IS NULL
     OR to_regprocedure('public.registrar_proveido(bigint,text,date,text,text,text,text)') IS NULL
     OR to_regprocedure('public.registrar_memo(bigint,text,date,text,text,text,text,text,text,text,bigint)') IS NULL
     OR to_regprocedure('public.registrar_proveido_con_adjunto(bigint,text,date,text,text,text,text,text,text,text,bigint)') IS NULL
     OR (
       SELECT count(*)
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = 'mesa_partes_2026'
         AND column_name IN (
           'id',
           'archivo',
           'archivo_data',
           'archivo_tipo',
           'archivo_tamano',
           'historial'
         )
     ) <> 6
  THEN
    RAISE EXCEPTION
      'RPC signature or expediente attachment schema changed; aborting without applying changes';
  END IF;
END;
$preflight$;

CREATE OR REPLACE FUNCTION public.asignar_tipo_documento(
  p_expediente_id bigint,
  p_tipo_documento text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_actor_id uuid := auth.uid();
  v_perfil public.perfiles%ROWTYPE;
  v_existente public.expediente_documentos%ROWTYPE;
  v_nuevo public.expediente_documentos%ROWTYPE;
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

  IF p_tipo_documento NOT IN ('Memo', 'Oficio') THEN
    RAISE EXCEPTION 'Tipo de documento no válido'
      USING ERRCODE = '22023';
  END IF;

  SELECT *
  INTO v_existente
  FROM public.expediente_documentos
  WHERE expediente_id = p_expediente_id
  FOR UPDATE;

  IF FOUND THEN
    IF v_existente.tipo_documento = p_tipo_documento THEN
      RAISE EXCEPTION 'Este expediente ya está registrado como %',
        v_existente.tipo_documento;
    ELSE
      RAISE EXCEPTION
        'Este expediente ya está registrado como %. No se puede cambiar a %',
        v_existente.tipo_documento,
        p_tipo_documento;
    END IF;
  END IF;

  INSERT INTO public.expediente_documentos (
    expediente_id,
    tipo_documento
  )
  VALUES (
    p_expediente_id,
    p_tipo_documento
  )
  RETURNING * INTO v_nuevo;

  RETURN jsonb_build_object(
    'id', v_nuevo.id,
    'expediente_id', v_nuevo.expediente_id,
    'tipo_documento', v_nuevo.tipo_documento
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.registrar_proveido(
  p_expediente_id bigint,
  p_nro_expediente text,
  p_fecha date,
  p_area_destino text,
  p_responsable text,
  p_instruccion text,
  p_estado text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_actor_id uuid := auth.uid();
  v_perfil public.perfiles%ROWTYPE;
  v_expediente public.mesa_partes_2026%ROWTYPE;
  v_proveido public.proveidos%ROWTYPE;
  v_historial jsonb;
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

  SELECT *
  INTO v_expediente
  FROM public.mesa_partes_2026
  WHERE id = p_expediente_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No se encontró el expediente %', p_expediente_id
      USING ERRCODE = 'P0002';
  END IF;

  v_historial := COALESCE(v_expediente.historial, '[]'::jsonb);

  INSERT INTO public.proveidos (
    expediente_id,
    nro_expediente,
    fecha,
    area_destino,
    responsable,
    instruccion,
    estado
  )
  VALUES (
    p_expediente_id,
    p_nro_expediente,
    p_fecha,
    p_area_destino,
    p_responsable,
    p_instruccion,
    p_estado
  )
  RETURNING * INTO v_proveido;

  v_historial := v_historial || jsonb_build_array(
    jsonb_build_object(
      'fechaHora', now(),
      'fechaIngreso', p_fecha,
      'areaOrigen', 'Proveído',
      'areaDestino', p_area_destino,
      'accion', 'Derivado',
      'observacion',
        'Expediente derivado mediante Proveído. Instrucción: '
        || p_instruccion,
      'responsable', p_responsable
    )
  );

  UPDATE public.mesa_partes_2026
  SET
    area_destino = p_area_destino,
    historial = v_historial
  WHERE id = p_expediente_id;

  RETURN to_jsonb(v_proveido);

EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION
      'No se pudo registrar el Proveído porque existe un registro duplicado';
END;
$function$;

CREATE OR REPLACE FUNCTION public.registrar_memo(
  p_expediente_id bigint,
  p_nro_expediente text,
  p_fecha date,
  p_asunto text,
  p_registrado_por text,
  p_area_destino text,
  p_responsable text,
  p_archivo text,
  p_archivo_data text,
  p_archivo_tipo text,
  p_archivo_tamano bigint
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_actor_id uuid := auth.uid();
  v_perfil public.perfiles%ROWTYPE;
  v_expediente public.mesa_partes_2026%ROWTYPE;
  v_memo public.memos%ROWTYPE;
  v_tipo_documento text;
  v_historial jsonb;
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

  SELECT *
  INTO v_expediente
  FROM public.mesa_partes_2026
  WHERE id = p_expediente_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No se encontró el expediente %', p_expediente_id;
  END IF;

  v_historial := COALESCE(v_expediente.historial, '[]'::jsonb);

  IF EXISTS (
    SELECT 1
    FROM public.memos
    WHERE expediente_id = p_expediente_id
  ) THEN
    RAISE EXCEPTION 'El expediente ya tiene un Memo registrado';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.expediente_documentos
    WHERE expediente_id = p_expediente_id
      AND tipo_documento = 'Oficio'
  ) THEN
    RAISE EXCEPTION 'El expediente ya está asociado a un Oficio';
  END IF;

  SELECT tipo_documento
  INTO v_tipo_documento
  FROM public.expediente_documentos
  WHERE expediente_id = p_expediente_id
  LIMIT 1;

  IF v_tipo_documento IS NULL THEN
    INSERT INTO public.expediente_documentos (
      expediente_id,
      tipo_documento
    )
    VALUES (
      p_expediente_id,
      'Memo'
    );
  END IF;

  INSERT INTO public.memos (
    nro_memo,
    expediente_id,
    nro_expediente,
    fecha,
    asunto,
    registrado_por,
    area_destino,
    responsable,
    estado,
    archivo,
    archivo_data,
    archivo_tipo,
    archivo_tamano
  )
  VALUES (
    nextval('public.memos_nro_seq'),
    p_expediente_id,
    p_nro_expediente,
    p_fecha,
    p_asunto,
    v_perfil.nombre,
    p_area_destino,
    p_responsable,
    'Pendiente',
    p_archivo,
    p_archivo_data,
    p_archivo_tipo,
    p_archivo_tamano
  )
  RETURNING * INTO v_memo;

  v_historial := v_historial || jsonb_build_array(
    jsonb_build_object(
      'fechaHora', now(),
      'fechaIngreso', p_fecha,
      'areaOrigen', 'Dirección General',
      'areaDestino', p_area_destino,
      'accion', 'Derivado',
      'observacion',
        'Expediente derivado mediante Memo '
        || COALESCE(v_memo.nro_memo::text, '')
        || '.',
      'responsable', v_perfil.nombre,
      'responsableDestino', p_responsable
    )
  );

  UPDATE public.mesa_partes_2026
  SET
    area = p_area_destino,
    area_destino = p_area_destino,
    entregado_a = '',
    historial = v_historial
  WHERE id = p_expediente_id
  RETURNING * INTO v_expediente;

  RETURN to_jsonb(v_memo)
    || jsonb_build_object('expediente', to_jsonb(v_expediente));

EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'El expediente ya tiene un Memo registrado';
END;
$function$;

CREATE OR REPLACE FUNCTION public.registrar_proveido_con_adjunto(
  p_expediente_id bigint,
  p_nro_expediente text,
  p_fecha date,
  p_area_destino text,
  p_responsable text,
  p_instruccion text,
  p_estado text,
  p_archivo text,
  p_archivo_data text,
  p_archivo_tipo text,
  p_archivo_tamano bigint
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_actor_id uuid := auth.uid();
  v_perfil public.perfiles%ROWTYPE;
  v_expediente public.mesa_partes_2026%ROWTYPE;
  v_proveido public.proveidos%ROWTYPE;
  v_historial jsonb;
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

  SELECT *
  INTO v_expediente
  FROM public.mesa_partes_2026
  WHERE id = p_expediente_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No se encontró el expediente %', p_expediente_id;
  END IF;

  v_historial := COALESCE(v_expediente.historial, '[]'::jsonb);

  INSERT INTO public.proveidos (
    expediente_id,
    nro_expediente,
    fecha,
    area_destino,
    responsable,
    instruccion,
    estado,
    archivo,
    archivo_data,
    archivo_tipo,
    archivo_tamano
  )
  VALUES (
    p_expediente_id,
    p_nro_expediente,
    p_fecha,
    p_area_destino,
    p_responsable,
    p_instruccion,
    p_estado,
    p_archivo,
    p_archivo_data,
    p_archivo_tipo,
    p_archivo_tamano
  )
  RETURNING * INTO v_proveido;

  v_historial := v_historial || jsonb_build_array(
    jsonb_build_object(
      'fechaHora', now(),
      'fechaIngreso', p_fecha,
      'areaOrigen', 'Proveído',
      'areaDestino', p_area_destino,
      'accion', 'Derivado',
      'observacion',
        'Expediente derivado mediante Proveído. Instrucción: '
        || p_instruccion,
      'responsable', p_responsable
    )
  );

  UPDATE public.mesa_partes_2026
  SET
    area_destino = p_area_destino,
    historial = v_historial
  WHERE id = p_expediente_id
  RETURNING * INTO v_expediente;

  RETURN to_jsonb(v_proveido)
    || jsonb_build_object('expediente', to_jsonb(v_expediente));

EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION
      'No se pudo registrar el Proveído porque existe un registro duplicado';
END;
$function$;

CREATE OR REPLACE FUNCTION public.adjuntar_documento_expediente(
  p_expediente_id bigint,
  p_archivo text,
  p_archivo_data text,
  p_archivo_tipo text,
  p_archivo_tamano bigint
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_actor_id uuid := auth.uid();
  v_perfil public.perfiles%ROWTYPE;
  v_expediente public.mesa_partes_2026%ROWTYPE;
  v_historial jsonb;
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

  IF p_archivo IS NULL
     OR btrim(p_archivo) = ''
     OR p_archivo_data IS NULL
     OR p_archivo_tipo IS NULL
     OR p_archivo_tamano IS NULL
     OR p_archivo_tamano <= 0
     OR p_archivo_tamano > 5242880
  THEN
    RAISE EXCEPTION 'Los datos del archivo no son válidos'
      USING ERRCODE = '22023';
  END IF;

  IF p_archivo !~* '\.(pdf|jpe?g|png)$'
     OR p_archivo_data NOT LIKE 'data:%;base64,%'
  THEN
    RAISE EXCEPTION 'El archivo debe ser PDF, JPG, JPEG o PNG'
      USING ERRCODE = '22023';
  END IF;

  SELECT *
  INTO v_expediente
  FROM public.mesa_partes_2026
  WHERE id = p_expediente_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No se encontró el expediente %', p_expediente_id
      USING ERRCODE = 'P0002';
  END IF;

  v_historial := COALESCE(v_expediente.historial, '[]'::jsonb)
    || jsonb_build_array(
      jsonb_build_object(
        'fechaHora', now(),
        'fechaIngreso', CURRENT_DATE,
        'areaOrigen', 'Dirección General',
        'areaDestino', 'Dirección General',
        'accion', 'Documento adjuntado',
        'observacion', 'Se adjuntó el documento ' || p_archivo || '.',
        'responsable', v_perfil.nombre
      )
    );

  UPDATE public.mesa_partes_2026
  SET
    archivo = p_archivo,
    archivo_data = p_archivo_data,
    archivo_tipo = p_archivo_tipo,
    archivo_tamano = p_archivo_tamano,
    historial = v_historial
  WHERE id = p_expediente_id
  RETURNING * INTO v_expediente;

  RETURN jsonb_build_object('expediente', to_jsonb(v_expediente));
END;
$function$;

REVOKE ALL ON FUNCTION public.asignar_tipo_documento(bigint, text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.asignar_tipo_documento(bigint, text)
  TO authenticated;

REVOKE ALL ON FUNCTION public.registrar_proveido(bigint, text, date, text, text, text, text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.registrar_proveido(bigint, text, date, text, text, text, text)
  TO authenticated;

REVOKE ALL ON FUNCTION public.registrar_memo(bigint, text, date, text, text, text, text, text, text, text, bigint)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.registrar_memo(bigint, text, date, text, text, text, text, text, text, text, bigint)
  TO authenticated;

REVOKE ALL ON FUNCTION public.registrar_proveido_con_adjunto(bigint, text, date, text, text, text, text, text, text, text, bigint)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.registrar_proveido_con_adjunto(bigint, text, date, text, text, text, text, text, text, text, bigint)
  TO authenticated;

REVOKE ALL ON FUNCTION public.adjuntar_documento_expediente(bigint, text, text, text, bigint)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.adjuntar_documento_expediente(bigint, text, text, text, bigint)
  TO authenticated;

COMMIT;
