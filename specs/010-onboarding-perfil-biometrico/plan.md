# Plan Técnico — Spec 010: Onboarding de Bienvenida y Perfil Biométrico Dinámico

## 1. Arquitectura de Persistencia (`src/services/storage.js`)
- **Clave en `AsyncStorage`**: `@fitness_tracker_perfil_v1` (mantiene retrocompatibilidad con versiones previas).
- **Esquema Extendido `PERFIL_USUARIO_BASE`**:
  ```js
  export const PERFIL_USUARIO_BASE = {
    nombre: '',
    alturaCm: 182,
    alturaMetros: 1.82,
    pesoKgBase: 74,
    pesoKgActual: 74,
    sexo: 'Hombre',
    fechaNacimiento: '2010-11-26',
    fechaInicioEntreno: '2025-11-01',
    objetivo: 'Mantenimiento',
    onboardingCompletado: false,
    actualizadoEn: null,
  };
  ```
- **Funciones Puras y Sanitizadas**:
  - `parsearFechaLocalYYYYMMDD(fechaISO, fallbackISO)`: Parser aritmético local con regex `/^(\d{4})-(\d{2})-(\d{2})$/` y verificación del máximo de días del mes con `new Date(anio, mes, 0).getDate()`.
  - `calcularEdadExacta(fechaReferencia, fechaNacimientoISO)`: Calcula la edad exacta en años a partir de `fechaNacimientoISO`.
  - `calcularTiempoEntrenando(fechaReferencia, fechaInicioISO)`: Calcula años, meses y días entrenando, devolviendo `'Recién iniciado'` si la fecha es hoy o futura.
  - `calcularFechaInicioDesdeAntiguedad({ anios, meses }, fechaReferencia)`: Convierte años y meses de experiencia en una fecha local `YYYY-MM-DD`.
  - `cargarPerfilUsuario()`: Fusiona de forma inmutable los datos guardados con `PERFIL_USUARIO_BASE`, garantizando rangos seguros (`alturaCm` en `[120, 230]`, `pesoKgBase` y `pesoKgActual` en `[30, 250]`).
  - `guardarPerfilCompletoUsuario(datosPerfil)`: Persiste de forma inmutable el perfil completo, sincroniza `pesoKgActual` durante el primer onboarding o cuando corresponde en edición, y marca `onboardingCompletado: true`.

## 2. Integración Multimodal con Gemini (`src/services/gemini.js`)
- **Análisis Bromatológico Contextualizado (`construirPromptAltaPrecision` / `analizarComidaConGemini`)**:
  - Obtiene el perfil activo (`opciones?.perfilUsuario || await cargarPerfilUsuario()`).
  - Inyecta en el prompt el bloque `PERFIL BIOMÉTRICO Y OBJETIVO DEL USUARIO` (sexo, edad exacta, estatura, peso actual, experiencia entrenando y objetivo).
  - Solicita el campo `"detalles"` en el JSON de respuesta con una evaluación concisa (1–2 oraciones) adaptada al objetivo del usuario.
- **Análisis de Cambio Físico y Comparativa (`construirPromptCambioFisico` / `construirPromptComparacionFisica`)**:
  - Reemplaza toda referencia estática a `74.0 kg` o `182 cm` por los datos dinámicos del perfil del usuario.

## 3. Coreografía y Flujo de Pantallas
- **`src/components/OnboardingBienvenidaModal.jsx`**:
  - Modal de 4 escenas con barra superior de progreso animada con `react-native-reanimated`, transiciones suaves entre pasos, detección de teclado para proteger la Thumb-Zone y modo dual (`modoEdicion = false` en primer uso vs `modoEdicion = true` al re-calibrar).
- **`App.js`**:
  - Coordina `onboardingVisible` y `modoEdicionPerfil`, intercepta `BackHandler` en Android y expone `abrirEdicionPerfil` con transición limpia desde `PanelConfiguracionLateral`.
- **Vistas Conectadas**:
  - `MenuBienvenida.jsx`: Saludo dinámico `"Hola, ${nombre}"` y píldora de resumen del Pasaporte Biométrico.
  - `CambioFisicoView.jsx`: Tarjeta biométrica reactiva al perfil y botón `"Editar Perfil"`.
  - `NutricionView.jsx`: Insignia de calibración biométrica IA y visualización de `"detalles"` en cada comida.
  - `PanelConfiguracionLateral.jsx`: Tarjeta `"PASAPORTE BIOMÉTRICO"` con botón `"Re-calibrar Pasaporte Biométrico"` usando `TouchableOpacity` de `react-native-gesture-handler` (`INC-007`).
