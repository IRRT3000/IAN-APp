# Tareas de Implementación — Spec 018: Análisis Nutricional Contextual y de Alta Precisión

Requisito previo: Spec 017 y specs anteriores en estado verde.

- [x] **T1** (Claude / Antigravity): Planificación y diseño de `spec.md`, `plan.md` y `tasks.md` en `specs/018-analisis-comida-contextual/`.
- [x] **T2** (Antigravity): Crear `src/utils/validacionComida.js` con la función pura `sanearValoresComida` y su suite de pruebas unitarias en `__tests__/validacionComida.test.js` (plan §3 y §6.1).
- [x] **T3** (Antigravity): Actualizar `src/services/gemini.js` para admitir `descripcionUsuario` en `construirPromptAltaPrecision` y `analizarComidaConGemini` con la directiva estricta de prioridad cuantitativa + pruebas en `__tests__/geminiNutricion.test.js` (plan §2 y §6.2).
- [x] **T4** (Antigravity, `subagente-ui` + `subagente-motion`): Implementar `src/components/ModalAnalisisComida.jsx` con los estados `'preparacion'`, `'analizando'` y `'revision'`, ergonomía Thumb-Zone, insets seguros, `KeyboardAvoidingView` y cero emojis (plan §4).
- [x] **T5** (Antigravity): Integrar `ModalAnalisisComida` en `src/components/NutricionView.jsx`, reemplazando la ejecución automática por la captura de borrador, apertura de modal y guardado atómico (plan §5).
- [x] **T6** (Antigravity): Actualizar y ampliar las suites de prueba en `__tests__/NutricionView.test.js` para cubrir la intercepción de captura, edición manual y guardado con macros personalizados (plan §6.3).
- [x] **T7** (Antigravity): Ejecutar `npm run gate` y verificar que pase en serie: lint (0 errores), pruebas de Jest (100% aprobadas) y bundle:check (sin fugas de secretos).
- [x] **T8** (Claude / Revisor Crítico): Auditoría final del diff contra los criterios de aceptación CA-1 a CA-12, actualización de `MEMORY.md` y evaluación de `TROUBLESHOOTING.md`.
