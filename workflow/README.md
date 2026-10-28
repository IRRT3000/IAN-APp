# Flujo multi-agente: planear, implementar y revisar en automatico

Un solo comando mueve una idea (spec nueva o bug) por este ciclo, sin que tengas que pasar mensajes entre las dos IAs:

```
PLAN (Claude Code) -> IMPLEMENT (Antigravity) -> GATE (lint + jest + empaquetado)
   -> REVIEW (Claude Code, sesion limpia)
        APROBADO -> fin: REPORT.md + rama lista para PR
        CAMBIOS  -> REPLAN (causa raiz del fallo) -> IMPLEMENT -> GATE -> REVIEW ...
```

El ciclo termina cuando el revisor aprueba (`objective_met: true`, sin hallazgos blocker/major), o se detiene solo si llega al tope de rondas (3 por defecto) o si el revisor repite los mismos hallazgos dos veces seguidas (no hay progreso).

La meta de calidad va escrita en cada prompt: dejarlo **concluido, eficiente y eficaz a futuro** (criterios cumplidos, sin desperdicio de recursos, con pruebas y `MEMORY.md` al dia).

## Al llegar: 4 pasos (una sola vez)

```bash
git switch flow/setup-multi-harness      # o la rama principal despues de hacer merge del PR
npm ci                                   # dependencias
npm run flow -- setup                    # instala jest-expo, jest, eslint y eslint-config-expo con las versiones de Expo; commitea package.json y el lock
npm run flow -- doctor                   # revisa Node, git, claude, agy, jest, eslint y hace una prueba real de cada agente
```

Si `doctor` marca algo en `[FALTA]`, trae la pista para resolverlo. Luego:

```bash
npm run flow -- run "Perfil editable: peso, estatura y fecha de nacimiento en configuracion" --type spec
npm run flow -- run "El heatmap muestra el dia anterior despues de las 18:00" --type bug
```

Por defecto, antes de crear la spec corre la **linea base**: la puerta de calidad sobre la rama actual. Si ya esta roja se niega a empezar (si no, gastaria las rondas en fallas ajenas a la spec). `--skip-baseline` la omite.

Cuando termina:

1. Lee `specs/NNN-*/REPORT.md` (resultado por ronda, mejoras menores, pruebas manuales).
2. Prueba en el celular lo marcado `[MANUAL]`.
3. `git push -u origin flow/NNN-slug` y abre el PR. El merge lo decides tu.

## Comandos

| Comando | Para que |
| - | - |
| `npm run flow -- setup` | Instala las herramientas de prueba y guarda el lock. |
| `npm run flow -- doctor [--skip-probes]` | Verifica el entorno; `--skip-probes` omite las llamadas reales a los agentes. |
| `npm run flow -- run "objetivo" --type spec\|bug` | Crea la spec, la rama y corre todo el ciclo. |
| `npm run flow -- run <id> [--rounds N] [--from FASE]` | Reanuda o extiende una spec detenida (`FASE`: PLAN, IMPLEMENT, GATE, REVIEW, REPLAN). |
| `npm run flow -- new "objetivo"` | Solo crea la spec y la rama. |
| `npm run flow -- status [id]` | Estado de las specs. |
| `npm run flow:selftest` | Prueba el orquestador con agentes simulados (sin IA, sin costo). |
| `npm run gate` | La misma puerta de calidad que usa el flujo: lint + jest + `expo export`. |

Ctrl+C detiene al agente en curso; el estado queda guardado y se reanuda con `run <id>`.

## Quien hace que y donde escribe

| Rol | Herramienta | Escribe solo en |
| - | - | - |
| Planificador y revisor | Claude Code (`claude -p`, cada llamada es una sesion limpia) | `specs/NNN-*/` |
| Implementador | Antigravity (`agy -p`) | App, pruebas, `package.json`, `MEMORY.md`, `TROUBLESHOOTING.md`; en la spec solo `tasks.md` e `implementation-roundN.md` |
| Orquestador | `workflow/flow.mjs` | Estado, puerta de calidad, commits |

El orquestador **revierte** lo que un agente toque fuera de su territorio (y se lo recuerda en la ronda siguiente). `workflow/`, `AGENTS.md`, `CLAUDE.md`, `.claude/`, `.github/` y `.agents/` estan protegidos para todos. Ningun agente hace commit ni push.

## Archivos de cada spec (`specs/NNN-slug/`)

`objective.md`, `spec.md` (criterios de aceptacion medibles), `plan.md`, `tasks.md` (tareas con "listo cuando"), `HANDOFF.md`, `gate-roundN.{json,md}`, `review-roundN.json`, `REVIEW.md`, `implementation-roundN.md`, `REPORT.md` y `state.json`. Los registros crudos y los prompts viven en `.flow/` (ignorado por git).

## Que revisa la puerta de calidad (automatica, sin dispositivo)

