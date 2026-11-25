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

## Estado al 2026-11-24 (implementación)
- [x] T2: Q15 (hápticos de resultado) y Q17 (sonidos) aprobadas. **Q14 (opacidad de pulsación uniforme) NO se aplicó**: el usuario la aprobó «con video previo» y no se le pudo mostrar. Queda pendiente de su visto bueno.
- [x] T4: `src/utils/movimiento.jsx` (renombrado desde `.js` en la ronda de revisión).
  - **Desviación:** no se agregaron tokens `movimiento.*` porque, sin Q14, no hay valores que unificar.
  - `animarSegun` queda disponible para futuros usos.
- [x] T5 (parcial, a propósito): `usePreferenciaMovimiento` reactivo y pulso infinito del anillo protegido (commit d486d83).
  - **Desviación documentada:** no se tocaron los 13 archivos. Reanimated 4 ya aplica `ReduceMotion.System` por defecto a `withTiming`/`withSpring`/`withRepeat`, así que con la preferencia activa al arrancar esas animaciones ya saltan a su valor final.
  - Esa lectura de arranque NO cubre el cambio con la app abierta. La primera versión solo protegía el pulso infinito; la revisión de código lo marcó (B2) y se corrigió montando `<ConfigMovimientoReducido/>` en la raíz (`App.js`). Ese componente traduce la preferencia a `ReducedMotionConfig` (`Always`/`Never`), y Reanimated lo aplica a todas las animaciones nuevas.
  - Una regla estática obliga a proteger todo `withRepeat` futuro.
- [x] T7 (Q15): `vibrarExito`, `vibrarError` y `vibrarAviso` en `haptics.js`, conectados a los resultados de los análisis y guardados (commit 0564d16).
- [x] T4b / Q17: sonidos (commit 0564d16).
  - `expo-audio` sin micrófono ni reproducción en segundo plano (verificado en el manifiesto) y 5 WAV deterministas.
  - Servicio con precarga, volumen 0.35, respeto del modo silencio, tolerancia al autoplay web e interruptor en Configuración.
- [x] T8: tests de sonidos (11), movimiento (6), feedback por flujo (4) y regla de `withRepeat`.
- [x] T9: revisión de código.
  - Primera ronda: `CODIGO_RECHAZADO`. Se corrigió todo:
    - B1: el interruptor de sonidos lee el servicio en cada render hasta que el usuario lo toca (la preferencia puede cargar después de montar el panel).
    - B2: cambio en vivo con `ConfigMovimientoReducido` y una sola suscripción compartida (almacén de módulo con `useSyncExternalStore`).
    - B3: tests nuevos en `__tests__/feedbackResultados.test.js`: hápticos en web no llaman a `expo-haptics`; éxito y error de la comida dan el háptico y el sonido correctos una sola vez.
    - Errores sin feedback: la comparación de Cambio Físico y el análisis de estudio ahora llaman `vibrarError` + sonido `error`.
    - I4: `vibrarAviso` en los tres avisos de límite de fotos (fuera del updater de estado).
    - I5: la regla estática exige exactamente `!reducir` o `!reducirRef.current`, detecta `Reanimated.withRepeat` y falla si no encuentra ningún `withRepeat`.
    - Menor 9: sonido `borrado` al eliminar la API key.
  - Segunda ronda: `CODIGO_APROBADO`. Sus 4 menores también se aplicaron:
    - la regla de `withRepeat` quitaba la letra «s» en vez de los espacios (ahora usa `/\s+/`);
    - la lectura inicial de la preferencia ya no pisa un evento más nuevo;
    - se documentó el aviso de consola de `ReducedMotionConfig` en desarrollo;
    - una clave inválida ahora da háptico y sonido de error.
- [ ] T10: verificación manual en Android: «Quitar animaciones» con la app abierta, sonidos con el modo silencio y el interruptor.
