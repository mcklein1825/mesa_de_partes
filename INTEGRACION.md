# Integración sin modificar el frontend institucional

Este módulo se publica como una sección independiente. No reemplaza ni modifica la página principal.

## Generar la versión para servidor

Desde la raíz del proyecto:

```powershell
npm install
npm run build:integracion
```

El resultado queda en `dist/`.

## Publicar en el servidor

Crear una carpeta pública:

```text
mesa-de-partes/
```

Copiar dentro de ella el contenido de `dist/`, no la carpeta `dist` completa:

```text
mesa-de-partes/
├── index.html
└── assets/
```

La URL final será:

```text
https://iestpgildaballivian.edu.pe/mesa-de-partes/
```

Desde el frontend institucional solo se necesita un enlace normal:

```html
<a href="/mesa-de-partes/">Mesa de Partes</a>
```

No es necesario instalar React, Vite ni Node.js en el servidor web. Solo se sirven `index.html` y `assets/`.

## Datos actuales

La versión actual conserva los datos en el navegador mediante `localStorage`. Por ello es adecuada para prototipo o uso local en un equipo. La integración multiusuario debe reemplazar posteriormente el almacenamiento por endpoints de la API institucional, manteniendo esta interfaz visual.
