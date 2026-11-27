# Spec 020: Seguridad Web, Higiene de Dependencias y Fiabilidad de la Puerta de Calidad

> **Estado: BORRADOR.** Lo redactó Claude Code el 2026-11-23, después de la auditoría general de la app. Queda pendiente de las decisiones del usuario Q1, Q6 y Q10 (ver sección 6). No se implementa nada hasta que el usuario lo apruebe y `revisor-critico` emita `PLAN_APROBADO`.

## 1. Visión y Justificación del Problema
La app lleva varias semanas sin mantenimiento. La versión web se publica en Vercel (`ian-app.vercel.app`, proyecto `ian-app`). Es pública y cualquier persona puede abrirla y pegar su propia API key de Gemini. En la web, esa clave se guarda en el almacenamiento del navegador (`localStorage`, vía AsyncStorage), porque `expo-secure-store` no existe en esa plataforma (INC-012). Por eso, si alguien lograra ejecutar código ajeno dentro de la página, podría leer la clave. La defensa estándar contra eso es una política de seguridad de contenido (CSP) y las cabeceras de seguridad del navegador, y hoy el sitio no tiene ninguna.

La auditoría también encontró que la puerta de calidad (`npm run gate`) puede dar verde sin haber ejecutado ni un solo test, que hay vulnerabilidades conocidas en las herramientas de build y que la web anuncia una PWA que en realidad no existe.

