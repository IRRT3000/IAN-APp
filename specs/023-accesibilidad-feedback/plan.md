# Plan Técnico — Spec 023: Accesibilidad y Feedback al Usuario

> **Estado: BORRADOR v2** (corrige la revisión del 2026-11-23). Pendiente de Q11/Q13 y de `PLAN_APROBADO`. Requiere las Specs 020 (gate fiable) y 022 (pantallas partidas).
> Skills de apoyo: `better-accessibility` (WCAG 2.2), `design:accessibility-review` y, para los textos de las etiquetas, `better-writing`.

## 0. Convención de props (vale para nativo y web)
- **Nombre y rol:** `accessibilityLabel` y `accessibilityRole`, como en el código actual. RN 0.88 y react-native-web 0.21 los aceptan.
- **Estados:** las props ARIA `aria-selected`, `aria-checked`, `aria-disabled` y `aria-busy`. RN 0.88 las acepta en nativo, y RNW 0.21 solo las traduce al DOM en esta forma: `accessibilityState` no llega al DOM en `Pressable` ni en `TouchableOpacity`.
- **Instrucción:** `accessibilityHint`.
- **Acciones personalizadas:** `accessibilityActions` + `onAccessibilityAction` funcionan **solo en nativo**. Cada acción tiene una alternativa visible en web (§3).

## 1. Test estático con AST (CA-1, CA-2)
- `__tests__/accesibilidadEstatica.test.js` usa `@babel/parser`, que ya está instalado por Expo y Jest (`plugins: ['jsx']`). Recorre los `JSXOpeningElement` de `App.js` y `src/**/*.jsx`. Los `.js` de `src/` no tienen JSX: las coincidencias de `<[A-Z]` en `storage.js` y `estudioStorage.js` son tipos dentro de JSDoc.
- **Componentes táctiles:**
  - Los que se importan con nombre (con o sin alias `as`) de `react-native` (`TouchableOpacity`, `Pressable`, `TouchableHighlight`, `TouchableWithoutFeedback`).
  - Los de `react-native-gesture-handler`: hoy `TouchableOpacity` en `PanelConfiguracionLateral.jsx:22`.
  - Los componentes propios de la lista `ENVOLTORIOS_TACTILES = ['BotonInteractivo', …]`, que se completa con `grep` en T4.
  - Los creados con `Animated.createAnimatedComponent(Pressable|TouchableOpacity)`.
- **Regla:** el elemento tiene un atributo `accessibilityLabel` o `aria-label` (texto o expresión) y un `accessibilityRole` o `role`.
  - Si tiene `{...props}`, el componente debe estar en `ENVOLTORIOS_TACTILES` y se comprueban sus usos.
  - Un envoltorio propio debe reenviar esas props: se comprueba que su definición las desestructura o las esparce sobre el táctil interno.
- **Selectores (CA-2):** son los táctiles cuyo `accessibilityRole` es `radio`, `tab` o `checkbox`, o que reciben una prop `seleccionado`, `activo` o `selected`. Deben llevar `aria-selected` o `aria-checked`.
- **Lista de pendientes por archivo:**
  - `PENDIENTES = { 'src/components/CambioFisicoView.jsx': n, … }` con el número de infracciones permitidas.
  - El test falla si un archivo tiene **más** infracciones de las listadas, y también si tiene **menos** (así obliga a actualizar la lista).
  - Al final, `PENDIENTES` debe quedar vacío.
  - Las excepciones justificadas (por ejemplo, el fondo que cierra un modal y que ya tiene un botón «Cerrar» accesible) van en `EXCEPCIONES` con su motivo.

## 2. Utilidades y región de anuncios
- `src/utils/accesibilidad.js`:
  - `anunciar(mensaje)`:
    - En `Platform.OS === 'web'` publica el mensaje en un almacén mínimo (suscriptores en memoria), porque `announceForAccessibility` es una función vacía en RNW 0.21.
    - En iOS usa `AccessibilityInfo.announceForAccessibilityWithOptions(mensaje, { queue: true })` si existe; si no, `announceForAccessibility`.
    - En Android usa `announceForAccessibility`.
    - Todo dentro de `try/catch`.
  - `etiquetaFecha(fechaYYYYMMDD)` reutiliza `formatearFechaLegible`.
- `src/components/base/RegionAnuncios.jsx`:
  - Solo se renderiza en web, montado una vez en `App.js`.
  - Es un `View` visualmente oculto (1×1, fuera de pantalla, sin `display: none`) con `role="status"` y `aria-live="polite"`.
  - Muestra el último mensaje, lo limpia a los 5 s y antes de un mensaje repetido, para que se vuelva a anunciar.
- **Regla anti-duplicado:** cada mensaje se anuncia por **un solo** camino. Los bloques de error visibles llevan `accessibilityRole="alert"` (que el lector anuncia solo) y **no** se pasa ese mismo error a `anunciar`. Los éxitos, que no tienen bloque visible persistente, sí se anuncian.

## 3. Etiquetas por pantalla (RF-1, RF-2, RF-6)
- **Orden:** de mayor a menor deuda, con un commit por pantalla:
  1. Cambio Físico, con sus subcomponentes de la Spec 022.
  2. Nutrición y `ModalAnalisisComida`.
  3. `GestionMateriasModal`.
  4. `CatalogoEjerciciosModal`.
  5. `SesionEstudioModal`.
  6. `PanelConfiguracionLateral`.
  7. `MenuBienvenida`.
  8. `DaySummaryModal`.
  9. `LiveModeModal`.
  10. `CalculadoraPesoModal`.
  11. `EntrenamientosView`.
  12. Onboarding.
