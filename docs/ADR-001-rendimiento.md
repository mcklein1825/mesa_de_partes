# ADR-001 Rendimiento en redes debiles

Contexto: WiFi institucional debil; adjuntos base64 dentro de las filas (~27 MB en BD);
listados que traian todo en cada login; bundle unico de 582 KB.

Decisiones:
1. Listados sin archivo_data y apertura bajo demanda por (tabla,id)
2. Compresion cliente de imagenes 1600px JPEG 0.82 antes de subir
3. Logo 320px JPEG (403 KB -> 21 KB)
4. manualChunks separa vendor de app
5. gzip + cache en el host (.htaccess Apache)

Diferidas con puerta post-despliegue:
- Lazy de vistas
- Cache IndexedDB
- Paginacion de servidor
- Salida de archivos de la BD

Metricas: listados pasaron de MB a KB; bundle 582 KB -> 158 KB gzip; zip deploy 0.2 MB.
