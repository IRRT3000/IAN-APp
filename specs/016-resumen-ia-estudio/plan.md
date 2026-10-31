# Plan Técnico — Spec 016: Resumen IA del Día de Estudio

Depende de la Spec 015 implementada (`estudioStorage.js`, `validacionEstudio.js`, `useEstudio.js`, `EstudioView.jsx`).

## 1. Persistencia (se agrega a `src/services/estudioStorage.js`)
- **Una clave por fecha** (Defensa 10): `@fitness_tracker_resumen_estudio_v1:YYYY-MM-DD` → objeto:
  ```js
  {
    resultado: { /* JSON normalizado, ver §2 */ },
    generadoEn: 1793480400000,       // Date.now() al guardar
    hora12h: '6:40 PM',
    firmas: { '<idSesion>': 1793479000000 }, // editadaEn ?? creadaEn al construir el contexto
    modeloUsado: 'gemini-3-flash-preview',
  }
  ```
- `export const PREFIJO_RESUMEN_ESTUDIO = '@fitness_tracker_resumen_estudio_v1:';`
- `obtenerResumenEstudio(fecha)` (para mostrar): lectura tolerante. Devuelve el objeto o `null` si no existe, si el JSON es inválido o si no es un objeto plano.
- `existeClaveResumenEstudio(fecha)`: `(await AsyncStorage.getItem(clave)) !== null`, aunque el contenido sea ilegible. Si `getItem` falla, lanza. Se usa como chequeo previo a Gemini (§4, paso 5).
- `guardarResumenEstudio(fecha, entrada)`, dentro de la **misma cola serial** `encolar` de la Spec 015:
  1. `crudo = await AsyncStorage.getItem(clave)`. Si `getItem` lanza, se propaga el error y no se escribe nada.
  2. Si `crudo !== null`, lanza `Error('Ya existe un resumen de estudio para esta fecha.')`, aunque esté corrupto: no se pisa nada.
  3. `setItem(clave, JSON.stringify({ ...entrada }))`. Si falla, lanza el error (Defensa 9).

## 2. Lógica pura (`src/utils/resumenEstudio.js`, archivo nuevo)
Solo importa de `src/utils/dateUtilsLocal.js` (`obtenerFechaLocal`) y de `src/utils/validacionEstudio.js` (`NIVELES_COMPRENSION`). **No** importa `gemini.js` ni `storage.js`, así que no hay ciclos ni mocks.
- `restarDiasFechaLocal(fechaISO, dias)`: separa año, mes y día, construye `new Date(anio, mes - 1, dia - dias)` y lo pasa por `obtenerFechaLocal`. Sin `toISOString`.
- `formatearHora12h(fecha = new Date())`: devuelve `'h:mm AM'` / `'h:mm PM'` con aritmética (`getHours`, `getMinutes`). Sin `toLocaleTimeString`. 0 → `12:xx AM` y 12 → `12:xx PM`.
- `construirContextoResumenEstudio({ sesiones, materias, fechaHoy })` →
  ```js
  {
    fechaHoy,
    sesionesHoy: [{ id, materia, categoria, tema, comprension, minutos, apuntes }], // creadaEn asc
    sesionesPrevias: [{ fecha, materia, categoria, tema, comprension, minutos }],  // hoy-7..hoy-1, fecha desc, máx. 60
    minutosTotales,                               // suma de sesionesHoy
    materias: [{ materia, categoria, minutos }],  // agrupado de sesionesHoy, minutos desc
    firmas: { [id]: editadaEn ?? creadaEn },      // de las sesiones de hoy
  }
  ```
  - La materia se resuelve por `materiaId`. Si no existe, se usa `'Sin materia'` con categoría `'Personal'`.
  - Defensa 5: si `Σ apuntes.length > 40000`, `tope = Math.floor(40000 / sesionesHoy.length)`. Cada apunte que pase de `tope` se corta a ese largo y se le agrega ` [recortado]`.
