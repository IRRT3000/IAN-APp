# Spec 028: Nutrición usable sin IA (Fase 1 del roadmap)

> **Estado: CODIGO_APROBADO (2026-11-28).** Lo redactó Claude Code el 2026-11-28 a partir del diagnóstico del mismo día (Fase 1, aprobada por el dueño). Reúne las propuestas 3 y 4 de `specs/PROPUESTAS-funcionalidades.md` y el registro manual.

## 1. Problema
Hoy toda comida necesita una foto y una API key de Gemini: sin ellas no se puede registrar nada. Si Gemini se equivoca después de guardar, la única salida es borrar y volver a analizar, lo que gasta otra llamada. Y la pantalla suma lo comido, pero no lo compara con ninguna meta, así que el usuario no sabe si va bien.

## 2. Requerimientos Funcionales
- **RF-1 (Registro manual).** En Nutrición, el día de hoy, junto a «Escanear con Cámara» y «Galería», hay un botón «Manual». Abre un formulario con nombre del plato (obligatorio), kcal, proteínas, carbohidratos y grasas (opcionales, 0 por defecto) y usa el tipo de comida seleccionado. No pide foto ni API key. La comida se guarda con `uriFoto` vacío y la tarjeta se ve igual que las demás, sin miniatura.
- **RF-2 (Editar una comida de hoy).** Tocar una tarjeta de comida de hoy abre el mismo formulario con sus valores; al guardar se actualiza esa comida (mismo `id`, misma foto, misma fecha) sin llamar a Gemini. Se puede cambiar nombre, tipo, kcal y macros. Las comidas de días pasados siguen siendo de solo lectura (regla de inmutabilidad temporal de la Spec 003). Mantener pulsado para borrar sigue igual.
- **RF-3 (Meta diaria automática).** La app calcula una meta orientativa de kcal y macros desde el perfil:
  - Metabolismo basal con Mifflin-St Jeor: `10 × peso(kg) + 6.25 × altura(cm) − 5 × edad + 5` (Hombre) o `− 161` (Mujer).
  - Gasto diario = basal × 1.55 (actividad moderada, porque el usuario entrena).
  - Ajuste por objetivo: Mantenimiento 0 %, Volumen +10 %, Definición −20 %, Recomposición −10 %. Se redondea a la decena.
  - Proteínas 2 g por kg de peso; grasas 25 % de las kcal (÷ 9); carbohidratos el resto (÷ 4), nunca negativo. Gramos enteros.
- **RF-4 (Meta editable).** En la tarjeta de totales, «Editar meta» abre un formulario con kcal y los tres macros, prellenados con la meta actual. El usuario puede guardar valores propios o volver a «Automática». La meta propia se guarda en AsyncStorage y viaja en el respaldo de la Spec 025.
- **RF-5 (Progreso del día).** La tarjeta de totales muestra «consumido / meta kcal» con una barra de progreso, y debajo de cada macro «X / Y g». La barra se llena hasta 100 %; si se pasa de la meta, la barra queda llena y el texto dice «+N kcal sobre la meta». Funciona también en días pasados (se compara con la meta actual). Un texto pequeño indica «Estimación orientativa, no es consejo médico».
- **RF-6 (Accesibilidad y estilo).** Todo lo nuevo respeta las reglas del proyecto: `accessibilityLabel` + `accessibilityRole` en táctiles, etiqueta en cada campo, `aria-*` para estados, texto de `base/Texto`, `ModalAccesible`, `mostrarAlerta`, iconos Feather, tokens Dark Luxury OLED, sin emojis, texto ≥ 11 px y objetivos táctiles ≥ 44 pt. La barra de progreso se anuncia como «Calorías: 1450 de 2300 kilocalorías».

## 3. Fuera de alcance
Historial y promedios semanales, agua, base de alimentos, cambiar la fecha de una comida y editar días pasados.

## 4. Criterios de Aceptación
- **CA-1.** Con la API key vacía, se puede registrar una comida manual desde Nutrición y aparece en «Registros de hoy» y en los totales. Sin nombre, el botón Guardar queda deshabilitado (`aria-disabled`).
- **CA-2.** Los números aceptan coma o punto decimal y se sanean con `sanearValoresComida` (nunca NaN ni negativos).
- **CA-3.** Nueva función `actualizarComida(id, cambios)` en `storage.js`: inmutable, conserva `id`, `fecha`, `uriFoto`/`fotoUri` y `detalles`, actualiza `nombre`/`descripcion`, `tipo`, kcal, macros y `macros{}`; lanza error si el `id` no existe o si falla la escritura. Con pruebas.
- **CA-4.** Tocar una tarjeta de hoy abre el formulario prellenado; guardar cambia la tarjeta y los totales sin llamar a Gemini. Las tarjetas de días pasados no abren nada.
- **CA-5.** Nueva utilidad pura `calcularMetaNutricional(perfil)` en `src/utils/metaNutricional.js` que cumple RF-3. Prueba con el caso Hombre, 80 kg, 180 cm, 30 años, Mantenimiento → basal 1780, gasto 2759, meta 2760 kcal, 160 g proteína, 77 g grasa y 358 g carbohidratos (carbohidratos = (2760 − 160×4 − 2760×0.25) ÷ 4 = 357.5, redondeado). Más pruebas para Mujer, cada objetivo y perfil incompleto (usa `PERFIL_USUARIO_BASE`).
- **CA-6.** La meta propia se guarda en la clave `@fitness_tracker_meta_nutricion_v1` con forma `{ modo: 'auto' | 'manual', calorias, proteinas, carbohidratos, grasas }`. Esa clave está en `CLAVES_EXACTAS` de `respaldo.js` con validación de objeto. Con pruebas de carga, guardado y respaldo.
- **CA-7.** La tarjeta de totales muestra la barra y los textos de RF-5, incluido el caso «sobre la meta».
- **CA-8.** `npm run gate` pasa. Las pruebas estáticas de accesibilidad (`accesibilidadEstatica`, `tamanoTexto`) pasan sin añadir excepciones nuevas. Los snapshots existentes no cambian salvo `NutricionView` si lo cubre, con el diff justificado.
