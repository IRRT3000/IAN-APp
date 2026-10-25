# Tareas de Implementación: 004-mapa-calor-anual

- **ID de Funcionalidad:** `004-mapa-calor-anual`
- **Estado:** completada
- **Fecha:** 2026-10-24

---

### Fase 1: Motor Matemático y Persistencia
- [x] **T1.1:** Crear `src/utils/waterGlassEngine.js` con las funciones `calcularScoreVaso(resumen)` y `obtenerNivelColor(score)`.
- [x] **T1.2:** Crear `src/utils/dateUtilsLocal.js` con funciones puras para calcular días en mes, primer día de semana y formateo local `YYYY-MM-DD` sin UTC.
- [x] **T1.3:** Agregar a `src/services/storage.js` las funciones `cargarDiasDescanso()`, `alternarDiaDescanso(fecha)` y `obtenerResumenAnualHabitos(year)`.

---

### Fase 2: Componentes Atómicos del Heatmap
- [x] **T2.1:** Crear `src/components/heatmap/HeatmapDayCell.jsx` con `React.memo`, cálculo de color por nivel del tema y soporte de días futuros.
- [x] **T2.2:** Crear `src/components/heatmap/MonthBlock.jsx` con cuadrícula de 7 columnas alineada de Lunes a Domingo y días en blanco alineados.
- [x] **T2.3:** Crear `src/components/heatmap/DaySummaryModal.jsx` con indicador visual de llenado del vaso, desglose de hábitos, insignia de foto y acción para marcar día de descanso si es la fecha actual.

---

### Fase 3: Integración del Mapa Anual y Pantalla Principal
- [x] **T3.1:** Crear `src/components/heatmap/MapaCalorAnual.jsx` integrando selector de año `< [Año] >`, cuadrícula de 12 meses y leyenda de intensidades.
- [x] **T3.2:** Integrar `MapaCalorAnual` en `src/components/MenuBienvenida.jsx` permitiendo scroll fluido y actualización reactiva al registrar entrenamientos, comidas o descanso.
- [x] **T3.3:** Conectar `App.js` con la sincronización de días de descanso para propagar los cambios en tiempo real.

---

### Fase 4: Verificación y Cierre
- [x] **T4.1:** Probar cálculo proporcional del vaso con 1, 2 y 3 comidas.
- [x] **T4.2:** Probar que marcar día de descanso no penaliza y permite llegar al 100%.
- [x] **T4.3:** Verificar navegación entre años y bloqueo de avance a años futuros.
- [x] **T4.4:** Verificar sintaxis y análisis estático sin errores.
- [x] **T4.5:** Actualizar `MEMORY.md` reflejando la nueva funcionalidad y decisiones.
