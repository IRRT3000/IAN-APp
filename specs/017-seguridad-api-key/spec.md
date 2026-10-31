# Spec 017: Seguridad de la API Key de Gemini y Endurecimiento General

## 1. Visión y Justificación del Problema
La app funciona en modo BYOK: cada persona pega su propia API key de Google AI Studio en el panel de Configuración. Si alguien obtiene esa clave, puede gastar la cuota gratuita del usuario o generarle cargos si tiene facturación activa. Por eso la clave tiene que estar protegida en el instalador, en el teléfono, en las copias de seguridad, en la red y en la pantalla.

El 2026-10-31 se auditó la seguridad de toda la app. Esta Spec corrige todo lo que afecta a la API key y aplica un ajuste de permisos de bajo riesgo. Los demás hallazgos quedan registrados en la sección 5 para Specs futuras.

### Hallazgos que corrige esta Spec
- **H-1 (Alta) — La clave del desarrollador puede quedar dentro del instalador.** `obtenerApiKeyActiva()` (`src/services/gemini.js:133`) usa `process.env.EXPO_PUBLIC_GEMINI_API_KEY` como respaldo. Expo copia esas variables en texto plano dentro del bundle de JavaScript al compilar. La APK de GitHub Releases está limpia porque CI no tiene `.env`, pero el `.env` local sí tiene una clave. Cualquier compilación hecha en la PC (`npx expo run:android`, `eas build --local`, `expo export` o `expo start --tunnel`) la incrustaría y cualquiera podría extraerla.
- **H-2 (Media) — La clave viaja en la URL.** La validación (`gemini.js:69`) y cada consulta (`gemini.js:422`) mandan `?key=<clave>` en la URL. Las URLs quedan registradas en proxies, inspectores de red e informes de errores. La documentación oficial de Gemini pide enviarla en el encabezado `x-goog-api-key`. Además, en `gemini.js:422` la clave va sin `encodeURIComponent`.
- **H-3 (Media) — La clave se guarda sin cifrar.** `apiKeyStorage.js` la escribe en AsyncStorage, que es texto plano: se puede leer en un teléfono con root y se copia en la copia de seguridad automática de Android (`allowBackup: true`, confirmado con `npx expo config --type introspect`).
- **H-4 (Baja) — El panel muestra la clave completa.** Al abrir Configuración, la clave guardada se carga completa en el campo de texto (`PanelConfiguracionLateral.jsx:78`) y el botón del ojo la revela. Cualquiera con el teléfono desbloqueado puede verla o copiarla. Cuando está visible, el teclado puede memorizarla, y el campo no desactiva el autocompletado.
- **H-5 (Baja) — El aviso de privacidad no es exacto.** El panel y el `README.md` dicen que la clave se guarda en AsyncStorage y que «nunca se transmite a servidores de terceros». En realidad se envía a Google en cada consulta, y después de esta Spec se guardará en el almacenamiento seguro.
- **H-6 (Baja) — No se revisa el formato de la clave.** Se manda a Google cualquier texto pegado, incluso con saltos de línea u otro dato sensible que hubiera en el portapapeles. Además, la clave se queda en el portapapeles después de pegarla.
- **H-7 (Baja) — La app pide permisos que no usa.** El manifiesto final incluye `RECORD_AUDIO` (lo agrega `expo-image-picker` por defecto) y `SYSTEM_ALERT_WINDOW` (viene de la plantilla de Expo). La app solo toma fotos y no dibuja sobre otras apps.

### Lo que se verificó y está bien
- La clave nunca entró a git: se revisaron todas las ramas y los checkpoints de Deska. Solo existe `.env.example`, con valores vacíos. El repositorio `IRRT3000/IAN-APp` es público, así que esto era importante comprobarlo.
- `.env` está en `.gitignore` y el workflow `release-apk.yml` no inyecta secretos.
- Las fotos se piden con `quality: 0.7` y sin la opción `exif`.
- `Linking.openURL` solo abre una URL fija de AI Studio. No hay `WebView` ni `eval`.

