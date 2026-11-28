# Spec 030: Progreso por ejercicio (Fase 2 del roadmap, parte 1)

> Redactada por Claude Code el 2026-11-28. Es la primera mitad de la Fase 2 del diagnóstico, que el dueño aprobó. La segunda mitad (editar un ejercicio guardado y el temporizador de descanso) va en la Spec 031.

## 1. Problema
Entrenos guarda cada ejercicio con sus series, pero no muestra si el usuario progresa. No hay récords, ni 1RM estimado, ni una forma de ver un ejercicio a lo largo del tiempo. Para saber si hoy levantó más que la semana pasada, el usuario tiene que ir día por día en el selector.

## 2. Requerimientos Funcionales
- **RF-1 (Utilidades puras).** Nuevo `src/utils/progresoEjercicio.js`:
  - `estimar1RM(peso, reps)` usa la fórmula de Epley, `peso × (1 + reps / 30)`, redondeada a 0.5 kg. Con 1 rep devuelve el peso tal cual. Devuelve 0 si el peso o las reps no son mayores que 0, o si las reps pasan de 12, porque la estimación deja de ser fiable.
  - `seriesDeRegistro(registro)` devuelve las series de `seriesDetalle` con `peso` y `repeticiones` como números (acepta coma; NaN o negativos pasan a 0). En el formato nuevo nunca se usa el campo agregado `repeticiones`, que es el total. Un registro antiguo sin detalle guarda `series` (cantidad), `repeticiones` (por serie) y `peso`: se expande a `series` series idénticas (una sola si `series` es 0 o inválido), así el volumen coincide con `series × reps × peso`, igual que en la tarjeta.
  - `normalizarNombre(nombre)` recorta, colapsa espacios internos, pasa a minúsculas y quita acentos.
  - `historialEjercicio(entrenamientos, nombre)` agrupa por fecha todos los registros cuyo nombre normalizado coincide. Ignora registros sin fecha `YYYY-MM-DD` válida. Si hay varios registros el mismo día, se suman. Por cada día da `fecha`, `pesoMaximo`, `mejor1RM`, `volumen` (Σ peso × reps), `series` y `mejorSerie`. La mejor serie es la de mayor 1RM; si todas tienen 1RM 0 (reps > 12 o peso 0), la de mayor peso, y a igual peso la de más reps. El resultado va ordenado por fecha ascendente, comparando las cadenas `YYYY-MM-DD` sin crear objetos `Date`.
  - `recordsEjercicio(historial)` devuelve `{ pesoMaximo, mejor1RM, mejorVolumen }`, cada uno como `{ valor, fecha }`, o `null` si no hay historial. Si hay empate, gana la fecha más antigua.
  - `registroEsRecord(entrenamientos, registro)` es `true` solo si existe al menos un día anterior del mismo ejercicio y el registro (con sus propias series) supera estrictamente el mejor peso máximo o el mejor 1RM de esos días anteriores. Los registros del mismo día no cuentan como anteriores, así que dos registros del mismo ejercicio en un día se evalúan por separado y ambos pueden llevar la insignia. Un registro con peso máximo 0 (peso corporal) nunca es récord.
  - `indexarHistoriales(entrenamientos)` precalcula una sola vez un mapa nombre normalizado → historial, para que la vista no recorra la lista por cada tarjeta.
  - `formatearKg(valor)` da texto con coma decimal y sin ceros sobrantes («116,5», «100»).
- **RF-2 (Insignia de récord).** En la tarjeta de un ejercicio, si `registroEsRecord` es verdadero, aparece en la fila de insignias (junto a grupo e implemento, encima del nombre) una insignia «Récord» con el icono Feather `award` y texto visible, no solo color. El `View` de la insignia tiene la etiqueta accesible «Nuevo récord personal».
- **RF-3 (Botón de progreso).** Cada tarjeta, de hoy o del historial, tiene un botón «Ver progreso» (icono `trending-up`, 44 pt como mínimo, etiqueta «Ver progreso de {ejercicio}»). Va separado de la cápsula de borrado y del desglose, sin botones anidados, con `minHeight` de 44. Abre el modal de RF-4. No se muestra si el nombre del ejercicio está vacío.
- **RF-4 (Modal de progreso).** `ModalProgresoEjercicio` sobre `ModalAccesible`, con estos elementos:
  - Cabecera con el nombre del ejercicio y el botón de cerrar.
  - Tres fichas de récord: «Peso máximo», «1RM estimado» y «Mejor volumen», cada una con su valor en kg y su fecha legible (`etiquetaFecha`, sin día de la semana).
  - Una gráfica de barras hecha con `View`, sin dependencias nuevas, con las últimas 12 sesiones y un selector de métrica de tres opciones: 1RM, Peso máx y Volumen. El contenedor tiene rol `radiogroup` y cada opción rol `radio` con `aria-checked`. Al abrir, la métrica inicial es la primera con datos en este orden: 1RM, Peso máx, Volumen. Si la métrica elegida no tiene datos (todo 0), en lugar de barras se ve «Sin datos de peso para esta métrica». La barra más alta ocupa toda la altura y las demás quedan en proporción. Debajo de cada barra va la fecha corta `DD/MM`, o `DD/MM/AA` si las sesiones mostradas cruzan de año. Las barras y fechas se ocultan al lector de pantalla y el contenedor tiene rol `image` con una etiqueta que la resume, por ejemplo «1RM estimado en las últimas 5 sesiones: de 80 a 92,5 kg».
  - Una lista de sesiones, de la más reciente a la más antigua, con fecha, mejor serie («100 kg × 5») y 1RM (o «—» si es 0). Cada fila tiene una etiqueta legible, por ejemplo «12 de marzo de 2026: 100 kilos por 5, 1RM 116,5».
  - Una línea pequeña: «El 1RM es una estimación (fórmula de Epley) con series de hasta 12 repeticiones».
  - Con una sola sesión se ven las fichas y la lista, y en lugar de la gráfica el texto «Registra este ejercicio otro día para ver tu progreso».
