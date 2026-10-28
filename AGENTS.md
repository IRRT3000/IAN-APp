# AGENTS.md — Reglas compartidas (Claude Code y Antigravity)

Este archivo lo leen los dos agentes. Mantenlo corto: solo lo que un agente no puede deducir del codigo.

## Proyecto
App movil local-first (React Native 0.88 + Expo SDK 58, JavaScript sin TypeScript): entrenamientos de fuerza, nutricion por foto con Gemini (la clave la pone el usuario, BYOK) y mapa de calor anual. Persistencia en AsyncStorage. Vistas con `StyleSheet` nativo.

## Memoria del proyecto
- Al empezar: lee `MEMORY.md` y `TROUBLESHOOTING.md`. Al terminar: actualiza `MEMORY.md`.
- Ambos archivos se mantienen en ~50 lineas: resume o elimina lo obsoleto. Si una falla relevante se resolvio, registrala en `TROUBLESHOOTING.md` (causa raiz + solucion).
- Prohibido guardar claves de API, tokens o datos sensibles en cualquier archivo.

## Comandos (verifica tu trabajo con ellos)
- `npm run lint` · `npm test` · `npm run bundle:check` (empaqueta Android sin dispositivo) · `npm run gate` (los tres).
- Dependencias: SIEMPRE `npx expo install <paquete>`; ante fallos, `npx expo-doctor`. No edites `ios/` ni `android/`.

## Reglas de codigo
- Fechas: siempre fecha local `YYYY-MM-DD`. Prohibido `toISOString()` y `new Date("YYYY-MM-DD")` (desfasan el dia por UTC).
- Inmutabilidad estricta: actualiza arreglos y objetos con spread (`[...prev, nuevo]`).
- Sin emojis en la UI, alertas ni catalogo; iconos con `@expo/vector-icons` (Feather).
- Touch targets >= 44x44 pt; safe areas con `useSafeInsets`; acciones principales al alcance del pulgar.
- Respuestas de Gemini siempre como JSON estructurado y validado.
- No agregues datos personales fijos nuevos en el codigo (fecha de nacimiento, peso, estatura): van en el perfil del usuario.
- No guardes cadenas Base64 en AsyncStorage (rompe Android por `CursorWindow`).

## Flujo multi-agente (obligatorio para specs nuevas y bugs)
Todo cambio entra por el orquestador; no se aplican cambios directos.

```
npm run flow -- doctor                              # una vez: verifica agentes y herramientas
npm run flow -- run "objetivo" --type spec|bug      # ciclo completo y automatico
npm run flow -- run <id> [--rounds N]               # reanudar o extender una spec detenida
```

Ciclo: **PLAN** (Claude Code) -> **IMPLEMENT** (Antigravity) -> **GATE** (lint + pruebas + empaquetado) -> **REVIEW** (Claude Code, sesion limpia) -> si falla: **REPLAN** (causa raiz) -> IMPLEMENT -> ... hasta aprobar o llegar al tope de rondas. Detalle en `workflow/README.md`.

Territorios (el orquestador revierte lo que se salga):
- **Claude Code** (planificador y revisor): escribe solo en `specs/NNN-*/`. No implementa codigo de la app.
- **Antigravity** (implementador): modifica la app, pruebas, `package.json`, `MEMORY.md`, `TROUBLESHOOTING.md`; en `specs/NNN-*/` solo `tasks.md` e `implementation-roundN.md`. No toca `workflow/`, `AGENTS.md`, `CLAUDE.md`, `.claude/`, `.github/` ni `.agents/`.
- Ningun agente hace `git commit`/`push`: lo hace el orquestador, una rama por spec (`flow/NNN-slug`).
- El humano prueba en el celular lo que sea `[MANUAL]` y decide el merge.

Definicion de terminado (lo que revisa el revisor): criterios de `spec.md` cumplidos, puerta de calidad verde, pruebas nuevas para la logica nueva, sin deuda declarada ni datos personales fijos, `MEMORY.md` al dia. La meta es entregar **concluido, eficiente y eficaz a futuro**.

Agentes de apoyo para Antigravity en `.agents/agents/`: `implementador`, `subagente-ui` (diseno estatico con tokens) y `subagente-motion` (Reanimated, gestos, haptics). Los agentes del flujo anterior (orquestador, planificador, revisor-critico) se archivaron en `workflow/legacy/`.
