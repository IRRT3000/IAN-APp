# Especificación 008: Panel Lateral de Configuración & Conector Universal de Gemini API Key

## 1. Visión y Objetivos
Proporcionar al usuario un control total y autónomo de sus credenciales de Inteligencia Artificial (Gemini) en la aplicación móvil mediante un **Panel Lateral de Configuración (Drawer)** de alta gama estética, accesible desde la pantalla principal de Inicio a través de un **botón con icono de engranaje interactivo**.

Esta especificación erradica la dependencia de secretos quemados en el binario APK (modelo **Bring Your Own Key - BYOK**), garantizando que las versiones descargables desde GitHub o tiendas sean 100% seguras, reutilizables e inmunes a revocaciones de claves globales.

---

## 2. Decisiones de Diseño (Derivadas del Grill-Me)

1. **Ubicación del Disparador**: Exclusivamente en la esquina superior derecha del bloque editorial de la pantalla principal de **Inicio / Bienvenida** (`MenuBienvenida.jsx`), evitando clutter visual en las pantallas de Nutrición, Entrenamientos, Físico y Heatmap.
2. **Micro-interacción del Engranaje**: Animación táctil de compresión y micro-rotación en UI Thread con `react-native-reanimated` (`scale: 0.90`, rotación `15deg`) acompañada de pulso háptico causal sincronizado (`haptics.js`).
3. **Mecanismos de Cierre del Drawer (Soporte Cuádruple)**:
   - Toque en el fondo oscuro exterior (Backdrop).
   - Gesto de arrastre (*swipe*) hacia la derecha con físicas de descarte.
   - Botón físico / gestual de retorno de Android (`BackHandler`).
   - Botón superior derecho con icono de cruz (`Feather` `'x'`).
4. **Seguridad del Input**:
   - Visualización por defecto oculta con caracteres tipo contraseña (`••••••••`).
   - Botón de alternar visibilidad con icono de ojo (`Feather` `'eye'` / `'eye-off'`).
   - Botón de acceso rápido para "Pegar" desde el portapapeles.
5. **Validación Previa en Tiempo Real**: Botón de **"Probar y Guardar Clave"** que realiza un testeo ultraligero contra la API de Gemini antes de persistir, certificando que la clave es válida y tiene cuota activa.

---

## 3. Reglas Críticas del Sistema
1. **INMUTABILIDAD DE DATOS PREVIOS**: Prohibido alterar o resetear las claves existentes de `AsyncStorage` (`@fitness_tracker_entrenamientos_v1`, `@fitness_tracker_comidas_v1`, etc.).
2. **CERO EMOJIS**: Toda la iconografía del panel y sus notificaciones se construye exclusivamente con `@expo/vector-icons` (`Feather`).
3. **PALETA MATTE LUXURY**:
   - Fondo del Drawer: Carbón mate `#141414`.
   - Divisores y bordes: Hairline de 1px `#262626`.
   - Textos: `#FFFFFF` (títulos), `#8E8E93` (secundarios) y `#00E676` (éxito/activo).
4. **FÍSICAS EN UI THREAD**: Todas las transiciones del Drawer y del engranaje corren en el hilo nativo de interfaz a 60fps con `react-native-reanimated`.

---

## 4. Requerimientos Funcionales

### RF-1: Icono de Engranaje Interactivo (`MenuBienvenida.jsx`)
- Se añade en la cabecera editorial (`filaInsigniaFecha`), alineado a la derecha.
- Área táctil accesible mínima de 44x44pt.
- Micro-animación con físicas de resorte en UI Thread (`withSpring({ damping: 15, stiffness: 200 })`).
- Emisión de pulso háptico suave al presionar (`vibrarInicioPresionBorrado()`).

### RF-2: Panel Lateral Desplegable (`PanelConfiguracionLateral.jsx`)
- Despliegue desde el borde derecho ocupando el 85% del ancho de pantalla (`maxWidth: 380`).
- Animación de entrada fluida con resorte amortiguado (`translateX` desde `ANCHO_PANEL` hacia `0`).
- Backdrop con atenuación progresiva de opacidad (`0` a `0.72`).
- Soporte para los 4 métodos de cierre simultáneos con restitución fluida.

### RF-3: Conector Universal y Validación de Clave (`src/services/gemini.js` y `apiKeyStorage.js`)
- Persistencia aislada en `@fitness_tracker_gemini_api_key`.
- Función `validarApiKeyGemini(clave)`: Petición ligera de comprobación con timeout de 8 segundos.
- Función `obtenerApiKeyActiva()`:
  1. Prioridad 1: Clave en `AsyncStorage`.
  2. Prioridad 2: Variable de entorno `EXPO_PUBLIC_GEMINI_API_KEY`.
  3. Si ambas faltan: `GeminiError` informativo que guía al usuario a abrir el panel lateral.
- Conexión universal: Todas las funciones (`analizarComidaConGemini`, `analizarCambioFisicoConGemini`, `compararCambioFisicoConGemini`) consumen esta clave centralizada.

### RF-4: Interfaz de Gestión de Clave dentro del Drawer
- Indicador visual de estado de conexión:
  - 🟢 Conectada (con opción de probarla de nuevo o eliminarla).
  - 🔴 No configurada (invitación a conectar).
- Input con modo seguro (`secureTextEntry`) y botón de alternar visibilidad.
- Botón directo "Obtener clave gratis en Google AI Studio" que abre `https://aistudio.google.com/app/apikey` en el navegador del dispositivo.

### RF-5: Preparación de Compilación en `app.json`
- Registro del config plugin `expo-image-picker` en `app.json` con los mensajes de permiso para cámara y galería requeridos por Android 13/14+.
