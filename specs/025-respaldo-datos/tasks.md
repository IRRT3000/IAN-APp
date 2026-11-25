# Tareas — Spec 025: Respaldo y Restauración de Datos

- [x] **T1** (Claude / planificación): Decisiones del dueño y borrador de `spec.md`, `plan.md` y `tasks.md`.
- [ ] **T2** (revisor-critico): Revisión del plan.
  - Ronda 1: `CAMBIOS_REQUERIDOS`. Tuvo 3 bloqueantes: la restauración no era atómica, el cambio de carpeta de fotos tampoco y las claves `:corrupto:` se colaban. También señaló 7 menores. Todo se aplicó en la v2.
  - Ronda 2: solo sobre lo corregido.
- [ ] **T3** (Implementador): `npx expo install expo-sharing` y `npx expo-doctor` (plan §1).
- [ ] **T4** (Implementador): `src/services/respaldo.js` y `__tests__/respaldo.test.js` (plan §2 y §4).
- [ ] **T5** (Implementador): Sección «Respaldo de datos» en Configuración y prop `onDatosRestaurados` en `App.js` (plan §3), con su test de componente.
- [ ] **T6** (revisor-critico): Revisión del código → `CODIGO_APROBADO`.
- [ ] **T7** (Implementador): `npm run gate`, prueba manual en web y `MEMORY.md` (plan §5).
