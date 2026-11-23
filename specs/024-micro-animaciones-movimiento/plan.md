# Plan Técnico — Spec 024: Micro-animaciones, Movimiento Reducido y Feedback Háptico

> **Estado: BORRADOR v2** (corrige la revisión del 2026-11-23). Pendiente de Q14/Q15 y `PLAN_APROBADO`. Requiere las Specs 022 (snapshots y pantallas partidas) y 023. Se implementa **solo después** de ambas.
> Skills de apoyo: `animate-expo`, `expo-animation`, `review-animations` y `animation-performance`. El rol `subagente-motion` es el responsable.

## 1. Tokens y utilidad
- `tokens.js` → `movimiento`:
  - `duracion: { micro: 150, corta: 220, escena: 320 }`.
  - `resorte: { presion, escena, rapido, elastico }`, con los valores actuales de `SPRING_*`.
  - `opacidadPresion: { primaria: 0.85, secundaria: 0.7 }`.
- `onboarding/constantes.js` (Spec 022): `SPRING_*` pasan a ser alias de `TOKENS.movimiento.resorte.*`, con los mismos valores.
- `src/utils/movimiento.js`:
  - **`usePreferenciaMovimiento()` es reactivo.** `useReducedMotion()` de Reanimated 4.7 lee la preferencia **una sola vez**, al arrancar la app, y no provoca un nuevo render. Por eso no se usa. En su lugar:
    - `useState(() => cacheModulo ?? valorInicialReanimated)`. `valorInicialReanimated` viene de `useReducedMotion()`, que **sí** sirve como valor de arranque, y cada cambio actualiza `cacheModulo`. Así, el primer render y las cascadas de montaje ya respetan la preferencia y no hay un destello de movimiento al abrir.
    - Los `useEffect` con animación incluyen `reducir` en sus dependencias. La cascada de entrada solo se lanza en el montaje: si `reducir` cambia después, solo se cancela o se aplica el valor final, sin repetir la cascada.
    - En `useEffect`, se llama a `AccessibilityInfo.isReduceMotionEnabled().then(set)` y se suscribe con `AccessibilityInfo.addEventListener('reduceMotionChanged', set)`, con `subscription.remove()` al desmontar.
    - En web, `react-native-web` 0.21 implementa ambos sobre `matchMedia('(prefers-reduced-motion: reduce)')` (verificado en `AccessibilityInfo/index.js:22-88`).
    - Así, si el usuario cambia el ajuste con la app abierta, el efecto es inmediato.
  - `animarSegun(reducir, valorFinal, crearAnimacion)`: devuelve `valorFinal` si `reducir`, y `crearAnimacion()` si no. Recibe una **función** que crea la animación, para que `withSpring` no se ejecute cuando no hace falta y los tests puedan comprobarlo. Es una función normal de JS; se marca con `'worklet'` solo si se usa dentro de `useAnimatedStyle`.
- **Interacción con `ReduceMotion` de Reanimated 4:** por defecto, `withTiming`, `withSpring` y `withRepeat` usan `ReduceMotion.System`, que con la preferencia activa salta al valor final. Como la app controla la preferencia con `animarSegun`, el fundido de sustitución de RF-1 lleva `reduceMotion: ReduceMotion.Never` de forma explícita; si no, tampoco se vería. El resto de las animaciones conservan el valor por defecto, que es coherente con `animarSegun`.

