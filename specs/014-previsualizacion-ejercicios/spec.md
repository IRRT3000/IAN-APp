# Spec 014: Previsualización Minimalista de Ejercicios

## 1. Problema
Al elegir un ejercicio en Entrenos (`CatalogoEjerciciosModal`) solo se ven el nombre, el grupo muscular y el implemento. Quien no reconoce un nombre como "Remo en polea baja (Gironde)" no sabe qué movimiento es hasta buscarlo fuera de la app. El usuario quiere una pequeña imagen que muestre el ejercicio, minimalista, coherente con el estilo Dark Luxury OLED y sin saturar la pantalla.

## 2. Alcance
- **Incluye**: 47 ilustraciones locales (una por ejercicio del catálogo base), un componente de miniatura reutilizable, su uso en las filas del catálogo y en las tarjetas de la lista del día de `EntrenamientosView`, y pruebas del mapa de imágenes.
- **No incluye**: Live Mode, animación, imágenes subidas por el usuario, vista ampliada al mantener pulsado, nuevas dependencias ni cambios en el formato de AsyncStorage.

## 3. Decisiones de Diseño (acordadas con el usuario)
- **Ubicación**: miniatura cuadrada a la izquierda del nombre. Tocar la fila sigue seleccionando el ejercicio al instante, sin pasos extra.
- **Estilo**: line-art monocromo de trazo fino y estático (una sola pose clave por ejercicio).
- **Color**: la figura va en gris neutro (`TOKENS.colors.textSecondary`, aplicado con `tintColor`) sobre un cuadro `TOKENS.colors.surface` con un velo del color del grupo muscular a ~10% de opacidad.
- **Sin imagen** (ejercicios personalizados o nombres desconocidos): el mismo cuadro con el icono Feather del implemento en el color del grupo.
- **Origen**: imágenes empaquetadas en la app (funcionan sin conexión). Las genera Antigravity con Gemini usando el prompt maestro de §5.

## 4. Requerimientos Funcionales (RF)
- **RF-1 (Assets)**: 47 PNG en `assets/ejercicios/<id>.png`, uno por cada `id` de `CATALOGO_EJERCICIOS_BASE`. Cada uno mide 192×192 px, con líneas blancas sobre fondo transparente.
- **RF-2 (Mapa de imágenes)**: `src/constants/imagenesEjercicios.js` exporta el mapa `id → require(...)`, el índice `nombre → id` y las funciones `obtenerIdImagenEjercicio({ id, nombre })` y `obtenerImagenEjercicio({ id, nombre })`. Ambas buscan primero por `id` (solo claves propias del mapa) y, si no lo encuentran, por nombre dentro del catálogo base. El nombre se compara sin espacios en los extremos y sin distinguir mayúsculas. Si no hay coincidencia, devuelven `null`.
- **RF-3 (Componente)**: `src/components/MiniaturaEjercicio.jsx` dibuja el cuadro con su velo de color y muestra la imagen teñida o, si no la hay, el icono del implemento. Es decorativo para lectores de pantalla y está memoizado.
- **RF-4 (Catálogo)**: cada fila de `CatalogoEjerciciosModal` muestra una miniatura de 44 pt a la izquierda del nombre.
- **RF-5 (Lista del día)**: cada tarjeta de entreno registrado en `EntrenamientosView` muestra una miniatura de 40 pt a la izquierda del título, resuelta solo por el nombre guardado (`item.ejercicio`). Funciona con los registros guardados antes de esta Spec.

