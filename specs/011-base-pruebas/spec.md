# Spec 011: Base de Pruebas y Puerta de Calidad (`npm run gate`)

## 1. Problema
El proyecto no tiene pruebas automáticas, ni linter, ni forma de comprobar sin un dispositivo que la app empaqueta. Toda la calidad depende de probar a mano en Expo Go y de la revisión del código. Con el reparto de roles (Claude revisa, Antigravity implementa) hace falta una verificación objetiva y repetible antes de cada revisión.

## 2. Alcance
- **Incluye**: herramientas de prueba y lint de desarrollo, scripts de npm, 4 archivos de pruebas de lógica pura (sin componentes) y la puerta `npm run gate`.
- **No incluye**: pruebas de componentes/UI, E2E (Maestro), integración en GitHub Actions ni refactors de la app.

## 3. Requerimientos Funcionales (RF)
- **RF-1 (Dependencias de desarrollo)**: `jest-expo`, `jest`, `eslint` y `eslint-config-expo` instaladas como `devDependencies` con `npx expo install ... -- --save-dev`, con `package-lock.json` actualizado y coherente (`npm ci` debe funcionar).
- **RF-2 (Scripts)**: `package.json` expone `lint`, `test`, `test:watch`, `bundle:check` y `gate` (`lint` + `test` + `bundle:check`, en ese orden, se detiene en el primero que falle).
- **RF-3 (Lint)**: `eslint.config.js` en formato plano con `eslint-config-expo/flat`, ignorando carpetas que no son código de la app.
- **RF-4 (Pruebas)**: Jest con preset `jest-expo` y 4 archivos en `__tests__/`: `apiKeyStorage`, `dateUtilsLocal`, `waterGlassEngine` y `perfilFechas` (lógica de fechas del perfil de la spec 010 en `storage.js`).
- **RF-5 (Chequeo de bundle sin filtrar secretos)**: `bundle:check` empaqueta para Android con `expo export` en una carpeta ignorada por git y la borra al terminar, también cuando falla, porque el bundle incluye `EXPO_PUBLIC_GEMINI_API_KEY` del `.env`.

## 4. Criterios de Aceptación (CA)
- **CA-1**: `npm run lint` termina con código 0 (se permiten warnings, no errores).
- **CA-2**: `npm test` termina con código 0 y ejecuta los 4 archivos de `__tests__/`, con al menos 33 pruebas en total (21 de las existentes + al menos 12 de `perfilFechas`).
- **CA-3**: `npm run bundle:check` termina con código 0 y, al terminar (con éxito o con error), la carpeta de salida no existe.
- **CA-4**: `npm run gate` termina con código 0 en la rama de la spec.
- **CA-5**: `git status` muestra solo los archivos del plan (§2) y las correcciones de lint reportadas; ningún generado (`.bundle-check/`, `dist/`, cachés). `.gitignore` cubre `.bundle-check/`.
- **CA-6**: Las 4 dependencias están en `devDependencies` (no en `dependencies`), instaladas con `npx expo install` sin `--legacy-peer-deps` ni `--force`, y `npm ci` funciona con el lock resultante; `npx expo-doctor` no reporta problemas nuevos por ellas.
- **CA-7**: Ningún archivo de `src/` ni `App.js` cambia de comportamiento. Solo se permiten correcciones mecánicas de lint y líneas apagadas con `eslint-disable-next-line` (plan, paso 5), cada una listada en el reporte. No se apagan reglas de forma global.
- **CA-8**: Ninguna prueba depende de la fecha u hora real del sistema (fechas de referencia fijas con `new Date(año, mesIndex, día)`), ni usa `toISOString()` o `new Date("YYYY-MM-DD")`.
