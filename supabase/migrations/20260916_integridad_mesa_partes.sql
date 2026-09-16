-- Integridad para la numeración de expedientes de Mesa de Partes 2026.
-- Ejecutar una sola vez en el SQL Editor de Supabase.

-- Evita que dos registros terminen con el mismo número de expediente.
create unique index if not exists ux_mesa_partes_2026_nro_exp
on public.mesa_partes_2026 (nro_exp)
where nro_exp is not null;

-- Acelera la consulta que obtiene el último número registrado.
create index if not exists idx_mesa_partes_2026_nro_exp_desc
on public.mesa_partes_2026 (nro_exp desc);
