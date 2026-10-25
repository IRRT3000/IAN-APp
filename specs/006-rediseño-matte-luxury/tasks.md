# Tareas de Implementación: Spec 006 — "Rediseño Total Monocromo Matte Luxury (Android-First)"

- **ID de Funcionalidad:** `006-rediseño-matte-luxury`
- **Estado:** completada-y-auditada
- **Fecha:** 2026-10-25
- **Equipo:** `orquestador` -> `subagente-ui` -> `subagente-motion` -> `implementador` -> `revisor-critico`

---

### Fase 1: Fundamentos Visuales, Navegación Flotante y Dashboard de Inicio

#### 1. Sistema Central de Tokens
- [x] **T1.1:** Crear `src/theme/tokens.js` con la paleta Monocromo Matte Luxury (`#0A0A0A`, `#141414`, `#1C1C1E`, `#262626`, `#F2F2F7`, `#8E8E93`), cuadrícula 4pt/8pt y escala tipográfica editorial.
- [x] **T1.2:** Configurar escala de 5 niveles para el mapa de calor con tokens de fondo, borde y color de texto para inversión automática en niveles 3 y 4.

#### 2. Barra de Navegación Inferior Flotante (Android-First)
- [x] **T2.1:** Refactorizar `src/components/BarraNavegacionInferior.jsx` a diseño flotante (`position: 'absolute'`, `bottom: 16`, `left: 16`, `right: 16`, `borderRadius: 24`, `elevation: 8`).
- [x] **T2.2:** Reemplazar el 100% de los emojis (`⌂`, `⚡`, `🥗`, `💪`, `🔥`) por iconos de `@expo/vector-icons` (`Feather`: `home`, `activity`, `pie-chart`, `camera`, `calendar`).
- [x] **T2.3:** Implementar slider indicativo con `react-native-reanimated` (cálculo de ancho numérico en `onLayout` y resorte `withSpring` amortiguado sin desbordes).
- [x] **T2.4:** Integrar pulso háptico `vibrarSeleccionBascula` al alternar entre pestañas e insignia minimalista para contadores diarios.

#### 3. Pantalla de Inicio Editorial (`MenuBienvenida.jsx`)
- [x] **T3.1:** Erradicar todos los emojis del encabezado, botones y tarjetas.
- [x] **T3.2:** Diseñar encabezado tipográfico con fecha local formateada en mayúsculas (`DOMINGO, 25 DE OCTUBRE`) y saludo sobrio.
- [x] **T3.3:** Crear caja de 3 KPIs (Racha, Entrenamientos, Comidas) en fila horizontal con divisores de 1px.
- [x] **T3.4:** Adaptar `src/components/heatmap/MonthBlock.jsx` y `HeatmapDayCell.jsx` a la paleta monocroma de 5 niveles con inversión de color de texto.
- [x] **T3.5:** Aplicar `paddingBottom: 110` en `scrollContent` para garantizar scroll clearance sobre la barra flotante.

#### 4. Integración y Coordinación en `App.js`
- [x] **T4.1:** Añadir `BackHandler` de Android para retornar a `bienvenida` si el usuario pulsa Atrás en una pestaña secundaria.
- [x] **T4.2:** Envolver el área de contenido con `Animated.View` y `entering={FadeIn.duration(180)}` usando `key={vistaActiva}` para transición suave en UI Thread sin doble render.

---

### Fase 2: Módulo de Entrenamientos y Live Mode
- [x] **T2.1:** Implementar tarjeta colapsable de ejercicio con resorte elástico en `EntrenamientosView.jsx`.
- [x] **T2.2:** Implementar botón de borrado seguro con la **Cápsula de Progreso Líquido** (1000ms con `scaleX` y hápticos).
- [x] **T2.3:** Rediseñar `LiveModeModal.jsx` y `CatalogoEjerciciosModal.jsx` con iconos Feather y estética monocroma.

---

### Fase 3: Nutrición, Físico y Heatmap Anual
- [x] **T3.1:** Rediseñar `NutricionView.jsx` (tarjetas de macros y cámara con placeholders HTTPS y cero emojis).
- [x] **T3.2:** Rediseñar `CambioFisicoView.jsx` (báscula circular minimalista, galería de fotos, cero emojis).
- [x] **T3.3:** Rediseñar `HeatmapView.jsx` y `MapaCalorAnual.jsx` (12 meses con la paleta monocroma de 5 niveles y selector con Feather).

---

### Fase 4: Verificación, Control de Calidad y Cierre
- [x] **T4.1:** Ejecutar `npx expo-doctor` y certificar 20/20 checks limpios.
- [x] **T4.2:** Auditar con `git diff` que ningún archivo de `src/services/` ni `src/utils/` haya alterado su lógica interna.
- [x] **T4.3:** Actualizar `MEMORY.md` y generar el walkthrough final.
