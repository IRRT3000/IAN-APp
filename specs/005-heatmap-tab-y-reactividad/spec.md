# Especificación Funcional: 005-heatmap-tab-y-reactividad — Reactividad Inmediata del Mapa de Calor y Nueva Pestaña "Heatmap"

- **ID de Funcionalidad:** `005-heatmap-tab-y-reactividad`
- **Estado:** implementada
- **Fecha:** 2026-10-25
- **Metodología:** Spec-Driven Development (SDD) con auditoría multi-agente

---

## 1. Resumen y Propósito

Esta especificación resuelve el desacoplamiento de estado y la sobrecarga visual del dashboard de inicio:
1. **Reactividad inmediata:** Eliminar la latencia del mapa de calor cuando el usuario registra o borra comidas, termina entrenamientos en Live Mode o toma fotos físicas, asegurando que el "Vaso de Agua" de hoy se recalcule y actualice de inmediato en tiempo real sin requerir alternar descanso.
2. **5ª Pestaña Dedicada "Heatmap":** Trasladar la cuadrícula anual completa (12 meses, selector interanual, métricas acumuladas y leyenda) a una pestaña independiente denominada **"Heatmap"** (`🔥`) en el extremo derecho de la barra inferior.
3. **Widget del Mes Actual en Inicio:** Descongestionar `MenuBienvenida.jsx` sustituyendo los 12 meses por un widget interactivo de ancho completo correspondiente al mes en curso (ej. "OCTUBRE 2026") con números de día legibles, acceso al modal de desglose y botón directo para abrir el año completo.
4. **Independencia Interanual:** Mantener aislado el resumen del año en curso del resumen histórico del Heatmap para que navegar a años anteriores (ej. 2025) en el Heatmap no vacíe el widget del mes actual en el Inicio.

---

## 2. Historias de Usuario (HU)

- **HU-1 (Actualización Reactiva al Registrar Comida):**
  *Como* usuario que registra una comida analizada con Gemini,
  *quiero* ver que el día de hoy en el mapa de calor aumente de inmediato su porcentaje y nivel de color,
  *para* tener feedback instantáneo de mis hábitos.

- **HU-2 (Actualización Reactiva al Registrar Entrenamiento):**
  *Como* atleta que completa una sesión en Live Mode,
  *quiero* que el día de hoy refleje de inmediato el cumplimiento del 50% de entrenamiento,
  *para* confirmar visualmente que mi rutina fue registrada.

- **HU-3 (5ª Pestaña Dedicada "Heatmap"):**
  *Como* usuario comprometido con mi constancia anual,
  *quiero* una pestaña dedicada en la barra inferior para consultar los 12 meses, navegar entre años y ver mis métricas anuales,
  *para* analizar mi consistencia histórica sin saturar la pantalla de inicio.

- **HU-4 (Widget Interactivo del Mes Actual en Inicio):**
  *Como* usuario en la pantalla principal,
  *quiero* ver un calendario del mes en curso con celdas ampliadas y números de día legibles que pueda tocar para ver el desglose o marcar descanso,
  *para* monitorear mi mes actual con máxima comodidad.

- **HU-5 (Navegación Fluida Inicio -> Heatmap Anual):**
  *Como* usuario en la pantalla de inicio,
  *quiero* un botón destacado "🔥 Abrir Heatmap Anual Completo (12 Meses) →",
  *para* saltar con un solo toque a la vista anual completa.

---

## 3. Requerimientos Funcionales (RF)

- **RF-1 (Sincronización Reactiva Concurrente en `App.js`):**
  - Implementar `refrescarHabitosConcurrentes` que actualice concurrentemente `resumenAnioActual` y `resumenAnual`.
  - Invocar esta función en `manejarCambioComidas`, `manejarEntrenamientosActualizados`, `manejarCambioFisico` y `manejarAlternarDescanso`.

- **RF-2 (5ª Pestaña "Heatmap" en `BarraNavegacionInferior.jsx`):**
  - Añadir el 5º botón con id `'heatmap'`, etiqueta `"Heatmap"` e ícono `🔥`.
  - Distribuir equitativamente los 5 botones con `paddingHorizontal: 2`, `fontSize: 10`, `numberOfLines={1}` para evitar saltos de línea en pantallas estrechas (360dp).
  - Mantener la barra oculta durante el Live Mode.

- **RF-3 (Pantalla `HeatmapView.jsx`):**
  - Crear la vista de la 5ª pestaña conteniendo:
    - Encabezado con título "Heatmap Anual" y subtítulo explicativo.
    - Tarjetas de métricas anuales acumuladas (días activos, días al 100%, descansos).
    - Selector interactivo de año `< [2026] >`.
    - Cuadrícula anual de 12 meses (`MapaCalorAnual.jsx`).
    - Leyenda de intensidades (0% a 100%).
    - Modal de desglose diario (`DaySummaryModal.jsx`).

- **RF-4 (Widget del Mes Actual en `MenuBienvenida.jsx`):**
  - Reemplazar la cuadrícula de 12 meses por una tarjeta del mes en curso.
  - Mostrar encabezado con el nombre del mes y año (ej. "OCTUBRE 2026").
  - Renderizar `MonthBlock` con `anchoCompleto={true}` y `tamanoGrande={true}`.
  - Permitir tocar cualquier día para abrir `DaySummaryModal` para consultar o marcar descanso si es hoy.
  - Botón CTA destacado full-width para navegar a la 5ª pestaña.

- **RF-5 (Celdas Adaptativas y Contraste WCAG):**
  - En `HeatmapDayCell.jsx`, soporte para `tamanoGrande` con número de día `{dia}`.
  - Contraste estricto: texto oscuro `#121212` para niveles verdes 2, 3 y 4; texto claro `#D4D4D4` para niveles 0 y 1; atenuado para días futuros.
  - En `MonthBlock.jsx`, cálculo dinámico del ancho de columna mediante `useWindowDimensions()` (máx 34px por celda) garantizando que 7 columnas no desborden en 360dp.

---

## 4. Requerimientos No Funcionales (RNF)

- **RNF-1 (Cero Babel Config Externo):** Prohibido estrictamente crear archivos `babel.config.js` externos en la raíz para no romper la transpilación nativa de Expo SDK.
- **RNF-2 (Aritmética Local Estricta):** Fechas calculadas con `obtenerFechaLocal()`. Prohibido `toISOString()`.
- **RNF-3 (Inmutabilidad Estricta):** Actualizaciones de estado y persistencia mediante clonación por spread operator.
