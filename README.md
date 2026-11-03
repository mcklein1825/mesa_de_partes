# Mesa de Partes

Sistema de gestión documental para el IESTP "Gilda Liliana Ballivián Rosado".

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
