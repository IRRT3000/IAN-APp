# Plan: Modo Dual Claude Code (planifica/revisa) ⟷ Antigravity (implementa)

## Contexto
Hasta hoy solo trabajabas con Antigravity. Ahora quieres este reparto: tú planificas con Claude en Deska (con el modelo que elijas), Gemini (`gemini-3.8-flash-high`) implementa solo, y Claude revisa, prueba y re-planifica correcciones, con un contador para evitar ciclos infinitos y gastando los menos tokens posibles. Hoy Claude no ve los agentes ni las skills de `.agents/`, no existe `CLAUDE.md` y `.claude/` está en `.gitignore`. La rama `flow/setup-multi-harness` (6/10, nunca probada con los agentes reales) se queda en GitHub como respaldo y de ella solo se rescatan piezas.

## Cómo funciona el ciclo
1. `/spec` → planificas con Claude. Claude escribe `specs/NNN-slug/{spec,plan,tasks}.md` + `ciclo.md` (estado, intento N/3, dictámenes). Si la spec es mediana o grande, `revisor-critico` audita el plan. Tú apruebas.
2. `/implementar` → Claude lanza a Gemini en segundo plano. Tú lo ves en vivo en una terminal de Deska (`Get-Content -Wait` del log). Cuando Gemini termina, Claude despierta solo.
3. El script `run.mjs` revierte lo que Gemini haya tocado fuera de su zona, hace un **commit WIP** del intento (lo hace Claude, no Gemini, porque es más seguro y deja diffs limpios), corre `npm run gate` y entrega a Claude un resumen de ≤40 líneas.
4. Si la puerta de calidad sale roja, Claude no gasta una revisión: re-planifica con los errores reales. Si sale verde, `revisor-critico` audita el diff del intento contra la spec.
5. Si hay cambios: Claude escribe una corrección corta con la causa raíz y Gemini **retoma su misma conversación** (`--conversation id`). Máximo 3 ejecuciones de Gemini por spec. Se detiene antes si los mismos hallazgos se repiten. Si falla por red o cuota, reintenta una vez y te avisa (no gasta intentos). Recibes notificación solo cuando te necesita.
6. Al aprobar: pruebas en **Expo Go** → con tu OK Claude junta los WIP en **un solo commit** → con tu OK hace merge a `main` + push → release (bump + tag `v*`) solo si lo pides. Nunca se trabaja en `main`; en cada spec Claude decide si crea rama nueva o sigue en la actual.

## Ajustes respecto a lo hablado (para ahorrar tokens y evitar fallas)
- Gemini se llama directo con `--agent implementador` (o `subagente-motion` si la spec es solo de animación), sin pasar por el `orquestador`. Así se ahorra un salto de Gemini, y retomar la conversación con subagentes no está probado. `orquestador` y `subagente-ui` quedan para el Modo Solo. El detalle visual lo aplica `implementador` con las skills de UI, dentro de lo que define el plan.
- El `revisor-critico` de Claude es un archivo completo, no un puntero. El original de Antigravity trae Playwright y MCPs que en Claude no aplican.
- `/spec` e `/implementar` van en `.claude/commands/`, no en `.agents/skills`, porque Gemini las vería.
- Para `package.json` y `app.json` se usa una regla "preguntar" en vez de "bloquear", para que el bump del release siga siendo posible.

## Fase 0 — Pruebas rápidas (rama temporal, sin tocar la app)
- Lanzar `agy -p "Responde OK" --model gemini-3.8-flash-high --output-format json` desde Claude, sin variables `DESKA_*`. Ver los campos del JSON (`conversation_id`, `denied_actions`) y el código de salida.
- Probar los permisos: escribir en `src/`, `git commit` y `npx expo start` deben quedar negados o permitidos según la lista. Revertir después.
- Probar que `--conversation` retoma la conversación, el formato de `stream-json` (que se pueda seguir en vivo) y que una tarea en segundo plano despierta a Claude.
- Probar las reglas de bloqueo de Claude y que las skills se ven a través del enlace de carpeta (`/skills`, `/context`).

