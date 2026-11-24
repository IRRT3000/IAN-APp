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

## Estado al 2026-11-24 (implementación)
- [x] T2: Q11 (escala de letra) y Q13 (contraste) aprobadas por el usuario.
- [x] T4: test estático con AST (`accesibilidadEstatica`). La línea base medida fue **121** táctiles sin nombre o rol en 17 archivos. Ahora es **0** (`PENDIENTES = {}`). También aplica la regla CA-2: todo selector expone `aria-selected`/`aria-checked`.
- [x] T5: `src/utils/accesibilidad.js` (`anunciar`) y `src/components/base/RegionAnuncios.jsx` (región `role="status"` / `aria-live` para web), montada en `App.js`.
- [x] T6: etiquetas, roles y estados en 101 lugares (commit 3ec6d3e).
  - `BotonInteractivo` reenvía hint, rol y estado seleccionado.
  - Las 4 cápsulas de borrado tienen la acción accesible «Borrar» (commit 3d42c30).
  - **Desviación:** el borrado por teclado en web (Supr) no se implementó: las cápsulas no son enfocables con teclado en web. Queda para una iteración futura.
- [x] T7: anuncios de éxito en 8 puntos (commit ac73241). Los errores siguen mostrándose en su bloque visible.
- [x] T8 (Q11): `base/Texto` con tope 1.4× (commit 4f7516b).
  - **Desviación:** el envoltorio exporta con los nombres `Text`/`TextInput`, así el codemod solo cambia imports.
  - Un test impide volver a importar directamente de `react-native`.
  - El tope local de 1.2 en botones y cifras grandes queda disponible en `TOKENS.escalaTexto.compacta`, pero **todavía no se aplicó** en componentes concretos.
- [x] T9 (Q13): `textMuted` `#666666` → `#898989` y test de contraste WCAG (commit 8d9337e).
- [ ] T10: revisión de código (en curso).
- [ ] T11: revisión en web con zoom de texto al 140 % y lista de TalkBack para el usuario.
