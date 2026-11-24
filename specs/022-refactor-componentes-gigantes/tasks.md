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

## Estado al 2026-11-24 (implementación)
- [x] T2: el usuario confirmó Q5 (refactor invisible) y Q1 (orden).
- [x] T3: `PLAN_APROBADO` (2 rondas).
- [x] T3b: la Spec 020 RF-3 está aplicada: dentro del worktree corren 25 suites.
- [x] T4b: prueba de humo de RNTL 14.1.0 + `test-renderer` 1.3.1. Se usa el resolver de Jest de Reanimated (`react-native-reanimated/jest/resolver`) en lugar de simular worklets.
- [x] T5: 12 snapshots de caracterización en el commit 35c1ec3, **anterior** al refactor.
- [x] T6: Onboarding de 3015 → 133 líneas (commit 825a4e1). T7: Cambio Físico de 2191 → 76 líneas (commit bfe3555).
  - **Desviación documentada del plan §2–3:** la división se hizo con un script que mueve el texto **literal** de cada sentencia (análisis de ámbitos con `@babel/traverse`) en lugar de reescribirlo a mano.
    - Los bloques de estado y acciones pasaron a **hooks consecutivos** que conservan el orden de los hooks.
    - Cada escena pasó a una **función de render** en su propio archivo, que se sigue invocando como función: no se convirtió en componente, para que el árbol que se pinta sea idéntico.
    - El script aborta si una variable se reasigna fuera de su bloque o si un bloque usa algo declarado después.
  - **CA-1:** los 12 snapshots pasan **sin regenerarse**. **CA-2:** orquestadores de 133 y 76 líneas; ningún archivo nuevo supera 450 (los estilos se partieron en 3 objetos combinados en el mismo orden). **CA-3:** `App.js` importa igual. **CA-6:** `npm run gate` en verde, con 25 suites, 297 pruebas y el bundle de Android compilando.
- [ ] **CA-4 (parcial):** el objeto que se envía a `guardarPerfilCompletoUsuario` está fijado en un snapshot. Faltan los tests unitarios por paso de los hooks extraídos.
- [ ] **CA-5:** capturas web antes y después y lista para Android (pendiente de la verificación final).
- **Pregunta abierta para el usuario:** `PERFIL_USUARIO_BASE.fechaNacimiento = '2010-11-26'` (15 años) es el valor por defecto del onboarding. No se cambió porque podría ser intencional.
