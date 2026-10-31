# Spec 015: Apartado de Estudio (registro local de sesiones)

## 1. Visión y Justificación del Problema
Hasta la Spec 013 la app solo cubre el cuerpo: entrenamientos, comidas y cambio físico. El objetivo es convertirla en una app para el día a día, y el siguiente hábito que se quiere registrar es el **estudio**. Aplica tanto al de la escuela como al aprendizaje por cuenta propia, y para cualquier persona que use la app.

Esta Spec agrega un apartado de **Estudio** propio, 100 % local y sin IA. En él el usuario registra cada sesión de estudio con la materia, el tema exacto, qué tan bien lo comprendió, cuánto tiempo le dedicó y sus apuntes. Después puede revisar qué estudió y cuándo. El análisis con Gemini queda fuera de esta Spec: lo cubre la Spec 016, que se apoya en los datos que se crean aquí.

## 2. Requerimientos Funcionales (RF)
- **RF-1 (Pestaña Estudio en lugar de Heatmap)**:
  - En `BarraNavegacionInferior.jsx`, la pestaña `heatmap` se reemplaza por `{ id: 'estudio', etiqueta: 'Estudio', icono: 'book-open' }`. La barra sigue teniendo 5 pestañas.
  - La pestaña muestra el contador de sesiones de estudio de hoy, con el mismo comportamiento que los contadores de Entrenos, Nutrición y Físico.
- **RF-2 (Heatmap sigue accesible desde Inicio)**:
  - La vista `HeatmapView` no se elimina. Se abre con los accesos que ya existen en `MenuBienvenida.jsx` («Ver Año» y «Ver Heatmap Anual Completo», que llaman a `onIrAHeatmap`).
  - Mientras se ve Heatmap, el indicador de la barra queda sobre Inicio. El botón Atrás de Android y la pestaña Inicio regresan al inicio.
  - Una Spec futura reubicará Heatmap. Esta Spec no cambia su lógica ni su intensidad.
- **RF-3 (Materias del usuario)**:
  - El usuario crea sus propias materias, con un nombre y una categoría: `Escuela` o `Personal`.
  - Al registrar una sesión puede elegir una materia existente o crear una nueva en el mismo flujo, sin salir del formulario.
  - No se permiten dos materias con el mismo nombre, sin distinguir mayúsculas ni espacios al inicio y al final.
  - Una materia siempre se puede renombrar y cambiar de categoría, pero solo se puede borrar si no tiene sesiones.
- **RF-4 (Sesión de estudio con todos los campos obligatorios)**: Cada sesión registra:
  - `materia` (una materia existente);
  - `tema`: el tema exacto estudiado, de 1 a 120 caracteres;
  - `comprension`, uno de 4 niveles en este orden: `Bien`, `Más o menos`, `No tanto`, `Nada`;
  - `minutos`: entero mayor a 0 y como máximo 720. El formulario ofrece chips rápidos de 15, 30, 45, 60 y 90, además de entrada manual;
  - `apuntes`: texto de 10 a 5000 caracteres, sin contar espacios al inicio y al final;
  - `fecha`: el día elegido en el selector, en formato local `YYYY-MM-DD`.
  
  No se puede guardar una sesión con un campo vacío o inválido. El formulario señala el campo con problema.
- **RF-5 (Fechas permitidas)**:
  - Se pueden crear sesiones **hoy y en días pasados**, nunca en días futuros.
  - El día se elige con `SelectorSemanal`, que ya muestra hoy y los 6 días anteriores. A diferencia de Entrenos, en Estudio los días pasados del selector **sí** permiten crear sesiones.
  - La fecha de una sesión no se puede editar después de guardarla.
- **RF-6 (Pantalla `EstudioView`)**:
  - Arriba, `SelectorSemanal`, con el punto de actividad en los días que tienen sesiones de estudio.
  - Debajo, la lista de sesiones del día elegido. Cada tarjeta muestra materia, categoría, tema, nivel de comprensión y minutos.
  - Botón primario «Nueva sesión» en la zona del pulgar.
  - Estado vacío claro cuando el día no tiene sesiones.
- **RF-7 (Detalle, edición y borrado)**:
  - Al tocar una sesión se abre su detalle con todos los campos y los apuntes completos.
  - Desde el detalle la sesión se puede **editar** (todos los campos menos la fecha, con las mismas validaciones) y **borrar** con la confirmación segura de la Spec 001 (`vibrarInicioPresionBorrado` / `vibrarConfirmacionBorrado`).
