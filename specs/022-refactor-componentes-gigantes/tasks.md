# Tareas de Implementación — Spec 022: Partir los Componentes Gigantes sin Cambios Visibles

> **Estado: BORRADOR.** Depende de Q5 y Q1. Se implementa después de la Spec 021.

- [x] **T1** (Claude / planificación): Mapa estructural con grep y borrador de `spec.md`, `plan.md` y `tasks.md`.
- [ ] **T2** (Usuario): Confirmar Q5 (100 % invisible) y Q1 (orden).
- [ ] **T3** (revisor-critico): Revisar el plan.
  - Primera ronda (2026-11-23): `CAMBIOS_REQUERIDOS`, con 2 bloqueantes (falta `test-renderer` y Jest ignora el worktree) y 6 importantes. Todos se aplicaron.
  - Segunda ronda: `PLAN_APROBADO`. Había un solo ajuste pendiente: no simular `react-native-worklets` de entrada. Ya se aplicó.
- [ ] **T3b** (Requisito previo): La Spec 020 RF-3 está aplicada y `npm test` corre al menos 18 suites dentro del worktree.
- [ ] **T4** (Implementador): Capturas «antes» en web (plan §0).
- [ ] **T4b** (Implementador): Prueba de humo de RNTL 14 + `test-renderer` + los simulados de Reanimated y worklets (plan §1a).
- [ ] **T5** (Implementador): Setup de los simulados por archivo, snapshots de caracterización y **commit previo** (plan §1b, CA-1).
- [ ] **T6** (Implementador): Partir el Onboarding en 6 commits (plan §2).
- [ ] **T7** (Implementador): Partir Cambio Físico en 5 commits (plan §3).
- [ ] **T8** (Implementador): Tests de los hooks, capturas «después», `wc -l` y `git grep` (plan §4, CA-2 a CA-5).
- [ ] **T9** (revisor-critico): Revisión del código → `CODIGO_APROBADO`.
- [ ] **T10** (Implementador): `npm run gate` y lista de verificación para Android; actualizar `MEMORY.md` (plan §4, CA-6).
