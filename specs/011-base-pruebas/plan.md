# Plan Técnico — Spec 011: Base de Pruebas y Puerta de Calidad

## 1. Objetivo
Dejar `npm run gate` en verde como verificación objetiva antes de cada revisión de código. No cambia nada visible para el usuario de la app.

## 2. Archivos Afectados
| Archivo | Acción |
| - | - |
| `package.json` / `package-lock.json` | devDependencies, scripts y bloque `jest` |
| `eslint.config.js` | Nuevo |
| `.gitignore` | Agregar `.bundle-check/` |
| `scripts/bundle-check.js` | Nuevo (empaqueta y borra la salida aunque falle) |
| `__tests__/apiKeyStorage.test.js` | Nuevo (traído de la rama `origin/flow/setup-multi-harness`) |
| `__tests__/dateUtilsLocal.test.js` | Nuevo (traído de la misma rama) |
| `__tests__/waterGlassEngine.test.js` | Nuevo (traído de la misma rama) |
| `__tests__/perfilFechas.test.js` | Nuevo |
| `babel.config.js` | Solo si jest no transforma sin él (paso 4) |

Ningún otro archivo debe aparecer en `git status`, salvo las correcciones de lint en `src/` del paso 5.

## 3. Pasos de Ejecución
1. **Dependencias**: `npx expo install jest-expo jest@^30 eslint@^9 eslint-config-expo -- --save-dev`. Las versiones de `jest` y `eslint` van fijadas porque Expo no las administra: eslint 10 rompe los peers de `eslint-plugin-react` e `eslint-plugin-import`. **Prohibido** `--legacy-peer-deps` y `--force`; si npm da ERESOLVE, detente y repórtalo. Confirmar que las 4 quedaron en `devDependencies` y que `@react-native/jest-preset` (peer de jest-expo) está en `package-lock.json`.
2. **Scripts en `package.json`**:
   ```json
   "lint": "eslint .",
   "test": "jest --ci",
   "test:watch": "jest --watchAll",
   "bundle:check": "node scripts/bundle-check.js",
   "gate": "npm run lint && npm test && npm run bundle:check"
   ```
   `scripts/bundle-check.js` (CommonJS, sin dependencias): borra `.bundle-check/` si existe, ejecuta `npx expo export --platform android --output-dir .bundle-check` con `child_process.spawnSync` (`stdio: 'inherit'`, `shell: true` para Windows), borra `.bundle-check/` en un `finally` con `fs.rmSync(..., { recursive: true, force: true })` y termina con `process.exit` usando el código de salida de `expo export` (1 si es `null`). Así el bundle con la API key no queda en disco ni cuando falla.

   Bloque `jest`: `"preset": "jest-expo"`, `"testPathIgnorePatterns": ["/node_modules/", "/.agents/", "/.bundle-check/"]`, `"modulePathIgnorePatterns": ["<rootDir>/.agents/", "<rootDir>/.bundle-check/"]`. No tocar `version` ni otros campos.
3. **Lint**: crear `eslint.config.js`:
   ```js
   const { defineConfig } = require('eslint/config');
   const expoConfig = require('eslint-config-expo/flat');

   module.exports = defineConfig([
     expoConfig,
     { ignores: ['node_modules/', 'dist/', '.bundle-check/', '.expo/', '.agents/', '.claude/', '.github/', 'specs/', 'docs/', 'android/', 'ios/'] },
     {
       files: ['__tests__/**'],
       languageOptions: {
         globals: { describe: 'readonly', test: 'readonly', it: 'readonly', expect: 'readonly', jest: 'readonly', beforeEach: 'readonly', afterEach: 'readonly' },
       },
     },
   ]);
   ```
   Si `scripts/bundle-check.js` o `eslint.config.js` dan `no-undef` por `require`, `module` o `process`, agrega un bloque `{ files: ['scripts/**', 'eslint.config.js'], languageOptions: { globals: { require: 'readonly', module: 'writable', process: 'readonly', __dirname: 'readonly' } } }`; no apagues la regla.
   Agregar `.bundle-check/` a `.gitignore`.
