# MEMORY.md — Fitness Tracker & Nutritional AI
Memoria viva del proyecto entre sesiones. Máximo ~50 líneas: resumir o eliminar lo obsoleto.

## Estado Actual
- Specs previas completadas: 001 (borrado seguro), 002 (físico IA), 003 (live mode), 004 (mapa calor), 005 (pestaña heatmap y reactividad).
- Spec 006 completada y auditada (`specs/006-rediseño-matte-luxury/`): Rediseño Total Monocromo Matte Luxury (Android-First Edition).
- Selector Semanal modernizado (`SelectorSemanal.jsx`): Paleta Monocromo Luxury, celdas individuales memoizadas (`CeldaDiaSemanal`), físicas de resorte en UI Thread (`scale: 0.94 -> 1.0`), háptica causal y cero verde neón.
- Sistema de Tokens (`src/theme/tokens.js`): Fondo `#0A0A0A`, superficies `#141414`/`#1C1C1E`, bordes hairline `#262626`, texto `#FFFFFF`/`#8E8E93`.
- 100% Erradicación de Emojis: Cero glifos en UI, alertas y catálogo; uso exclusivo de `@expo/vector-icons` (`Feather`).
- Arquitectura Android-First: Barra flotante (`elevation: 8`), `BackHandler` nativo retornando a Inicio en `App.js`, y scroll clearance mandatorio (`paddingBottom: 110`) en todas las listas.
- Cápsula de Progreso Líquido (1000ms): Borrado en UI Thread con Reanimated 4 (`scaleX`) y hápticos unificados sin dependencias SVG.
- Heatmap Monocromo de 5 Niveles: Inversión tipográfica automática a `#0A0A0A` en niveles 3 y 4 en pantallas AMOLED.
- Inmunidad del Backend: Cero cambios en `storage.js`, `gemini.js`, `dateUtilsLocal.js` y fórmulas de `waterGlassEngine.js`.
- Verificación técnica: `npx expo-doctor` 20/20 checks pasados, Metro bundle Android exportado con éxito (0 errores).

## Decisiones Técnicas Clave
- Flujo de trabajo mandatorio: Nuevas specs y corrección de bugs pasan obligatoriamente por el equipo multi-agente (`orquestador` → `planificador`/`subagente-ui` → `subagente-motion`/`implementador` → `revisor-critico`).
- Android-First sin blur de GPU: Superficies sólidas carbón mate (`#141414`) y elevación nativa en lugar de `BlurView` para evitar caídas de frames y esquinas rotas en Android.
- Slider de Pestañas Numérico: Medición única en contenedor padre con `onLayout` y resorte amortiguado (`duration: 240, dampingRatio: 1, overshootClamping: true`) evitando advertencias en worklets.
- Transición fluida `FadeIn.duration(180)` con `key={vistaActiva}` en `App.js`: Cero doble montaje, sin fugas de memoria y respuesta táctil inmediata.
- Motor Vaso de Agua y Días de Descanso (`waterGlassEngine.js`, `storage.js`): 50% nutrición y 50% entreno/descanso; descanso persiste en `@fitness_tracker_dias_descanso_v1` sin penalización.
- Inmutabilidad temporal y fechas locales: Fecha local estricta `YYYY-MM-DD` con `obtenerFechaLocal()`. Prohibido `toISOString()`.
- Persistencia local inmutable sin Base64: Almacena URIs para prevenir `CursorWindow` overflow en Android.
- Haptics unificados (`src/services/haptics.js`): Pulsos hápticos para borrado, series, fotos y báscula con fallback a `Vibration.vibrate`.
- Failover en Gemini Vision (`src/services/gemini.js`): Principal `gemini-3-flash-preview`, respaldo `gemini-3.5-flash-lite`, timeout 60s con `AbortController`.
