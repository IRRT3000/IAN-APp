# Spec 021: Fiabilidad, Costo y Modelo de Gemini

> **Estado: BORRADOR.** Lo redactó Claude Code el 2026-11-23. El modelo principal depende de la decisión **Q12** (nivel gratuito o de pago de la clave) y de una prueba final con fotos reales de comida. No se implementa nada sin aprobación del usuario y `PLAN_APROBADO`.

## 1. Visión y Justificación del Problema
La app usa Gemini en cinco lugares:
1. Validar la API key.
2. Analizar una foto de comida.
3. Analizar de 1 a 10 fotos de cambio físico.
4. Comparar el registro físico actual con el anterior.
5. Hacer el resumen pedagógico del día de estudio.

Hoy, el modelo principal es `gemini-3-flash-preview` y el respaldo es `gemini-3.5-flash-lite`. Si los dos fallan, el usuario ve un error.

El 2026-11-23 se probaron los prompts reales de la app contra la clave del usuario, que es de **nivel gratuito**:

| Modelo | Estudio (texto) | Cambio físico (fotos) | Comparación (fotos) |
|---|---|---|---|
| `gemini-3-flash-preview` | 2/2, ~8.5 s | 0/2 (503) | 0/2 (503) |
| `gemini-3.5-flash-lite` | 0/2 (503) | 1/2, 3.7 s | 1/2, 1.2 s |
| `gemini-3.5-flash` | 2/2, ~9 s | 0/2 (503) | 0/2 (429/503) |
| `gemini-3.6-flash` | 2/2, ~11 s | 0/2 (503) | 0/2 (429) |
| `gemini-3.7-flash`, `gemini-3.8-flash`, `gemini-3.1-flash-lite` | 503 inmediato | — | — |
| Familia `gemini-4-*` | 429: no disponible en nivel gratuito | — | — |

Cuando un modelo respondió, el JSON siempre traía todos los campos esperados. Los fallos fueron de **capacidad** (503: alta demanda, porque el nivel gratuito tiene baja prioridad) y de **límite de uso** (429), no de calidad. Por eso, cambiar de modelo no basta: la app debe tolerar fallos pasajeros.

Además, los modelos Flash 3.x «razonan» antes de responder y esos tokens se cobran como salida. En el resumen de estudio, `gemini-3.6-flash` gastó 1390–1949 tokens de razonamiento contra unos 560 de respuesta, aproximadamente el 75 % del costo. Una prueba con `thinkingConfig.thinkingLevel` dio:

| Nivel de razonamiento | Tokens de razonamiento | Tiempo de respuesta |
|---|---|---|
| Por defecto | 658 | 10.4 s |
| `low` | 350 | 4.0 s |
| `minimal` | 0 | 17 s, probablemente por la cola del nivel gratuito |

### Hallazgos que corrige esta Spec
- **H-1 (Alta) — No hay reintentos.** Ante un 503 o 429, la app salta de inmediato al siguiente modelo y, con solo dos modelos, muestra el error al usuario en unos segundos. Google recomienda reintentar con espera exponencial.
- **H-2 (Media) — Se inventan resultados cuando falta un campo.** Cuando el modelo omite un campo, `analizarCambioFisicoConGemini` rellena `veredicto: 7.5` y textos genéricos como «Buen estado físico general…» (`gemini.js:731-750`), y `compararCambioFisicoConGemini` hace lo mismo (`gemini.js:846-851`). El usuario ve una calificación y un análisis que la IA nunca dio.
- **H-3 (Media) — Costo innecesario.** No se configura `thinkingConfig`, así que cada llamada paga el razonamiento por defecto.
- **H-4 (Media) — El modelo principal es una versión preview.** `gemini-3-flash-preview` es una versión preliminar y Google puede retirarla con poco aviso. Ya existen versiones estables más nuevas.
- **H-5 (Baja) — Código duplicado.** El bucle de failover está copiado cuatro veces (`gemini.js:631`, `706`, `812`, `997`). Cualquier mejora hay que hacerla en cuatro sitios.
- **H-6 (Baja) — Errores técnicos al usuario.** El mensaje final enumera modelos y códigos («• gemini-3-flash-preview: 503»). Al usuario no le dice qué hacer.
- **H-7 (Baja) — No se comprueba `finishReason`.** Si la respuesta se corta (`MAX_TOKENS`) o se bloquea (`SAFETY`), se reporta como «JSON inválido» en vez de indicar la causa real.

