# Tareas de Implementación: 005-heatmap-tab-y-reactividad

- **ID de Funcionalidad:** `005-heatmap-tab-y-reactividad`
- **Estado:** completada
- **Fecha:** 2026-10-25

---

### Fase 1: Componentes Atómicos del Heatmap
- [x] **T1.1:** Modificar `src/components/heatmap/HeatmapDayCell.jsx` para soportar `tamanoGrande`, `tamanoCelda` y contraste tipográfico WCAG (`#121212` en niveles 2-4).
- [x] **T1.2:** Modificar `src/components/heatmap/MonthBlock.jsx` con soporte para `anchoCompleto`, `tamanoGrande` y dimensionamiento responsivo con `useWindowDimensions()`.

---

### Fase 2: Vistas Principales y Navegación
- [x] **T2.1:** Crear `src/components/HeatmapView.jsx` con métricas anuales acumuladas, selector de año, cuadrícula de 12 meses y leyenda.
- [x] **T2.2:** Reestructurar `src/components/MenuBienvenida.jsx` para mostrar únicamente el widget del mes actual interactivo con `DaySummaryModal` y botón hacia la vista anual.
- [x] **T2.3:** Añadir la 5ª pestaña `"Heatmap"` en `src/components/BarraNavegacionInferior.jsx` con soporte responsivo para 360dp.

---

### Fase 3: Integración de Reactividad y Separación de Estado en `App.js`
- [x] **T3.1:** Declarar estados separados `resumenAnioActual` y `resumenAnual` en `App.js`.
- [x] **T3.2:** Implementar `refrescarHabitosConcurrentes` y conectarla a comidas, entrenos, fotos y descanso.
- [x] **T3.3:** Conectar `vistaActiva === 'heatmap'` y pasar `onIrAHeatmap` a `MenuBienvenida.jsx`.

---

### Fase 4: Verificación y Compilación
- [x] **T4.1:** Validar compilación nativa de Expo con `npx expo export --platform android` (648 módulos, exit code 0).
- [x] **T4.2:** Confirmar ausencia de `babel.config.js` externo.
- [x] **T4.3:** Actualizar `MEMORY.md`.
