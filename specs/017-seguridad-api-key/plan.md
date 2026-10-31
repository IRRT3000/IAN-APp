# Plan Técnico — Spec 017: Seguridad de la API Key de Gemini

Orden de trabajo: dependencias y configuración → almacenamiento → Gemini → panel → barrera del bundle → pruebas → documentación. No se edita `android/` ni `ios/`.

**Paso previo, ya verificado el 2026-10-31**: la clave real del `.env` del desarrollador cumple `^[A-Za-z0-9._-]{20,256}$` (53 caracteres) y `^AQ\.[0-9A-Za-z_-]{40,}$`. Para comprobarlo solo se imprimieron booleanos. La migración no la va a descartar.

## 1. Dependencia y configuración
- En la raíz del worktree se ejecuta `npx expo install expo-secure-store`. Si el comando agrega `"expo-secure-store"` a `plugins` como texto simple, se reemplaza por la forma con opciones que aparece abajo.
- `app.json`:
  - En `plugins`, agregar `["expo-secure-store", { "configureAndroidBackup": true, "faceIDPermission": false }]`.
  - En las opciones de `expo-image-picker`, agregar `"microphonePermission": false`, sin tocar los textos existentes.
  - En `android`, agregar `"blockedPermissions": ["android.permission.RECORD_AUDIO", "android.permission.SYSTEM_ALERT_WINDOW"]`. El efecto es una entrada con `tools:node="remove"`; la línea no desaparece.
- Verificación (CA-9): `npx expo config --type introspect --json`, revisando `_internal.modResults.android.manifest` (permisos y atributos de `application`) y `_internal.modResults.ios.infoPlist`. Las rutas de las reglas de backup que aparezcan se anotan en `tasks.md`.

## 2. Almacenamiento (`src/services/apiKeyStorage.js`, se reescribe)
Exporta:
- `CLAVE_SECURE_STORE_API_KEY = 'fitness_tracker_gemini_api_key'`.
- `CLAVE_STORAGE_API_KEY_LEGADA = '@fitness_tracker_gemini_api_key'`, que sustituye a `CLAVE_STORAGE_API_KEY`. Solo se usa en `__tests__/apiKeyStorage.test.js`, que se reescribe.
- `MENSAJE_FORMATO_API_KEY_INVALIDO = 'La clave debe tener entre 20 y 256 caracteres, sin espacios, y solo letras, números, punto, guion o guion bajo.'`.
- `normalizarApiKey(clave)`: si es string, devuelve `clave.trim()`; si no, `''`.
- `esFormatoApiKeyValido(clave)`: `/^[A-Za-z0-9._-]{20,256}$/.test(normalizarApiKey(clave))`. La expresión no usa la bandera `g`, así que no guarda estado entre llamadas.

Internos:
- `OPCIONES_SECURE_STORE = { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY }`.
- `eliminarCopiaLegada()`: `AsyncStorage.removeItem(LEGADA)` dentro de `try/catch`. Devuelve `true` si tiene éxito. Si falla, registra el error con `console.error`, sin el valor, y devuelve `false`. No hay estado de módulo.
- `leerSegura()`: devuelve `{ error: false, valor }`, o `{ error: true, valor: null }` si `getItemAsync` lanzó (el error se registra).
- `leerLegada()`: devuelve `null` si no hay copia o si `getItem` lanzó (se registra); si hay copia, devuelve el string.

`guardarApiKeyGemini(clave)`:
1. `claveLimpia = normalizarApiKey(clave)`. Si `!esFormatoApiKeyValido(claveLimpia)`, devuelve `false`.
2. `await SecureStore.setItemAsync(CLAVE_SECURE_STORE_API_KEY, claveLimpia, OPCIONES_SECURE_STORE)`. Si falla, `console.error(...)` y devuelve `false`.
3. `await eliminarCopiaLegada()` y devuelve `true`. Que falle el borrado de la copia no invalida el guardado; la Defensa 2 lo reintenta.

