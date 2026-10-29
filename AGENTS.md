# AGENTS.md — Protocolo Operativo Fitness Tracker

## Gestión de Memoria e Incidencias
- Al iniciar cualquier tarea: Leer `MEMORY.md` y `TROUBLESHOOTING.md` para conocer el estado actual y soluciones previas.
- Al terminar cada tarea: Actualizar `MEMORY.md` reflejando el nuevo estado y decisiones clave.
- Al terminar cada spec o detectar fallas relevantes: Evaluar obligatoriamente si debe registrarse en `TROUBLESHOOTING.md`.
- Regla de ~50 líneas: Mantener tanto `MEMORY.md` como `TROUBLESHOOTING.md` en máximo ~50 líneas, eliminando lo obsoleto y reteniendo solo lo importante.
- Prohibido almacenar claves de API, tokens o información sensible en la memoria.

Aplicación móvil local-first construida en React Native con Expo (SDK actual).
Objetivo: Registro de entrenamientos de fuerza, análisis nutricional por foto (Gemini) y mapa de calor.

## Reglas Críticas de Expo & Herramientas
- Instalación de dependencias: usar SIEMPRE `npx expo install <paquete>` (prohibido `npm i` para librerías nativas).
- Diagnóstico: ante cualquier fallo de dependencias, ejecutar `npx expo-doctor`.
- No modificar carpetas nativas (`ios/`, `android/`) manualmente.

## Arquitectura y Estado
- Vistas y Maquetación: StyleSheet nativo de React Native.
- Persistencia: Almacenamiento local con `@react-native-async-storage/async-storage`.
- Inmutabilidad estricta: Actualizaciones de arreglos y objetos usando spread operator (`[...prev, nuevoItem]`).
- Gestión de fechas: Trabajar siempre con fecha local `YYYY-MM-DD`. Prohibido usar `toISOString()` o `new Date("YYYY-MM-DD")` porque convierten a UTC y desfasan los días.
- Formato de salida de IA: Respuestas de Gemini siempre estructuradas en esquemas JSON válidos.

## Alcance Fase 1: MVP Local
1. Formulario para registrar sesión de gimnasio (ejercicio, series, reps, peso).
2. Lista visual de ejercicios completados en el día.
3. Persistencia en AsyncStorage para no perder datos al reiniciar.
4. Cuadrícula semanal simple (primer prototipo del mapa de calor).

## Reparto de Roles: Claude Code ⟷ Antigravity
- **Regla Mandatoria de Flujo**: Toda **nueva Spec** y toda **corrección de bug** pasa por plan → revisión del plan → implementación → revisión del código. Prohibido aplicar cambios sin plan aprobado y sin revisión final.
- **Claude Code — planifica y revisa**: usa `planificador` (plan en `specs/NNN-slug/{spec,plan,tasks}.md` con criterios de aceptación `CA-n` medibles) y `revisor-critico` (audita el plan y el diff contra los `CA-n`).
- **Antigravity — implementa y diseña**: usa `implementador` (código y comandos), `subagente-ui` (diseño visual) y `subagente-motion` (animación, gestos, hápticos). Implementa solo lo que pide el plan aprobado y no hace commits ni push.
- **Autonomía**: cada harness decide por su cuenta qué agentes de su lado invoca y en qué orden; el usuario no necesita indicarlo (basta con «Planea…» o «Implementa `specs/NNN-slug/plan.md`»).
- **Coordinación**: el usuario pasa el turno entre los dos (en Deska, cada uno en su tarea/panel; fuera de Deska, en sus propias sesiones). El contrato entre ambos son los archivos de `specs/NNN-slug/`.
- **Respaldo**: los roles son el reparto por defecto, no un candado. Si uno de los dos se queda sin tokens, el otro asume todos los roles usando los mismos agentes (`.agents/agents/`; en Claude Code, registrados en `.claude/agents/`).
- **Modo Solo (opcional, Antigravity)**: para que Antigravity haga el ciclo completo él solo, se usa `orquestador` con la skill `equipo-agentes`.

## Agentes (`.agents/agents/`)
- **`orquestador`** (`EnableWriteTools: false`, `EnableSubagentTools: true`, `EnableMCPTools: false`): Coordina en qué momento actúa cada agente y gestiona la comunicación entre ellos; prohibido leer/escribir código, planificar o usar MCPs.
- **`planificador`** (`EnableWriteTools: false`, `EnableMCPTools: true`): Diseña la planificación técnica detallada paso a paso en modo solo lectura con apoyo de `context7` y `sequential-thinking`.
- **`revisor-critico`** (`EnableWriteTools: false`, `EnableMCPTools: true`): Audita el plan del `planificador` (`PLAN_APROBADO` / `CAMBIOS_REQUERIDOS`) y el código del `implementador` (`CODIGO_APROBADO` / `CODIGO_RECHAZADO`) buscando casos límite, fallos y omisiones con `sequential-thinking`, `context7` y `playwright`.
- **`implementador`** (`EnableWriteTools: true`, `EnableMCPTools: true`): Único subagente general con permiso para crear/modificar código y ejecutar comandos siguiendo el plan aprobado y las revisiones, apoyado en `context7` y `playwright`.
- **`subagente-ui`** (`EnableWriteTools: false`, `EnableMCPTools: true`): Especialista en diseño visual estático (tokens Dark Luxury OLED, escala 4pt, maquetación nativa sin lógica). Apoyado en `expo-design-system`, `frontend-design` y `ui-taste`.
- **`subagente-motion`** (`EnableWriteTools: true`, `EnableMCPTools: true`): Especialista en físicas de resorte en UI Thread (Reanimated), gestos y hápticos unificados (`haptics.js`). Apoyado en `expo-animation` y `vercel-react-native-skills`.