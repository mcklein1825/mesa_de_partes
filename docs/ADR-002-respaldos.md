# ADR-002 Respaldos Supabase plan Free

El plan Free no da PITR ni backups gestionados; la BD es PostgreSQL estandar y se
respalda con pg_dump.

Procedimiento:
- schema-only + data-only custom comprimido
- Retencion 14 dias
- Bitacora historial.log
- Prueba de restauracion mensual en BD local

Credenciales fuera del repo (C:\respaldos-mesa\credenciales.txt).
La red institucional bloquea el puerto 5432: el respaldo se ejecuta desde red domestica.
