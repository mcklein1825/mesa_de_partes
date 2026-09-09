import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // Permite importar el módulo React dentro de la compilación Vite.
  plugins: [react()],
  // Rutas relativas para publicar en XAMPP o en /mesa-de-partes/.
  base: './',
})
