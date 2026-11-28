# Spec 029 — Arreglos tras la prueba en el emulador

## Contexto
La prueba de las Specs 027 y 028 en el emulador Android (Expo Go, AVD `medium_phone`) pasó los 7 flujos, pero dejó cuatro detalles visibles para el usuario. Esta spec los corrige sin añadir funciones nuevas.

## Problemas
1. **Teclado en Android.** Al abrir el teclado en el formulario de comida manual (y en el de meta diaria) la tarjeta se encoge, queda un hueco negro y el campo del nombre puede quedar fuera de la vista.
2. **Texto antiguo de marca.** La tarjeta de celebración del onboarding todavía dice «FITNESS TRACKER · MATTE LUXURY ID».
3. **Error de meta pegado.** Si al guardar una meta propia aparece un error de rango, el mensaje sigue en pantalla aunque el usuario corrija el valor.
4. **Macros que no siguen a las calorías.** Al cambiar las kcal de la meta propia, los macros se quedan con los gramos anteriores (por ejemplo 148/377/78 g para 2200 kcal), y la meta resultante no suma.

## Criterios de aceptación
- **CA-1.** En Android, con el teclado abierto en el formulario de comida manual y en el de meta diaria, la tarjeta no deja un hueco negro entre la tarjeta y el teclado, y el campo enfocado queda visible. Se verifica en el emulador.
- **CA-2.** La tarjeta de celebración muestra «IXN · PASAPORTE DE ATLETA» y ya no aparece «FITNESS TRACKER» ni «MATTE LUXURY» en `src/`.
- **CA-3.** Tras un error de validación en la meta propia, editar cualquier campo borra el mensaje de error. Lo cubre un test.
- **CA-4.** Al editar las kcal de la meta propia con un número válido mayor que 0, los tres macros se reescalan en proporción a las kcal, partiendo del último reparto que el usuario dejó (el de la meta activa al abrir, o el que tenía tras editar un macro a mano). Ejemplo: base 2760 kcal con 160/358/77 g, al escribir 2200 kcal quedan 128/285/61 g. Si el usuario edita un macro, ese valor se respeta y pasa a ser la nueva base. Lo cubren tests de la función pura y de la UI.
- **CA-5.** `npm run gate` pasa (lint, tests y bundle).

## Fuera de alcance
Otros modales con `KeyboardAvoidingView` (catálogo, análisis de comida, panel lateral) no se tocan salvo que el emulador muestre el mismo fallo.