### Lo que se verificó y está bien
- La clave viaja solo en el encabezado `x-goog-api-key` (Spec 017).
- El filtro que prohíbe `gemini-3.8` (RF-1 de la Spec 002) sigue justificado: el modelo respondió 503 en la primera llamada.
- El resumen de estudio ya rechaza respuestas incompletas mediante `normalizarResumenEstudio`.

## 2. Requerimientos Funcionales (RF)
- **RF-1 (Un solo motor de failover):** `src/services/gemini.js` expone una función interna `ejecutarConFailover({ construirPeticion, interpretar, onProgreso, contextoError })`. Las cuatro funciones de análisis la usan, así que no queda ningún bucle duplicado. Las firmas públicas y la forma de los resultados no cambian, salvo lo que indica RF-3.
- **RF-2 (Reintentos con espera):** Cada fallo se clasifica en una de estas clases, y cada clase tiene su propia regla:

  | Clase | Estados | En el mismo modelo | Después |
  |---|---|---|---|
  | `SATURACION` | 500, 502, 503, 504, `RED` | Hasta 2 reintentos. Espera exponencial `1 s × 2^n` con n desde 0, con ±30 % aleatorio. | Siguiente modelo |
  | `LIMITE` | 429 | 1 reintento solo si el servidor indica `retryDelay` ≤ 10 s y queda tiempo. La espera es exactamente `retryDelay`, sin variación aleatoria. Si `retryDelay` > 10 s o no viene, no se reintenta. | Siguiente modelo (las cuotas suelen ser por modelo) |
  | `TIMEOUT` | sin respuesta a tiempo | No se reintenta (ya consumió su tiempo). | Siguiente modelo |
  | `INCOMPLETA` | `JSON`, `VACIO`, `CORTADO` | No se reintenta (con el mismo prompt suele repetirse). | Siguiente modelo |
  | `CLAVE` | 401, o 400 con `reason: API_KEY_INVALID` o mensaje que contiene «API key» | — | Se corta la cadena |
  | `PERMISO` | 403 | — | Se prueba **un** modelo más. Si también da 403, se corta la cadena |
  | `SEGURIDAD` | `finishReason` de bloqueo o `promptFeedback.blockReason` | — | Se corta la cadena (otro modelo verá la misma imagen) |
  | `OTRO` | 400 con otro motivo, 404 | — | Siguiente modelo |

  - **Tope de tiempo:** una operación completa (todos los modelos, reintentos y esperas) nunca supera **90 s**. Antes de cada intento se calcula el tiempo restante. Si quedan menos de 5 s, la operación termina. Si no, la petición usa como tiempo máximo `min(timeoutMs, restante)`.
  - **Progreso:** `onProgreso` informa cada reintento con su motivo, y la vista elige el texto: «Gemini está saturado, reintentando…» o «Esperando el límite de uso…».
- **RF-3 (Sin resultados inventados):**
  - **Cambio físico:** si `veredicto` no es un `number` finito entre 0 y 10 (un string numérico no vacío también vale, pero `null` y `undefined` no), o si `resumenSimple` está vacío, la respuesta es `INCOMPLETA`. Un `veredicto: 0` es válido.
  - **Comparación:** si `evolucion` está vacío, la respuesta es `INCOMPLETA`.
  - Los textos de relleno de los campos secundarios (`resumenDetallado`, `balanceDelDia`, `recomendacionesOptimizacion`) se mantienen.
  - **Comida:** solo se valida el esquema. `calorias` (o `caloriasTotales`, alias que ya toleran las pruebas) debe existir y ser un número ≥ 0. Un 0 válido (agua, café negro, foto sin comida) **se devuelve**, igual que hoy, para que el usuario lo corrija o lo descarte en el modal de revisión. Si falta el campo o no es numérico, es `INCOMPLETA`.
