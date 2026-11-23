# Tareas de Implementación — Spec 023: Accesibilidad y Feedback al Usuario

> **Estado: BORRADOR.** Depende de Q11 y Q13, y de las Specs 020 y 022.

- [x] **T1** (Claude / planificación): Auditoría de etiquetas, contraste (WCAG) y escala de letra; borrador de `spec.md`, `plan.md` y `tasks.md`.
- [ ] **T2** (Usuario): Responder Q11 y Q13.
- [x] **T3** (revisor-critico): Revisar el plan.
  - Primera ronda (2026-11-23): `CAMBIOS_REQUERIDOS`, con 2 bloqueantes (`defaultProps` ignorado en React 19; `accessibilityState` no llega al DOM en web) y 5 importantes. Todos se aplicaron en la v2.
  - Segunda ronda: `PLAN_APROBADO`.
  - Quedan tres menores para el implementador:
    - Comprobar a mano `aria-disabled`/`aria-busy`.
    - Probar dos anuncios seguidos en `RegionAnuncios`.
    - En React 19, `ref` llega como prop en `Texto`/`CampoTexto` (sin `forwardRef`).
- [ ] **T4** (Implementador): Test estático con su lista de pendientes (plan §1).
- [ ] **T5** (Implementador): `src/utils/accesibilidad.js` (plan §2).
- [ ] **T6** (Implementador): Etiquetas, roles, estados y acciones accesibles, una pantalla por commit (plan §3).
- [ ] **T7** (Implementador): Anuncios y regiones vivas (plan §4).
- [ ] **T8** (Implementador, Q11): Escala de letra con tope (plan §5).
- [ ] **T9** (Implementador, Q13): Contraste de `textMuted` y su test (plan §6).
- [ ] **T10** (revisor-critico): Revisión del código → `CODIGO_APROBADO`.
- [ ] **T11** (Implementador): `npm run gate`, revisión en web y lista de TalkBack para el usuario; actualizar `MEMORY.md` (plan §7).
