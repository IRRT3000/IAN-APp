# Plan de Arquitectura y Ejecución Técnica: Spec 008 — "Panel Lateral de Configuración & Conector Universal de Gemini API Key"

- **ID de Funcionalidad:** `008-panel-configuracion-api-key`
- **Estado:** planificado-con-auditoria-multiagente
- **Fecha:** 2026-10-25
- **Metodología:** Spec-Driven Development (SDD) con Equipo Multi-Agente (`orquestador`, `subagente-ui`, `subagente-motion`, `implementador`, `revisor-critico`)

---

## 1. Arquitectura de Archivos y Responsabilidades

```
mi-fitness-app/
  ├── app.json (Registrar config plugin de expo-image-picker con permisos)
  │
  ├── src/
  │    ├── components/
  │    │    ├── MenuBienvenida.jsx (Añadir botón interactivo de engranaje en esquina superior derecha)
  │    │    └── PanelConfiguracionLateral.jsx [NUEVO] (Drawer lateral con físicas Reanimated, backdrop y 4 métodos de cierre)
  │    │
  │    ├── services/
  │    │    ├── apiKeyStorage.js [NUEVO] (Persistencia local aislada de la clave en AsyncStorage)
  │    │    ├── gemini.js (Conector universal: función obtenerApiKeyActiva y validarApiKeyGemini)
  │    │    └── haptics.js (Añadir o reusar pulsos hápticos para apertura de configuración y validación)
  │    │
  │    └── App.js (Coordinación de estado del drawer y prioridad de BackHandler en Android)
```

---

## 2. Decisiones Técnicas Clave de los Subagentes

### A. Subagente UI (`subagente-ui`): Maquetación Matte Luxury y Tokens
1. **Posicionamiento del Engranaje**:
   - Integrado en `filaInsigniaFecha` de `MenuBienvenida.jsx`.
   - Dimensiones táctiles: `width: 44`, `height: 44`, `borderRadius: 22`, centrado absoluto del icono `Feather` `'settings'`.
   - Fondo sutil `rgba(255, 255, 255, 0.06)` y borde hairline `TOKENS.colors.borderDefault`.
2. **Estructura del Drawer (`PanelConfiguracionLateral.jsx`)**:
   - Superficie sólida en carbón mate (`TOKENS.colors.surface = '#141414'`) para evitar caídas de frames asociadas a desenfoques de GPU en Android.
   - Borde izquierdo hairline de 1px (`#262626`).
   - Sombra nativa Android con `elevation: 16`.
   - Tarjeta de estado con tipografía editorial de alta jerarquía (`TOKENS.typography.title` y `labelCategory`).

### B. Subagente Motion (`subagente-motion`): Físicas de Resorte y Gestos en UI Thread
1. **Micro-interacción del Engranaje**:
   - Implementado con `Animated.View` de Reanimated 4.
   - Valores compartidos: `scale = useSharedValue(1)` y `rotation = useSharedValue(0)`.
   - En `onPressIn`: `scale.value = withSpring(0.90, { damping: 15, stiffness: 200 })`, `rotation.value = withSpring(15)`.
   - En `onPressOut`: `scale.value = withSpring(1.0)`, `rotation.value = withSpring(0)`.
   - Sincronización háptica inmediata en el toque inicial.
2. **Despliegue del Drawer Lateral**:
   - `translateX = useSharedValue(ANCHO_PANEL)`.
   - Apertura: `withSpring(0, { damping: 20, stiffness: 120 })`.
   - Cierre: `withSpring(ANCHO_PANEL, { damping: 20, stiffness: 160 })`.
   - Backdrop animado en opacidad de 0 a 0.72.
   - Gesto Swipe a la derecha con `Gesture.Pan()` que rastrea el desplazamiento del dedo y descarta el drawer si el swipe supera el 30% del ancho o tiene velocidad positiva.

### C. Revisor Crítico (`revisor-critico`): Control de Casos Límite y Concurrencia
1. **Prioridad en `BackHandler` de Android**:
   - Si `panelConfiguracionVisible === true`, pulsar Atrás en Android **cierra primero el panel lateral** (`return true`).
   - Solo cuando el panel esté cerrado, el `BackHandler` actuará sobre la navegación principal.
2. **Validación Ultraligera y Segura de la Clave**:
   - `validarApiKeyGemini(clave)` ejecuta un `fetch` con timeout estricto de 8 segundos a `https://generativelanguage.googleapis.com/v1beta/models?key=${clave}`.
   - Captura y traduce los códigos de Google AI Studio:
     - HTTP 200: Clave válida y operativa.
     - HTTP 400 (`API_KEY_INVALID`): *"La clave ingresada no es válida. Revisa los caracteres."*
     - HTTP 403 (`PERMISSION_DENIED`): *"Permiso denegado. Revisa las restricciones de tu proyecto en Google Cloud."*
     - Excepción de red: *"Sin conexión a internet. Comprueba tu conexión Wi-Fi o datos móviles."*
3. **Inmutabilidad y No-Regresión**:
   - Cero colisiones con las claves de entrenamientos, comidas o cambios físicos.
   - Si no hay clave configurada en `AsyncStorage`, las llamadas a Gemini caen ordenadamente en el aviso para abrir la configuración en lugar de romper la aplicación.

---

## 3. Plan de Verificación de Calidad

1. **Pruebas de Diagnóstico**:
   - `npx expo-doctor` limpio.
   - `npx expo export --platform android` para garantizar que el bundle compila sin advertencias ni dependencias faltantes.
2. **Pruebas de Casos Límite en UI**:
   - Probar los 4 métodos de cierre del drawer (Botón X, Backdrop, Swipe derecha y botón Atrás de Android).
   - Probar guardado con clave falsa vs clave real.
   - Probar alternancia de visibilidad del input (`••••••` vs texto claro).
   - Probar botón de "Pegar" desde portapapeles.
   - Probar persistencia tras reiniciar la app (la clave sigue guardada en `AsyncStorage`).
