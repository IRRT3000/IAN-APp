# Especificación Funcional: 002-analisis-cambio-fisico — Análisis Multimodal de Cambio Físico con Báscula Circular, Perfil Biológico y Comparativa Bajo Demanda

- **ID de Funcionalidad:** `002-analisis-cambio-fisico`
- **Estado:** aprobado
- **Fecha:** 2026-10-23
- **Metodología:** Spec-Driven Development (SDD)

---

## 1. Resumen y Propósito

Incorporar una **cuarta pestaña dedicada (`💪 Físico`)** en la barra de navegación inferior que permita al usuario registrar y analizar su evolución física mediante **1 a 10 fotografías** por sesión usando Gemini Vision.

Antes de analizar las fotografías, la aplicación despliega un **menú interactivo** donde el usuario registra:
1. **El peso corporal** mediante una interfaz visual estilo **báscula moderna circular** (donde el peso a seleccionar se visualiza dentro de un círculo interactivo, partiendo de `74.0 kg` por defecto o del último peso registrado).
2. **La hora de la toma en formato de 12 horas (`hh:mm AM/PM`)** junto con el **momento del día** (`En ayunas`, `Mediodía`, `Post-entreno`, `Noche`).

El análisis de Gemini toma en cuenta **absolutamente todos los datos del usuario**:
- **Edad exacta** calculada con complejidad $O(1)$ a partir de la fecha de nacimiento `26/11/2010`.
- **Tiempo entrenando** calculado con complejidad $O(1)$ desde el `01/11/2025`.
- **Propiedades físicas y de perfil**: Altura (`182 cm` / `1.82 m`), peso seleccionado (`74 kg` base), sexo (`Hombre`) y objetivo actual (`Mantenimiento` por defecto, preparado en código y almacenamiento para poder cambiarse en el futuro).
- **Actividad del día actual (`YYYY-MM-DD`)**: Comidas registradas (calorías y macronutrientes) y entrenamientos de fuerza registrados en el día.

Gemini devuelve en JSON válido:
- Un **resumen general muy simple** (visible inmediatamente en la tarjeta del registro).
- Un **resumen muy detallado** (almacenado en `AsyncStorage` y listo en el modelo de datos para utilizarse en una siguiente Spec, sin mostrarse aún en la vista principal).
- Una **evaluación breve del día** señalando lo bueno o lo malo en función de las comidas y/o entrenamientos registrados hoy.
- Un **veredicto en escala `0/10`** fundamentado en todas las propiedades del usuario y sus registros.

Adicionalmente, una vez completado el análisis del nuevo registro, el usuario dispone de un **botón de comparación opcional** que, con **un solo toque**, dispara simultáneamente una **vibración háptica** y la **comparación en Gemini** entre el registro anterior y el nuevo análisis/fotos para ofrecer recomendaciones de optimización.

Finalmente, se elimina por completo el modelo `gemini-3.8-flash` de toda la aplicación (tanto para comida como para cambio físico) por presentar fallos constantes.

---

## 2. Historias de Usuario (HU-x)

- **HU-1 (Acceso a la cuarta pestaña de Cambio Físico):**
  *Como* usuario de la aplicación,
  *quiero* contar con una cuarta pestaña en la barra de navegación inferior (`💪 Físico`),
  *para* acceder directamente a mi módulo de análisis y seguimiento de cambio físico sin mezclar las vistas de entrenamientos ni de comida.

- **HU-2 (Selección de 1 a 10 fotos por sesión):**
  *Como* usuario que evalúa su físico desde distintos ángulos (frente, perfil, espalda, poses),
  *quiero* poder adjuntar entre **1 y 10 fotografías como máximo** antes de ejecutar el análisis,
  *para* que Gemini evalúe mi estado físico completo en una sola sesión.

- **HU-3 (Menú interactivo con báscula circular moderna y hora en 12h):**
  *Como* usuario registrando un chequeo físico,
  *quiero* que cada vez que vaya a analizar mis fotos se muestre un menú interactivo donde seleccione mi peso en una **báscula circular moderna** (con el peso dentro de un círculo central, iniciando en `74 kg` o mi último peso) y la hora en **formato de 12 horas (`AM/PM`)** más el momento del día,
  *para* contextualizar con precisión las condiciones en las que se tomaron las fotos.

