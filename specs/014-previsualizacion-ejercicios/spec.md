# Spec 014: Previsualización Minimalista de Ejercicios

## 1. Problema
Al elegir un ejercicio en Entrenos (`CatalogoEjerciciosModal`) solo se ven el nombre, el grupo muscular y el implemento. Quien no reconoce un nombre como "Remo en polea baja (Gironde)" no sabe qué movimiento es hasta buscarlo fuera de la app. El usuario quiere una pequeña imagen que muestre el ejercicio, minimalista, coherente con el estilo Dark Luxury OLED y sin saturar la pantalla.

## 2. Alcance
- **Incluye**: 47 ilustraciones locales (una por ejercicio del catálogo base), un componente de miniatura reutilizable, su uso en las filas del catálogo y en las tarjetas de la lista del día de `EntrenamientosView`, y pruebas del mapa de imágenes.
- **No incluye**: Live Mode, animación, imágenes subidas por el usuario, vista ampliada al mantener pulsado, nuevas dependencias ni cambios en el formato de AsyncStorage.

## 3. Decisiones de Diseño (acordadas con el usuario)
- **Ubicación**: miniatura cuadrada a la izquierda del nombre. Tocar la fila sigue seleccionando el ejercicio al instante, sin pasos extra.
- **Estilo**: ilustración plana a color de RepDB, estática (una sola pose por ejercicio). *Cambio del 2026-10-31: el line-art de Gemini se descartó porque Gemini solo permite generar unas 10 imágenes cada varias horas.*
- **Color**: la ilustración se muestra tal cual, ocupando todo el cuadro (con su fondo original, que la licencia no permite quitar), con radio `TOKENS.radii.sm` y borde hairline. No se tiñe.
- **Sin imagen** (ejercicios personalizados o nombres desconocidos): un cuadro `TOKENS.colors.surface` con un velo del color del grupo muscular a ~10% y el icono Feather del implemento en el color del grupo.
- **Origen**: imágenes del free tier de RepDB (`github.com/sergei-argutin/exercise-dataset`), reducidas y empaquetadas en la app, así que funcionan sin conexión. Ver §5.

## 4. Requerimientos Funcionales (RF)
- **RF-1 (Assets)**: 47 WebP en `assets/ejercicios/<id>.webp`, uno por cada `id` de `CATALOGO_EJERCICIOS_BASE`. Cada uno mide 192×192 px y es la ilustración de RepDB reducida, sin recortar ni modificar.
- **RF-2 (Mapa de imágenes)**: `src/constants/imagenesEjercicios.js` exporta el mapa `id → require(...)`, el índice `nombre → id` y las funciones `obtenerIdImagenEjercicio({ id, nombre })` y `obtenerImagenEjercicio({ id, nombre })`. Ambas buscan primero por `id` (solo claves propias del mapa) y, si no lo encuentran, por nombre dentro del catálogo base. El nombre se compara sin espacios en los extremos y sin distinguir mayúsculas. Si no hay coincidencia, devuelven `null`.
- **RF-3 (Componente)**: `src/components/MiniaturaEjercicio.jsx` muestra la ilustración ocupando todo el cuadro o, si no la hay, el velo de color con el icono del implemento. Es decorativo para lectores de pantalla y está memoizado.
- **RF-4 (Catálogo)**: cada fila de `CatalogoEjerciciosModal` muestra una miniatura de 44 pt a la izquierda del nombre.
- **RF-5 (Lista del día)**: cada tarjeta de entreno registrado en `EntrenamientosView` muestra una miniatura de 40 pt a la izquierda del título, resuelta solo por el nombre guardado (`item.ejercicio`). Funciona con los registros guardados antes de esta Spec.
- **RF-6 (Crédito)**: el panel de Configuración muestra el enlace «Ilustraciones: Exercise data by RepDB (repdb.co)», que abre `https://repdb.co`, y el README tiene una sección de Créditos con `Exercise data by [RepDB (repdb.co)](https://repdb.co)`. El texto «Exercise data by RepDB (repdb.co)» es literal, como exige la licencia.

