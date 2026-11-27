# Spec 022: Partir los Componentes Gigantes sin Cambios Visibles

> **Estado: BORRADOR.** Lo redactó Claude Code el 2026-11-23 y depende de la decisión **Q5**: el refactor debe ser 100 % invisible. No se implementa sin aprobación del usuario y `PLAN_APROBADO`.

## 1. Visión y Justificación del Problema
Dos componentes concentran casi una quinta parte del código de la app:

| Archivo | Líneas | Estado (`useState`) | Estilos | Contenido |
|---|---|---|---|---|
| `src/components/OnboardingBienvenidaModal.jsx` | 3015 | 16 | ~970 (desde la línea 2046) | Escena de bienvenida, 4 pasos del asistente (identidad, antropometría, antigüedad, objetivo), celebración, 52 valores animados, validación y guardado del perfil |
| `src/components/CambioFisicoView.jsx` | 2191 | 16 | ~835 (desde la línea 1355) | Selector semanal, fotos, análisis con IA, comparación, borrado con pulsación sostenida, tarjeta de cada registro (~215 líneas) y modal de báscula y hora (~190 líneas) |

En archivos de este tamaño, cualquier cambio es lento y arriesgado:
- Hay que leer miles de líneas para ubicar una sección.
- Un error en una escena puede afectar a las demás.
- El costo de cada revisión (humana o de IA) crece con el archivo.
- No se pueden probar partes por separado.

Las Specs 023 (accesibilidad) y 024 (micro-animaciones) tocarán estas pantallas. Partirlas antes hace que esas mejoras sean más pequeñas y seguras.

**Requisito del usuario:** «De momento no quiero cambiar nada». El refactor no debe cambiar nada que el usuario vea o sienta: diseño, textos, animaciones, hápticos, orden de los pasos, validaciones y datos guardados.

### Hallazgo adicional
- Ningún test renderiza componentes: los 18 suites prueban servicios y utilidades. Para garantizar que el refactor es invisible, primero hay que crear una red de seguridad.

## 2. Requerimientos Funcionales (RF)
- **RF-1 (Red de seguridad previa):** Antes de mover una sola línea, se agregan tests de caracterización con `@testing-library/react-native` (dependencia de desarrollo). Renderizan con el código **actual** y guardan un snapshot del árbol (`toJSON()`) en estos estados:
  - Onboarding: escena 0 (bienvenida), escenas 1 a 4 y escena 5 (celebración), en modo alta y en modo edición.
  - Cambio Físico: sin registros, con 2 registros de ejemplo, con el modal de báscula abierto y en modo solo lectura (día distinto de hoy).

  Esos snapshots se commitean **antes** del refactor y no se pueden regenerar durante él.
- **RF-2 (Onboarding modular):** `OnboardingBienvenidaModal.jsx` queda como orquestador de menos de 450 líneas y conserva su `export default` y sus props. El resto se mueve a `src/components/onboarding/`:
  - `constantes.js`: `SPRING_*`, `EASE_OUT_STRONG`, `MESES_CORTOS`, `PILARES_HERO` y `CATALOGO_OBJETIVOS`. El orquestador los vuelve a exportar para no romper ningún import.
  - `utilidadesFecha.js`: `obtenerMaxDiasMes` y `formatearFechaLegible`.
  - `useOnboardingFormulario.js`: estado, valores derivados (edad, IMC, tiempo entrenando, nivel), ajustes, validación, avance, retroceso y guardado.
  - `useAnimacionesOnboarding.js`: valores animados, cascada de bloques y transiciones entre escenas.
  - `BotonInteractivo.jsx`, `EscenaHero.jsx`, `CabeceraWizard.jsx`, `PasoIdentidad.jsx`, `PasoAntropometria.jsx`, `PasoAntiguedad.jsx`, `PasoObjetivo.jsx` y `EscenaCelebracion.jsx`. Cada uno trae sus estilos en el mismo archivo.
