# MEMORY.md — Fitness Tracker & Nutritional AI
Memoria viva del proyecto entre sesiones. Máximo ~50 líneas: resumir o eliminar lo obsoleto.

## Estado Actual
- Specs previas completadas: 001 a 007 (borrado seguro, físico IA, live mode, heatmap tab, rediseño Matte Luxury y selector semanal).
- Spec 008 completada y auditada (`specs/008-panel-configuracion-api-key/`): Panel Lateral de Configuración & Conector Universal de Gemini API Key con modelo BYOK, micro-animación en engranaje, 4 métodos de cierre y validación en tiempo real.
- Bugfix Android Touch & Drawer resuelto: Inversión táctil en botón de configuración (`TouchableOpacity` estático 36x36 dp exterior con `hitSlop: 12` + `Animated.View` interior), app envuelta en `GestureHandlerRootView` y drawer migrado a `Modal` nativo con `statusBarTranslucent`.
- Distribución APK nativa: GitHub Actions (`.github/workflows/release-apk.yml`) configurado para compilar APK y publicar en GitHub Releases por tags (`v*`) y manual (`workflow_dispatch`).
- Diagnóstico de compilación nativa: Metro bundle Android verificado con éxito (1,229 módulos, 0 errores); `expo-doctor` 20/20 checks pasados.
- Sistema de Tokens (`src/theme/tokens.js`): Fondo `#0A0A0A`, superficies `#141414`/`#1C1C1E`, bordes hairline `#262626`, texto `#FFFFFF`/`#8E8E93`.
- 100% Erradicación de Emojis: Cero glifos en UI, alertas y catálogo; uso exclusivo de `@expo/vector-icons` (`Feather`).
- Arquitectura Android-First: Barra flotante (`elevation: 8`), `BackHandler` nativo en `App.js` y scroll clearance mandatorio (`paddingBottom: 110`).

## Decisiones Técnicas Clave
- Flujo de trabajo mandatorio: Nuevas specs y bugs pasan obligatoriamente por el equipo multi-agente (`orquestador` → `planificador`/`subagente-ui` → `subagente-motion`/`implementador` → `revisor-critico`).
- Modelo BYOK para Gemini: Clave almacenada de forma privada en `@fitness_tracker_gemini_api_key` (`AsyncStorage`) con fallback a `EXPO_PUBLIC_GEMINI_API_KEY`.
- Panel Lateral (Drawer): Superficie carbón mate sólida (`#141414`), elevación 16, 4 métodos de cierre simultáneos (Backdrop, Swipe derecho, botón X y Android BackHandler).
- Micro-interacción del engranaje: Resorte en UI Thread (`scale: 0.90`, rotación `18deg`) y pulso háptico causal sincronizado (`haptics.js`).
- Inmutabilidad y fechas locales: Fecha local estricta `YYYY-MM-DD` con `obtenerFechaLocal()`. Prohibido `toISOString()`.
- Persistencia local inmutable sin Base64: Almacena URIs para prevenir `CursorWindow` overflow en Android.
- Failover en Gemini Vision (`src/services/gemini.js`): Principal `gemini-3-flash-preview`, respaldo `gemini-3.5-flash-lite`, timeout 60s con `AbortController`.