`cargarApiKeyGemini()`:
1. `segura = await leerSegura()`.
2. **Hay clave segura válida** (`!segura.error && esFormatoApiKeyValido(segura.valor)`):
   - `await eliminarCopiaLegada()`, que limpia la copia obsoleta (Defensa 2).
   - Devuelve `normalizarApiKey(segura.valor)`.
3. **Falló la lectura segura** (`segura.error`):
   - `legada = await leerLegada()`.
   - Devuelve `normalizarApiKey(legada)` si su formato es válido; si no, `null`.
   - **No escribe ni borra nada** (Defensa 1).
4. **No hay clave segura válida**: `return migrarClaveLegada()`.
   - `legada = await leerLegada()`. Si es `null`, devuelve `null`.
   - `limpia = normalizarApiKey(legada)`. Si el formato es inválido, `await eliminarCopiaLegada()` y devuelve `null`.
   - Vuelve a leer la clave segura (Defensa 2b). Si ahora existe y es válida, `await eliminarCopiaLegada()` y la devuelve.
   - Intenta `SecureStore.setItemAsync(SECURE, limpia, OPCIONES)`. Si falla, lo registra y devuelve `limpia` **sin** borrar la copia.
   - Si tuvo éxito, `await eliminarCopiaLegada()` y devuelve `limpia`.

`eliminarApiKeyGemini()`:
- `SecureStore.deleteItemAsync(SECURE)` dentro de `try/catch`; el error se registra y marca `exitoSeguro = false`.
- `exitoLegado = await eliminarCopiaLegada()`.
- Devuelve `exitoSeguro && exitoLegado`.

## 3. Gemini (`src/services/gemini.js`)
- Comentario de cabecera (líneas 3-4): la clave sale solo del almacenamiento seguro (BYOK) y viaja en `x-goog-api-key`. Se quita la mención a `EXPO_PUBLIC_GEMINI_API_KEY`.
- Import: `import { cargarApiKeyGemini, esFormatoApiKeyValido, normalizarApiKey, MENSAJE_FORMATO_API_KEY_INVALIDO } from './apiKeyStorage';`.
- Nueva función interna `construirEncabezados(apiKey)` → `{ 'Content-Type': 'application/json', 'x-goog-api-key': apiKey }`.
- `validarApiKeyGemini(claveCandidata)`:
  - Se mantienen los dos primeros chequeos (no es string → «Ingresa una clave de API válida.»; vacía tras `trim` → «La clave de API no puede estar vacía.»).
  - Después, `claveLimpia = normalizarApiKey(claveCandidata)`. Si `!esFormatoApiKeyValido(claveLimpia)`, devuelve `{ valida: false, error: MENSAJE_FORMATO_API_KEY_INVALIDO }` sin llamar a `fetch`.
  - `fetch(GEMINI_API_BASE_URL, { method: 'GET', headers: construirEncabezados(claveLimpia), signal })`. El resto queda igual.
- `obtenerApiKeyActiva()`: `const claveGuardada = await cargarApiKeyGemini(); if (claveGuardada) return claveGuardada;` y, si no hay clave, el mismo `throw new GeminiError(...)` de hoy. Se borran las líneas 133-136 y el comentario «Prioridad 2» de la línea 124.
- `ejecutarLlamadaGemini`: `endpoint = \`${GEMINI_API_BASE_URL}/${modelo}:generateContent\`` y `headers: construirEncabezados(apiKey)`. Ni la firma ni el resto cambian.
- `obtenerModelos`, los prompts y las funciones de análisis no se tocan.

## 4. Panel (`src/components/PanelConfiguracionLateral.jsx`; tiene más de 500 líneas: se localiza con `grep` y solo se editan esos rangos)
- **Estado**:
  - `const [claveGuardada, setClaveGuardada] = useState(null)` se reemplaza por `const [finClaveGuardada, setFinClaveGuardada] = useState(null)`, que guarda solo los últimos 4 caracteres o `null`.
  - Se agrega `const textoPegadoRef = useRef(null);`.
  - Todos los usos de `claveGuardada` se actualizan.
