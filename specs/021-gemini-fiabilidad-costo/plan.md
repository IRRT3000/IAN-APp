# Plan Técnico — Spec 021: Fiabilidad, Costo y Modelo de Gemini

> **Estado: BORRADOR v2** (corrige los hallazgos de la revisión del 2026-11-23). Pendiente de Q12/Q3 y de `PLAN_APROBADO`.
> Archivos: `src/services/gemini.js`, `src/components/CambioFisicoView.jsx`, `src/components/ModalAnalisisComida.jsx`, `src/components/ResumenEstudioCard.jsx`, `src/utils/useEstudio.js` (solo si hace falta pasar campos), `__tests__/geminiFailover.test.js` (nuevo), `__tests__/geminiApiKey.test.js` y `__tests__/analizarEstudioGemini.test.js`.

## 1. `ejecutarLlamadaGemini` (una petición)
- Recibe además `nivelRazonamiento` (`string | null`) y `maxOutputTokens` (4096 por defecto).
  - `generationConfig` incluye `maxOutputTokens`.
  - Si `nivelRazonamiento` no es `null`, también incluye `thinkingConfig: { thinkingLevel }`.
- **Errores HTTP:**
  - Se lee el cuerpo completo y se guarda en `error.detalle`, sin recortar, para que §2 pueda detectar `thinkingConfig` y `API_KEY_INVALID`.
  - `error.message` sigue recortado a 200 caracteres.
  - De `error.details[]` se extraen `reason` (elemento `ErrorInfo`) y `retryDelayMs` (elemento `RetryInfo`; «3s» o «1.5s» se convierten a ms).
  - El cuerpo de error nunca contiene la API key, porque viaja en el encabezado.
- **Respuesta 200**, en este orden:
  1. Si existe `data.promptFeedback?.blockReason`, se lanza `SEGURIDAD`.
  2. Si `candidates[0].finishReason` está en `{SAFETY, RECITATION, PROHIBITED_CONTENT, BLOCKLIST, SPII}`, se lanza `SEGURIDAD`.
  3. Si es `MAX_TOKENS`, se lanza `CORTADO`.
  4. Si no, se unen las `parts` con `part.thought !== true` y se sigue como hoy (`VACIO` y `JSON`).

## 2. `ejecutarConFailover` (motor único)
```js
export const POLITICA_REINTENTOS = {
  reintentosSaturacion: 2, baseMs: 1000, factor: 2, jitter: 0.3,
  maxRetryDelayMs: 10000, presupuestoTotalMs: 90000, minimoRestanteMs: 5000,
};
const clasificarFallo = (error) => 'SATURACION' | 'LIMITE' | 'TIMEOUT' | 'INCOMPLETA' | 'CLAVE' | 'PERMISO' | 'SEGURIDAD' | 'RAZONAMIENTO_NO_SOPORTADO' | 'OTRO';
const modelosSinRazonamiento = new Set(); // en memoria, por sesión de la app
```
`ejecutarConFailover({ apiKey, contexto, construirPeticion, interpretar, onProgreso, timeoutMs, entorno })`
- `entorno = { esperar, ahora, aleatorio }`. Por defecto usa `setTimeout` envuelto en una Promise, `Date.now` y `Math.random`. Las cuatro funciones públicas lo aceptan como `opciones.entorno`, así los tests las prueban sin esperas reales.
- La clave llega por parámetro. El motor no la relee, no la registra y no la guarda en `fallos`.
- Algoritmo:
  ```
  t0 = ahora(); fallos = []; permisosFallidos = 0
  para cada modelo (índice i de N):
    onProgreso?.({ modelo, indice: i+1, total: N, falloAnterior: i > 0 ? último fallo : undefined })   // también con i = 0, antes del primer intento
    reintentosHechos = 0; usarRazonamiento = !modelosSinRazonamiento.has(modelo)
    bucle:
      restante = presupuestoTotalMs - (ahora() - t0)
      si restante < minimoRestanteMs → terminar con fallos
      pet = construirPeticion(modelo)
      try:
        json = await ejecutarLlamadaGemini({ ..., apiKey, nivelRazonamiento: usarRazonamiento ? pet.nivelRazonamiento : null, timeoutMs: min(timeoutMs, restante) })
        return interpretar(json, modelo)      // interpretar lanza status 'JSON' si está incompleto
      catch error:
        clase = clasificarFallo(error)
        si clase == RAZONAMIENTO_NO_SOPORTADO y usarRazonamiento:
          modelosSinRazonamiento.add(modelo); usarRazonamiento = false; continuar bucle   // no consume reintentos
        fallos.push({ modelo, status, clase, mensaje })
        si clase == CLAVE o SEGURIDAD → terminar con fallos
        si clase == PERMISO: permisosFallidos++; si permisosFallidos >= 2 → terminar; romper (siguiente modelo)
        si clase == SATURACION y reintentosHechos < reintentosSaturacion:
          espera = baseMs * factor^reintentosHechos * (1 + (aleatorio()*2-1)*jitter)
        si no, si clase == LIMITE y reintentosHechos == 0 y error.retryDelayMs <= maxRetryDelayMs:
          espera = error.retryDelayMs
        si no → romper (siguiente modelo)
        si (ahora() - t0) + espera + minimoRestanteMs > presupuestoTotalMs → romper
        onProgreso?.({ modelo, indice: i+1, total: N, reintento: reintentosHechos+1, motivo: clase })   // sin falloAnterior
        await esperar(espera); reintentosHechos++
  lanzar new GeminiError(mensajeParaUsuario(fallos, contexto), { status: último status, fallos })
  ```
