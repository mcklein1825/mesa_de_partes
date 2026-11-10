# Sistema de Gestión Documental

Sistema de gestión documental para la Dirección General del IESTP "Gilda Liliana Ballivián Rosado".

## 🛠️ Tecnologías Utilizadas
- **Frontend:** React 18 + Vite + TypeScript
- **Estilos:** CSS puro con variables (Modelo Hoja de Ruta)
- **Iconos:** lucide-react
- **Base de Datos:** Supabase (PostgreSQL)
- **Empaquetador:** Vite

## 🚀 Requisitos Previos
- Node.js (v18 o superior)
- npm
- Una cuenta en Supabase

## ⚙️ Configuración del Entorno

1. Clona el repositorio.
2. Instala las dependencias:
   ```bash
   npm install
   ```

## Alertas predictivas de plazos

El panel de inicio y Reportes incluyen un piloto local de regresión Ridge para estimar la duración de atención y priorizar expedientes con riesgo de atraso. El cálculo usa área, tipo documental, prioridad, canal de recepción, folios, anexos y fecha de ingreso; no envía datos a servicios externos ni toma decisiones o notifica automáticamente.

El modelo solo se habilita con al menos 50 expedientes cerrados que cuenten con fechas verificables de ingreso y atención. Se valida con los casos cronológicamente más recientes y solo presenta estimaciones si su error absoluto medio es menor que una referencia histórica simple. Si faltan datos o la validación no es suficiente, el sistema informa que el modelo sigue en preparación; las alertas existentes basadas en fechas límite continúan funcionando.

### Próximas mejoras recomendadas

- Registrar fecha y hora de cada derivación y recepción por área para estimar dónde se generan las demoras, no solo el tiempo total.
- Guardar una medición histórica de la carga pendiente de cada área al momento de recibir o derivar un expediente; la carga actual no debe usarse para reconstruir predicciones pasadas.
- Medir resultados operativos además del error en días: porcentaje de atrasos detectados, falsas alertas y desempeño por área, con validación cronológica periódica.
- Mejorar la calidad de las fechas de atención y los plazos, marcando correcciones manuales, cierres administrativos y expedientes duplicados para no enseñarle al modelo ejemplos engañosos.

Estas mejoras requieren registrar datos consistentes a lo largo del tiempo. Conviene mantener el procesamiento local y evitar usar nombres, DNI, correos o el texto libre del asunto como atributos predictivos.

## Estructura del frontend

- `src/App.tsx` conserva la composición general, navegación y operaciones que comparten varias vistas.
- `src/features/mesaPartes/useMesaPartesData.ts` carga y mantiene los expedientes, memos, oficios, proveídos y tipos de documento obtenidos de Supabase.
- `src/features/mesaPartes/useMemosList.ts` centraliza los filtros, la paginación y la carga de documentos asociados a la lista de memos.
- `src/components/views/` contiene las pantallas de cada sección; los elementos reutilizables están en `src/components/common/` y `src/components/modals/`.
- `src/components/modals/MemoDetailsModal.tsx` muestra los datos del memo seleccionado y mantiene esa presentación fuera de la vista de listado.
- `src/styles.css` es el punto de entrada de estilos. Importa los módulos de `src/styles/` en orden; se debe conservar ese orden para mantener la cascada visual existente.

La división se realiza por responsabilidad y conserva las interfaces actuales de las vistas para reducir el riesgo de cambios en su comportamiento.

## Permisos y alcance de acceso

La interfaz aplica la matriz `ROLE_PERMISSIONS` de `src/constants/index.ts`: oculta acciones no autorizadas y vuelve a comprobar permisos antes de ejecutar sus RPC. Los perfiles de acceso se obtienen de `perfiles` después de iniciar sesión.

El rol de interfaz no protege por sí solo los datos. Las tablas principales se consultan desde el navegador con la clave pública de Supabase; por ello, la autorización efectiva debe estar en las políticas RLS y en cada función RPC. No se deben considerar seguros los filtros por área del frontend. En esta versión, `AreaOperativa` solo ve en la interfaz expedientes relacionados con su área y documentos asociados, pero esa selección ocurre después de cargar los registros.

