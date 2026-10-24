# Especificación Funcional: 003-registro-entrenamientos-activo — Rediseño Funcional del Registro de Entrenamientos, Catálogo Extendido, Live Mode con Auto-Save y Regla de Inmutabilidad Temporal

- **ID de Funcionalidad:** `003-registro-entrenamientos-activo`
- **Estado:** borrador-aprobado-grillme
- **Fecha:** 2026-10-23
- **Metodología:** Spec-Driven Development (SDD)

---

## 1. Resumen y Propósito

Rediseñar completamente la experiencia de registro de entrenamientos de fuerza en la pestaña `⚡ Entrenamientos` para eliminar la fricción entre series durante la sesión de gimnasio.

El nuevo flujo introduce:
1. **Selector Semanal Superior con Inmutabilidad Temporal:** Una barra interactiva de los 7 días de la semana que permite consultar el historial de cualquier día. Establece una regla de negocio estricta: **únicamente se pueden registrar, agregar series o eliminar ejercicios en la FECHA LOCAL ACTUAL**. Días pasados o futuros se muestran en **Modo Solo Lectura** con banner informativo de historial y sin botones de modificación.
2. **Catálogo de Ejercicios Extendido (~45 ejercicios comunes):** Buscador en tiempo real por texto y filtro por grupos musculares (`Pecho`, `Espalda`, `Pierna`, `Hombro`, `Brazo`, `Core`), con insignias visuales de alto contraste y código de color por músculo, más la opción de crear ejercicios personalizados guardados localmente.
3. **Flujo de Ejercicio Activo (Live Mode):** Vista dedicada a pantalla completa con cabecera minimalista que oculta la barra de navegación inferior y bloquea la navegación hacia atrás de Android para evitar salidas accidentales. Inicia con `[Serie 1 | Peso | Reps]` y un botón `+` rápido que **autorrellena automáticamente** el peso y repeticiones de la serie anterior para registrar en segundos.
4. **Resistencia a fallos y Auto-Save de Sesión Activa (`Draft`):** Cada serie, peso y repetición se persiste en tiempo real en un borrador local (`@fitness_tracker_sesion_activa_draft_v1`). Si el celular se bloquea, entra en reposo, se apaga o el sistema operativo cierra la app en segundo plano, al reabrir la app el Live Mode se reanuda intacto con todas las series acumuladas.
5. **Consolidación y Descarte:** Solo al pulsar **"Terminar Ejercicio"** se valida y consolida el ejercicio con su arreglo de series en el historial definitivo de hoy (`AsyncStorage`), limpiando el borrador y actualizando contadores y mapa de calor. Si el usuario desea salir sin guardar, un botón secundario **"Descartar Ejercicio"** con confirmación `Alert.alert` limpia el borrador y regresa a la lista sin registrar nada.
6. **Estructura Híbrida y Modular para Futuro Heatmap Anual:** Guarda el desglose completo `seriesDetalle: [{ serie, peso, repeticiones }]` y campos calculados (`series`, `pesoMaximo`, `volumenTotal`), garantizando compatibilidad 100% con `MenuBienvenida`, `HeatmapSemanal` y el análisis multimodal de Gemini.

---

## 2. Historias de Usuario (HU-x)

- **HU-1 (Inmutabilidad temporal y navegación histórica semanal):**
  *Como* usuario que revisa su progreso,
  *quiero* tocar cualquier día en la barra semanal superior para ver qué ejercicios completé en esa fecha, y que si selecciono un día pasado o futuro la app me muestre claramente que es un registro histórico de solo lectura (ocultando los botones de agregar o borrar),
  *para* proteger la veracidad de mi historial contra alteraciones accidentales y registrar entrenamientos únicamente el día que ocurren.

- **HU-2 (Búsqueda rápida en catálogo de gimnasio y creación de personalizados):**
  *Como* usuario en la sala de pesas,
  *quiero* seleccionar el ejercicio buscando por nombre o filtrando por grupo muscular en una lista con códigos de color e iconos temáticos, o crear uno propio si mi gimnasio tiene una máquina no listada,
  *para* iniciar mi entrenamiento en menos de 3 segundos sin tener que escribir todo el nombre manualmente cada vez.

