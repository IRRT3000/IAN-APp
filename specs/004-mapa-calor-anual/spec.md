# Especificación Funcional: 004-mapa-calor-anual — Mapa de Calor Anual con Cuadrícula de 12 Meses, Selector de Año, Motor Progresivo de Hábitos ("Vaso de Agua") y Soporte de Días de Descanso

- **ID de Funcionalidad:** `004-mapa-calor-anual`
- **Estado:** aprobado-grillme
- **Fecha:** 2026-10-24
- **Metodología:** Spec-Driven Development (SDD) vía `@.agents/skills/grill-me`

---

## 1. Resumen y Propósito

Implementar un **Mapa de Calor Anual** de actividad y consistencia en el apartado principal de la aplicación (`MenuBienvenida.jsx` / Dashboard de Inicio). Inspirado en el gráfico de actividad anual de GitHub, el mapa visualiza los 365 días del año natural organizados en 12 cuadrantes mensuales compactos.

El nivel de intensidad del color de cada día está regido por la metáfora del **"Vaso de Agua"**: una función continua y proporcional donde cada hábito registrado aporta un volumen específico al día, alcanzando el color primario más llamativo y brillante al llegar al 100%.

El motor está desacoplado para permitir en futuras especificaciones evaluar la calidad nutricional o incorporar nuevas métricas (pasos, horas de sueño) sin alterar el diseño ni la lógica visual.

---

## 2. Historias de Usuario (HU)

- **HU-1 (Visualización Anual en Cuadrícula Mensual):**
  *Como* usuario comprometido con mi estado físico,
  *quiero* ver en la pantalla de inicio un mapa anual dividido en los 12 meses con un cuadro por día,
  *para* tener una perspectiva global de mi constancia a lo largo de todo el año sin tener que navegar mes por mes.

- **HU-2 (Motor del Vaso de Agua y Progresión Proporcional):**
  *Como* usuario que registra sus hábitos a diferentes horas del día,
  *quiero* que cada comida registrada y cada sesión de entrenamiento sume progresivamente intensidad al color de ese día,
  *para* ver mi avance día a día y motivarme a completar el 100% (verde llamativo).

- **HU-3 (Días de Descanso del Gimnasio sin Penalización):**
  *Como* atleta que respeta su recuperación muscular,
  *quiero* poder marcar un día como "Día de Descanso" para que la falta de gimnasio no penalice mi puntuación,
  *para* poder alcanzar el 100% de cumplimiento en mis días libres de entreno.

- **HU-4 (Foto de Progreso como Registro e Insignia Extra):**
  *Como* usuario que se toma fotos físicas periódicamente,
  *quiero* que la foto quede registrada e indicada en el desglose del día sin que sea un requisito obligatorio para llenar el vaso diario,
  *para* no sentirme frustrado por no poder llegar al 100% en los días donde no tomo fotos corporales.

- **HU-5 (Navegación Histórica entre Años):**
  *Como* usuario con historial prolongado,
  *quiero* poder cambiar de año con un selector `< 2025 | 2026 >`,
  *para* auditar mi actividad de años pasados y comparar mi disciplina interanual.

- **HU-6 (Desglose Emergente con Inmutabilidad Temporal):**
  *Como* usuario que toca un día del mapa,
  *quiero* ver un desglose flotante con el detalle de comidas (X/3), estado de entreno/descanso y fotos,
  *para* consultar qué hice ese día, asegurando que solo el día de hoy permita registrar o modificar datos directamente.

---

## 3. Requerimientos Funcionales (RF)

### RF-1: Cuadrícula Anual de 12 Meses
- El componente `MapaCalorAnual` debe renderizar los 12 meses del año seleccionado (Enero a Diciembre).
- Cada mes se representará como un cuadrante compacto con encabezado abreviado (`ENE`, `FEB`, `MAR`, etc.) y una cuadrícula de 7 columnas correspondientes a los días de la semana (Lunes a Domingo).
- Días fuera del mes se pintan transparentes manteniendo la alineación geométrica.
- Los días futuros del año en curso se muestran en estado inactivo con opacidad reducida (`opacity: 0.25`).
- Los días pasados sin actividad se muestran en color neutro de superficie (`#262626` / `theme.surfaceVariant`).

### RF-2: Motor de Puntuación Proporcional ("Vaso de Agua")
- Puntuación diaria: `score` normalizado de `0.0` a `1.0`.
- **Aporte de Nutrición (50% del vaso = 0.50 máx):**
  - Cada comida registrada aporta `0.50 / 3 = ~0.1667`.
  - 1 comida: `+0.17` (~17%).
  - 2 comidas: `+0.33` (~33%).
  - 3 o más comidas: `+0.50` (50%).
- **Aporte de Entrenamiento / Descanso (50% del vaso = 0.50 máx):**
  - Si hay entrenamiento registrado en la fecha: `+0.50`.
  - Si está marcado como día de descanso (`isRestDay: true`): `+0.50`.
  - Si no hay entreno ni descanso: `+0.00`.