Antes de habilitar el sistema con datos reales, ejecute las consultas de solo lectura de [`supabase/audit_access.sql`](./supabase/audit_access.sql) en el SQL Editor de Supabase. Verifique que RLS esté habilitado para `mesa_partes_2026`, `memos`, `oficios`, `proveidos`, `expediente_documentos` y `perfiles`; revise que las políticas se restrinjan por usuario/área y que las RPC validen `auth.uid()` y permisos antes de modificar datos. No copie políticas de ejemplo ni habilite RLS sin conocer las operaciones y políticas existentes: podría bloquear la aplicación. Comparta los resultados (sin tokens, claves ni datos personales) para preparar las políticas exactas.

## Autoría y responsables de documentos

En las listas de Memos, Oficios y Proveídos, **Realizado por** identifica al usuario que registró el documento; **Responsable** identifica al jefe del área destinataria. Para Administración y sus subáreas, el responsable continúa siendo la jefatura de Administración y el nombre de la persona de cada subárea aparece como **Con copia a** (Tesorería: Celio Verde Marcelino; Área de Personal: Julio García de la Chira; Patrimonio: Willy Quintana; Logística: Noa Wilfredo). Mesa de Partes tiene como responsable a Pilar de la Cruz. Los nombres de copia se muestran a partir del área destino guardada; no requieren columnas adicionales en Supabase.

Antes de desplegar esta versión, ejecute [`supabase/patches/20261109_document_realizado_por.sql`](./supabase/patches/20261109_document_realizado_por.sql) en el SQL Editor de Supabase. Memos ya conservan la autoría en `registrado_por`; el parche agrega autoría para nuevos Oficios y Proveídos, y recupera la de Oficios antiguos cuando existe un evento inequívoco. Los Proveídos históricos no guardan al creador y se mostrarán como **No registrado**; el parche no atribuye autores por suposición.

Para acelerar las búsquedas y relaciones entre documentos, ejecute también [`supabase/patches/20261109_performance_indexes.sql`](./supabase/patches/20261109_performance_indexes.sql). Es seguro ejecutarlo una sola vez y no modifica los registros.

La carga inicial consulta expedientes, Memos, Oficios, Proveídos y tipos de documento en paralelo. La vista de Reportes se divide en un archivo separado y se descarga únicamente cuando se abre. Las consultas de listados ya usan columnas explícitas para evitar depender de `select('*')`; los adjuntos se mantienen disponibles para preservar la apertura actual de documentos.

## Respaldo y recuperación de Supabase

1. En Supabase, revise **Database > Backups** y confirme que existe un respaldo reciente. Según la documentación de Supabase, los respaldos diarios están disponibles en planes Pro (7 días), Team (14 días) y Enterprise (hasta 30 días); en el plan Free se recomienda exportar con regularidad mediante Supabase CLI y conservar copias fuera del proyecto.
2. Antes de una migración o cambio de permisos, genere una copia lógica de roles, esquema y datos con los comandos `supabase db dump` de la [guía oficial de respaldo y restauración](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore). Mantenga la cadena de conexión y los archivos resultantes fuera del repositorio, en almacenamiento restringido y cifrado. Los datos pueden incluir documentos codificados en la base de datos.
3. Restaure primero en un proyecto Supabase de prueba, nunca sobre producción. Compruebe inicio de sesión, perfiles, conteos de expedientes/documentos y apertura de adjuntos antes de considerar el respaldo recuperable.
4. Si se usan buckets de Supabase Storage, respalde sus objetos por separado: los respaldos de base de datos no incluyen el contenido almacenado mediante Storage API.

Este procedimiento aún debe ejecutarse y registrarse por el responsable del proyecto; la configuración actual del entorno no permite confirmar desde el repositorio que existan respaldos automáticos ni probar una restauración real.
## Memorandos múltiples

El apartado de Memorandos múltiples permite registrar un documento anual con varios destinatarios sin duplicar el memorando. Los destinatarios se clasifican como Área / Jefatura, Consejo Directivo, Comité o Grupo institucional, y cada uno conserva su propio medio de entrega (Correo o Presencial), estado y fecha de entrega.

Ejecutar en Supabase antes de usar este apartado:

- `supabase/patches/20261110_memorandos_multiples.sql`
- Si la aplicación muestra `PGRST205` indicando que no encuentra `public.memorandos_multiples`, ejecutar después `supabase/patches/20261110_memorandos_multiples_reload_schema.sql`.

El catálogo inicial se encuentra en `src/constants/index.ts` y puede ampliarse cuando se confirmen nuevos grupos institucionales.
