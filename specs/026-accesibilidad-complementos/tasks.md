# Tareas de Implementación — Spec 026: Complementos de Accesibilidad

Requisito previo: rama `claude/app-analysis-improvements-52feef` (PR #11) con `npm run gate` en verde (34 suites, 420 tests el 27/11/2026). Esta spec la implementa Claude Code a pedido del usuario.

- [x] **T1** (Claude): Prueba en la preview web y en Android de la rama base, y redacción de `spec.md`, `plan.md` y `tasks.md`.
- [x] **T2** (Claude, `revisor-critico` con Sonnet): Revisión del plan. Ronda 1: `CAMBIOS_REQUERIDOS` (1 BLOQUEANTE: la región de anuncios quedaría inerte con un modal abierto). Ronda 2: `PLAN_APROBADO`.
- [x] **T3** (Claude): Ampliar la prueba estática (CA-1, CA-2), crear `tamanoTexto.test.js` (CA-3) y medir las infracciones iniciales.
- [x] **T4** (Claude): `src/utils/etiquetasFecha.js` con su prueba; aplicarla en `HeatmapDayCell`, `SelectorSemanal` y `LiveModeModal` (plan §2).
- [x] **T5** (Claude): Etiquetas de los 19 campos (plan §3) y `aria-*` en lugar de `accessibilityState` (plan §4).
- [x] **T6** (Claude): `ModalAccesible` y su uso en los 12 archivos con `<Modal>` (plan §5).
- [x] **T7** (Claude): Texto mínimo de 11 px y revisión visual (plan §6).
- [x] **T8** (Claude): Snapshots revisados, `npm run gate` en verde y commit.
- [x] **T9** (Claude, `revisor-critico`): Revisión del código: `CODIGO_APROBADO`. Se corrigieron los 2 IMPORTANTES (foco en `onShow` para no competir con la trampa de foco del modal padre; badge e indicador «HOY» con alto suficiente) y los MENORES 3 y 8. Quedan anotados: el foco no vuelve si el control que abrió el modal ya no existe (p. ej. el ítem del catálogo tras abrir Live Mode), la región de anuncios se monta un render después de abrir, y el test del componente (no solo del gestor).
- [x] **T10** (Claude): Probado en la preview de Vercel (web) y en Android (emulador, Expo Go). Ajuste surgido de la prueba: chips de objetivo en Físico con ancho según su etiqueta. QR de Expo listo para el usuario.
- [x] **T11** (Claude): Actualizar `MEMORY.md` y evaluar `TROUBLESHOOTING.md`.