## 2. Requerimientos Funcionales (RF)
- **RF-1 (Una sola fuente para la clave)**: La clave solo puede venir del panel de Configuración. Se elimina el respaldo a `EXPO_PUBLIC_GEMINI_API_KEY` y ningún archivo de `src/` ni `App.js` puede mencionar esa variable. `EXPO_PUBLIC_GEMINI_MODEL` y `EXPO_PUBLIC_GEMINI_FALLBACK_MODELS` se mantienen porque no son secretos.
- **RF-2 (Clave en el encabezado)**: La validación y todas las consultas a Gemini envían la clave solo en el encabezado `x-goog-api-key`. Ninguna URL contiene `key=`.
- **RF-3 (Almacenamiento seguro)**:
  - La clave se guarda con `expo-secure-store` (Android Keystore / iOS Keychain), bajo el nombre `fitness_tracker_gemini_api_key` y con `keychainAccessible: WHEN_UNLOCKED_THIS_DEVICE_ONLY`.
  - El plugin de `expo-secure-store` se declara en `app.json` con `configureAndroidBackup: true`, para que la clave no entre en la copia de seguridad de Android, y con `faceIDPermission: false`, porque no se usa biometría.
  - **Migración**: si existe una clave en la ubicación anterior de AsyncStorage (`@fitness_tracker_gemini_api_key`), en la primera lectura se mueve al almacenamiento seguro y se borra de AsyncStorage. El usuario no tiene que volver a escribirla.
- **RF-4 (Formato de la clave)**: Después de quitar los espacios de los extremos, la clave debe cumplir `^[A-Za-z0-9._-]{20,256}$`. No se exige el prefijo `AIza`, porque Google ya emite claves con otros formatos (la clave local del desarrollador tiene 53 caracteres y no empieza con `AIza`). Si el formato no es válido, se muestra un mensaje sin hacer ninguna llamada de red, y `guardarApiKeyGemini` tampoco la guarda.
- **RF-5 (Panel de Configuración)**:
  - El campo de texto siempre empieza vacío.
  - El panel no guarda la clave completa en su estado: solo sabe si hay una clave y conoce sus **últimos 4** caracteres. La máscara es `••••••••` seguido de esos 4.
  - El ojo solo revela lo que se está escribiendo, nunca la clave guardada. Si la app pasa a segundo plano, la clave vuelve a ocultarse, para que no aparezca en la vista de apps recientes.
  - El botón de pegar rechaza el texto que no tiene formato válido (RF-4) en vez de ponerlo en el campo.
  - Si ya hay una clave guardada y el campo está vacío, «Probar y Guardar» muestra «Ya tienes una clave guardada. Pega una clave nueva solo si quieres reemplazarla.» y no hace ninguna llamada.
  - Al guardar con éxito, el campo se vacía y vuelve a ocultarse.
  - Si la clave se pegó con el botón del portapapeles y es la misma que se guardó, el portapapeles se vacía.
  - El campo desactiva el autocompletado y la corrección (`autoComplete="off"`, `importantForAutofill="no"`, `textContentType="none"`, `spellCheck={false}`). En Android, cuando la clave está visible, usa `keyboardType="visible-password"` para que el teclado no la memorice.
  - Si «Eliminar Clave» falla, se muestra un error y se vuelve a leer el estado real.
- **RF-6 (Textos exactos)**:
  - El aviso de privacidad del panel dice: «Tu clave se guarda cifrada en el almacenamiento seguro de tu teléfono y no se incluye en copias de seguridad. Solo se envía a Google (Gemini) en cada consulta de IA.»
  - El placeholder deja de sugerir `AIzaSy...`.
  - La línea de almacenamiento del `README.md` se actualiza con el mismo sentido.
- **RF-7 (Solo los permisos necesarios)**:
  - `expo-image-picker` se declara con `microphonePermission: false`.
  - `android.blockedPermissions` incluye `android.permission.RECORD_AUDIO` y `android.permission.SYSTEM_ALERT_WINDOW`.
  - `READ_EXTERNAL_STORAGE` y `WRITE_EXTERNAL_STORAGE` se mantienen, porque `requestMediaLibraryPermissionsAsync()` (en `NutricionView` y `CambioFisicoView`) los usa en Android 12 o anterior.
