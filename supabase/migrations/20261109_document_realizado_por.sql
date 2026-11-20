-- Record the authenticated profile that created each Oficio and Proveido.
-- Memos already store the creator in registrado_por.
-- Run this patch in the Supabase SQL Editor before deploying the frontend.

BEGIN;

DO $preflight$
BEGIN
  IF to_regclass('public.oficios') IS NULL
     OR to_regclass('public.proveidos') IS NULL
     OR to_regclass('public.perfiles') IS NULL
     OR to_regclass('public.expediente_eventos') IS NULL
  THEN
    RAISE EXCEPTION
      'Required document, profile, or event tables were not found; no changes were applied';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'perfiles'
      AND column_name = 'nombre'
  ) OR NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'perfiles'
      AND column_name = 'activo'
  ) THEN
    RAISE EXCEPTION
      'public.perfiles must contain nombre and activo; no changes were applied';
  END IF;
END;
$preflight$;

ALTER TABLE public.oficios
  ADD COLUMN IF NOT EXISTS realizado_por text;

ALTER TABLE public.proveidos
  ADD COLUMN IF NOT EXISTS realizado_por text;

CREATE OR REPLACE FUNCTION public.set_document_realizado_por()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_actor_id uuid := auth.uid();
BEGIN
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Se requiere una sesión autenticada para registrar el documento'
      USING ERRCODE = '28000';
  END IF;

  SELECT p.nombre
  INTO NEW.realizado_por
  FROM public.perfiles AS p
  WHERE p.id = v_actor_id
    AND p.activo = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'El usuario no tiene un perfil activo'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_oficios_realizado_por ON public.oficios;
CREATE TRIGGER trg_oficios_realizado_por
BEFORE INSERT ON public.oficios
FOR EACH ROW
EXECUTE FUNCTION public.set_document_realizado_por();

DROP TRIGGER IF EXISTS trg_proveidos_realizado_por ON public.proveidos;
CREATE TRIGGER trg_proveidos_realizado_por
BEFORE INSERT ON public.proveidos
FOR EACH ROW
EXECUTE FUNCTION public.set_document_realizado_por();

DO $backfill$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'expediente_eventos'
      AND column_name = 'actor_id'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'expediente_eventos'
      AND column_name = 'tipo_evento'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'expediente_eventos'
      AND column_name = 'detalle'
  ) THEN
    UPDATE public.oficios AS o
    SET realizado_por = (
      SELECT p.nombre
      FROM public.expediente_eventos AS e
      JOIN public.perfiles AS p ON p.id = e.actor_id
      WHERE e.tipo_evento = 'oficio_registrado'
        AND e.detalle ->> 'oficio_id' = o.id::text
      LIMIT 1
    )
    WHERE o.realizado_por IS NULL
      AND (
        SELECT count(*)
        FROM public.expediente_eventos AS e
        WHERE e.tipo_evento = 'oficio_registrado'
          AND e.detalle ->> 'oficio_id' = o.id::text
      ) = 1;
  END IF;
END;
$backfill$;

REVOKE ALL ON FUNCTION public.set_document_realizado_por() FROM PUBLIC;

COMMIT;