## 5. Contrato de Assets
### Origen y licencia
Free tier de RepDB (`github.com/sergei-argutin/exercise-dataset`, `images/flat/<slug>-<pose>.webp`, 512×512). Términos de `LICENSE-DATA.md`:
- Se permite el uso dentro de apps, también comercial, siempre que el enlace de atribución sea visible para los usuarios (RF-6).
- Se permite redimensionar, recortar y recolorear.
- Quitar el fondo o ampliar las imágenes cuenta como obra derivada y queda prohibido.
- Queda prohibido pasarlas por IA generativa y redistribuirlas como dataset.

### Proceso (fuera del repo, sin dependencias nuevas en el proyecto)
1. Descargar la pose elegida de cada slug.
2. Con Python y Pillow: `resize((192, 192), LANCZOS)` sin recortar ni tocar el fondo, y guardar como WebP con calidad 80 en `assets/ejercicios/<id>.webp`.

Las poses se eligieron en hojas de contacto, buscando la más reconocible a 44 pt.

### Mapeo
`espalda-7` usa `straight-arm-pulldown` porque RepDB no tiene la variante con cuerda; es el movimiento más parecido.

| id | Ejercicio | Slug RepDB | Pose |
| - | - | - | - |
| base-pecho-1 | Press de banca plano con barra | `bench-press` | peak |
| base-pecho-2 | Press inclinado con mancuernas | `incline-db-press` | start |
| base-pecho-3 | Press declinado con barra | `decline-bench-press-barbell` | peak |
| base-pecho-4 | Aperturas en polea (cruces) | `cable-fly` | peak |
| base-pecho-5 | Fondos en paralelas para pecho | `dips` | peak |
| base-pecho-6 | Aperturas en máquina (Pec Deck) | `pec-deck` | peak |
| base-pecho-7 | Flexiones de pecho (Push-ups) | `push-up` | start |
| base-pecho-8 | Press en máquina sentado | `chest-press-machine` | peak |
| base-espalda-1 | Jalón al pecho en polea | `lat-pulldown` | peak |
| base-espalda-2 | Remo con barra pronado | `barbell-row` | peak |
| base-espalda-3 | Remo en polea baja (Gironde) | `seated-cable-row` | peak |
| base-espalda-4 | Dominadas pronadas | `pull-up` | peak |
| base-espalda-5 | Peso muerto convencional | `deadlift` | start |
| base-espalda-6 | Remo unilateral con mancuerna | `single-arm-db-row` | peak |
| base-espalda-7 | Pullover en polea alta con cuerda | `straight-arm-pulldown` | start |
| base-espalda-8 | Remo en máquina con apoyo en pecho | `chest-supported-machine-row` | peak |
| base-pierna-1 | Sentadilla libre con barra | `squat` | peak |
| base-pierna-2 | Prensa de piernas 45° | `leg-press` | peak |
| base-pierna-3 | Peso muerto rumano | `romanian-deadlift` | peak |
| base-pierna-4 | Zancadas caminando con mancuernas | `walking-lunge` | peak |
| base-pierna-5 | Curl femoral acostado | `leg-curl` | peak |
| base-pierna-6 | Extensiones de cuádriceps | `leg-extension` | peak |
| base-pierna-7 | Elevación de talones de pie (Gemelos) | `standing-calf-raise` | peak |
| base-pierna-8 | Hip thrust con barra | `hip-thrust` | peak |
| base-pierna-9 | Sentadilla búlgara con mancuernas | `bulgarian-split-squat` | peak |
| base-pierna-10 | Aductores en máquina | `hip-adduction` | peak |
| base-hombro-1 | Press militar sentado con mancuernas | `dumbbell-shoulder-press` | peak |
| base-hombro-2 | Press militar de pie con barra (OHP) | `ohp` | peak |
| base-hombro-3 | Elevaciones laterales con mancuernas | `lateral-raise` | peak |
| base-hombro-4 | Elevaciones laterales en polea | `cable-lateral-raise` | peak |
| base-hombro-5 | Pájaros posteriores con mancuernas | `rear-delt-fly` | peak |
| base-hombro-6 | Elevaciones frontales con mancuernas | `dumbbell-front-raise` | peak |
| base-hombro-7 | Face pull en polea alta | `face-pull` | peak |
| base-hombro-8 | Encogimientos de trapecio con barra | `shrug` | peak |
| base-brazo-1 | Curl de bíceps con barra Z | `ez-bar-curl` | peak |
| base-brazo-2 | Extensiones de tríceps en polea alta (Cuerda) | `tricep-pushdown` | peak |
| base-brazo-3 | Curl martillo con mancuernas | `hammer-curl` | peak |
| base-brazo-4 | Press francés en banco con barra Z | `ez-bar-lying-tricep-extension` | peak |
| base-brazo-5 | Curl de bíceps en banco inclinado | `incline-db-curl` | peak |
| base-brazo-6 | Fondos de tríceps en máquina | `seated-dip-machine` | peak |
| base-brazo-7 | Curl concentrado con mancuerna | `concentration-curl` | peak |
| base-brazo-8 | Extensiones de tríceps sobre cabeza (Mancuerna) | `overhead-tricep-extension` | start |
| base-core-1 | Crunches en polea alta arrodillado | `cable-crunch` | peak |
| base-core-2 | Elevaciones de piernas colgado en barra | `hanging-leg-raise` | peak |
| base-core-3 | Plancha isométrica abdominal | `plank` | main |
| base-core-4 | Rueda abdominal (Ab Roller) | `ab-wheel-rollout` | peak |
| base-core-5 | Giros rusos con peso (Russian Twists) | `russian-twist` | peak |