- **RF-4 (Razonamiento acotado):** Cada llamada envía `generationConfig.thinkingConfig.thinkingLevel`. El nivel lo elige cada caso de uso desde la tabla `NIVEL_RAZONAMIENTO`; el valor inicial es `'low'` en todos.
  - Si un modelo responde 400 por `thinkingConfig`, se reintenta una vez sin ese parámetro. Ese reintento no cuenta como reintento de saturación.
  - El modelo queda anotado en un conjunto en memoria (`modelosSinRazonamiento`), para que las siguientes operaciones no repitan el error.
  - Para poder detectarlo, el mensaje del servidor se guarda completo en `error.detalle`.
- **RF-5 (Cadena de modelos):** La cadena por defecto pasa a ser `MODELO_PRINCIPAL_DEFAULT` y luego `MODELOS_RESPALDO_DEFAULT`, con los valores que salgan de la prueba final (CA-6). La propuesta inicial es:
  - **Si la clave es de pago:** `gemini-3.6-flash` → `gemini-3.5-flash-lite` → `gemini-3.5-flash`.
  - **Si es gratuita:** `gemini-3.5-flash-lite` → `gemini-3.6-flash` → `gemini-3.5-flash`.

  La cadena es una constante que se fija al desarrollar, o que se cambia con `EXPO_PUBLIC_GEMINI_MODEL` y `EXPO_PUBLIC_GEMINI_FALLBACK_MODELS`. La app no puede saber en tiempo de ejecución si la clave es de pago. Se mantiene el filtro que prohíbe `gemini-3.8`.
- **RF-6 (Mensajes útiles):** El error final al usuario es una frase según la clase del **último fallo**. Si en la lista de fallos hay un `CLAVE` o un `SEGURIDAD`, ese manda:
  - `CLAVE` / `PERMISO`: «Tu clave de Gemini no es válida o no tiene permiso. Revísala en Configuración.»
  - `LIMITE`: «Llegaste al límite de uso de tu clave de Gemini. Espera un minuto o revisa tu plan en Google AI Studio.»
  - `SATURACION` / `TIMEOUT`: «Gemini está saturado en este momento. Inténtalo de nuevo en unos minutos.»
  - `SEGURIDAD`:
    - En comida, cambio físico y comparación: «Gemini no pudo analizar esta imagen.»
    - En estudio: «Gemini no pudo procesar este resumen.»
  - `INCOMPLETA`: «Gemini devolvió una respuesta incompleta. Inténtalo de nuevo.»
  - `OTRO`: «No se pudo completar el análisis. Inténtalo de nuevo en unos minutos.»

  El detalle técnico se conserva en `error.fallos`, sin la API key. Los errores de validación previos al envío (sin imagen, sin sesiones, sin clave) conservan su mensaje propio.
- **RF-7 (`finishReason` y bloqueos):** Hay tres casos de bloqueo o corte:
  - Si `candidates[0].finishReason` es `SAFETY`, `RECITATION`, `PROHIBITED_CONTENT` o `BLOCKLIST`, o si `promptFeedback.blockReason` existe, se lanza `GeminiError` con `status: 'SEGURIDAD'`.
  - Si `finishReason` es `MAX_TOKENS`, se lanza `status: 'CORTADO'`, de la clase `INCOMPLETA`.
  - Cada llamada envía `maxOutputTokens: 4096` para que el razonamiento no se coma la respuesta.