- **`cargarEstadoClave`**: `const clave = await cargarApiKeyGemini(); setFinClaveGuardada(clave ? clave.slice(-4) : null); setClaveInput(''); setMostrarClave(false); textoPegadoRef.current = null;`.
- **Máscara**: `tieneClaveConfigurada = Boolean(finClaveGuardada)` y `mascaraClave = \`••••••••${finClaveGuardada}\``.
- **`handleProbarYGuardar`**:
  - Si `claveLimpia` está vacía y `finClaveGuardada` existe: `setMensajeEstado({ tipo: 'info', texto: 'Ya tienes una clave guardada. Pega una clave nueva solo si quieres reemplazarla.' })` y `return`. Si no hay clave guardada, se muestra el error actual.
  - Si se guarda con éxito: `setFinClaveGuardada(claveLimpia.slice(-4)); setClaveInput(''); setMostrarClave(false);`. Luego, si `textoPegadoRef.current === claveLimpia`, `try { await Clipboard.setStringAsync(''); } catch {}`; en ambos casos `textoPegadoRef.current = null`. Mensaje de éxito: «Clave validada y guardada en el almacenamiento seguro de tu teléfono.»
  - Si `guardarApiKeyGemini` devuelve `false`: «No se pudo guardar la clave en el almacenamiento seguro del dispositivo.»
- **`handleEliminarClave`**: `const eliminado = await eliminarApiKeyGemini();`.
  - Si `!eliminado`: `await cargarEstadoClave()`, `setMensajeEstado({ tipo: 'error', texto: 'No se pudo eliminar la clave por completo. Intenta de nuevo.' })` y `return`.
  - Si se eliminó: `setFinClaveGuardada(null)` y el resto del flujo actual.
- **`handlePegarPortapapeles`**:
  - Si el texto pegado (con `trim`) no cumple `esFormatoApiKeyValido` (importado de `apiKeyStorage`), muestra `Alert.alert('Portapapeles', 'El portapapeles no contiene una clave con formato válido.')` y no toca el campo.
  - Si es válido: `setClaveInput(limpio); textoPegadoRef.current = limpio;` y el mensaje actual.
- **Segundo plano**:
  - Un `useEffect` que depende de `visible` se suscribe a `AppState.addEventListener('change', ...)`. Si el estado no es `'active'`, ejecuta `setMostrarClave(false)`.
  - Al limpiar, `suscripcion.remove()`.
  - `AppState` se agrega al import de `react-native`.
- **`TextInput`**:
  - Se agregan `autoComplete="off"`, `importantForAutofill="no"`, `textContentType="none"`, `spellCheck={false}` y `keyboardType={Platform.OS === 'android' && mostrarClave ? 'visible-password' : 'default'}`. `Platform` ya está importado.
  - `placeholder={finClaveGuardada ? 'Pega una clave nueva para reemplazarla' : 'Pega aquí tu clave de Google AI Studio'}`.
- **Aviso de privacidad**, con el texto exacto de RF-6: «Tu clave se guarda cifrada en el almacenamiento seguro de tu teléfono y no se incluye en copias de seguridad. Solo se envía a Google (Gemini) en cada consulta de IA.»
- No se cambian estilos, animaciones ni gestos.

