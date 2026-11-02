# Plan Técnico — Spec 018: Análisis Nutricional Contextual y de Alta Precisión

## 1. Criterios de Aceptación (CA) Medibles

- **CA-1 (Intercepción de Captura)**: Al tomar foto o seleccionar de galería en `NutricionView`, la app abre la modal de preparación mostrando la imagen capturada, el badge del tipo de comida, el campo de texto opcional y el botón "Analizar con IA", sin invocar a Gemini de forma anticipada.
- **CA-2 (Texto Opcional)**: Si el campo de descripción se deja vacío, al pulsar "Analizar con IA" se ejecuta el análisis nutricional estándar sin errores ni bloqueos.
- **CA-3 (Inyección en Prompt de Gemini)**: Cuando el usuario proporciona texto (ej. "200g pechuga, 1 taza arroz"), `construirPromptAltaPrecision` incluye el bloque con directiva estricta de verdad base y las notas del usuario.
- **CA-4 (Resiliencia ante Fallos)**: Si la llamada a Gemini arroja un error (timeout, falta de API key o falla de modelos), la modal permanece abierta con la foto y el texto intactos, mostrando el mensaje de error correspondiente y permitiendo reintentar.
- **CA-5 (Transición a Revisión)**: Al responder Gemini exitosamente, la modal pasa al estado de revisión mostrando la miniatura, el nombre propuesto y los 4 inputs de macros (Calorías, Proteínas, Carbohidratos, Grasas) con los valores devueltos por la IA.
- **CA-6 (Edición de Macros y Nombre)**: El usuario puede modificar el nombre del plato y cualquiera de los 4 valores numéricos de macros libremente antes de guardar.
- **CA-7 (Validación Defensiva de Macros)**: Si el usuario introduce valores no numéricos, negativos o vacíos, la función saneadora los normaliza a 0 (y a enteros para calorías o 1 decimal para macros). El nombre no puede quedar vacío.
- **CA-8 (Guardado en AsyncStorage)**: Al presionar "Guardar en mi día", se persiste la comida con `guardarComida` utilizando los valores finales validados, se cierra la modal y se actualiza la lista y la tarjeta de totales de `NutricionView`.
- **CA-9 (Descarte Seguro)**: Al presionar "Descartar" o cerrar la modal en cualquiera de sus etapas, se cancela la operación y no se persiste nada en `AsyncStorage`.
- **CA-10 (Cero Emojis y Dark Luxury OLED)**: Cero emojis en inputs, modales, alertas y botones; uso estricto de iconos Feather y paleta de tokens.
- **CA-11 (Ergonomía Móvil y Teclado)**: Insets seguros con `useSafeInsets`, `KeyboardAvoidingView` con `ScrollView` (`keyboardShouldPersistTaps="handled"`) y botones de acción en la mitad inferior (Thumb-Zone) con touch targets >= 44x44pt.
- **CA-12 (Pruebas Automatizadas)**: `npm run gate` en verde (lint 0 errores, suites de test en verde y bundle:check sin exposición de secretos).

---

## 2. Modificaciones en el Servicio de Gemini (`src/services/gemini.js`)

### 2.1 Actualización de `construirPromptAltaPrecision`
Firma: `construirPromptAltaPrecision(tipoComida, contextoPerfil = {}, descripcionUsuario = '')`

Cuando `descripcionUsuario` tenga contenido (string no vacío tras `trim()`):
```text
CONTEXTO Y DETALLES ESPECIFICADOS POR EL USUARIO:
"${descripcionUsuario.trim()}"

DIRECTIVA CRÍTICA DE PRIORIDAD CUANTITATIVA:
1. Si el usuario especificó cantidades, pesos (ej. gramos, mililitros, piezas) o ingredientes concretos en la descripción, toma esos datos como la VERDAD BASE INMUTABLE y no los contradigas por la perspectiva o ángulo de la foto.
2. Utiliza la fotografía para identificar ingredientes secundarios no mencionados (guarniciones, aderezos, aceites visibles), evaluar el método de preparación observable y complementar el análisis.
3. Calcula las calorías y macronutrientes asegurando coherencia termodinámica con las cantidades declaradas por el usuario.
```

Si `descripcionUsuario` está vacío o ausente, se conserva el flujo actual puramente visual.

### 2.2 Actualización de `analizarComidaConGemini`
Aceptar en `opciones` el parámetro `descripcionUsuario`:
```js
export const analizarComidaConGemini = async (
  base64Image,
  tipoComida = 'Comida',
  opciones = {}
) => {
  const { descripcionUsuario = '', onProgreso, timeoutMs = TIMEOUT_POR_PETICION_MS } = opciones;
  // ... pasar descripcionUsuario a solicitarAnalisis -> construirPromptAltaPrecision
};
```

---

## 3. Lógica Pura de Validación (`src/utils/validacionComida.js` - Archivo Nuevo)

Se crea una función de saneamiento pura y determinista para desacoplar la validación de la UI y facilitar pruebas unitarias exhaustivas:

```js
/**
 * Normaliza y sanea los valores de una comida editada manualmente o devuelta por IA.
 * @param {Object} valores
 * @returns {Object} valores normalizados con números >= 0 y strings limpios.
 */
export function sanearValoresComida({
  nombre = '',
  nombreDefault = 'Comida registrada',
  calorias = 0,
  proteinas = 0,
  carbohidratos = 0,
  grasas = 0,
  detalles = '',
} = {}) {
  const nombreLimpio = String(nombre || '').trim() || String(nombreDefault || 'Comida registrada').trim();
  
  const calNum = Number(String(calorias).replace(',', '.'));
  const caloriasSanas = Number.isFinite(calNum) ? Math.max(0, Math.round(calNum)) : 0;

  const protNum = Number(String(proteinas).replace(',', '.'));
  const proteinasSanas = Number.isFinite(protNum) ? Math.max(0, Math.round(protNum * 10) / 10) : 0;

  const carbNum = Number(String(carbohidratos).replace(',', '.'));
  const carbohidratosSanos = Number.isFinite(carbNum) ? Math.max(0, Math.round(carbNum * 10) / 10) : 0;

  const grasNum = Number(String(grasas).replace(',', '.'));
  const grasasSanas = Number.isFinite(grasNum) ? Math.max(0, Math.round(grasNum * 10) / 10) : 0;

  return {
    nombre: nombreLimpio,
    calorias: caloriasSanas,
    proteinas: proteinasSanas,
    carbohidratos: carbohidratosSanos,
    grasas: grasasSanas,
    detalles: String(detalles || '').trim(),
  };
}
```

---

## 4. Componente de Modal: `ModalAnalisisComida.jsx` (`src/components/`)

Componente dedicado para encapsular el ciclo de vida del análisis contextual:
- **Estados internos de la modal**:
  - `'preparacion'`: Foto capturada, badge del tipo de comida, botón "Cambiar foto", campo de texto multilínea opcional, botón "Analizar con IA" y botón de cerrar.
  - `'analizando'`: Indicador de actividad, modelo en curso (`onProgreso`), botones deshabilitados.
  - `'revision'`: Foto miniatura, input de nombre, 4 inputs de macros con layout en cuadrícula 2x2, caja de evaluación biométrica IA, botón secundario "Descartar" y botón primario "Guardar en mi día".
- **Props**:
  - `visible`: boolean.
  - `fotoUri`: string.
  - `fotoBase64`: string.
  - `tipoComida`: string.
  - `perfilUsuario`: object.
  - `onCambiarFoto`: function (dispara selector de cámara/galería).
  - `onCerrar`: function (descarta y limpia).
  - `onGuardar`: function(comidaNormalizada) (persiste en storage).
- **Manejo de Teclado**:
  - `KeyboardAvoidingView` con `Platform.OS === 'ios' ? 'padding' : undefined`.
  - `ScrollView` con `keyboardShouldPersistTaps="handled"` y `showsVerticalScrollIndicator={false}`.
- **Tokens y Estética**:
  - Fondo `rgba(0, 0, 0, 0.85)` para el backdrop.
  - Tarjeta contenedora `TOKENS.colors.surface` con borde `TOKENS.colors.borderDefault`.
  - Inputs con fondo `TOKENS.colors.surfaceElevated`, borde sutil y texto `TOKENS.colors.textPrimary`.

---

## 5. Integración en `NutricionView.jsx`

- Reemplazar la ejecución inmediata de `procesarFotoSeleccionada` por la apertura de `ModalAnalisisComida`.
- Los botones de "Escanear con Cámara" y "Galería" únicamente cargan `{ uri, base64 }` en el estado de borrador y activan `modalAnalisisVisible = true`.
- Al guardar desde la modal, se ejecuta `guardarComida`, se sincroniza el estado de comidas del día y se emiten los hápticos correspondientes.

---

## 6. Plan de Pruebas Automatizadas

1. **`__tests__/validacionComida.test.js`** (Nueva suite):
   - Prueba de normalización de números negativos (`-15` -> `0`).
   - Prueba de valores no numéricos (`'abc'` -> `0`).
   - Prueba de coma decimal española (`'12,5'` -> `12.5`).
   - Prueba de redondeo de calorías a entero y macros a 1 decimal.
   - Prueba de fallback de nombre vacío al valor por defecto.
2. **`__tests__/gemini.test.js`**:
   - Verificar que `construirPromptAltaPrecision` incluya la directiva de prioridad y el texto del usuario cuando se suministre.
   - Verificar que cuando `descripcionUsuario` sea vacía, el prompt mantenga el formato visual sin directiva de usuario.
3. **`__tests__/NutricionView.test.js`**:
   - Verificar que al seleccionar imagen no se invoque a Gemini de inmediato y se muestre la modal de preparación.
   - Verificar que el flujo de revisión guarde correctamente los valores modificados por el usuario.
