-- Store the local registration year on each newly inserted Oficio.
-- Run this patch in the Supabase SQL Editor.

BEGIN;

DO $preflight$
BEGIN
  IF to_regclass('public.oficios') IS NULL
     OR NOT EXISTS (
       SELECT 1
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = 'oficios'
         AND column_name = 'anio'
     )
     OR NOT EXISTS (
       SELECT 1
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = 'oficios'
         AND column_name = 'created_at'
     )
  THEN
    RAISE EXCEPTION
      'public.oficios must contain anio and created_at; no changes were applied';
  END IF;
END;
$preflight$;

CREATE OR REPLACE FUNCTION public.set_oficio_registration_year()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO ''
AS $function$
BEGIN
  NEW.anio :=
    EXTRACT(YEAR FROM NEW.created_at AT TIME ZONE 'America/Lima')::integer;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_oficios_registration_year ON public.oficios;

CREATE TRIGGER trg_oficios_registration_year
BEFORE INSERT ON public.oficios
FOR EACH ROW
EXECUTE FUNCTION public.set_oficio_registration_year();

COMMIT;