- `contarSesionesSinAnalizar({ sesionesHoy, firmas })`: suma tres casos.
  - sesiones de hoy cuyo `id` no está en `firmas` (nuevas);
  - sesiones con `(editadaEn ?? creadaEn) !== firmas[id]` (editadas);
  - ids de `firmas` que ya no existen en `sesionesHoy` (eliminadas).
- `textoSesionesSinAnalizar(n)`:
  - `n === 1` → `'1 sesión nueva, editada o eliminada sin analizar'`;
  - `n > 1` → `` `${n} sesiones nuevas, editadas o eliminadas sin analizar` ``;
  - `0` → `null`.
- `normalizarResumenEstudio(json, contexto)` (Defensa 4). Devuelve el resultado o **`null`** si es inválido:
  - Si `json` no es un objeto plano (`null`, un arreglo o algo que no sea `object`), devuelve `null`.
  - `resumenSimple` y `resumenDetallado`: deben ser `typeof 'string'` y tener contenido después de `trim()`. Si no, devuelve `null`.
  - `veredicto`: se acepta si es `typeof === 'number'` con `Number.isFinite`, o un string que, después de `trim()`, no esté vacío y cumpla `/^-?\d+(\.\d+)?$/` (así `''` y `'  '` **no** pasan como 0). Si no, devuelve `null`. Si es válido, se acota a `[0, 10]` y se redondea a 1 decimal.
  - `minutosTotales` y `materias` se toman **de `contexto`**.
  - `temasDominados` (máx. 8), `puntosClave` (máx. 5) y `recomendacionesManana` (máx. 5): solo strings con contenido, con `trim()`.
  - `temasPorRepasar` (máx. 8): objetos con `tema` (string con contenido) y `comprension` que coincida con algún valor de `NIVELES_COMPRENSION` después de `normalizarNivel` (minúsculas y sin diacríticos con `normalize('NFD').replace(/[̀-ͯ]/g, '')`). Se guarda el literal canónico. `materia` y `sugerencia` son strings con `trim()` (`''` si no vienen).

## 3. Gemini (`src/services/gemini.js`)
### 3.1 `construirPromptEstudioDelDia(contexto, perfilTexto)` (exportado para las pruebas)
`perfilTexto = { edadTexto, fechaLegible, hora12h }`. La plantilla no contiene emojis (CA-11). El texto del prompt, con los bloques condicionales indicados:

