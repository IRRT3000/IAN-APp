# Tareas de Ejecución: Spec 009

- [x] **Tarea 1: Instalación de Dependencias Nativas**
  - Ejecutar `npx expo install react-native-safe-area-context`.
  - Validar compatibilidad de SDK.

- [x] **Tarea 2: Tokens y Hook de Insets**
  - Crear `src/utils/useSafeInsets.js` con pisos mínimos para Android e iOS.
  - Extender `src/theme/tokens.js` con `touchTarget` y `safeArea`.

- [x] **Tarea 3: Fix Crítico del Drawer de Configuración**
  - Cambiar `GestureHandlerRootView` a `style={{ flex: 1 }}`.
  - Implementar `useWindowDimensions()` reactivo.
  - Envolver en `KeyboardAvoidingView` y `ScrollView` con `keyboardShouldPersistTaps="handled"`.
  - Ampliar botones de input de API Key (`eye` y `clipboard`).

- [x] **Tarea 4: Rediseño Ergonómico de Live Mode**
  - Cabecera con descarte a la izquierda y badge centrado.
  - Barra inferior en Thumb-Zone (`stickyFooterThumbZone`).
  - Listeners de teclado para alternar entre barra de guardado y barra de descarte rápido.
  - Validación de celdas incompletas con borde rojo y alertas hápticas.

- [x] **Tarea 5: App, Barra de Navegación y Modales**
  - Envolver `App.js` con `<SafeAreaProvider>`.
  - Actualizar `BarraNavegacionInferior` con `insets.bottom`.
  - Añadir botón píldora `+ Crear` en `CatalogoEjerciciosModal` y soporte de creación rápida en estado vacío.
  - Ampliar touch targets en `CambioFisicoView` y `DaySummaryModal`.

- [x] **Tarea 6: Verificación y Pruebas**
  - Validación con `npx expo export --platform android`.
  - Actualización de `MEMORY.md` y `TROUBLESHOOTING.md`.
