---
name: equipo-agentes
description: >-
  Activa y coordina el equipo de 4 agentes especializados del proyecto (`orquestador`, `planificador`, `revisor-critico` e `implementador`). Úsalo cuando el usuario pida desarrollar una funcionalidad, resolver un problema complejo o trabajar con el equipo de subagentes y el orquestador.
---

# Equipo Multi-Agente con Orquestador (`equipo-agentes`)

Esta skill define y pone en marcha la arquitectura de **1 Agente Orquestador + 3 Subagentes Especializados** con separación estricta de permisos.

## Arquitectura y Permisos de los 4 Agentes

| Agente | Archivo de Definición | `EnableWriteTools` | `EnableSubagentTools` | `EnableMCPTools` | Responsabilidad Exclusiva |
| :--- | :--- | :---: | :---: | :---: | :--- |
| **`orquestador`** | [`.agents/agents/orquestador.md`](../../agents/orquestador.md) | `false` | `true` | `false` | Coordina qué agente entra en acción y transmite mensajes entre ellos. **Sin acceso a código, planificación ni MCPs.** |
| **`planificador`** | [`.agents/agents/planificador.md`](../../agents/planificador.md) | `false` | `false` | `true` | Analiza el contexto en solo lectura y redacta el plan técnico detallado apoyándose en `context7` y `sequential-thinking`. |
| **`revisor-critico`** | [`.agents/agents/revisor-critico.md`](../../agents/revisor-critico.md) | `false` | `false` | `true` | Audita el plan y el código buscando casos límite con `sequential-thinking`, `context7` y `playwright`. |
| **`implementador`** | [`.agents/agents/implementador.md`](../../agents/implementador.md) | `true` | `false` | `true` | **Único agente con acceso a modificar código y ejecutar comandos**, con soporte de `context7` y `playwright`. |

---

## Procedimiento de Activación (Paso a Paso)

### Paso 1: Registrar los 4 agentes en la sesión actual
Si aún no se han definido en la conversación actual (o si `implementador` fue cargado desde archivo sin permisos de escritura en runtime), define al ejecutor mediante `define_subagent` con `EnableWriteTools: true` y `EnableMCPTools: true` (ej. `implementador-ejecutor`) y pasa los `conversationId` de los 3 subagentes al `orquestador`:

1. **`planificador`**: `EnableWriteTools: false`, `EnableSubagentTools: false`, `EnableMCPTools: true`
2. **`revisor-critico`**: `EnableWriteTools: false`, `EnableSubagentTools: false`, `EnableMCPTools: true`
3. **`implementador` / `implementador-ejecutor`**: `EnableWriteTools: true`, `EnableSubagentTools: false`, `EnableMCPTools: true`
4. **`orquestador`**: `EnableWriteTools: false`, `EnableSubagentTools: true`, `EnableMCPTools: false`

### Paso 2: Iniciar el flujo a través del `orquestador`
Invoca al `orquestador` mediante `invoke_subagent`:
- `TypeName`: `"orquestador"`
- `Role`: `"Director de Orquestación Multi-Agente"`
- `Prompt`: Pásale el requerimiento del usuario e indícale que ejecute el ciclo completo de 5 fases:
  1. `orquestador` → `planificador` (Generación del plan detallado).
  2. `orquestador` → `revisor-critico` (Auditoría del plan y casos límite; bucle con `planificador` si hay `CAMBIOS_REQUERIDOS` hasta lograr `PLAN_APROBADO`).
  3. `orquestador` → `implementador` (Ejecución del código con el `PLAN_APROBADO` y lista de casos límite).
  4. `orquestador` → `revisor-critico` (Auditoría del código real escrito por `implementador`; bucle con `implementador` si hay `CODIGO_RECHAZADO` hasta lograr `CODIGO_APROBADO`).
  5. Entrega del reporte final consolidado.