## 3. Criterios de Aceptación (CA)
- **CA-1:** En `src/services/gemini.js` hay un solo bucle sobre la cadena de modelos, y `ejecutarLlamadaGemini(` solo se llama dentro de `ejecutarConFailover`: el `grep` da 1 definición y 1 llamada.
- **CA-2:** Tests de Jest con `fetch` simulado, un reloj inyectado y esperas inyectadas, sin dormir de verdad:
  - (a) 503 → 503 → 200 en el mismo modelo devuelve éxito con 3 llamadas a ese modelo, ninguna al respaldo, y esperas de 1 s y 2 s (±30 %).
  - (b) 404 pasa al respaldo sin reintentar.
  - (c) un 429 con `retryDelay: "3s"` espera exactamente 3000 ms y reintenta.
  - (d) un 429 con `retryDelay: "45s"` no espera y pasa al siguiente modelo.
  - (e) un `fetch` que «tarda» 60 s en el reloj inyectado y termina en `TIMEOUT` en todos los modelos hace que la operación termine a los 90 s como máximo. La segunda petición recibe un tiempo máximo ≤ 30 s y no hay tercera petición.
  - (f) `JSON` inválido pasa al siguiente modelo sin reintentar en el mismo.
- **CA-3:** Hay cuatro tests sobre respuestas incompletas y casos límite:
  - Una respuesta de cambio físico sin `veredicto` (o con `veredicto: null`) no devuelve 7.5: pasa al siguiente modelo y, si todos fallan, lanza un `GeminiError` con el mensaje de `INCOMPLETA`.
  - `veredicto: 0` se acepta.
  - Una comparación sin `evolucion` se comporta como el cambio físico incompleto.
  - Una comida con `calorias: 0` **se devuelve** con 0 kcal, sin reintentos. Una comida sin el campo `calorias` ni `caloriasTotales` es `INCOMPLETA`.
- **CA-4:** Un test comprueba que el cuerpo enviado contiene `thinkingConfig.thinkingLevel` y `maxOutputTokens`. Ante un 400 «Unknown name "thinkingConfig"», la segunda llamada es al **mismo** modelo sin ese campo, no consume reintentos de saturación, y una operación posterior con ese modelo ya no lo envía.
- **CA-5:** Un test por cada clase de RF-6 comprueba que el mensaje visible es la frase indicada y no contiene nombres de modelo, códigos HTTP ni la API key. Además:
  - Con `API_KEY_INVALID` (400) y con 401, hay **una sola** llamada a `fetch`.
  - Con 403 → 403, hay exactamente dos llamadas.
  - Con `finishReason: 'SAFETY'` o `promptFeedback.blockReason`, hay una sola llamada.
- **CA-5b:** Los tests existentes se adaptan y siguen pasando:
  - `geminiApiKey.test.js:71-96`: el alias `caloriasTotales` se acepta.
  - `analizarEstudioGemini.test.js:105-153`: con 503 → 200 la respuesta la da el mismo modelo tras un reintento, y el test verifica `reintento: 1` en el progreso.
  - `analizarEstudioGemini.test.js:155-216`: usan las esperas inyectadas y no tardan más de 1 s cada uno.
- **CA-6 (prueba real):** Con la clave del usuario, que nunca se escribe en disco, y fotos reales de comida aportadas por él, se ejecuta el banco de pruebas del 2026-11-23 sobre los cinco casos. Se usan 3 repeticiones por caso y por cada modelo de la cadena elegida. El informe en `tasks.md` recoge, por modelo, el porcentaje de éxito, el JSON completo, la latencia media y el costo estimado por llamada.
  - **Clave de pago:** la cadena completa debe lograr 100 % de éxito.
  - **Clave gratuita:** ≥ 80 %, documentando cada fallo.
- **CA-7:** `npm run gate` en verde.

## 4. Fuera de Alcance
- Cambiar los textos de los prompts más allá de lo necesario.
- Interfaz nueva: solo cambia el texto de progreso y de error que ya existe.
- Mover las llamadas a un servidor propio (la Spec 012, archivada).

## 5. Riesgos
- Más reintentos significan más espera. Se mitiga con el tope de 90 s y el texto de progreso.
- `thinkingLevel: 'low'` puede bajar la calidad del análisis de fotos. CA-6 compara las respuestas. Si empeoran, ese caso pasa a `'medium'` en la tabla `NIVEL_RAZONAMIENTO`.

## 6. Decisiones Pendientes del Usuario
- **Q12:** ¿Se activa la facturación de la clave o se queda en nivel gratuito? Define la cadena de RF-5.
- **Q3:** ¿Qué fotos reales de comida y de físico se usan para CA-6?
