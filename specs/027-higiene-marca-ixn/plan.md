# Plan 027: Higiene y marca IXN

## Archivos
1. `app.json`: `expo.name` → `"IXN"`; `expo.web.name` → `"IXN"`; `expo.web.shortName` → `"IXN"`. Nada más.
2. `public/manifest.json`: `name` y `short_name` → `"IXN"`.
3. `src/components/MenuBienvenida.jsx` (línea ~83): `'Fitness Tracker'` → `'IXN'`.
4. `src/components/onboarding/renderEscenaCelebracion.js` (líneas ~165 y ~173): `'Entrar a Fitness Tracker'` → `'Entrar a IXN'`.
5. Comentarios de cabecera en `src/theme/tokens.js` y `src/constants/catalogoEjercicios.js`: «Fitness Tracker» → «IXN».
6. `src/components/EntrenamientosView.jsx`: quitar los imports sin uso `Platform`, `withSpring` y `obtenerDiasConActividad`; quitar la variable `colorGrupo` y, si `obtenerColorGrupo` queda sin uso, también su import.
7. `src/components/onboarding/useAccionesOnboarding.js` (~223): `catch (error)` → `catch`, sin variable (sintaxis válida en el Babel de Expo).
8. `src/services/storage.js`: subir el `import { calcularScoreVaso, obtenerNivelColor }` junto a los otros imports del inicio.
9. `src/components/LiveModeModal.jsx`: añadir `const confirmarDescarteRef = useRef(confirmarDescarte);` después de definir la función, y un efecto sin dependencias `useEffect(() => { confirmarDescarteRef.current = confirmarDescarte; });` declarado **antes** del efecto del `BackHandler` (escribir la ref en el cuerpo del render es un error de `react-hooks/refs`). En el efecto del `BackHandler`, `onBackPress` llama a `confirmarDescarteRef.current()`. El arreglo de dependencias queda `[visible]`.
10. `__tests__/__snapshots__/caracterizacionOnboarding.test.js.snap`: regenerar con `npx jest caracterizacionOnboarding -u` y comprobar que el diff son solo las 2 líneas del botón.
11. `README.md`: título «IXN» (el texto del APK `mi-fitness-app-vX.X.X.apk` se mantiene, porque el workflow sigue generando ese nombre).
12. `MEMORY.md`: título «IXN», anotar el renombre y que los identificadores técnicos no cambian.

## Riesgos
- `expo.name` afecta el nombre de la carpeta nativa en un `prebuild`; como `android/` no está versionado y el workflow usa `--clean`, no hay impacto.

## Verificación
`npm run gate` y `grep -rn "Fitness Tracker" src/ app.json public/ README.md MEMORY.md`.
