# MEMORY.md — Fitness Tracker & Nutritional AI
Memoria viva del proyecto entre sesiones. Máximo ~50 líneas: resumir o eliminar lo obsoleto.

## Estado Actual
- Fase 1 completada: Registro de entrenamientos (`storage.js`), `HeatmapSemanal.jsx` y `MenuBienvenida.jsx`.
- Fase 2 completada: Ojo Nutricional Multimodal con Gemini (`src/services/gemini.js`), `src/components/NutricionView.jsx`, persistencia de comidas y barra inferior.
- Spec `001-borrar-registros` completada (`specs/001-borrar-registros/{spec,plan,tasks}.md`): Eliminación individual con botón `#FF5252` (`🗑 1s`), `delayLongPress={1000}`, doble pulso háptico y `Alert.alert`.
- Spec `002-analisis-cambio-fisico` completada (`specs/002-analisis-cambio-fisico/{spec,plan,tasks}.md`): 4ta pestaña `💪 Físico`, filtro contra `gemini-3.8`, cálculos $O(1)$ de edad y tiempo entrenando, perfil configurable, 1–10 fotos, báscula circular, hora 12h, veredicto `0/10` y comparativa bajo demanda con vibración en un toque.
- Spec `003-registro-entrenamientos-activo` completada (`specs/003-registro-entrenamientos-activo/{spec,plan,tasks}.md`): Rediseño completo del tracker con `SelectorSemanal.jsx` (7 días con aritmética local sin UTC), inmutabilidad temporal (banner solo lectura en días distintos a hoy), catálogo extendido (~45 ejercicios en 6 grupos musculares + personalizados sanitizados), `LiveModeModal.jsx` a pantalla completa (BackHandler dual + confirmación de descarte, auto-save debounce 350ms, autorrelleno rápido `+`), consolidación híbrida (`seriesDetalle`, `series`, `pesoMaximo`, `volumenTotal`), ocultamiento de barra inferior en Live Mode y borrado seguro 1s.
- Sistema Multi-Agente (`.agents/agents/`) y Servidores MCP (`context7`, `sequential-thinking`, `playwright`) operativos.

## Decisiones Técnicas (y su justificación)
- Live Mode seguro y auto-save reactivo (`storage.js`, `LiveModeModal.jsx`): Intercepción dual `BackHandler` + `onRequestClose` con alerta destructiva para evitar pérdidas involuntarias; debounce de 350ms en inputs y guardado síncrono al agregar/quitar series; borrador persistido en `@fitness_tracker_sesion_activa_draft_v1` para tolerar cierres de la app o bloqueos de pantalla.
- Consolidación híbrida y retrocompatibilidad (`EntrenamientosView.jsx`, `storage.js`): Guarda `seriesDetalle` y a la vez calcula `series`, `repeticiones`, `peso`, `pesoMaximo` y `volumenTotal` para mantener intactos `MenuBienvenida` y el selector. Tarjetas adaptativas muestran desglose detallado o métricas simples legacy si no existe `seriesDetalle`.
- Inmutabilidad temporal y aritmética local pura: Fechas calculadas con `new Date(y, m, d - i)` y `obtenerFechaLocal()`. Prohibido `toISOString()`. Recalculo dinámico a medianoche.
- Persistencia local inmutable sin Base64: CRUDs clonan arreglos/objetos inmutablemente; cambios físicos almacenan solo rutas URI para prevenir `CursorWindow` overflow en Android.
- Haptics unificados (`src/services/haptics.js`): `vibrarInicioPresionBorrado`, `vibrarConfirmacionBorrado`, `vibrarSerieAgregada`, `vibrarEjercicioCompletado`, `vibrarToqueComparacion` y `vibrarSeleccionBascula` con fallback a `Vibration.vibrate`.
- Failover en Gemini Vision (`src/services/gemini.js`): Principal `gemini-3-flash-preview`, respaldo `gemini-3.5-flash-lite`, timeout 60s con `AbortController`.
