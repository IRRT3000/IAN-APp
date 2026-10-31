# Spec 016: Resumen IA del Día de Estudio

## 1. Visión y Justificación del Problema
La Spec 015 deja al usuario registrar cada sesión de estudio con materia, tema, comprensión, minutos y apuntes. Pero una lista de registros no le dice si avanzó, qué se le está quedando atrás ni qué debería repasar.

Esta Spec agrega un **resumen de estudio del día generado por Gemini**, con el mismo estilo de los análisis de comida y de cambio físico: un JSON estructurado con un resumen corto, un análisis detallado, un veredicto de 0 a 10, los temas dominados, los temas por repasar con una sugerencia concreta y recomendaciones para mañana. Para no gastar la API key del usuario (BYOK), el análisis es **manual**, solo para **hoy** y como máximo **una vez al día**. El resultado se guarda en el dispositivo.

Quedan fuera de esta Spec: el resumen general del día (entrenos, comidas, físico), el análisis automático a una hora fija, las notificaciones y el análisis de días pasados.

## 2. Requerimientos Funcionales (RF)
- **RF-1 (Análisis manual de hoy)**:
  - Si el día elegido en `EstudioView` es hoy, al final de la lista de sesiones (modo por día) aparece la tarjeta **«Resumen de estudio de hoy»**.
  - Mientras no exista resumen, la tarjeta muestra el botón **«Analizar mi día de estudio»** y el aviso **«Tienes 1 análisis al día; úsalo al terminar de estudiar.»**
- **RF-2 (Requisitos para analizar)**:
  - El botón solo funciona si los datos de estudio ya cargaron (`datosCargados`), hay **al menos 1 sesión de estudio hoy** y hay una **API key** disponible.
  - Si no hay sesiones, el botón aparece deshabilitado con el texto «Registra al menos una sesión hoy para analizar tu día».
  - Si falta la API key, al tocarlo se muestra el mensaje de `obtenerApiKeyActiva()`, que indica dónde configurarla.
- **RF-3 (Límite de 1 análisis por día)**:
  - Hay como máximo un resumen por fecha, guardado en su **propia clave** `@fitness_tracker_resumen_estudio_v1:YYYY-MM-DD`. Una vez guardado, el botón desaparece para ese día y no existe forma de regenerarlo.
  - Un intento fallido (todos los modelos fallan, no hay red, falta la API key o la respuesta es inválida) **no** consume el análisis.
- **RF-4 (Contexto que recibe Gemini)**:
  - **Hoy**: cada sesión completa, con materia, categoría, tema, comprensión, minutos y apuntes.
  - **Últimos 7 días**, sin incluir hoy (de hoy−7 a hoy−1): un resumen condensado de cada sesión **sin apuntes** (fecha, materia, categoría, tema, comprensión, minutos). Si no hay sesiones en esos días, este bloque se omite por completo.
  - **Totales calculados por la app**: minutos totales de hoy y minutos por materia. Gemini no debe recalcularlos.
  - **Perfil**: la edad exacta del usuario y la fecha y hora del análisis.
- **RF-5 (Respuesta estructurada en JSON)**: Gemini devuelve únicamente un objeto con estos campos: `resumenSimple`, `resumenDetallado`, `veredicto` (0 a 10, con un decimal), `minutosTotales`, `materias[]`, `temasDominados[]`, `temasPorRepasar[]` (materia, tema, comprensión y sugerencia), `puntosClave[]` y `recomendacionesManana[]`. El esquema exacto está en `plan.md`.
- **RF-6 (Visualización del resumen)**: Con el resumen generado, la tarjeta muestra:
  - `resumenSimple` y el veredicto (`7.8 / 10`);
  - los minutos totales y los minutos por materia;
  - los temas por repasar, cada uno con su sugerencia;
  - los temas dominados, los puntos clave y las recomendaciones para mañana;
  - un control «Ver detalle» que despliega `resumenDetallado`;
  - el pie «Generado a las h:mm AM/PM».
- **RF-7 (Aviso de resumen desactualizado)**:
  - Al generar el resumen se guarda una **firma** de cada sesión analizada: `{ [id]: editadaEn ?? creadaEn }`.
  - Si después hay sesiones de hoy nuevas, editadas (firma distinta) o eliminadas, la tarjeta muestra la nota informativa:
    - «1 sesión nueva, editada o eliminada sin analizar», o
    - «N sesiones nuevas, editadas o eliminadas sin analizar».
  - La nota no habilita un nuevo análisis.
- **RF-8 (Días pasados en modo lectura)**:
  - Al elegir un día pasado en el selector, si ese día tiene un resumen guardado, la tarjeta lo muestra en modo lectura, sin botón.
  - Si no tiene resumen, no se muestra tarjeta. Los días pasados nunca se pueden analizar.
- **RF-9 (Progreso y estado de carga)**:
  - Mientras se analiza, el botón muestra un indicador y el modelo que se está intentando, con el patrón `onProgreso` que se usa en comidas.
  - El botón queda bloqueado para evitar dobles toques.
- **RF-10 (Estética de la app)**: Mismas reglas que la Spec 015, RF-10: tokens, Feather, cero emojis, `FadeIn`, hápticos de `haptics.js` y touch targets de 44 pt o más.