- **RF-8 (Barrera en la puerta de calidad)**: `npm run bundle:check`, después de `expo export`, revisa los archivos exportados antes de borrarlos. Busca:
  - los patrones de clave de Google `AIza[0-9A-Za-z_-]{35}` y `AQ\.[0-9A-Za-z_-]{40,}` (el formato nuevo, que es el de la clave real del desarrollador);
  - el valor de cualquier variable de los archivos `.env` o del entorno del proceso cuyo nombre contenga `KEY`, `SECRET`, `TOKEN` o `PASSWORD`.

  Si encuentra algo, falla con código 1 y dice qué archivo y qué motivo, **sin imprimir el valor**. Si el escaneo mismo falla, `bundle:check` también falla.

## 3. Casos Límite y Defensas
- **Defensa 1 (Migración sin pérdida)**:
  - La copia de AsyncStorage solo se borra después de escribir con éxito en el almacenamiento seguro.
  - Si esa escritura falla, se usa la copia anterior en esta sesión y se reintenta en la siguiente lectura.
  - Una copia anterior con formato inválido se borra y se trata como «sin clave».
  - Una lectura del almacenamiento seguro que **falla** es distinta de una que no encuentra nada. Si falla, se devuelve la copia anterior válida solo para esa sesión, sin escribir ni borrar nada. Así nunca se pisa una clave nueva con la vieja.
- **Defensa 2 (Copia anterior obsoleta)**:
  - Si ya hay una clave válida en el almacenamiento seguro pero quedó una copia en AsyncStorage (porque falló su borrado), cada lectura intenta borrarla con `removeItem`.
  - Es una operación idempotente y barata, porque solo hay unas pocas consultas de IA al día. No se usa una bandera de módulo, para que las pruebas no compartan estado.
- **Defensa 2b (Lecturas simultáneas)**:
  - Justo antes de escribir la clave migrada se vuelve a leer el almacenamiento seguro. Si ya contiene una clave válida, se usa esa y no se escribe.
  - Dos migraciones a la vez escriben el mismo valor y borran la misma copia, así que terminan igual y sin errores.
- **Defensa 3 (Almacenamiento seguro no disponible)**: Si `expo-secure-store` falla (por ejemplo en web), `cargarApiKeyGemini` devuelve `null`, `guardarApiKeyGemini` devuelve `false` y la app no se cae. La app solo se distribuye para Android e iOS.
- **Defensa 4 (Nombre de clave válido)**: SecureStore rechaza nombres con `@`, así que el nombre nuevo no lo lleva. El nombre anterior solo se usa para leer y borrar en AsyncStorage.
- **Defensa 5 (Los errores no exponen la clave)**: Los mensajes de `GeminiError` salen del cuerpo de la respuesta (recortado a 200 caracteres) y ninguna URL lleva la clave. Los `console.error` de `apiKeyStorage.js` solo registran el objeto de error, nunca el valor.
- **Defensa 6 (Compatibilidad con la Spec 016)**: `obtenerApiKeyActiva()` y `ejecutarLlamadaGemini({ modelo, apiKey, ... })` mantienen su firma, así que la Spec 016 no necesita cambios. Un mock global de Jest en `__mocks__/expo-secure-store.js` cubre cualquier suite que importe `gemini.js`. **Regla para las pruebas de la 016 y siguientes**: sembrar la clave con `guardarApiKeyGemini` y usar claves de 20 caracteres o más (por ejemplo `'K'.repeat(24)`). Una clave más corta se rechaza, y si se siembra en la ubicación anterior, la migración la borra.
- **Defensa 7 (Flujo del desarrollador)**: El desarrollador guarda su clave una vez en el panel, en Expo Go o en su build de desarrollo, y queda en el almacenamiento seguro. La línea `EXPO_PUBLIC_GEMINI_API_KEY` de `.env` puede borrarse. Aunque se deje, ya no se menciona en el código y Expo no la incrusta; RF-8 lo comprueba en cada `gate`.
- **Defensa 8 (Inyección en encabezados)**: El patrón de RF-4 no permite espacios, saltos de línea ni caracteres de control, así que la clave no puede alterar el encabezado HTTP.
- **Defensa 9 (Módulo nativo nuevo)**: `expo-secure-store` se instala con `npx expo install`. No se edita `android/` ni `ios/` a mano. La APK de CI lo incluye gracias a `expo prebuild`, y Expo Go ya lo trae.
- **Defensa 10 (Sin falsos positivos en GitHub)**: El repositorio es público y GitHub busca claves de Google en cada push. Las pruebas arman las claves de ejemplo concatenando partes (`'AIza' + 'A'.repeat(35)`), nunca como un literal completo.

