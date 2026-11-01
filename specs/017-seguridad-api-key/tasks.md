# Tareas de Implementación — Spec 017: Seguridad de la API Key de Gemini

Es independiente de las Specs 015-estudio y 016 y se puede implementar antes que ellas. Las tres conviven en el mismo worktree. Implementado por Antigravity en modo multi-agente (`orquestador`, `planificador`, `revisor-critico`, `implementador`, `subagente-ui`).

- [x] **T1** (Claude / Orquestador): Auditoría, `spec.md`, `plan.md` y `tasks.md` en `specs/017-seguridad-api-key/`, y dictamen `PLAN_APROBADO` de `revisor-critico`.
- [x] **T2** (Implementador): `npx expo install expo-secure-store` y configuración de `app.json`: plugin de SecureStore, `microphonePermission: false` y `blockedPermissions` (plan §1).
- [x] **T3** (Implementador): Reescribir `apiKeyStorage.js` con SecureStore, migración atómica y validación de formato (plan §2).
- [x] **T4** (Implementador): En `gemini.js`, la clave va en el encabezado `x-goog-api-key`, se elimina el respaldo `EXPO_PUBLIC_GEMINI_API_KEY` y se valida el formato antes de la red (plan §3).
- [x] **T5** (Implementador / Subagente UI): En `PanelConfiguracionLateral.jsx`, campo empieza vacío, portapapeles se limpia, autocompletado se desactiva, `AppState` auto-oculta y diseño Dark Luxury OLED aplicado (plan §4).
- [x] **T6** (Implementador): Crear `scripts/escaneoSecretos.js` e integrar el escaneo en `bundle-check.js` (plan §5).
- [x] **T7** (Implementador): Crear el mock de `expo-secure-store` y las suites de Jest del plan §6.
- [x] **T8** (Implementador): `npm run gate` en verde (14 suites, 149 tests), bundle limpio de secretos y `npx expo config --type introspect` verificado para CA-9.
- [ ] **T9** (Usuario): Prueba manual de CA-8 en el dispositivo, con un build nuevo, porque `expo-secure-store` es un módulo nativo. Una vez confirmada la migración, **regenerar la API key en AI Studio**: la anterior estuvo en texto plano en AsyncStorage, en las copias de seguridad de Google y en el `.env` usado con `expo start`. Después, borrar la línea `EXPO_PUBLIC_GEMINI_API_KEY` del `.env`.
- [x] **T10** (Revisor Crítico / Antigravity): Revisión del código con `revisor-critico` (`CODIGO_APROBADO`) contra CA-1 a CA-12. Actualizar `README.md`, `MEMORY.md` y `TROUBLESHOOTING.md` (INC-010). Sin commit hasta que el usuario lo pida.