## 3. Casos Límite y Defensas
- **Defensa 1 (Sin dependencias nuevas)**: Se reutilizan `ejecutarLlamadaGemini`, `obtenerModelos`, `obtenerApiKeyActiva` y `GeminiError`. No se instala nada.
- **Defensa 2 (Doble toque, remonte y carrera)**:
  - El candado de análisis vive a **nivel de módulo**, no en un `useRef`. Así sobrevive al remonte de la vista por `key={vistaActiva}` en `App.js` si el usuario cambia de pestaña a media llamada. Al volver a la pestaña, la vista detecta el análisis en curso, muestra el estado de carga y se actualiza al terminar.
  - Justo **antes** de llamar a Gemini se vuelve a leer `obtenerResumenEstudio(fecha)` desde AsyncStorage. Si ya existe, no se llama.
  - `guardarResumenEstudio` vuelve a leer la clave de la fecha con lectura **estricta**: si existe, rechaza; si `getItem` falla, lanza el error y no escribe.
- **Defensa 3 (Cambio de día)**:
  - La fecha del análisis se calcula con `obtenerFechaLocal()` **al tocar el botón**.
  - Si no coincide con el día elegido en pantalla (cruzó la medianoche con la app abierta), se aborta con el aviso «Cambió el día; vuelve a abrir el día de hoy» y no se llama a Gemini.
- **Defensa 4 (Respuesta incompleta o malformada)**: Un normalizador puro valida la respuesta.
  - Si la respuesta no es un objeto plano (por ejemplo `null` o un arreglo), si `resumenSimple` o `resumenDetallado` no son strings con contenido, o si `veredicto` no es un número finito (ni un string numérico no vacío, como `"7.8"`), la respuesta es **inválida**. Se trata como un fallo de ese modelo y se prueba el siguiente; nunca se guarda un valor inventado, porque el resumen no se puede regenerar.
  - Si es válida: el veredicto se acota a `[0, 10]` con 1 decimal, los arreglos ausentes pasan a `[]` y `minutosTotales` y `materias` **siempre** se sobrescriben con los valores locales.
  - En `temasPorRepasar` se aceptan los 4 niveles de `NIVELES_COMPRENSION`, comparados sin distinguir acentos ni mayúsculas y convertidos al literal canónico. Los que no coincidan se descartan.
- **Defensa 5 (Apuntes muy largos)**: Si la suma de los apuntes de hoy pasa de 40 000 caracteres, se aplica un **tope igual por sesión** de `⌊40000 / n⌋` caracteres. Los apuntes que lo pasan se cortan y se marcan con `[recortado]`.
- **Defensa 6 (Historial previo grande)**: El bloque de los 7 días previos incluye como máximo las 60 sesiones más recientes.
- **Defensa 7 (Sin inventar datos)**: El prompt prohíbe inventar sesiones, temas o minutos que no estén en el contexto, y pide basar la evaluación de la comprensión en los apuntes y en el nivel que declaró el usuario.
- **Defensa 8 (Fechas locales)**: Prohibido `toISOString()` y `new Date('YYYY-MM-DD')`. El rango de 7 días se calcula con aritmética local.
- **Defensa 9 (Escritura fallida)**: Si Gemini responde bien pero AsyncStorage no logra guardar, se muestra un error y el resultado **no** se da por guardado. Como no quedó la clave de la fecha, el usuario puede reintentar.
- **Defensa 10 (Crecimiento del almacenamiento)**: Una clave por fecha (~5 KB cada una). Nunca hay una fila única que crezca sin límite, y la vista solo lee la clave de la fecha elegida.

## 4. Criterios de Aceptación (CA)
- **CA-1**: Con hoy elegido y al menos una sesión, aparecen la tarjeta «Resumen de estudio de hoy», el botón «Analizar mi día de estudio» y el aviso de 1 análisis al día.
- **CA-2**: Sin sesiones hoy, el botón está deshabilitado y explica por qué. Sin API key, al tocarlo aparece el mensaje de configuración y no se guarda nada.
- **CA-3**: Al analizar con éxito, el resumen se muestra con todos los campos de RF-6 y se guarda en `@fitness_tracker_resumen_estudio_v1:<fecha de hoy>`. Sigue ahí al reiniciar la app.
- **CA-4**: Después de un análisis exitoso no existe ninguna forma de generar otro resumen para esa fecha. Un segundo `guardarResumenEstudio` con la misma fecha se rechaza, y con `getItem` en error también se rechaza sin escribir (pruebas unitarias).
- **CA-5**: Si todos los modelos fallan o devuelven respuestas inválidas, se muestra el error con el detalle por modelo, no se guarda nada y el botón vuelve a estar disponible.
- **CA-6**: El prompt incluye los apuntes completos de las sesiones de hoy, salvo el recorte de la Defensa 5. Las sesiones de los 7 días previos aparecen sin apuntes. Si no hay días previos con sesiones, el bloque no aparece (prueba unitaria del constructor del prompt).
- **CA-7**: `minutosTotales` y `materias` mostrados coinciden siempre con la suma local de las sesiones analizadas, aunque Gemini devuelva otros valores. Una respuesta sin `veredicto` numérico o sin textos se rechaza (pruebas unitarias del normalizador).
- **CA-8**: Al agregar, editar o eliminar una sesión de hoy después de analizar, la tarjeta muestra la nota de RF-7 con el conteo correcto y el singular o plural adecuado, y no ofrece volver a analizar.
- **CA-9**: Un día pasado con resumen lo muestra en modo lectura, sin botón. Un día pasado sin resumen no muestra tarjeta.
- **CA-10**: Un doble toque rápido sobre el botón, o cambiar de pestaña y volver a mitad del análisis y tocar otra vez, produce una sola llamada a Gemini.
- **CA-11**: La plantilla del prompt (sin el texto de los apuntes del usuario) y la interfaz no contienen emojis. Solo Feather y tokens.
- **CA-12**: `npm run gate` termina en verde, con las suites nuevas del contexto, el prompt, el normalizador, el límite por fecha, la hora en 12 h y la cadena de modelos de Gemini.
