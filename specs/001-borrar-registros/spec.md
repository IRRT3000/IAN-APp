# Especificación Funcional: 001-borrar-registros — Eliminación de Registros de Entrenamientos y Comidas

- **ID de Funcionalidad:** `001-borrar-registros`
- **Estado:** aprobado
- **Fecha:** 2026-10-22
- **Metodología:** Spec-Driven Development (SDD)

---

## 1. Resumen y Propósito

Permitir al usuario eliminar de forma individual y definitiva registros previamente creados en la aplicación, abarcando tanto **entrenamientos de fuerza** como **comidas analizadas/registradas**. La acción debe prevenir borrados accidentales exigiendo una pulsación prolongada de **1 segundo (1000 ms)** sobre un botón de eliminación claramente visible, acompañada de retroalimentación háptica de **doble pulso** (`expo-haptics` con respaldo en `Vibration` nativa: pulso ligero al iniciar la presión y pulso firme de advertencia al cumplirse el segundo) y una alerta de confirmación antes de remover el registro de `AsyncStorage` y actualizar todas las vistas, contadores, totales nutricionales y el mapa de calor semanal (`HeatmapSemanal`).

---

## 2. Historias de Usuario (HU-x)

- **HU-1 (Eliminar entrenamiento individual):**
  *Como* usuario del Fitness Tracker,
  *quiero* poder eliminar un registro individual de entrenamiento desde la lista del día manteniendo presionado por 1 segundo un botón de borrado visible (sintiendo una vibración al presionar y otra al cumplirse el segundo) y confirmando en una alerta,
  *para* corregir registros erróneos o duplicados y que mis contadores diarios, el menú de bienvenida y el mapa de calor semanal reflejen únicamente mi actividad real.

- **HU-2 (Eliminar comida individual):**
  *Como* usuario del módulo de Nutrición IA,
  *quiero* poder eliminar un registro individual de comida desde la lista del día manteniendo presionado por 1 segundo su botón de borrado visible (con retroalimentación háptica de doble pulso) y confirmando en una alerta,
  *para* descartar comidas registradas por error y recalcular al instante mis calorías y macronutrientes diarios (`proteínas`, `carbohidratos`, `grasas`), así como el estado de actividad semanal.

- **HU-3 (Prevención de borrado accidental por toque corto):**
  *Como* usuario que se desplaza por la lista de entrenamientos o comidas,
  *quiero* que un toque corto menor a 1 segundo sobre el botón de eliminar no borre el registro sino que me indique visualmente que debo mantener presionado por 1 segundo,
  *para* evitar perder registros por toques involuntarios en la pantalla.

---

## 3. Requisitos Funcionales (RF-x) — Notación EARS en Español

> **Convención EARS aplicada:**
> - **Ubicuo:** *El sistema deberá...*
> - **Dirigido por eventos (Event-Driven):** *Cuando [evento], el sistema deberá...*
> - **Dirigido por estado (State-Driven):** *Mientras [estado], el sistema deberá...*
> - **Comportamiento no deseado (Unwanted Behavior):** *Si [condición de fallo/error], entonces el sistema deberá...*

### 3.1. Interfaz Visual e Interacción del Botón de Eliminación

