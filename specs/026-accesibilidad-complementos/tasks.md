# Tareas de Implementación — Spec 026: Complementos de Accesibilidad

Requisito previo: rama `claude/app-analysis-improvements-52feef` (PR #11) con `npm run gate` en verde (34 suites, 420 tests el 27/11/2026). Esta spec la implementa Claude Code a pedido del usuario.

- [x] **T1** (Claude): Prueba en la preview web y en Android de la rama base, y redacción de `spec.md`, `plan.md` y `tasks.md`.
- [x] **T2** (Claude, `revisor-critico` con Sonnet): Revisión del plan. Ronda 1: `CAMBIOS_REQUERIDOS` (1 BLOQUEANTE: la región de anuncios quedaría inerte con un modal abierto). Ronda 2: `PLAN_APROBADO`.
- [ ] **T3** (Claude): Ampliar la prueba estática (CA-1, CA-2), crear `tamanoTexto.test.js` (CA-3) y medir las infracciones iniciales.
- [ ] **T4** (Claude): `src/utils/etiquetasFecha.js` con su prueba; aplicarla en `HeatmapDayCell`, `SelectorSemanal` y `LiveModeModal` (plan §2).
- [ ] **T5** (Claude): Etiquetas de los 19 campos (plan §3) y `aria-*` en lugar de `accessibilityState` (plan §4).
- [ ] **T6** (Claude): `ModalAccesible` y su uso en los 12 archivos con `<Modal>` (plan §5).
- [ ] **T7** (Claude): Texto mínimo de 11 px y revisión visual (plan §6).
- [ ] **T8** (Claude): Snapshots revisados, `npm run gate` en verde y commit.
- [ ] **T9** (Claude, `revisor-critico`): Revisión del código contra CA-1 a CA-8.
- [ ] **T10** (Claude): Subir la rama, probar en la preview de Vercel y en Android con Expo Go (plan §8), dejar el QR listo para el usuario y abrir el PR.
- [ ] **T11** (Claude): Actualizar `MEMORY.md` y evaluar `TROUBLESHOOTING.md`.
