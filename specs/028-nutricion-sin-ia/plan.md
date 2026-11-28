# Plan 028: Nutrición usable sin IA

## 1. Datos (`src/services/storage.js`, leer por rangos)
- Nueva constante `STORAGE_KEY_META_NUTRICION = '@fitness_tracker_meta_nutricion_v1'`.
- `cargarMetaNutricion()`: devuelve el objeto guardado saneado o `{ modo: 'auto' }` si no hay o está corrupto (no lanza).
- `guardarMetaNutricion(meta)`: sanea (`modo` solo 'auto'|'manual'; números enteros ≥ 0, kcal entre 800 y 8000, macros ≤ 1000 g) y lanza si falla la escritura, como los demás guardados.
- `actualizarComida(id, cambios)` junto a `guardarComida`: carga, busca por `String(id)`, lanza `Error('No se encontró la comida.')` si no existe; construye la nueva comida con spread conservando `id`, `fecha`, `uriFoto`, `fotoUri`, `detalles`; reescribe `nombre`, `descripcion`, `tipo`, `calorias`, `proteinas`, `carbohidratos`, `grasas`, `macros`; escribe la lista nueva con `map` (inmutable) y la devuelve. Mismo manejo de error que `guardarComida`.

## 2. Respaldo (`src/services/respaldo.js`)
- Importar la clave nueva y añadirla a `CLAVES_EXACTAS` con `esObjeto`. Actualizar `__tests__/respaldo.test.js` si alguna prueba enumera las claves.

## 3. Meta (`src/utils/metaNutricional.js`, nuevo, puro)
- `calcularMetaNutricional(perfil)` según RF-3. Edad con `calcularEdadExacta(new Date(), perfil.fechaNacimiento).anios`; peso `pesoKgActual ?? pesoKgBase`; faltantes desde `PERFIL_USUARIO_BASE`. Devuelve `{ calorias, proteinas, carbohidratos, grasas, basal, gasto }`.
- `resolverMetaActiva(perfil, metaGuardada)`: si `modo === 'manual'` y kcal > 0 devuelve la guardada con `modo: 'manual'`; si no, la automática con `modo: 'auto'`.
- `calcularProgreso(consumido, meta)`: `{ porcentaje (0–1, tope 1), exceso (≥ 0) }`, sin dividir por 0.

## 4. UI
- **`src/components/ModalComidaManual.jsx` (nuevo).** `ModalAccesible` con título «Registrar comida» o «Editar comida». Campos: nombre (`maxLength` = `LIMITE_DESCRIPCION_COMIDA` de `gemini.js`, o 80 si se prefiere uno propio), chips de tipo (`radio` + `aria-checked`, reutilizando `TIPOS_COMIDA`), kcal, proteínas, carbohidratos y grasas (`keyboardType="decimal-pad"`, etiqueta con unidad). Botones Cancelar y Guardar (deshabilitado sin nombre, `aria-disabled`, `aria-busy` al guardar). Al guardar llama `onGuardar(sanearValoresComida({...}), tipo)`. Props: `visible`, `comidaInicial` (null = nueva), `tipoInicial`, `onCerrar`, `onGuardar`.
- **`src/components/ModalMetaNutricion.jsx` (nuevo).** `ModalAccesible` «Meta diaria». Muestra la meta automática como referencia y cuatro campos prellenados con la activa. Botones «Usar automática» (guarda `{ modo: 'auto' }`), Cancelar y Guardar (guarda `modo: 'manual'`). Texto «Estimación orientativa, no es consejo médico».
- **`src/components/NutricionView.jsx` (>500 líneas: editar por rangos).**
  - Estado: `metaGuardada` (carga en el efecto inicial con `cargarMetaNutricion`), `modalManual` (`{ visible, comida }`), `modalMetaVisible`. `metaActiva = useMemo(resolverMetaActiva(perfilUsuario, metaGuardada))`.
  - Tercer botón «Manual» (icono `edit-3`) en `seccionAcciones`; el texto de sección pasa de «TIPO DE COMIDA A ESCANEAR» a «TIPO DE COMIDA». Comprobar que los tres botones caben en 320 px de ancho (fila con `flex: 1` o segunda fila).
  - Tarjeta de totales: «{consumido} / {meta} kcal», barra (`View` con ancho en %; `accessibilityRole="progressbar"` + `aria-valuenow/min/max` y etiqueta de RF-6), «X / Y g» por macro, texto de exceso, enlace «Editar meta» (`button`) y aviso orientativo.
  - En `renderItem`, si `esHoy`, la tarjeta se envuelve en un `TouchableOpacity` (`button`, etiqueta «Editar {nombre}») que abre `ModalComidaManual` con la comida. La cápsula de borrado sigue siendo un táctil hermano, no anidado (evitar botones anidados en web, ver la Spec 023).
  - `handleGuardarManual(valores, tipo)`: si hay comida inicial llama `actualizarComida`, si no `guardarComida` con `uriFoto: ''` y `fecha: obtenerFechaLocal()`. Luego `anunciar`, `vibrarExito`, `reproducirSonido('exito')` y propaga con `onComidaRegistrada` como hoy. Error → `mostrarAlerta`.
  - Texto vacío de hoy: «Toma una foto de tu plato o regístrala a mano.»

