# Tareas de Implementación — Spec 014: Previsualización Minimalista de Ejercicios

- [x] **T1** (Claude): Crear `spec.md`, `plan.md` y `tasks.md` en `specs/014-previsualizacion-ejercicios/`.
- [x] **T2** (Claude): Revisión del plan con `revisor-critico`. Hubo 1 bloqueante (el catálogo tiene 47 ejercicios, no 46) y varios hallazgos mayores y menores; todos están corregidos.
- [ ] **T3** (Antigravity): Generar con Gemini y posprocesar los 47 PNG en `assets/ejercicios/` (plan, paso 1; CA-1).
- [ ] **T4** (Antigravity): Crear `src/constants/imagenesEjercicios.js` (paso 2).
- [ ] **T5** (Antigravity, con `subagente-ui`): Crear `src/components/MiniaturaEjercicio.jsx` (paso 3).
- [ ] **T6** (Antigravity): Integrar la miniatura en `CatalogoEjerciciosModal.jsx` (paso 4; CA-2, CA-3).
- [ ] **T7** (Antigravity): Integrar la miniatura en la tarjeta del día de `EntrenamientosView.jsx` (paso 5; CA-4).
- [ ] **T8** (Antigravity): Crear `__tests__/imagenesEjercicios.test.js` (paso 6).
- [ ] **T9** (Antigravity): `npm run gate` en verde, verificación manual y reporte (pasos 7 y 8; CA-8, CA-9).
- [ ] **T10** (Claude): Revisión del código contra CA-1 a CA-9, commit, actualización de `MEMORY.md` y evaluación de `TROUBLESHOOTING.md`. Candidato a registrar: `jest-expo` transforma los PNG a `1`, así que las pruebas de assets deben comparar ids y usar `fs`.
