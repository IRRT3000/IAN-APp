# Spec 018: Análisis Nutricional Contextual y de Alta Precisión

## 1. Visión y Justificación del Problema
Actualmente en `NutricionView`, al capturar una fotografía de comida con la cámara o seleccionarla de la galería, la imagen se envía de forma inmediata a la API de Gemini Vision (`analizarComidaConGemini`) y el resultado calculado se guarda directamente en `AsyncStorage`.

Este flujo presenta dos limitaciones clave:
1. **Falta de contexto culinario y cuantitativo**: Gemini Vision debe deducir visualmente los ingredientes, porciones y grasas ocultas únicamente a partir de la imagen. En platillos densos, salsas, batidos o alimentos cocinados con aceites/mantequilla, la perspectiva visual produce discrepancias calóricas considerables.
2. **Ausencia de control humano (Human-in-the-Loop)**: Al guardarse automáticamente sin confirmación previa, el usuario no tiene oportunidad de revisar o corregir los macronutrientes estimados por la IA si detecta una sobreestimación o subestimación evidente.

Esta Spec moderniza el flujo de nutrición incorporando una **Modal de Preparación Contextual** donde el usuario puede describir en lenguaje natural lo que va a comer y sus cantidades (ej. *"200g de pechuga a la plancha, 1 taza de arroz y 1 cdta de aceite de oliva"*), una **directiva de prioridad cuantitativa en el prompt de Gemini**, y una **Modal de Revisión y Ajuste Pre-Guardado** donde los valores calculados pueden validarse y afinarse manualmente antes de persistirse.

Quedan fuera de esta Spec: el análisis de comidas solo con texto (la foto sigue siendo obligatoria), la edición posterior de comidas ya guardadas en días anteriores, y el almacenamiento en base de datos de la descripción temporal del usuario.

## 2. Requerimientos Funcionales (RF)

- **RF-1 (Intercepción post-captura y Modal de Preparación)**:
  - Al tomar una foto con la cámara o elegirla de la galería en `NutricionView`, la app **no** envía la petición inmediatamente a Gemini.
  - Se abre una modal Dark Luxury OLED con la vista previa de la foto, badge del tipo de comida seleccionado (`Desayuno`, `Comida`, `Cena`, `Snack`), botón secundario para cambiar de foto si salió borrosa, un campo de texto para descripción o porciones y el botón primario de acción *"Analizar con IA"*.
  - La descripción es **100% opcional**: si el usuario no escribe nada y presiona *"Analizar con IA"*, la IA procede con el análisis visual estándar sin bloquearlo.

- **RF-2 (Entrada en lenguaje natural inteligente)**:
  - Un solo campo multilínea flexible con placeholder orientativo (ej. *"Ej: 200g pechuga a la plancha, 1 taza de arroz blanco, 1 cdta aceite de oliva..."*).
  - Admite gramajes, piezas, medidas caseras (tazas, cucharadas), marcas comerciales o especificaciones de preparación (al vapor, frito, sin azúcar).
  - La descripción introducida se utiliza de forma efímera para construir el prompt y se descarta tras el guardado; no altera el esquema histórico de `AsyncStorage`.

- **RF-3 (Priorización en el Prompt de Gemini Vision)**:
  - Si el usuario suministró descripción o gramaje, se inyecta en `construirPromptAltaPrecision` con una directiva explícita de verdad base:
    - *"Si el usuario declara un peso o porción específica (ej. 200g, 1 taza), toma ese dato como la verdad base inmutable y no lo contradigas por la perspectiva de la foto."*
    - La foto se utiliza para identificar ingredientes secundarios no mencionados, aderezos o corroborar la consistencia general.

- **RF-4 (Progreso y Resiliencia del Borrador ante Fallos)**:
  - Mientras Gemini procesa la imagen, el botón muestra el estado de carga con spinner y el modelo intentado (`onProgreso`), bloqueando dobles toques.
  - Si ocurre un fallo (timeout de 60s, error de red, 503 en todos los modelos o API key faltante), la modal **permanece abierta** conservando la foto y el texto redactado por el usuario, mostrando el mensaje de error y permitiendo reintentar sin perder los datos.

