# AGENTS.md — Protocolo Operativo Fitness Tracker

## Gestión de Memoria
- Al iniciar cualquier tarea: Leer `MEMORY.md` para conocer el estado actual y las decisiones previas.
- Al terminar cada tarea: Actualizar `MEMORY.md` reflejando el nuevo estado, decisiones clave y errores resueltos.
- Mantener `MEMORY.md` en máximo ~50 líneas podando detalles irrelevantes.
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

## Arquitectura Multi-Agente (`.agents/agents/` y `.agents/skills/equipo-agentes/`)
- **`orquestador`** (`EnableWriteTools: false`, `EnableSubagentTools: true`, `EnableMCPTools: false`): Coordina en qué momento actúa cada agente y gestiona la comunicación entre ellos; prohibido leer/escribir código, planificar o usar MCPs.
- **`planificador`** (`EnableWriteTools: false`, `EnableMCPTools: true`): Diseña la planificación técnica detallada paso a paso en modo solo lectura con apoyo de `context7` y `sequential-thinking`.
- **`revisor-critico`** (`EnableWriteTools: false`, `EnableMCPTools: true`): Audita el plan del `planificador` (`PLAN_APROBADO` / `CAMBIOS_REQUERIDOS`) y el código del `implementador` (`CODIGO_APROBADO` / `CODIGO_RECHAZADO`) buscando casos límite, fallos y omisiones con `sequential-thinking`, `context7` y `playwright`.
- **`implementador`** (`EnableWriteTools: true`, `EnableMCPTools: true`): Único subagente con permiso para crear/modificar código y ejecutar comandos siguiendo el plan aprobado y las revisiones, apoyado en `context7` y `playwright`.