- **HU-3 (Live Mode sin distracciones y con pantalla bloqueada):**
  *Como* atleta entrenando una serie pesada,
  *quiero* que al seleccionar un ejercicio se abra una vista dedicada donde no pueda cambiar de pestaña accidentalmente ni salir sin querer por tocar el botón atrás,
  *para* concentrarme al 100% en el levantamiento y tener mis controles de series siempre listos.

- **HU-4 (Adición ultra rápida de series con autorrelleno):**
  *Como* levantador que suele mantener el peso o hacer pequeñas variaciones entre series,
  *quiero* presionar un botón `+` y que la nueva serie aparezca ya pre-llenada con el peso y repeticiones de la serie que acabo de hacer,
  *para* no tener que reescribir `80 kg × 10` cuatro veces seguidas y solo editar cuando cambie la carga.

- **HU-5 (Auto-Save de sesión activa ante bloqueo o cierre de app):**
  *Como* usuario cuyo teléfono se suspende entre series largas o que cambia a la app de música o cámara,
  *quiero* que si el celular entra en reposo o la app se reinicia, mis series ya registradas en el ejercicio activo sigan ahí intactas al volver a abrirla,
  *para* no perder nunca el conteo de series de un ejercicio a la mitad.

- **HU-6 (Finalización o descarte del ejercicio activo):**
  *Como* usuario que concluye un ejercicio o decide no hacerlo por falta de equipo disponible,
  *quiero* poder presionar "Terminar Ejercicio" para consolidarlo en mi día, o "Descartar Ejercicio" con confirmación para salir sin ensuciar mi historial,
  *para* mantener mi registro limpio y preciso.

---

## 3. Requisitos Funcionales (RF-x) — Notación EARS en Español

### 3.1. Navegación Semanal e Inmutabilidad Temporal

- **RF-1 (Ubicuo — Selector semanal superior interactivo):** El sistema deberá presentar en la parte superior de la vista de entrenamientos una barra semanal interactiva que muestre los 7 días calendario del periodo actual (inicial del día, día del mes y formato `DD/MM`), destacando visualmente el día seleccionado y si cuenta con actividad en verde acento (`#00E676`).
- **RF-2 (Dirigido por eventos — Selección de fecha en la barra):** Cuando el usuario presione cualquier celda de la barra semanal, el sistema deberá filtrar y listar de forma inmutable los ejercicios correspondientes a esa fecha local (`YYYY-MM-DD`). Si no existen entrenamientos para dicha fecha, deberá mostrar el estado vacío indicando que no hubo registros ese día.
- **RF-3 (Dirigido por estado — Modo Edición en Fecha Local Actual):** Mientras la fecha seleccionada coincida exactamente con la fecha local de hoy (`fechaSeleccionada === obtenerFechaLocal()`), el sistema deberá permitir el flujo completo de registro (botón visible `"+ Iniciar Ejercicio"`) y mostrar en cada tarjeta de ejercicio completado el botón de borrado seguro `🗑 1s`.
- **RF-4 (Dirigido por estado — Modo Solo Lectura en Fechas Pasadas o Futuras):** Mientras la fecha seleccionada sea diferente de la fecha local de hoy (`fechaSeleccionada !== obtenerFechaLocal()`), el sistema deberá:
  - Desplegar un banner superior informativo de estado: `"🔒 Historial (Solo lectura) · Registros de días pasados no pueden modificarse"`.
  - Ocultar el botón `"+ Iniciar Ejercicio"`.
  - Ocultar los botones de borrado `🗑 1s` de las tarjetas históricas o sustituirlos por una insignia informativa de solo lectura.

### 3.2. Catálogo de Ejercicios y Ejercicios Personalizados

