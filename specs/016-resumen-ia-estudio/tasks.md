# Tareas de Implementación — Spec 016: Resumen IA del Día de Estudio

Requisito previo: la Spec 015 implementada y revisada.

- [x] **T1** (Claude): Crear `spec.md`, `plan.md` y `tasks.md` en `specs/016-resumen-ia-estudio/` y aplicar la revisión del `revisor-critico`.
- [x] **T2** (Antigravity): Agregar `PREFIJO_RESUMEN_ESTUDIO`, `obtenerResumenEstudio`, `existeClaveResumenEstudio` y `guardarResumenEstudio` (clave por fecha, lectura estricta, cola serial) a `estudioStorage.js` (plan §1).
- [x] **T3** (Antigravity): Crear `src/utils/resumenEstudio.js` con `restarDiasFechaLocal`, `formatearHora12h`, `construirContextoResumenEstudio`, `contarSesionesSinAnalizar`, `textoSesionesSinAnalizar` y `normalizarResumenEstudio` (plan §2).
- [x] **T4** (Antigravity): Agregar a `gemini.js` `construirPromptEstudioDelDia` (texto exacto del plan §3.1) y `analizarEstudioDelDiaConGemini` con la cadena de modelos (plan §3.2).
- [x] **T5** (Antigravity, `subagente-ui` + `subagente-motion`): Crear `ResumenEstudioCard.jsx` con los estados hoy sin resumen, analizando, con resumen, desactualizado y pasado (plan §4).
- [x] **T6** (Antigravity): Ampliar `useEstudio.js` con el candado de módulo, `entradaResumen` por fecha y `manejarAnalizar`, e integrar la tarjeta en `EstudioView.jsx` (plan §4).
- [x] **T7** (Antigravity): Crear y ampliar las suites de Jest del plan §5.
- [x] **T8** (Antigravity): `npm run gate` en verde y prueba manual en dispositivo de CA-1 a CA-11.
- [ ] **T9** (Claude): Revisión del código contra CA-1 a CA-12, commit, actualización de `MEMORY.md` y evaluación de `TROUBLESHOOTING.md`.
