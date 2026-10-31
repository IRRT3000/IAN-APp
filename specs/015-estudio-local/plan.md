# Plan Técnico — Spec 015: Apartado de Estudio

## 1. Persistencia (`src/services/estudioStorage.js`, archivo nuevo)
Los datos de estudio van en un servicio propio, igual que `apiKeyStorage.js`, para no seguir creciendo `storage.js` (más de 1200 líneas).

- **Claves en AsyncStorage**:
  - `@fitness_tracker_materias_v1` → `[{ id, nombre, categoria, creadaEn }]` (una sola clave; son pocas y pequeñas).
  - `@fitness_tracker_sesiones_estudio_v1:YYYY-MM` → `[{ id, fecha, materiaId, tema, comprension, minutos, apuntes, creadaEn, editadaEn }]`. **Una clave por mes**, derivada de `fecha.slice(0, 7)` (Defensa 10). Como la fecha de una sesión nunca cambia, su clave tampoco.
- **Constantes exportadas**:
  ```js
  export const STORAGE_KEY_MATERIAS = '@fitness_tracker_materias_v1';
  export const PREFIJO_SESIONES_ESTUDIO = '@fitness_tracker_sesiones_estudio_v1:';
  export const claveSesionesDeMes = (fecha) => `${PREFIJO_SESIONES_ESTUDIO}${fecha.slice(0, 7)}`;
  export { CATEGORIAS_MATERIA, NIVELES_COMPRENSION } from '../utils/validacionEstudio';
  ```
- **Ids**: el mismo patrón que el resto de la app, `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`. `creadaEn` es `Date.now()`; `editadaEn` empieza en `null`.
- **Lecturas (Defensa 3)**:
  - `leerArregloTolerante(clave)` (interna, para mostrar): ante un error, JSON inválido o algo que no sea un arreglo, devuelve `[]` y hace `console.error`.
  - `leerArregloEstricto(clave)` (interna, antes de escribir): si `getItem` falla, **lanza** el error. Si el JSON está corrupto o no es un arreglo, primero `setItem(\`${clave}:corrupto:${Date.now()}\`, crudo)` y después devuelve `[]`. El respaldo nunca se borra solo.
- **Cola serial (Defensa 4)**: `let colaEscrituras = Promise.resolve();` y `const encolar = (tarea) => (colaEscrituras = colaEscrituras.then(tarea, tarea));`. La función devuelve la promesa de `tarea`, así que quien llama recibe su resultado o su error. Todas las funciones de escritura se ejecutan dentro de `encolar`.
- **Funciones públicas** (todas devuelven copias nuevas):
  - `clavesDeSesiones(keys)` (interna, única): filtra las claves que empiezan con `PREFIJO_SESIONES_ESTUDIO` y **no** contienen `:corrupto:`. La usan `cargarSesionesEstudio` y `eliminarMateria`, para que nunca se lean ni se respalden los propios respaldos.
  - `cargarMaterias()` → lectura tolerante de la clave de materias. **Nunca lanza**: ante cualquier fallo devuelve `[]`.
  - `cargarSesionesEstudio()`, envuelta completa en `try/catch` que devuelve `[]` y hace `console.error`, para que **nunca lance**. Si lanzara, rompería el `Promise.all` de arranque de `App.js` y con él la carga de entrenos y comidas:
    1. `getAllKeys()`.
    2. `clavesDeSesiones(...)`.
    3. `multiGet`.
    4. Aplana el resultado, tolerando claves corruptas (`[]` para esa clave).
    5. Ordena por `fecha` descendente y después por `creadaEn` descendente.
  - `guardarMateria({ nombre, categoria })`: lectura estricta, `validarMateria`, rechazo de duplicados y escritura. Devuelve la lista de materias nueva.
  - `actualizarMateria(id, { nombre, categoria })`: lo mismo, con `idExcluir = id`.
  - `eliminarMateria(id)`: `getAllKeys()`, que aquí **sí** lanza si falla, más `clavesDeSesiones` y lectura estricta de cada clave. Si alguna sesión tiene ese `materiaId`, lanza `Error('No puedes borrar una materia que tiene sesiones registradas.')`.
  - `guardarSesionEstudio(datos, { fechaHoy, materias })`:
    1. `validarSesionEstudio(...)`.
    2. Lectura estricta de la clave del mes.
    3. `[nueva, ...delMes]`.
    4. `setItem`.
    5. Devuelve la sesión nueva normalizada.
  - `actualizarSesionEstudio(id, fecha, cambios, { materias })`:
    - lectura estricta de la clave del mes de `fecha`;
    - valida con `{ esEdicion: true }`, que **no** revisa la fecha (Defensa 11);
    - conserva `id`, `fecha` y `creadaEn`, y pone `editadaEn = Date.now()`;
    - devuelve la sesión actualizada.
  - `eliminarSesionEstudio(id, fecha)`: lectura estricta de la clave del mes, filtra y escribe.
  - Si `setItem` falla, guardar, actualizar y borrar **lanzan** el error (Defensa 4).
