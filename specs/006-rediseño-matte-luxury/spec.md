# Especificación 006: Rediseño Total Monocromo Matte Luxury

## 1. Visión y Dirección Estética
Refundar la interfaz visual y la interacción táctil de la aplicación móvil Fitness Tracker hacia una experiencia **Monocromo Matte Luxury** de nivel editorial y comercial (*anti-AI slop*).

### Reglas Críticas del Sistema
1. **INMUTABILIDAD ABSOLUTA DEL BACKEND**: Prohibido alterar claves de `AsyncStorage`, esquemas de datos, funciones de `src/services/storage.js`, cálculos en `src/utils/waterGlassEngine.js`, fechas en `src/utils/dateUtilsLocal.js` o servicios de IA en `src/services/gemini.js`.
2. **PROHIBICIÓN TOTAL DE EMOJIS**: Se eliminan todos los glifos emojis de la interfaz. La iconografía se implementa exclusivamente con `@expo/vector-icons` (`Feather`).
3. **FÍSICAS DE RESORTE EN UI THREAD**: Todas las micro-animaciones (slider de tabs, compresión táctil, expansión de tarjetas, anillo de borrado) se ejecutan fuera del hilo de JavaScript utilizando `react-native-reanimated` y `worklets`.

---

## 2. Los 12 Pilares del Rediseño

| # | Pilar | Definición Técnica |
| :---: | :--- | :--- |
| **1** | **Paleta de Color** | Negro carbón `#0A0A0A`, superficies `#141414`, bordes grafito `#262626`, textos blanco hielo `#F2F2F7`. |
| **2** | **Iconografía** | Exclusivamente `@expo/vector-icons` (`Feather`). Cero emojis. Placeholders HTTPS estables para imágenes. |
| **3** | **Físicas de Movimiento** | Micro-animaciones ricas con físicas de resorte en UI Thread (`damping: 14–20`, `stiffness: 120–200`). |
| **4** | **Heatmap Monocromo** | 5 niveles de contraste (`#141414`, `#262626`, `#404040`, `#757575`, `#F2F2F7`). |
| **5** | **Slider de Navegación** | Cápsula flotante animada con inercia y resorte debajo del tab activo. |
| **6** | **Estructura de Inicio** | Dashboard Editorial: Fecha/saludo -> Fila de 3 KPIs (divisores 1px) -> Widget mensual -> Acciones rápidas. |
| **7** | **Borrado Seguro** | Anillo circular animado de 1000ms continuo alrededor del icono Feather `trash-2`, con desinflado elástico. |
| **8** | **Superficies y Cristal** | *Frosted Dark Glass* (`BlurView`) para barra inferior flotante y encabezados, con bordes hairline grafito. |
| **9** | **Transición de Pantallas** | Cross-fade sutil con micro-escala (180ms, escala 0.99 -> 1.0 en UI Thread). |
| **10** | **Tipografía** | Editorial: tracking negativo (-0.5px) en títulos, mayúsculas con espaciado amplio (+1.2px) en `#8E8E93`. |
| **11** | **Tarjetas de Ejercicios** | Tarjetas colapsables compactas con acordeón de resorte fluido (`4 series • 80 kg máx`). |
| **12** | **Despliegue en 3 Fases** | Fase 1 (Tokens + Barra + Inicio), Fase 2 (Entrenamientos + Live Mode), Fase 3 (Nutrición + Físico + Heatmap). |

---

## 3. Requerimientos Funcionales de la Fase 1

### RF-1: Tokens Centralizados (`src/theme/`)
* Crear `src/theme/colors.js`, `src/theme/spacing.js`, `src/theme/typography.js` y `src/theme/radius.js`.

### RF-2: Barra de Navegación Inferior Flotante (`BarraNavegacionInferior.jsx`)
* Reemplazar todos los emojis con `Feather` (`home`, `activity`, `pie-chart`, `camera`, `calendar`).
* Implementar cápsula deslizante animada con `react-native-reanimated` (`useAnimatedStyle`, `withSpring`).
* Integrar `BlurView` ahumado (`tint="dark"`).
* Insignia numérica minimalista para conteos de hoy.

### RF-3: Pantalla de Inicio Editorial (`MenuBienvenida.jsx`)
* Encabezado tipográfico sobrio con fecha local formateada y saludo.
* Caja horizontal de 3 métricas (Racha, Entrenamientos hoy, Comidas hoy) con bordes de 1px.
* Widget `MonthBlock` adaptado a la escala monocromática de 5 niveles.
* Lista compacta de accesos directos con iconos `Feather` y compresión de resorte en press (`scale: 0.97`).

### RF-4: Contenedor Principal y Transición (`App.js`)
* Contenedor con fondo `#0A0A0A`.
* Transición de cambio de pestaña con `Cross-fade` y micro-escala (180ms) en UI Thread.
