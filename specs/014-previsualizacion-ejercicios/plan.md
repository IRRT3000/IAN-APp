# Plan Técnico — Spec 014: Previsualización Minimalista de Ejercicios

## 1. Objetivo
Mostrar una miniatura ilustrada del ejercicio (RepDB) en las filas del catálogo y en las tarjetas de la lista del día, sin dependencias nuevas, sin tocar la persistencia y sin cambiar el comportamiento de selección.

## 2. Archivos Afectados
| Archivo | Acción |
| - | - |
| `assets/ejercicios/*.webp` (47) | Nuevos (RepDB reducido, ver spec §5) |
| `src/constants/imagenesEjercicios.js` | Nuevo |
| `src/components/MiniaturaEjercicio.jsx` | Nuevo |
| `src/components/CatalogoEjerciciosModal.jsx` | Modificar `renderItem` (~línea 227) y estilos |
| `src/components/EntrenamientosView.jsx` | Modificar la cabecera de la tarjeta del día (~línea 135) y estilos |
| `__tests__/imagenesEjercicios.test.js` | Nuevo |
| `src/components/PanelConfiguracionLateral.jsx` | Crédito RepDB tras el bloque de privacidad (RF-6) |
| `README.md` | Sección Créditos (RF-6) |

Ningún otro archivo debe aparecer en `git status`. Los scripts o archivos temporales del posproceso viven fuera del repositorio.

## 3. Pasos de Ejecución
1. **Generar los assets**: para cada fila del mapeo (spec §5), descargar `images/flat/<slug>-<pose>.webp` de RepDB a una carpeta temporal y, con Python y Pillow, aplicar `resize((192, 192), LANCZOS)` sin recortar ni tocar el fondo. Guardar como WebP con calidad 80 en `assets/ejercicios/<id>.webp`. El script vive fuera del repositorio y no se añade nada a `package.json`. La licencia prohíbe quitar el fondo, ampliar y aplicar IA generativa.
2. **`src/constants/imagenesEjercicios.js`**:
   - `IMAGENES_EJERCICIOS`: objeto con 47 entradas `'base-pecho-1': require('../../assets/ejercicios/base-pecho-1.webp')`. Los `require` deben ser literales (Metro no admite rutas dinámicas) y la clave debe ser idéntica al nombre del archivo.
   - `normalizarNombre(nombre)`: `String(nombre ?? '').trim().toLowerCase()`.
   - `INDICE_NOMBRE_A_ID` (exportado para las pruebas): `Map` construido una sola vez desde `CATALOGO_EJERCICIOS_BASE` (importado de `./catalogoEjercicios`), con clave el nombre normalizado y valor el `id`.
   - `export const obtenerIdImagenEjercicio = ({ id, nombre } = {}) => …`: si `Object.hasOwn(IMAGENES_EJERCICIOS, id)` devuelve `id`; si no, devuelve `INDICE_NOMBRE_A_ID.get(normalizarNombre(nombre)) ?? null`.
   - `export const obtenerImagenEjercicio = (datos) => …`: `const idResuelto = obtenerIdImagenEjercicio(datos); return idResuelto ? IMAGENES_EJERCICIOS[idResuelto] ?? null : null;`.
   - Ninguna de las dos funciones lanza errores con `undefined`, `null`, cadenas vacías ni claves heredadas como `'constructor'`.

3. **`src/components/MiniaturaEjercicio.jsx`**:
   - Props: `{ id, nombre, grupoMuscular, implemento, tamano = 44 }`.
   - Contenedor `View` de `tamano × tamano`, `borderRadius: TOKENS.radii.sm`, `backgroundColor: TOKENS.colors.surface`, borde hairline `TOKENS.colors.borderDefault` y `overflow: 'hidden'`.
   - Con imagen (`imagen != null`): `Image` de `react-native` de `tamano × tamano` (ocupa todo el cuadro), con `resizeMode="cover"` y `fadeDuration={0}` (evita el fundido de Android al reciclar filas). Sin `tintColor`, porque convertiría la ilustración en una silueta, y sin velo.
   - Sin imagen: un velo `View` con `StyleSheet.absoluteFillObject` y `backgroundColor: \`${obtenerColorGrupo(grupoMuscular)}1A\`` (alfa ≈ 10%), con el icono encima: `Feather` con `name={obtenerIconoImplemento(implemento)}` (ya existe en `src/constants/catalogoEjercicios.js` y devuelve los mismos nombres Feather que las funciones locales de los componentes), con `size` de 20 si `tamano >= 44` y de 16 en otro caso, y `color={obtenerColorGrupo(grupoMuscular)}`.
   - Accesibilidad: en el contenedor, `accessible={false}`, `importantForAccessibility="no-hide-descendants"` (Android) y `accessibilityElementsHidden` (iOS).
   - Exportar con `React.memo`.

4. **`CatalogoEjerciciosModal.jsx`**: leer solo el rango de `renderItem` (~líneas 218–262) y los estilos `tarjetaEjercicio` / `infoEjercicio` (~líneas 471–495). Insertar `<MiniaturaEjercicio id={item.id} nombre={item.nombre} grupoMuscular={item.grupoMuscular} implemento={item.implemento} tamano={44} />` como primer hijo del `TouchableOpacity`, separada de `infoEjercicio` con `marginRight: TOKENS.spacing.sm + TOKENS.spacing.xs` (12 pt, escala 4 pt). No cambiar `onPress`.

