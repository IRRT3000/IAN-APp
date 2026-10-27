# Spec 009: Adaptación Ergonómica Mobile-First (iOS & Android), Safe Areas, Thumb-Zone & Fix del Drawer de Configuración

## 1. Visión y Justificación del Problema
Tras la implementación del rediseño monocromo matte luxury y el panel lateral de configuración BYOK, se detectaron fallos críticos de usabilidad ergonómica y visual en dispositivos móviles reales (iOS con Dynamic Island/Home Indicator y Android con barra de estado translúcida y navegación por gestos):
1. **Drawer de Ajustes Bloqueado**: El drawer (`PanelConfiguracionLateral`) se renderizaba fuera de los límites de la pantalla debido a `StyleSheet.absoluteFillObject` en `GestureHandlerRootView` y cálculos estáticos de dimensiones. Además, en teléfonos pequeños o con el teclado desplegado, los botones quedaban inaccesibles.
2. **Ergonomía Live Mode Deficiente**: El botón de guardado estaba ubicado en la esquina superior derecha (`check`), fuera de la zona natural del pulgar (Thumb-Zone) y colisionando visualmente con muescas o la Dynamic Island.
3. **Inconsistencias de Safe Area**: Ausencia de `react-native-safe-area-context` nativo instalado vía Expo CLI, lo que provocaba solapamientos de cabeceras y barras de navegación inferiores.
4. **Touch Targets Subóptimos**: Botones de iconos, botones de incremento y cierres de modal con áreas táctiles menores a 44x44pt (Apple HIG / Material Design).

## 2. Requerimientos Funcionales (RF)
- **RF-1 (Safe Areas Multiplataforma)**: Envolver la aplicación en `SafeAreaProvider` e implementar un hook defensivo `useSafeInsets` que garantice pisos mínimos contra Dynamic Island, barras de estado y gestos.
- **RF-2 (Fix del Drawer de Ajustes)**: Desplegar el drawer con `width` responsivo (`useWindowDimensions`), `height: windowHeight`, `KeyboardAvoidingView`, `ScrollView` con `keyboardShouldPersistTaps="handled"` y touch targets accesibles (`minWidth: 40`, `hitSlop`).
- **RF-3 (Live Mode Mobile-First & Thumb-Zone)**: Cabecera limpia con descarte a la izquierda y badge centrado. Barra fija inferior con `+ Agregar Serie` y botón primario de 54dp `"Terminar y Guardar Ejercicio"`. Ocultamiento dinámico al abrir teclado con barra de descarte rápido.
- **RF-4 (Validación Visual de Series)**: Resaltar en rojo brillante (`TOKENS.colors.danger`) las celdas incompletas y disparar feedback háptico.
- **RF-5 (Catálogo & Modales Ergonomizados)**: Soporte completo de `statusBarTranslucent`, botón visible `+ Crear` en cabecera y touch targets >= 44pt en `CambioFisicoView` y `DaySummaryModal`.
