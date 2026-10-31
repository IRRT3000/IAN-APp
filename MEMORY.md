# MEMORY.md — Fitness Tracker & Nutritional AI
Memoria viva del proyecto entre sesiones. Máximo ~50 líneas: resumir o eliminar lo obsoleto.

## Estado Actual
- Versión v2.0.0 (build 5) con Módulo de Estudio (Spec 015) y Resumen IA Gemini (Spec 016).
- Specs completadas: 001 a 011, 013, 015 y 016.
- Spec 012 (IA por Supabase + login OTP) ARCHIVADA el 2026-10-30: vive en rama `spec/012-acceso-ia-seguro`. App opera en BYOK.
- Spec 015 completada: Pestaña Estudio reemplaza a Heatmap en la barra, materias Escuela/Personal y sesiones con todos los campos obligatorios, partición mensual `@fitness_tracker_sesiones_estudio_v1:YYYY-MM`, cola serial de escritura y borrado sostenido de 1000ms.
- Spec 016 COMPLETADA (`specs/016-resumen-ia-estudio/`): Resumen pedagógico del día de estudio generado por Gemini con BYOK. Análisis manual, 1 por día en «hoy» (`@fitness_tracker_resumen_estudio_v1:YYYY-MM-DD`), candado a nivel de módulo `analisisEnCurso`, verificación de medianoche, histórico de 7 días, prompt sin emojis, normalizador tolerante de JSON, `ResumenEstudioCard.jsx` con 3 estados y aviso RF-7 de sesiones sin analizar. Puerta de calidad verde (`npm run gate`: 9 suites, 113 tests).
- Drawer de Configuración: Resuelto desbordamiento con `useWindowDimensions`, `flex: 1` e inoperancia táctil en Android (`activeOffsetX(25)`, `cancelsTouchesInView(false)`, `TouchableOpacity` de RNGH y `expo-clipboard`).
- Live Mode & Modales Thumb-Zone: Acciones primarias (54dp) al alcance del pulgar; touch targets >= 44x44pt; modales con `onRequestClose` para botón Atrás en Android.
- Erradicación 100% de Emojis: Cero glifos en UI, alertas y catálogo; uso exclusivo de `@expo/vector-icons` (`Feather`).
- Sistema de Tokens (`src/theme/tokens.js`): Paleta `#0A0A0A`/`#141414`/`#262626`, `touchTarget` y `safeArea`.
- Reparto de roles: Claude Code planifica y revisa; Antigravity implementa y diseña; cualquiera asume todos los roles si el otro agota tokens.

## Decisiones Técnicas Clave
- Puerta de Calidad (`npm run gate`): Valida en serie `lint` (código 0, sin errores), `test` (`jest --ci` con 9 suites, 113 tests) y `bundle:check` (`expo export --platform android` limpiando `.bundle-check/` en `finally` para proteger secretos).
- Safe Areas Resilientes (`useSafeInsets.js`): Pisos mínimos obligatorios (`top >= 28` Android / `20` iOS; `bottom >= 12` Android / `20` iOS).
- Ergonomía Thumb-Zone: Acciones primarias y guardado en la mitad inferior; cabeceras despejadas solo para cancelación/cierre e insignias.
- Manejo de Teclado en Modales: Detección con `Keyboard.addListener` para alternar barras de acción o replegar elementos superpuestos con botón «Listo».
- Persistencia inmutable en AsyncStorage: Registros con fechas locales `YYYY-MM-DD` (`obtenerFechaLocal()`). Prohibido `toISOString()`.
- Claves mensuales de estudio: `@fitness_tracker_sesiones_estudio_v1:YYYY-MM` para prevenir desbordes de CursorWindow (~2 MB) en Android.
- Claves inmutables por fecha de resumen: `@fitness_tracker_resumen_estudio_v1:YYYY-MM-DD` previene duplicados y sobrecosto BYOK.