- **RF-8 (Historial por materia)**:
  - Un filtro por materia muestra **todas** las sesiones de esa materia, de cualquier fecha, ordenadas de la más reciente a la más antigua. Cada una indica su fecha.
  - Desde ahí también se puede abrir el detalle de cada sesión.
- **RF-9 (Estudio vive solo en su pestaña)**:
  - Fuera de la pestaña Estudio, lo único nuevo es el contador de la barra (RF-1). Estudio no aparece en Inicio ni en `DaySummaryModal`.
  - `obtenerDiasConActividad` no cambia, y el mapa de calor tampoco.
- **RF-10 (Estética y movimiento de la app actual)**:
  - Tokens de `src/theme/tokens.js` (paleta `#0A0A0A` / `#141414` / `#262626`).
  - Selector tipo pastilla con `vibrarSeleccionBascula`, como en `CalculadoraPesoModal`, para la categoría y la comprensión.
  - Entradas `FadeIn` de Reanimated y físicas de resorte iguales a las de `SelectorSemanal`.
  - Touch targets de 44×44 pt o más y `useSafeInsets()`.
  - Manejo de teclado con `Keyboard.addListener`.
  - Iconos Feather exclusivamente y cero emojis.

## 3. Casos Límite y Defensas
- **Defensa 1 (Sin dependencias nuevas)**: Todo se construye con librerías ya instaladas. No se ejecuta `npx expo install`.
- **Defensa 2 (Fechas locales)**: Toda fecha se obtiene con `obtenerFechaLocal()`. Prohibido `toISOString()` y `new Date('YYYY-MM-DD')`. Cualquier fecha posterior a hoy se rechaza en la validación, no solo en la interfaz.
- **Defensa 3 (Lectura fallida o datos corruptos, sin perder historial)**: Hay dos caminos de lectura.
  - **Para mostrar**: si una clave contiene JSON inválido o algo que no es un arreglo, devuelve `[]` para esa clave sin romper la pantalla.
  - **Antes de escribir** (guardar, actualizar, borrar) se usa una lectura **estricta**. Si `getItem` falla, se **lanza** el error y no se escribe nada, porque nunca se escribe sobre un `[]` que vino de un error. Si el JSON está corrupto, primero se respalda el texto crudo en `<clave>:corrupto:<timestamp>` y después se continúa con una lista vacía para esa clave.
  - Las sesiones cuya materia ya no existe se muestran como «Sin materia» y no hacen fallar la lista.
- **Defensa 4 (Escritura fallida y concurrencia)**:
  - Guardar, actualizar y borrar **lanzan error** si AsyncStorage falla. Así la interfaz no muestra datos que no quedaron guardados. El formulario no se cierra y avisa del error.
  - Todas las escrituras de estudio pasan por una **cola serial** (cadena de promesas), para que dos operaciones no lean y escriban a la vez.
  - El botón Guardar se bloquea mientras guarda (`guardandoRef`), así que un doble toque crea una sola sesión.
- **Defensa 10 (Tamaño del almacenamiento)**:
  - Las sesiones **no** se guardan en una sola clave que crece sin límite. Van **en una clave por mes**: `@fitness_tracker_sesiones_estudio_v1:YYYY-MM`. Así cada fila queda muy por debajo del límite de CursorWindow de Android (~2 MB por fila), aun con apuntes largos.
  - La carga total junta todas las claves del prefijo con `getAllKeys` y `multiGet`.
  - Las materias (pocas y pequeñas) van en una sola clave.
- **Defensa 5 (Inmutabilidad)**: Todas las actualizaciones usan spread y devuelven arreglos nuevos.
- **Defensa 6 (Sanitización)**: `tema` y el nombre de la materia se recortan y se les quitan los saltos de línea. `apuntes` conserva los saltos de línea pero se recorta al inicio y al final. `minutos` se convierte a entero y se rechaza si es `NaN`, decimal, 0, negativo o mayor a 720.
- **Defensa 7 (Borrado de materia con sesiones)**: `eliminarMateria` rechaza la operación si existe al menos una sesión con esa materia, y la interfaz explica por qué. Nunca quedan sesiones huérfanas por esta vía.
- **Defensa 8 (Indicador de la barra fuera de pestañas)**:
  - Cuando `vistaActiva` es `heatmap`, que ya no es una pestaña, la barra calcula una `vistaResaltada = 'bienvenida'` **solo** para la pastilla y el color de la etiqueta. Inicio se ve activo y sin saltos raros.
  - `manejarPulsarTab` sigue comparando contra la `vistaActiva` real, así que tocar Inicio desde Heatmap sí regresa al inicio.
