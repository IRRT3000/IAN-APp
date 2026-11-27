# Tareas de Implementación — Spec 020: Seguridad Web, Higiene de Dependencias y Puerta de Calidad

> Implementa Claude Code (Q2: el usuario delegó todos los roles el 2026-11-23).

- [x] **T1** (Claude / planificación): Auditoría y borrador de `spec.md`, `plan.md` y `tasks.md`.
- [x] **T2** (Usuario, 2026-11-23): Respondió Q1 (orden 020→024), Q6, Q10 (sí a fotos permanentes) y H-8.
  - Q6: el sitio es público; la clave la sigue poniendo cada usuario (Q16 = BYOK).
  - H-8: el usuario quiere que la app «se vea completa», así que se genera el manifiesto PWA.
- [x] **T3** (revisor-critico): `PLAN_APROBADO` en la segunda ronda. La §6 (fotos) se detalló después y se revisa aparte.
- [x] **T4** (Implementador): Patrones de Jest acotados a `<rootDir>` y `scripts/test-gate.js`.
  - CA-3: dentro del worktree corren 18 suites y 168 pruebas, y `npm test -- --testPathPattern no-existe-xyz` sale con código 1.
- [x] **T5** (Implementador): Dependencias. El `package-lock.json` original quedó respaldado fuera del repo.
  - **Desviación documentada del plan §2:** el arreglo de `@expo/cli` (alta) solo llega con el parche del SDK, así que se subió `expo` ~58.0.19 → ~58.0.26 con `npx expo install` y se alinearon los paquetes del SDK con `npx expo install --fix`.
    - `react-native` 0.88.0 → 0.88.1.
    - `react-native-safe-area-context` ~5.10.1 → ~5.11.1.
    - Parches de `expo-blur`, `expo-haptics`, `expo-secure-store`, `expo-status-bar` y `jest-expo`.
    - Todo es dentro del mismo SDK y por la vía oficial.
  - `node-forge` 1.4.0 → 1.4.4 con `npm update`, dentro de su rango `^1.4.0`.
  - **Resultado:** `npm audit --omit=dev` pasó de 10 (3 altas, 7 moderadas) a **3 moderadas y 0 altas**. `npm ls` no muestra copias anidadas de `expo-*`/`@expo/*`, y `npx expo-doctor` pasa 20/20.
  - **Vulnerabilidades que quedan (moderadas, solo en herramientas de build, no viajan en la app):** `@expo/fingerprint`, `expo` (por dependencia) y `minimatch`. Su único arreglo es `expo@52.0.49` (bajar de versión mayor), así que no se aplica.
  - `zod` 3 (alta, en `@expo/cli`) ya no aparece. `glob` 13 desapareció del informe con el parche.
  - **Nota:** npm avisa que `@parcel/watcher` y `unrs-resolver` tienen scripts de instalación no aprobados (`npm install-scripts`). Lint, tests y build funcionan sin ellos, así que no se aprueban.
- [x] **T6** (Implementador): `vercel.json` con CSP, `nosniff`, `Referrer-Policy`, `Permissions-Policy`, caché inmutable en `/_expo/static/` y reescritura acotada.
  - **CA-1 en local** (servidor `localhost:8099` que aplica `vercel.json`):
    - `dist/index.html` no tiene scripts en línea.
    - Los dos `eval` del bundle están en ramas que no se ejecutan en el navegador: el cargador de bundles divididos y `require` de Node.
    - Con el navegador integrado, el onboarding y las cinco pestañas cargan sin violaciones de CSP de la app.
    - Las imágenes `data:` y `blob:` y el `FileReader` funcionan, Gemini responde 200 y un `fetch` a un dominio ajeno queda **bloqueado**.
  - **CA-2 en local:** `/` → 200 HTML, `/manifest.json` → 200 `application/manifest+json`, `/_expo/static/inexistente.js` → 404. Falta comprobarlo en la vista previa de Vercel.
- [x] **T7** (Implementador): `public/index.html` con `lang="es"`, título sustituido por Expo, sin marcadores `%…%` y con `<noscript>` en español. Manifiesto PWA (`public/manifest.json`) con iconos de 192 y 512 y `apple-touch-icon`, generados desde `assets/icon.png` con `jimp-compact`. CA-5 cumplido.
- [x] **T8** (Implementador): `LIMITE_DESCRIPCION_COMIDA = 500`, recorte por puntos de código y `maxLength` en el modal. `__tests__/limiteDescripcionComida.test.js` cubre CA-6, con 5 pruebas.
- [x] **T9** (Implementador): Fotos permanentes (plan §6). La revisión de la §6 no tuvo bloqueantes. Sus 6 puntos importantes se aplicaron:
  - Prefijo `data:` en la miniatura web.
  - Referencia relativa `foto-doc:` en nativo (el contenedor de iOS cambia).
  - Resolución síncrona sin parpadeo.
  - Limpieza de fotos huérfanas si el guardado falla.
  - En web no se guarda nunca la foto completa.
  - El registro se localiza antes de borrarlo.

  Resultados:
  - **CA-8a:** `__tests__/fotosStorage.test.js`, con 10 pruebas.
  - **CA-8b (web, navegador integrado):** se eligió una foto real, Gemini la analizó a través de la CSP (manzana, 104 kcal) y se guardó. Después de recargar, la foto se sigue viendo. La lista `@fitness_tracker_comidas_v1` ocupa 657 bytes y solo guarda `foto-local:…`; la miniatura (32 KB) vive en su propia clave.
  - **CA-8c (Android, «Borrar caché»):** pendiente, lo revisa el usuario.
  - **Arreglo extra encontrado al implementar:** las 13 llamadas a `Alert.alert` en 6 archivos se reemplazaron por `mostrarAlerta`. En web, `Alert.alert` no muestra nada (INC-012), así que esos errores eran invisibles.
- [x] **T10** (revisor-critico): Revisión del código.
  - Primera ronda: `CODIGO_RECHAZADO`, con 1 bloqueante: en web, las miniaturas podían llenar `localStorage`, y además `guardarComida` y `guardarCambioFisico` se tragaban el error y devolvían `[]`. También hubo 4 importantes.
  - Se corrigió todo en el commit 34df08f, con tope y rotación de miniaturas, guardados que lanzan, banderas anti-huérfanos y MIME del manifiesto.
  - Segunda ronda: **`CODIGO_APROBADO`**.
- [ ] **T11** (Implementador):
  - Hecho: `npm run gate` en verde (20 suites, 186 pruebas, bundle limpio) y `MEMORY.md`/`TROUBLESHOOTING.md` actualizados.
  - **Pendiente:** CA-1 y CA-2 en una vista previa de Vercel (se hará con el PR); CA-8c en el Android del usuario; aceptación de la enmienda de CA-4 por parte del usuario.

## Hallazgos nuevos durante la implementación (para otras Specs)
- **Edad por defecto de 15 años:** si el usuario no toca la fecha de nacimiento en el onboarding, queda registrado con 15 años (26/11/2010). El prompt de comida también usa `'15 años'` como valor por defecto (`gemini.js:199`). Se corrige en la Spec 021 (prompts) y la 022 (valores iniciales del onboarding).
- La animación de entrada de la bienvenida tarda unos 3 s en dejar de mostrar la pantalla de inicio debajo. Se revisa en la Spec 024.
