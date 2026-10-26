# Tareas de Implementación: Spec 008 — "Panel Lateral de Configuración & Conector Universal de Gemini API Key"

- **ID de Funcionalidad:** `008-panel-configuracion-api-key`
- **Estado:** completada-y-auditada
- **Fecha:** 2026-10-25
- **Equipo:** `orquestador` -> `subagente-ui` -> `subagente-motion` -> `implementador` -> `revisor-critico`

---

### Fase 1: Servicios Centrales y Conector Universal de Claves

#### 1. Persistencia de Credenciales en `apiKeyStorage.js`
- [x] **T1.1:** Crear `src/services/apiKeyStorage.js` con las funciones `guardarApiKeyGemini(clave)`, `cargarApiKeyGemini()` y `eliminarApiKeyGemini()` usando `@fitness_tracker_gemini_api_key` en `AsyncStorage`.
- [x] **T1.2:** Validar que el almacenamiento recorte espacios en blanco (`.trim()`) y maneje fallos de AsyncStorage de forma tolerante sin crashear.

#### 2. Conector Universal y Validador en `gemini.js`
- [x] **T2.1:** Implementar función `validarApiKeyGemini(clave)` que haga un `fetch` liviano de comprobación con timeout de 8s a la API de modelos de Gemini y retorne `{ valida: boolean, error?: string }`.
- [x] **T2.2:** Implementar función `obtenerApiKeyActiva()` que consulte en orden: 1) `cargarApiKeyGemini()`, 2) `process.env.EXPO_PUBLIC_GEMINI_API_KEY`.
- [x] **T2.3:** Refactorizar `analizarComidaConGemini`, `analizarCambioFisicoConGemini` y `compararCambioFisicoConGemini` para consumir `await obtenerApiKeyActiva()` de forma homogénea.

---

### Fase 2: Componente Drawer y Micro-interacción del Engranaje

#### 3. Micro-interacción del Engranaje en `MenuBienvenida.jsx`
- [x] **T3.1:** Añadir el botón con icono `Feather` `'settings'` en la esquina superior derecha del bloque editorial de `MenuBienvenida.jsx`.
- [x] **T3.2:** Aplicar física de resorte con Reanimated 4 (`scale: 0.90`, rotación `15deg`) y pulso háptico causal sincronizado (`haptics.js`).
- [x] **T3.3:** Conectar la propiedad `onAbrirConfiguracion` transmitida desde `App.js`.

#### 4. Panel Lateral de Configuración (`PanelConfiguracionLateral.jsx`)
- [x] **T4.1:** Crear `src/components/PanelConfiguracionLateral.jsx` con dimensiones del 85% de ancho, fondo carbón mate `#141414`, borde hairline `#262626` y elevación 16.
- [x] **T4.2:** Implementar animación de resorte en UI Thread para entrada y salida (`translateX` con `withSpring`), y backdrop con fade de opacidad.
- [x] **T4.3:** Integrar los 4 métodos de cierre simultáneos: botón 'X', toque en backdrop, gesto swipe hacia la derecha y llamada al callback `onCerrar`.
- [x] **T4.4:** Maquetar la tarjeta de estado (Conectada 🟢 vs No configurada 🔴), campo de texto seguro con alternador de visibilidad (`eye`/`eye-off`) y botón de pegado rápido.
- [x] **T4.5:** Implementar botón "Probar y Guardar Clave" con spinner de carga, retroalimentación háptica y mensajes de error específicos (clave inválida, sin red, etc.).
- [x] **T4.6:** Añadir botón de "Eliminar Clave" y enlace externo directo a Google AI Studio (`Linking.openURL`).

---

### Fase 3: Integración en `App.js` y Navegación Android

#### 5. Coordinación Global y BackHandler
- [x] **T5.1:** Añadir estado `panelConfiguracionVisible` en `App.js` y pasar handlers a `MenuBienvenida` y `PanelConfiguracionLateral`.
- [x] **T5.2:** Interceptar `BackHandler` en Android para que si `panelConfiguracionVisible` está activo, presionar Atrás cierre el panel lateral antes de cualquier otra navegación.

---

### Fase 4: Configuración Nativa en `app.json`

#### 6. Plugins y Permisos de Android
- [x] **T6.1:** Registrar el plugin `expo-image-picker` en `app.json` con los mensajes de permiso requeridos para cámara y galería en Android 13/14+.

---

### Fase 5: Verificación, Control de Calidad y Cierre

#### 7. Certificación de Calidad
- [x] **T7.1:** Ejecutar `npx expo export --platform android` y comprobar 0 errores de compilación de Metro (1229 módulos empaquetados con éxito).
- [x] **T7.2:** Verificar la inmutabilidad de los datos previos de entrenamientos, comidas y heatmap en `AsyncStorage`.
- [x] **T7.3:** Actualizar `MEMORY.md` y documentar la culminación de la fase de implementación y verificación.