- **Foto de Progreso:**
  - Si hay $\ge 1$ foto ese día: se activa `hasPhoto: true`. No añade ni resta al score numérico, pero añade una insignia visual dorada o icónica en el desglose.

### RF-3: Escala Visual de Colores e Intensidad
La celda del día aplica una escala basada en el color primario de la app (`#00E676` / `#22C55E`):
- **Nivel 0 (`score === 0.0`):** Fondo vacío (`#262626`).
- **Nivel 1 (`0.0 < score <= 0.35`):** Verde tenue (~25% a 30% opacidad: `rgba(0, 230, 118, 0.30)`).
- **Nivel 2 (`0.35 < score <= 0.65`):** Verde medio (~50% a 60% opacidad: `rgba(0, 230, 118, 0.60)`).
- **Nivel 3 (`0.65 < score < 1.0`):** Verde intenso (~80% opacidad: `rgba(0, 230, 118, 0.85)`).
- **Nivel 4 (`score === 1.0`):** Verde sólido llamativo al 100% (`#00E676`), representando el vaso lleno.

### RF-4: Selector y Navegación de Años
- Selector superior con botones anterior `[ < ]` y siguiente `[ > ]`.
- Muestra el año visualizado (por defecto, el año corriente obtenido de la fecha local).
- El botón siguiente `[ > ]` se deshabilita si el año mostrado es igual al año actual.

### RF-5: Desglose al Tocar un Día (Modal / Tooltip)
- Al hacer tap sobre una celda (pasada o presente):
  - Muestra la fecha en formato legible: ej. *"Lunes, 12 de Mayo de 2026"*.
  - Porcentaje de llenado del vaso: ej. *"83% completado"*.
  - Desglose detallado:
    - 🥗 Comidas: `X / 3 registradas`
    - 🏋️ Entrenamiento: `Completado` / `Día de Descanso` / `Sin registro`
    - 📸 Fotos físicas: `1 foto registrada` / `Sin fotos`
  - Si es el **día de hoy**:
    - Botón para alternar "Marcar como Día de Descanso" si no ha entrenado.
    - Botones de acceso directo para registrar comida o iniciar entrenamiento.
  - Si es un **día pasado**:
    - Modo solo lectura informativa.
  - Si es un **día futuro**:
    - No interactivo (disabled).

### RF-6: Persistencia y Fuente de Datos Local-First
- Integración con las colecciones existentes en `storage.js`:
  - `cargarEntrenamientos()` $\rightarrow$ determina si hay entrenamiento en `item.fecha`.
  - `cargarComidas()` $\rightarrow$ cuenta las comidas con `item.fecha`.
  - `cargarCambiosFisicos()` $\rightarrow$ detecta fotos en `item.fecha`.
- Nueva clave AsyncStorage para días de descanso:
  - `@fitness_tracker_dias_descanso_v1`: Arreglo de strings `["YYYY-MM-DD", ...]` con las fechas marcadas como descanso.
- Aritmética local obligatoria según `AGENTS.md`: Prohibido `toISOString()` o `new Date("YYYY-MM-DD")` en UTC.

---

## 4. Requerimientos No Funcionales (RNF)

- **RNF-1 (Rendimiento en Renderizado de 365 Nodos):** La celda de cada día `HeatmapDayCell` debe implementarse con `React.memo` para evitar re-renderizados innecesarios de toda la cuadrícula anual al interactuar con el popover.
- **RNF-2 (Inmutabilidad Estricta):** Cualquier actualización de estado o de `AsyncStorage` debe realizarse mediante clonación inmutable (`[...prev, nuevo]`).
- **RNF-3 (Compatibilidad y Cohesión Visual):** StyleSheet nativo de React Native, sin librerías externas pesadas ni APIs nativas incompatibles con Expo Go.
- **RNF-4 (Accesibilidad y Ergonomía Móvil):** Los meses deben organizarse de manera legible en pantallas de 360px a 430px de ancho con scroll vertical contenedor integrado en `MenuBienvenida.jsx`.

---

## 5. Criterios de Aceptación

1. [ ] La pantalla de Inicio (`MenuBienvenida`) muestra el Mapa de Calor Anual con los 12 meses organizados en cuadrículas.
2. [ ] Cada día muestra el color correspondiente a su nivel de llenado del Vaso de Agua (0 = vacío, 1 = tenue, 2 = medio, 3 = intenso, 4 = verde sólido 100%).
3. [ ] Si el usuario registra comidas, el score sube proporcionalmente (+16.6% por comida).
4. [ ] Si el usuario registra un entrenamiento o marca el día como descanso, suma el 50% correspondiente.
5. [ ] Las fotos físicas se muestran en el desglose sin impedir alcanzar el 100%.
6. [ ] El selector `< [Año] >` permite auditar años anteriores y bloquea el avance a años futuros.
7. [ ] Al pulsar un día se muestra el modal/tooltip con el desglose del vaso y sus hábitos.
8. [ ] Las fechas se calculan exclusivamente en tiempo local sin desfases UTC.
