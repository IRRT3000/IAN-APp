# Plan Técnico — Spec 022: Partir los Componentes Gigantes sin Cambios Visibles

> **Estado: BORRADOR**, pendiente de Q5/Q1 y `PLAN_APROBADO`. Se implementa **después** de la Spec 021 (ver Riesgos de la spec).
> Regla de lectura (CLAUDE.md): los archivos de más de 500 líneas se recorren con `grep` y se leen por rangos con `offset`/`limit`.

## 0. Capturas «antes» (CA-5)
Con el código actual:
1. `npx expo export --platform web` y servir `dist/`.
2. Con el navegador integrado a 375×812, capturar:
   - Onboarding, escenas 0 a 5. Para llegar a la escena 0 se borra el perfil de `localStorage` de esa pestaña. Se usa un perfil de prueba que **no** es del usuario.
   - Cambio Físico vacío.
   - Cambio Físico con 2 registros, sembrados en `localStorage` con datos ficticios.
   - Modal de báscula abierto.
3. Guardar las capturas en la carpeta temporal de la sesión. No se commitean.

## 1. Red de seguridad (RF-1, primer commit)
**Requisito previo:** la Spec 020 (RF-3) ya está aplicada. Sin ella, Jest ignora todos los tests dentro de `.claude/worktrees/…` y los snapshots «pasarían» sin ejecutarse. Antes de empezar, `npm test` debe informar al menos 18 suites.

### 1a. Prueba de humo de las herramientas (antes de escribir snapshots)
- `npm i -D @testing-library/react-native@14.1.0 test-renderer@1.3.1`, con versiones exactas.
  - Son librerías de pruebas, solo JavaScript, que no llegan al teléfono, así que la regla de `npx expo install` no aplica.
  - RNTL 14 pide `react >= 19`, `react-native >= 0.78`, `jest >= 29` y `test-renderer ^1`. Ya no usa `react-test-renderer`.
- Comprobar que `test-renderer` usa un `react-reconciler` compatible con React 19.3 (`npm ls react-reconciler`).
  - **Plan B si hay conflicto de peer dependencies:** probar la versión estable anterior de RNTL que acepte React 19 sin `test-renderer`. Si tampoco funciona, parar y avisar al usuario sin forzar nada con `--legacy-peer-deps`.
- `__tests__/humoComponentes.test.js`: `await render(<Text>hola</Text>)` y otro render con un `Animated.View` que usa `useAnimatedStyle`. Debe pasar antes de seguir.
- **RNTL 14 es asíncrono:** `render`, `renderHook`, `fireEvent` y `act` se usan con `await`.

### 1b. Setup de los simulados
- Va en `__tests__/setup/componentes.js`. **No** se registra de forma global (para no alterar las 18 suites de servicios). Cada test de componentes lo importa en su primera línea.
- Contenido:
  - `jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'))`.
  - `react-native-worklets` **no** se simula de entrada: `react-native-reanimated/mock` ya lo cubre. El archivo está en `lib/module/mock.js`, pero el campo `exports` del paquete no lo expone. Si la prueba de humo de §1a (que incluye un `Animated.View` con `useAnimatedStyle`) muestra que hace falta, se resuelve ahí y se documenta en `tasks.md`.
  - `import 'react-native-gesture-handler/jestSetup'`. Lo trae la 3.3, y jest-expo no simula Reanimated ni Gesture Handler.
  - `jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'))`.
  - `expo-haptics` y `expo-image-picker` como funciones `jest.fn()` que resuelven al instante. `expo-blur` no se usa en estos archivos y no se simula.
  - `react-native-safe-area-context` con insets fijos (`top: 47, bottom: 34, left: 0, right: 0`). Comprobar con `grep` que `src/utils/useSafeInsets.js` no lee otros valores variables.
  - `useWindowDimensions` / `Dimensions` fijos en 375×812 con `jest.spyOn`.
  - `Platform.OS = 'ios'` (lo que jest-expo usa por defecto), anotado en el test, porque `OnboardingBienvenidaModal` cambia su comportamiento según `Platform.OS`.
  - `Math.random` fijo en 0.5 con `jest.spyOn`. `CambioFisicoView` arma ids con `Date.now()` y `Math.random()` (líneas ~276 y ~474).
