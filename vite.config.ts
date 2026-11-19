import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('lucide-react')) return 'vendor-iconos'
            if (id.includes('@supabase') || id.includes('supabase-js')) return 'vendor-supabase'
            if (id.includes('react-dom') || id.includes('/react/') || id.includes('scheduler')) return 'vendor-react'
            return 'vendor'
          }
        }
      }
    }
  },
  // Permite importar el módulo React dentro de la compilación Vite.
  plugins: [react()],
  // Rutas relativas para publicar en XAMPP o en /mesa-de-partes/.
  base: './',
})