```
Actúa como un pedagogo experto en ciencias del aprendizaje, técnicas de estudio basadas en evidencia (recuperación activa, repetición espaciada, interleaving, técnica Feynman) y acompañamiento académico.
Estás evaluando el día de estudio del usuario de hoy (${fechaLegible}), registrado a las ${hora12h}.

PERFIL DEL USUARIO:
- Edad exacta: ${edadTexto}

SESIONES DE ESTUDIO DE HOY (${sesionesHoy.length}) — fuente principal del análisis:
${para cada sesión i:}
  ${i}. [${categoria}] ${materia} — Tema: "${tema}"
     Duración: ${minutos} min | Comprensión declarada por el usuario: ${comprension}
     Apuntes:
     """
     ${apuntes}
     """

TOTALES CALCULADOS POR LA APP (no los recalcules ni los cambies):
- Minutos totales de hoy: ${minutosTotales}
- Minutos por materia: ${materia (categoría): minutos | ...}

${SOLO si sesionesPrevias.length > 0:}
HISTORIAL DE ESTUDIO DE LOS ÚLTIMOS 7 DÍAS (sin hoy, sin apuntes) — úsalo solo para dar contexto:
${para cada sesión previa:}
  - ${fecha} | [${categoria}] ${materia} | "${tema}" | ${minutos} min | Comprensión: ${comprension}

INSTRUCCIONES DE EVALUACIÓN:
1. Analiza únicamente la información anterior. No inventes sesiones, temas, materias, minutos ni contenido que no aparezca en los datos.
2. Evalúa la comprensión real de cada tema contrastando la comprensión declarada con la calidad, profundidad y coherencia de sus apuntes (definiciones correctas, ejemplos, conexiones entre ideas, errores conceptuales visibles).
3. ${si hay historial:} Relaciona lo de hoy con los últimos 7 días: temas que se repiten, temas que siguen con comprensión baja, materias abandonadas y constancia del hábito. ${si no hay historial:} Es el primer registro de estudio disponible; no hagas comparaciones con días anteriores.
4. Redacta "resumenSimple": 2 a 3 oraciones claras, directas y motivadoras sobre el día de estudio.
5. Redacta "resumenDetallado": análisis completo por materia y tema (qué se estudió, nivel real de dominio según los apuntes, vacíos detectados y relación con el historial si existe).
6. Asigna "veredicto" de 0 a 10 (número, máximo 1 decimal) que califique de forma realista el día de estudio, considerando tiempo invertido, comprensión, calidad de los apuntes y constancia.
7. "temasDominados": temas de hoy que el usuario domina según su comprensión declarada y sus apuntes.
8. "temasPorRepasar": temas de hoy con comprensión "Más o menos", "No tanto" o "Nada", y también temas declarados como "Bien" cuyos apuntes muestren vacíos o errores. En "comprension" pon la comprensión que declaró el usuario para ese tema. Para cada uno, "sugerencia" debe ser una técnica concreta y accionable para repasarlo (por ejemplo: "Haz 5 tarjetas de recuperación activa con las fórmulas de derivadas y repásalas mañana y en 3 días").
9. "puntosClave": 3 observaciones cortas y concretas del día.
10. "recomendacionesManana": 3 acciones concretas para la próxima sesión de estudio.
11. Escribe en español neutro, sin emojis.

Devuelve ÚNICAMENTE un objeto JSON válido (sin bloques markdown ni texto adicional) con esta estructura exacta:
{
  "resumenSimple": "2 a 3 oraciones sobre el día de estudio.",
  "resumenDetallado": "Análisis completo por materia y tema.",
  "veredicto": 7.8,
  "minutosTotales": ${minutosTotales},
  "materias": [{ "materia": "Nombre", "categoria": "Escuela", "minutos": 0 }],
  "temasDominados": ["Tema dominado"],
  "temasPorRepasar": [{ "materia": "Nombre", "tema": "Tema", "comprension": "No tanto", "sugerencia": "Técnica concreta para repasarlo." }],
  "puntosClave": ["Punto 1", "Punto 2", "Punto 3"],
  "recomendacionesManana": ["Acción 1", "Acción 2", "Acción 3"]
}
"comprension" solo puede ser "Bien", "Más o menos", "No tanto" o "Nada". Si no hay temas por repasar o dominados, devuelve arreglos vacíos.
```

### 3.2 `analizarEstudioDelDiaConGemini(contexto, opciones = {})` (exportada)
- `opciones = { onProgreso, timeoutMs = TIMEOUT_POR_PETICION_MS, perfilUsuario }`.
- Si `contexto.sesionesHoy.length === 0`, lanza `GeminiError('No hay sesiones de estudio hoy para analizar.')` antes de cualquier llamada.
- `apiKey = await obtenerApiKeyActiva()`; si falta, ese lanzamiento llega a la interfaz (RF-2).
- Perfil: `opciones.perfilUsuario || await cargarPerfilUsuario()`, `edadTexto = calcularEdadExacta(new Date(), perfil.fechaNacimiento).texto`, `fechaLegible = parsearFechaLocalYYYYMMDD(contexto.fechaHoy).legible` y `hora12h = formatearHora12h()`.
- El bucle de modelos es idéntico a `analizarComidaConGemini`:
  - en cada intento, `onProgreso({ modelo, indice, total, falloAnterior })`;
  - `json = await ejecutarLlamadaGemini({ modelo, apiKey, promptTexto, temperature: 0.3, timeoutMs })`;
  - `resultado = normalizarResumenEstudio(json, contexto)`; si es `null`, lanza `GeminiError('respuesta inválida', { status: 'JSON' })` y se intenta el siguiente modelo;
  - devuelve `{ resultado, modeloUsado: modelo, hora12h }`.
