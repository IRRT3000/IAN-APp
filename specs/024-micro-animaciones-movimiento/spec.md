# Spec 024: Micro-animaciones, Movimiento Reducido y Feedback Háptico

> **Estado: BORRADOR.** Lo redactó Claude Code el 2026-11-23. Se implementa al final, **después** de la Spec 023, porque toca las mismas pantallas. No agrega pantallas ni funciones: solo hace más coherente y respetuoso el movimiento que ya existe.

## 1. Visión y Justificación del Problema
La app ya tiene una base de movimiento sólida:
- Todas las animaciones usan Reanimated (13 archivos) y ninguna usa `Animated` de React Native.
- Hay 15 configuraciones de resorte.
- Todos los hápticos pasan por `src/services/haptics.js`, que ya ignora la web.

La auditoría del 2026-11-23 encontró tres huecos.

### Hallazgos
- **H-1 (Media) — No se respeta «reducir movimiento».** Ningún archivo consulta la preferencia del sistema (`useReducedMotion` / `ReduceMotion` de Reanimated). Las personas con sensibilidad vestibular, que activan esa opción en Android o iOS, ven igualmente:
  - las cascadas de entrada del onboarding,
  - las transiciones entre escenas,
  - un pulso que se repite **sin fin** (`withRepeat` en `OnboardingBienvenidaModal.jsx:410`, anillo del hero).

  WCAG 2.2 (2.3.3) recomienda poder desactivar el movimiento no esencial.
- **H-2 (Baja) — La respuesta al tocar no es uniforme.** Los `TouchableOpacity` usan siete valores distintos de `activeOpacity`: 0.7, 0.75, 0.8, 0.85, 0.88, 0.9 y 0.92. Botones de la misma jerarquía responden distinto al tacto.
- **H-3 (Baja) — Faltan hápticos de resultado.** `haptics.js` tiene vibraciones para el borrado, la comparación, la báscula, las series y los ejercicios, pero no para el **resultado** de una operación asíncrona. Al terminar un análisis de IA (que puede tardar hasta 90 s con la Spec 021) o al fallar, el usuario no siente nada si no está mirando la pantalla.

### Lo que se verificó y está bien
- Las duraciones de `withTiming` están entre 90 y 240 ms en las micro-interacciones. Hay dos de 750 ms y dos de 1600 ms, que son animaciones de escena o de anillo.
- Los hápticos ya se desactivan en web.
- No hay animaciones en el hilo de JS.

## 2. Requerimientos Funcionales (RF)
- **RF-1 (Movimiento reducido):** Hay un hook `usePreferenciaMovimiento()` en `src/utils/movimiento.js` que devuelve `{ reducir }`.
  - Lo calcula con `AccessibilityInfo.isReduceMotionEnabled()` y se suscribe a `reduceMotionChanged`, así que reacciona si el usuario cambia el ajuste con la app abierta.
  - No se usa `useReducedMotion()` de Reanimated, porque solo lee la preferencia al arrancar la app.

  Cuando `reducir` es `true`:
  - Las entradas en cascada y las transiciones de escena se sustituyen por un fundido de opacidad de 150 ms como máximo, o aparecen directamente.
  - Los resortes y los desplazamientos (`translate`, `scale`) se omiten y el valor final se aplica al instante.
  - Las animaciones infinitas (`withRepeat` con −1) **no se inician**.
  - La retroalimentación de pulsación conserva solo el cambio de opacidad.
  - Los hápticos **no** cambian, porque no son movimiento visual.
- **RF-2 (Tokens de movimiento):** `src/theme/tokens.js` agrega `movimiento`:
  - `duracion: { micro: 150, corta: 220, escena: 320 }`
  - `resorte: { presion, escena, elastico }`, reusando los `SPRING_*` del onboarding.
  - `opacidadPresion: { primaria: 0.85, secundaria: 0.7 }`

  Las animaciones existentes pasan a leer estos tokens **con los mismos valores numéricos que tienen hoy**, así que no hay cambio visible. La única excepción es RF-3.
- **RF-3 (Presión uniforme):** Todos los `TouchableOpacity` usan `TOKENS.movimiento.opacidadPresion.primaria` (botones primarios, tarjetas y acciones principales) o `.secundaria` (iconos, cierres, chips). Es el único cambio perceptible de esta Spec: se unifican los siete valores en dos. Antes de aplicarlo se muestran capturas o un video corto al usuario.
- **RF-4 (Hápticos de resultado):** `haptics.js` agrega `vibrarExito` (`notificationAsync(Success)`), `vibrarError` (`notificationAsync(Error)`) y `vibrarAviso` (`notificationAsync(Warning)`). Las tres siguen el patrón actual: ignoran la web y van dentro de `try/catch`. Se llaman en estos casos:
  - `vibrarExito`: termina con éxito un análisis de comida, cambio físico, comparación o resumen de estudio.
  - `vibrarError`: falla definitivamente uno de esos análisis.
  - `vibrarAviso`: la app muestra un aviso de límite, por ejemplo el de fotos (`avisoLimiteFotos`).

  Si ya existe un háptico en ese mismo punto (por ejemplo, en el guardado atómico de la Spec 018), no se duplica.

