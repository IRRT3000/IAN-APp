# Plan Técnico — Spec 026: Complementos de Accesibilidad

## 1. Criterios de Aceptación (CA) Medibles

- **CA-1 (Campos con etiqueta).** `__tests__/accesibilidadEstatica.test.js` falla si un elemento JSX `TextInput` no tiene `accessibilityLabel` ni `aria-label` (literal o expresión) y no recibe props por spread. Resultado esperado: 0 infracciones, sin entradas nuevas en `EXCEPCIONES`. El envoltorio de `base/Texto.jsx` queda exento porque reenvía sus props.
- **CA-2 (Sin `accessibilityState`).** La misma prueba falla si aparece la prop `accessibilityState` en `src/` o `App.js`. Resultado esperado: 0.
- **CA-3 (Tamaño mínimo).** Una nueva `__tests__/tamanoTexto.test.js` falla si una propiedad `fontSize` tiene un literal numérico menor a 11, o una expresión condicional con una rama literal menor a 11, salvo que la línea o la anterior lleve `// a11y-ok: sin texto`. Revisa `.js` y `.jsx` de `src/` (los estilos partidos de la 022 viven en `.js`) y `tokens.js`. Las expresiones no literales (`x * 0.8`, variables) quedan fuera de la prueba y se revisan a mano. Resultado esperado: 0.
- **CA-4 (Fechas legibles).** `__tests__/etiquetasFecha.test.js` cubre `etiquetaFecha`, `etiquetaDiaSelector` y `etiquetaCeldaHeatmap`: inicio y fin de mes, 29/02/2028, fecha inválida, "hoy", nivel 0 y 4, día futuro. En web, el selector semanal de Entrenos anuncia "viernes 27 de noviembre, hoy, con actividad" y el calendario de Inicio "viernes 27 de noviembre, hoy, actividad nivel N de 4" (sin el prefijo "Hoy, " actual).
- **CA-5 (Live Mode).** En web, los campos de la serie 1 se anuncian "Peso en kilogramos, serie 1" y "Repeticiones, serie 1". En Android (`uiautomator dump`), los `EditText` tienen ese `content-desc`.
- **CA-6 (Estados en web).** En la preview web, la pestaña activa de la barra inferior expone `aria-selected="true"`, el filtro activo de Estudio también, y la casilla "Incluir fotos en el respaldo" expone `aria-checked`.
- **CA-7 (Modales en web).** Con el onboarding (modo edición), el catálogo, Live Mode y Configuración abiertos: `#root` tiene `inert` y `aria-hidden="true"`; `document.activeElement` es el título del modal (o el contenedor `[aria-modal]` si no hay título); al cerrar con el botón o con Escape, `#root` vuelve a la normalidad y el foco regresa al botón que abrió el modal. Al abrir y cerrar el submodal "Nuevo ejercicio" dentro del catálogo, el foco vuelve al botón "Crear" del catálogo y `#root` sigue inerte hasta cerrar el catálogo.
- **CA-7b (Lógica de modales probada).** La lógica vive en una función pura `crearGestorModales({ obtenerRaiz, obtenerActivo })` y `__tests__/modalAccesible.test.js` la prueba con objetos simulados: apertura y cierre balanceados, modal anidado con pila de focos, desmontaje con `visible` todavía en `true` (la limpieza cierra), restauración solo si el elemento sigue conectado, y ninguna acción fuera de web.
- **CA-7c (Anuncios con modal abierto).** En web, con un modal abierto, existe exactamente una región `role="status"` dentro del `[aria-modal]` superior, y un `anunciar('prueba')` aparece en ella. `ModalAnalisisComida` deja de montar su propia región para no duplicar.
- **CA-8 (Sin regresiones).** `npm run gate` en verde: lint con 0 errores, al menos las 34 suites y 420 tests previos más los nuevos, y `bundle:check`. El cambio de `<Modal>` a `<ModalAccesible>` no altera el árbol en nativo ni en las pruebas (el envoltorio devuelve `<Modal>` igual y solo añade la región en web). Los 12 snapshots de caracterización de la 022 (`caracterizacionOnboarding`, `caracterizacionCambioFisico`) solo cambian por etiquetas y `fontSize`, revisando el diff antes de `-u`. El recorrido de humo (onboarding, Live Mode, 5 pestañas, exportar respaldo, persistencia) pasa en la preview de Vercel y en Android con Expo Go.

## 2. Etiquetas de fecha (`src/utils/etiquetasFecha.js`, nuevo)
Funciones puras, con nombres de días y meses en español escritos en la propia utilidad:
- `etiquetaFecha(fechaLocal, { conAnio, conDiaSemana })` → "viernes 27 de noviembre de 2026". Valida que la fecha exista (rechaza 2027-02-29) y devuelve `''` si no.
- `etiquetaDiaSelector({ fecha, esHoy, tieneActividad })` → "viernes 27 de noviembre, hoy, con actividad".
- `etiquetaCeldaHeatmap({ fecha, nivel, esHoy, esFutura })` → "viernes 27 de noviembre, hoy, actividad nivel 2 de 4" / "…, sin actividad" / "…, día futuro" (con día de la semana, sin año).
- `etiquetaCampoSerie({ campo, serie, unidad })` → "Peso en kilogramos, serie 2" / "Peso en libras, serie 2" / "Repeticiones, serie 2".

Se usan en `heatmap/HeatmapDayCell.jsx` (línea ~59, sustituye la etiqueta ISO actual), en la celda de `SelectorSemanal.jsx` (hoy anuncia "21/11") y en los dos campos de `LiveModeModal.jsx`.