- Si todos fallan: `GeminiError('No se pudo analizar tu día de estudio. Los N modelos de Gemini fallaron:\n• modelo: status\n...\n\nIntenta de nuevo en unos minutos.', { status, fallos })`.

## 4. Interfaz
- **`src/components/ResumenEstudioCard.jsx`** (nuevo). Props: `{ esHoy, hayDatos, sesionesHoy, entradaResumen, analizando, progreso, onAnalizar }`.
  - **Hoy sin resumen**: título, aviso de 1 análisis al día y botón primario de 54 dp.
    - Deshabilitado si `!hayDatos` o `sesionesHoy.length === 0`, con la explicación de RF-2.
    - Con `analizando`, muestra `ActivityIndicator`. El texto es «Analizando con ${progreso.modelo} (${indice}/${total})» si hay `progreso`, o «Analizando…» si `progreso` es `null`, que es lo normal al inicio y tras un remonte. Nunca se accede a `progreso.*` sin comprobarlo.
  - **Con resumen** (hoy o pasado): veredicto grande (`7.8 / 10`), `resumenSimple`, minutos totales, chips de minutos por materia, «Temas por repasar» (tema, materia, insignia de comprensión y sugerencia), «Temas dominados», «Puntos clave», «Para mañana», un «Ver detalle» desplegable con `resumenDetallado` y el pie «Generado a las ${hora12h}».
    - Si `esHoy` y `textoSesionesSinAnalizar(contarSesionesSinAnalizar(...))` no es `null`, se agrega la nota con el icono `info`.
  - **Pasado sin resumen**: devuelve `null`.
  - Entrada con `FadeIn`; «Ver detalle» con animación de altura y opacidad en Reanimated. Tokens y Feather.
- **`src/utils/useEstudio.js`** (se amplía):
  - **Candado de módulo** (Defensa 2), fuera del hook: `let analisisEnCurso = null;`, que guarda `{ fecha, promesa }`.
  - Estado: `entradaResumen`. Cuando cambia `fechaSeleccionada`, se carga con `obtenerResumenEstudio(fechaSeleccionada)`.
  - `analizando` y `progreso`. Al montar, si `analisisEnCurso` existe:
    1. Se pone `analizando = true`.
    2. Se hace `await analisisEnCurso.promesa` dentro de `try/catch`. El error ya lo mostró la instancia original, o se pierde si esta se desmontó; en ese caso se ignora aquí.
    3. **En esta instancia** (si sigue montada): `setAnalizando(false)` y se recarga `entradaResumen` con `obtenerResumenEstudio(fechaSeleccionada)`.
    - El `finally` de la instancia vieja está protegido por su propia ref `montado` y no toca el estado de la nueva.
  - `manejarAnalizar()`, con todo dentro de `try / catch / finally`:
    1. Si `analisisEnCurso`, sale.
    2. `fecha = obtenerFechaLocal()`. Si `fecha !== fechaSeleccionada`, `Alert` de cambio de día y sale (Defensa 3).
    3. `setAnalizando(true)`.
    4. Se crea `promesa` (pasos 5 a 10) y se guarda en `analisisEnCurso = { fecha, promesa }`.
    5. `if (await existeClaveResumenEstudio(fecha))`: recarga `entradaResumen` con `obtenerResumenEstudio(fecha)`. Si la recarga da `null` (clave ilegible), `Alert.alert('Análisis de estudio', 'Hay un resumen de hoy que no se pudo leer; no se volverá a analizar.')`. En los dos casos termina **sin** llamar a Gemini, así que no hay un bucle que gaste la API.
    6. `contexto = construirContextoResumenEstudio({ sesiones: sesionesExternas, materias: materiasExternas, fechaHoy: fecha })`.
    7. `{ resultado, modeloUsado, hora12h } = await analizarEstudioDelDiaConGemini(contexto, { onProgreso: setProgresoSiMontado })`.
    8. `entrada = { resultado, generadoEn: Date.now(), hora12h, firmas: contexto.firmas, modeloUsado }`.
    9. `await guardarResumenEstudio(fecha, entrada)`.
    10. `setEntradaResumen(entrada)` y `vibrarEjercicioCompletado()`.
    - En `catch`:
      - Si el mensaje es «Ya existe…», recarga `entradaResumen`; si tras recargar sigue `null`, muestra el mismo `Alert` de resumen ilegible.
      - Si es otro error, `Alert.alert('Análisis de estudio', error.message)`.
      - No se guarda nada.
    - En `finally`: `analisisEnCurso = null`, `setAnalizando(false)` y `setProgreso(null)`, protegidos con una ref `montado` para no actualizar estado tras desmontar.