- **RF-5 (Ubicuo — Catálogo inicial integrado de ~45 ejercicios comunes):** El sistema deberá proveer un catálogo estático offline con al menos 40–45 ejercicios estándar de gimnasio distribuidos en 6 grupos musculares principales:
  - **Pecho (`#FF5252`):** Press banca barra, press inclinado mancuernas, aperturas polea, fondos paralelas, press declinado, aperturas pec deck, flexiones.
  - **Espalda (`#448AFF`):** Jalón al pecho, remo con barra, remo en polea baja, dominadas, peso muerto convencional, remo mancuerna unilateral, pull-over polea.
  - **Pierna / Glúteo (`#00E676`):** Sentadilla libre barra, prensa 45°, peso muerto rumano, zancadas, curl femoral acostado, extensiones de cuádriceps, elevación de talones gemelos, hip thrust.
  - **Hombro (`#FFAB00`):** Press militar mancuernas, elevaciones laterales polea, pájaros posteriores, press militar barra, elevaciones frontales, face pull.
  - **Brazo (`#E040FB`):** Curl bíceps barra z, extensiones tríceps polea alta, curl martillo, press francés barra z, curl bíceps banco inclinado, fondos tríceps máquina.
  - **Core / Abdomen (`#FF6D00`):** Crunches en polea, elevaciones de piernas colgado, plancha isométrica, rueda abdominal.
- **RF-6 (Ubicuo — Identificador visual de alto contraste):** Cada elemento del catálogo deberá mostrar una miniatura visual con el color temático de su grupo muscular, una abreviatura/ícono de la máquina o implemento (`Barra`, `Mancuerna`, `Polea`, `Máquina`, `Corporal`) y el nombre oficial del ejercicio.
- **RF-7 (Dirigido por eventos — Filtro y buscador en tiempo real):** Cuando el usuario escriba en el buscador o seleccione un chip de grupo muscular (`Todos`, `Pecho`, `Espalda`, etc.), el sistema deberá filtrar en tiempo real los resultados sin recargas.
- **RF-8 (Dirigido por eventos — Creación de ejercicio personalizado):** Cuando el usuario no encuentre un ejercicio y pulse `"+ Crear ejercicio personalizado"`, el sistema deberá desplegar un modal para ingresar nombre y grupo muscular, guardándolo de forma inmutable en `AsyncStorage` (`@fitness_tracker_catalogo_personalizado_v1`) y sumándolo al catálogo disponible.

### 3.3. Flujo de Ejercicio Activo (Live Mode) y Auto-Save de Sesión

- **RF-9 (Dirigido por eventos — Entrada a Live Mode):** Cuando el usuario seleccione un ejercicio del catálogo, el sistema deberá abrir la vista de Live Mode a pantalla completa, ocultar la barra de navegación inferior (`BarraNavegacionInferior`) e interceptar el botón físico/gesto atrás de Android (`BackHandler.addEventListener('hardwareBackPress')`) para evitar abandonos involuntarios.
- **RF-10 (Ubicuo — Fila inicial y adición de series con autorrelleno):** El Live Mode deberá inicializar con `Serie 1` editable (`Peso kg` y `Reps`), y cada vez que el usuario presione el botón `"+ Añadir Serie"`, el sistema deberá insertar una nueva fila (`Serie 2`, `Serie 3`...) **pre-cargando automáticamente los valores de peso y repeticiones de la serie anterior inmediata**.
- **RF-11 (Ubicuo — Auto-Save en Borrador en Tiempo Real):** Cada vez que se agregue una serie, se elimine una serie o se modifique un input de peso o repeticiones, el sistema deberá serializar de forma asíncrona e inmutable el estado actual del ejercicio (`idEjercicio`, `nombre`, `grupoMuscular`, `seriesDetalle`, `iniciadoEn`) en la clave `@fitness_tracker_sesion_activa_draft_v1` de `AsyncStorage`.
- **RF-12 (Dirigido por estado — Restauración automática de sesión activa):** Al iniciar o regresar a la app, si existe un borrador activo en `@fitness_tracker_sesion_activa_draft_v1`, el sistema deberá reanudar inmediatamente el Live Mode con todas las series y datos intactos tal como estaban antes de que la app entrara en reposo o se cerrara.
- **RF-13 (Dirigido por eventos — Descarte de sesión activa):** Cuando el usuario presione el botón `"✕ Descartar Ejercicio"`, el sistema deberá mostrar una alerta de confirmación (`Alert.alert`) advirtiendo que se perderán las series actuales. Si el usuario confirma, el sistema deberá remover la clave `@fitness_tracker_sesion_activa_draft_v1` de `AsyncStorage` y regresar a la vista de entrenamientos sin modificar el historial.