## 5. Barrera del bundle (`scripts/`)
### 5.1 `scripts/escaneoSecretos.js` (nuevo, CommonJS de Node)
- `const { Buffer } = require('buffer');`, `fs` y `path`. `Buffer` se importa explícitamente porque no es un global declarado en `eslint.config.js`.
- `PATRONES_CLAVE_GOOGLE = [{ motivo: 'patrón de API key de Google (AIza…)', regex: /AIza[0-9A-Za-z_-]{35}/ }, { motivo: 'patrón de API key de Google (AQ.…)', regex: /AQ\.[0-9A-Za-z_-]{40,}/ }]`.
- `PATRON_NOMBRE_SECRETO = /KEY|SECRET|TOKEN|PASSWORD/i`.
- `ARCHIVOS_ENV = ['.env', '.env.local', '.env.development', '.env.development.local', '.env.production', '.env.production.local']`.
- `parsearEnv(texto)`:
  - Quita el BOM inicial, separa por `/\r?\n/` e ignora las líneas vacías y las que empiezan con `#`. Quita un `export ` inicial.
  - Separa en el primer `=`. Si el valor va entre comillas, toma lo que hay dentro; si no, corta en la primera secuencia ` #` y aplica `trim`.
  - Devuelve `[{ nombre, valor }]`.
- `leerValoresSecretos(rootDir, entorno = process.env)`:
  - Une `parsearEnv` de cada archivo de `ARCHIVOS_ENV` que exista con las entradas de `entorno`.
  - Se queda con las que cumplen `PATRON_NOMBRE_SECRETO` y tienen un valor de 8 caracteres o más, sin valores duplicados.
  - Devuelve `[{ nombre, valor }]`.
- `encontrarSecretos(contenido, valores)`:
  - Si `ArrayBuffer.isView(contenido)`, `texto = Buffer.from(contenido.buffer, contenido.byteOffset, contenido.byteLength).toString('latin1')`; si no, `texto = String(contenido)`.
  - Devuelve un arreglo de **motivos** sin valores: los de cada patrón que cumpla y `` `valor de ${nombre}` `` por cada valor que aparezca, comparando con `texto.includes(valor)` y nunca con `RegExp`.
- `escanearDirectorio(dir, valores)`: recorre `dir` de forma recursiva con `fs.readdirSync(dir, { withFileTypes: true })`, lee cada archivo como `Buffer` y devuelve `{ archivosRevisados, hallazgos: [{ archivo, motivos }] }`.
- `module.exports = { PATRONES_CLAVE_GOOGLE, parsearEnv, leerValoresSecretos, encontrarSecretos, escanearDirectorio };`.

### 5.2 `scripts/bundle-check.js`
- Importa `escaneoSecretos`. Dentro del `try`, después de `spawnSync` y solo si `exitCode === 0`, abre un `try/catch` propio:
  - `valores = leerValoresSecretos(rootDir)` y `{ archivosRevisados, hallazgos } = escanearDirectorio(outputDir, valores)`.
  - Si hay hallazgos: `console.error('bundle:check: se encontraron secretos en el bundle exportado:')`, una línea por hallazgo con `path.relative(rootDir, archivo)` y sus motivos, y `exitCode = 1`.
  - Si no los hay: `console.log(\`bundle:check: escaneo de secretos limpio (${archivosRevisados} archivos, ${valores.length} valores de .env comprobados).\`)`.
  - En el `catch`: `console.error('bundle:check: el escaneo de secretos falló:', error.message)` y `exitCode = 1`.
- El `finally` que borra `.bundle-check/` se mantiene.

## 6. Pruebas (Jest)
- **`__mocks__/expo-secure-store.js`** (nuevo, en la raíz, junto a `node_modules`). Usa ESM y no usa `jest.fn`, por `no-undef`:
  - Un `Map` en memoria y tres banderas: `fallarEscritura`, `fallarLectura` y `fallarBorrado`.
  - Constantes con valores distintos: `WHEN_UNLOCKED = 5` y `WHEN_UNLOCKED_THIS_DEVICE_ONLY = 6`.
  - `setItemAsync(clave, valor, opciones)` lanza si `fallarEscritura` y, si no, guarda `{ valor, opciones }`. `getItemAsync` lanza si `fallarLectura`. `deleteItemAsync` lanza si `fallarBorrado`. `isAvailableAsync` devuelve `true`.
  - Ayudas de prueba: `__reiniciar()`, `__simularFallos({ escritura, lectura, borrado })` y `__obtenerEntrada(clave)`.