## 4. Criterios de Aceptación (CA)
- **CA-1**: Ningún archivo `.js` o `.jsx` de `src/`, ni `App.js`, contiene `EXPO_PUBLIC_GEMINI_API_KEY`, `?key=` o `&key=`, ni los patrones `AIza…` o `AQ.…` de RF-8. Lo garantiza una prueba de Jest que recorre esos archivos.
- **CA-2**: Sin clave guardada, `obtenerApiKeyActiva()` lanza un `GeminiError` con el mensaje de configuración (prueba unitaria).
- **CA-3**: `validarApiKeyGemini` y `analizarComidaConGemini` llaman a `fetch` con URLs que no contienen `key=` y con el encabezado `x-goog-api-key` igual a la clave (prueba con `fetch` simulado).
- **CA-4**: `guardarApiKeyGemini` escribe en SecureStore bajo `fitness_tracker_gemini_api_key`, con `keychainAccessible: WHEN_UNLOCKED_THIS_DEVICE_ONLY`, y no deja nada en AsyncStorage (prueba unitaria).
- **CA-5 (migración)**, con pruebas unitarias:
  - Con una clave en la ubicación anterior de AsyncStorage, `cargarApiKeyGemini()` la devuelve, la deja en SecureStore y borra la copia.
  - Si la escritura en SecureStore falla, devuelve la clave y conserva la copia.
  - Si la **lectura** de SecureStore falla, devuelve la copia válida sin escribir ni borrar nada.
  - Si la copia tiene un formato inválido, se borra y la función devuelve `null`.
  - Con una clave válida en SecureStore y una copia obsoleta en AsyncStorage, la lectura borra la copia y devuelve la clave de SecureStore.
- **CA-6**: `eliminarApiKeyGemini()` borra la clave de SecureStore y la copia de AsyncStorage, y devuelve `true`. Si falla el borrado en SecureStore, devuelve `false` (pruebas unitarias).
- **CA-7 (formato)**, con pruebas unitarias:
  - `guardarApiKeyGemini` y `validarApiKeyGemini` rechazan, sin llamar a `fetch`, claves con espacios internos o saltos de línea, con 19 o 257 caracteres, o con caracteres no permitidos (por ejemplo `@`).
  - Se aceptan claves de exactamente 20 y 256 caracteres, una clave `AIza…` de 39 y una `AQ.…` de 53.
  - Si SecureStore falla, `guardarApiKeyGemini` devuelve `false` y `cargarApiKeyGemini` devuelve `null` cuando no hay copia anterior (Defensa 3).
- **CA-8 (panel, prueba manual en el dispositivo)**:
  - Con una clave guardada, el campo aparece vacío, el ojo no revela la clave guardada y la tarjeta muestra la máscara con solo los últimos 4 caracteres.
  - «Probar y Guardar» con el campo vacío muestra el mensaje de reemplazo.
  - Después de guardar una clave pegada con el **botón** de pegar, el portapapeles queda vacío. Pegar con el menú nativo del teclado no lo vacía; esta limitación se acepta.
  - Pegar con el botón un texto con formato inválido muestra un aviso y no lo pone en el campo.
  - Alternar el ojo con el teclado abierto no pierde el texto ni el foco.
  - Mandar la app a segundo plano con la clave visible la vuelve a ocultar.
  - El aviso de privacidad tiene el texto de RF-6.
  - Una clave que ya estaba guardada antes de actualizar la app sigue funcionando sin volver a escribirla.