- **Reloj:** `jest.useFakeTimers({ now: new Date(2026, 10, 23, 10, 0, 0), doNotFake: ['nextTick', 'queueMicrotask'] })`, para no congelar las promesas de AsyncStorage ni los `await` de RNTL. Los temporizadores avanzan con `await act(async () => { await jest.runOnlyPendingTimersAsync(); })`. Cada test termina con `unmount()`.
- **Snapshot guardián:** un test comprueba que el simulado de Reanimated devuelve el valor final de `withTiming`/`withSpring` (por ejemplo, la `opacity` final del primer bloque de la escena 0). Así queda claro qué estado de las animaciones fija cada snapshot.
- En los snapshots de modales se pasa `visible` explícitamente.
- `__tests__/caracterizacionOnboarding.test.js`:
  - Renderiza `OnboardingBienvenidaModal` (alta y edición).
  - Avanza por las escenas con las mismas acciones que haría el usuario: escribir el nombre y pulsar «Siguiente» (`fireEvent.press` por texto o `accessibilityLabel` existentes).
  - Guarda `expect(toJSON()).toMatchSnapshot()` por escena.
  - En la escena final, captura el objeto que recibe `guardarPerfilUsuario` (simulado con `jest.spyOn`) y lo deja en un snapshot aparte (CA-4).
- `__tests__/caracterizacionCambioFisico.test.js`: renderiza `CambioFisicoView` sin registros, con 2 registros (sembrados con `AsyncStorage.setItem` usando la clave real), con el modal abierto y con una fecha pasada seleccionada. Guarda un snapshot por estado.
- **Commit 1:** «test(spec-022): snapshots de caracterización previos al refactor». Desde aquí, no se permite `jest -u`.

## 2. Onboarding (RF-2), en commits pequeños
Después de cada paso se corre `npm test` y los snapshots deben seguir iguales.

**Reglas que valen para §2 y §3:**
- **Orden de los hooks y efectos:** en el orquestador, los hooks extraídos se llaman en el mismo orden en que estaban declarados el estado y las animaciones originales: primero el estado (~228-250), luego los valores animados (~259-307). Los `useEffect` (~312, ~405, ~547, ~569) conservan su orden relativo. Si un snapshot cambia, **no se regenera**: se corrige el orden.
- **Valores animados:** se pasan por props como el objeto `SharedValue` completo, nunca como `.value`. Se crean una sola vez en el hook de animaciones.
- **Valores animados locales:** los de `BotonInteractivo` (~176) y `CapsulaBorradoSeguroFisico` (~86) se mueven junto con su componente.
- **Worklets:** `grep` confirmó que no hay `'worklet'`, `runOnJS` ni `scheduleOnRN` en estos dos archivos. Si aparecen al mover código, el callback que se pase al hilo de JS debe seguir siendo una función normal de JS.
- **Componentes memoizados:** cada manejador que se pase a un componente con `React.memo` se crea con `useCallback`, con las mismas dependencias de estado que tenía su cierre original (`comparandoId`, `avisoBorradoId`, etc.), para que no lea estado viejo.
1. Mover las constantes y utilidades puras a `onboarding/constantes.js` y `onboarding/utilidadesFecha.js`. Volver a exportarlas desde el orquestador.
2. Mover `BotonInteractivo`, `useFadeSlideStyle` y `useSegmentProgressStyle` a `onboarding/BotonInteractivo.jsx` y `onboarding/useEstilosAnimados.js`.
3. Extraer `useAnimacionesOnboarding`:
   - Se lleva los `useSharedValue` y `dispararCascadaBloques` (línea ~392), `transicionarAEscena` (línea ~502) y el pulso del timeline.
   - Devuelve los valores animados y los estilos animados. Los componentes los reciben por props.