### 3.4. Finalización, Consolidación y Estructura Híbrida

- **RF-14 (Dirigido por eventos — Finalización y validación de series):** Cuando el usuario presione `"✓ Terminar Ejercicio"`, el sistema deberá validar que todas las series registradas contengan valores válidos (`peso >= 0` y `repeticiones > 0`). Si alguna serie está incompleta o con valores no numéricos, deberá indicar el error y señalar la fila correspondiente sin salir del Live Mode.
- **RF-15 (Dirigido por eventos — Consolidación inmutable en el historial):** Cuando la validación sea exitosa, el sistema deberá:
  - Generar el objeto de entrenamiento consolidado con la estructura híbrida:
    - `id`: `${Date.now()}-${random}`
    - `ejercicio`: `nombreEjercicio`
    - `grupoMuscular`: `grupo`
    - `fecha`: `obtenerFechaLocal()` (siempre la fecha actual de hoy)
    - `creadoEn`: `Date.now()`
    - `seriesDetalle`: arreglo inmutable `[{ serie: 1, peso: X, repeticiones: Y }, ...]`
    - `series`: cantidad total de series (`seriesDetalle.length`)
    - `peso`: peso máximo alcanzado en la sesión
    - `repeticiones`: suma total de repeticiones de la sesión
    - `pesoMaximo`: valor numérico del peso más alto
    - `volumenTotal`: sumatoria de `(peso * repeticiones)` de todas las series
  - Guardarlo en `@fitness_tracker_entrenamientos_v1` mediante `guardarEntrenamiento()`.
  - Remover el borrador `@fitness_tracker_sesion_activa_draft_v1`.
  - Emitir retroalimentación háptica de éxito y regresar a la lista del día.
- **RF-16 (Ubicuo — Borrado seguro en el día actual):** Cada ejercicio consolidado mostrado en la lista de hoy deberá contar con el botón `🗑 1s` (`delayLongPress={1000}`) con doble pulso háptico para eliminarlo definitivamente si el usuario lo decide.

---

## 4. Casos Límite (Edge Cases)

1. **Teléfono apagado por batería baja o app cerrada por el sistema operativo en segundo plano:**
   - Gracias al auto-save en `@fitness_tracker_sesion_activa_draft_v1` (`RF-11`), al volver a abrir la aplicación la sesión activa se restaura con cada serie, peso y repetición previa sin pérdida de información.
2. **Cambio de fecha a medianoche mientras se está entrenando en Live Mode:**
   - La sesión en curso se consolida con la fecha local en la que se presione "Terminar Ejercicio". La inmutabilidad temporal evalúa la fecha local en tiempo real al finalizar.
3. **Usuario intenta agregar series con valores negativos o texto:**
   - Los inputs filtran caracteres inválidos y el validador de `Terminar Ejercicio` exige `Number.isFinite(peso) && peso >= 0 && repeticiones > 0`.
4. **Intento de pulsar el botón atrás de Android durante el Live Mode:**
   - El evento es capturado por `BackHandler` y en lugar de cerrar la pantalla o salir de la app, se despliega la alerta de confirmación para preguntar si desea descartar o continuar entrenando.
5. **Usuario consulta un día pasado sin entrenamientos:**
   - Se muestra un estado vacío limpio que dice *"No hubo entrenamientos registrados el [Fecha]"*, acompañado del banner de solo lectura.

---

## 5. Fuera de Alcance (Out of Scope)

- **Temporizador o cronómetro de descanso entre series:** Descartado explícitamente en el grill-me para priorizar la máxima velocidad de registro sin elementos que ralenticen el flujo.
- **Edición de entrenamientos de días pasados:** Queda terminantemente prohibido por la regla de inmutabilidad temporal (`RF-4`).
- **Sincronización en la nube o multi-usuario:** Todo permanece 100% Local-First en el almacenamiento del dispositivo.