- **Defensa 9 (Teclado y apuntes largos)**: Mismo patrón que Live Mode.
  - El formulario se desplaza (`ScrollView`) con el teclado abierto.
  - Mientras el teclado está visible, la barra inferior de guardar se oculta y aparece un botón «Listo» que cierra el teclado. Al cerrarse, la barra de guardar vuelve a aparecer.
- **Defensa 11 (Edición con fecha antigua)**: Al editar una sesión no se vuelve a validar su fecha. Se conserva la guardada, así que un cambio de reloj del dispositivo no puede bloquear la edición por un campo que no se puede modificar.
- **Defensa 12 (Materias cargadas antes de mostrar)**:
  - Las materias se cargan en `App.js` junto con las sesiones. La vista Estudio se remonta en cada cambio de pestaña (`key={vistaActiva}`), así que no puede depender de una carga local.
  - Mientras `datosEstudioCargados` sea `false`, la lista muestra un estado de carga en lugar de tarjetas «Sin materia».
- **Defensa 13 (Modales)**: Todos los modales nuevos definen `onRequestClose`, para que el botón Atrás de Android los cierre.

## 4. Criterios de Aceptación (CA)
- **CA-1**: La barra inferior muestra 5 pestañas: Inicio, Entrenos, Nutrición, Físico y Estudio (icono `book-open`). Heatmap ya no es una pestaña.
- **CA-2**: Desde Inicio, «Ver Año» y «Ver Heatmap Anual Completo» siguen abriendo `HeatmapView` con su funcionalidad intacta. El botón Atrás de Android regresa al inicio.
- **CA-3**: Se puede crear una materia con categoría `Escuela` o `Personal` dentro del formulario de nueva sesión. Crear una materia con un nombre que ya existe (sin distinguir mayúsculas) se rechaza con un mensaje.
- **CA-4**: Con algún campo vacío o inválido (tema vacío, apuntes de menos de 10 caracteres, minutos en 0 o no numéricos, sin comprensión o sin materia), la sesión no se guarda y se señala el campo.
- **CA-5**: Una sesión válida aparece en la lista del día elegido en el selector. Al cerrar y volver a abrir la app sigue ahí, porque se guarda en AsyncStorage.
- **CA-6**: Se pueden crear sesiones en cualquiera de los 7 días del selector. La función de validación rechaza una fecha futura aunque se llame directamente.
- **CA-7**:
  - Al editar una sesión cambian sus datos sin cambiar su fecha, su `id` ni su `creadaEn`.
  - El borrado usa el mismo patrón que Nutrición: pulsación sostenida de `DURACION_PULSACION_BORRADO_MS` (1000 ms), `vibrarInicioPresionBorrado` al empezar y `vibrarConfirmacionBorrado` al confirmar. Después la sesión desaparece de la lista y del almacenamiento.
  - Soltar antes de los 1000 ms no borra nada.
- **CA-8**: El filtro por materia muestra todas las sesiones de esa materia, de cualquier fecha, ordenadas de la más reciente a la más antigua y con su fecha visible.
- **CA-9**: Una materia sin sesiones se puede borrar. Una con sesiones no, y se informa el motivo. Renombrar se refleja en todas sus sesiones.
- **CA-10**: El contador de la pestaña Estudio muestra las sesiones de hoy y se actualiza al crear o borrar una sesión de hoy, sin reiniciar la app.
- **CA-11**: Ni Inicio, ni `DaySummaryModal`, ni el mapa de calor cambian su contenido ni su cálculo por las sesiones de estudio.
- **CA-12**: Cero emojis. Solo iconos Feather, tokens de `tokens.js` y touch targets de 44 pt o más en todos los elementos nuevos.
- **CA-13**: `npm run gate` termina en verde, con las suites nuevas de validación y de almacenamiento de estudio incluidas.
- **CA-14**: Las sesiones se guardan en claves mensuales `@fitness_tracker_sesiones_estudio_v1:YYYY-MM`. Con `getItem` mockeado para que rechace, `guardarSesionEstudio` lanza un error y **no** llama a `setItem`. Con JSON corrupto en una clave, al guardar se crea el respaldo `:corrupto:` antes de escribir (pruebas unitarias).
- **CA-15**: Un doble toque rápido en Guardar crea una sola sesión. Dos `guardarSesionEstudio` lanzados en paralelo terminan con las dos sesiones guardadas, sin que una pise a la otra (prueba unitaria de la cola).
