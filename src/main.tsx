import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'
import App from './App'

// Punto de entrada del frontend: busca el contenedor HTML y monta React.
createRoot(document.getElementById('root')!).render(
  // StrictMode ayuda a detectar usos problemáticos durante el desarrollo.
  <StrictMode>
    // App contiene toda la navegación y gestión documental.
    <App />
  </StrictMode>,
)
