# Spec 023: Accesibilidad y Feedback al Usuario

> **Estado: BORRADOR.** Lo redactó Claude Code el 2026-11-23. Depende de las decisiones **Q11** (respetar el tamaño de letra del sistema) y **Q13** (aclarar el gris `textMuted`). Se implementa **después** de la Spec 022, porque toca las mismas pantallas ya partidas.

## 1. Visión y Justificación del Problema
El usuario pidió mejorar la accesibilidad y el feedback de la app sin perder su esencia: la estética Dark Luxury OLED y las acciones al alcance del pulgar. La auditoría del 2026-11-23 encontró que:
- Una persona que usa lector de pantalla (TalkBack o VoiceOver) no puede usar varias pantallas.
- Parte del texto secundario no se lee bien con luz fuerte o con vista cansada.
- Cuando termina un proceso asíncrono, como el análisis con IA, no se avisa por voz.

### Hallazgos
- **H-1 (Alta) — Botones sin nombre accesible.** Por archivo, hay estos botones táctiles con `accessibilityLabel` del total:

  | Archivo | Con etiqueta / total |
  |---|---|
  | `CambioFisicoView` | 0/18 |
  | `NutricionView` | 0/5 |
  | `ModalAnalisisComida` | 0/5 |
  | `GestionMateriasModal` | 3/12 |
  | `CatalogoEjerciciosModal` | 3/11 |
  | `SesionEstudioModal` | 2/10 |
  | `PanelConfiguracionLateral` | 4/9 |
  | `MenuBienvenida` | 2/7 |
  | `DaySummaryModal` | 1/7 |
  | `LiveModeModal` | 3/6 |
  | `CalculadoraPesoModal` | 1/6 |
  | `EntrenamientosView` | 3/5 |

  Muchos son botones que solo muestran un icono de `Feather`: el lector anuncia «botón» sin decir qué hace.
- **H-2 (Media) — Texto secundario con poco contraste.** `TOKENS.colors.textMuted` (`#666666`) tiene un contraste de 3.45 sobre `#0A0A0A`, 3.21 sobre `#141414`, 2.96 sobre `#1C1C1E` y 2.77 sobre `#222222`. WCAG 2.2 AA pide 4.5 para texto normal. El token se usa en 93 lugares. `textSecondary` (`#8E8E93`) sí cumple: entre 4.88 y 6.07.
- **H-3 (Media) — Texto muy pequeño.** Hay 158 estilos con `fontSize` de 9, 10 u 11, sobre todo en `CambioFisicoView` (30), `OnboardingBienvenidaModal` (25), `NutricionView` (13) y `PanelConfiguracionLateral` (11). Combinados con H-2, son difíciles de leer.
- **H-4 (Media) — Tamaño de letra del sistema sin control.** No hay `allowFontScaling` ni `maxFontSizeMultiplier` en ninguna parte. React Native escala el texto sin límite cuando el usuario elige letra grande en su teléfono, así que hay riesgo de que el texto se corte o se encime en las tarjetas y en los botones de 54 dp.
- **H-5 (Media) — Los resultados asíncronos no se anuncian.** Solo hay 2 usos de `accessibilityLiveRegion`/`accessibilityState` y ninguno de `AccessibilityInfo`. Al terminar un análisis de IA, un guardado o un error, el lector de pantalla no dice nada.
- **H-6 (Baja) — Estados sin exponer.** Los selectores (sexo, objetivo, momento del día, materia, día de la semana) no dicen si están seleccionados (`accessibilityState={{ selected }}`), y los botones deshabilitados no informan `disabled`.

## 2. Requerimientos Funcionales (RF)
- **RF-1 (Nombre, rol e instrucción):** Cada elemento táctil (`TouchableOpacity`, `Pressable`, `TouchableHighlight`, `TouchableWithoutFeedback`, el `TouchableOpacity` de RNGH y el componente propio `BotonInteractivo`) cumple tres cosas:
  - Tiene `accessibilityRole`: `button`, `tab`, `radio`, `checkbox`, `link` o `adjustable`.
  - Tiene un `accessibilityLabel` en español que dice qué hace, no qué icono muestra. Por ejemplo, «Borrar registro del 23 de noviembre», no «trash».
  - Si la acción no es obvia, como la pulsación sostenida para borrar, tiene `accessibilityHint` («Mantén pulsado un segundo para borrar»).

  Los botones que aumentan o reducen un valor (báscula, estatura, fecha) se agrupan con `accessibilityRole="adjustable"` y `accessibilityActions` de incremento y decremento cuando el valor se muestra en un solo control.
