# Spec 027: Higiene y marca IXN (Fase 0 del roadmap)

> **Estado: CODIGO_APROBADO (2026-11-28).** Lo redactó Claude Code el 2026-11-28 a partir del diagnóstico del mismo día (Fase 0 del roadmap, aprobada por el dueño).

## 1. Problema
La app ahora se llama IXN, pero ese nombre no aparece en ningún lado: el icono del teléfono dice «mi-fitness-app», la PWA dice «Fitness Tracker & Nutritional AI» y el saludo y el botón final del onboarding dicen «Fitness Tracker». Además, `npx eslint .` deja 7 avisos, y uno de ellos (`react-hooks/exhaustive-deps` en `LiveModeModal`) puede hacer que el botón atrás de Android use una versión vieja de `confirmarDescarte`.

## 2. Requerimientos Funcionales
- **RF-1 (Nombre visible IXN).** Todo nombre de la app que ve el usuario dice «IXN»: `expo.name` de `app.json` (nombre bajo el icono en Android/iOS), `expo.web.name` y `shortName`, `public/manifest.json` (`name`, `short_name`), el título de la página web (sale de `expo.web.name`), el saludo sin nombre de `MenuBienvenida` y el botón «Entrar a IXN» del onboarding.
- **RF-2 (Identificadores técnicos intactos).** No cambian `expo.slug`, `android.package`, `ios.bundleIdentifier`, `extra.eas.projectId`, `owner`, el `name` de `package.json`, las claves de AsyncStorage ni `APP_RESPALDO = 'mi-fitness-app'` de `respaldo.js`. Cambiarlos rompería la actualización del APK instalado, el enlace con EAS o la restauración de respaldos ya exportados.
- **RF-3 (Lint sin avisos).** `npx eslint .` termina con 0 errores y 0 avisos.
- **RF-4 (Botón atrás siempre actual).** En `LiveModeModal`, el manejador del botón atrás de Android llama siempre a la versión más reciente de `confirmarDescarte`, sin volver a suscribirse en cada render.

## 3. Fuera de alcance
Cambiar el icono, el `slug` o el nombre del archivo APK en el workflow de releases; rotar la API key (lo hace el dueño a mano); borrar ramas de GitHub.

## 4. Criterios de Aceptación
- **CA-1.** `app.json` tiene `expo.name = "IXN"`, `expo.web.name = "IXN"` y `expo.web.shortName = "IXN"`; `public/manifest.json` tiene `name` y `short_name` = `"IXN"`.
- **CA-2.** `grep -rn "Fitness Tracker" src/` no devuelve textos visibles (solo comentarios, si quedan, se actualizan también a IXN). El saludo sin nombre de `MenuBienvenida` es «IXN» y el botón final del onboarding (modo no edición) es «Entrar a IXN», tanto en el texto como en `accessibilityLabel`.
- **CA-3.** Los valores listados en RF-2 son idénticos a `main` (verificable con `git diff main -- package.json src/services/respaldo.js` vacío, y en `app.json` y `src/services/storage.js` sin cambios en esas líneas; `storage.js` solo mueve un import).
- **CA-4.** `npx eslint .` reporta `0 problems`.
- **CA-5.** `LiveModeModal` guarda `confirmarDescarte` en una ref actualizada en un efecto tras cada render y el efecto del `BackHandler` depende solo de `visible`; no queda ningún `eslint-disable` nuevo.
- **CA-6.** `npm run gate` pasa (lint, pruebas y `bundle:check`); el snapshot de caracterización del onboarding se actualiza solo en las dos líneas de «Entrar a IXN» (hoy 7786 y 7851).