- Quien llama (`App.js`) actualiza su estado inmutable con la sesión devuelta: `[nueva, ...prev]`, `prev.map(...)` o `prev.filter(...)`. Así no vuelve a cargar todas las claves en cada operación.

## 2. Validación pura (`src/utils/validacionEstudio.js`, archivo nuevo)
Solo importa de `src/utils/dateUtilsLocal.js` (`obtenerDiasEnMes`, `esFechaFutura`), que es puro. **No** importa `storage.js`, para no arrastrar AsyncStorage a las pruebas.
- Constantes: `CATEGORIAS_MATERIA = ['Escuela', 'Personal']`, `NIVELES_COMPRENSION = ['Bien', 'Más o menos', 'No tanto', 'Nada']` y `MINUTOS_MAX = 720`, `APUNTES_MIN = 10`, `APUNTES_MAX = 5000`, `TEMA_MAX = 120`, `MATERIA_MAX = 60`.
- `sanitizarTextoLinea(texto)`: recorta los espacios y convierte los saltos de línea en espacios.
- `esFechaLocalValida(fecha)`: cumple `/^(\d{4})-(\d{2})-(\d{2})$/`, el mes está entre 1 y 12 y el día entre 1 y `obtenerDiasEnMes(anio, mes - 1)`.
- `validarMateria({ nombre, categoria }, materiasExistentes, idExcluir?)` → `{ valido, errores: { nombre?, categoria? }, datos }`.
  - `nombre`: de 1 a 60 caracteres después de sanitizar. Es único sin distinguir mayúsculas, sin contar la materia `idExcluir`.
  - `categoria`: debe ser una de `CATEGORIAS_MATERIA`.
- `validarSesionEstudio(datos, { fechaHoy, materiasExistentes, esEdicion = false })` → `{ valido, errores: { materiaId?, tema?, comprension?, minutos?, apuntes?, fecha? }, datos }`:
  - `materiaId` debe existir en `materiasExistentes`.
  - `tema`: de 1 a 120 caracteres después de `sanitizarTextoLinea`.
  - `comprension` debe ser una de `NIVELES_COMPRENSION`.
  - `minutos`: `Number(...)`, `Number.isInteger`, de 1 a 720.
  - `apuntes`: después de `trim()`, de 10 a 5000 caracteres.
  - Si `!esEdicion`: `esFechaLocalValida(fecha)` y `!esFechaFutura(fecha, fechaHoy)`.
  - Los mensajes de error están en español y listos para mostrarse.

