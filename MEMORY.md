# MEMORY.md — Fitness Tracker & Nutritional AI
Memoria viva del proyecto entre sesiones. Máximo ~50 líneas: resumir o eliminar lo obsoleto.

## Estado Actual (2026-11-23)
- Versión v2.2.0 (build 7) en `main` y en Vercel (`ian-app`, producción READY).
- Specs completadas: 001 a 011, 013 a 019. La 012 (IA por Supabase) está archivada en la rama `spec/012-acceso-ia-seguro`. La app usa BYOK: cada usuario pone su clave y el dueño decidió mantenerlo así (Q16).
- **Jornada de mejora 2026-11-23** (rama `claude/app-analysis-improvements-52feef`): Specs 020 a 024 con PLAN_APROBADO; Claude Code implementa todos los roles (Q2).
  - **020 CODIGO_APROBADO:**
    - CSP y cabeceras en `vercel.json`, `public/index.html` (`lang="es"`) y manifiesto PWA.
    - `scripts/test-gate.js` (Jest ignoraba los worktrees); Expo SDK 58.0.26 y `npm audit` en 0 altas.
    - Fotos permanentes con `src/services/fotosStorage.js`: `foto-doc:` en nativo, `foto-local:` en web con tope de 80.
    - `Alert.alert` → `mostrarAlerta`; los guardados ya no se tragan errores.
  - **021 a 024:** en curso (Gemini, refactor de componentes gigantes, accesibilidad, motion, hápticos y sonidos sintetizados).
- Pendiente del usuario: aceptar la enmienda de CA-4 de la 020 (parche de SDK), probar en Android («Borrar caché» con fotos, TalkBack) y subir `versionCode` en el siguiente release (hay nuevos módulos nativos: `expo-file-system` y `expo-image-manipulator`).

## Decisiones Técnicas Clave
- **Puerta de calidad** (`npm run gate`): `lint` → `node scripts/test-gate.js` (falla si no corre ninguna suite) → `bundle:check` (export Android y escaneo de secretos).
- **Claves:** la API key nunca va en el código ni en query params. En nativo vive en SecureStore; en web, en AsyncStorage, protegida por la CSP (`connect-src` solo permite Gemini).
- **Gemini con clave gratuita:**
  - Las peticiones con imagen fallan a menudo por 503 (saturación) o 429 (límite por minuto).
  - Gemini 4 necesita facturación.
  - `gemini-3.8-flash` y `3.7-flash` siguen dando 503 y se mantienen prohibidos.
- **Fechas:** siempre locales `YYYY-MM-DD` (`obtenerFechaLocal()`). Prohibido `toISOString()`.
- **Persistencia:**
  - Inmutable, con claves mensuales para estudio (CursorWindow ~2 MB) y claves por fecha para los resúmenes.
  - Las fotos nunca se guardan dentro de las listas.
- **Safe areas** con pisos mínimos (`useSafeInsets.js`).
- **Thumb-Zone:** acciones primarias abajo, objetivos táctiles ≥ 44 pt.
- **UI:** cero emojis, iconos `Feather`, tokens Dark Luxury OLED en `src/theme/tokens.js`.
- **Alertas:** usar siempre `mostrarAlerta` (`alertUtils.js`). `Alert.alert` no muestra nada en web.
- **Archivos de más de 500 líneas** (Onboarding, CambioFisicoView, storage.js, PanelConfiguracionLateral): localizar con `grep` y leer por rangos.
- **Reparto de roles:** Claude Code planifica y revisa; Antigravity implementa. Cualquiera de los dos asume todos los roles si el otro no está disponible.