4. Extraer `useOnboardingFormulario`:
   - Se lleva el estado (líneas ~228-250), los valores derivados (líneas ~528-670), los `ajustar*` y `seleccionar*` (líneas ~672-800), `validarPasoActual`, `handleAvanzarPaso`, `handleRetrocederPaso` y `handleFinalizarCelebracion` (líneas ~800-1020).
   - Recibe `transicionarAEscena` y los disparadores de animación como parámetros.
5. Extraer cada escena a su componente, con sus estilos:
   - `renderEscenaHero` (línea ~1024) → `EscenaHero`.
   - `renderCabeceraWizard` (línea ~1101) → `CabeceraWizard`.
   - Los cuatro `renderPaso*` (bloques de las líneas ~1159-1785) → `PasoIdentidad`, `PasoAntropometria`, `PasoAntiguedad` y `PasoObjetivo`.
   - `renderEscenaCelebracion` (línea ~1786) → `EscenaCelebracion`.
   - Los estilos se reparten **copiándolos sin cambios** desde `styles` (línea 2046). Los que comparten varias escenas van a `onboarding/estilosCompartidos.js`.
6. El orquestador queda con el `Modal`, el cambio entre escenas (líneas ~1984-2040) y la botonera inferior.

## 3. Cambio Físico (RF-3), en commits pequeños
1. Mover las constantes, `obtenerEstadoHoraInicial` y `formatearHora12h` (líneas 49-84).
2. Mover `CapsulaBorradoSeguroFisico` (líneas 85-134).
3. Extraer `TarjetaCambioFisico` desde `renderizarTarjetaCambio` (líneas ~630-846). Es un componente `React.memo` con props explícitas (`item`, `index`, `registroAnterior`, `comparandoId`, `avisoBorradoId` y los manejadores memoizados). `renderItem` queda como una función estable con `useCallback`.
4. Extraer `CabeceraCambioFisico` (el `ListHeaderComponent`, líneas ~860-1160) y `ModalRegistroFisico` (líneas ~1163-1350).
5. Extraer `useCambioFisico` con el estado (líneas 145-175), los valores derivados (líneas 176-260) y las acciones (líneas 262-630).

## 4. Verificación
- Pruebas de los hooks (CA-4) en `__tests__/useOnboardingFormulario.test.js` y `__tests__/useCambioFisico.test.js`, con `await renderHook(...)`.
  - `transicionarAEscena` y los disparadores de animación se reemplazan por `jest.fn()`.
  - El objeto esperado de `guardarPerfilUsuario` es **el snapshot capturado en el commit 1**, no uno escrito a mano.
  - Casos mínimos de validación por paso:
    - Paso 1: nombre vacío, solo espacios o válido.
    - Paso 2: estatura y peso en el límite inferior, en el superior y normales.
    - Paso 3: fecha de inicio futura, hoy o pasada.
    - Paso 4: objetivo elegido o no.
  - Edad e IMC: tres entradas fijas, con salidas esperadas calculadas a mano en el test.
  - `useCambioFisico`: borrado y comparación con `Math.random` y el reloj fijos, comprobando los argumentos que recibe `storage.js`.
- **Capturas «después»** con el mismo procedimiento del paso 0. Se comparan píxel a píxel con un script temporal en Node (`pngjs` + `pixelmatch` instalados en la carpeta temporal, fuera del repo). El umbral es ≤ 0,1 % de píxeles distintos por captura. Si la herramienta no se puede instalar, la comparación se declara manual en `tasks.md`.
- `npm run gate` (CA-6). Contar líneas con `wc -l` (CA-2) y revisar imports con `git grep` (CA-3).
- Lista corta para que el usuario lo pruebe en su Android: recorrer el onboarding desde Configuración → editar perfil, registrar un peso en Cambio Físico, comparar dos registros y borrar uno con pulsación sostenida.
