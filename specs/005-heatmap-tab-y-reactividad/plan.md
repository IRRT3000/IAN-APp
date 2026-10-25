# Plan de Implementación: 005-heatmap-tab-y-reactividad — Reactividad Inmediata y Nueva Pestaña "Heatmap"

- **ID de Funcionalidad:** `005-heatmap-tab-y-reactividad`
- **Estado:** en-progreso
- **Fecha:** 2026-10-25

---

## 1. Arquitectura Técnica

```
App.js
  ├── estado: vistaActiva ('bienvenida' | 'tracker' | 'nutricion' | 'fisico' | 'heatmap')
  ├── estado: resumenAnual (actualizado reactivamente ante cualquier cambio de datos)
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

## 2. Fases de Ejecución

### Fase 1: Reactividad en `App.js`
- Actualizar `manejarCambioComidas`, `manejarEntrenamientosActualizados` y `manejarCambioFisico` para calcular síncronamente `obtenerResumenAnualHabitos(anioHeatmap)` y actualizar `resumenAnual`.
- Verificar que al agregar o borrar una comida o entrenamiento, el estado de `resumenAnual` refleje inmediatamente los nuevos scores del día.

### Fase 2: Soporte de Ancho Completo en `MonthBlock.jsx`
- Permitir prop `anchoCompleto={true}` en `MonthBlock.jsx` con estilos para tarjeta destacada (ancho 100%, alineación centrada o balanceada).

### Fase 3: Creación de `HeatmapView.jsx`
- Crear el componente `src/components/HeatmapView.jsx` que envuelve `MapaCalorAnual` con encabezado, scroll ergonómico y callbacks para alternar descanso y navegación rápida a Entrenos/Nutrición.

### Fase 4: Reestructuración de `MenuBienvenida.jsx`
- Extraer `MapaCalorAnual` fuera de `MenuBienvenida.jsx`.
- Implementar la tarjeta del mes actual con `MonthBlock` (ancho completo), soporte de toque para abrir `DaySummaryModal` y botón interactivo `onIrAHeatmap`.

### Fase 5: Actualización de `BarraNavegacionInferior.jsx`
- Incorporar el 5º botón `'heatmap'` con etiqueta `"Heatmap"` e ícono `🔥`.
- Ajustar proporciones visuales y tipografía para acomodar 5 pestañas de forma limpia en cualquier resolución.

### Fase 6: Conexión en `App.js` y Verificación
- Integrar la nueva pestaña `'heatmap'` en `App.js`.
- Probar la navegación completa y verificar que la reactividad actualiza el mes actual y el mapa anual inmediatamente al registrar una comida.
