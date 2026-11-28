# MEMORY.md — IXN (antes Fitness Tracker)
Memoria viva del proyecto entre sesiones. Máximo ~50 líneas: resumir o eliminar lo obsoleto.

## Estado Actual (2026-11-27)
- **Dónde nos quedamos (cierre del 27/11/2026):** `main` está en v2.3.0 (build 8) con las Specs 020–026 y Vercel producción (https://ian-app.vercel.app/) ya la sirve, revisada sin errores de consola. Se mergearon el PR #11 (Specs 020–025, commit `0a0726d`) y después el PR #12 (Spec 026, `d76fd13`), ambos probados antes en su preview de Vercel y en Android (emulador con Expo Go). Las ramas de esos PR siguen en GitHub sin borrar.
- La rama local `claude/app-status-c09be7` (una "Spec 020" de accesibilidad paralela) quedó **obsoleta**: lo útil se portó a la 026. No fusionarla.
- Siguiente paso sugerido: Spec de UX (valores iniciales del onboarding 2010/182 cm/74 kg/Hombre, entrada numérica directa, temporizador de descanso, meta de kcal, registro manual de comidas).
- Specs completadas: 001–011, 013–026 con `CODIGO_APROBADO`. La 012 está archivada: la app es BYOK por decisión del dueño (Q16).
- **020 Seguridad:** CSP y cabeceras en `vercel.json`, `public/index.html` (`lang="es"`) y manifiesto PWA. `scripts/test-gate.js` existe porque Jest ignoraba los worktrees. SDK 58.0.26 y `npm audit` en 0 altas. Fotos permanentes en `fotosStorage.js` (`foto-doc:` en nativo, `foto-local:` en web con tope de 80). Los guardados lanzan el error en vez de devolver `[]`.
- **021 Gemini:** un único motor `ejecutarConFailover` con reintentos, tope de 90 s, `thinkingLevel: 'low'` y mensajes claros. Cadena: `3.5-flash-lite` → `3.6-flash` → `3-flash-preview`. Con clave gratuita, Flash-Lite acertó 10/12 dentro de los rangos USDA.
- **022 Refactor:** Onboarding 3015 → 133 líneas y CambioFisico 2191 → 76, con hooks y renders en `onboarding/` y `cambioFisico/`. El DOM es idéntico, verificado por hash, y hay 12 snapshots de caracterización.
- **023 Accesibilidad:** 0 táctiles sin nombre o rol (test AST); `textMuted` en `#898989` (AA); anuncios con `anunciar`/`RegionAnuncios`; `base/Texto` limita la escala de letra a 1.4×; acción accesible «Borrar».
- **024 Movimiento y feedback:** `usePreferenciaMovimiento` (una suscripción compartida) y `<ConfigMovimientoReducido/>` en `App.js`, que aplica el cambio en vivo a todas las animaciones; hápticos de éxito y error; 5 sonidos sintetizados (`expo-audio` sin micrófono) con interruptor en Configuración. Q14 (opacidad de pulsación) está **pendiente** de que el usuario vea un video.
- **025 Respaldo:** `services/respaldo.js` + `SeccionRespaldo` en Configuración. Lista cerrada de claves (nunca la API key), validación de archivos no confiables, restauración atómica con vuelta atrás y fotos opcionales con topes (8 MB por foto, 45 MB en total). Usa `expo-sharing` y `File.pickFileAsync`.
- **026 Accesibilidad (complementos):** rama `claude/spec-026-accesibilidad-complementos` sobre la del PR #11. Etiqueta en los 19 campos (Live Mode: «Peso en kilogramos, serie N»), fechas legibles (`utils/etiquetasFecha.js`), estado solo con `aria-*` (RNW 0.21 ignora `accessibilityState`), `ModalAccesible` (web: `#root` inert, foco al título en `onShow` y de vuelta con pila de `utils/gestorModales.js`, región de anuncios en el modal superior) y texto mínimo de 11 px (`tamanoTexto.test.js`). Probada en preview de Vercel y en Android (emulador, Expo Go).
- **Pendiente del usuario:**
  - aceptar la enmienda de CA-4 de la 020 (parche de SDK);
  - probar en un teléfono real: TalkBack/VoiceOver, caché de fotos, «Quitar animaciones», sonidos, análisis con Gemini y restaurar un respaldo (en el emulador ya se probaron flujos, persistencia, exportar respaldo y el árbol de accesibilidad);
  - rotar la API key compartida en el chat;
  - confirmar si la fecha por defecto `2010-11-26` es intencional.

## Decisiones Técnicas Clave
- **Marca IXN (Spec 027):** solo cambian los nombres visibles (`expo.name`, web, manifiesto, saludo y onboarding). `slug`, `package`, `bundleIdentifier`, `APP_RESPALDO = 'mi-fitness-app'`, las claves `@fitness_tracker_*` y el nombre del APK no se tocan para no romper actualizaciones ni respaldos.
- **Antes de cada PR:** probar la preview de Vercel de la rama (enlace compartible por el conector) y Android con Expo Go (`npx expo start` + emulador `medium_phone` vía `adb`), y dejar el QR listo para el usuario.
- **Puerta de calidad** (`npm run gate`): lint → `test-gate` (falla si no corre ninguna suite) → `bundle:check`.
- **Claves:** nunca en el código ni en la URL. En nativo, SecureStore; en web, AsyncStorage protegido por la CSP (`connect-src` solo permite Gemini).
- **Gemini con clave gratuita:**
  - Las peticiones con imagen dan 503/429 con frecuencia: usar Flash-Lite con reintentos.
  - Gemini 4 necesita facturación.
  - `3.8-flash`/`3.7-flash` siguen prohibidos (503).
- **Fechas:** siempre locales `YYYY-MM-DD` (`obtenerFechaLocal()`). Prohibido `toISOString()`.
- **Persistencia:** inmutable, con claves mensuales para estudio (CursorWindow). Las fotos nunca van dentro de las listas.
- **Componentes partidos (Spec 022):**
  - Los renders se invocan como funciones con `ctxRender`.
  - `contextoRender.test.js` vigila que el contexto esté completo.
  - Cualquier cambio visual debe actualizar los snapshots y justificar el diff.
- **Accesibilidad:**
  - Todo táctil lleva `accessibilityLabel` + `accessibilityRole`.
  - Los radios y casillas usan `aria-checked`; las pestañas, `aria-selected`.
  - El texto se importa de `components/base/Texto`, no de `react-native`.
- **Alertas:** usar siempre `mostrarAlerta` (`Alert.alert` no muestra nada en web).
- **Tests de componentes:** importar `test-utils/setupComponentes`, con RNTL 14 (API async) y el resolver de Jest de Reanimated.
- **UI:** cero emojis, iconos `Feather`, tokens Dark Luxury OLED. Objetivos táctiles ≥ 44 pt y acciones primarias en la zona del pulgar.
- **Archivos de más de 500 líneas** (storage.js, PanelConfiguracionLateral, gemini.js): localizar con `grep` y leer por rangos.
- **Reparto de roles:** Claude Code planifica y revisa; Antigravity implementa. Cualquiera de los dos asume todos los roles si el otro no está disponible.