- **HU-4 (Cálculo instantáneo de edad exacta y tiempo de entrenamiento):**
  *Como* usuario nacido el `26/11/2010` que empezó a entrenar el `01/11/2025`,
  *quiero* que la app calcule automáticamente y con el máximo rendimiento mi edad exacta y el tiempo que llevo entrenando junto con mi perfil (`182 cm`, `74 kg`, `Hombre`, objetivo `Mantenimiento` configurable),
  *para* que el veredicto `0/10` de Gemini sea realista y acorde a mi etapa biológica y experiencia.

- **HU-5 (Análisis integral con resumen simple visible, detallado persistido, balance del día y veredicto 0/10):**
  *Como* usuario que también registra comidas y entrenamientos en la app,
  *quiero* que Gemini incorpore mis comidas y entrenamientos del día para señalar brevemente lo bueno o lo malo de mi jornada, me muestre el **resumen general muy simple** y mi **veredicto `0/10`**, y deje guardado el **resumen muy detallado** para una futura Spec,
  *para* tener una lectura rápida y accionable hoy sin perder el análisis profundo en la base de datos local.

- **HU-6 (Comparación bajo demanda con vibración en un solo toque):**
  *Como* usuario con registros físicos previos,
  *quiero* poder pulsar un botón opcional después de analizar mi nueva foto que, con un solo toque, emita una vibración háptica e inicie la comparación contra la descripción/datos de mi registro anterior y mi nueva evaluación,
  *para* recibir recomendaciones de optimización sobre mi evolución sin hacer lento el análisis inicial.

- **HU-7 (Eliminación definitiva de `gemini-3.8-flash`):**
  *Como* usuario de los módulos de Nutrición IA y Cambio Físico IA,
  *quiero* que `gemini-3.8-flash` sea eliminado por completo de la cadena de modelos,
  *para* evitar esperas inútiles o fallos sistemáticos al analizar comidas o fotos físicas.

---

## 3. Requisitos Funcionales (RF-x) — Notación EARS en Español

### 3.1. Limpieza de Modelos Gemini (`src/services/gemini.js`)