## 3. Campos de texto (RF-1)
Añadir `accessibilityLabel` a los 19 campos: `CalculadoraPesoModal` (1, según la unidad activa), `CatalogoEjerciciosModal` (2: búsqueda y nombre del ejercicio nuevo), `GestionMateriasModal` (2), `LiveModeModal` (2, con `etiquetaCampoSerie`), `ModalAnalisisComida` (6: descripción, nombre del plato, calorías, proteínas, carbohidratos y grasas), `PanelConfiguracionLateral` (1: clave de API de Gemini), `SesionEstudioModal` (4: nueva materia, tema, minutos y apuntes) y `onboarding/renderPaso1Identidad.js` (1). La lista definitiva la da la prueba de CA-1.

## 4. Estados (RF-2)
- `BarraNavegacionInferior.jsx:~107` y `EstudioView.jsx:~73`: `accessibilityState={{ selected: X }}` → `aria-selected={X}`.
- `SeccionRespaldo.jsx:~152`: `{ checked }` → `aria-checked`.
- `SeccionRespaldo.jsx:~169` y `~189`: `{ busy, disabled }` → `aria-busy` y `aria-disabled`.

## 5. Modales en web (RF-4)
**Lógica pura (`src/utils/gestorModales.js`):** `crearGestorModales({ obtenerRaiz, obtenerActivo })` devuelve `abrir(id)` y `cerrar(id)` y mantiene una **pila** `[{ id, focoPrevio }]`:
- `abrir`: guarda `obtenerActivo()` como foco previo del nuevo modal (si existe); con el primero, marca la raíz con `inert = true` y `aria-hidden="true"`.
- `cerrar`: quita esa entrada (aunque no sea la superior); si la pila queda vacía, restaura la raíz; devuelve el foco al `focoPrevio` de esa entrada si `isConnected`.
- `esSuperior(id)` y una suscripción simple para que el componente sepa si es el modal de arriba.

**Componente (`src/components/ModalAccesible.jsx`):** envuelve `<Modal>` de `react-native`. Solo con `Platform.OS === 'web'` y `visible`:
- en un efecto llama a `abrir(id)` y, en la limpieza, a `cerrar(id)` (cubre el desmontaje con `visible` en `true`);
- tras ~60 ms enfoca el primer `[role="heading"]` del último `[aria-modal="true"]`, o el propio contenedor con `tabindex="-1"` si no hay encabezado;
- si es el modal superior, renderiza `<RegionAnuncios />` dentro de su contenido. En nativo y en Jest devuelve `<Modal {...props} />` sin añadir nada.

**Foco de react-native-web:** RNW 0.21 trae `ModalFocusTrap`, que solo actúa cuando el foco intenta salir del diálogo. La implementación verifica en la preview que el foco inicial al título y la restauración no compiten con él (en la prueba del 27/11 de la rama `claude/app-status-c09be7`, un enfoque equivalente funcionó: título enfocado y foco devuelto al abrir y cerrar Configuración). Si compiten, se deja un solo mecanismo y se documenta.

Sustituir `<Modal` por `<ModalAccesible` en los 12 archivos que hoy lo usan (`grep -rln "<Modal" src`), quitando `Modal` del import de `react-native`, y quitar `<RegionAnuncios />` de `ModalAnalisisComida`. Si una etiqueta nueva vive en un `render*.js` de la 022, solo usa valores que ya estén en `ctx` (o se añaden a `ctx`), para no romper `contextoRender.test.js`.

En `PanelConfiguracionLateral`, el `TouchableOpacity` de gesture-handler ya renderiza un `<button>` en web. Hay que verificar que no queden botones anidados (en la 023 se corrigió con `bfb6bec`) y no reintroducirlos.

## 6. Tamaño mínimo (RF-5)
1. Localizar con `grep -rnE "fontSize: ?(7|8|9|10)(\.[0-9]+)?\b" src` (unos 110 casos en 20 archivos, incluidos `tokens.js` y los `estilosParteN.js` de `onboarding/` y `cambioFisico/`).
2. Subir cada valor a 11. Los estilos de elementos sin texto se marcan con `// a11y-ok: sin texto`.
3. Revisar visualmente en web a 375x812, como mínimo: barra inferior, selector semanal, calendario mensual, chips de objetivo en Físico, tarjetas del pasaporte, pasos del onboarding y Configuración. Si algo se corta, se ajusta `letterSpacing` o el ancho, o se permiten 2 líneas.

## 7. Pruebas
- Ampliar `accesibilidadEstatica.test.js` con CA-1 y CA-2 (o crear un archivo hermano, si así queda más claro), con el mismo patrón de `PENDIENTES`/`EXCEPCIONES` vacíos.
- `__tests__/tamanoTexto.test.js` para CA-3.
- `__tests__/etiquetasFecha.test.js` para CA-4.
- `__tests__/modalAccesible.test.js` para CA-7b.
- Actualizar los snapshots de la 022 con `-u` solo después de revisar que el diff se limita a etiquetas, `aria-*` y tamaños.

## 8. Verificación manual (obligatoria antes del PR)
1. Subir la rama para que Vercel genere su preview y probar ahí, a 375x812: CA-4 a CA-7 y el recorrido de humo de CA-8.
2. Levantar `npx expo start`, abrir en el emulador Android con Expo Go y dejar el QR listo para el usuario: CA-5 con `uiautomator dump` y el recorrido de humo.

## 9. Riesgos
- **Textos cortados al subir a 11 px.** Mitigación: la revisión visual de §6.3.
- **Snapshots grandes de la 022.** Mitigación: revisar el diff antes de `-u`.
- **`inert` en navegadores viejos.** Si no existe, queda `aria-hidden`. No rompe la interacción porque el modal sigue encima.
