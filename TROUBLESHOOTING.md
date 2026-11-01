# TROUBLESHOOTING.md — Bitácora de Incidencias Técnicas

> **Reglas**: Máximo ~50 líneas. Retener causa raíz y solución accionable. Prohibido almacenar claves/secretos.

### INC-001: Ausencia de Gemini API Key en APK Standalone (EAS/CI)
- **Causa Raíz:** `.env` ignorado en git; Metro no inyecta claves en builds remotos.
- **Solución:** Modelo BYOK con `apiKeyStorage.js` (`expo-secure-store`) y Drawer lateral de configuración en UI.

### INC-010: Exposición de Secretos en Bundles por Variables `EXPO_PUBLIC_*`
- **Causa Raíz:** Expo incrusta en el bundle de JavaScript toda variable `EXPO_PUBLIC_*` referenciada en código.
- **Solución:** BYOK con `expo-secure-store`, eliminación de fallbacks a variables públicas en `gemini.js` y barrera en `bundle-check.js`.

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
- **Causa Raíz:** `GestureHandlerRootView` con `absoluteFillObject` dentro de `Modal` rompía layout de flexión; dimensiones estáticas y sin insets seguros.
- **Solución:** `useSafeInsets` con pisos defensivos, `GestureHandlerRootView` con `flex: 1`, `useWindowDimensions()` y `KeyboardAvoidingView`.

### INC-007: Inoperancia de Botones dentro de Drawer en Android (RNGH Pan Gesture)
- **Causa Raíz:** `activeOffsetX([10, 500])` cancelaba toques en `ACTION_DOWN` (`translationX = 0 < 10`). Además faltaba `expo-clipboard`.
- **Solución:** Configurar `.activeOffsetX(25)`, `.cancelsTouchesInView(false)`, `TouchableOpacity` de RNGH e instalar `expo-clipboard`.

### INC-008: Pruebas de assets de imagen en Jest (Spec 014)
- **Causa Raíz:** `jest-expo` transforma `require` de imagen a `1`, comparar `require` no detecta un mapa cruzado.
- **Solución:** comparar ids y leer texto del mapa y cabecera con `fs` relativo a la raíz (sin `__dirname`/`process`).

### INC-009: Regla `react-hooks/set-state-in-effect` en Candados de Módulo
- **Causa Raíz:** `setAnalizando(true)` síncrono en `useEffect` dispara error fatal de cascading renders en ESLint React 19.
- **Solución:** Inicializar con lazy initializer `useState(() => Boolean(analisisEnCurso))` y reservar el efecto para suscripciones asíncronas (`finally`).