## 2. Aplicar «reducir movimiento» (RF-1)
Se recorren los 13 archivos con Reanimated, uno por commit:
- **Asignaciones:** `sv.value = withSpring(...)` pasa a `sv.value = animarSegun(reducir, final, () => withSpring(...))`.
- **Cascadas con `withDelay`:** `sv.value = reducir ? final : withDelay(d, withSpring(...))`, sin demora en el caso reducido.
- **`withRepeat`:** su único uso es `OnboardingBienvenidaModal.jsx:410`, que tras la Spec 022 estará en `useAnimacionesOnboarding`. Queda así: `if (!reducir) { sv.value = withRepeat(...); } else { sv.value = valorReposo; }`. Además, cuando `reducir` cambia a `true`, se llama a `cancelAnimation(sv)` y se aplica el valor de reposo.
- **Transiciones de escena:** si `reducir`, se aplica solo `opacity` con `withTiming(1, { duration: TOKENS.movimiento.duracion.micro, reduceMotion: ReduceMotion.Never })`, y `translateY`/`scale` pasan directo a su valor final.
- **Presión con resorte** (`BotonInteractivo` y tarjetas): si `reducir`, se omite el `scale` y la opacidad se conserva.
- `reducir` entra en los worklets de `useAnimatedStyle` por closure, como booleano.

## 3. Presión uniforme (RF-3, si Q14 = sí)
- **Inventario** con `@babel/parser`: script temporal fuera del repo, cuyo resultado va a `tasks.md`. Recoge cada `TouchableOpacity`: archivo, línea, valor de `activeOpacity` (literal, expresión o ausente) y su función en la pantalla (primario, tarjeta, icono, cierre o chip), deducida de su contenido y estilo y **revisada a mano**.
  - Hoy hay 68 literales (0.7×14, 0.75×4, 0.8×18, 0.85×22, 0.88×2, 0.9×5, 0.92×1), unos 42 sin valor (0.2 por defecto) y 2 dinámicos.
- **Regla por función** (no por número):
  - Primario y tarjeta → `TOKENS.movimiento.opacidadPresion.primaria`.
  - Icono, cierre y chip → `.secundaria`.
- **Valores dinámicos** (`HeatmapDayCell.jsx:58`, `isFuture ? 1 : 0.7`, y `typeof onAbrirEdicionPerfil === 'function' ? 0.8 : 1`): se mantiene el ternario, con el token en la rama activa y `1` («sin respuesta») en la otra.
- **Los ~42 sin valor:** reciben el token que les toca por su función. Este es el cambio más perceptible (de 0.2 a 0.7 o 0.85), así que se muestra al usuario con un video corto antes de hacer el commit.
- **Los 3 `Pressable`** con estilo de presión propio quedan fuera de RF-3.
- **Verificación (CA-3):** un test AST comprueba que todo `TouchableOpacity` tiene `activeOpacity`, y que su valor (o cada rama de un ternario) es una referencia a `TOKENS.movimiento.opacidadPresion.*` o el literal `1`.

## 4. Hápticos de resultado (RF-4, si Q15 = sí)
- `haptics.js`: `vibrarExito`, `vibrarError` y `vibrarAviso`, con el mismo patrón que `vibrarConfirmacionBorrado` (web → `return`; `try/catch`).
- Se llaman donde la Spec 023 llama a `anunciar` (éxito) o muestra el bloque `alert` (error):
  - `ModalAnalisisComida`.
  - `useCambioFisico` (análisis y comparación).
  - `useEstudio` (resumen).
  - El aviso de límite de fotos.
- Antes se busca con `grep` cualquier háptico ya existente en esos puntos, para no duplicarlo.

## 4b. Sonidos (RF-5, aprobado en Q17)
- `npx expo install expo-audio`.
- **`scripts/generar-sonidos.js`** (Node puro, sin dependencias):
  - Escribe 5 WAV PCM de 16 bits, mono, 22 050 Hz, en `assets/sonidos/`.
  - Cada sonido es una suma de senoides con envolvente ataque/decaimiento exponencial (ataque de 4 ms) y un pico a −12 dBFS.
  - Frecuencias:
    - `toque`: 1800 Hz, 40 ms.
    - `exito`: 880 Hz y luego 1320 Hz, 2×70 ms.
    - `serie`: 1046 Hz, 60 ms.
    - `error`: 440 Hz y luego 330 Hz, 2×70 ms.
    - `borrado`: 180 Hz con caída, 90 ms.
  - Es determinista: genera los mismos bytes en cada ejecución. Los archivos se commitean.