- `BotonInteractivo` (onboarding) y cualquier otro envoltorio reenvían `accessibilityLabel`, `accessibilityRole`, `accessibilityHint` y las `aria-*`.
- **Báscula y selectores de fecha:**
  - En nativo, el valor visible lleva `accessibilityRole="adjustable"`, `accessibilityValue={{ text: '75.5 kilogramos' }}` y `onAccessibilityAction` con `increment`/`decrement`, que llaman a los mismos `ajustar*(±paso)`.
  - En web siguen sirviendo los botones ±, cada uno con su etiqueta («Aumentar peso 0.5 kilogramos»).
- **Borrado con pulsación sostenida:**
  - En nativo, una acción **personalizada** `{ name: 'borrar', label: 'Borrar registro' }`, que aparece en el menú de acciones de TalkBack/VoiceOver y abre la confirmación existente. No se sobrescribe `activate`, para no romper el doble toque.
  - En web (`Platform.OS === 'web'`), el elemento enfocable responde a `onKeyDown` con Supr o Retroceso y abre la misma confirmación. La instrucción lo indica: «Mantén pulsado un segundo o pulsa Supr para borrar».
- **Objetivos táctiles (RF-6):** revisión manual con una lista de los botones que solo muestran icono, comprobando `hitSlop` + tamaño ≥ 44. Se deja constancia en `tasks.md`. No forma parte de un CA automático.

## 4. Anuncios (RF-3)
`anunciar` se llama cuando terminan estas operaciones con éxito:
- El análisis de comida, en `ModalAnalisisComida`.
- El análisis y la comparación de cambio físico, en `useCambioFisico`.
- El resumen de estudio, en `useEstudio`.
- Los guardados de entrenamiento (`EntrenamientosView`), comida y sesión de estudio (`SesionEstudioModal`).
- Los borrados.

Los errores se muestran en su bloque visible con `accessibilityRole="alert"` (§2, regla anti-duplicado).

## 5. Letra del sistema (RF-4, si Q11 = sí)
React 19 ignora `defaultProps` en componentes función, y `Text`/`TextInput` de RN 0.88 lo son. Por eso no se usa `Text.defaultProps`. Se hace así:
- `src/components/base/Texto.jsx` y `CampoTexto.jsx` envuelven `Text` y `TextInput` de RN con `maxFontSizeMultiplier={props.maxFontSizeMultiplier ?? TOKENS.tipografia.maxEscala}` y reenvían el `ref`.
- **Codemod** con un script temporal en Node sobre el AST, fuera del repo: en cada archivo de `src/` y `App.js`, quita `Text`/`TextInput` del import de `react-native`, agrega el import de `Texto`/`CampoTexto` y renombra las etiquetas JSX. El cambio va en un commit aparte, y se revisa con `git diff --stat`.
- Un test estático (en el mismo archivo de §1) prohíbe importar `Text` o `TextInput` de `react-native` fuera de `src/components/base/`.
- Tope local de `maxEscalaCompacta` (1.2) en las etiquetas de los botones primarios y en las cifras grandes.
- `tokens.js`: `tipografia: { maxEscala: 1.4, maxEscalaCompacta: 1.2 }`.
- **Si Q11 = no**, no se hace nada de esta sección.

## 6. Contraste (RF-5, si Q13 = sí)
- `tokens.js`: `textMuted: '#898989'`.
- `grep` de `#666666` y `#666'` sueltos. Cada uno se clasifica en `tasks.md` como **texto** (pasa a `TOKENS.colors.textMuted`) o **borde/fondo** (se deja igual).
- `__tests__/contrasteTokens.test.js` (CA-5) usa la fórmula de luminancia de WCAG y prueba estos pares:
  - `textPrimary`, `textSecondary` y `textMuted` contra `canvas`, `surface`, `surfaceElevated` y `surfaceInteractive`.
  - `danger` contra `dangerBg`.
  - `text` contra `bg` en cada nivel del heatmap (`level0`–`level4`).

  Todos deben dar ≥ 4.5. Los niveles del heatmap que no lleguen se documentan. Esos textos son números grandes, para los que basta 3:1; si se acepta así, el test usa el umbral de 3 para ellos con un comentario que lo explica.
- Capturas antes y después de 3 pantallas, que se muestran al usuario antes de hacer el commit.

## 7. Verificación
- CA-1 a CA-5 en Jest y `npm run gate`.
- En web con el navegador integrado, `read_page` en cada pestaña comprueba que los botones exponen nombre, rol y `aria-selected`, y que la región `role="status"` recibe el anuncio de un guardado.
- CA-4 (Q11): revisión en Inicio, Entrenamientos, Nutrición, Cambio Físico, Estudio y Configuración, con el zoom de texto del navegador al 140 % y capturas adjuntas en `tasks.md`. Ningún botón primario trunca su etiqueta y ningún texto se encima.
- CA-6 (TalkBack) es manual del usuario. **No es automatizable** y no bloquea `CODIGO_APROBADO`.
