# Plan Técnico — Spec 020: Seguridad Web, Higiene de Dependencias y Puerta de Calidad

> **Estado: BORRADOR**, pendiente de las decisiones Q1, Q6 y Q10 y de `PLAN_APROBADO`.

Orden: puerta de calidad → dependencias → Vercel → HTML web → límite de descripción → verificación. No se edita `android/` ni `ios/`. No hay cambios visuales en la app.

## 1. Puerta de calidad fiable (RF-3)
- En `package.json` → `jest`:
  - `testPathIgnorePatterns`: `["/node_modules/", "<rootDir>/.agents/", "<rootDir>/.bundle-check/", "<rootDir>/.claude/"]`.
  - `modulePathIgnorePatterns`: `["<rootDir>/.agents/", "<rootDir>/.bundle-check/", "<rootDir>/.claude/"]`.
  - `<rootDir>` es la raíz de cada worktree, así que solo se ignora la carpeta `.claude/` propia (agentes de Claude). Ya no coincide con la ruta `.claude/worktrees/…` que lleva hasta el worktree.
- La causa del «No tests found, exiting with code 0» fue el patrón mal acotado. Además se agrega una barrera, para que el gate nunca vuelva a pasar sin tests:
  - `scripts/test-gate.js`:
    - Crea una carpeta temporal con `fs.mkdtempSync(path.join(os.tmpdir(), 'jest-gate-'))`.
    - Ejecuta Jest con `child_process.spawnSync(process.execPath, [require.resolve('jest/bin/jest'), '--ci', '--json', '--outputFile=<tmp>/resultado.json', ...process.argv.slice(2)], { stdio: 'inherit' })`. Sin `npx` ni `shell`, así funciona igual en Windows.
    - Si `status !== 0`, sale con ese código.
    - Si el JSON no existe o no se puede leer, sale con 1 y el mensaje «Jest no produjo resultados».
    - Si `numTotalTestSuites < 1` o `success !== true`, sale con 1.
    - Borra la carpeta temporal en `finally`.
    - No fija un mínimo de suites, porque se desactualizaría. El «≥ 18» de CA-3 se comprueba a mano.
  - El script `"test"` de `package.json` pasa a ser `node scripts/test-gate.js`. `test:watch` no cambia.
- Verificación: CA-3.

## 2. Dependencias (RF-4)
1. Guardar la línea base: `npm audit --omit=dev --json`, `npx expo-doctor` y `npm ls expo-constants expo-asset expo-file-system expo-keep-awake babel-preset-expo @expo/metro-config`. La salida va a la carpeta temporal y no se commitea. Copiar `package-lock.json` a la carpeta temporal.
2. `npm audit fix --dry-run` (sin `--force`). Ya se sabe (revisión del 2026-11-23) que propone copias **anidadas** de `expo-constants`, `expo-asset`, `expo-file-system`, `expo-keep-awake`, `babel-preset-expo` y `@expo/metro-config`. Duplicar módulos nativos de Expo puede romper la app. Por eso:
   - **No se ejecuta `npm audit fix` a ciegas.** Solo se aplican las correcciones que no anidan ningún paquete `expo-*` ni `@expo/*` y que no cambian `expo`, `react`, `react-native` ni ninguna dependencia directa de `package.json`.
   - La vía preferida es `npm update <paquete>` dirigido o `overrides` en `package.json`, solo para dependencias puramente de herramientas (`node-forge`, `zod`, `glob`, `minimatch`), siempre que la versión corregida sea compatible con el rango que pide quien la usa.
   - Lo que solo se corrige con `--force` (por ejemplo `@expo/fingerprint`, que propone bajar a `expo@52`) **no se toca** y se documenta.
3. `npm install`, y después `npx expo install --check` y `npm ls` del paso 1. Si aparece cualquier paquete `expo-*` duplicado o cambia una dependencia directa, se restaura el `package-lock.json` copiado y se documenta.
4. `npx expo-doctor` y `npm run gate`.
5. Anotar en `tasks.md` cada vulnerabilidad alta que quede, con el motivo.

