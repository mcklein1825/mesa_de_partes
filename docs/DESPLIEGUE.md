# DESPLIEGUE

1. npm run build (base relativa ./ y routing por hash: no requiere rewrites del host)
2. Subir contenido de dist/ al public_html del hosting institucional (Apache/cPanel)
3. public/.htaccess da gzip y cache; verificar Content-Encoding gzip y Cache-Control
4. Las variables VITE_ se hornean en el build desde .env.local (fuera del repo)
5. La web usa solo URL + anon key de Supabase; la password de la BD no se usa en web
6. Prueba local con gzip antes de subir: node scripts/server.mjs (puerto 4173)