- **`EstudioView.jsx`**: renderiza `<ResumenEstudioCard>` al final de la lista del **modo por día** (no en el modo filtro), con `hayDatos = datosCargados`.

## 5. Pruebas (Jest)
- `__tests__/resumenEstudio.test.js` (sin mocks):
  - `construirContextoResumenEstudio`: separa hoy, los 7 días previos y lo que queda fuera de rango; ordena; respeta el máximo de 60; suma minutos y agrupa por materia; resuelve «Sin materia»; aplica el tope igual por sesión con `[recortado]`; genera las firmas.
  - `contarSesionesSinAnalizar` y `textoSesionesSinAnalizar`: nueva, editada, eliminada, sin cambios, singular y plural.
  - `normalizarResumenEstudio`:
    - sobrescribe minutos y materias;
    - acota el veredicto (`-3` → 0, `14` → 10, `'7.84'` → 7.8) y devuelve `null` con `''` o `'  '`;
    - devuelve `null` con `veredicto` ausente o `'abc'`, con `resumenSimple` ausente o no string, con `json` igual a `null` o a un arreglo;
    - acepta `'mas o menos'` y lo convierte a `'Más o menos'`;
    - descarta comprensiones inválidas.
  - `formatearHora12h`: 00:05 → `12:05 AM`, 12:00 → `12:00 PM`, 18:40 → `6:40 PM`.
  - `restarDiasFechaLocal`: cruces de mes y de año, y años bisiestos.
- `__tests__/estudioStorage.test.js` (se amplía): `guardarResumenEstudio` guarda; un segundo guardado con la misma fecha se rechaza; con `getItem` que rechaza, lanza un error y no llama a `setItem`; `obtenerResumenEstudio` devuelve `null` con JSON corrupto.
- `__tests__/analizarEstudioGemini.test.js` (mock de AsyncStorage porque `gemini.js` importa `storage.js`; `global.fetch` mockeado con `ok`, `status`, `json()` y `text()`):
  - el prompt (`construirPromptEstudioDelDia`) incluye los apuntes de hoy y no los de las sesiones previas;
  - sin historial no aparece «HISTORIAL DE ESTUDIO DE LOS ÚLTIMOS 7 DÍAS»;
  - la plantilla, con un contexto cuyos textos no tienen emojis, no contiene `\p{Extended_Pictographic}`;
  - el primer modelo responde 503 y el segundo un JSON válido: se devuelve el resultado del segundo;
  - el primer modelo devuelve un JSON sin `veredicto` y el segundo uno válido: se usa el segundo;
  - si todos fallan, se lanza `GeminiError` con `fallos.length === total`;
  - sin sesiones hoy, lanza un error sin llamar a `fetch`.

## 6. Archivos
- Nuevos: `src/utils/resumenEstudio.js`, `src/components/ResumenEstudioCard.jsx`, `__tests__/resumenEstudio.test.js` y `__tests__/analizarEstudioGemini.test.js`.
- Modificados: `src/services/estudioStorage.js`, `src/services/gemini.js`, `src/utils/useEstudio.js`, `src/components/EstudioView.jsx` y `__tests__/estudioStorage.test.js`.
- Sin dependencias nuevas y sin cambios en `App.js`, la barra, Inicio ni Heatmap.