### Hallazgos que corrige esta Spec
- **H-1 (Media) — La web no tiene CSP ni cabeceras de seguridad.** `curl -I https://ian-app.vercel.app` solo devuelve `Strict-Transport-Security`. Faltan `Content-Security-Policy`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` y la protección contra incrustar la página en un `<iframe>` (`frame-ancestors`). Sin CSP, cualquier script inyectado podría leer la API key guardada en el navegador y mandarla a otro servidor.
- **H-2 (Media) — La puerta de calidad da verde sin probar nada.** En `package.json`, `testPathIgnorePatterns` y `modulePathIgnorePatterns` contienen `"/.claude/"`. Ese patrón coincide con cualquier ruta absoluta que pase por una carpeta `.claude`, y todos los worktrees de Claude Code viven en `.claude/worktrees/…`. El 2026-11-23, `npm test` dentro del worktree imprimió «No tests found, exiting with code 0» y el gate siguió adelante. Con el patrón acotado a la raíz, corren las 18 suites y los 168 tests.
- **H-3 (Baja) — Vulnerabilidades en herramientas de build.** `npm audit --omit=dev` reporta 10: 3 altas (`@expo/cli`, `node-forge`, `zod`) y 7 moderadas (`glob`, `minimatch` y paquetes `@expo/*`). Ninguna viaja dentro de la app instalada ni del bundle web, pero sí se ejecutan en la PC y en CI.
- **H-4 (Baja) — Las rutas inexistentes responden 200 con HTML.** La regla `"/(.*)" → "/index.html"` de `vercel.json` hace que `https://ian-app.vercel.app/manifest.json` (o cualquier archivo que falte) responda `200 text/html`. Eso esconde errores de despliegue y confunde a los navegadores. La app no tiene rutas propias (no usa Expo Router), así que basta con que solo las rutas sin extensión caigan en `index.html`.
- **H-5 (Baja) — El HTML declara el idioma equivocado.** El `index.html` generado tiene `<html lang="en">`, pero toda la app está en español. Los lectores de pantalla la leen con pronunciación inglesa y el navegador ofrece traducirla.
- **H-6 (Baja) — No hay límite de longitud en la descripción de comida.** El campo de texto opcional del análisis de comida (`ModalAnalisisComida.jsx`) no tiene `maxLength`. Su contenido se pega completo en el prompt de Gemini, así que un texto enorme consume tokens de la cuota del usuario sin aportar nada.

### Hallazgos que dependen de una decisión del usuario
- **H-7 (Media) — Las fotos guardadas se pierden (pendiente de Q10).** `NutricionView.jsx:275` y `CambioFisicoView.jsx` guardan la `uri` que devuelve `expo-image-picker`. En Android e iOS esa URI apunta a la carpeta de caché, que el sistema puede vaciar. En web es una URL `blob:` que deja de existir al recargar la página. La app no usa `expo-file-system`, así que nunca copia la foto a una carpeta permanente. Resultado: con el tiempo, el historial muestra fotos rotas.
- **H-8 (Baja) — La web no es una PWA instalable (pendiente de Q1/Q6).** `MEMORY.md` dice que la Spec 019 dejó una «PWA standalone», pero `expo export --platform web` no genera ningún `manifest.json` ni lo enlaza en el HTML. Se propone corregirlo en esta Spec solo si el usuario lo considera una corrección y no una función nueva.

### Lo que se verificó y está bien
- En el historial de git no hay claves reales de Gemini: se revisaron todos los commits con el patrón `AIza…` y solo aparece el texto de la expresión regular.
- El HTML exportado no tiene scripts en línea, así que la CSP puede exigir `script-src 'self'` sin `unsafe-inline`.
- El último despliegue de producción (`dpl_Ar2yQHKdKvuDZHmCKtjLqA2NnYup`, commit `4e3c686`) está en estado READY.
- Las 13 llamadas a `JSON.parse` sobre datos guardados están dentro de `try/catch` y validan la forma del resultado.

## 2. Requerimientos Funcionales (RF)
- **RF-1 (Cabeceras de seguridad):** Todas las respuestas del sitio en Vercel incluyen:
  - `Content-Security-Policy` con `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' https://generativelanguage.googleapis.com; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; manifest-src 'self'; worker-src 'self'`. `style-src` necesita `'unsafe-inline'` porque `react-native-web` inyecta los estilos en tiempo de ejecución.
  - `X-Content-Type-Options: nosniff`.
  - `Referrer-Policy: strict-origin-when-cross-origin`.
  - `Permissions-Policy: camera=(self), microphone=(), geolocation=(), payment=()`.
- **RF-2 (Rutas inexistentes):** Solo las rutas sin extensión (por ejemplo `/` o `/cualquier-ruta`) se reescriben a `index.html`. Una ruta con extensión que no exista (por ejemplo `/manifest.json` o `/x.js`) responde 404.
- **RF-3 (Puerta de calidad fiable):** Los patrones de Jest ignoran `/node_modules/` y solo `<rootDir>/.claude/`, `<rootDir>/.agents/` y `<rootDir>/.bundle-check/`. Ejecutar `npm test` dentro de cualquier worktree corre todas las suites. Si Jest no encuentra tests, no produce resultados o falla, el comando sale con código distinto de 0.
- **RF-4 (Dependencias):** Se corrigen solo las vulnerabilidades que se pueden arreglar sin `--force`, sin duplicar (anidar) ningún paquete `expo-*` o `@expo/*` y sin cambiar `expo`, `react`, `react-native` ni ninguna dependencia directa. Después se ejecutan `npx expo install --check` y `npx expo-doctor`, que deben terminar sin errores nuevos. Lo que no cumpla esas condiciones se documenta y no se toca.
- **RF-5 (Idioma del documento):** El HTML web declara `<html lang="es">`.
- **RF-6 (Límite de la descripción):** El campo de descripción del análisis de comida acepta como máximo 500 caracteres. `construirPromptAltaPrecision` también recorta el texto a 500 caracteres, por si llega por otra vía.

## 3. Criterios de Aceptación (CA)
- **CA-1:** En `dist/` no hay `<script>` sin `src` ni `eval(` / `new Function(`. Con `dist/` servido en `localhost:8099` con las cabeceras y la reescritura de `vercel.json`:
  - La app carga y se pueden recorrer Inicio, Entrenamientos, Nutrición, Cambio Físico, Estudio y el Heatmap.
  - Se guarda y valida una API key.
  - En Nutrición se elige una foto, se ve su vista previa y el análisis de Gemini responde.
  - La consola no muestra ninguna violación de CSP.

  En una vista previa de Vercel, `curl -I` muestra las cuatro cabeceras de RF-1 y `Cache-Control: public, max-age=31536000, immutable` en un archivo de `/_expo/static/`.
- **CA-2:** En la vista previa de Vercel:
  - `<url>/manifest.json` devuelve `404`, o `200` con `Content-Type: application/manifest+json` si se aprueba H-8.
  - `<url>/_expo/static/inexistente.js` devuelve `404`.
  - `<url>/` devuelve `200 text/html`.
- **CA-3:** Dentro del worktree `.claude/worktrees/<nombre>`, `npm test` informa al menos 18 suites ejecutadas (comprobación manual). `npm test -- --testPathPattern no-existe-xyz` termina con código distinto de 0.
- **CA-4:** `npm audit --omit=dev` reporta 0 vulnerabilidades altas, o cada vulnerabilidad alta restante queda documentada en `tasks.md` con su motivo. `npm ls` no muestra copias anidadas nuevas de paquetes `expo-*`/`@expo/*`, las dependencias directas de `package.json` no cambian y `npx expo-doctor` no muestra errores nuevos respecto a la línea base.
  - **Enmienda (2026-11-23, pendiente de que el usuario la acepte):**
    - **Por qué se tocaron dependencias directas:** el arreglo de la vulnerabilidad alta de `@expo/cli` solo existe en el parche del SDK. Por eso se subió `expo` 58.0.19 → 58.0.26 por la vía oficial (`npx expo install expo@~58.0.26` y después `--fix`), y eso alinea `react-native` 0.88.0 → 0.88.1 y otros 5 paquetes del mismo SDK.
    - **Qué cambia en CA-4:** pasa a exigir «sin saltos de versión mayor ni menor, y solo los parches que propone `expo install --fix`».
    - **Qué implica:** el parche de React Native, junto con los módulos nativos nuevos (`expo-file-system`, `expo-image-manipulator`), requiere un build nativo nuevo. Conviene subir `versionCode` en el siguiente release.
- **CA-5:** El `dist/index.html` exportado contiene `<html lang="es">`, conserva el título de `app.json` y no tiene ningún marcador `%…%` sin sustituir. Si se aprueba H-8, también contiene `<link rel="manifest" href="/manifest.json">`.
- **CA-6:** Hay tres comprobaciones:
  - Un test de Jest pasa a `construirPromptAltaPrecision` una descripción de 2000 caracteres `§`, un carácter que no aparece en la plantilla del prompt. El prompt resultante contiene exactamente 500 `§`.
  - Otro test comprueba que una descripción de 120 caracteres se conserva completa.
  - El `TextInput` de descripción tiene `maxLength={500}`.
- **CA-7:** `npm run gate` termina en verde: lint con código 0, todos los tests pasan y el bundle está limpio de secretos.

## 4. Fuera de Alcance
- La migración de modelo de Gemini, los reintentos y el failover (Spec 021).
- Partir los componentes grandes (Spec 022).
- Accesibilidad y feedback en la app nativa (Spec 023), salvo `lang="es"`.
- Cualquier cambio visual en la app.

## 5. Riesgos
- Una CSP demasiado estricta puede romper la web en producción. Por eso CA-1 exige probarla primero en local y en una vista previa de Vercel, antes de que llegue a `main`.
- `npm audit fix` puede mover versiones de paquetes `@expo/*`. Se mitiga con `npx expo install --check`, `expo-doctor` y la puerta de calidad completa.

## 6. Decisiones Pendientes del Usuario
- **Q1:** ¿Este es el orden correcto (020 seguridad → 021 Gemini → 022 refactor → 023 accesibilidad → 024 animaciones)?
- **Q6:** ¿El sitio sigue siendo público (con las cabeceras de RF-1) o se protege para que solo entre el usuario?
- **Q10:** ¿Se incluye H-7 (copiar las fotos a almacenamiento permanente con `expo-file-system` y, en web, guardar una miniatura comprimida)? Si se aprueba, se agregan RF-7 y CA-8 a esta Spec.
- **H-8:** ¿Se genera un `manifest.json` real para que la web sea instalable, o se corrige `MEMORY.md` para dejar de decir que existe?