## Fase 1 — Base de pruebas (rama `chore/modo-dual`, spec piloto 010)
- Traer de la rama vieja `__tests__/` (3 tests, ya verificados contra `main`) y `eslint.config.js`.
- `npx expo install jest-expo jest eslint eslint-config-expo -- --save-dev`.
- Scripts `lint`, `test`, `bundle:check` y `gate`; preset `jest-expo`. Si jest falla, agregar `babel.config.js`.
- `.gitignore`: `.claude/*` con las excepciones `settings.json`, `agents/`, `commands/` y `flow/`; también `specs/*/.flow/` y `.flow-export/`.

## Fase 2 — Lado Claude
- `CLAUDE.md`: `@AGENTS.md` + ≤12 líneas sobre el rol de Claude y por qué.
- `.claude/settings.json`:
  - Bloquear: `Edit(/src/**)`, `/App.js`, `/index.js`, `/__tests__/**`, `/assets/**`, `Read(.env*)`.
  - Preguntar: `package.json`, `app.json`, `eas.json`, `git push/merge/tag/reset --hard`.
  - `skillOverrides` para ocultar las skills que no aplican (ahorra unos 15 mil caracteres).
- Enlace de carpeta (junction) `.claude/skills` → `.agents/skills`: las mismas 40 skills para los dos.
- `.claude/agents/revisor-critico.md`: solo lectura, `model: inherit`. Dictamen en JSON (`blocker`/`major`/`minor` con `archivo:línea`), reglas tomadas de la rama vieja.
- `.claude/commands/spec.md` y `implementar.md` (`disable-model-invocation`).
- `.claude/flow/run.mjs` (~150 líneas): lanzar agy, revisar zonas, commit WIP, puerta de calidad, resumen. Más `report.schema.json` y `status.mjs`.

## Fase 3 — Lado Antigravity
- `AGENTS.md`:
  - Sección **Contrato Dual**: quién hace qué y por qué, quién escribe cada archivo y el contador.
  - **Modo Dual** (cuando el prompt empieza con `[MODO DUAL]`) y **Modo Solo** (el ciclo actual de 4 agentes).
  - Tabla de agentes por lado.
  - Formato de spec y de bug con criterios de aceptación `CA-n` medibles.
  - Solo Claude escribe `MEMORY.md` y `TROUBLESHOOTING.md` en Dual; Gemini los propone en su reporte.
- `implementador.md`, sección Dual: la spec es la fuente de verdad; no edita MEMORY; no usa Playwright ni Expo Web; corre la puerta de calidad; devuelve el reporte JSON; ante un bloqueo, reporta en vez de improvisar.
- `orquestador.md`: agregar la ruta a ui/motion (Modo Solo). `equipo-agentes`: marcarlo como solo para Modo Solo.
- Permisos de agy por proyecto (`~/.gemini/config/projects/6baf3bac-….json`):
  - Permitir: editar `src`, `__tests__`, `assets`, `App.js` y `package.json`; `npx expo install`, `expo-doctor`, `npm run lint/test/bundle:check/gate`, git de solo lectura.
  - Negar: git que escribe, `expo start`, `eas`, archivos de gobierno, `.env`.

## Fase 4 — Piloto
La spec 010 (base de pruebas) recorre el ciclo completo. Al terminar se mide el gasto con `/context` y se actualizan `MEMORY.md` y `TROUBLESHOOTING.md`.

## Ahorro de tokens
- Claude solo lee el resumen de `run.mjs`, nunca el log completo de Gemini.
- Si la puerta de calidad sale roja, no hay revisión.
- El diff no incluye `package-lock.json`.
- En las correcciones se retoma el mismo revisor y el mismo Gemini.
- Las instrucciones viven en `AGENTS.md` y el prompt de Gemini es solo un puntero a un archivo.
- Auditoría del plan solo en specs medianas o grandes.
- `CLAUDE.md` mínimo.
- Una tarea nueva de Deska por spec.

## Riesgos
- Que `agy` termine con código 0 no significa éxito: se juzga por el reporte válido.
- Si cierras la tarea de Deska, Gemini se detiene; se puede reanudar con `conversation_id`.
- `.flow-export` contiene la API key embebida: está en gitignore y el revisor no la lee.
- Las reglas de Claude son una barrera, no un sandbox.

## Verificación
- Las pruebas de la Fase 0 pasan.
- `npm run gate` sale verde.
- `/skills` muestra las skills compartidas.
- Una edición de Claude en `src/` queda bloqueada.
- La spec 010 completa el ciclo (intento → revisión → aprobado), con un solo commit final, prueba en Expo Go y merge a `main`.
