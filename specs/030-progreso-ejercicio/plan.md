# Plan — Spec 030

## Archivos
- **Nuevo** `src/utils/progresoEjercicio.js`: lógica pura de RF-1. La normalización es `normalizarNombre`: `normalize('NFD')`, quitar el rango de diacríticos U+0300–U+036F (escrito con escapes `\u0300-\u036f`), colapsar espacios con `\s+`, `trim` y minúsculas. Los números pasan por un parser que acepta coma. El redondeo a 0,5 se hace con `Math.round(x * 2) / 2`.
- **Nuevo** `src/components/entrenamientos/ModalProgresoEjercicio.jsx`: contiene el modal de RF-4. Recibe las props `visible`, `nombreEjercicio`, `entrenamientos` y `onCerrar`. El historial y los récords se calculan con `useMemo`, y la métrica elegida es estado local cuyo valor inicial es la primera métrica con datos (1RM, Peso máx, Volumen).
  - La gráfica es una fila de 12 columnas como máximo. Cada barra mide `altura = max(4, valor / maximo × 120)` px. Cuando la métrica no tiene datos (todos los valores en 0, por ejemplo un ejercicio sin peso), se muestra «Sin datos de peso para esta métrica».
  - La lista de sesiones va en un `ScrollView`.
- **Editar** `src/components/EntrenamientosView.jsx` (920 líneas; se edita solo por rangos):
  - `TarjetaEntrenamientoItem` recibe dos props nuevas, `esRecord` y `onVerProgreso`. La insignia va en `filaBadgesTarjeta` y el botón «Ver progreso», en una fila propia debajo de las métricas, a la izquierda y con estilo discreto.
  - En la vista principal: estado `progresoDe` (nombre o `null`), cálculo de `esRecord` por tarjeta con `useMemo` a partir de `entrenamientos` y el modal montado con `key` por nombre.
- **Tests**:
  - Nuevo `__tests__/progresoEjercicio.test.js`, con los casos de CA-1 a CA-4.
  - Nuevo `__tests__/progresoEjercicioUI.test.js`, con CA-5. Usa RNTL 14 con la API async y `test-utils/setupComponentes`.

## Riesgos
- Rendimiento: la vista calcula `indexarHistoriales(entrenamientos)` una vez con `useMemo` sobre `[entrenamientos]`, y `registroEsRecord` acepta ese índice opcional para no recorrer la lista por tarjeta.
- Ningún snapshot cubre `EntrenamientosView`. El riesgo real es montarla en un test: no hay ninguno previo. El test de integración mockea `storage` (`cargarCatalogoPersonalizado`, `cargarSesionActivaDraft`), háptica y sonido, `MiniaturaEjercicio`, `CatalogoEjerciciosModal`, `LiveModeModal` y `CalculadoraPesoModal`, y fija la fecha con `jest.useFakeTimers({ now })` o similar. Si montar la vista sale demasiado costoso, se prueba `TarjetaEntrenamientoItem` exportándola con nombre.

## Cierre
`npm run gate`, revisión de código, prueba en el emulador por Remote Control (sin commits), y actualizar `MEMORY.md` y `TROUBLESHOOTING.md` si hace falta.