- `clasificarFallo` decide así:
  - 401 → `CLAVE`.
  - 400 con `reason === 'API_KEY_INVALID'` o con `/api key/i` en `detalle` → `CLAVE`.
  - 400 con `/thinking_?config|thinkingLevel/i` en `detalle` → `RAZONAMIENTO_NO_SOPORTADO`.
  - 403 → `PERMISO`.
  - 429 → `LIMITE`.
  - 500/502/503/504/`RED` → `SATURACION`.
  - `TIMEOUT` → `TIMEOUT`.
  - `JSON`/`VACIO`/`CORTADO` → `INCOMPLETA`.
  - `SEGURIDAD` → `SEGURIDAD`.
  - Cualquier otro caso → `OTRO`.

## 3. `mensajeParaUsuario(fallos, contexto)`
- Si algún fallo es `CLAVE`, `PERMISO` o `SEGURIDAD`, se usa esa clase.
- Si no, se usa la clase del último fallo. Las frases son las de RF-6, con la variante de `SEGURIDAD` según `contexto`.
- Si `fallos` está vacío (se acabó el tiempo antes del primer intento), se usa la frase de `SATURACION`.

## 4. Las cuatro funciones públicas
Las firmas públicas no cambian. Las validaciones previas al envío (imagen o sesiones vacías, falta de clave) conservan su propio `GeminiError` y no pasan por el motor. `opciones.timeoutMs` sigue funcionando: es el tiempo máximo de cada petición. `opciones.entorno` es nuevo y opcional.
- **Comida** (`interpretar`):
  - `cal = resultado.calorias ?? resultado.caloriasTotales`.
  - Si `cal` es `undefined`, `null`, `''` o no es numérico, la respuesta es `JSON`.
  - Si es un número ≥ 0, se devuelve normalizado igual que hoy, **incluido el 0**.
  - Los macros siguen con los alias actuales y con 0 por defecto.
- **Cambio físico:**
  - `veredicto` vale si `typeof === 'number'`, o si es un string no vacío que `Number()` convierte en finito, y si está entre 0 y 10. Si no, `JSON`.
  - `resumenSimple` vacío → `JSON`.
  - Se eliminan el `7.5` y el relleno de `resumenSimple`.
- **Comparación:** `evolucion` vacío → `JSON`.
- **Estudio:** si `normalizarResumenEstudio` devuelve `null`, la respuesta es `JSON`.

En todos los casos `NIVEL_RAZONAMIENTO = { comida: 'low', fisico: 'low', comparacion: 'low', estudio: 'low' }`, exportado.

## 5. Modelos
`MODELO_PRINCIPAL_DEFAULT` y `MODELOS_RESPALDO_DEFAULT` son constantes que se fijan según Q12 y CA-6; no se autodetecta nada. El filtro anti-`gemini-3.8` no cambia.

## 6. Vistas
- **`CambioFisicoView.jsx:464`** y **`ModalAnalisisComida.jsx:55`**:
  - Si el evento trae `reintento`, el texto es «Gemini está saturado, reintentando (n/2)…» con `motivo === 'SATURACION'`, o «Esperando el límite de uso de Gemini…» con `'LIMITE'`.
  - Si trae `falloAnterior`, el texto es el de hoy.
- **`ResumenEstudioCard.jsx:71-74`** (pinta el `progreso` de `useEstudio`): la misma regla. `useEstudio.js:263` ya guarda el objeto completo, así que solo se toca si hace falta.
- No hay más cambios visuales. Los mensajes de error ya se muestran con `error.message`, que ahora es la frase de RF-6.

## 7. Tests
- **`__tests__/geminiFailover.test.js`** (nuevo): CA-2 a CA-5, con `opciones.entorno` simulado. `esperar` registra las esperas y avanza el reloj falso; `ahora` lee ese reloj; `aleatorio` devuelve 0.5. Para CA-2(e), el `fetch` simulado avanza el reloj 60 s y lanza `AbortError`.
- **Tests existentes** (CA-5b):
  - `geminiApiKey.test.js:71-96`: ahora la respuesta del simulado da 350 kcal por el alias. Se ajusta lo que espera `calorias` si el test lo comprobaba.
  - `analizarEstudioGemini.test.js:105-153`: se pasa `entorno`. Se espera que el mismo modelo responda tras un reintento, con un evento `{ reintento: 1, motivo: 'SATURACION' }`.
  - `:155-216`: se pasa `entorno` para que no haya esperas reales.
  - Entre test y test se limpia `modelosSinRazonamiento` con un `__reiniciarEstadoGeminiParaTests()` exportado.

## 8. Prueba real (CA-6)
- Banco de pruebas temporal (`__tests__/zz-bench.tmp.test.js` con cliente `https` de Node). Se borra al terminar y no se commitea.
- La clave se pasa solo por variable de entorno.
- Las fotos del usuario se leen desde una ruta que él indique, fuera del repo.
- Antes de anotar el costo de cada modelo en el informe de `tasks.md` se confirma su precio actual en la página oficial de precios.