- **`__tests__/apiKeyStorage.test.js`** (se reescribe):
  - Usa `jest.mock` de AsyncStorage (el patrón actual) y `jest.mock('expo-secure-store')`.
  - En `beforeEach`: `AsyncStorage.clear()` y `SecureStore.__reiniciar()`. Como el módulo no tiene estado propio, no hace falta `resetModules`.
  - Las claves de ejemplo se arman por partes (Defensa 10): `CLAVE_AIZA = 'AIza' + 'A'.repeat(35)`, `CLAVE_AQ = 'AQ.' + 'Ab8RN6'.repeat(8) + 'xY'` (53 caracteres), `CLAVE_20 = 'K'.repeat(20)` y `CLAVE_256 = 'K'.repeat(256)`.
  - Casos:
    - Guardar recorta espacios, usa `keychainAccessible === 6` y no deja copia en AsyncStorage (CA-4).
    - Rechazos y aceptaciones, incluidos los límites 19/20 y 256/257 (CA-7).
    - `fallarEscritura`: `guardar` devuelve `false`. `fallarLectura` sin copia anterior: `cargar` devuelve `null` (CA-7, Defensa 3).
    - Migración con éxito, con fallo de escritura, con fallo de lectura (sin escribir ni borrar), con copia inválida y con copia obsoleta (CA-5).
    - Eliminar con éxito devuelve `true`; con `fallarBorrado` devuelve `false` (CA-6).
- **`__tests__/geminiApiKey.test.js`** (nuevo):
  - Mockea AsyncStorage y `expo-secure-store`. Guarda `const fetchOriginal = globalThis.fetch`; define `globalThis.fetch = jest.fn()` en `beforeEach` y lo restaura en `afterEach`.
  - Casos:
    - `obtenerApiKeyActiva()` sin clave guardada lanza `GeminiError` (CA-2).
    - `validarApiKeyGemini(CLAVE_AIZA)` con `fetch` que responde `{ ok: true, status: 200 }`: hay una sola llamada, la URL es exactamente `https://generativelanguage.googleapis.com/v1beta/models`, `headers['x-goog-api-key']` es la clave y el resultado es `{ valida: true }` (CA-3).
    - `validarApiKeyGemini('clave con espacios internos 123456')`: el error es `MENSAJE_FORMATO_API_KEY_INVALIDO` y no se llama a `fetch` (CA-7).
    - `analizarComidaConGemini('aGVsbG8=', 'Comida')` con la clave guardada por `guardarApiKeyGemini(CLAVE_AQ)` y `fetch` que responde `ok`, con `json()` que devuelve `{ candidates: [{ content: { parts: [{ text: '{"nombre":"Prueba","calorias":100}' }] } }] }`: la llamada termina, ninguna URL contiene `key=` y todas llevan el encabezado (CA-3).
    - `typeof` de `obtenerApiKeyActiva`, `obtenerModelos` y `validarApiKeyGemini` es `'function'`, y `GeminiError` es una clase (CA-12).
- **`__tests__/sinClaveEnCodigo.test.js`** (nuevo, CA-1):
  - Recorre `src/` con `fs.readdirSync('src', { recursive: true })`, filtrando `.js` y `.jsx`, y suma `App.js`. Las rutas son relativas a la raíz, sin `__dirname` ni `process` (INC-008).
  - Comprueba que ningún archivo contiene `EXPO_PUBLIC_GEMINI_API_KEY`, `/[?&]key=/` ni los patrones `AIza…` y `AQ.…`.
  - Si falla, el mensaje lista los archivos.