## 3. Vercel (RF-1, RF-2)
`vercel.json` queda así:

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "buildCommand": "npm run build:web",
  "outputDirectory": "dist",
  "rewrites": [{ "source": "/((?!.*\\.).*)", "destination": "/index.html" }],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "Content-Security-Policy", "value": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' https://generativelanguage.googleapis.com; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; manifest-src 'self'; worker-src 'self'" },
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" },
        { "key": "Permissions-Policy", "value": "camera=(self), microphone=(), geolocation=(), payment=()" }
      ]
    },
    {
      "source": "/_expo/static/(.*)",
      "headers": [{ "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }]
    }
  ]
}
```

- La regla de reescritura solo atrapa rutas sin punto, así que los archivos con extensión que no existen responden 404 (RF-2).
- Los archivos de `_expo/static/` tienen un hash en el nombre, así que se pueden guardar en caché un año sin riesgo.
- **Prueba local (CA-1):**
  1. `npx expo export --platform web`.
  2. En `dist/`, buscar `<script>` sin `src` en los `.html` y `eval(` o `new Function(` en los `.js`. Debe haber 0 coincidencias. La revisión ya comprobó que `react-native-web` 0.21 no los usa.
  3. Servir `dist/` en `http://localhost:8099` con un servidor estático mínimo (solo `node:http`, en la carpeta temporal, no se commitea). Aplica los `headers` y la regla de reescritura de `vercel.json` tal cual.
  4. Con el navegador integrado:
     - Recorrer Inicio, Entrenamientos, Nutrición, Cambio Físico, Estudio y el Heatmap, que se abre desde Inicio.
     - Guardar la API key en Configuración.
     - **Camino de la foto:** elegir una foto en Nutrición, comprobar que se ve la vista previa (`blob:`/`data:`) y mandar un análisis real a Gemini.
     - Revisar la consola con `read_console_messages`, filtrando «Content Security Policy».
- **Prueba en Vercel (CA-1, CA-2):** después del push de la rama, el despliegue de vista previa se revisa con `curl -I` y con el navegador integrado. Si la vista previa tiene protección de despliegue (SSO), se usa `get_access_to_vercel_url` del MCP de Vercel.
- **Si Q6 = «protegido»:** además se activa la protección de Vercel (Vercel Authentication) en producción desde el MCP, previa confirmación del usuario, porque cambia la configuración de su cuenta.

## 4. HTML web (RF-5)
- Crear `public/index.html` copiando la plantilla de `node_modules/expo/node_modules/@expo/cli/static/template/index.html`. Expo usa este archivo si existe (`webTemplate.js`, `getTemplateIndexHtmlAsync`).
  - La plantilla trae `<html lang="%LANG_ISO_CODE%">`, y `webTemplate.js` sustituye ese marcador por `en`. En `public/index.html` se escribe `lang="es"` literal.
  - Los demás marcadores (`%WEB_TITLE%` y los de descripción y `theme-color`) se dejan intactos, para que Expo los siga rellenando desde `app.json`.
  - Después de exportar, comprobar dos cosas: que en `dist/index.html` no quede ningún `%…%` sin sustituir, y que `expo export` no haya copiado `public/index.html` a `dist/` sin procesar, encima del generado.
- No se agrega ningún `<script>` en línea, para que la CSP siga siendo estricta.
- **Si se aprueba H-8:** crear `public/manifest.json` (nombre, `short_name`, `display: standalone`, `theme_color`/`background_color` `#0A0A0A`, iconos 192 y 512 generados a partir de `assets/icon.png`) y enlazarlo en `public/index.html` con `<link rel="manifest" href="/manifest.json">`.

## 5. Límite de la descripción (RF-6)
- En `src/services/gemini.js`, exportar `LIMITE_DESCRIPCION_COMIDA = 500`. En `construirPromptAltaPrecision`, `textoUsuarioLimpio` pasa a ser `Array.from(String(descripcionUsuario || '').trim()).slice(0, LIMITE_DESCRIPCION_COMIDA).join('')`. Se recorta por puntos de código con `Array.from` para no partir un emoji ni un carácter compuesto.
- En `src/components/ModalAnalisisComida.jsx` (el `TextInput` de la línea ~180), agregar `maxLength={LIMITE_DESCRIPCION_COMIDA}`, importado del servicio. No cambia nada visual.
- Test nuevo en `__tests__/geminiNutricion.test.js` (CA-6).

## 6. Fotos permanentes (H-7, aprobado por el usuario en Q10 el 2026-11-23)
- Dependencias, instaladas con `npx expo install expo-file-system expo-image-manipulator`. Se usa la API nueva de `expo-file-system` (`File`, `Directory`, `Paths`) en SDK 58. En web no está soportada: su clase lanza avisos, así que **nunca** se instancia en web.
- Nuevo `src/services/fotosStorage.js`:
  - `persistirFoto(uriTemporal, carpeta)` → `Promise<string>`:
    - **Nativo:**
      - `const { File, Directory, Paths } = require('expo-file-system')`, con `require` perezoso dentro de la función para que Jest y web no carguen el módulo nativo al importar.
      - `new Directory(Paths.document, 'fotos', carpeta).create({ intermediates: true, idempotent: true })`.
      - `await new File(uriTemporal).copy(new File(dir, `${id}.jpg`))`.
      - Devuelve la URI del destino. El `id` es `Date.now()` + 6 caracteres aleatorios.
    - **Web:**
      - `ImageManipulator.manipulate(uri).resize({ width: 512 })`, luego `renderAsync()` y `saveAsync({ base64: true, compress: 0.7, format: SaveFormat.JPEG })`.
      - Guarda `data:image/jpeg;base64,…` en `AsyncStorage` bajo `@fitness_tracker_foto_v1:<id>`, que es su **propia clave**. Así la lista de comidas no crece y no se repite el problema de CursorWindow.
      - Devuelve la referencia `foto-local:<id>`.
    - **Si algo falla:** registra `console.error`, sin datos de la imagen, y devuelve `uriTemporal`. Guardar el registro nunca se bloquea por la foto.
    - Si `uriTemporal` está vacío, devuelve `''`.
  - `resolverUriFoto(uri)` → `Promise<string>`: para una referencia `foto-local:<id>` lee su clave (o devuelve `''` si no existe); para cualquier otra URI la devuelve igual.
  - `useUriFoto(uri)`: hook con estado que llama a `resolverUriFoto` y se cancela al desmontar.
  - `eliminarFoto(uri)`, del tipo «mejor esfuerzo», sin lanzar errores:
    - Con una referencia `foto-local:` hace `removeItem`.
    - En nativo, y solo si `uri` empieza por `Paths.document.uri` (nunca borra fuera de la carpeta de la app), hace `new File(uri)` y, si `exists`, `delete()`.
- **Integración:**
  - `NutricionView.jsx` (guardado, ~línea 275): `const uriFoto = await persistirFoto(borradorFoto?.uri || '', 'comidas')`, que se usa en `uriFoto`/`fotoUri`.
  - `CambioFisicoView.jsx` (~línea 423): `urisFotos = await Promise.all(seleccion.map((f) => persistirFoto(f.uri, 'fisico')))`, **después** de que el análisis termine bien, justo antes de construir `nuevoRegistro`. Así no se copian fotos de un análisis que falló.
  - Los lugares donde se pintan las fotos (`NutricionView` ~518 y `CambioFisicoView` ~687) usan un componente pequeño `FotoPersistida` (con `useUriFoto`) que pinta la misma `Image` con los mismos estilos.
  - `storage.js` → `eliminarComida` y `eliminarCambioFisico`: después de escribir la lista nueva, llaman a `eliminarFoto` para cada foto del registro borrado, dentro de `try/catch`.
- **Compatibilidad:** los registros antiguos conservan su URI de caché. Si ya no existe, se ve el marcador de foto ausente que la app ya usa.
- **Pruebas** (`__tests__/fotosStorage.test.js`), con `expo-file-system` y `expo-image-manipulator` simulados:
  - Nativo: copia a `fotos/<carpeta>/` y devuelve la URI nueva.
  - Si falla, devuelve la URI temporal.
  - Web: guarda la miniatura en su clave y devuelve `foto-local:`.
  - `resolverUriFoto` funciona con referencias y con URIs normales.
  - `eliminarFoto` no borra fuera de `Paths.document` y sí borra la clave web.
  - `eliminarComida` llama a `eliminarFoto`.
- **CA-8:**
  - Las pruebas anteriores pasan.
  - En web, una comida guardada con foto sigue mostrando la foto después de recargar la página.
  - En el Android del usuario, las fotos siguen visibles después de «Borrar caché» de la app en Ajustes (revisión manual).

## 7. Verificación final
- `npm run gate` en verde (CA-7).
- Búsqueda de secretos en el diff (`git diff main --stat` y `scripts/escaneoSecretos.js`).
- Actualizar `MEMORY.md` (corregir la frase de la PWA) y evaluar una entrada en `TROUBLESHOOTING.md` para el patrón `/.claude/` de Jest.
