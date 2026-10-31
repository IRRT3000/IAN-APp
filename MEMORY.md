# MEMORY.md — Fitness Tracker & Nutritional AI
Memoria viva del proyecto entre sesiones. Máximo ~50 líneas: resumir o eliminar lo obsoleto.

## Estado Actual
- Versión v1.2.0 (build 4) publicada en GitHub Releases con compilación APK en CI/CD.
- Specs completadas: 001 a 011 (borrado seguro, físico IA, live mode, heatmap, rediseño Matte Luxury, BYOK API Key, adaptación ergonómica, onboarding biométrico, base de pruebas).
- Spec 012 (IA por Supabase + login OTP) ARCHIVADA: rama `spec/012-acceso-ia-seguro`. App opera en BYOK.
- Spec 013 completada: Calculadora minimalista Kg ⟷ Lbs con tokens OLED y selector pastilla háptico.
- Spec 014 completada: Previsualización de ejercicios con ilustraciones de RepDB (47 WebP locales, 192×192 px) y crédito en Configuración/README.
- Spec 015 (`specs/015-ampliacion-catalogo-100-ejercicios/`): IMPLEMENTADA en rama `spec/015-catalogo-100-ejercicios-recientes` (worktree `spec-15-implementation-100-ejercicios`).
  - Catálogo ampliado a 100 ejercicios base (Pecho 17, Espalda 17, Pierna 20, Hombro 17, Brazo 17, Core 12) con 100 WebPs locales de RepDB (192×192, 328 KB en total).
  - Fila ergonómica en `EntrenamientosView.jsx`: botón primario "Iniciar Nuevo Ejercicio" (flex: 1) + botón cuadrado de lupa (50×50 pt, touch target >= 44 pt) que autoenfoca el buscador.
  - Carrusel horizontal "RECIENTES" en `CatalogoEjerciciosModal.jsx`: muestra los últimos 8 ejercicios únicos deducidos del historial con miniatura 36 pt, ocultándose ante búsquedas de texto y filtrándose ante pastillas de grupo muscular.
  - Puerta de calidad en verde: 7 suites, 70 tests Jest (`imagenesEjercicios.test.js`, `catalogoRecientes.test.js`), lint 0 errores y `bundle:check` exitoso.
- Fix del Drawer de Configuración: Resuelto desbordamiento con `useWindowDimensions`, `flex: 1` e inoperancia táctil en Android (`activeOffsetX(25)`, `cancelsTouchesInView(false)`).
- Live Mode Thumb-Zone: Guardado primario (54dp) y secundario reubicados en la barra inferior al alcance natural del pulgar.
- Touch Targets y Modales: Touch targets >= 44x44pt en toda la app (`DaySummaryModal`, `CambioFisicoView`, `CatalogoEjerciciosModal`, `CalculadoraPesoModal`).
- 100% Erradicación de Emojis: Cero glifos en UI, alertas y catálogo; uso exclusivo de `@expo/vector-icons` (`Feather`).
- Sistema de Tokens (`src/theme/tokens.js`): Paleta `#0A0A0A`/`#141414`/`#262626`, `touchTarget` y `safeArea`.
- Reparto de roles: Claude Code y Antigravity coordinados por Specs; modo solo con `orquestador` y `equipo-agentes`.

## Decisiones Técnicas Clave
- Puerta de Calidad (`npm run gate`): Valida en serie `lint` (código 0), `test` (`jest --ci` con 7 suites, 70 tests) y `bundle:check` (`expo export --platform android` limpiando `.bundle-check/` en `finally`).
- Safe Areas Resilientes (`useSafeInsets.js`): Pisos mínimos obligatorios (`top >= 28` Android / `20` iOS; `bottom >= 12` Android / `20` iOS).
- Ergonomía Thumb-Zone: Acciones primarias en la mitad inferior de la pantalla; touch targets >= 44x44pt.
- Persistencia inmutable en AsyncStorage: Registros con fechas locales `YYYY-MM-DD` (`obtenerFechaLocal()`). Prohibido `toISOString()`.
- Dependencias nativas: Obligatorio `npx expo install` para compatibilidad binaria con Expo SDK 58.
