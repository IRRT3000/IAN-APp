# MEMORY.md — Fitness Tracker & Nutritional AI
Memoria viva del proyecto entre sesiones. Máximo ~50 líneas: resumir o eliminar lo obsoleto.

## Estado Actual (2026-11-24)
- `main` y Vercel (`ian-app`) siguen en v2.2.0 (build 7). Hay trabajo **sin fusionar** en la rama `claude/app-analysis-improvements-52feef` (Specs 020–024).
- Specs completadas: 001–011, 013–019; 020–023 con `CODIGO_APROBADO`; 024 en revisión. La 012 está archivada: la app es BYOK por decisión del dueño (Q16).
- **020 Seguridad:** CSP y cabeceras en `vercel.json`, `public/index.html` (`lang="es"`) y manifiesto PWA. `scripts/test-gate.js` existe porque Jest ignoraba los worktrees. SDK 58.0.26 y `npm audit` en 0 altas. Fotos permanentes en `fotosStorage.js` (`foto-doc:` en nativo, `foto-local:` en web con tope de 80). Los guardados lanzan el error en vez de devolver `[]`.
- **021 Gemini:** un único motor `ejecutarConFailover` con reintentos, tope de 90 s, `thinkingLevel: 'low'` y mensajes claros. Cadena: `3.5-flash-lite` → `3.6-flash` → `3-flash-preview`. Con clave gratuita, Flash-Lite acertó 10/12 dentro de los rangos USDA.
- **022 Refactor:** Onboarding 3015 → 133 líneas y CambioFisico 2191 → 76, con hooks y renders en `onboarding/` y `cambioFisico/`. El DOM es idéntico, verificado por hash, y hay 12 snapshots de caracterización.
- **023 Accesibilidad:** 0 táctiles sin nombre o rol (test AST); `textMuted` en `#898989` (AA); anuncios con `anunciar`/`RegionAnuncios`; `base/Texto` limita la escala de letra a 1.4×; acción accesible «Borrar».
- **024 Movimiento y feedback:** `usePreferenciaMovimiento` reactivo; hápticos de éxito y error; 5 sonidos sintetizados (`expo-audio` sin micrófono) con interruptor en Configuración. Q14 (opacidad de pulsación) está **pendiente** de que el usuario vea un video.
- **Pendiente del usuario:**
  - aceptar la enmienda de CA-4 de la 020 (parche de SDK);
  - subir `versionCode` (hay módulos nativos nuevos);
  - probar en Android (caché de fotos, TalkBack, «Quitar animaciones», sonidos);
  - rotar la API key compartida en el chat;
  - confirmar si la fecha por defecto `2010-11-26` es intencional.

## Decisiones Técnicas Clave
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
