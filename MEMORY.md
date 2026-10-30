# MEMORY.md — Fitness Tracker & Nutritional AI
Memoria viva del proyecto entre sesiones. Máximo ~50 líneas: resumir o eliminar lo obsoleto.

## Estado Actual
- Versión v1.2.0 (build 4) publicada en GitHub Releases con compilación APK en CI/CD.
- Specs completadas: 001 a 011 (borrado seguro, físico IA, live mode, heatmap, rediseño Matte Luxury, BYOK API Key, adaptación ergonómica, onboarding biométrico, base de pruebas).
- Spec 012 (IA por Supabase + login OTP) ARCHIVADA el 2026-10-30: no integrada; vive en rama `spec/012-acceso-ia-seguro`. La app opera en BYOK.
- Spec 013 completada (`src/utils/conversionPeso.js`, `src/components/CalculadoraPesoModal.jsx`, `__tests__/conversionPeso.test.js`): Calculadora minimalista de conversión bidireccional Kg ⟷ Lbs con tokens OLED, selector pastilla háptico (`vibrarSeleccionBascula`), sanitización contra comas/múltiples puntos, defensa contra ceros/negativos/NaN y disparadores ergonómicos discretos (`repeat`, touch target >= 44pt) en cabecera de `EntrenamientosView` y `LiveModeModal`. Calidad verificada (5 suites, 56 tests Jest, lint 0 errores, bundle:check exitoso).
- Fix del Drawer de Configuración: Resuelto desbordamiento con `useWindowDimensions`, `flex: 1` e inoperancia táctil en Android (cambio a `activeOffsetX(25)`, `cancelsTouchesInView(false)`, `TouchableOpacity` de RNGH y `expo-clipboard` para pegar API key nativamente).
- Live Mode Thumb-Zone: Guardado primario (54dp) y secundario reubicados en la barra inferior al alcance natural del pulgar; ocultamiento dinámico ante teclado con botón de descarte rápido; validación visual de series incompletas en rojo.
- Touch Targets y Modales: Touch targets >= 44x44pt en toda la app (`DaySummaryModal`, `CambioFisicoView`, `CatalogoEjerciciosModal`, `CalculadoraPesoModal`). Barra de navegación flotante adaptada dinámicamente a `insets.bottom`.
- 100% Erradicación de Emojis: Cero glifos en UI, alertas y catálogo; uso exclusivo de `@expo/vector-icons` (`Feather`).
- Sistema de Tokens (`src/theme/tokens.js`): Paleta `#0A0A0A`/`#141414`/`#262626`, `touchTarget` y `safeArea`.
- Reparto de roles (en `main`, ver `AGENTS.md`): Claude Code planifica y revisa; Antigravity implementa y diseña; el usuario pasa el turno (en Deska o fuera). Cualquiera de los dos asume todos los roles si el otro se queda sin tokens.

## Decisiones Técnicas Clave
- Puerta de Calidad (`npm run gate`): Valida en serie `lint` (código 0, sin errores), `test` (`jest --ci` con 5 suites, 56 tests) y `bundle:check` (`expo export --platform android` limpiando `.bundle-check/` en `finally` para proteger secretos).
- Safe Areas Resilientes (`useSafeInsets.js`): Pisos mínimos obligatorios contra Dynamic Island, barras de estado y gestos (`top >= 28` Android / `20` iOS; `bottom >= 12` Android / `20` iOS).
- Ergonomía Thumb-Zone: Acciones primarias y de guardado en la mitad inferior de la pantalla; cabeceras despejadas solo para cancelación/cierre e insignias.
- Manejo de Teclado en Modales: Detección activa con `Keyboard.addListener` para alternar barras de acción o replegar elementos superpuestos.
- Persistencia inmutable en AsyncStorage: Registros con fechas locales `YYYY-MM-DD` (`obtenerFechaLocal()`). Prohibido `toISOString()`.
- Dependencias nativas: Obligatorio `npx expo install` para compatibilidad binaria con Expo SDK 58.