## 3. Estado global y navegación
- **`App.js`**:
  - Estado nuevo: `sesionesEstudio`, `materiasEstudio` y `datosEstudioCargados` (`false` al inicio). Se cargan con `Promise.all([cargarSesionesEstudio(), cargarMaterias()])` en el mismo efecto de arranque que entrenamientos y comidas, y al terminar se pone `datosEstudioCargados = true` (Defensa 12).
  - `sesionesEstudioDeHoy = useMemo(...)`, filtrando por `fechaHoy`.
  - `renderizarVistaActiva` agrega la rama `vistaActiva === 'estudio'`:
    ```jsx
    <EstudioView
      sesionesExternas={sesionesEstudio}
      materiasExternas={materiasEstudio}
      datosCargados={datosEstudioCargados}
      onSesionesActualizadas={setSesionesEstudio}
      onMateriasActualizadas={setMateriasEstudio}
    />
    ```
    `onSesionesActualizadas` y `onMateriasActualizadas` aceptan un actualizador funcional (`prev => ...`).
  - La rama `heatmap` **se mantiene** sin cambios; se sigue llegando por `onIrAHeatmap` desde Inicio.
  - Pasa `contadorEstudioHoy={sesionesEstudioDeHoy.length}` a la barra.
- **`BarraNavegacionInferior.jsx`**:
  - En `PESTANAS`, la entrada `heatmap` se reemplaza por `{ id: 'estudio', etiqueta: 'Estudio', icono: 'book-open', contador: contadorEstudioHoy }`.
  - Recibe la prop nueva `contadorEstudioHoy`.
  - Defensa 8: `const vistaResaltada = PESTANAS.some(t => t.id === vistaActiva) ? vistaActiva : 'bienvenida';`. `indiceActivo` y `esActivo` usan `vistaResaltada`. `manejarPulsarTab` sigue comparando contra `vistaActiva`.
- **`MenuBienvenida.jsx`**: sin cambios. Los botones que ya llaman a `onIrAHeatmap` siguen siendo el acceso a Heatmap.

## 4. Pantallas y componentes nuevos
Todos en `src/components/` con `StyleSheet` nativo, `TOKENS` y Feather. Ningún archivo nuevo debe pasar de 500 líneas.
- **`src/utils/useEstudio.js`** (nuevo): concentra la lógica de `EstudioView` para que la vista se quede en lo visual.
  - Maneja `fechaSeleccionada`, `materiaFiltro` y las listas derivadas `sesionesDelDia`, `sesionesDeMateria` y `diasConSesiones`.
  - `sesionesDelDia` y `sesionesDeMateria` se **ordenan siempre** dentro de su `useMemo`: `fecha` descendente y después `creadaEn` descendente. No dependen del orden del estado, porque `[nueva, ...prev]` desordena cuando se registra un día pasado (CA-8).
  - Envuelve las llamadas a `estudioStorage` con actualización inmutable del estado de `App`.
- **`EstudioView.jsx`**:
  - Si `!datosCargados`, muestra un estado de carga (`ActivityIndicator` con tokens).
  - **Modo por día** (sin filtro):
    - `SelectorSemanal` con `diasConActividad = diasConSesiones`;
    - encabezado «Estudio de hoy» o «Estudio del DD/MM» con el icono de gestión de materias (`sliders`);
    - lista de `TarjetaSesionEstudio` del día, o un estado vacío;
    - botón inferior «Nueva sesión» de 54 dp, como el guardado de Live Mode, respetando `insets.bottom` y la barra flotante.
  - **Modo filtro por materia**:
    - una fila horizontal de pastillas de materias arriba («Todas» regresa a la vista por día);
    - la lista de todas las sesiones de la materia, de la más reciente a la más antigua, con la fecha visible.
  - Entrada de la lista con `FadeIn` de Reanimated.
- **`TarjetaSesionEstudio.jsx`**:
  - Muestra materia, una insignia de categoría, el tema, una insignia de comprensión con 4 tonos neutros de los tokens y los minutos.
  - En el modo filtro muestra también la fecha (`formatearFechaLegible` de `dateUtilsLocal.js`).
  - Al tocarla abre el detalle.
