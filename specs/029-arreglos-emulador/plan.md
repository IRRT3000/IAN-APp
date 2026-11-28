# Plan — Spec 029

## 1. Teclado en Android (CA-1)
- `src/components/nutricion/estilosFormulario.js`: en `tarjetaModal` cambiar `maxHeight: '92%'` por `flexShrink: 1`. La tarjeta ya no se calcula como porcentaje de una ventana que Android redimensiona al abrir el teclado; ocupa lo que necesita y, si no cabe, se encoge dentro del contenedor y su `ScrollView` interno hace scroll.
- `ModalComidaManual.jsx` y `ModalMetaNutricion.jsx`: mantener `KeyboardAvoidingView` con `padding` en iOS. En Android pasar a `behavior={undefined}` explícito ya es lo actual; la ventana se redimensiona sola (`softwareKeyboardLayoutMode` por defecto «resize»), así que el arreglo principal es quitar el límite de 92 %.
- Tras la revisión del plan: no se añade un hook de teclado por adelantado. Con edge-to-edge obligatorio en SDK 58, que la ventana del `Modal` se redimensione es una suposición; se verifica en el emulador. Si el hueco persiste, se prueba `behavior="height"` (patrón de `OnboardingBienvenidaModal`) o `padding` en Android, y solo si ninguno basta se añade el hook `useTecladoVisible` con alineación arriba.
- Comprobar en el emulador que con altura reducida la cabecera y el pie siguen visibles y el `ScrollView` hace scroll. En web la tarjeta queda acotada por `keyboardContainer` (flex 1), así que no hace falta `maxHeight`.

## 2. Texto de marca (CA-2)
- `src/components/onboarding/renderEscenaCelebracion.js:85`: reemplazar el texto por `IXN · PASAPORTE DE ATLETA`.

## 3. Error de meta (CA-3)
- `ModalMetaNutricion.jsx`: en cada `onChangeText` llamar a `setError('')` además de actualizar el valor.

## 4. Macros que siguen a las kcal (CA-4)
- `src/utils/metaNutricional.js`: añadir `reescalarMacros(base, kcal)`. `base = { calorias, proteinas, carbohidratos, grasas }` en números. Si `kcal` o `base.calorias` no son finitos y mayores que 0, devuelve `null`. Si no, devuelve `{ proteinas, carbohidratos, grasas }` como `Math.round(base.x * kcal / base.calorias)`.
- `ModalMetaNutricion.jsx`: guardar la base en un `useRef` inicializado con la meta activa (convertida con `Number`). Al editar kcal, si `reescalarMacros` devuelve valores, actualizar los tres macros con ellos (como texto). Se reescala siempre desde la base, nunca desde el valor anterior, así que teclear kcal parciales («2», «22», «220») no acumula errores. Al editar un macro, la base toma los macros actuales (con el nuevo) y las kcal actuales si son válidas; si no, conserva `base.calorias` anterior. No se acota a 1000 g: `validarMetaEditada` avisa al guardar. El redondeo por campo puede no sumar exacto con las kcal; es aceptable.
- Un solo handler de cambio por campo que también borra el error (§3). El modal se monta de nuevo en cada apertura (`key` en `NutricionView`), así que la base se reinicia sola.
- Tests: `__tests__/metaNutricional.test.js` (función pura: caso del ejemplo, kcal vacías, 0, negativas, base con macros 0 sin NaN, base sin kcal) y un test de UI en `__tests__/nutricionManualUI.test.js` (o archivo nuevo) para el reescalado, el respeto del macro editado y el borrado del error.

## 5. Cierre
- `npm run gate` (regenerar y justificar snapshots si cambian). `grep` sin «FITNESS TRACKER» ni «MATTE LUXURY» en `src/` y `__tests__/`. Revisión de código. Prueba en el emulador por Remote Control sin commits. Actualizar `MEMORY.md` y evaluar `TROUBLESHOOTING.md` (teclado Android en modales).

## Resultado en el emulador
La primera prueba (solo `flexShrink`) dejó un bloque vacío dentro de la tarjeta: el `insets.bottom` de `useSafeInsets` crecía con el teclado y se sumaba como `paddingBottom`. Arreglo final: padding fijo en la tarjeta, `insets.top` solo en el fondo y `behavior` `height` en Android. La segunda prueba pasó CA-1 a CA-4.
