# Spec 010: Onboarding de Bienvenida y Perfil Biométrico Dinámico ("Pasaporte Biométrico")

## 1. Visión y Justificación del Problema
Hasta la Spec 009, el perfil biológico del usuario (`PERFIL_USUARIO_BASE`) operaba con constantes estáticas fijas (`182 cm`, `74 kg`, `Hombre`, nacimiento `26/11/2010`, inicio de entrenamiento `01/11/2025`), permitiendo modificar únicamente el objetivo físico y el peso actual desde un chequeo fotográfico. Asimismo, el análisis bromatológico de comidas con Gemini Vision evaluaba los platillos de forma aislada, sin contexto sobre el peso, estatura, edad ni objetivo del usuario.

La **Spec 010** introduce una experiencia inmersiva de primer arranque (**Onboarding Cinemático de 4 Escenas — "Pasaporte Biométrico"**) bajo la estética **Monocromo Matte Luxury** (`#0A0A0A` / `#141414` / `#262626` / `#FFFFFF`), junto con un motor de perfil biométrico 100% dinámico y persistente en `AsyncStorage`, re-calibrable en cualquier momento desde el inicio, el panel lateral de ajustes o la vista de Cambio Físico, e integrado de extremo a extremo con los prompts multimodales de Gemini Vision (tanto en Nutrición como en Cambio Físico).

## 2. Requerimientos Funcionales (RF)
- **RF-1 (Detección de Primer Uso y Persistencia del Estado de Onboarding)**:
  - Al iniciar la aplicación, `App.js` debe verificar el campo booleano `onboardingCompletado` en `@fitness_tracker_perfil_v1`.
  - Si `onboardingCompletado === false` (tras resolverse la carga asíncrona inicial), debe desplegarse automáticamente el modal a pantalla completa `OnboardingBienvenidaModal`.
- **RF-2 (Flujo Coreografiado de Escenas en `OnboardingBienvenidaModal`)**:
  - **Escena 1 — Manifiesto & Identidad**: Bienvenida editorial de alto contraste, entrada de nombre o alias opcional (máx. 40 caracteres, sanitizado sin saltos de línea) y selección de sexo biológico para fórmulas metabólicas (`Hombre` / `Mujer`).
  - **Escena 2 — Biometría & Fecha de Nacimiento**: Ajuste interactivo con steppers táctiles (`>= 44x44pt`) y háptica para Estatura (`120` a `230 cm`), Peso inicial/base (`30.0` a `250.0 kg`) y Fecha de nacimiento local (`DD / MM / AAAA`) con cálculo en vivo de edad exacta.
  - **Escena 3 (`Paso 03 — Experiencia bajo la barra`)**: El usuario ingresa la fecha exacta de inicio de entrenamiento mediante un selector táctil de 3 columnas (`DÍA`, `MES`, `AÑO`) sin permitir fechas futuras mayores al día local de hoy, acompañado de un único botón rápido superior `"Empecé hoy (Usar fecha actual)"` y la tarjeta en vivo con el cálculo exacto en años, meses y días (`calcularTiempoEntrenando`).
  - **Escena de Objetivo Físico**: Selección mediante tarjetas táctiles de alto contraste entre `Mantenimiento`, `Volumen`, `Definición` y `Recomposición`.
  - **Escena de Conexión de Inteligencia Artificial (Gemini BYOK Opcional)**: Configuración y validación en vivo de la Gemini API Key con botón de pegado desde portapapeles (`expo-clipboard`), enlace a Google AI Studio y opción explícita de `"Omitir por ahora"` sin bloquear el cierre del onboarding.
- **RF-3 (Perfil Biométrico Dinámico e Inmutable en `storage.js`)**:
  - Ampliar `PERFIL_USUARIO_BASE` manteniendo sus valores actuales como fallback por defecto (`alturaCm: 182`, `pesoKgBase: 74`, `sexo: 'Hombre'`, `fechaNacimiento: '2010-11-26'`, `fechaInicioEntreno: '2025-11-01'`, `objetivo: 'Mantenimiento'`, `onboardingCompletado: false`).
  - Implementar `parsearFechaLocalYYYYMMDD`, `calcularEdadExacta`, `calcularTiempoEntrenando`, `calcularFechaInicioDesdeAntiguedad`, `cargarPerfilUsuario` y `guardarPerfilCompletoUsuario` respetando inmutabilidad estricta y fechas locales `YYYY-MM-DD`.
- **RF-4 (Integración del Perfil Biométrico en Análisis Nutricional con Gemini)**:
  - Inyectar el bloque `PERFIL BIOMÉTRICO Y OBJETIVO DEL USUARIO` en `analizarComidaConGemini` / `construirPromptAltaPrecision`, solicitando en el campo `"detalles"` del JSON una evaluación concisa (1 a 2 oraciones) sobre cómo encaja el platillo con el perfil y objetivo actual del usuario.
  - Mostrar en `NutricionView.jsx` una insignia de calibración biométrica IA y renderizar `"detalles"` en cada tarjeta de comida registrada.