- **RF-1 (Ubicuo):** El sistema deberá mostrar en cada tarjeta de entrenamiento ([App.js](file:///d:/MiNuevaApp/mi-fitness-app/App.js)) y en cada tarjeta de comida ([src/components/NutricionView.jsx](file:///d:/MiNuevaApp/mi-fitness-app/src/components/NutricionView.jsx)) un botón de eliminación claramente visible (`🗑 1s`) y de alto contraste en color de alerta (`#FF5252`), construido exclusivamente con `StyleSheet` nativo.
- **RF-2 (Dirigido por eventos — Toque corto):** Cuando el usuario presione y suelte el botón de eliminación antes de alcanzar 1 segundo (`< 1000 ms`), el sistema deberá mostrar un aviso visual breve indicando *"Mantén presionado 1 segundo para eliminar"* sin abrir la alerta de confirmación ni modificar los datos.
- **RF-3 (Dirigido por eventos — Pulsación de 1 segundo y doble pulso háptico):** Cuando el usuario inicie la presión sobre el botón de eliminación (`onPressIn`), el sistema deberá emitir un primer pulso háptico ligero (`Haptics.impactAsync(ImpactFeedbackStyle.Light)` con fallback a `Vibration.vibrate(30)`), y cuando mantenga presionado el botón durante al menos 1 segundo (`delayLongPress={1000}`), el sistema deberá emitir un segundo pulso háptico firme (`Haptics.notificationAsync(NotificationFeedbackType.Warning)` con fallback a `Vibration.vibrate(120)`) y desplegar una única alerta visible de advertencia (`Alert.alert`) indicando el nombre del ejercicio o comida a eliminar y ofreciendo las opciones **"Cancelar"** y **"Eliminar"**.
- **RF-4 (Dirigido por eventos — Cancelación en la alerta):** Cuando el usuario seleccione la opción **"Cancelar"** en la alerta de advertencia, el sistema deberá cerrar la alerta y conservar intacto el registro tanto en pantalla como en `AsyncStorage`.

### 3.2. Persistencia e Inmutabilidad en AsyncStorage

- **RF-5 (Dirigido por eventos — Eliminación de entrenamiento):** Cuando el usuario confirme la opción **"Eliminar"** para un entrenamiento con identificador `id`, el sistema deberá ejecutar `eliminarEntrenamiento(id)` en [src/services/storage.js](file:///d:/MiNuevaApp/mi-fitness-app/src/services/storage.js), creando un nuevo arreglo inmutable mediante `.filter((item) => item.id !== id)` y guardándolo en la clave `@fitness_tracker_entrenamientos_v1` de `AsyncStorage`.
- **RF-6 (Dirigido por eventos — Eliminación de comida):** Cuando el usuario confirme la opción **"Eliminar"** para una comida con identificador `id`, el sistema deberá ejecutar `eliminarComida(id)` en [src/services/storage.js](file:///d:/MiNuevaApp/mi-fitness-app/src/services/storage.js), creando un nuevo arreglo inmutable mediante `.filter((item) => item.id !== id)` y guardándolo en la clave `@fitness_tracker_comidas_v1` de `AsyncStorage`.
- **RF-7 (Ubicuo — Inmutabilidad estricta):** El sistema deberá realizar todas las operaciones de filtrado y actualización de listas creando nuevas referencias de arreglos y objetos sin mutar directamente los arreglos existentes.

### 3.3. Sincronización de Vistas, Totales y Mapa de Calor Semanal

- **RF-8 (Dirigido por eventos — Actualización tras eliminar entrenamiento):** Cuando `eliminarEntrenamiento(id)` finalice con éxito, el sistema deberá remover el entrenamiento de la `FlatList` del día en [App.js](file:///d:/MiNuevaApp/mi-fitness-app/App.js), actualizar el contador de ejercicios, el volumen/último ejercicio en [src/components/MenuBienvenida.jsx](file:///d:/MiNuevaApp/mi-fitness-app/src/components/MenuBienvenida.jsx) y la insignia de la barra inferior en [src/components/BarraNavegacionInferior.jsx](file:///d:/MiNuevaApp/mi-fitness-app/src/components/BarraNavegacionInferior.jsx).
- **RF-9 (Dirigido por eventos — Actualización tras eliminar comida):** Cuando `eliminarComida(id)` finalice con éxito, el sistema deberá remover la comida de la `FlatList` en [src/components/NutricionView.jsx](file:///d:/MiNuevaApp/mi-fitness-app/src/components/NutricionView.jsx) y recalcular de inmediato los totales diarios de calorías (`kcal`), proteínas (`g`), carbohidratos (`g`) y grasas (`g`), así como el resumen de `Kcal hoy` en [src/components/MenuBienvenida.jsx](file:///d:/MiNuevaApp/mi-fitness-app/src/components/MenuBienvenida.jsx) y la insignia en [src/components/BarraNavegacionInferior.jsx](file:///d:/MiNuevaApp/mi-fitness-app/src/components/BarraNavegacionInferior.jsx).
- **RF-10 (Dirigido por estado — Cálculo de actividad combinada en HeatmapSemanal):** Mientras una fecha local (`YYYY-MM-DD`) tenga al menos un registro de entrenamiento **o** al menos un registro de comida en `AsyncStorage`, el sistema deberá incluir dicha fecha en `obtenerDiasConActividad()` e iluminar su celda en verde acento (`#00E676`) en [src/components/HeatmapSemanal.jsx](file:///d:/MiNuevaApp/mi-fitness-app/src/components/HeatmapSemanal.jsx).
- **RF-11 (Dirigido por eventos — Apagado de celda en HeatmapSemanal al quedar en 0):** Cuando tras eliminar un registro la cantidad de entrenamientos y la cantidad de comidas para esa fecha local (`YYYY-MM-DD`) queden ambas en `0`, el sistema deberá remover esa fecha de los días con actividad y cambiar inmediatamente su celda en [src/components/HeatmapSemanal.jsx](file:///d:/MiNuevaApp/mi-fitness-app/src/components/HeatmapSemanal.jsx) a color gris neutro (`#2A2A2A`).

### 3.4. Manejo de Errores y Consistencia

- **RF-12 (Comportamiento no deseado — Fallo en AsyncStorage):** Si ocurre una excepción al leer o escribir en `AsyncStorage` durante la eliminación de un registro, entonces el sistema deberá capturar el error mediante `try/catch`, mantener el estado visual sin cambios para preservar la consistencia con el almacenamiento local y mostrar una alerta informando al usuario que no se pudo completar el borrado.

---

## 4. Casos Límite (Edge Cases)

1. **Eliminación del último entrenamiento del día cuando aún existen comidas registradas hoy:**
   - El contador de entrenamientos del día pasa a `0` y la lista de entrenamientos muestra su estado vacío (`ListEmptyComponent`), pero la celda de hoy en `HeatmapSemanal` permanece en verde (`#00E676`) hasta que las comidas del día también sean `0`.
2. **Eliminación del último registro absoluto del día (0 entrenamientos y 0 comidas):**
   - Ambos contadores quedan en `0`, los totales nutricionales quedan en `0 kcal / 0g`, `MenuBienvenida` vuelve al estado *"LISTO PARA HOY"* sin último ejercicio, y la celda del día en `HeatmapSemanal` pasa inmediatamente a gris (`#2A2A2A`).
3. **Toques repetidos o menores a 2 segundos (`< 2000 ms`):**
   - No se dispara `Alert.alert` múltiples veces ni se borra nada; únicamente se muestra el mensaje guía indicando mantener presionado por 2 segundos.
4. **Intento de eliminar un `id` inexistente:**
   - La función de almacenamiento retorna la lista actual de forma inmutable sin lanzar excepción ni corromper `AsyncStorage`.

---

## 5. Fuera de Alcance (Out of Scope)

- **Papelera de reciclaje o función "Deshacer" (Undo):** El borrado confirmado tras los 2 segundos es definitivo e irreversible en `AsyncStorage`.
- **Borrado masivo ("Vaciar día" o "Borrar todo el historial"):** Solo se permite eliminar registros de forma individual desde cada tarjeta.
- **Edición de registros existentes:** Modificar series, repeticiones, peso o macronutrientes de un registro ya guardado no forma parte de esta especificación.
- **Eliminación del archivo físico en la galería del sistema operativo:** Al borrar una comida se elimina su objeto y su referencia `uriFoto` en `AsyncStorage`, sin borrar fotos de la galería del teléfono del usuario.