- **CA-9**: `npx expo config --type introspect` muestra:
  - un manifiesto de Android donde las únicas entradas de `RECORD_AUDIO` y `SYSTEM_ALERT_WINDOW` llevan `tools:node="remove"`;
  - en `application`, los atributos `android:fullBackupContent` y `android:dataExtractionRules` con las rutas de reglas de `expo-secure-store` (los valores exactos se anotan al instalar el paquete);
  - un `Info.plist` de iOS sin `NSFaceIDUsageDescription` ni `NSMicrophoneUsageDescription`.
- **CA-10**: `encontrarSecretos` (de `scripts/escaneoSecretos.js`), según una prueba unitaria:
  - detecta los patrones `AIza…` y `AQ.…` y el valor de una variable de `.env`, tanto en texto como en bytes (`Uint8Array`/`Buffer`);
  - no da falso positivo en contenido limpio;
  - nunca devuelve el valor encontrado en sus motivos.

  `leerValoresSecretos` soporta saltos de línea `\r\n`, BOM, comentarios al final de la línea y comillas.
- **CA-11**: `npm run gate` termina en verde y `bundle:check` informa que el escaneo está limpio, también con `EXPO_PUBLIC_GEMINI_API_KEY` definida en el entorno del proceso (el peor caso). **Control positivo**:
  - Se agrega temporalmente a `index.js` una referencia a `process.env.EXPO_PUBLIC_GEMINI_API_KEY` y se define un valor **falso** en el entorno.
  - `bundle:check` tiene que fallar con código 1 y mostrar el archivo y el motivo sin el valor.
  - Después se revierte el cambio.
- **CA-12**: Las suites existentes siguen en verde. Una prueba comprueba con `typeof` que `obtenerApiKeyActiva`, `obtenerModelos`, `validarApiKeyGemini` y `GeminiError` siguen exportadas como funciones. La firma interna de `ejecutarLlamadaGemini`, que usa la Spec 016, no cambia.

## 5. Fuera de Alcance (hallazgos para Specs futuras)
- **H-8 (Alta) — La APK de release se firma con la clave de depuración pública.**
  - La plantilla de Expo (`expo-template-bare-minimum` 58.0.31, revisada) firma `release` con `signingConfigs.debug`, es decir `debug.keystore` con contraseña `android`.
  - Cualquiera puede firmar una APK `com.ian.mifitnessapp` con ese mismo certificado. Si el usuario la instala, Android la trata como una actualización y le da acceso a todos los datos de la app, incluida la clave del almacenamiento seguro.
  - Corregirlo requiere crear un keystore propio, guardarlo como secreto de GitHub y agregar un config plugin que firme el `release`.
  - Cambiar la firma obliga a desinstalar la versión actual, y como la app no tiene exportación de datos, se perderían. **Necesita decisión del usuario** → Spec 018 propuesta, idealmente junto con una exportación e importación de datos.
- **H-9 (Media) — Vulnerabilidades en dependencias.** `npm audit --omit=dev` reporta 14 (3 altas: `@expo/cli`, `node-forge` y `zod`). Todas están en las herramientas de compilación de Expo, no en el bundle que corre en el teléfono. Se corrigen con `npx expo install --fix` cuando Expo publique parches del SDK 58.
- **H-10 (Baja) — CI.** `release-apk.yml` da `contents: write` a todo el workflow y fija las acciones por etiqueta (`@v4`), no por SHA. Conviene limitar el permiso al paso de publicación y fijar por SHA.
- **H-11 (Informativo) — Copia de seguridad del resto de los datos.** `allowBackup: true` sigue respaldando el resto de AsyncStorage (perfil, comidas, entrenamientos) en la cuenta de Google del usuario. Se mantiene a propósito: hoy es la única forma de recuperar los datos al cambiar de teléfono. La API key queda excluida por RF-3.
