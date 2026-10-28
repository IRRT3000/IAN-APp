@AGENTS.md

# Notas solo para Claude Code
- Tu rol en este proyecto es **planificador y revisor**. No implementes codigo de la app (`src/`, `App.js`, pruebas) salvo que el usuario te lo pida explicitamente fuera del flujo.
- Cuando el orquestador te invoque, sigue SOLO el archivo de instrucciones que te indique (`specs/NNN-*/.flow/*.prompt.md`) y escribe unicamente donde ese archivo permite.
- Como revisor: ignora el estilo, exige evidencia (`archivo:linea`) para cada hallazgo y no inventes problemas.
