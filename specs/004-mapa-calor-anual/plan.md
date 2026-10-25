# Plan de Arquitectura e Implementación: 004-mapa-calor-anual

- **ID de Funcionalidad:** `004-mapa-calor-anual`
- **Fecha:** 2026-10-24
- **Estado:** listo-para-ejecucion

---

## 1. Arquitectura de Módulos y Flujo de Datos

```
                                      ┌────────────────────────────────┐
                                      │        AsyncStorage            │
                                      │  - @fitness_tracker_entrenos   │
                                      │  - @fitness_tracker_comidas    │
                                      │  - @fitness_tracker_cambio_fis │
                                      │  - @fitness_dias_descanso_v1   │
                                      └──────────────┬─────────────────┘
                                                     │
                                                     ▼
                                      ┌────────────────────────────────┐
                                      │      storage.js / Hooks        │
                                      │  obtenerResumenAnual(year)     │
                                      │  alternarDiaDescanso(fecha)    │
                                      └──────────────┬─────────────────┘
                                                     │
                                                     ▼
                                      ┌────────────────────────────────┐
                                      │       MapaCalorAnual.jsx       │
                                      │  (Selector < 2026 > + Grid)    │
                                      └───────┬──────────────┬─────────┘
                                              │              │
                       ┌──────────────────────┘              └─────────────────────┐
                       ▼                                                           ▼
         ┌───────────────────────────┐                               ┌───────────────────────────┐
         │      MonthBlock.jsx       │                               │    DaySummaryModal.jsx    │
         │  (12 meses x 7 columnas)  │                               │ (Desglose Vaso + Acciones)│
         └─────────────┬─────────────┘                               └───────────────────────────┘
                       ▼
         ┌───────────────────────────┐
         │     HeatmapDayCell.jsx    │
         │ (React.memo + Score Color)│
         └───────────────────────────┘
```

---

## 2. Definición del Motor del Vaso de Agua (`src/utils/waterGlassEngine.js`)

Para desacoplar el cálculo matemático de la vista y permitir futuras extensiones (como calidad nutricional o pasos):

```javascript
/**
 * Calcula el llenado del Vaso de Agua para una fecha dada (0.0 a 1.0).
 * 
 * @param {Object} resumenDia
 * @param {number} resumenDia.comidasCount - Cantidad de comidas (0 a 3+)
 * @param {boolean} resumenDia.hasWorkout - Si hubo sesión de entrenamiento
 * @param {boolean} resumenDia.isRestDay - Si fue marcado como descanso
 * @returns {number} Score continuo entre 0.0 y 1.0
 */
export function calcularScoreVaso(resumenDia = {}) {
  const { comidasCount = 0, hasWorkout = false, isRestDay = false } = resumenDia;
  
  let score = 0;
  
  // 1. Nutrición: hasta 0.50 (proporcional: ~0.1667 por comida hasta 3)
  const proporcionComidas = Math.min(comidasCount / 3, 1.0);
  score += proporcionComidas * 0.50;
  
  // 2. Gimnasio o Descanso: 0.50
  if (hasWorkout || isRestDay) {
    score += 0.50;
  }
  
  return Math.min(Number(score.toFixed(2)), 1.0);
}

/**
 * Mapea el score a un nivel de color (0 a 4).
 */
export function obtenerNivelColor(score) {
  if (score <= 0) return 0;
  if (score <= 0.35) return 1;
  if (score <= 0.65) return 2;
  if (score < 1.0) return 3;
  return 4;
}
```

---

## 3. Persistencia de Días de Descanso (`src/services/storage.js`)

Se agregan dos funciones puras a `storage.js`:
1. `cargarDiasDescanso()`: Recupera `string[]` con las fechas `YYYY-MM-DD` marcadas como descanso.
2. `alternarDiaDescanso(fecha)`: Agrega o quita la fecha de forma inmutable y persiste en `@fitness_tracker_dias_descanso_v1`.
3. `obtenerResumenAnualHabitos(year)`: Cruza en memoria los arreglos de entrenamientos, comidas, fotos y descanso para generar un mapa optimizado `Map<string, ResumenDia>` que evita recalcular iterativamente en cada celda.

---

## 4. Componentes y Responsabilidades

### 4.1 `HeatmapDayCell.jsx`
- Celda memoizada (`React.memo`).
- Props: `fechaStr`, `score`, `isFuture`, `hasPhoto`, `onPress`.
- Aplica estilos dinámicos basados en `obtenerNivelColor(score)`.

### 4.2 `MonthBlock.jsx`
- Representa un mes específico (0 a 11).
- Genera la matriz de días alineada con el primer día de la semana (Lunes = 0).
- Rellena con espacios vacíos los días anteriores al día 1 del mes para preservar la cuadrícula de 7 columnas.

### 4.3 `DaySummaryModal.jsx`
- Modal minimalista en tema oscuro (`#1E1E1E` / `#2A2A2A`).
- Muestra la fecha formateada, barra visual de llenado del vaso con porcentaje, desglose de ítems y botón para descanso en la fecha de hoy.

### 4.4 `MapaCalorAnual.jsx`
- Encabezado con selector de año (`< 2026 >`).
- Cuadrícula de meses dispuesta en un contenedor con 2 o 3 columnas adaptables a la pantalla.
- Leyenda inferior de los 5 niveles (Vacío $\rightarrow$ Vaso Lleno).

### 4.5 Integración en `MenuBienvenida.jsx`
- `MenuBienvenida.jsx` sustituye o complementa el acceso estático con el `MapaCalorAnual` debajo de las métricas principales, permitiendo scroll fluido dentro del inicio.

---

## 5. Pruebas y Casos Límite a Considerar

1. **Años bisiestos:** Febrero debe tener 29 días en años bisiestos y 28 en años comunes (manejado nativamente por aritmética local de `new Date(year, month + 1, 0).getDate()`).
2. **Desfase UTC vs Local:** Todo acceso a fechas usa `obtenerFechaLocal()` o cadenas `YYYY-MM-DD` descompuestas por partes numéricas `(year, month, day)`. Prohibido `toISOString()`.
3. **Cero penalización en descanso:** Al marcar día de descanso, un día con 3 comidas debe llegar a 1.0 (verde sólido).
4. **Foto sin comida ni entreno:** Muestra insignia de foto en el desglose pero el vaso queda en 0.0 (fondo vacío).
5. **Rendimiento:** 365 celdas no deben generar lag en scroll o al abrir modales gracias a `React.memo` y mapas indexados.
