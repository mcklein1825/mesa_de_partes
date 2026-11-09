-- Clasifica los expedientes para distinguir los que requieren seguimiento
-- de los que solo deben quedar registrados.
alter table public.mesa_partes_2026
  add column if not exists requiere_gestion boolean not null default true;
