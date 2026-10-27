# Plan de Implementación: Spec 009 - Adaptación Ergonómica Mobile-First

## Arquitectura y Estrategia de Solución

### Fase 1: Dependencias Nativas & Core Insets
- Instalar `react-native-safe-area-context` mediante `npx expo install` para compatibilidad nativa con Expo SDK 58.
- Crear `src/utils/useSafeInsets.js` encapsulando la lectura de insets con fallback y pisos mínimos de protección:
  - Top: `Math.max(insets.top, Platform.OS === 'android' ? (StatusBar.currentHeight || 28) : (insets.top > 0 ? insets.top : 20))`
  - Bottom: `Math.max(insets.bottom, Platform.OS === 'android' ? 12 : 20)`
  - Header padding top: `top + 10`
  - Bottom clearance: `bottom + 70`
- Agregar tokens de accesibilidad táctil y clearance en `src/theme/tokens.js`.

### Fase 2: Corrección del Drawer Lateral
- Reemplazar `Dimensions.get('window')` por `useWindowDimensions()`.
- Ajustar `GestureHandlerRootView` a `style={{ flex: 1 }}`.
- Incorporar `KeyboardAvoidingView` y `ScrollView` con `keyboardShouldPersistTaps="handled"`.
- Asignar hitSlop y dimensiones mínimas a los botones de revelado y copiado de API Key.

### Fase 3: Rediseño Ergonómico de Live Mode
- Modal `statusBarTranslucent`.
- Remover botón de check superior.
- Mover CTA primario y secundario a una barra fija en la parte inferior (Thumb-Zone).
- Implementar listeners de teclado (`keyboardDidShow`/`keyboardDidHide`) para ocultar la barra y mostrar un botón de descarte rápido de teclado.
- Añadir validación visual con resaltado rojo en celdas incompletas y vibración de rechazo/éxito.

### Fase 4: Catálogo, App y Touch Targets
- Envolver `App.js` en `SafeAreaProvider`.
- Actualizar `BarraNavegacionInferior` con posicionamiento responsivo en `bottom: Math.max(insets.bottom, 12)`.
- Modales de `CatalogoEjerciciosModal`, `CambioFisicoView` y `DaySummaryModal` actualizados con `statusBarTranslucent`, `ScrollView` y touch targets ampliados (>= 44x44pt).
