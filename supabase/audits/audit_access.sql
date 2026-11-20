-- Read-only checks for the tables and RPCs used by the document system.
-- Run in Supabase SQL Editor; this script does not change database state.

SELECT
  ns.nspname AS schema_name,
  cls.relname AS table_name,
  cls.relrowsecurity AS rls_enabled,
  cls.relforcerowsecurity AS rls_forced,
  has_table_privilege('anon', cls.oid, 'SELECT') AS anon_can_select,
  has_table_privilege('authenticated', cls.oid, 'SELECT') AS authenticated_can_select,
  has_table_privilege('authenticated', cls.oid, 'INSERT') AS authenticated_can_insert,
  has_table_privilege('authenticated', cls.oid, 'UPDATE') AS authenticated_can_update,
  has_table_privilege('authenticated', cls.oid, 'DELETE') AS authenticated_can_delete
FROM pg_class AS cls
JOIN pg_namespace AS ns ON ns.oid = cls.relnamespace
WHERE ns.nspname = 'public'
  AND cls.relkind IN ('r', 'p')
  AND cls.relname IN (
    'mesa_partes_2026',
    'memos',
    'oficios',
    'proveidos',
    'expediente_documentos',
    'perfiles'
  )
ORDER BY cls.relname;

SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'mesa_partes_2026',
    'memos',
    'oficios',
    'proveidos',
    'expediente_documentos',
    'perfiles'
  )
ORDER BY tablename, policyname;

SELECT
  grantee,
  table_name,
  privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND table_name IN (
    'mesa_partes_2026',
    'memos',
    'oficios',
    'proveidos',
    'expediente_documentos',
    'perfiles'
  )
  AND grantee IN ('anon', 'authenticated', 'service_role')
ORDER BY table_name, grantee, privilege_type;

SELECT
  ns.nspname AS schema_name,
  proc.proname AS function_name,
  pg_get_function_identity_arguments(proc.oid) AS arguments,
  pg_get_userbyid(proc.proowner) AS function_owner,
  proc.prosecdef AS security_definer,
  proc.proconfig AS function_settings,
  has_function_privilege('anon', proc.oid, 'EXECUTE') AS anon_can_execute,
  has_function_privilege('authenticated', proc.oid, 'EXECUTE') AS authenticated_can_execute
FROM pg_proc AS proc
JOIN pg_namespace AS ns ON ns.oid = proc.pronamespace
WHERE ns.nspname = 'public'
  AND proc.proname IN (
    'registrar_expediente',
    'adjuntar_documento_expediente',
    'registrar_fecha_expediente',
    'cambiar_estado_expediente',
    'registrar_memo',
    'registrar_oficio',
    'registrar_proveido_con_adjunto'
  )
ORDER BY proc.proname, arguments;
