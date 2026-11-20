-- Secure CRUD operations for authenticated document users.
-- Run after the document tables and their attachment columns exist.
BEGIN;

CREATE OR REPLACE FUNCTION public.document_actor_is_authenticated()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $$
  SELECT auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.perfiles
      WHERE id = auth.uid() AND activo = true
    );
$$;

CREATE OR REPLACE FUNCTION public.actualizar_documento(
  p_tipo text,
  p_id bigint,
  p_datos jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_table text;
  v_row jsonb;
  v_assignments text;
BEGIN
  IF NOT public.document_actor_is_authenticated() THEN
    RAISE EXCEPTION 'Se requiere una sesión autenticada' USING ERRCODE = '42501';
  END IF;
  v_table := CASE p_tipo
    WHEN 'expediente' THEN 'mesa_partes_2026'
    WHEN 'memo' THEN 'memos'
    WHEN 'oficio' THEN 'oficios'
    WHEN 'proveido' THEN 'proveidos'
    ELSE NULL
  END;
  IF v_table IS NULL OR p_datos ? 'id' THEN
    RAISE EXCEPTION 'Tipo de documento o datos no válidos' USING ERRCODE = '22023';
  END IF;
  SELECT string_agg(format('%I = incoming.%I', key, key), ', ')
    INTO v_assignments
    FROM jsonb_object_keys(p_datos) AS keys(key)
    WHERE key <> 'id';
  IF v_assignments IS NULL THEN
    RAISE EXCEPTION 'No hay campos para actualizar' USING ERRCODE = '22023';
  END IF;
  EXECUTE format(
    'UPDATE public.%I AS target SET %s
     FROM jsonb_populate_record(NULL::public.%I, $2) AS incoming
     WHERE target.id = $1 RETURNING to_jsonb(target.*)',
    v_table, v_assignments, v_table
  ) INTO v_row USING p_id, p_datos;
  IF v_row IS NULL THEN
    RAISE EXCEPTION 'No se encontró el documento' USING ERRCODE = 'P0002';
  END IF;
  RETURN v_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.actualizar_memorando_multiple(
  p_id uuid,
  p_fecha date,
  p_asunto text,
  p_destinatarios jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE v_row jsonb;
BEGIN
  IF NOT public.document_actor_is_authenticated() THEN
    RAISE EXCEPTION 'Se requiere una sesión autenticada' USING ERRCODE = '42501';
  END IF;
  UPDATE public.memorandos_multiples
  SET fecha = p_fecha, asunto = p_asunto
  WHERE id = p_id
  RETURNING to_jsonb(memorandos_multiples.*) INTO v_row;
  IF v_row IS NULL THEN
    RAISE EXCEPTION 'No se encontró el memorando múltiple' USING ERRCODE = 'P0002';
  END IF;
  DELETE FROM public.memorandos_multiples_destinatarios WHERE memorando_id = p_id;
  INSERT INTO public.memorandos_multiples_destinatarios
    (memorando_id, categoria, nombre, medio_entrega)
  SELECT p_id, item->>'categoria', item->>'nombre', item->>'medio_entrega'
  FROM jsonb_array_elements(p_destinatarios) item;
  RETURN v_row || jsonb_build_object(
    'memorandos_multiples_destinatarios',
    (SELECT jsonb_agg(to_jsonb(d)) FROM public.memorandos_multiples_destinatarios d WHERE d.memorando_id = p_id)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.eliminar_documento(p_tipo text, p_id text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE v_table text; v_deleted integer;
BEGIN
  IF NOT public.document_actor_is_authenticated() THEN
    RAISE EXCEPTION 'Se requiere una sesión autenticada' USING ERRCODE = '42501';
  END IF;
  v_table := CASE p_tipo
    WHEN 'expediente' THEN 'mesa_partes_2026'
    WHEN 'memo' THEN 'memos'
    WHEN 'oficio' THEN 'oficios'
    WHEN 'proveido' THEN 'proveidos'
    WHEN 'memorando_multiple' THEN 'memorandos_multiples'
    ELSE NULL
  END;
  IF v_table IS NULL THEN
    RAISE EXCEPTION 'Tipo de documento no válido' USING ERRCODE = '22023';
  END IF;
  IF p_tipo = 'memorando_multiple' THEN
    DELETE FROM public.memorandos_multiples_destinatarios WHERE memorando_id = p_id::uuid;
  END IF;
  IF p_tipo = 'memorando_multiple' THEN
    EXECUTE format('DELETE FROM public.%I WHERE id = $1::uuid', v_table) USING p_id;
  ELSE
    EXECUTE format('DELETE FROM public.%I WHERE id = $1::bigint', v_table) USING p_id;
  END IF;
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted > 0;
END;
$$;

GRANT EXECUTE ON FUNCTION public.actualizar_documento(text, bigint, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.actualizar_memorando_multiple(uuid, date, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.eliminar_documento(text, text) TO authenticated;
COMMIT;
