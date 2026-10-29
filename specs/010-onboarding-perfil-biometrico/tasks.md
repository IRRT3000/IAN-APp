# Tareas de Implementación — Spec 010: Onboarding de Bienvenida y Perfil Biométrico Dinámico

- [x] **T1**: Crear documentación de especificación y arquitectura en `specs/010-onboarding-perfil-biometrico/` (`spec.md`, `plan.md`, `tasks.md`).
- [x] **T2**: Actualizar `src/services/storage.js` con `SEXOS_PERFIL_VALIDOS`, `PERFIL_USUARIO_BASE` ampliado, `parsearFechaLocalYYYYMMDD`, `calcularEdadExacta` dinámico, `calcularTiempoEntrenando` dinámico, `calcularFechaInicioDesdeAntiguedad`, `cargarPerfilUsuario` sanitizado y `guardarPerfilCompletoUsuario` inmutable.
- [x] **T3**: Actualizar `src/services/gemini.js` para inyectar el perfil biométrico y objetivo del usuario en `analizarComidaConGemini` (incluyendo evaluación en `"detalles"`), `construirPromptCambioFisico` y `compararCambioFisicoConGemini`.
- [x] **T4**: Crear `src/components/OnboardingBienvenidaModal.jsx` con las 4 escenas coreografiadas (Identidad, Biometría, Objetivo Físico y Gemini API Key BYOK) y soporte para `modoEdicion`.
- [x] **T5**: Integrar `OnboardingBienvenidaModal` en `App.js` con prevención de flash inicial, soporte `BackHandler` y transición limpia desde el drawer lateral.
- [x] **T6**: Actualizar `src/components/MenuBienvenida.jsx` con saludo personalizado y píldora interactiva del Pasaporte Biométrico.
- [x] **T7**: Actualizar `src/components/CambioFisicoView.jsx` para eliminar valores fijos de `PERFIL_USUARIO_BASE`, recalcular edad y antigüedad reactivamente y añadir botón de edición de perfil.
- [x] **T8**: Actualizar `src/components/NutricionView.jsx` para pasar `perfilUsuario` a Gemini, mostrar insignia de calibración biométrica IA y renderizar `"detalles"` en las tarjetas de comida.
- [x] **T9**: Actualizar `src/components/PanelConfiguracionLateral.jsx` con la tarjeta `"PASAPORTE BIOMÉTRICO"` y botón `"Re-calibrar Pasaporte Biométrico"` usando `TouchableOpacity` de `react-native-gesture-handler`.
- [x] **T10**: Actualizar `MEMORY.md` con el resumen de la Spec 010 respetando el límite de ~50 líneas.
