# MEMORY.md — Fitness Tracker & Nutritional AI
Memoria viva del proyecto entre sesiones. Máximo ~50 líneas: resumir o eliminar lo obsoleto.

## Estado Actual
- Versión v2.2.0 (build 7) — Release Multiplataforma (Spec 019: Web PWA & iOS) y Análisis Nutricional IA (Spec 018).
- Specs completadas: 001 a 011, 013 a 019.
- Spec 019 COMPLETADA & EN MAIN: Soporte Multiplataforma iOS / Web PWA y Android en main y GitHub. Dependencias react-dom, react-native-web y @expo/metro-runtime. Fallback web en apiKeyStorage.js con clave en AsyncStorage, puente alertUtils.js para Web, PWA standalone en app.json, script build:web, vercel.json configurado y probado para despliegue estático, workflow GitHub Actions. Puerta de calidad en verde (18 suites, 168 tests).
- Spec 018 COMPLETADA: Análisis Nutricional Contextual y de Alta Precisión. Modal de preparación con texto opcional y vista previa compacta (135dp), botón "Analizar con IA" sticky/fijo en footer Thumb-Zone visible sin scroll incluso con teclado abierto, directiva de verdad base cuantitativa en prompt Gemini, modal de revisión con edición manual de macros 2x2, función pura `sanearValoresComida` y guardado atómico con hápticos.
- Metro Config: `metro.config.js` con middleware para resolución de assets en enlaces cruzados NTFS (`unstable_path`).
- Spec 012 (IA por Supabase + login OTP) ARCHIVADA: rama `spec/012-acceso-ia-seguro`. App opera en BYOK.
- Spec 015 completada: Pestaña Estudio reemplaza a Heatmap en la barra (Heatmap accesible desde Inicio), materias Escuela/Personal y sesiones con campos obligatorios, partición mensual `@fitness_tracker_sesiones_estudio_v1:YYYY-MM`, cola serial de escritura y borrado sostenido de 1000ms.
- Spec 016 completada: Resumen pedagógico del día de estudio generado por Gemini con BYOK. Análisis manual, 1 por día en «hoy» (`@fitness_tracker_resumen_estudio_v1:YYYY-MM-DD`), candado de módulo `analisisEnCurso`, verificación de medianoche, histórico 7 días, `ResumenEstudioCard.jsx` y normalizador tolerante de JSON.
- Spec 017 COMPLETADA: Seguridad API Key Gemini con `expo-secure-store` (`WHEN_UNLOCKED_THIS_DEVICE_ONLY`, `configureAndroidBackup`). Erradicación de `EXPO_PUBLIC_GEMINI_API_KEY`, envío por encabezado `x-goog-api-key`, migración transparente desde AsyncStorage, barrera en `bundle-check.js`, bloqueo de `RECORD_AUDIO`/`SYSTEM_ALERT_WINDOW` y refinamiento Dark Luxury OLED del Drawer.
- Ecosistema MCP & Skills: Configurados MCPs en `.agents/mcp_config.json` (`expo`, `react-native-app`, `android-adb`, `github`) y Skills instaladas (`argent-*`, `react-native-best-practices`, `github-actions`, `eas-*`, `jest`).
- Drawer de Configuración: Resuelto desbordamiento con `useWindowDimensions`, `flex: 1` e inoperancia táctil en Android (`activeOffsetX(25)`, `cancelsTouchesInView(false)`).
- Live Mode & Modales Thumb-Zone: Acciones primarias (54dp) al alcance del pulgar; touch targets >= 44x44pt; modales con `onRequestClose` para botón Atrás en Android.
- Erradicación 100% de Emojis: Cero glifos en UI, alertas y catálogo; uso exclusivo de `@expo/vector-icons` (`Feather`).
- Sistema de Tokens (`src/theme/tokens.js`): Paleta `#0A0A0A`/`#141414`/`#262626`, `touchTarget` y `safeArea`.
- Reparto de roles: Claude Code planifica y revisa; Antigravity implementa y diseña; cualquiera asume todos los roles si el otro agota tokens.

## Decisiones Técnicas Clave
- Puerta de Calidad (`npm run gate`): Valida en serie `lint` (código 0, sin errores), `test` (`jest --ci` con 17 suites, 161 tests) y `bundle:check` (`expo export --platform android` con escaneo de secretos limpiando `.bundle-check/` en `finally`).
- Seguridad de Claves: La API key nunca se incrusta en código ni viaja en query params (`?key=`). Solo reside en SecureStore protegida contra backups.
- Safe Areas Resilientes (`useSafeInsets.js`): Pisos mínimos obligatorios (`top >= 28` Android / `20` iOS; `bottom >= 12` Android / `20` iOS).
- Ergonomía Thumb-Zone: Acciones primarias y guardado en la mitad inferior; cabeceras despejadas solo para cancelación/cierre e insignias.
- Persistencia inmutable en AsyncStorage: Registros con fechas locales `YYYY-MM-DD` (`obtenerFechaLocal()`). Prohibido `toISOString()`.
- Claves mensuales de estudio: `@fitness_tracker_sesiones_estudio_v1:YYYY-MM` para prevenir desbordes de CursorWindow (~2 MB) en Android.
- Claves inmutables por fecha de resumen: `@fitness_tracker_resumen_estudio_v1:YYYY-MM-DD` previene duplicados y sobrecosto BYOK.
