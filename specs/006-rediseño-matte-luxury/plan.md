# Plan de Arquitectura y Ejecución Técnica: Spec 006 — "Rediseño Total Monocromo Matte Luxury (Android-First)"

- **ID de Funcionalidad:** `006-rediseño-matte-luxury`
- **Estado:** planificado-con-auditoria-multiagente
- **Fecha:** 2026-10-25
- **Metodología:** Spec-Driven Development (SDD) con Equipo Multi-Agente (`orquestador`, `subagente-ui`, `subagente-motion`, `revisor-critico`)

---

## 1. Arquitectura Técnica

```
src/
  ├── theme/
  │    └── tokens.js (Tokens centralizados: colores Monocromo, espaciados 4pt/8pt, tipografía y radios)
  │
  ├── components/
  │    ├── BarraNavegacionInferior.jsx (Barra flotante Android con elevación 8, slider Reanimated 4 e iconos Feather)
  │    ├── MenuBienvenida.jsx (Dashboard Editorial: Hero tipográfico, KPIs con divisores 1px, acciones rápidas)
  │    ├── heatmap/
  │    │     ├── MonthBlock.jsx (Widget mensual con escala monocromática de 5 niveles)
  │    │     └── HeatmapDayCell.jsx (Inversión tipográfica automática a negro #0A0A0A en niveles 3 y 4)
  │    ├── EntrenamientosView.jsx (Fase 2: Acordeón colapsable y Hold-to-Delete Capsule)
  │    ├── NutricionView.jsx (Fase 3: Macros y tarjetas sin emojis)
  │    ├── CambioFisicoView.jsx (Fase 3: Báscula circular minimalista)
  │    └── HeatmapView.jsx (Fase 3: Cuadrícula anual completa monocromática)
  │
  └── services/ & utils/ [INMUTABLES]
       ├── storage.js (7 claves de AsyncStorage protegidas sin cambios)
       ├── waterGlassEngine.js (Fórmula matemática intacta; solo tokens visuales)
       └── dateUtilsLocal.js (Aritmética de fecha local estricta)
```

---

## 2. Decisiones Técnicas Clave (Blindadas por los Subagentes)

1. **Enfoque Android-First (Cero Glitches)**:
   - Se prescinde de `BlurView` con desenfoque de GPU para la barra flotante en Android, reemplazándolo por una superficie sólida de lujo en **Carbón Mate** (`backgroundColor: '#141414'`), bordes hairline (`rgba(255, 255, 255, 0.08)`), esquinas redondeadas de 24dp y elevación nativa `elevation: 8`.
   - Garantiza 60fps estables en cualquier pantalla Android sin artefactos de recorte de esquinas.

2. **Slider de Pestañas con Medición Numérica Única**:
   - Para evitar desbordes en toques rápidos y advertencias en el hilo nativo de Android, se calcula el ancho del tab una sola vez en el contenedor padre (`onLayout`) y se anima numéricamente en píxeles:
     `translateX.set(withSpring(indiceActivo * tabWidth, { duration: 240, dampingRatio: 1, overshootClamping: true }))`.

3. **Cápsula de Progreso Líquido (Sin `react-native-svg`)**:
   - Se descarta `react-native-svg` para no engordar el bundle con dependencias pesadas.
   - El botón de borrado sostenido de 1000ms se implementa como una cápsula compacta en UI Thread con Reanimated 4 (`scaleX` animado de 0 a 1) y sincronización con [src/services/haptics.js](file:///d:/MiNuevaApp/mi-fitness-app/src/services/haptics.js).

4. **Navegación Gestual con `BackHandler`**:
   - Al pulsar Atrás de Android en cualquier pestaña distinta de `bienvenida`, `App.js` intercepta el evento y retorna a `bienvenida` antes de cerrar la aplicación.

5. **Scroll Clearance Global (`paddingBottom: 110`)**:
   - Todos los `ScrollView` y `FlatList` reciben `contentContainerStyle={{ paddingBottom: 110 }}` para que ningún botón o dato quede cubierto por la barra flotante.

6. **Inversión Tipográfica en Pantallas AMOLED**:
   - En las celdas del heatmap, niveles 3 (`#9E9E9E`) y 4 (`#FFFFFF`), el texto se invierte automáticamente a negro profundo (`#0A0A0A`) con `fontWeight: '800'` para garantizar contraste WCAG AAA.

7. **Prohibición Total de Emojis**:
   - Erradicación del 100% de los glifos emojis en vistas, alertas nativas (`Alert.alert`) y catálogos en favor de `@expo/vector-icons` (`Feather`).
