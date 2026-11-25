# Plan Técnico — Spec 025: Respaldo y Restauración de Datos (v2)

> La v2 aplica la revisión del plan: 3 bloqueantes (atomicidad de la restauración, fotos nativas sin borrar `fotos/` y claves `:corrupto:`) y todos los menores.

## 1. Dependencia
- `npx expo install expo-sharing` (SDK 58: `~58.0.23`). Es un módulo nativo nuevo: hará falta un build nuevo y subir `versionCode`.
- El selector de archivos usa `File.pickFileAsync` de `expo-file-system` 58 (ya instalado). No se instala `expo-document-picker`.

## 2. Servicio `src/services/respaldo.js` (nuevo, sin UI)
Formato:
```json
{ "app": "mi-fitness-app", "version": 1, "creado": "AAAA-MM-DD HH:mm", "plataforma": "android|ios|web",
  "datos": { "<clave>": "<valor tal cual en AsyncStorage>" },
  "fotos": [ { "ruta": "fotos/comidas/123-abc.jpg", "base64": "..." } ] }
```

### Lista cerrada `ESQUEMA_CLAVES`
Importa las constantes de cada servicio; las que no estén exportadas se exportan.
- **Claves exactas:**
  - entrenamientos (lista), comidas (lista), perfil (objeto), cambios físicos (lista) y preferencias (objeto);
  - catálogo personalizado, días de descanso y materias: el implementador confirma su forma leyendo su función `cargar*`.
- **Por prefijo:**
  - `PREFIJO_SESIONES_ESTUDIO` + `AAAA-MM` (lista);
  - `PREFIJO_RESUMEN_ESTUDIO` + `AAAA-MM-DD` (objeto);
  - `PREFIJO_CLAVE_FOTO_WEB` + id `[0-9a-z-]` (data URI).

### Funciones
- `esClavePermitida(clave, { incluirFotos })`: la clave está en el esquema, nunca contiene `api_key` ni `:corrupto:`, y las de foto web solo se aceptan con `incluirFotos`. Se usa igual al exportar, al validar y al limpiar.
- `construirRespaldo({ incluirFotos })`:
  - `getAllKeys` → filtro → `multiGet`;
  - con fotos en nativo, recorre dos niveles (`fotos/<carpeta>/<archivo>`, porque `Directory.list()` no es recursivo) y salta lo que no cumpla el patrón de ruta;
  - lee cada `.jpg` en base64 **en secuencia**, con carga perezosa de `expo-file-system`, como en `fotosStorage.js`;
  - la fecha sale de `obtenerFechaLocal()` (nunca `toISOString`).
- `validarRespaldo(objeto)`: devuelve `{ ok, error, datos, fotos, resumen }` y aplica RF-3 completo:
  - `app` correcto, `version === 1` y `datos` como objeto plano;
  - recorre solo propiedades propias (`Object.keys`) y construye `datos` con `Object.create(null)`, así `__proto__` no contamina;
  - cada valor pasa `JSON.parse` y la forma de `ESQUEMA_CLAVES`; las miniaturas cumplen `^data:image/jpeg;base64,[A-Za-z0-9+/=]+$` y ≤ 2 MB;
  - fotos nativas: ruta `^fotos/[a-z0-9_-]{1,40}/[a-z0-9_-]{1,80}\.jpg$`, base64 `^[A-Za-z0-9+/=]+$`, ≤ 2 MB por foto y ≤ 2000 fotos;
  - en web, la suma de longitudes de los valores debe ser ≤ 4 MB;
  - mensajes distintos para: archivo demasiado grande, no es JSON, no es un respaldo de esta app, versión no compatible y datos dañados;
  - `resumen` cuenta entrenamientos, comidas, cambios físicos, sesiones de estudio y fotos para la confirmación.
- `restaurarRespaldo(validado)`: solo recibe la salida de `validarRespaldo` con `ok`. Orden:
  1. **Fotos nativas.** Se escriben directamente en `Paths.document/fotos/<carpeta>/<nombre>` **sin borrar nada**.
     - Los nombres llevan marca de tiempo y son únicos; si ya existe uno igual, se sobrescribe con el mismo contenido.
     - Las fotos que queden huérfanas son inocuas.
     - Se comprueba que cada archivo existe. Si algo falla, se lanza el error antes de tocar AsyncStorage.
  2. **Copia en memoria** de las claves actuales permitidas (`incluirFotos: true`).
  3. `multiSet` de las claves del respaldo.
  4. `multiRemove` de las claves actuales permitidas que el respaldo no trae, más el borrador de sesión activa.
  5. **Si falla el paso 3 o el 4**, en el `catch`:
     - `multiRemove` de las claves nuevas que no existían antes;
     - `multiSet` de la copia;
     - se relanza con el mensaje «No se pudo restaurar; tus datos siguen como estaban».
  6. En web, `rotarMiniaturasWeb()` al final.
