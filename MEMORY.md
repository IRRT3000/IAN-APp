# MEMORY.md — Fitness Tracker & Nutritional AI
Memoria viva del proyecto entre sesiones. Máximo ~50 líneas: resumir o eliminar lo obsoleto.

## Estado Actual
- Versión v1.1.1 (build 3) publicada en GitHub Releases con compilación APK en CI/CD.
- Specs completadas: 001 a 009 (borrado seguro, físico IA, live mode, heatmap, rediseño Matte Luxury, BYOK API Key, adaptación ergonómica Mobile-First).
- Spec 010 completada (`specs/010-onboarding-perfil-biometrico/`): Onboarding cinemático de 6 escenas (`OnboardingBienvenidaModal.jsx`: Hero Intro, 4 pasos biométricos con paneles reactivos en vivo y celebración "Pasaporte Biométrico Calibrado" con Reanimated) y perfil 100% dinámico en `AsyncStorage` (`guardarPerfilCompletoUsuario`, `parsearFechaLocalYYYYMMDD`, `pesoKgBase` inicial vs `pesoKgActual` actualizado en cada chequeo físico). Integración completa con Gemini Vision en Nutrición (con evaluación en `"detalles"`) y Cambio Físico, más re-calibración desde Inicio, Configuración o Cambio Físico.
- Fix del Drawer de Configuración: Resuelto desbordamiento con `useWindowDimensions`, `flex: 1` e inoperancia táctil en Android (cambio a `activeOffsetX(25)`, `cancelsTouchesInView(false)`, `TouchableOpacity` de RNGH y `expo-clipboard` para pegar API key nativamente).
- Live Mode Thumb-Zone: Guardado primario (54dp) y secundario reubicados en la barra inferior al alcance natural del pulgar; ocultamiento dinámico ante teclado con botón de descarte rápido; validación visual de series incompletas en rojo.
- Touch Targets y Modales: Touch targets >= 44x44pt en toda la app (`DaySummaryModal`, `CambioFisicoView`, `CatalogoEjerciciosModal`). Barra de navegación flotante adaptada dinámicamente a `insets.bottom`.
- 100% Erradicación de Emojis: Cero glifos en UI, alertas y catálogo; uso exclusivo de `@expo/vector-icons` (`Feather`).
- Sistema de Tokens (`src/theme/tokens.js`): Paleta `#0A0A0A`/`#141414`/`#262626`, `touchTarget` y `safeArea`.
- En curso (rama `chore/modo-dual`): Modo Dual Claude Code (planifica/revisa) + Antigravity (implementa). Plan aprobado en `docs/plan-modo-dual.md`; siguiente paso: Fase 0 (pruebas de `agy`, permisos y skills). La rama `flow/setup-multi-harness` queda solo como respaldo.

## Decisiones Técnicas Clave
- Safe Areas Resilientes (`useSafeInsets.js`): Pisos mínimos obligatorios contra Dynamic Island, barras de estado y gestos (`top >= 28` Android / `20` iOS; `bottom >= 12` Android / `20` iOS).
- Ergonomía Thumb-Zone: Acciones primarias y de guardado en la mitad inferior de la pantalla; cabeceras despejadas solo para cancelación/cierre e insignias.
- Manejo de Teclado en Modales: Detección activa con `Keyboard.addListener` para alternar barras de acción o replegar elementos superpuestos.
- Persistencia inmutable en AsyncStorage: Registros con fechas locales `YYYY-MM-DD` (`obtenerFechaLocal()`). Prohibido `toISOString()`.
- Dependencias nativas: Obligatorio `npx expo install` para compatibilidad binaria con Expo SDK 58.