- **`__tests__/escaneoSecretos.test.js`** (nuevo, CA-10):
  - Importa `encontrarSecretos` y `parsearEnv` desde `../scripts/escaneoSecretos`. Los bytes se arman con `new TextEncoder().encode(texto)`, que es un global estándar, sin usar `Buffer`.
  - Casos:
    - Se detectan los dos patrones en un string y en bytes.
    - Se detecta `{ nombre: 'EXPO_PUBLIC_GEMINI_API_KEY', valor: 'valor-secreto-de-prueba' }`.
    - Un contenido limpio devuelve `[]`.
    - Ningún motivo contiene el valor.
    - `parsearEnv` interpreta bien `\r\n`, BOM, `export `, las comillas y un `# comentario` al final.
  - Si `TextEncoder` da `no-undef`, se agrega a los globals de `__tests__/**` en `eslint.config.js`.

## 7. Documentación
- `README.md` (línea 24): «**Almacenamiento seguro**: La clave se guarda cifrada en el almacenamiento seguro de tu teléfono (Android Keystore / iOS Keychain) y no se incluye en copias de seguridad. Solo se envía a Google (Gemini) en cada consulta de IA.»
- `MEMORY.md`: una línea de estado de la Spec 017 y una decisión clave («la API key solo vive en SecureStore; prohibido `EXPO_PUBLIC_*` para secretos; `bundle:check` escanea secretos»). El archivo no debe pasar de unas 50 líneas.
- `TROUBLESHOOTING.md`:
  - INC-009 va **justo después de INC-001** y no al final, para no chocar con el INC-008 que `main` agregó al final.
  - Causa raíz: Expo incrusta en el bundle toda variable `EXPO_PUBLIC_*` que el código menciona.
  - Solución: BYOK en SecureStore más el escaneo de `bundle:check`.
  - INC-001 se actualiza para mencionar SecureStore.
- `specs/016-resumen-ia-estudio/plan.md` §5: una nota de una línea con la regla de la Defensa 6 (sembrar con `guardarApiKeyGemini` y usar claves de 20 caracteres o más).

## 8. Archivos
- **Nuevos**:
  - `scripts/escaneoSecretos.js`
  - `__mocks__/expo-secure-store.js`
  - `__tests__/geminiApiKey.test.js`
  - `__tests__/sinClaveEnCodigo.test.js`
  - `__tests__/escaneoSecretos.test.js`
- **Modificados**:
  - `package.json` y `package-lock.json` (con `npx expo install`)
  - `app.json`
  - `src/services/apiKeyStorage.js`
  - `src/services/gemini.js`
  - `src/components/PanelConfiguracionLateral.jsx`
  - `scripts/bundle-check.js`
  - `__tests__/apiKeyStorage.test.js`
  - `README.md`, `MEMORY.md`, `TROUBLESHOOTING.md` y `specs/016-resumen-ia-estudio/plan.md` (solo la nota)
  - `eslint.config.js`, solo si hace falta para `TextEncoder`
- **No se tocan** los archivos en curso de las Specs 015-estudio y 016 (`BarraNavegacionInferior.jsx`, `estudioStorage.js`, `useEstudio.js`, `validacionEstudio.js` y sus pruebas).

## 9. Riesgos
- **El worktree va detrás de `main`.** Está en `b520d6f`; `main` desciende de ese commit y va 5 commits adelante. No se rebasa en esta Spec, porque el worktree tiene trabajo sin commitear de Antigravity (Spec 015-estudio).
  - Los cambios de `main` en `app.json`, `package.json`, `README.md` y `PanelConfiguracionLateral.jsx` (créditos de RepDB) están en otros bloques, así que la fusión debería ser automática.
  - INC-009 va junto a INC-001 para no chocar con el INC-008 de `main`.
  - Se recomienda al usuario avanzar el worktree a `main` antes de fusionar.
- **Jest no aplica el mock raíz de forma automática.** Las suites de la Spec 017 llaman a `jest.mock('expo-secure-store')` de forma explícita. Este worktree no tiene copias dentro de `.claude/`, así que no hay mocks duplicados.
- **El bytecode de Hermes.** El escaneo lee los bytes en `latin1` y las claves solo tienen caracteres ASCII. El control positivo de CA-11 demuestra que el escáner encuentra el string dentro del `.hbc`.