- **RF-5 (Reglas del proyecto).** Se cumplen todas las reglas del repo, como en la Spec 028: texto de `base/Texto`, táctiles con `accessibilityLabel` y `accessibilityRole`, `aria-*` para los estados, tokens Dark Luxury OLED, iconos Feather, sin emojis, texto de al menos 11 px, objetivos táctiles de al menos 44 pt y fechas solo locales.

## 3. Fuera de alcance
Editar ejercicios guardados y el temporizador de descanso (Spec 031). Tampoco entran aquí la gráfica de volumen por grupo muscular, exportar el progreso, ni anunciar el récord en Live Mode al guardar.

## 4. Criterios de Aceptación
- **CA-1.** `estimar1RM`:
  - (100, 5) → 116.5, porque 116,67 redondeado a 0,5 da 116,5.
  - (100, 1) → 100.
  - (0, 5) → 0, (100, 0) → 0 y (100, 13) → 0.
  - Redondeo a 0,5 sin errores de coma flotante: (90, 3) → 99 (el cálculo da 99,00000000000001) y (61.5, 3) → 67.5 (67,65 → 67,5). Un valor justo en un cuarto (x,25 o x,75) sube, como `Math.round`.
  - Textos numéricos con coma también se aceptan.
- **CA-2.** `historialEjercicio`:
  - Une «Press Banca» y « press banca » del mismo día.
  - Ordena por fecha.
  - Calcula el volumen y el mejor 1RM de cada día.
  - Acepta registros antiguos sin `seriesDetalle`: uno con 3 series × 10 reps × 50 kg da volumen 1500, igual que su `volumenTotal`.
  - Une «Sentadilla búlgara» y «sentadilla  bulgara».
  - Con todas las series de más de 12 reps, `mejor1RM` es 0 y `mejorSerie` es la de mayor peso.
  - Ignora registros sin fecha válida.
  - Ignora otros ejercicios.
  - Con una lista vacía o un nombre vacío devuelve `[]`.
- **CA-3.** `recordsEjercicio` devuelve los tres récords con su fecha. Con empate gana la fecha más antigua. Con historial vacío devuelve `null`.
- **CA-4.** `registroEsRecord`:
  - Es `false` para el primer día de un ejercicio.
  - Es `true` si supera el peso máximo anterior.
  - Es `true` si supera solo el 1RM anterior (más reps con el mismo peso).
  - Es `false` si iguala el récord.
  - Es `false` si el único registro mejor es del mismo día.
  - Es `false` con peso máximo 0.
- **CA-5.** Pruebas de UI:
  - `ModalProgresoEjercicio` aislado, con un historial de 3 días de «Press banca» (80×5, 85×5, 90×3): las fichas muestran «90 kg», «99 kg» (1RM de 90×3) y el mejor volumen con sus fechas. Tocar «Volumen» deja `aria-checked` en esa opción y lo quita de 1RM. Con una sola sesión se ve «Registra este ejercicio otro día para ver tu progreso». Con un ejercicio sin peso se elige la métrica con datos o se ve «Sin datos…».
  - Integración mínima en `EntrenamientosView` con fecha fija: con dos días de «Press banca» donde hoy supera el récord y otro ejercicio sin récord, «Nuevo récord personal» aparece exactamente una vez, y «Ver progreso de Press banca» abre el modal.
- **CA-6.** `npm run gate` pasa. Los hooks del modal toleran `nombreEjercicio` nulo. Las pruebas estáticas de accesibilidad y de tamaño de texto pasan sin excepciones nuevas. Si cambia algún snapshot, el diff queda justificado.
- **CA-7.** En el emulador Android, la insignia, el botón y el modal se ven bien, con la gráfica legible y sin texto cortado.