- **RF-1 (Ubicuo — Prohibición de `gemini-3.8-flash`):** El sistema deberá eliminar `gemini-3.8-flash` como modelo principal o de respaldo en [src/services/gemini.js](file:///d:/MiNuevaApp/mi-fitness-app/src/services/gemini.js), utilizando `gemini-3-flash-preview` como modelo principal por defecto y `gemini-3.5-flash-lite` como respaldo, y filtrando automáticamente cualquier identificador que contenga `gemini-3.8` aunque provenga de variables de entorno (`.env`).

### 3.2. Perfil Físico Local y Cálculos de Edad / Antigüedad en $O(1)$

- **RF-2 (Ubicuo — Cálculo $O(1)$ de edad exacta):** El sistema deberá calcular la edad exacta del usuario a partir de la fecha fija de nacimiento `26/11/2010` (`año: 2010, mes: 11, día: 26`) empleando únicamente aritmética entera sobre la fecha local del dispositivo (`hoy.getFullYear()`, `hoy.getMonth() + 1`, `hoy.getDate()`), sin usar librerías externas ni conversiones UTC (`toISOString()`).
- **RF-3 (Ubicuo — Cálculo $O(1)$ de tiempo entrenando):** El sistema deberá calcular el tiempo transcurrido de entrenamiento desde la fecha fija `01/11/2025` (`año: 2025, mes: 11, día: 1`) en meses y días locales con complejidad constante $O(1)$.
- **RF-4 (Ubicuo — Propiedades base y objetivo preparados para cambio futuro):** El sistema deberá inicializar el perfil del usuario con los valores por defecto:
  - `alturaCm`: `182` (`1.82 m`)
  - `pesoKgBase`: `74` (`74.0 kg`)
  - `sexo`: `'Hombre'`
  - `fechaNacimiento`: `'2010-11-26'`
  - `fechaInicioEntreno`: `'2025-11-01'`
  - `objetivo`: `'Mantenimiento'` (persistido en `AsyncStorage` bajo `@fitness_tracker_perfil_v1` con función de actualización inmutable `actualizarObjetivoPerfil(nuevoObjetivo)` lista para cambiar entre `'Mantenimiento'`, `'Volumen'`, `'Definición'` y `'Recomposición'`).

### 3.3. Navegación y Captura de 1 a 10 Fotografías

- **RF-5 (Ubicuo — Cuarta pestaña en barra inferior):** El sistema deberá mostrar una cuarta pestaña llamada **`Físico`** (`💪`) en [src/components/BarraNavegacionInferior.jsx](file:///d:/MiNuevaApp/mi-fitness-app/src/components/BarraNavegacionInferior.jsx) con soporte para insignia numérica de registros del día y navegación en [App.js](file:///d:/MiNuevaApp/mi-fitness-app/App.js).
- **RF-6 (Dirigido por estado — Límite estricto de 1 a 10 fotos):** Mientras el usuario prepara un nuevo análisis físico, el sistema deberá permitir agregar **mínimo 1 y máximo 10 fotografías** (combinando selección múltiple de galería y/o capturas de cámara), mostrando una tira de miniaturas con contador (`X/10 fotos`) y botón para descartar imágenes individuales antes de analizar.
- **RF-7 (Comportamiento no deseado — Exceso de 10 fotos):** Si el usuario intenta seleccionar más de 10 fotografías, entonces el sistema deberá truncar la colección a un máximo de 10 imágenes y mostrar un aviso informativo indicando que el límite máximo es de 10 fotos por análisis.

### 3.4. Menú Interactivo: Báscula Circular y Selector de Hora 12h + Momento del Día

- **RF-8 (Dirigido por eventos — Apertura del menú interactivo pre-análisis):** Cuando el usuario tenga entre 1 y 10 fotos seleccionadas y pulse para continuar al registro, el sistema deberá mostrar un **menú interactivo** obligatorio para confirmar el **peso corporal** y la **hora/momento de la toma** antes de invocar a Gemini.
- **RF-9 (Ubicuo — Visualización de peso en báscula circular moderna):** El sistema deberá presentar el selector de peso dentro del menú interactivo como una **báscula moderna circular**, donde el valor del peso (`kg` con precisión de `0.1 kg`, iniciando en el último peso registrado o `74.0 kg` por defecto) se visualiza destacado dentro de un **círculo central con dial/arco de báscula** y controles táctiles interactivos para incrementar/decrementar el peso de manera fluida.
- **RF-10 (Ubicuo — Selector de hora en formato 12 horas y momento del día):** El sistema deberá presentar en el menú interactivo un selector de hora en **formato de 12 horas (`01:00` a `12:59` con conmutador `AM` / `PM`)** pre-cargado con la hora local actual, acompañado de un selector de **momento del día** (`En ayunas`, `Mediodía`, `Post-entreno`, `Noche`).

### 3.5. Análisis Multimodal con Contexto Cruzado y Esquema JSON

- **RF-11 (Dirigido por eventos — Petición multimodal con todos los datos del usuario y del día):** Cuando el usuario confirme el peso y la hora en el menú interactivo, el sistema deberá enviar a Gemini Vision las **1 a 10 imágenes en Base64** junto con un prompt estructurado que incluya:
  1. Edad exacta (`26/11/2010`), tiempo entrenando (`01/11/2025`), altura (`182 cm`), peso seleccionado en la báscula (`kg`), sexo (`Hombre`) y objetivo actual (`Mantenimiento`).
  2. Hora en formato 12h (`hh:mm AM/PM`) y momento del día seleccionado.
  3. Todos los **entrenamientos registrados hoy** y **comidas registradas hoy** en `AsyncStorage` (o indicación explícita si aún no hay registros hoy), más el historial de pesos previos si existe.
- **RF-12 (Ubicuo — Estructura del resultado JSON de Gemini):** El sistema deberá exigir y normalizar de Gemini un objeto JSON con las siguientes propiedades:
  - `resumenSimple` (`string`): Resumen general muy simple y directo del estado físico actual.
  - `resumenDetallado` (`string`): Análisis técnico exhaustivo (que se guarda íntegro en `AsyncStorage` dentro del registro para usarse en una Spec futura).
  - `balanceDelDia` (`string`): Breve descripción señalando **lo bueno o lo malo del día** tomando en cuenta las comidas y/o entrenamientos registrados hoy en relación con el estado físico y el objetivo de `Mantenimiento`.
  - `veredicto` (`number`): Calificación de `0` a `10` (con hasta 1 decimal, ej. `8.4`) calculada en función de **absolutamente todos los datos registrados** del usuario.
  - `puntosClave` (`string[]`, opcional): Lista breve de aspectos destacados.
- **RF-13 (Ubicuo — Visualización del resumen simple y ocultación del resumen detallado para siguiente Spec):** El sistema deberá mostrar en la tarjeta del análisis físico el **`resumenSimple`**, el **`veredicto` (`X/10`)**, el **`balanceDelDia`** (lo bueno/malo del día según comidas/entrenos), el peso (`kg`), la hora (`12h`) y las miniaturas de las fotos, manteniendo `resumenDetallado` persistido en el objeto de `AsyncStorage` sin renderizarlo en pantalla hasta la siguiente Spec.

### 3.6. Comparación Opcional Post-Análisis con Vibración en Un Solo Toque

- **RF-14 (Dirigido por estado — Botón de comparación post-análisis):** Mientras exista al menos un registro de cambio físico previo en `AsyncStorage` anterior al recién analizado, el sistema deberá mostrar en la tarjeta del análisis actual un botón interactivo **"🔄 Comparar con registro anterior"**.
- **RF-15 (Dirigido por eventos — Vibración + acción en un único toque):** Cuando el usuario pulse una sola vez (`onPress`) el botón **"🔄 Comparar con registro anterior"**, el sistema deberá activar **en ese único toque** tanto la **vibración háptica inmediata** (`expo-haptics` con fallback a `Vibration.vibrate`) como la petición a Gemini que compara la descripción/métricas del registro anterior contra el nuevo análisis y fotos, guardando de forma inmutable el resultado de la comparativa y optimización sugerida en el registro actual.

### 3.7. Persistencia Inmutable, Eliminación (`1s`) y Mapa de Calor

- **RF-16 (Ubicuo — Persistencia inmutable en `AsyncStorage`):** El sistema deberá almacenar los registros de cambio físico en la clave `@fitness_tracker_cambios_fisicos_v1` de [src/services/storage.js](file:///d:/MiNuevaApp/mi-fitness-app/src/services/storage.js) respetando inmutabilidad estricta (`spread`, `.map()`, `.filter()`) y fechas locales `YYYY-MM-DD`.
- **RF-17 (Ubicuo — Integración con borrado de 1s y `HeatmapSemanal`):** Cada tarjeta de cambio físico deberá incluir el botón de borrado seguro de 1 segundo (`🗑 1s`) con doble pulso háptico y confirmación `Alert.alert`, e integrarse en `obtenerDiasConActividad()` para iluminar el día en `HeatmapSemanal`.

---

## 4. Casos Límite (Edge Cases)

1. **Día sin comidas ni entrenamientos registrados al momento de analizar el físico:**
   - El sistema envía el análisis normalmente e informa a Gemini que hoy aún hay `0` comidas y `0` entrenamientos registrados, para que `balanceDelDia` invite al usuario a registrar sus comidas/entrenos del día sin inventar datos inexistentes.
2. **Primer registro físico en la historia de la app (sin foto anterior):**
   - El análisis principal (`resumenSimple`, `veredicto 0/10`, `balanceDelDia`) funciona al 100%, y el botón **"🔄 Comparar con registro anterior"** no se muestra (o indica que es el primer registro base) para evitar llamadas fallidas.
3. **Doble toque rápido en "Analizar" o en "Comparar con registro anterior":**
   - El botón entra inmediatamente en estado `disabled` mientras dura la petición a Gemini, evitando condiciones de carrera o cobros duplicados de API.
4. **Cálculo de edad antes y después del 26 de noviembre:**
   - Antes del `26/11` del año en curso (ej. `23/10/2026`), la función devuelve `15` años exactos; el mismo día `26/11/2026` y posteriores devuelve `16` años exactos.
5. **Selección de más de 10 fotos en galería:**
   - Se limita la colección a las primeras 10 imágenes sin bloquear la aplicación.

---

## 5. Fuera de Alcance (Out of Scope)

- **Renderizado en pantalla del `resumenDetallado`:** En esta Spec `002` el `resumenDetallado` se solicita a Gemini y se guarda en `AsyncStorage` dentro de cada registro para dejarlo listo, pero su visualización interactiva pertenece a la siguiente Spec.
- **Almacenamiento en servidores externos o nube:** Todo el flujo permanece 100% Local-First en el dispositivo.