5. **`EntrenamientosView.jsx`**: leer solo la tarjeta (~líneas 115–180) y los estilos `cabeceraTarjeta` / `infoTituloEjercicio` (~líneas 638–650). Insertar `<MiniaturaEjercicio nombre={item.ejercicio} grupoMuscular={item.grupoMuscular} implemento={item.implemento} tamano={40} />` como primer hijo de `cabeceraTarjeta`, antes de `infoTituloEjercicio`, con `marginRight: TOKENS.spacing.sm + TOKENS.spacing.xs` (12 pt). **No pasar `item.id`**: en esta lista `item.id` es el id del registro, no el del catálogo. Si hace falta, ajustar `alignItems` para que la miniatura no desalinee la cápsula de borrado ni la insignia "Historial".

6. **Pruebas** `__tests__/imagenesEjercicios.test.js`: al menos 7 bloques `test(...)` separados. Hay que tener en cuenta que `jest-expo` transforma toda imagen a `1`, así que comparar los valores de `require` no detecta un mapa cruzado; por eso las pruebas comparan **ids** y leen los archivos con `fs`.
   - Usar `import fs from 'fs'` con rutas relativas a la raíz del proyecto (`'assets/ejercicios'`, `'src/constants/imagenesEjercicios.js'`), porque jest corre desde la raíz.
   - **No usar `__dirname` ni `process`**: el lint (`no-undef`) fallaría y no se puede tocar `eslint.config.js`.
   - Casos a cubrir:
   1. Cada `id` de `CATALOGO_EJERCICIOS_BASE` tiene entrada en `IMAGENES_EJERCICIOS` (47/47) y no hay claves que no estén en el catálogo.
   2. **Coherencia clave ↔ archivo**: leer el texto de `src/constants/imagenesEjercicios.js` con `fs` y comprobar con una expresión regular que en cada entrada `'<clave>': require('../../assets/ejercicios/<archivo>.webp')` se cumple `clave === archivo`, y que hay exactamente 47 entradas. Usar una expresión regular global con `matchAll`, tolerante a espacios, comillas simples o dobles y coma final, por ejemplo: `/['"]([\w-]+)['"]\s*:\s*require\(\s*['"]\.\.\/\.\.\/assets\/ejercicios\/([\w-]+)\.webp['"]\s*\)/g`.
   3. **Assets en disco (CA-1)**: `assets/ejercicios/` contiene exactamente 47 `.webp`, cuyos nombres coinciden uno a uno con los ids.
   4. **Cabecera WebP (CA-1)**: para cada archivo, comprobar la firma `RIFF`…`WEBP` y leer ancho y alto según el chunk: `VP8 ` (bytes 26–29, 14 bits), `VP8L` (bits empaquetados desde el byte 21, +1) o `VP8X` (24 bits desde el byte 24, +1). Las dimensiones deben ser 192×192, y el peso ≤ 15 360 bytes por archivo y ≤ 768 000 bytes en total.
   5. `obtenerIdImagenEjercicio({ id: 'base-espalda-1' })` devuelve `'base-espalda-1'`.
   6. `obtenerIdImagenEjercicio({ nombre: '  jalón al pecho en polea ' })` devuelve `'base-espalda-1'` (prueba el `trim` y el cambio de mayúsculas), y lo mismo con cualquier `{ id: 'pers-123', nombre: <nombre base> }`.
   7. Devuelven `null` tanto `obtenerIdImagenEjercicio` como `obtenerImagenEjercicio` en estos casos:
      - nombre desconocido;
      - `''`;
      - `{ nombre: undefined }`;
      - llamada sin argumentos;
      - `{ id: 'pers-123' }` sin nombre;
      - `{ id: 'constructor' }`;
      - `{ nombre: 'toString' }`.

7. **Puerta de calidad**: `npm run gate` en verde (CA-8). `bundle:check` confirma además que Metro resuelve los 47 `require`.

8. **Verificación manual (CA-9)** en Expo Go:
   - Abrir Entrenos y luego el catálogo, y recorrer los 6 filtros de grupo.
   - Abrir Configuración y comprobar que el crédito de RepDB se ve y abre repdb.co (CA-10).
   - Crear un ejercicio personalizado y comprobar que muestra el placeholder.
   - Registrar un "Jalón al pecho en polea" y comprobar la miniatura en la lista del día.
   - Comprobar que la lista completa se desplaza con fluidez.

## 4. Riesgos
- **Licencia**: cualquier edición que no sea redimensionar, recortar o recolorear (quitar el fondo, ampliar, restyling con IA) incumple la licencia. Además, el crédito debe seguir siendo visible.
- **Fondo claro de las ilustraciones** sobre la interfaz OLED oscura: lo aceptó el usuario. Se acota con el radio y el borde hairline del cuadro.
- **Colisión de nombres**: un personalizado con el mismo nombre que un ejercicio base mostraría la imagen base. Es aceptable, porque representa el mismo movimiento.