## 6. Criterios de Aceptación (CA)
- **CA-1**: Existen exactamente 47 WebP en `assets/ejercicios/`, con nombres que coinciden uno a uno con los `id` de `CATALOGO_EJERCICIOS_BASE`. Cada uno tiene cabecera RIFF/WEBP válida, mide 192×192 px y pesa ≤ 15 360 bytes; el total es ≤ 768 000 bytes. Se verifica de forma automática en `__tests__/imagenesEjercicios.test.js`, que lee la cabecera de cada archivo (chunk `VP8 `, `VP8L` o `VP8X`).
- **CA-2**: Cada fila del catálogo muestra la miniatura de 44 pt a la izquierda del nombre. Tocar la fila hace exactamente lo de antes (mismo háptico `vibrarSeleccionBascula`, misma llamada a `onSeleccionarEjercicio`) y la fila conserva una altura táctil ≥ 44 pt.
- **CA-3**: Los ejercicios personalizados y cualquier nombre sin imagen muestran el placeholder con el icono del implemento. Nunca aparece un cuadro vacío, una imagen rota ni un error.
- **CA-4**: Las tarjetas de la lista del día muestran la miniatura de 40 pt, incluidos los registros guardados antes de esta Spec (por ejemplo, un "Jalón al pecho en polea" ya existente muestra su imagen), sin migrar datos.
- **CA-5**: El formato de los registros en AsyncStorage no cambia: `storage.js`, `guardarEntrenamiento` y `LiveModeModal` no se modifican.
- **CA-6**: `package.json` y `package-lock.json` no cambian (no hay dependencias nuevas).
- **CA-7**: Los estilos usan solo tokens de `src/theme/tokens.js` y la escala de 4 pt. El único color derivado permitido es el velo del placeholder, calculado a partir de `obtenerColorGrupo()`. No hay emojis.
- **CA-8**: `npm run gate` termina con código 0, con 6 suites y al menos 63 pruebas (56 existentes más ≥ 7 bloques `test(...)` nuevos en `__tests__/imagenesEjercicios.test.js`). Las pruebas nuevas comparan ids, no valores de `require` (que `jest-expo` transforma a `1` en cualquier imagen), y verifican la coherencia entre cada clave del mapa y el archivo de su `require`.
- **CA-9**: En dispositivo o Expo Go, las 47 miniaturas se reconocen a su tamaño y se ven coherentes entre sí, la lista se desplaza con fluidez y no se ve saturada.
- **CA-10**: El crédito de RepDB se ve en el panel de Configuración, abre `https://repdb.co` y tiene un área táctil de al menos 44 pt. El README incluye la sección de Créditos.
