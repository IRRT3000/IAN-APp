# Spec 025: Respaldo y Restauración de Datos

> **Estado: v2 (tras la revisión del plan del 2026-11-24).** Lo redactó Claude Code a partir de la propuesta 1 de `specs/PROPUESTAS-funcionalidades.md`, elegida por el dueño.

## 1. Problema
La app es local-first: todo vive en el teléfono (AsyncStorage y, en nativo, las fotos en `Paths.document/fotos/`). Si el usuario desinstala la app, cambia de teléfono, borra los datos o limpia el navegador, pierde entrenamientos, comidas, cambio físico, estudio y perfil. Hoy no hay forma de sacar los datos.

## 2. Decisiones del dueño (2026-11-24)
- **Fotos:** el usuario elige al exportar con una casilla «Incluir fotos» (desmarcada por defecto).
- **Restaurar:** reemplaza todo lo actual por lo del respaldo, después de una confirmación clara.
- **Archivo:** exportar abre el menú de compartir del sistema (Drive, WhatsApp, Archivos…). Restaurar abre el selector de archivos. En web, exportar descarga un `.json` y restaurar pide subirlo.

## 3. Requerimientos Funcionales (RF)
- **RF-1 (Exportar):** En Configuración, la sección «Respaldo de datos» tiene el botón «Exportar respaldo» y la casilla «Incluir fotos».
  - Genera un archivo `respaldo-fitness-AAAA-MM-DD.json` (fecha local) y lo comparte (nativo) o lo descarga (web).
  - Contiene solo las claves de una **lista cerrada** (plan §2): entrenamientos, comidas, perfil, cambios físicos, catálogo personalizado, días de descanso, materias, sesiones y resúmenes de estudio, preferencias y, con la casilla, miniaturas web.
  - Nunca contiene la API key, el borrador de sesión activa (temporal) ni las copias `:corrupto:` de estudio.
  - Con fotos en nativo, cada archivo de `Paths.document/fotos/` va en base64 con su ruta relativa.
- **RF-2 (Restaurar):** «Restaurar respaldo» abre el selector, valida el archivo y muestra una confirmación con la fecha del respaldo, cuántos registros trae y el aviso de que **reemplazará los datos actuales**. Al aceptar:
  - si trae fotos nativas, las escribe en `Paths.document/fotos/` sin borrar las actuales; en web, en sus claves;
  - escribe primero las claves del respaldo y solo después borra las claves actuales que el respaldo no trae; si algo falla, deshace y deja los datos como estaban;
  - borra el borrador de sesión activa, que pertenece al estado anterior; la API key no se toca;
  - vuelve a cargar todos los datos en pantalla (`sincronizarDatos` de `App.js`), sin reiniciar la app.
- **RF-3 (Validación y seguridad):** El archivo viene de fuera y se trata como no confiable.
  - Debe tener `app: "mi-fitness-app"`, `version: 1` y un objeto `datos` de cadenas.
  - Solo se aceptan claves de la lista cerrada; cualquier otra se ignora. Toda clave que contenga `api_key` o `:corrupto:` se descarta siempre.
  - Cada valor debe ser JSON válido con la forma esperada (por ejemplo, lista para entrenamientos y objeto para el perfil). Las miniaturas web deben ser `data:image/jpeg;base64,…`.
  - Las rutas de fotos nativas deben cumplir `fotos/<carpeta>/<nombre>.jpg` con `[a-z0-9_-]` y sin `..`; se escriben solo dentro de `Paths.document/fotos/`.
  - Topes: 50 MB por archivo (se comprueba antes de leerlo), 2 MB por foto, 2000 fotos y, en web, ~4 MB de datos en total (tope de localStorage).
  - Un archivo inválido no borra nada: primero se valida todo y solo después se escribe.
- **RF-4 (Qué viaja):** La API key nunca entra al respaldo. Las preferencias (`@fitness_tracker_preferencias_v1`, sonidos) sí viajan y se aplican al restaurar.
- **RF-5 (Feedback):** Exportar y restaurar dan háptico, sonido y anuncio accesible de éxito o error (patrón de la Spec 024). Mientras trabajan, el botón muestra estado ocupado y no se puede pulsar dos veces.

## 4. Criterios de Aceptación (CA)
- **CA-1:** Exportar y luego restaurar en una app vacía deja AsyncStorage con exactamente las mismas claves y valores de la lista cerrada. El test de ida y vuelta incluye una clave `:corrupto:` que no viaja.
- **CA-2:** El respaldo nunca contiene la API key, aunque esté guardada. Test.
- **CA-3:** Se rechaza **sin borrar ningún dato actual**, con un mensaje distinto por causa, un archivo con:
  - `version` desconocida;
  - valores que no son JSON o que tienen la forma incorrecta;
  - rutas con `..`;
  - base64 inválido;
  - más de 50 MB (tamaño simulado, rechazado antes de leer).

  Las claves ajenas, incluida `__proto__`, se ignoran. Tests.
- **CA-4:** Sin «Incluir fotos», el respaldo no lleva miniaturas ni archivos. Con la casilla:
  - en web lleva las claves `foto_v1`, y tras restaurar, la lectura de la foto devuelve la miniatura;
  - en nativo lleva los archivos en base64, y tras restaurar existen en `Paths.document/fotos/...`.

  Tests.
- **CA-5:** Después de restaurar, las pantallas muestran los datos restaurados sin reiniciar. `onDatosRestaurados` (`sincronizarDatos`) se llama una vez, después de la última escritura, y el interruptor de sonidos refleja la preferencia restaurada. Test.
- **CA-6:** Accesibilidad: botones y casilla con nombre, rol y estado (`aria-checked`, `busy`). La regla estática de accesibilidad sigue en 0.
- **CA-7:** `npm run gate` en verde. `expo-sharing` se instala con `npx expo install` y `npx expo-doctor` queda limpio.
- **CA-8 (Atomicidad):** Si la escritura falla a la mitad (un `multiSet` simulado que lanza), AsyncStorage queda idéntico al de antes de restaurar. Test.