## 5. Pruebas
- `__tests__/metaNutricional.test.js` (CA-5 y `calcularProgreso`).
- `__tests__/comidaManual.test.js`: `actualizarComida`, `cargarMetaNutricion`/`guardarMetaNutricion` con el mock de AsyncStorage.
- Ampliar `__tests__/NutricionView.test.js`: botón Manual abre el modal; guardar sin API key añade la comida; tarjeta de hoy abre edición; barra muestra «de N kilocalorías».
- Ampliar `respaldo.test.js` con la clave nueva.

## 6. Riesgos
- Botones anidados en web: la tarjeta táctil no debe contener la cápsula de borrado; ponerlas lado a lado o la cápsula fuera del área táctil.
- `perfilUsuario` puede ser `null` al inicio: `calcularMetaNutricional` usa la base.
- Snapshot `humoComponentes` puede cubrir NutricionView: si cambia, justificar el diff.

## 7. Verificación
`npm run gate`; prueba manual en la build web local (`npx expo export --platform web` y servir `dist/`) con Playwright a 375×812: registrar manual, editar, editar meta.

## 8. Ajustes tras la revisión del plan (v2)
- **CA-5:** carbohidratos = (kcal − proteínas×4 − kcal×0.25) ÷ 4, con la grasa en kcal sin redondear; cada gramo se redondea al final con `Math.round`. Caso de prueba: 358 g.
- **Fecha estable:** `calcularMetaNutricional(perfil, fechaReferencia = new Date())`, para que las pruebas pasen una fecha fija. Un `sexo` desconocido se trata como `PERFIL_USUARIO_BASE.sexo`; un `objetivo` desconocido, como Mantenimiento.
- **Táctil de edición:** cubre solo `cuerpoTarjetaComida` (foto, nombre y métricas). La cápsula de borrado queda en `cabeceraComida`, fuera de él: nunca un botón dentro de otro. Una prueba lo comprueba.
- **Nombre:** `maxLength` 80 (constante propia `LIMITE_NOMBRE_COMIDA` en `validacionComida.js`; no se importa `gemini.js`). Guardar exige `nombre.trim()` no vacío.
- **Campos de `actualizarComida`:** solo `nombre`, `descripcion`, `tipo`, `calorias`, `proteinas`, `carbohidratos`, `grasas` y `macros`. `detalles` (el análisis IA) se conserva tal cual.
- **Prellenado:** `item.proteinas ?? item.macros?.proteinas` (igual para los otros macros); modal montado con `key={comida?.id ?? 'nueva'}`.
- **Límites de la meta:** kcal 800–8000 y macros 0–1000 g. Si el usuario escribe un valor fuera de rango, el modal muestra el error en línea, lo anuncia y no guarda. `cargarMetaNutricion` sanea un JSON corrupto o fuera de rango y devuelve `{ modo: 'auto' }` sin lanzar (pruebas con JSON basura y con valores fuera de rango).
- **Botones:** fila de tres con `flex: 1` y textos cortos «Cámara», «Galería», «Manual», alto ≥ 44 pt y texto ≥ 11 px.
- **Barra:** `accessibilityRole="progressbar"` con `aria-valuenow`, `aria-valuemin` 0, `aria-valuemax` = meta. Etiqueta: «Calorías: X de Y kilocalorías», o «…, N sobre la meta» si se pasa.
- **Textos exactos (CA-7):** «X / Y kcal», «X / Y g» por macro y «+N kcal sobre la meta». Con meta 0 (no debería ocurrir por los límites) la barra queda vacía y no se divide por cero.
- **Teclado:** los formularios usan `ScrollView` con `keyboardShouldPersistTaps="handled"` dentro de `KeyboardAvoidingView`.
- **Guardado:** guard con ref contra doble toque y `aria-busy`. Si `onComidaRegistrada` no es función, `setComidasInternas(lista)`.
- **CA-4:** la prueba comprueba que el mock de Gemini no se llama.
- **Riesgos aceptados:** si la lista de comidas está corrupta, `actualizarComida` lanza «No se encontró la comida» y se muestra la alerta; las comidas editadas a mano conservan su «Evaluación IA» original.
- `__tests__/NutricionView.test.js` ya existe y se amplía; en `respaldo.test.js` basta un caso nuevo con la clave de meta.