- **RF-5 (Modal de Revisión y Ajuste Pre-Guardado)**:
  - Al completar el análisis exitosamente, la modal transiciona al estado de revisión mostrando:
    - Miniatura de la foto y nombre del plato estimado (campo editable).
    - 4 campos de entrada numérica editables: **Calorías (kcal)**, **Proteínas (g)**, **Carbohidratos (g)** y **Grasas (g)**, inicializados con los valores devueltos por Gemini.
    - Evaluación biométrica IA (`detalles`): texto informativo de solo lectura sobre cómo encaja el plato con el perfil del usuario.
    - Botón secundario *"Descartar"* (cancela sin guardar nada).
    - Botón primario en Thumb-Zone *"Guardar en mi día"* (persiste el registro definitivo).

- **RF-6 (Validación Defensiva de Entradas Editadas)**:
  - Las calorías deben ser enteros positivos o cero (`Math.max(0, Math.round(Number(calorias) || 0))`).
  - Los macronutrientes deben ser números positivos o cero con máximo 1 decimal (`Math.max(0, Math.round((Number(macro) || 0) * 10) / 10)`).
  - Si el usuario borra por completo un valor y lo deja vacío, se normaliza automáticamente a `0`.
  - El nombre del plato no puede quedar en blanco; si se borra, se restaura el nombre provisto por Gemini o el tipo de comida por defecto.

- **RF-7 (Persistencia Atómica y Hápticos)**:
  - Al presionar *"Guardar en mi día"*, se persiste en `AsyncStorage` mediante `guardarComida`, se emite una confirmación háptica (`vibrarConfirmacionBorrado` o selección), se cierra la modal y se actualiza reactivamente la lista de comidas y la tarjeta de macros del día.

- **RF-8 (Cero Emojis y Dark Luxury OLED)**:
  - Todos los iconos utilizan exclusivamente `@expo/vector-icons` (`Feather`).
  - Paleta estricta de tokens (`TOKENS.colors.canvas`, `surface`, `surfaceElevated`, `borderDefault`, `textPrimary`, `textSecondary`, `accentWhite`).

- **RF-9 (Ergonomía Móvil y Safe Areas)**:
  - Integración de `useSafeInsets` con pisos defensivos (`top >= 28` Android / `20` iOS; `bottom >= 12` Android / `20` iOS).
  - Uso de `KeyboardAvoidingView` con `ScrollView` (`keyboardShouldPersistTaps="handled"`) para evitar que el teclado tape los inputs y los botones de acción en pantallas Android e iOS.
  - Botones primarios en la zona inferior del pulgar (Thumb-Zone) con altura mínima de 48-54pt y touch targets >= 44x44pt.

## 3. Casos Límite y Defensas

- **Defensa 1 (Preservación del Borrador)**: No resetear el estado local de la foto ni del texto ante errores de red o excepciones HTTP de la API de Gemini. El estado solo se destruye si el usuario presiona explícitamente *"Descartar"* o tras un guardado exitoso.
- **Defensa 2 (Protección contra Valores NaN o Negativos)**: En la modal de revisión, cualquier entrada que no sea parseable como número finito positivo se sanea de inmediato a `0`, impidiendo corrupción de totales en la tarjeta de macros.
- **Defensa 3 (Colisión con Teclado Virtual)**: Manejo de teclado con `KeyboardAvoidingView` (`behavior={Platform.OS === 'ios' ? 'padding' : undefined}`) para evitar el bloqueo documentado en INC-006.
- **Defensa 4 (Doble Toque y Carreras)**: Deshabilitar botones de análisis y guardado mientras `analizando` o `guardando` sea verdadero.
- **Defensa 5 (Compatibilidad del Modelo de Almacenamiento)**: El objeto guardado en `AsyncStorage` conserva exactamente la misma estructura de datos esperada por el resto de la app (`id`, `tipo`, `nombre`, `calorias`, `proteinas`, `carbohidratos`, `grasas`, `macros`, `detalles`, `uriFoto`, `fecha`).
