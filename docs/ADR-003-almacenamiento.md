# ADR-003 Almacenamiento de archivos (diferido)

Hoy los adjuntos viven como base64 en la BD. Proyeccion a volumenes reales ~300 MB,
contra limite de 500 MB del plan Free.

Decision diferida hasta conocer el hosting: Supabase Storage o disco/S3 institucional.

La carga bajo demanda (ADR-001) deja ambos caminos viables.

Regla: ninguna migracion destructiva de columnas antes de tener un respaldo verificado.