| Paso | Comando | Que detecta |
| - | - | - |
| lint | `npm run lint` | Errores de codigo y de hooks de React. |
| test | `npm test` | Logica rota (jest-expo). Las pruebas base estan en `__tests__/`. |
| bundle | `npm run bundle:check` | Que la app empaqueta para Android (imports rotos, sintaxis). |
| expo-doctor | `npx expo-doctor` | Versiones incompatibles. Es aviso, no bloquea. |
| e2e | `maestro test .maestro` | Flujo real en un emulador. Desactivado por defecto. |

El revisor recibe el resultado de la puerta; si esta roja, el orquestador arma el veredicto con los fallos reales y pasa directo a REPLAN sin gastar una revision.

### Activar E2E con Maestro (opcional)

Requiere Java (JDK 17+), Android Studio con un emulador, Maestro y una APK de la app instalada en el emulador. Pasos: instalar Maestro, instalar la APK (`eas build` o la del release) en el emulador, y poner `"enabled": true` en el paso `e2e` de `workflow/config.json`. La prueba de humo esta en `.maestro/smoke.yaml`. En Windows, Maestro se usa mejor desde WSL2; no esta verificado aqui.

## Permisos de Antigravity (lo unico que tienes que decidir)

En modo no interactivo `agy` no puede pedirte permiso. Opciones:

1. **Recomendada:** reglas permitidas en `~/.gemini/antigravity-cli/settings.json`:
   ```json
   { "permissions": { "allow": ["command(git)", "command(npm)", "command(npx)", "command(node)", "write_file(src/)", "write_file(specs/)"] } }
   ```
   La sintaxis exacta puede variar segun la version de `agy`; `doctor` lo prueba ejecutando `node --version` y, si falla, imprime esta pista.
2. Bajo tu propio riesgo: agregar `"--dangerously-skip-permissions"` a `implementer.args` en `workflow/config.json`. El orquestador igual revierte lo que salga de territorio, pero no puede deshacer efectos fuera del repositorio.

## Configuracion (`workflow/config.json`)

| Clave | Efecto |
| - | - |
| `maxRounds` | Rondas maximas por spec (3). Se amplia al reanudar con `--rounds N`. |
| `agentRetries`, `retryDelaySeconds` | Reintentos ante errores transitorios o limite de uso. |
| `timeoutMinutes` | Tiempo maximo por fase (plan, implement, review, replan). |
| `protectedPaths` | Rutas que ningun agente puede modificar. |
| `planner`, `reviewer`, `implementer` | Comando y argumentos de cada agente. Se pueden cambiar de modelo o de herramienta. |
| `gate.steps` | Pasos de la puerta de calidad (`blocking`, `enabled`, `timeoutMinutes`). |
| `gate.baselineCheck` | Verificar la rama base antes de crear una spec. |

## Usarlo dentro de DESKA

DESKA ejecuta tareas de agentes en worktrees. Abre una terminal de DESKA en el proyecto y corre los mismos comandos; el flujo usa su propia rama por spec (`flow/NNN-slug`), asi que no choca con otras tareas. Si DESKA crea un worktree por tarea, corre `npm ci` en ese worktree antes del primer `run`.

## Costos y limites esperables

- Un ciclo con varios agentes gasta del orden de 2 a 3 veces mas tokens que uno solo; por eso las specs deben ser chicas (una cosa por spec) y el tope de rondas existe.
- Antigravity no reporta costo; el de Claude Code aparece en `REPORT.md` cuando esta disponible.
- Si un agente alcanza su limite de uso, el flujo reintenta y, si no se libera, se detiene con estado guardado para reanudar.
- Antigravity ha tenido reportes de ignorar reglas de `AGENTS.md`; por eso no se confia en lo que diga: lo decide la puerta de calidad y el revisor con evidencia (`archivo:linea`).

## Lo que no se pudo verificar al construirlo

Esto se armo en un entorno sin acceso a npm ni a los agentes reales. Verificado: el orquestador completo con agentes simulados (`npm run flow:selftest`, 20 comprobaciones: ciclo, re-planificacion, tope, reanudacion, territorios, formato invalido, linea base) y las pruebas base con un ejecutor equivalente. **Sin verificar:**

- `jest`, `eslint` y `expo export` reales (jest-expo, eslint-config-expo/flat y el script `bundle:check` con SDK 58). `npm run gate` es la primera prueba real.
- Las llamadas reales a `claude -p` y `agy -p` (banderas, formato JSON y esquema de permisos de `agy`). `doctor` las prueba.
- El comportamiento en Windows (comillas al lanzar procesos, `npx expo install --dev`) y Maestro.
- Si `agy` puede invocar los agentes de `.agents/agents/` por nombre; el orquestador no depende de ello (le pasa el prompt completo).

Si algo falla en el primer `run`, el flujo se detiene con un motivo claro y todo queda en `specs/NNN-*/.flow/`.

## Lockfile

`npm run flow -- setup` modifica `package.json` y `package-lock.json` y los commitea. Hazlo antes de hacer merge o de crear un tag `v*`: el workflow de release usa `npm ci`, que exige que el lock coincida con `package.json`.

`workflow/legacy/` conserva los agentes internos del flujo anterior (orquestador, planificador, revisor-critico) por si quieres consultarlos.
