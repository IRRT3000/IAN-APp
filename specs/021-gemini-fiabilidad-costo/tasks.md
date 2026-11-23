# Tareas de Implementación — Spec 021: Fiabilidad, Costo y Modelo de Gemini

> **Estado: BORRADOR.** Depende de Q12 y Q3.

- [x] **T1** (Claude / planificación): Prueba inicial de modelos (2026-11-23) y borrador de `spec.md`, `plan.md` y `tasks.md`.
- [ ] **T2** (Usuario): Responder Q12 (nivel de la clave) y Q3 (fotos de prueba).
- [x] **T3** (revisor-critico): Revisar el plan.
  - Primera ronda (2026-11-23): `CAMBIOS_REQUERIDOS`, con 3 bloqueantes y 6 importantes. Todos se aplicaron en plan v2.
  - Segunda ronda: `PLAN_APROBADO`. Los 2 menores también se aplicaron.
- [ ] **T4** (Implementador): `ejecutarLlamadaGemini` con `thinkingConfig`, `finishReason`, `retryDelayMs` y sin partes `thought` (plan §1).
- [ ] **T5** (Implementador): `ejecutarConFailover` y `mensajeParaUsuario` (plan §2–3).
- [ ] **T6** (Implementador): Migrar las cuatro funciones y eliminar los resultados inventados (plan §4).
- [ ] **T7** (Implementador): Cadena de modelos según Q12 y textos de progreso en las vistas (plan §5–6).
- [ ] **T8** (Implementador): `__tests__/geminiFailover.test.js` y ajustes de los tests existentes (plan §7, CA-1 a CA-5).
- [ ] **T9** (Implementador): Prueba real con fotos del usuario e informe aquí (plan §8, CA-6).
- [ ] **T10** (revisor-critico): Revisión del código → `CODIGO_APROBADO`.
- [ ] **T11** (Implementador): `npm run gate`; actualizar `MEMORY.md` y `TROUBLESHOOTING.md` (nivel gratuito → 503/429 en imágenes).
