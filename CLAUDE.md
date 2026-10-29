@AGENTS.md

## Claude Code en este proyecto
- Rol por defecto: planificar (`planificador`) y revisar (`revisor-critico`). La implementación y el diseño los hace Antigravity.
- Si Antigravity no está disponible (sin tokens), asumes también `implementador`, `subagente-ui` y `subagente-motion`; están en `.claude/agents/` y apuntan a `.agents/agents/`.
- Ahorro de tokens: el plan lo escribe la sesión principal (sin lanzar `planificador`). Revisión de plan: `revisor-critico` con `model: sonnet`, 1 ronda; re-revisión solo si hubo `BLOQUEANTE`. Revisión de código: `revisor-critico` en el modelo heredado (Opus), completa. Chat en estilo breve; `specs/` siempre en prosa clara.
- Las skills del proyecto están en `.agents/skills/<nombre>/SKILL.md`; léelas por ruta cuando apliquen.