4. **Pruebas existentes**: traer los 3 archivos con `git show origin/flow/setup-multi-harness:__tests__/<archivo>` sin cambiar sus aserciones. Ya se verificó que las funciones que importan existen con esos nombres en `main`. Si jest falla por transformación, primero `npx expo install babel-preset-expo -- --save-dev` (hoy solo existe dentro de `node_modules/expo/node_modules/`) y luego crear `babel.config.js` con `module.exports = (api) => { api.cache(true); return { presets: ['babel-preset-expo'] }; };`. Repórtalo. Si jest funciona sin él, no lo crees.
5. **Errores de lint en el código actual**: correr `npm run lint`.
   - Solo se atienden **errores**; los warnings se dejan como están.
   - Mecánico (se corrige): borrar un import o variable que da error, o escapar texto en JSX (`react/no-unescaped-entities`) sin cambiar lo que se ve en pantalla.
   - No mecánico (no se corrige): se apaga **solo en esa línea** con `// eslint-disable-next-line <regla> -- spec futura`. Nunca apagar reglas de forma global en `eslint.config.js`.
   - **Prohibido** apagar `no-undef`, `import/no-unresolved` y `react-hooks/rules-of-hooks`; si alguna da error, detente y repórtalo.
   - Lista cada corrección y cada línea apagada en el reporte.
6. **Nueva prueba `__tests__/perfilFechas.test.js`** sobre `src/services/storage.js` (con el mock de AsyncStorage `jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'))`). Fechas de referencia siempre con `new Date(año, mesIndex, día)`. Escribe **un `test()` por viñeta** (al menos 12). Casos mínimos (valores calculados del código actual):
   - `parsearFechaLocalYYYYMMDD('2024-02-29')` → `{ anio: 2024, mes: 2, dia: 29, iso: '2024-02-29', legible: '29/02/2024' }`.
   - `'2026-02-29'` (no bisiesto), `'1899-01-01'`, `'2026-13-01'` y `'basura'` → caen al fallback `iso: '2010-11-26'`.
   - `' 2026-03-09 '` con espacios → `iso: '2026-03-09'`.
   - `parsearFechaLocalYYYYMMDD('basura', '2020-01-15').iso` → `'2020-01-15'`.
   - `calcularEdadExacta(new Date(2026, 10, 25), '2010-11-26').anios` → `15`; con `new Date(2026, 10, 26)` → `16`, y `texto` → `'16 años'`.
   - `calcularEdadExacta(new Date(2026, 0, 1), '2030-01-01').anios` → `0`.
   - `calcularTiempoEntrenando(new Date(2026, 9, 29), '2025-11-01')` → `anios 0, meses 11, dias 28`, `texto '11 meses y 28 días'`.
   - `calcularTiempoEntrenando(new Date(2026, 9, 29), '2026-10-29').texto` y con fecha futura `'2027-01-01'` → `'Recién iniciado'`.
   - `calcularFechaInicioDesdeAntiguedad({ anios: 1, meses: 2 }, new Date(2026, 9, 29))` → `'2025-08-29'`.
   - `calcularFechaInicioDesdeAntiguedad({ meses: 1 }, new Date(2026, 2, 31))` → `'2026-02-28'` (recorta al último día del mes).
   - `calcularFechaInicioDesdeAntiguedad({ anios: -3, meses: 'x' }, new Date(2026, 9, 29))` → `'2026-10-29'`.
   Si algún valor real no coincide, **no cambies `storage.js`**: repórtalo como posible bug.
7. **Verificación final**: `npm run gate` en verde, `npx expo-doctor` (informativo) y `git status` mostrando solo los archivos de la tabla del §2 más las correcciones de `src/` reportadas (nunca `.bundle-check/` ni `dist/`).

## 4. Casos Límite a Cubrir
- `expo export` falla a la mitad: `scripts/bundle-check.js` borra la salida en el `finally`; además `.bundle-check/` está en `.gitignore`.
- `npm ci` del workflow de release exige que el lock coincida: usar solo `npx expo install` (nunca editar versiones a mano).
- Pruebas dependientes de la zona horaria: prohibido `toISOString()` y `new Date("YYYY-MM-DD")`.

## 5. Reporte al Terminar (para la revisión de Claude)
Lista de archivos tocados, salida resumida de `npm run gate` (conteo de pruebas), correcciones de lint aplicadas en `src/`, reglas desactivadas y por qué, resultado de `expo-doctor` y cualquier valor del paso 6 que no coincidiera. No hagas commit.
