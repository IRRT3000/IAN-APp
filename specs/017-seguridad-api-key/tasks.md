# Tareas de Implementación — Spec 017: Seguridad de la API Key de Gemini

Es independiente de las Specs 015-estudio y 016 y se puede implementar antes que ellas. Las tres conviven en el mismo worktree. La implementa Claude Code como respaldo, a pedido del usuario.

- [ ] **T1** (Claude): Auditoría, `spec.md`, `plan.md` y `tasks.md` en `specs/017-seguridad-api-key/`, y aplicar la revisión del `revisor-critico`.
- [ ] **T2** (Claude): `npx expo install expo-secure-store` y los cambios de `app.json`: plugin de SecureStore, `microphonePermission: false` y `blockedPermissions` (plan §1).
- [ ] **T3** (Claude): Reescribir `apiKeyStorage.js` con SecureStore, la migración y la validación de formato (plan §2).
- [ ] **T4** (Claude): En `gemini.js`, la clave va en el encabezado `x-goog-api-key`, se elimina el respaldo `EXPO_PUBLIC_GEMINI_API_KEY` y se valida el formato antes de la red (plan §3).
- [ ] **T5** (Claude): En `PanelConfiguracionLateral.jsx`, el campo empieza vacío, el portapapeles se limpia, el autocompletado se desactiva y se corrigen los textos (plan §4).
- [ ] **T6** (Claude): Crear `scripts/escaneoSecretos.js` e integrar el escaneo en `bundle-check.js` (plan §5).
- [ ] **T7** (Claude): Crear el mock raíz de `expo-secure-store` y las suites de Jest del plan §6.
- [ ] **T8** (Claude): `npm run gate` en verde, también con `EXPO_PUBLIC_GEMINI_API_KEY` en el entorno, y `npx expo config --type introspect` para CA-9.
- [ ] **T9** (Usuario): Prueba manual de CA-8 en el dispositivo, con un build nuevo, porque `expo-secure-store` es un módulo nativo. Una vez confirmada la migración, **regenerar la API key en AI Studio**: la anterior estuvo en texto plano en AsyncStorage, en las copias de seguridad de Google y en el `.env` usado con `expo start`. Después, borrar la línea `EXPO_PUBLIC_GEMINI_API_KEY` del `.env`.
- [ ] **T10** (Claude): Revisión del código con `revisor-critico` contra CA-1 a CA-12. Actualizar `README.md`, `MEMORY.md` y `TROUBLESHOOTING.md` (INC-009). Sin commit hasta que el usuario lo pida.