## 5. Contrato de Assets
### Prompt maestro (idéntico para las 47, solo cambia `{POSE}`)
> Minimalist fitness pictogram. A single anonymous, faceless human figure drawn as clean continuous line-art with uniform thin white stroke (about 2% of image width), pure white lines on a pure black (#000000) background. No fill, no shading, no gradients, no text, no logos, no floor shadow. Side or three-quarter view, figure centered with generous even margin, whole body and equipment fully inside a square frame. Equipment drawn with the same white stroke. Pose: {POSE}.

### Posproceso (fuera del repo, sin dependencias nuevas en el proyecto)
1. Convertir la luminancia en canal alfa (el negro queda transparente y el blanco opaco) y dejar el color en blanco puro.
2. Recortar al contenido, volver a centrar en un lienzo cuadrado con margen uniforme (~8%) y escalar a 192×192 px.
3. Optimizar el PNG: ≤ 15 KB por archivo y ≤ 750 KB en total.
4. Revisar las 47 juntas; regenerar cualquiera cuyo grosor de trazo, encuadre o fondo rompa la coherencia del set.

### Poses clave (`{POSE}` por id)
| id | Ejercicio | Pose clave |
| - | - | - |
| base-pecho-1 | Press de banca plano con barra | lying on a flat bench, arms extended pressing a barbell above the chest |
| base-pecho-2 | Press inclinado con mancuernas | lying on an incline bench, pressing two dumbbells up above the upper chest |
| base-pecho-3 | Press declinado con barra | lying on a decline bench head lower than hips, pressing a barbell above the lower chest |
| base-pecho-4 | Aperturas en polea (cruces) | standing between two high cable pulleys, arms sweeping forward and down crossing hands in front of the hips |
| base-pecho-5 | Fondos en paralelas para pecho | supported on parallel bars, torso leaning forward, elbows bent at the bottom of a dip |
| base-pecho-6 | Aperturas en máquina (Pec Deck) | seated in a pec deck machine, arms bringing the pads together in front of the chest |
| base-pecho-7 | Flexiones de pecho (Push-ups) | push-up position, body straight, chest lowered near the floor |
| base-pecho-8 | Press en máquina sentado | seated in a chest press machine, pushing the handles forward with arms extended |
| base-espalda-1 | Jalón al pecho en polea | seated at a lat pulldown machine, pulling a wide bar down to the upper chest |
| base-espalda-2 | Remo con barra pronado | standing bent over at the hips, back flat, rowing a barbell to the lower ribs with overhand grip |
| base-espalda-3 | Remo en polea baja (Gironde) | seated on the floor bench of a low cable row, pulling a handle to the abdomen, torso upright |
| base-espalda-4 | Dominadas pronadas | hanging from a pull-up bar with overhand grip, chin pulled above the bar |
| base-espalda-5 | Peso muerto convencional | standing tall at lockout holding a barbell at the hips, barbell plates visible |
| base-espalda-6 | Remo unilateral con mancuerna | one knee and one hand on a flat bench, rowing a dumbbell to the hip with the other arm |
| base-espalda-7 | Pullover en polea alta con cuerda | standing hinged slightly forward, arms straight pulling a rope from a high pulley down to the thighs |
| base-espalda-8 | Remo en máquina con apoyo en pecho | chest resting on the pad of a row machine, pulling the handles back |
| base-pierna-1 | Sentadilla libre con barra | barbell on upper back, squatting down with thighs parallel to the floor |
| base-pierna-2 | Prensa de piernas 45° | seated in a 45 degree leg press machine, feet on the platform, knees bent |
| base-pierna-3 | Peso muerto rumano | hinged at the hips with soft knees, barbell lowered to mid-shin, back flat |
| base-pierna-4 | Zancadas caminando con mancuernas | walking lunge, front knee bent at 90 degrees, rear knee near the floor, dumbbells at the sides |
| base-pierna-5 | Curl femoral acostado | lying face down on a leg curl machine, heels curling the pad toward the glutes |
| base-pierna-6 | Extensiones de cuádriceps | seated on a leg extension machine, legs extended straight lifting the pad |
| base-pierna-7 | Elevación de talones de pie (Gemelos) | standing on a calf raise machine, shoulders under the pads, rising onto the toes |
| base-pierna-8 | Hip thrust con barra | upper back on a bench, barbell across the hips, hips lifted to form a straight line from knees to shoulders |
| base-pierna-9 | Sentadilla búlgara con mancuernas | rear foot elevated on a bench, front leg in a deep split squat, dumbbells at the sides |
| base-pierna-10 | Aductores en máquina | seated in a hip adductor machine, squeezing the legs together against the pads |
| base-hombro-1 | Press militar sentado con mancuernas | seated on an upright bench, pressing two dumbbells overhead |
| base-hombro-2 | Press militar de pie con barra (OHP) | standing, pressing a barbell overhead with arms locked out |
| base-hombro-3 | Elevaciones laterales con mancuernas | standing, arms raised out to the sides at shoulder height holding dumbbells |
| base-hombro-4 | Elevaciones laterales en polea | standing beside a low cable pulley, raising one arm out to the side to shoulder height |
| base-hombro-5 | Pájaros posteriores con mancuernas | bent over at the hips, arms raised out to the sides holding dumbbells, reverse fly |
| base-hombro-6 | Elevaciones frontales con mancuernas | standing, both arms raised straight in front to shoulder height holding dumbbells |
| base-hombro-7 | Face pull en polea alta | standing facing a high cable pulley, pulling a rope toward the face with elbows high and wide |
| base-hombro-8 | Encogimientos de trapecio con barra | standing holding a barbell at the thighs, shoulders shrugged up toward the ears |
| base-brazo-1 | Curl de bíceps con barra Z | standing, curling an EZ curl bar up to the chest, elbows at the sides |
| base-brazo-2 | Extensiones de tríceps en polea alta (Cuerda) | standing facing a high pulley, pushing a rope down with arms extended, elbows at the sides |
| base-brazo-3 | Curl martillo con mancuernas | standing, curling dumbbells with neutral grip, palms facing each other |
| base-brazo-4 | Press francés en banco con barra Z | lying on a flat bench, upper arms vertical, lowering an EZ bar toward the forehead |
| base-brazo-5 | Curl de bíceps en banco inclinado | seated reclined on an incline bench, arms hanging back, curling dumbbells |
| base-brazo-6 | Fondos de tríceps en máquina | seated in a triceps dip machine, pushing the handles down with arms extended |
| base-brazo-7 | Curl concentrado con mancuerna | seated on a bench, elbow braced on the inner thigh, curling one dumbbell |
| base-brazo-8 | Extensiones de tríceps sobre cabeza (Mancuerna) | seated, holding one dumbbell with both hands behind the head, elbows pointing up |
| base-core-1 | Crunches en polea alta arrodillado | kneeling below a high pulley, holding a rope by the head, crunching the torso down |
| base-core-2 | Elevaciones de piernas colgado en barra | hanging from a bar with straight arms, legs raised straight to hip height |
| base-core-3 | Plancha isométrica abdominal | forearm plank, body in a straight line from head to heels |
| base-core-4 | Rueda abdominal (Ab Roller) | kneeling, rolling an ab wheel forward with the body extended low over the floor |
| base-core-5 | Giros rusos con peso (Russian Twists) | seated leaning back with feet lifted, rotating the torso holding a dumbbell to one side |

## 6. Criterios de Aceptación (CA)
- **CA-1**: Existen exactamente 47 PNG en `assets/ejercicios/`, con nombres que coinciden uno a uno con los `id` de `CATALOGO_EJERCICIOS_BASE`. Cada uno mide 192×192 px, tiene canal alfa con fondo transparente (tipo de color PNG 4 o 6) y pesa ≤ 15 360 bytes; el total es ≤ 768 000 bytes. Se verifica de forma automática en `__tests__/imagenesEjercicios.test.js`, que lee la cabecera IHDR de cada archivo.
- **CA-2**: Cada fila del catálogo muestra la miniatura de 44 pt a la izquierda del nombre. Tocar la fila hace exactamente lo de antes (mismo háptico `vibrarSeleccionBascula`, misma llamada a `onSeleccionarEjercicio`) y la fila conserva una altura táctil ≥ 44 pt.
- **CA-3**: Los ejercicios personalizados y cualquier nombre sin imagen muestran el placeholder con el icono del implemento. Nunca aparece un cuadro vacío, una imagen rota ni un error.
- **CA-4**: Las tarjetas de la lista del día muestran la miniatura de 40 pt, incluidos los registros guardados antes de esta Spec (por ejemplo, un "Jalón al pecho en polea" ya existente muestra su imagen), sin migrar datos.
- **CA-5**: El formato de los registros en AsyncStorage no cambia: `storage.js`, `guardarEntrenamiento` y `LiveModeModal` no se modifican.
- **CA-6**: `package.json` y `package-lock.json` no cambian (no hay dependencias nuevas).
- **CA-7**: Los estilos usan solo tokens de `src/theme/tokens.js` y la escala de 4 pt. El único color derivado permitido es el velo, calculado a partir de `obtenerColorGrupo()`. No hay emojis.
- **CA-8**: `npm run gate` termina con código 0, con 6 suites y al menos 63 pruebas (56 existentes más ≥ 7 bloques `test(...)` nuevos en `__tests__/imagenesEjercicios.test.js`). Las pruebas nuevas comparan ids, no valores de `require` (que `jest-expo` transforma a `1`), y verifican la coherencia entre cada clave del mapa y el archivo de su `require`.
- **CA-9**: En dispositivo o Expo Go, las 47 miniaturas se ven coherentes (mismo grosor de trazo, mismo encuadre, sin fondo visible), la lista se desplaza con fluidez y no se ve saturada.
