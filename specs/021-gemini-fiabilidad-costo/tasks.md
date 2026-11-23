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

## Estado al 2026-11-23 (implementación)
- [x] T2: Q12 → la clave se queda en nivel gratuito y se prioriza la exactitud. Q3 → 6 fotos reales de Wikimedia Commons (manzana, plátano, pan, pizza, huevo con papas, avena).
- [x] T3: `PLAN_APROBADO` (2 rondas).
- [x] T4–T8: Implementado en el commit e8c8fc5. Hay 28 pruebas nuevas, y el gate queda en verde con 23 suites y 243 pruebas.
- [x] **T9 (CA-6, prueba real)**: cadena `gemini-3.5-flash-lite` → `3.6-flash` → `3-flash-preview`, 2 repeticiones por foto.
  - **Resultado:** 12/12 análisis completados, **0 errores visibles para el usuario**. 7 respuestas 503 se resolvieron con reintentos.
  - **Exactitud:** 10/12 dentro del rango USDA. La pizza dio 381 kcal frente al rango 250–350: sobreestima un 9 %.
  - **Comparativa previa por modelo:** Flash-Lite acertó 6/6 en ~1.6 s. 3-flash-preview, 3.6 Flash y 3.5 Flash quedaron limitados por 429.
- [x] T10: `CODIGO_APROBADO`, sin bloqueantes.
- [ ] **Menores pendientes de la revisión:**
  1. El test CA-2(e) debe afirmar que el reloj llega como máximo a 90 s.
  2. La regex de razonamiento debe cubrir `thinking_level`.
  3. Hay que enmascarar la clave en `fallos[].mensaje`.
  4. Faltan tests de punta a punta por clase de error.
  5. Falta un mensaje propio para «sin conexión».
  6. Falta una fecha de nacimiento neutral en el prompt físico (`gemini.js:263`).
