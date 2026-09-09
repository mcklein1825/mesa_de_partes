# Mesa de Partes local

MVP del módulo de Mesa de Partes para integrarse a una página web institucional.

## Ejecución local

```bash
npm install
npm run dev
```

El MVP no usa nube ni servicios externos para los datos: los expedientes se guardan en `localStorage` del navegador. El almacenamiento debe reemplazarse por la API/base de datos local de la institución cuando se integre al sistema principal.

Incluye:

- Bandeja de expedientes y estados.
- Registro estructurado de remitente, documento, área, prioridad y adjunto.
- Búsqueda, filtros y derivación simulada.
- Indicadores y reporte por área.
- Identificación del rol activo: Mesa de Partes.
- 1,512 expedientes numerados importados desde el CSV de Mesa de Partes 2026.

El histórico se encuentra en `src/data/expedientes.csv.json` y se carga como datos iniciales en el navegador. Los nuevos registros se guardan localmente en `localStorage`.

## Integración con el sitio institucional

El módulo está preparado como una aplicación estática independiente y no requiere modificar el frontend existente. Para publicarlo en el servidor:

1. Ejecuta `npm run build:integracion`.
2. Copia **el contenido** de `dist/` a la carpeta pública `mesa-de-partes/` del sitio.
3. Enlaza desde el menú institucional a `/mesa-de-partes/`.

La configuración `base: './'` permite que los recursos funcionen dentro de una subcarpeta, por ejemplo:

```text
https://iestpgildaballivian.edu.pe/mesa-de-partes/
```

No se deben subir `src/`, `node_modules/` ni archivos de configuración al servidor público. Esta versión conserva exactamente el frontend actual y usa almacenamiento local temporal; para uso multiusuario se debe conectar posteriormente una API institucional sin cambiar las pantallas.
