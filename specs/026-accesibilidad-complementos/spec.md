# Spec 026: Complementos de Accesibilidad (campos, estados web, fechas, modales y tamaño mínimo)

> **Estado: PLAN.** Lo redactó Claude Code el 2026-11-27. Se construye **encima** de la rama `claude/app-analysis-improvements-52feef` (PR #11, Specs 020–025), porque reutiliza su prueba estática (`accesibilidadEstatica.test.js`), sus envoltorios `base/Texto` y su utilidad `utils/accesibilidad.js`.

## 1. Visión y Justificación del Problema
El 27/11/2026 se probó la rama del PR #11 en su preview de Vercel (web, 375x812) y en un emulador Android con Expo Go. La Spec 023 dejó nombre y rol en todos los táctiles, contraste AA, anuncios por voz y letra del sistema con tope. Quedan cinco huecos que una persona con lector de pantalla o con vista cansada sigue notando. Se detectaron en esa prueba y en una implementación paralela anterior (rama `claude/app-status-c09be7`, que no se fusionará):

1. **Campos de texto sin etiqueta.** La prueba estática de la 023 solo revisa táctiles. En Live Mode, los campos de peso y repeticiones se anuncian como "0" en web y como "cuadro de edición" sin nombre en Android (`EditText` sin `content-desc`). Hay 19 campos repartidos en 8 archivos.
2. **Estados que web no anuncia.** react-native-web 0.21.4 ignora `accessibilityState`: no genera `aria-selected`, `aria-checked`, `aria-disabled` ni `aria-busy`. Quedan 5 usos. El más visible es la barra inferior: en web no se anuncia qué pestaña está activa.
3. **Fechas en formato máquina.** Las celdas del calendario mensual y del heatmap anual se anuncian como "2026-11-27, nivel de actividad 0 de 4", y los días del selector semanal como "21/11". El lector deletrea los números.
4. **Modales que no aíslan el fondo en web.** react-native-web monta el modal en un portal con `aria-modal`, pero el resto de la app sigue alcanzable con el teclado y algunos lectores (soporte desigual de `aria-modal`). Además, al abrir, el foco no va al título y, al cerrar, no vuelve al control que abrió el modal (WCAG 2.4.3).
5. **Texto demasiado pequeño.** El hallazgo H-3 de la Spec 023 sigue abierto: hay unos 110 estilos con `fontSize` de 7 a 10.5 en 20 archivos.

Quedan fuera de esta Spec: los valores iniciales del onboarding (fecha 2010, 182 cm/74 kg), la entrada numérica directa, el temporizador de descanso, la meta de calorías y el registro manual de comidas (irán a una Spec de UX).

## 2. Requerimientos Funcionales (RF)

- **RF-1 (Etiqueta en todo campo de texto).** Todo `TextInput` (el de `react-native` y el envoltorio de `base/Texto`) declara `accessibilityLabel` o `aria-label`, independiente de su placeholder. En Live Mode la etiqueta incluye campo, unidad y número de serie: "Peso en kilogramos, serie 2" / "Repeticiones, serie 2". En el onboarding: "Nombre o alias, opcional".
- **RF-2 (Estado con props `aria-*`).** Los 5 usos de `accessibilityState` se sustituyen por `aria-selected`, `aria-checked`, `aria-disabled` y `aria-busy`, que React Native 0.88 acepta en nativo y react-native-web traduce a ARIA. No se permite `accessibilityState` en código nuevo.
- **RF-3 (Fechas legibles).** Las fechas que se anuncian usan palabras y día de la semana: "viernes 27 de noviembre, hoy, actividad nivel 2 de 4" en las celdas del calendario mensual y del heatmap anual (las dos usan `HeatmapDayCell`), y "viernes 27 de noviembre, hoy, con actividad" en el selector semanal. Se construyen con componentes locales (`new Date(anio, mes - 1, dia)`); prohibido `toISOString()` y `new Date('YYYY-MM-DD')`.
- **RF-4 (Modales aislados en web con foco gestionado y anuncios vivos).** Mientras haya un modal visible en web, `#root` queda `inert` y `aria-hidden`. Al abrir, el foco pasa al primer encabezado (`role="heading"`) del modal, o al contenedor del diálogo si no tiene encabezado. Al cerrar un modal, el foco vuelve al control que lo abrió (también en modales anidados). Como la región de anuncios de la Spec 023 vive dentro de `#root`, el modal superior monta su propia región de anuncios para que `anunciar()` siga hablando con un modal abierto. En nativo no cambia nada, porque el `<Modal>` nativo ya aísla su ventana y `anunciar` usa la API del sistema.
- **RF-5 (Tamaño mínimo de 11 px).** Ningún estilo de texto usa `fontSize` menor a 11. Si un texto se corta al subirlo, se ajustan `letterSpacing`, ancho o número de líneas, nunca se vuelve a bajar el tamaño. Los estilos que no se aplican a texto se marcan con `// a11y-ok: sin texto`.
- **RF-6 (Sin regresiones).** No cambian datos persistidos, claves de AsyncStorage, lógica de negocio, hápticos, sonidos ni el diseño Dark Luxury OLED, salvo el tamaño de letra de RF-5.

## 3. Requerimientos No Funcionales
- La prueba estática de la 023 se amplía para vigilar RF-1, RF-2 y RF-5, con el mismo mecanismo de `PENDIENTES` y `EXCEPCIONES`.
- No se añaden dependencias.