- `exportarRespaldo({ incluirFotos })`: construye el respaldo, lo serializa y:
  - en nativo, escribe `Paths.cache/respaldo-fitness-AAAA-MM-DD.json` y llama a `Sharing.shareAsync(uri, { mimeType: 'application/json', dialogTitle })`;
  - en web, usa `Blob` + `URL.createObjectURL` + `<a download>` y después `revokeObjectURL`.
- `elegirYLeerRespaldo()`:
  - Nativo: `File.pickFileAsync({ mimeTypes: ['application/json'] })` devuelve `{ result, canceled }`. Si `canceled`, devuelve `null`. Si no, comprueba `result.size ≤ 50 MB` **antes** de `result.text()`.
  - Web: crea un `<input type="file" accept="application/json,.json">` y comprueba `file.size` antes de `file.text()`. Cancelar devuelve `null`.
  - Después hace `JSON.parse` dentro de `try` y llama a `validarRespaldo`.
  - La CSP de `vercel.json` no bloquea `<a download>` con `blob:` ni `<input type=file>`, así que no se toca.

## 3. UI en `PanelConfiguracionLateral.jsx` (>500 líneas: localizar con grep)
- **Sección nueva** «Respaldo de datos», debajo de la del interruptor de sonidos y con el mismo estilo de fila:
  - casilla «Incluir fotos» (`accessibilityRole="checkbox"`, `aria-checked`);
  - botones «Exportar respaldo» y «Restaurar respaldo» (`aria-busy` mientras trabajan, y un ref que bloquea la doble pulsación);
  - texto corto: «Guarda una copia de tus datos. Tu API key no se incluye.».
- **Confirmación al restaurar:** tras validar, `mostrarAlerta('Restaurar respaldo', '<fecha> · N entrenamientos, N comidas… Reemplazará los datos actuales de este dispositivo.', [Cancelar, Restaurar (destructive)])`.
- **Feedback (RF-5):**
  - éxito → `vibrarExito`, `reproducirSonido('exito')` y `anunciar`;
  - error → `vibrarError`, `reproducirSonido('error')` y `mostrarAlerta` con el mensaje.
- **Prop nueva `onDatosRestaurados`:** `App.js` le pasa `sincronizarDatos`, que se llama una vez después de la última escritura. Al terminar:
  - el panel llama a `cargarPreferenciaSonidos()`, que está exportada (`inicializarSonidos` no sirve porque no relee);
  - el panel pone `setSonidosActivosUI(null)` para que el interruptor vuelva a leer `obtenerSonidosActivos()`;
  - el estado de la clave no cambia.
- **Estilo:** texto desde `components/base/Texto`, iconos `Feather` (`download`, `upload`) y tokens del tema.

## 4. Tests
- `__tests__/respaldo.test.js` (servicio, con AsyncStorage simulado):
  - **Ida y vuelta (CA-1):** con una clave `:corrupto:` presente, que no viaja.
  - **API key y borrador (CA-2):** la API key queda fuera; el borrador también, y además se borra al restaurar.
  - **Rechazos sin borrar nada (CA-3):**
    - `app` o `version` distintos;
    - `datos` que no es objeto;
    - valor que no es JSON;
    - forma incorrecta (perfil como lista);
    - `__proto__` y claves ajenas, que se ignoran;
    - ruta con `..` o fuera del patrón;
    - base64 inválido;
    - `size` simulado > 50 MB, rechazado sin llamar a `text()`;
    - web > 4 MB.
  - **Fotos (CA-4):**
    - web, con y sin la casilla;
    - nativo con `expo-file-system` simulado: recorrido de dos niveles, lectura en base64 y escritura en `fotos/`.
  - **Atomicidad (CA-8):** un `multiSet` que lanza deja AsyncStorage idéntico al de antes.
- **Test de componente del panel:**
  - exportar llama a `exportarRespaldo` con `incluirFotos` según la casilla;
  - restaurar confirma y llama a `onDatosRestaurados` después de escribir (CA-5);
  - botones con nombre y rol (CA-6).
- **Snapshots de caracterización:** el panel no tiene snapshot. Si alguno cambia, se justifica.

## 5. Cierre
- `npm run gate` y `npx expo-doctor`.
- Prueba manual en web: exportar, borrar los datos del sitio y restaurar.
- `MEMORY.md` y nota de `versionCode`.