- **`SesionEstudioModal.jsx`** (crear y editar, `onRequestClose`):
  - Campos en orden: materia (pastillas más «+ Nueva materia», que despliega en línea el nombre y el selector Escuela/Personal y la guarda con `guardarMateria`), tema, comprensión (selector tipo pastilla de 4 niveles), minutos (chips 15/30/45/60/90 más campo numérico) y apuntes (multilínea con contador `n/5000`).
  - Al guardar:
    - si `guardandoRef.current` está activo, sale;
    - activa el candado y deshabilita el botón;
    - valida y muestra los errores bajo cada campo;
    - si es válido, guarda o actualiza y actualiza el estado de `App`;
    - en `finally`, libera el candado.
  - Ante un error de almacenamiento, `Alert` y **no** cierra.
  - Teclado (Defensa 9): `Keyboard.addListener('keyboardDidShow'/'keyboardDidHide')`. Con el teclado visible se oculta la barra de guardar y aparece «Listo» (`Keyboard.dismiss()`). `ScrollView` con `keyboardShouldPersistTaps="handled"`.
  - En edición, la fecha se muestra pero no se puede cambiar.
- **`DetalleSesionEstudioModal.jsx`** (`onRequestClose`):
  - Muestra todos los campos y los apuntes completos, con scroll.
  - «Editar» abre `SesionEstudioModal` en modo edición.
  - «Borrar» usa el mismo patrón de pulsación sostenida que `NutricionView` (`DURACION_PULSACION_BORRADO_MS = 1000`, `vibrarInicioPresionBorrado` y `vibrarConfirmacionBorrado`).
- **`GestionMateriasModal.jsx`** (`onRequestClose`): lista las materias con su conteo de sesiones (calculado de `sesionesExternas`). Permite renombrar o cambiar la categoría, y borrar con el mensaje de bloqueo si hay sesiones.
- **Hápticos**: `vibrarSeleccionBascula` en pastillas y chips, y `vibrarSerieAgregada` al guardar una sesión. No se crean funciones hápticas nuevas.

## 5. Pruebas (Jest)
- `__tests__/validacionEstudio.test.js` (sin mocks):
  - minutos en 0/1/720/721 y `1.5`;
  - apuntes de 9/10/5000/5001 caracteres;
  - tema vacío o solo espacios;
  - comprensión inválida;
  - fecha futura, `2026-02-30` y válida;
  - en edición, una fecha futura **no** se rechaza;
  - materia duplicada sin distinguir mayúsculas y `idExcluir`.
- `__tests__/estudioStorage.test.js` (mock oficial de AsyncStorage, como `apiKeyStorage.test.js`):
  - guardar y cargar; dos meses distintos generan dos claves;
  - actualizar conserva `id`, `fecha` y `creadaEn`;
  - eliminar;
  - JSON corrupto: la carga tolera y al guardar se crea la clave `:corrupto:`;
  - `getItem` que rechaza: guardar lanza un error y `setItem` no se llama (CA-14);
  - dos `guardarSesionEstudio` en paralelo dejan las 2 sesiones (CA-15);
  - `eliminarMateria` con sesiones lanza un error.

## 6. Archivos
- Nuevos:
  - `src/services/estudioStorage.js`
  - `src/utils/validacionEstudio.js`
  - `src/utils/useEstudio.js`
  - `src/components/EstudioView.jsx`
  - `src/components/TarjetaSesionEstudio.jsx`
  - `src/components/SesionEstudioModal.jsx`
  - `src/components/DetalleSesionEstudioModal.jsx`
  - `src/components/GestionMateriasModal.jsx`
  - las dos suites de prueba
- Modificados: `App.js` y `src/components/BarraNavegacionInferior.jsx`.
- Sin cambios: `storage.js`, `HeatmapView.jsx`, `MenuBienvenida.jsx`, `DaySummaryModal.jsx` y `gemini.js`.
