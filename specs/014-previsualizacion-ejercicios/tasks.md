# Tareas de Implementación — Spec 014: Previsualización Minimalista de Ejercicios

- [x] **T1** (Claude): Crear `spec.md`, `plan.md` y `tasks.md` en `specs/014-previsualizacion-ejercicios/`.
- [x] **T2** (Claude): Revisión del plan con `revisor-critico`. Hubo 1 bloqueante (el catálogo tiene 47 ejercicios, no 46) y varios hallazgos mayores y menores; todos están corregidos.
- [x] **T3** (Claude, respaldo): Assets. *Cambio del 2026-10-31*: Gemini solo genera unas 10 imágenes cada varias horas, así que se usan las ilustraciones del free tier de RepDB. Claude eligió la pose de cada ejercicio en hojas de contacto y las redujo a 47 WebP de 192×192 (152 KB en total) en `assets/ejercicios/`. Se borraron los PNG de relleno.
- [x] **T4** (Claude, respaldo): Crear `src/constants/imagenesEjercicios.js` (paso 2), con los `require` apuntando a `.webp`.
- [x] **T5** (Claude, respaldo): Crear `src/components/MiniaturaEjercicio.jsx` (paso 3). La ilustración ocupa todo el cuadro, sin `tintColor`; el velo solo queda en el placeholder.
- [x] **T6** (Claude, respaldo): Integrar la miniatura en `CatalogoEjerciciosModal.jsx` (paso 4; CA-2, CA-3).
- [x] **T7** (Claude, respaldo): Integrar la miniatura en la tarjeta del día de `EntrenamientosView.jsx` (paso 5; CA-4).
- [x] **T8** (Claude, respaldo): Crear `__tests__/imagenesEjercicios.test.js` (paso 6), con un parser de cabecera WebP.
- [x] **T8b** (Claude, respaldo): Crédito de RepDB en `PanelConfiguracionLateral.jsx` y en `README.md` (RF-6, CA-10).
- [ ] **T9** (Antigravity, con el usuario): el gate ya pasó en verde (lint 0 errores, 6 suites, 63 tests, bundle:check). Falta la verificación manual en Expo Go: catálogo, placeholder de personalizados, tarjeta del día, crédito de RepDB en Configuración y fluidez del scroll (CA-9, CA-10). Si algo falla, ajustar solo lo necesario y volver a correr `npm run gate`.
- [ ] **T10** (Claude): Revisión del código contra CA-1 a CA-10, commit, actualización de `MEMORY.md` y evaluación de `TROUBLESHOOTING.md`.
