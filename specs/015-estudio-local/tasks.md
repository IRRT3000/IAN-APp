# Tareas de Implementación — Spec 015: Apartado de Estudio

- [x] **T1** (Claude): Crear `spec.md`, `plan.md` y `tasks.md` en `specs/015-estudio-local/` y aplicar la revisión del `revisor-critico`.
- [x] **T2** (Antigravity): Crear `src/utils/validacionEstudio.js` (constantes, `sanitizarTextoLinea`, `esFechaLocalValida`, `validarMateria` y `validarSesionEstudio` con `esEdicion`), importando solo de `dateUtilsLocal.js` (plan §2).
- [x] **T3** (Antigravity): Crear `src/services/estudioStorage.js` con claves mensuales, lectura tolerante y estricta, respaldo `:corrupto:`, cola serial y el CRUD de materias y sesiones (plan §1).
- [x] **T4** (Antigravity): Crear `__tests__/validacionEstudio.test.js` y `__tests__/estudioStorage.test.js` (plan §5, incluye CA-14 y CA-15).
- [x] **T5** (Antigravity): Integrar en `App.js` `sesionesEstudio`, `materiasEstudio`, `datosEstudioCargados`, `sesionesEstudioDeHoy`, la rama `estudio` y `contadorEstudioHoy` (plan §3).
- [x] **T6** (Antigravity): Reemplazar la pestaña `heatmap` por `estudio` en `BarraNavegacionInferior.jsx`, con `vistaResaltada` solo para la pastilla y el color (plan §3, Defensa 8).
- [x] **T7** (Antigravity): Crear `src/utils/useEstudio.js` con la lógica de la vista (plan §4).
- [x] **T8** (Antigravity, `subagente-ui` + `subagente-motion`): Crear `EstudioView.jsx` y `TarjetaSesionEstudio.jsx`, con estado de carga, modo por día, modo filtro por materia, estado vacío y `FadeIn` (plan §4).
- [x] **T9** (Antigravity): Crear `SesionEstudioModal.jsx` (crear/editar, materia en línea, validación por campo, `guardandoRef`, teclado con «Listo») (plan §4).
- [x] **T10** (Antigravity): Crear `DetalleSesionEstudioModal.jsx` (edición y borrado con pulsación de 1000 ms) y `GestionMateriasModal.jsx`, todos con `onRequestClose` (plan §4).
- [x] **T11** (Antigravity): `npm run gate` en verde y prueba manual en dispositivo de CA-1 a CA-12 y CA-15.
- [ ] **T12** (Claude): Revisión del código contra CA-1 a CA-15, commit, actualización de `MEMORY.md` y evaluación de `TROUBLESHOOTING.md`.