- **RF-2 (Estados):** Los selectores exponen `aria-selected` (o `aria-checked` en las casillas), los botones deshabilitados `aria-disabled` y los que están procesando `aria-busy`. Se usan las props ARIA porque son las únicas que react-native-web 0.21 lleva al DOM, y RN 0.88 también las acepta en nativo.
- **RF-3 (Anuncios):** Nueva función `anunciar(mensaje)` en `src/utils/accesibilidad.js`.
  - En Android y iOS usa la API de anuncios del sistema.
  - En web, donde esa API no hace nada, escribe en una región `role="status"` / `aria-live="polite"` propia (`RegionAnuncios`, montada en `App.js`).
  - Se anuncia el **éxito** de los análisis, guardados y borrados.
  - Los **errores** se muestran en su bloque visible con `accessibilityRole="alert"`, que el lector anuncia solo. No se pasan también a `anunciar`, para que no se oigan dos veces.
- **RF-4 (Tamaño de letra, condicional Q11):** Se define `TOKENS.tipografia.maxEscala = 1.4`.
  - React 19 ignora `defaultProps` en `Text`/`TextInput` de RN 0.88. Por eso se crean los envoltorios `Texto` y `CampoTexto` (`src/components/base/`), que aplican `maxFontSizeMultiplier` por defecto.
  - Un codemod reemplaza los usos de `Text`/`TextInput` en toda la app, y un test impide volver a importarlos directamente.
  - En los textos de botones y en las cifras grandes se aplica un tope local de 1.2.
  - El diseño a escala normal no cambia.
- **RF-5 (Contraste, condicional Q13):** `textMuted` pasa de `#666666` a `#898989`, que da 4.55 sobre `#222222` y 5.66 sobre `#0A0A0A`. Es el gris más oscuro que cumple AA sobre todas las superficies de la app. Las capturas antes y después se muestran al usuario **antes** de hacer el commit.
- **RF-6 (Objetivos táctiles):** Todo elemento táctil mide al menos 44×44 pt, sumando su `hitSlop`. Ya es una regla de `MEMORY.md`; aquí se comprueba.

## 3. Criterios de Aceptación (CA)
- **CA-1:** Un test de Jest (`__tests__/accesibilidadEstatica.test.js`) analiza con `@babel/parser` los archivos `App.js` y `src/**/*.jsx`. Recorre cada `JSXOpeningElement` de los componentes táctiles de RF-1, incluidos los alias de import, los de RNGH, los envoltorios propios y los animados.
  - Falla si alguno no tiene `accessibilityLabel` o `aria-label`, y `accessibilityRole` o `role`.
  - Al terminar, la lista `PENDIENTES` está vacía. Las `EXCEPCIONES` llevan su motivo.
- **CA-2:** Ese mismo test falla si un selector (rol `radio`/`tab`/`checkbox`, o prop `seleccionado`/`activo`/`selected`) no pasa `aria-selected` o `aria-checked`.
- **CA-3:** Tres tipos de prueba:
  - Tests de `anunciar` en los tres entornos simulados (`ios`, `android`, `web`).
  - En `useCambioFisico`, `useEstudio` y `ModalAnalisisComida`, un análisis exitoso llama a `anunciar` exactamente **una** vez, y un análisis fallido **no** la llama: muestra el bloque `alert`.
  - Un test de `RegionAnuncios` comprueba que el texto aparece en el nodo `role="status"`.
- **CA-4 (Q11):** Con el zoom de texto del navegador al 140 %, y en el Android del usuario con «tamaño de fuente» al máximo, se revisan Inicio, Entrenamientos, Nutrición, Cambio Físico, Estudio y Configuración, con capturas adjuntas. Ningún botón primario trunca su etiqueta y ningún texto se encima.
- **CA-5 (Q13):** Un test calcula el contraste de cada par texto/fondo de `tokens.js` que usa la app y exige ≥ 4.5 en todos.
- **CA-6 (manual, no automatizable y no bloquea `CODIGO_APROBADO`):** El usuario hace una revisión con TalkBack siguiendo una lista corta, sin ver la pantalla:
  - Registrar un entrenamiento.
  - Analizar una comida.
  - Borrar un registro con la acción «Borrar registro» del menú de acciones.
  - Navegar entre pestañas.
- **CA-7:** `npm run gate` en verde.

## 4. Fuera de Alcance
- Cambiar tamaños de fuente fijos (H-3) más allá de permitir la escala del sistema. Cambiarlos alteraría el diseño, y se puede proponer después con capturas.
- Micro-animaciones y movimiento reducido (Spec 024).

## 5. Decisiones Pendientes
- **Q11:** ¿Respetar el tamaño de letra del sistema con tope de 1.4?
- **Q13 (nueva):** ¿Se aclara `textMuted` de `#666666` a `#898989` para cumplir AA? Es un cambio visible pero sutil, porque el texto secundario se ve un poco más claro.
