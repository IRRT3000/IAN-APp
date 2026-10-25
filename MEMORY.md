# MEMORY.md — Fitness Tracker & Nutritional AI
Memoria viva del proyecto entre sesiones. Máximo ~50 líneas: resumir o eliminar lo obsoleto.

## Estado Actual
- Fase 1 completada: Registro de entrenamientos (`storage.js`), `HeatmapSemanal.jsx` y `MenuBienvenida.jsx`.
- Fase 2 completada: Ojo Nutricional Multimodal con Gemini (`src/services/gemini.js`), `src/components/NutricionView.jsx`, persistencia de comidas y barra inferior.
- Spec 005 commitada (heatmap tab + reactividad) con bugfixes (modal props, Gemini inlineData, LiveMode debounce, storage throws) y tests mínimos (Jest).
- Spec `001-borrar-registros` completada: Eliminación con botón `#FF5252` (`🗑 1s`), `delayLongPress={1000}`, pulso háptico y `Alert.alert`.
- Spec `002-analisis-cambio-fisico` completada: 4ta pestaña `💪 Físico`, filtro contra `gemini-3.8`, perfil configurable, 1–10 fotos, báscula circular, hora 12h y veredicto `0/10`.
- Spec `003-registro-entrenamientos-activo` completada: `SelectorSemanal.jsx` (7 días locales), inmutabilidad temporal, catálogo extendido (~45 ejercicios en 6 grupos), `LiveModeModal.jsx` (BackHandler dual, auto-save 350ms, botón `+`), consolidación híbrida.
- Spec `004-mapa-calor-anual` completada: Motor proporcional "Vaso de Agua" (0.0 a 1.0) con soporte de descanso (`@fitness_tracker_dias_descanso_v1`), fotos como insignia, selector `< [Año] >`, desglose interactivo emergente y celdas memoizadas.
- Spec `005-heatmap-tab-y-reactividad` completada (`specs/005-heatmap-tab-y-reactividad/{spec,plan,tasks}.md`): Reactividad inmediata de hábitos en `App.js` al agregar/eliminar comidas, entrenos o fotos; 5ª pestaña `🔥 Heatmap` en `BarraNavegacionInferior.jsx` con `HeatmapView.jsx` (12 meses, selector de año, leyenda y métricas anuales); widget mensual interactivo en `MenuBienvenida.jsx` (`MonthBlock` con celdas ampliadas 34x34 y `DaySummaryModal`).
- Sistema Multi-Agente (`.agents/agents/`) y Servidores MCP (`context7`, `sequential-thinking`, `playwright`) operativos.

## Decisiones Técnicas (y su justificación)
- Reactividad inmediata de hábitos (`App.js`): `manejarCambioComidas`, `manejarEntrenamientosActualizados` y `manejarCambioFisico` sincronizan concurrentemente `obtenerResumenAnualHabitos(anioHeatmap)` con `setResumenAnual`. El día actual se actualiza al instante sin requerir alternar descanso.
- 5ª Pestaña "Heatmap" y Widget Mensual (`HeatmapView.jsx`, `MenuBienvenida.jsx`): La vista anual completa reside en la 5ª pestaña para descongestionar el inicio; el inicio conserva el mes actual en un widget interactivo con celdas 34x34, día numerado y acceso directo a `DaySummaryModal`.
- Motor Vaso de Agua y Días de Descanso (`waterGlassEngine.js`, `storage.js`): Puntuación 0.0 a 1.0 dividida en 50% nutrición y 50% entreno/descanso; días de descanso persisten en `@fitness_tracker_dias_descanso_v1` sin penalización; fotos físicas computan como insignia visual sin degradar el score.
- Aritmética local y cuadrícula anual (`dateUtilsLocal.js`, `MonthBlock.jsx`, `HeatmapDayCell.jsx`): Celdas memoizadas con `React.memo`, alineación L-D con `(day + 6) % 7`, indexación $O(1)$ en `obtenerResumenAnualHabitos` y `ScrollView` ergonómico.
- Live Mode seguro y auto-save reactivo (`storage.js`, `LiveModeModal.jsx`): Intercepción dual `BackHandler` + `onRequestClose` con alerta destructiva; debounce de 350ms en inputs y guardado síncrono al agregar/quitar series; borrador en `@fitness_tracker_sesion_activa_draft_v1`.
- Consolidación híbrida y retrocompatibilidad (`EntrenamientosView.jsx`, `storage.js`): Guarda `seriesDetalle` y calcula `series`, `repeticiones`, `peso`, `pesoMaximo` y `volumenTotal`. Tarjetas adaptativas con soporte legacy.
- Inmutabilidad temporal y aritmética local pura: Fechas calculadas con `new Date(y, m, d - i)` y `obtenerFechaLocal()`. Prohibido `toISOString()`.
- Persistencia local inmutable sin Base64: Almacena URIs para prevenir `CursorWindow` overflow en Android.
- Haptics unificados (`src/services/haptics.js`): Pulsos hápticos para borrado, series, fotos y báscula con fallback a `Vibration.vibrate`.
- Failover en Gemini Vision (`src/services/gemini.js`): Principal `gemini-3-flash-preview`, respaldo `gemini-3.5-flash-lite`, timeout 60s con `AbortController`.
