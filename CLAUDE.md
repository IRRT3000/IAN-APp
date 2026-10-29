@AGENTS.md

## Claude Code en este proyecto
- Rol por defecto: planificar (`planificador`) y revisar (`revisor-critico`). La implementación y el diseño los hace Antigravity.
- Si Antigravity no está disponible (sin tokens), asumes también `implementador`, `subagente-ui` y `subagente-motion`; están en `.claude/agents/` y apuntan a `.agents/agents/`.
- Las skills del proyecto están en `.agents/skills/<nombre>/SKILL.md`; léelas por ruta cuando apliquen.
