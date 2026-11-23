# Tareas de Implementación — Spec 024: Micro-animaciones, Movimiento Reducido y Feedback Háptico

> **Estado: BORRADOR.** Depende de Q14 y Q15, y de las Specs 022 y 023.

- [x] **T1** (Claude / planificación): Auditoría de Reanimated, resortes, `activeOpacity` y hápticos; borrador de `spec.md`, `plan.md` y `tasks.md`.
- [ ] **T2** (Usuario): Responder Q14 y Q15.
- [x] **T3** (revisor-critico): Revisar el plan.
  - Primera ronda (2026-11-23): `CAMBIOS_REQUERIDOS`. Hubo 1 bloqueante: `useReducedMotion` no reacciona a los cambios. También hubo 3 importantes. Todo se aplicó en la v2.
  - Segunda ronda: `PLAN_APROBADO`. Los 2 menores también se aplicaron: valor inicial sin destello y dependencias `reducir`.
- [ ] **T4** (subagente-motion): Tokens de movimiento y `src/utils/movimiento.js` (plan §1).
- [ ] **T5** (subagente-motion): «Reducir movimiento» en los 13 archivos con Reanimated, uno por commit (plan §2).
- [ ] **T6** (Implementador, Q14): Codemod de `activeOpacity` y lista de los `TouchableOpacity` sin valor (plan §3).
- [ ] **T7** (Implementador, Q15): Hápticos de resultado (plan §4).
- [ ] **T8** (Implementador): Tests (plan §5, CA-1 a CA-4).
- [ ] **T9** (revisor-critico): Revisión del código → `CODIGO_APROBADO`.
- [ ] **T10** (Implementador): `npm run gate`, revisión en web con movimiento reducido y lista para Android; actualizar `MEMORY.md` (plan §6).
