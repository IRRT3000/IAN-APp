# Especificación Funcional: 005-heatmap-tab-y-reactividad — Reactividad Inmediata del Mapa de Calor y Nueva Pestaña "Heatmap"

- **ID de Funcionalidad:** `005-heatmap-tab-y-reactividad`
- **Estado:** en-progreso
- **Fecha:** 2026-10-25
- **Metodología:** Spec-Driven Development (SDD) vía `@.agents/skills/grill-me`

---

## 1. Resumen y Propósito

Esta especificación resuelve dos necesidades críticas de arquitectura y experiencia de usuario en la aplicación:

1. **Reactividad inmediata de hábitos:** Corregir el flujo de sincronización en `App.js` para que cualquier comida registrada/eliminada, entrenamiento finalizado/eliminado o cambio físico actualice en tiempo real el resumen anual de hábitos y el día en curso en el mapa de calor, eliminando la necesidad de alternar manualmente el estado de descanso para forzar el refresco visual.
2. **Reubicación ergonómica del Mapa de Calor:** Descongestionar la pantalla principal (`MenuBienvenida.jsx`) trasladando la cuadrícula anual completa (12 meses, selector de año y leyenda) a una **5ª pestaña en la barra de navegación inferior** denominada **"Heatmap"**.
3. **Widget del Mes Actual en Inicio:** Mantener en la pantalla principal (`MenuBienvenida.jsx`) exclusivamente la cuadrícula del mes en curso con interactividad táctil completa (desglose del día y opción de marcar descanso) y un botón de acceso directo para explorar el año completo en la nueva pestaña.

---

## 2. Historias de Usuario (HU)

- **HU-1 (Actualización Reactiva al Registrar Comida):**
  *Como* usuario que registra una comida con foto y análisis de Gemini,
  *quiero* ver que el día de hoy en el mapa de calor aumente su nivel de color y porcentaje inmediatamente al volver a la pantalla,
  *para* sentir retroalimentación instantánea de mis hábitos diarios.

- **HU-2 (Actualización Reactiva al Registrar Entrenamiento):**
  *Como* atleta que termina una sesión en Live Mode,
  *quiero* que el día actual se pinte con el aporte de entrenamiento (mínimo 50% de intensidad) de inmediato,
  *para* verificar que mi sesión de fuerza quedó consolidada en mi constancia.

- **HU-3 (Nueva 5ª Pestaña "Heatmap" en la Barra de Navegación):**
  *Como* usuario que quiere auditar su constancia a largo plazo,
  *quiero* una pestaña dedicada "Heatmap" en el extremo derecho de la barra inferior,
  *para* navegar entre años pasados, examinar los 12 meses y consultar leyendas sin saturar el dashboard de bienvenida.

- **HU-4 (Widget Interactivo del Mes Actual en Inicio):**
  *Como* usuario en la pantalla de inicio,
  *quiero* ver el bloque correspondiente al mes actual con sus días alineados y poder tocar cualquier día para ver su desglose,
  *para* tener un resumen rápido de mi mes actual sin perder acceso a los detalles.

- **HU-5 (Navegación Fluida Inicio -> Heatmap Anual):**
  *Como* usuario en la pantalla de inicio,
  *quiero* un botón directo "Ver mapa anual completo →" junto al mes actual,
  *para* saltar con un solo toque a la pestaña del Heatmap completo.

---

## 3. Requerimientos Funcionales (RF)

- **RF-1 (Sincronización Reactiva en `App.js`):**
  - Al ejecutarse `manejarCambioComidas`, llamar de forma concurrente a `obtenerResumenAnualHabitos(anioHeatmap)` y actualizar `setResumenAnual`.
  - Al ejecutarse `manejarEntrenamientosActualizados`, llamar de forma concurrente a `obtenerResumenAnualHabitos(anioHeatmap)` y actualizar `setResumenAnual`.
  - Al ejecutarse `manejarCambioFisico`, llamar de forma concurrente a `obtenerResumenAnualHabitos(anioHeatmap)` y actualizar `setResumenAnual`.

- **RF-2 (Nueva Pestaña "Heatmap" en `BarraNavegacionInferior`):**
  - Añadir el 5º botón con id `'heatmap'`, etiqueta `"Heatmap"` e ícono `🔥` (o `🟩`).
  - Distribuir equitativamente los 5 botones con soporte responsivo para pantallas estrechas.
  - Ocultar la barra inferior si el usuario entra en Live Mode (manteniendo compatibilidad con RF-9 de Spec 003).

- **RF-3 (Pantalla `HeatmapView.jsx`):**
  - Crear `src/components/HeatmapView.jsx` conteniendo:
    - Encabezado con título "Mapa de Consistencia" y subtítulo "Motor Vaso de Agua · 365 días".
    - Selector interactivo de año `< [Año] >` (bloqueando años futuros).
    - Cuadrícula de 12 meses adaptativa (`MapaCalorAnual`).
    - Leyenda de intensidades (0% a 100%).
    - Modal de desglose diario (`DaySummaryModal`).

- **RF-4 (Widget del Mes Actual en `MenuBienvenida.jsx`):**
  - Reemplazar el renderizado de los 12 meses por una tarjeta del mes en curso.
  - Mostrar encabezado con el nombre del mes actual y el año (ej. "OCTUBRE 2026").
  - Renderizar las celdas del mes con sus niveles de color correspondientes calculados por `waterGlassEngine`.
  - Permitir toque en cualquier día para abrir `DaySummaryModal` (consultar hábitos o marcar día de descanso si es hoy).
  - Incluir botón de acceso directo: `"Ver mapa anual completo (365 días) →"` que invoque `onIrAHeatmap`.

---

## 4. Requerimientos No Funcionales (RNF)

- **RNF-1 (Rendimiento y Celdas Memoizadas):** Conservar `React.memo` en `HeatmapDayCell` para evitar re-renderizados innecesarios de las celdas no afectadas.
- **RNF-2 (Aritmética Local Estricta):** Prohibido el uso de `toISOString()` o conversiones a UTC. Todas las fechas deben generarse mediante `dateUtilsLocal.js` y `obtenerFechaLocal()`.
- **RNF-3 (Inmutabilidad Estricta):** Las actualizaciones de estado y almacenamiento en AsyncStorage deben ser inmutables con clonación por spread operator.
