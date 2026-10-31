# TROUBLESHOOTING.md — Bitácora de Incidencias Técnicas

> **Reglas**: Máximo ~50 líneas. Retener causa raíz y solución accionable. Prohibido almacenar claves/secretos.

### INC-001: Ausencia de Gemini API Key en APK Standalone (EAS/CI)
- **Causa Raíz:** `.env` ignorado en git; Metro no inyecta claves en builds remotos.
- **Solución:** Modelo BYOK con `apiKeyStorage.js` (`AsyncStorage`) y Drawer lateral de configuración en UI.

### INC-002: Bloqueo de Herramientas por Hook de Telemetría en Windows (`PreToolUse`)
- **Causa Raíz:** Concatenación con comillas dobles en plugin de telemetría de Cloud en Windows.
- **Solución:** Eliminar carpeta `C:\Users\ianra\.gemini\config\plugins\googlecloudtools.datacloud_telemetry`.

### INC-003: Fallo en GitHub Actions Runner (`setup-android@v3`) al compilar APK
- **Causa Raíz:** `ubuntu-latest` ya incluye Android SDK; `setup-android@v3` intentó reinstalarlo provocando colisión.
- **Solución:** Usar `gradle/actions/setup-gradle@v4` con JDK 17 y compilar con `./gradlew assembleRelease`.

### INC-004: Permisos Nativos de Cámara y Galería en Android 13/14+ (`app.json`)
- **Causa Raíz:** `expo-image-picker` faltaba en el arreglo `plugins` de `app.json`.
- **Solución:** Declarar `expo-image-picker` en `plugins` de `app.json` con `photosPermission` y `cameraPermission`.

### INC-005: Botón de Engrane Inoperante en APK Android (Hit-testing & Modal)
- **Causa Raíz:** `Animated.View` exterior rotaba el contenedor provocando `ACTION_CANCEL` en `ScrollView`.
- **Solución:** Invertir jerarquía (`TouchableOpacity` estático exterior con `hitSlop: 12` + `Animated.View` interior).

### INC-006: Desbordamiento de Drawer y Colisión con Safe Areas / Teclado
- **Causa Raíz:** `GestureHandlerRootView` con `absoluteFillObject` dentro de `Modal` rompía layout de flexión; dimensiones estáticas con `Dimensions.get('window')` y ausencia de `react-native-safe-area-context`.
- **Solución:** `useSafeInsets` con pisos defensivos, `GestureHandlerRootView` con `flex: 1`, `useWindowDimensions()`, `KeyboardAvoidingView` y botones adaptados a Thumb-Zone.

### INC-007: Inoperancia de Botones dentro de Drawer en Android (RNGH Pan Gesture)
- **Causa Raíz:** `activeOffsetX([10, 500])` causaba que en `ACTION_DOWN` (`translationX = 0 < 10`) el handler Pan se activara de inmediato cancelando toques hijos (`ACTION_CANCEL`). Además faltaba `expo-clipboard`.
- **Solución:** Configurar `.activeOffsetX(25)` (escalar positivo), `.cancelsTouchesInView(false)`, migrar a `TouchableOpacity` de RNGH, `elevation: 24` e instalar `expo-clipboard`.

### INC-008: Pruebas de assets de imagen en Jest (Spec 014)
- **Causa Raíz:** `jest-expo` transforma cualquier `require` de imagen (PNG, WebP) a `1`, así que comparar los valores de `require` no detecta un mapa cruzado.
- **Solución:** comparar ids y leer el texto del mapa y la cabecera de los archivos con `fs` y rutas relativas a la raíz (sin `__dirname` ni `process`, por `no-undef`). Los assets de terceros (RepDB) solo se pueden redimensionar: nada de quitar el fondo ni pasarlos por IA.
