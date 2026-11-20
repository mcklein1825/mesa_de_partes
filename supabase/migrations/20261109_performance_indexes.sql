-- Indexes for the most common document-list and relationship queries.
-- Run this patch once in the Supabase SQL Editor.

BEGIN;

CREATE INDEX IF NOT EXISTS idx_mesa_partes_fecha_ingreso
  ON public.mesa_partes_2026 (fecha_ingreso DESC);

CREATE INDEX IF NOT EXISTS idx_mesa_partes_estado
  ON public.mesa_partes_2026 (estado);

CREATE INDEX IF NOT EXISTS idx_mesa_partes_area_destino
  ON public.mesa_partes_2026 (area_destino);

CREATE INDEX IF NOT EXISTS idx_memos_expediente_id
  ON public.memos (expediente_id);

CREATE INDEX IF NOT EXISTS idx_memos_created_at
  ON public.memos (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_memos_area_estado
  ON public.memos (area_destino, estado);

CREATE INDEX IF NOT EXISTS idx_oficios_expediente_id
  ON public.oficios (expediente_id);

CREATE INDEX IF NOT EXISTS idx_oficios_created_at
  ON public.oficios (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_oficios_area_estado
  ON public.oficios (area_destino, estado);

CREATE INDEX IF NOT EXISTS idx_proveidos_expediente_id
  ON public.proveidos (expediente_id);

CREATE INDEX IF NOT EXISTS idx_proveidos_created_at
  ON public.proveidos (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_proveidos_area_estado
  ON public.proveidos (area_destino, estado);

CREATE INDEX IF NOT EXISTS idx_expediente_documentos_expediente_id
  ON public.expediente_documentos (expediente_id);

COMMIT;
