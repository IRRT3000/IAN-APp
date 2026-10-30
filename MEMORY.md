# MEMORY.md — Fitness Tracker & Nutritional AI
Memoria viva del proyecto entre sesiones. Máximo ~50 líneas: resumir o eliminar lo obsoleto.

## Estado Actual
- Versión v1.2.0 (build 4) publicada en GitHub Releases con compilación APK en CI/CD.
- Specs completadas: 001 a 009 (borrado seguro, físico IA, live mode, heatmap, rediseño Matte Luxury, BYOK API Key, adaptación ergonómica Mobile-First).
- Spec 010 completada (`specs/010-onboarding-perfil-biometrico/`): Onboarding cinemático de 6 escenas (`OnboardingBienvenidaModal.jsx`: Hero Intro, 4 pasos biométricos con paneles reactivos en vivo y celebración "Pasaporte Biométrico Calibrado" con Reanimated) y perfil 100% dinámico en `AsyncStorage` (`guardarPerfilCompletoUsuario`, `parsearFechaLocalYYYYMMDD`, `pesoKgBase` inicial vs `pesoKgActual` actualizado en cada chequeo físico). Integración completa con Gemini Vision en Nutrición (con evaluación en `"detalles"`) y Cambio Físico, más re-calibración desde Inicio, Configuración o Cambio Físico.
- Spec 011 completada (`specs/011-base-pruebas/`): `npm run gate` = lint (eslint 9 + `eslint-config-expo/flat`) + jest (`jest-expo`, 4 suites, 37 pruebas de lógica pura) + `bundle:check` (`scripts/bundle-check.js`). Pendiente: ~24 `eslint-disable-next-line` de reglas `react-hooks/*` (sobre todo `immutability` en `sharedValue.value =` de Reanimated); migrar a `sv.set()` en una spec futura.
- Spec 012 (IA por Supabase + login OTP) ARCHIVADA el 2026-10-30: implementada y revisada pero no integrada; vive solo en la rama `spec/012-acceso-ia-seguro`. Se descartó por el SMTP (Gmail rechazó credenciales) y el dueño eliminó el proyecto Supabase. La app sigue en el estado de la Spec 011 con BYOK.
- Fix del Drawer de Configuración: Resuelto desbordamiento con `useWindowDimensions`, `flex: 1` e inoperancia táctil en Android (cambio a `activeOffsetX(25)`, `cancelsTouchesInView(false)`, `TouchableOpacity` de RNGH y `expo-clipboard` para pegar API key nativamente).
- Live Mode Thumb-Zone: Guardado primario (54dp) y secundario reubicados en la barra inferior al alcance natural del pulgar; ocultamiento dinámico ante teclado con botón de descarte rápido; validación visual de series incompletas en rojo.
- Touch Targets y Modales: Touch targets >= 44x44pt en toda la app (`DaySummaryModal`, `CambioFisicoView`, `CatalogoEjerciciosModal`). Barra de navegación flotante adaptada dinámicamente a `insets.bottom`.
- 100% Erradicación de Emojis: Cero glifos en UI, alertas y catálogo; uso exclusivo de `@expo/vector-icons` (`Feather`).
- Sistema de Tokens (`src/theme/tokens.js`): Paleta `#0A0A0A`/`#141414`/`#262626`, `touchTarget` y `safeArea`.
- Reparto de roles (en `main`, ver `AGENTS.md`): Claude Code planifica y revisa; Antigravity implementa y diseña; el usuario pasa el turno (en Deska o fuera). Cualquiera de los dos asume todos los roles si el otro se queda sin tokens (agentes de Claude en `.claude/agents/`, que apuntan a `.agents/agents/`). Modo Solo de Antigravity con `orquestador` queda opcional.

## Decisiones Técnicas Clave
- Puerta de Calidad (`npm run gate`): Valida en serie `lint` (código 0, sin errores), `test` (`jest --ci` con 4 suites) y `bundle:check` (`expo export --platform android` limpiando `.bundle-check/` en `finally` para proteger secretos).
- Safe Areas Resilientes (`useSafeInsets.js`): Pisos mínimos obligatorios contra Dynamic Island, barras de estado y gestos (`top >= 28` Android / `20` iOS; `bottom >= 12` Android / `20` iOS).
- Ergonomía Thumb-Zone: Acciones primarias y de guardado en la mitad inferior de la pantalla; cabeceras despejadas solo para cancelación/cierre e insignias.
- Manejo de Teclado en Modales: Detección activa con `Keyboard.addListener` para alternar barras de acción o replegar elementos superpuestos.
- Persistencia inmutable en AsyncStorage: Registros con fechas locales `YYYY-MM-DD` (`obtenerFechaLocal()`). Prohibido `toISOString()`.
- Dependencias nativas: Obligatorio `npx expo install` para compatibilidad binaria con Expo SDK 58.
- Sin automatizar Antigravity en headless (`agy -p`): niega acciones sin poder preguntar y aun así responde éxito (exit 0), y sus reglas allow/deny solo aceptan comandos exactos (v1.4.10). Se usa como tarea normal de Deska.