- **RF-5 (Eliminación de Valores Hardcodeados en Cambio Físico y Comparativas IA)**:
  - Actualizar `CambioFisicoView.jsx` y `src/services/gemini.js` (`construirPromptCambioFisico` y `construirPromptComparacionFisica`) para consumir dinámicamente `sexo`, `alturaCm`, `alturaMetros`, `pesoKgBase`, `fechaNacimiento` y `fechaInicioEntreno` desde el perfil activo del usuario.
- **RF-6 (Re-calibración del Pasaporte Biométrico en Cualquier Momento)**:
  - Permitir abrir `OnboardingBienvenidaModal` en `modoEdicion = true` desde:
    1. La píldora interactiva del Pasaporte Biométrico en `MenuBienvenida.jsx`.
    2. La tarjeta `"PASAPORTE BIOMÉTRICO"` en `PanelConfiguracionLateral.jsx`.
    3. El botón `"Editar Perfil"` en la tarjeta biométrica de `CambioFisicoView.jsx`.
- **RF-7 (Saludo Personalizado y Resumen Biométrico en Dashboard de Inicio)**:
  - Si `perfilUsuario.nombre` tiene contenido, mostrar `"Hola, [Nombre]"` en el encabezado hero de `MenuBienvenida.jsx`; de lo contrario conservar `"Fitness Tracker"`.
- **RF-8 (Ergonomía Mobile-First, Safe Areas y Cero Emojis)**:
  - Uso exclusivo de `@expo/vector-icons` (`Feather`), `useSafeInsets()`, botones primarios en la Thumb-Zone inferior y touch targets `>= 44x44pt`.

## 3. Casos Límite y Defensas (Revisión Crítica)
- **Defensa 1 (Cero dependencias nuevas)**: Toda la coreografía se construye con `react-native-reanimated` y `react-native-gesture-handler` ya instalados.
- **Defensa 2 (Validación de fechas bisiestas y días por mes)**: `parsearFechaLocalYYYYMMDD` valida con `new Date(anio, mes, 0).getDate()` sin usar `new Date("YYYY-MM-DD")` ni `toISOString()`.
- **Defensa 3 (Fechas futuras de inicio de entreno o nacimiento)**: Si `mesesTotales < 0` o `0 meses y 0 días`, `calcularTiempoEntrenando` retorna `'Recién iniciado'`. `calcularEdadExacta` acota `Math.max(0, anios)`.
- **Defensa 4 (Sanitización e inmutabilidad del perfil)**: `alturaCm` acotada a `[120, 230]`, `pesoKgBase` y `pesoKgActual` acotados a `[30, 250]`, `nombre` limpio de saltos de línea y truncado a 40 caracteres.
- **Defensa 5 (Reactividad de `useMemo` en `CambioFisicoView`)**: `edadInfo` y `tiempoEntrenoInfo` dependen de `[perfilActivo?.fechaNacimiento]` y `[perfilActivo?.fechaInicioEntreno]`.
- **Defensa 6 (Retrocompatibilidad de `analizarComidaConGemini`)**: Si no recibe `opciones.perfilUsuario`, carga automáticamente el perfil con `await cargarPerfilUsuario()`.
- **Defensa 7 (Prevención de Flash del Modal de Onboarding)**: `onboardingVisible` inicia en `false` y solo se activa tras completar `cargarPerfilUsuario()` si `!perfilCargado.onboardingCompletado`.
- **Defensa 9 (Transición limpia entre Drawer de Configuración y Modal de Onboarding)**: Cerrar primero `panelConfiguracionVisible` y abrir `onboardingVisible` tras `180ms` para evitar colisión de dos `<Modal>` simultáneos en iOS/Android.

## 4. Criterios de Aceptación (CA)
- **CA-1**: En una instalación limpia (`onboardingCompletado: false`), el modal de bienvenida se despliega automáticamente tras cargar `AsyncStorage` sin parpadeos.
- **CA-2**: Al completar el onboarding, `onboardingCompletado` pasa a `true` en `AsyncStorage` y no vuelve a mostrarse automáticamente en futuros arranques.
- **CA-3**: Todos los cambios de nombre, sexo, estatura, peso base, fecha de nacimiento, antigüedad de entreno y objetivo se reflejan instantáneamente en `MenuBienvenida`, `CambioFisicoView`, `NutricionView` y `PanelConfiguracionLateral`.
- **CA-4**: El paso de API Key permite tanto validar y guardar una clave como omitir el paso (`"Omitir por ahora"`).
- **CA-5**: El análisis nutricional con Gemini incluye el contexto biométrico del usuario y muestra la evaluación personalizada en `"detalles"` dentro de cada tarjeta de comida.
- **CA-6**: El análisis de cambio físico y la comparativa contra el registro anterior emplean los valores reales del perfil en lugar de constantes fijas.
- **CA-7**: Cero emojis en código y prompts visibles; 100% iconos `Feather` y estética Monocromo Matte Luxury.
