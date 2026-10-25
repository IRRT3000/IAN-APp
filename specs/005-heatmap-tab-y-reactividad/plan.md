# Plan de Arquitectura y Ejecución Técnica: Spec 005 — "Heatmap Tab y Reactividad Inmediata"

- **ID de Funcionalidad:** `005-heatmap-tab-y-reactividad`
- **Estado:** aprobado-por-revisor-critico
- **Fecha:** 2026-10-25

---

## 1. Arquitectura Técnica

```
App.js
  ├── estados:
  │    ├── resumenAnioActual (fijo para el widget de Inicio)
  │    ├── resumenAnual (dinámico según selector interanual en la pestaña Heatmap)
  │    ├── anioHeatmap (año seleccionado en la pestaña Heatmap)
  │    └── vistaActiva ('bienvenida' | 'tracker' | 'nutricion' | 'fisico' | 'heatmap')
  │
  ├── función central: refrescarHabitosConcurrentes()
  │    └── invocada en comidas, entrenos, fotos y descanso
  │
  ├── Vistas principales:
  │    ├── MenuBienvenida.jsx
  │    │     └── Widget Mes Actual (MonthBlock anchoCompleto + DaySummaryModal + Botón "Ver mapa anual")
  │    ├── EntrenamientosView.jsx
  │    ├── NutricionView.jsx
  │    ├── CambioFisicoView.jsx
  │    └── HeatmapView.jsx (NUEVA PESTAÑA)
  │          └── MapaCalorAnual.jsx (12 meses, selector de año, leyenda, DaySummaryModal)
  │
  └── BarraNavegacionInferior.jsx
       └── 5 pestañas: [Inicio, Entrenos, Nutrición, Físico, Heatmap]
```

---

## 2. Decisiones Técnicas Clave

1. **Separación de Estados Anuales**: `resumenAnioActual` se mantiene fijo con los datos del año actual para el widget de Inicio, mientras `resumenAnual` sigue el año seleccionado en la pestaña Heatmap.
2. **Dimensionado Dinámico en Pantallas 360dp**: `MonthBlock.jsx` calcula el ancho disponible con `useWindowDimensions()` limitando el tamaño máximo de celda a 34px y asegurando que las 7 columnas quepan sin saltos de línea.
3. **Contraste Tipográfico WCAG**: `HeatmapDayCell.jsx` evalúa el nivel de verde (0 a 4) y aplica texto oscuro `#121212` en niveles 2, 3 y 4 para garantizar máxima legibilidad sobre fondo verde.
4. **Cero Babel Externo**: Prohibición estricta de crear `babel.config.js` externo en la raíz del proyecto para preservar la transpilación nativa de JSX de Expo.