- **`src/services/sonidos.js`:**
  - Usa `createAudioPlayer(require('../../assets/sonidos/<n>.wav'))` de `expo-audio`, con un reproductor por sonido creado de forma perezosa y reutilizado.
  - Al arrancar llama a `setAudioModeAsync({ playsInSilentMode: false, interruptionMode: 'mixWithOthers' })` dentro de `try/catch`.
  - `reproducirSonido(nombre)`: si las preferencias dicen `sonidos: false`, no hace nada. Si no, `player.seekTo(0)`, `player.volume = 0.35` y `player.play()`, todo dentro de `try/catch`.
  - `establecerSonidosActivos(bool)` y `cargarPreferenciaSonidos()` sobre `@fitness_tracker_preferencias_v1` (`{ sonidos: true }` por defecto), con una caché en memoria para no leer AsyncStorage en cada toque.
- **Interruptor en `PanelConfiguracionLateral.jsx`:** una fila «Sonidos de la interfaz» con `Switch`, `accessibilityRole="switch"` y `aria-checked`, con el estilo de las filas existentes. Se localiza con `grep`, porque el archivo tiene más de 500 líneas.
- **Puntos de llamada:** junto a `vibrarExito`, `vibrarError`, `vibrarSerieAgregada`, `vibrarEjercicioCompletado` y `vibrarConfirmacionBorrado`. Para no duplicar llamadas, `haptics.js` **no** llama a sonidos: cada punto llama a los dos servicios de forma explícita.
- **Tests:** `__tests__/sonidos.test.js` (con `expo-audio` simulado) y la lectura de la cabecera WAV de cada archivo (CA-8).

## 5. Tests
- **`__tests__/movimiento.test.js`:**
  - `animarSegun` no llama a `crearAnimacion` cuando `reducir` es `true`, y sí la llama cuando es `false`.
  - `usePreferenciaMovimiento` con `AccessibilityInfo.isReduceMotionEnabled` y `addEventListener` simulados: el valor inicial y un cambio emitido actualizan `reducir`, y desmontar elimina la suscripción.
- **CA-1:** se reutiliza el setup de la Spec 022 y se simula `usePreferenciaMovimiento` con `reducir = true`. Se espía `withRepeat` (con `jest.spyOn` sobre el simulado de Reanimated) y se comprueba que no se llama. Bajo el simulado, `withTiming`/`withSpring` ya devuelven el valor final, así que los estilos no se pueden usar como prueba. La afirmación que cuenta es «`withRepeat` no se llamó».
- **CA-2 (AST):** `@babel/parser` se declara en `devDependencies` con la misma versión que ya está instalada (`npm ls @babel/parser`).
  - Se recorre todo `src/**/*.{js,jsx}`. Cada llamada a `withRepeat` debe estar en la rama **consecuente** de un `if`/ternario cuya condición sea `!reducir`, o en la rama **alternativa** de uno cuya condición sea `reducir`.
  - No se acepta la variante «una función que recibe `reducir`»: el spec se alinea con esta regla.
- **CA-4:** `expo-haptics` simulado, con un test por flujo y un test de web.

## 6. Verificación
- `npm run gate`.
- Los snapshots de la Spec 022 siguen idénticos con `reducir = false` (CA-5). `activeOpacity` es una prop de `TouchableOpacity` y probablemente no aparece en `toJSON()`. Si aparece, solo se actualiza ese valor, de forma documentada.
- **En web**, con el navegador integrado, se emula `prefers-reduced-motion: reduce` y se comprueba que el cambio se aplica **sin recargar**, gracias al listener de §1. Después se recorren el onboarding y Cambio Físico.
- **Lista para el usuario (CA-6):** Android → Ajustes → Accesibilidad → «Quitar animaciones», con la app abierta. El efecto debe ser inmediato. Se recorren el onboarding y Cambio Físico.