- **RF-5 (Sonidos sutiles, aprobado por el usuario el 2026-11-23, Q17):** La app reproduce sonidos muy cortos y suaves en momentos clave, para que «se sienta muy responsiva con feedback visual, táctil y auditivo, sin molestar».
  - **Catálogo** (5 sonidos, todos de 150 ms o menos):
    - `toque`: un clic suave al confirmar una selección importante.
    - `exito`: dos notas ascendentes al guardar o terminar un análisis.
    - `serie`: una nota breve al agregar una serie.
    - `error`: una nota descendente grave.
    - `borrado`: un golpe sordo al confirmar un borrado.
  - **Origen:** generados por síntesis con un script del repo (`scripts/generar-sonidos.js`, ondas senoidales con envolvente). No hay archivos de terceros ni licencias. Son WAV mono de 22 050 Hz y menos de 10 KB cada uno, en `assets/sonidos/`.
  - **Volumen y modo silencio:** volumen de reproducción de 0.35. En iOS respetan el interruptor de silencio (`playsInSilentMode: false`). No interrumpen la música del usuario: se mezclan con ella.
  - **Interruptor:** «Sonidos de la interfaz» en el panel de Configuración, **activado por defecto** y guardado en AsyncStorage (`@fitness_tracker_preferencias_v1`).
  - **Servicio único:** `src/services/sonidos.js`, con el mismo patrón que `haptics.js`. Se llama `reproducirSonido(nombre)`, nunca lanza errores, precarga los sonidos al iniciar y no reproduce nada si el interruptor está apagado.
  - **Dónde suenan:** en los mismos puntos que los hápticos de resultado (RF-4) y los ya existentes de serie agregada, ejercicio completado y borrado confirmado. **Nunca** al navegar, al hacer scroll ni en cada toque.

## 3. Criterios de Aceptación (CA)
- **CA-1:** Tests de componente, con la red de la Spec 022 y `usePreferenciaMovimiento` simulado:
  - Con `reducir = true`, `withRepeat` no se llama nunca en el onboarding.
  - `animarSegun` no crea la animación cuando `reducir` es `true`.
  - Un cambio emitido por `reduceMotionChanged` actualiza `reducir`.
  - Con `reducir = false`, los snapshots de la Spec 022 no cambian.
- **CA-2:** Un test estático con `@babel/parser` comprueba que cada `withRepeat` de `src/**` está en la rama que solo se ejecuta cuando `reducir` es falso: la consecuente de `!reducir` o la alternativa de `reducir`.
- **CA-3:** Un test estático con AST comprueba que todo `TouchableOpacity` tiene `activeOpacity`, y que su valor (o cada rama de un ternario) es `TOKENS.movimiento.opacidadPresion.*` o el literal `1`. Los 3 `Pressable` con estilo propio quedan fuera.
- **CA-4:** Hay dos tipos de tests sobre los hápticos de resultado:
  - Con `expo-haptics` simulado, un análisis exitoso llama a `vibrarExito` una vez y uno fallido llama a `vibrarError` una vez, en los cuatro flujos.
  - En `Platform.OS === 'web'`, ninguno llama a `expo-haptics`.
- **CA-5:** Los snapshots de caracterización de la Spec 022 siguen iguales con `reducir = false`. El único cambio permitido es `activeOpacity`, y si aparece en el snapshot, se actualiza **solo ese** valor, de forma documentada.
- **CA-6 (manual):** El usuario activa «Quitar animaciones» en su Android **con la app abierta** y recorre el onboarding y Cambio Físico. El cambio se aplica sin reiniciar la app, no hay animaciones de desplazamiento ni pulsos, y la app sigue respondiendo con fundidos breves.
- **CA-7:** `npm run gate` en verde.
- **CA-8 (sonidos):** Hay tres comprobaciones:
  - Tests con `expo-audio` simulado:
    - Con el interruptor apagado no se reproduce nada.
    - Con el interruptor encendido se reproduce el sonido correcto en cada flujo de RF-5.
    - Un fallo de audio no lanza.
  - Un test comprueba que cada archivo de `assets/sonidos/` dura ≤ 150 ms y pesa < 10 KB, leyendo la cabecera WAV.
  - En web, con el navegador integrado, el guardado de una comida dispara el sonido de éxito sin errores de CSP. `media-src` cae en `default-src 'self'`.

## 4. Fuera de Alcance
- Animaciones nuevas, transiciones de navegación nuevas o pantallas de carga con esqueleto. Se pueden proponer más adelante como funciones nuevas, si el usuario lo pide.
- Cambiar duraciones o resortes existentes, salvo la presión uniforme de RF-3.

## 5. Decisiones Pendientes
- **Q14 (nueva):** ¿Se unifica la opacidad de pulsación en dos valores (0.85 y 0.7)? Es un cambio muy sutil al tacto.
- **Q15 (nueva):** ¿Se agregan las vibraciones de éxito y error al terminar los análisis con IA?
