# TROUBLESHOOTING.md — Bitácora de Incidencias Técnicas

> **Reglas**: Máximo ~50 líneas. Al finalizar cada spec o fallo relevante, evaluar si se agrega. Eliminar lo obsoleto y retener solo la causa raíz y solución accionable. Prohibido almacenar claves/secretos.

### INC-001: Ausencia de Gemini API Key en APK Standalone (EAS/CI)
- **Síntoma:** Alerta de clave faltante en APK standalone instalada en celular.
- **Causa Raíz:** `.env` está en `.gitignore` y Metro no inyecta claves en builds remotos; quemar claves en binario público es inseguro.
- **Solución:** Modelo BYOK con `apiKeyStorage.js` (`AsyncStorage`), Drawer lateral de configuración en UI y fallback seguro.

### INC-002: Bloqueo de Herramientas por Hook de Telemetría en Windows (`PreToolUse`)
- **Síntoma:** Toda llamada a herramientas falla con `Cannot find module ... telemetry_hook_bundle.js`.
- **Causa Raíz:** Ruta concatenada con comillas dobles inválidas en plugin de telemetría de Cloud en Windows.
- **Solución:** Eliminar carpeta `C:\Users\ianra\.gemini\config\plugins\googlecloudtools.datacloud_telemetry`.

### INC-003: Fallo en GitHub Actions Runner (`setup-android@v3`) al compilar APK
- **Síntoma:** El flujo de CI/CD falla en `setup-android` a los 10 segundos en `ubuntu-latest`.
- **Causa Raíz:** `ubuntu-latest` ya incluye Android SDK; `setup-android@v3` intentó reinstalarlo provocando colisión.
- **Solución:** Usar `gradle/actions/setup-gradle@v4` con JDK 17 y compilar con `./gradlew assembleRelease` sin reinstalar SDK.

### INC-004: Permisos Nativos de Cámara y Galería en Android 13/14+ (`app.json`)
- **Síntoma:** Cámara o galería no responden en APK standalone en Android 13/14+.
- **Causa Raíz:** `expo-image-picker` faltaba en el arreglo `plugins` de `app.json`, omitiendo permisos en `AndroidManifest.xml`.
- **Solución:** Declarar `expo-image-picker` en `plugins` de `app.json` con `photosPermission` y `cameraPermission`.

### INC-005: Botón de Engrane Inoperante en APK Android (Hit-testing & Modal)
- **Síntoma:** Tocar el engrane en `MenuBienvenida` no abría el drawer en APK standalone.
- **Causa Raíz:** `Animated.View` exterior escalaba y rotaba el contenedor, causando que el `ScrollView` padre descartara el toque (`ACTION_CANCEL`). Además, faltaba `GestureHandlerRootView` en raíz y el drawer requería un `Modal` nativo con `statusBarTranslucent`.
- **Solución:** Invertir jerarquía (`TouchableOpacity` estático exterior 36x36 dp con `hitSlop: 12` + `Animated.View` interior), envolver en `GestureHandlerRootView` y migrar a `Modal` nativo con `cerrandoRef`.