- **RF-3 (Cambio Físico modular):** `CambioFisicoView.jsx` queda como orquestador de menos de 450 líneas. Lo demás se mueve a `src/components/cambioFisico/`:
  - `constantes.js`: `MAX_FOTOS_POR_ANALISIS`, `MOMENTOS_DIA`, `PASOS_BASCULA` y `DURACION_PULSACION_BORRADO_MS`.
  - `utilidadesHora.js`: `obtenerEstadoHoraInicial` y `formatearHora12h`.
  - `useCambioFisico.js`: carga y sincronización, fotos, análisis, comparación y borrado.
  - `CapsulaBorradoSeguroFisico.jsx`, `TarjetaCambioFisico.jsx`, `CabeceraCambioFisico.jsx` (encabezado del `FlatList`) y `ModalRegistroFisico.jsx` (báscula y hora).
- **RF-4 (Comportamiento idéntico):** No cambian los textos, valores de estilo, animaciones, resortes, hápticos, `accessibilityLabel`, claves de almacenamiento, formas de datos, ni el orden ni la frecuencia de las llamadas a `storage.js` y `gemini.js`. Solo se mueve código, y se renombra únicamente lo interno.
- **RF-5 (Rendimiento):**
  - Los subcomponentes reciben props estables (`useCallback`/`useMemo` cuando ya existían) y se envuelven en `React.memo` solo cuando eso no cambia lo que se pinta.
  - `renderItem` del `FlatList` pasa a ser un componente memoizado (`TarjetaCambioFisico`) con `keyExtractor` estable.

## 3. Criterios de Aceptación (CA)
- **CA-1:** Los snapshots de RF-1 existen en un commit anterior al primer commit del refactor (`git log` lo demuestra) y, al terminar, `npm test` los pasa **sin `-u`**. Cualquier diferencia en un snapshot invalida el refactor.
- **CA-2:** `wc -l` da menos de 450 líneas en `OnboardingBienvenidaModal.jsx` y en `CambioFisicoView.jsx`, y ningún archivo nuevo de `onboarding/` o `cambioFisico/` supera las 500.
- **CA-3:** `git grep -n "OnboardingBienvenidaModal\|CambioFisicoView"` muestra que los imports de `App.js` y de cualquier otro archivo no cambiaron.
- **CA-4:** Los tests de los hooks extraídos (`useOnboardingFormulario`, `useCambioFisico`) cubren:
  - La validación de cada paso.
  - El cálculo de edad e IMC.
  - Que el guardado llama a `guardarPerfilUsuario` con el mismo objeto que antes. Se compara contra un objeto capturado con el código actual.
  - Que el borrado de registros y la comparación llaman a los mismos servicios con los mismos argumentos.
- **CA-5:** En la versión web, el navegador integrado toma capturas **antes** y **después** del refactor de cada escena del onboarding y de Cambio Físico (con y sin registros), con el mismo tamaño de ventana (375×812).
  - Una comparación píxel a píxel da ≤ 0,1 % de diferencia por captura. Si la herramienta de comparación no se puede usar, la comprobación se declara manual en `tasks.md`.
  - La consola no muestra errores ni avisos nuevos.
  - Como los snapshots de Jest no ejecutan animaciones reales, el usuario además revisa en su Android la lista corta del plan §4.
- **CA-6:** `npm run gate` está en verde y `npx expo export --platform android` compila (parte de `bundle:check`).

## 4. Fuera de Alcance
- Cualquier cambio visual, de accesibilidad o de animación (Specs 023 y 024).
- `storage.js` (1355 líneas), `PanelConfiguracionLateral.jsx` (1340) y `gemini.js` (1048). Se proponen como una Spec posterior si esta sale bien. `gemini.js` ya se reorganiza en parte en la Spec 021.

## 5. Riesgos
- **Los valores animados de Reanimated** creados en un hook y usados en otro componente deben seguir siendo los mismos objetos. Se mitiga pasándolos por props, nunca recreándolos, y con los snapshots y las capturas.
- **Los snapshots de `toJSON()` incluyen estilos animados iniciales**, pero no el movimiento en sí. Las animaciones se revisan a mano en web y en el teléfono del usuario (lista corta al final).
- **Conflicto con la Spec 021:** también toca `CambioFisicoView.jsx` (texto de progreso). Se implementa la 021 antes que la 022, o se aplica ese cambio pequeño sobre el archivo ya partido.

## 6. Decisiones Pendientes
- **Q5:** confirmar que el refactor debe ser 100 % invisible.
- **Q1:** confirmar el orden de las Specs.
- Instalar `@testing-library/react-native` como dependencia de desarrollo. Es solo para pruebas y no viaja en la app.
