# Especificación 006: Rediseño Total Monocromo Matte Luxury (Android-First Edition)

## 1. Visión y Dirección Estética
Refundar la interfaz visual y la interacción táctil de la aplicación móvil Fitness Tracker hacia una experiencia **Monocromo Matte Luxury** de nivel editorial y comercial, **optimizada para la perfección en Android**.

### Reglas Críticas del Sistema
1. **INMUTABILIDAD ABSOLUTA DEL BACKEND**: Prohibido alterar claves de `AsyncStorage`, esquemas de datos, funciones de `src/services/storage.js`, cálculos en `src/utils/waterGlassEngine.js`, fechas en `src/utils/dateUtilsLocal.js` o servicios de IA en `src/services/gemini.js`.
2. **PROHIBICIÓN TOTAL DE EMOJIS**: Se eliminan todos los glifos emojis de la interfaz. La iconografía se implementa exclusivamente con `@expo/vector-icons` (`Feather`).
3. **ENFOQUE ANDROID-FIRST (PERFECCIÓN EN ANDROID)**:
   - Superficies mate con bordes hairline de 1px (`#262626`) y elevación nativa en Android, evitando los artefactos de recorte de esquinas y caídas de frames del blur en dispositivos Android.
   - Soporte nativo para el botón físico/gestual de Atrás (`BackHandler`): al pulsar Atrás en una pestaña secundaria, regresa a 'bienvenida' antes de salir.
   - Holgura de navegación gestual inferior (`paddingBottom: 110` en todas las listas).
4. **FÍSICAS DE RESORTE EN UI THREAD**: Todas las micro-animaciones (slider de tabs, compresión táctil, acordeones, cápsula de borrado) corren en el hilo de interfaz nativo con `react-native-reanimated` (4.x) y `react-native-worklets`.

---

## 2. Los Pilares de la Arquitectura Android

| Componente | Especificación Técnica para Android |
| :--- | :--- |
| **Barra Inferior Flotante** | Superficie carbón mate sólida (`#141414`), `borderRadius: 24`, borde hairline `rgba(255, 255, 255, 0.08)`, elevación 8, slider animado numéricamente sin desbordes. |
| **Borrado Seguro (1000ms)** | Cápsula de progreso líquido con `scaleX` animado en UI Thread y doble pulso háptico. Cero dependencias adicionales (sin `react-native-svg`). |
| **Scroll Clearance** | `paddingBottom: 110` en todos los `ScrollView` y `FlatList` para que ningún botón o dato quede cubierto por la barra flotante. |
| **Heatmap Monocromo** | 5 niveles de contraste (`#141414` a `#FFFFFF`) con inversión tipográfica automática a negro `#0A0A0A` en los niveles 3 y 4 para evitar empastamiento en pantallas AMOLED. |
| **Iconografía** | Exclusivamente `@expo/vector-icons` (`Feather`). Cero emojis en toda la aplicación (incluyendo alertas nativas y catálogos). |
| **Transición de Pantallas** | `FadeIn.duration(180)` sin montaje dual para garantizar 0% de consumo redundante de memoria y respuesta táctil inmediata. |

---

## 3. Requerimientos de la Fase 1

### RF-1: Tokens Centralizados (`src/theme/tokens.js`)
* Colores: `canvas: '#0A0A0A'`, `surface: '#141414'`, `border: '#262626'`, `textPrimary: '#FFFFFF'`, `textSecondary: '#8E8E93'`.
* Escala de 5 niveles del heatmap con contraste WCAG AAA.

### RF-2: Barra Inferior Flotante Android (`BarraNavegacionInferior.jsx`)
* Reemplazo de emojis por `Feather`: `home`, `activity`, `pie-chart`, `camera`, `calendar`.
* Slider indicativo con `withSpring({ duration: 240, dampingRatio: 1, overshootClamping: true })`.
* Altura ergonómica de 56dp y touch target mínimo de 48dp (estándar Material Design en Android).

### RF-3: Pantalla de Inicio Editorial (`MenuBienvenida.jsx`)
* Saludo sobrio con fecha local formateada.
* Caja de 3 KPIs (Racha, Entrenamientos, Nutrición) con divisores finos.
* Widget mensual adaptado a la escala monocroma.
* `contentContainerStyle` con `paddingBottom: 110`.

### RF-4: Transición y BackHandler en `App.js`
* Transición `FadeIn` de 180ms con `key={vistaActiva}`.
* Intercepción de `BackHandler` en Android para volver a 'bienvenida' si está en otra vista.
