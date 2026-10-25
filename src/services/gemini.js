/**
 * Servicio Multimodal Gemini Vision para análisis nutricional y de cambio físico.
 * Lee la clave de API desde process.env.EXPO_PUBLIC_GEMINI_API_KEY
 * y el modelo desde process.env.EXPO_PUBLIC_GEMINI_MODEL (por defecto 'gemini-3-flash-preview').
 * Modelos de respaldo: process.env.EXPO_PUBLIC_GEMINI_FALLBACK_MODELS (por defecto 'gemini-3.5-flash-lite').
 *
 * NOTA CRÍTICA (RF-1): Cualquier variante 3.8 de Gemini está estrictamente prohibida
 * y se filtra automáticamente aunque figure en variables de entorno (.env).
 *
 * Estrategia de resiliencia (failover):
 *   principal -> respaldo -> error final al usuario.
 *   Cualquier fallo de un modelo (503, 429, 5xx, 404, timeout, red, JSON inválido)
 *   pasa inmediatamente al siguiente. Cada petición tiene un máximo de 60 s.
 */

const GEMINI_API_BASE_URL =
  'https://generativelanguage.googleapis.com/v1beta/models';

export const TIMEOUT_POR_PETICION_MS = 60000;
export const MODELO_PRINCIPAL_DEFAULT = 'gemini-3-flash-preview';
export const MODELOS_RESPALDO_DEFAULT = ['gemini-3.5-flash-lite'];

/**
 * Verifica si un identificador de modelo corresponde a la familia prohibida (RF-1).
 * @param {string} nombreModelo
 * @returns {boolean}
 */
export const esModeloProhibido = (nombreModelo) => {
  const limpio = String(nombreModelo || '').trim().toLowerCase();
  return !limpio || /gemini-3\.8/i.test(limpio);
};

/**
 * Error con el detalle de todos los modelos que fallaron.
 * `fallos` = [{ modelo, status, mensaje }]
 */
export class GeminiError extends Error {
  constructor(mensaje, { status = null, fallos = [] } = {}) {
    super(mensaje);
    this.name = 'GeminiError';
    this.status = status;
    this.fallos = fallos;
  }
}

/**
 * Lista ordenada, sin duplicados y libre de modelos prohibidos: principal + respaldos.
 * Si las variables de entorno dejan la lista vacía tras el filtrado, garantiza el fallback por defecto.
 * @returns {string[]}
 */
export const obtenerModelos = () => {
  const principalEnv = String(process.env.EXPO_PUBLIC_GEMINI_MODEL || '').trim();
  const principal = esModeloProhibido(principalEnv)
    ? MODELO_PRINCIPAL_DEFAULT
    : principalEnv;

  const cadenaRespaldos =
    process.env.EXPO_PUBLIC_GEMINI_FALLBACK_MODELS ||
    MODELOS_RESPALDO_DEFAULT.join(',');

  const respaldosEnv = String(cadenaRespaldos)
    .split(',')
    .map((nombre) => nombre.trim())
    .filter((nombre) => Boolean(nombre) && !esModeloProhibido(nombre));

  const candidatos = Array.from(
    new Set([principal, ...respaldosEnv, ...MODELOS_RESPALDO_DEFAULT])
  ).filter((nombre) => Boolean(nombre) && !esModeloProhibido(nombre));

  return candidatos.length > 0
    ? candidatos
    : [MODELO_PRINCIPAL_DEFAULT, ...MODELOS_RESPALDO_DEFAULT];
};

/**
 * Construye el prompt de análisis nutricional exhaustivo priorizando exactitud y rigor cuantitativo.
 * @param {string} tipoComida - 'Desayuno' | 'Comida' | 'Cena' | 'Snack'
 * @returns {string}
 */
const construirPromptAltaPrecision = (tipoComida) => `
Actúa como un nutricionista clínico y especialista en bromatología e inspección visual de alimentos.
Estás analizando una fotografía correspondiente al tiempo de comida: "${tipoComida}".

Prioriza la MÁXIMA PRECISIÓN Y EXACTITUD por encima de la brevedad en tu razonamiento interno:
1. Identifica exhaustivamente todos los ingredientes visibles en el plato, vaso o envase (proteínas animales/vegetales, cereales, tubérculos, verduras, frutas, salsas, aderezos, quesos, cremas y aceites de cocción).
2. Estima el volumen y peso en gramos (g) o mililitros (ml) de cada componente tomando como referencia las proporciones del plato, cubiertos, grosor de los cortes y densidad de cada alimento.
3. Considera el método de preparación observable (frito, empanizado, salteado con aceite, a la plancha, al vapor, horneado o crudo) y suma las calorías y lípidos ocultos derivados de la cocción o aderezos.
4. Calcula para cada ingrediente individual sus kilocalorías (kcal), gramos de proteína, gramos de carbohidratos netos/totales y gramos de grasas, basándote en tablas nutricionales estándar (USDA / equivalentes).
5. Verifica que la suma calórica sea termodinámicamente consistente con los macronutrientes estimados (aprox. 4 kcal/g de proteína, 4 kcal/g de carbohidratos, 9 kcal/g de grasa).

Devuelve ÚNICAMENTE un objeto JSON válido (sin bloques markdown ni texto adicional) con esta estructura exacta:
{
  "nombre": "Nombre descriptivo y preciso del platillo con sus ingredientes principales",
  "calorias": 0,
  "proteinas": 0,
  "carbohidratos": 0,
  "grasas": 0
}
Donde "calorias", "proteinas", "carbohidratos" y "grasas" sean números (enteros o decimales con máximo 1 decimal) representando el total estimado de toda la porción mostrada.
`.trim();

/**
 * Construye el prompt multimodal para evaluar de 1 a 10 fotos de cambio físico
 * integrando absolutamente todos los datos biológicos y registros del día del usuario (RF-11, RF-12).
 * @param {Object} contexto
 * @param {number} cantidadFotos
 * @returns {string}
 */
const construirPromptCambioFisico = (contexto, cantidadFotos) => {
  const {
    edadTexto = '15 años',
    fechaNacimiento = '26/11/2010',
    tiempoEntrenandoTexto = 'En progreso',
    fechaInicioEntreno = '01/11/2025',
    alturaCm = 182,
    alturaMetros = 1.82,
    pesoKg = 74,
    sexo = 'Hombre',
    objetivo = 'Mantenimiento',
    hora12h = '12:00 PM',
    momentoDia = 'Mediodía',
    fechaHoy = '',
    entrenamientosHoy = [],
    comidasHoy = [],
    historialPesosPrevios = [],
  } = contexto || {};

  const resumenEntrenos =
    Array.isArray(entrenamientosHoy) && entrenamientosHoy.length > 0
      ? entrenamientosHoy
          .map(
            (e, idx) =>
              `  ${idx + 1}. ${e.ejercicio}: ${e.series} series x ${e.repeticiones} reps con ${e.peso} kg`
          )
          .join('\n')
      : '  Ningún entrenamiento registrado todavía en el día de hoy (0 entrenamientos).';

  const totalesComidas = Array.isArray(comidasHoy)
    ? comidasHoy.reduce(
        (acc, c) => ({
          calorias: acc.calorias + (Number(c.calorias) || 0),
          proteinas:
            Math.round((acc.proteinas + (Number(c.proteinas) || 0)) * 10) / 10,
          carbohidratos:
            Math.round(
              (acc.carbohidratos + (Number(c.carbohidratos) || 0)) * 10
            ) / 10,
          grasas: Math.round((acc.grasas + (Number(c.grasas) || 0)) * 10) / 10,
        }),
        { calorias: 0, proteinas: 0, carbohidratos: 0, grasas: 0 }
      )
    : { calorias: 0, proteinas: 0, carbohidratos: 0, grasas: 0 };

  const resumenComidas =
    Array.isArray(comidasHoy) && comidasHoy.length > 0
      ? `${comidasHoy
          .map(
            (c, idx) =>
              `  ${idx + 1}. [${c.tipo}] ${c.nombre}: ${c.calorias} kcal (P: ${c.proteinas}g, C: ${c.carbohidratos}g, G: ${c.grasas}g)`
          )
          .join('\n')}\n  Totales acumulados hoy: ${totalesComidas.calorias} kcal | Proteínas: ${totalesComidas.proteinas}g | Carbohidratos: ${totalesComidas.carbohidratos}g | Grasas: ${totalesComidas.grasas}g`
      : '  Ninguna comida registrada todavía en el día de hoy (0 comidas, 0 kcal).';

  const resumenPesosPrevios =
    Array.isArray(historialPesosPrevios) && historialPesosPrevios.length > 0
      ? historialPesosPrevios
          .slice(0, 5)
          .map((p) => `${p.fecha} (${p.hora12h || ''}): ${p.pesoKg} kg (Veredicto: ${p.veredicto}/10)`)
          .join(' | ')
      : 'Primer chequeo físico registrado en la aplicación.';

  return `
Actúa como un entrenador experto en recomposición corporal, biomecánica, antropometría visual y nutrición deportiva.
Estás evaluando una sesión de ${cantidadFotos} fotografía(s) de progreso físico del usuario tomadas hoy (${fechaHoy}).

DATOS BIOLÓGICOS Y DE PERFIL DEL USUARIO (OBLIGATORIO CONSIDERAR TODOS):
- Sexo: ${sexo}
- Fecha de nacimiento: ${fechaNacimiento} -> Edad exacta actual: ${edadTexto}
- Fecha de inicio entrenando: ${fechaInicioEntreno} -> Tiempo entrenando actual: ${tiempoEntrenandoTexto}
- Estatura: ${alturaCm} cm (${alturaMetros} m)
- Peso actual en báscula circular hoy: ${pesoKg} kg (Peso base de referencia: 74.0 kg)
- Objetivo físico actual: ${objetivo}
- Hora exacta de las fotografías (formato 12h): ${hora12h}
- Condición / Momento del día de las fotos: ${momentoDia}
- Historial reciente de pesos y chequeos: ${resumenPesosPrevios}

REGISTROS DEL DÍA DE HOY (${fechaHoy}) EN LA APP:
- Entrenamientos de fuerza realizados hoy:
${resumenEntrenos}
- Comidas y macronutrientes registrados hoy:
${resumenComidas}

INSTRUCCIONES DE EVALUACIÓN:
1. Analiza de forma conjunta las ${cantidadFotos} fotografía(s) considerando la edad biológica exacta (${edadTexto}), el tiempo de experiencia entrenando (${tiempoEntrenandoTexto}), la estatura (${alturaCm} cm), el peso actual en báscula (${pesoKg} kg), la hora (${hora12h} - ${momentoDia}) y su objetivo actual ("${objetivo}").
2. Redacta un "resumenSimple" muy claro, directo, motivador y fácil de leer (2 a 3 oraciones concisas) que sintetice cómo se ve su estado físico hoy.
3. Redacta un "resumenDetallado" técnico y exhaustivo (proporciones musculares, estimación visual de porcentaje graso, simetría de tren superior/inferior/core, postura, hidratación/glucógeno según la hora ${hora12h} y el momento "${momentoDia}", y relación peso/altura de ${pesoKg} kg para ${alturaCm} cm). Este texto detallado se guardará íntegro en la base de datos local para una futura vista avanzada.
4. Redacta un "balanceDelDia" breve (1 a 2 oraciones) señalando específicamente lo bueno o lo malo/pendiente del día de hoy tomando en cuenta las comidas (${comidasHoy?.length || 0}) y entrenamientos (${entrenamientosHoy?.length || 0}) registrados hoy frente a su objetivo de "${objetivo}". Si hay 0 comidas o 0 entrenos registrados hoy, menciónalo con naturalidad invitando a registrarlos sin inventar datos.
5. Asigna un "veredicto" numérico de 0 a 10 (con hasta 1 decimal, ej. 8.4) que califique de manera realista su estado físico y apego al objetivo considerando su edad (${edadTexto}), tiempo entrenando (${tiempoEntrenandoTexto}), peso (${pesoKg} kg), estatura (${alturaCm} cm) y contexto del día.

Devuelve ÚNICAMENTE un objeto JSON válido (sin bloques markdown ni texto adicional) con esta estructura exacta:
{
  "resumenSimple": "Resumen general muy simple, directo y claro de su físico hoy.",
  "resumenDetallado": "Análisis técnico completo y profundo por grupos musculares, composición corporal, retención/glucógeno y antropometría.",
  "balanceDelDia": "Breve evaluación de lo bueno o lo pendiente del día según las comidas y entrenamientos registrados hoy.",
  "veredicto": 8.5,
  "puntosClave": [
    "Punto clave corto 1",
    "Punto clave corto 2",
    "Punto clave corto 3"
  ]
}
`.trim();
};

/**
 * Construye el prompt para comparar bajo demanda el registro físico actual contra el registro anterior (RF-14, RF-15).
 * @param {Object} registroActual
 * @param {Object} registroAnterior
 * @param {number} cantidadFotosActuales
 * @returns {string}
 */
const construirPromptComparacionFisica = (
  registroActual,
  registroAnterior,
  cantidadFotosActuales
) => {
  const diffPeso =
    Math.round(
      ((Number(registroActual?.pesoKg) || 74) -
        (Number(registroAnterior?.pesoKg) || 74)) *
        10
    ) / 10;
  const signoPeso = diffPeso > 0 ? `+${diffPeso}` : `${diffPeso}`;

  return `
Actúa como un preparador físico experto en seguimiento antropométrico y optimización corporal.
Compara el REGISTRO ANTERIOR del usuario contra su NUEVO REGISTRO ACTUAL${
    cantidadFotosActuales > 0
      ? ` (acompañado de ${cantidadFotosActuales} fotografía(s) actuales adjuntas)`
      : ''
  }.

PERFIL DEL USUARIO:
- Sexo: Hombre | Estatura: 182 cm (1.82 m) | Fecha de nacimiento: 26/11/2010 | Inicio entrenando: 01/11/2025
- Objetivo actual: ${registroActual?.objetivo || 'Mantenimiento'}

REGISTRO ANTERIOR:
- Fecha y hora: ${registroAnterior?.fecha || 'N/D'} a las ${registroAnterior?.hora12h || 'N/D'} (${registroAnterior?.momentoDia || 'N/D'})
- Peso en báscula: ${registroAnterior?.pesoKg ?? 74} kg
- Veredicto anterior: ${registroAnterior?.veredicto ?? 'N/D'}/10
- Resumen simple anterior: ${registroAnterior?.resumenSimple || 'Sin resumen'}
- Análisis detallado anterior: ${registroAnterior?.resumenDetallado || 'Sin detalle previo'}

NUEVO REGISTRO ACTUAL:
- Fecha y hora: ${registroActual?.fecha || 'N/D'} a las ${registroActual?.hora12h || 'N/D'} (${registroActual?.momentoDia || 'N/D'})
- Peso en báscula: ${registroActual?.pesoKg ?? 74} kg (Variación de peso: ${signoPeso} kg)
- Veredicto actual: ${registroActual?.veredicto ?? 'N/D'}/10
- Resumen simple actual: ${registroActual?.resumenSimple || ''}
- Análisis detallado actual: ${registroActual?.resumenDetallado || ''}
- Balance del día actual: ${registroActual?.balanceDelDia || ''}

Devuelve ÚNICAMENTE un objeto JSON válido (sin bloques markdown ni texto adicional) con esta estructura exacta:
{
  "evolucion": "Explicación clara y directa (2 a 3 oraciones) de los cambios observados entre el registro anterior y el actual (peso, composición visual, tono muscular y condición).",
  "recomendacionesOptimizacion": [
    "Recomendación accionable 1 para optimizar su progreso según su objetivo",
    "Recomendación accionable 2 sobre nutrición o entrenamiento",
    "Recomendación accionable 3 sobre descanso, hidratación o consistencia"
  ]
}
`.trim();
};

/**
 * Ejecuta una llamada genérica a un modelo de Gemini con soporte para 0, 1 o múltiples imágenes Base64.
 */
const ejecutarLlamadaGemini = async ({
  modelo,
  apiKey,
  promptTexto,
  imagenesBase64 = [],
  temperature = 0.15,
  timeoutMs = TIMEOUT_POR_PETICION_MS,
}) => {
  const endpoint = `${GEMINI_API_BASE_URL}/${modelo}:generateContent?key=${apiKey}`;

  const partesImagen = imagenesBase64.map((b64) => ({
    inlineData: {
      mimeType: 'image/jpeg',
      data: String(b64).replace(/^data:image\/[a-zA-Z+]+;base64,/, ''),
    },
  }));

  const payload = {
    contents: [
      {
        parts: [{ text: promptTexto }, ...partesImagen],
      },
    ],
    generationConfig: {
      response_mime_type: 'application/json',
      temperature,
    },
  };

  const controlador = new AbortController();
  const temporizador = setTimeout(() => controlador.abort(), timeoutMs);

  try {
    let response;
    try {
      response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controlador.signal,
      });
    } catch (errorRed) {
      if (errorRed?.name === 'AbortError') {
        throw new GeminiError(
          `sin respuesta en ${Math.round(timeoutMs / 1000)} s`,
          { status: 'TIMEOUT' }
        );
      }
      throw new GeminiError('fallo de red', { status: 'RED' });
    }

    if (!response.ok) {
      const textoError = await response.text();
      let mensajeServidor = textoError;
      try {
        mensajeServidor = JSON.parse(textoError)?.error?.message || textoError;
      } catch {
        // cuerpo no JSON: se usa el texto tal cual
      }
      throw new GeminiError(String(mensajeServidor).slice(0, 200), {
        status: response.status,
      });
    }

    const data = await response.json();
    const textoRespuesta =
      data?.candidates?.[0]?.content?.parts
        ?.map((part) => part.text || '')
        .join('')
        .trim() || '';

    if (!textoRespuesta) {
      throw new GeminiError('respuesta vacía', { status: 'VACIO' });
    }

    const textoJsonLimpio = textoRespuesta
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/, '')
      .trim();

    try {
      return JSON.parse(textoJsonLimpio);
    } catch {
      throw new GeminiError('JSON inválido en la respuesta', { status: 'JSON' });
    }
  } finally {
    clearTimeout(temporizador);
  }
};

/**
 * Ejecuta UNA petición de análisis nutricional a un modelo concreto con límite de tiempo.
 */
const solicitarAnalisis = async ({
  modelo,
  apiKey,
  base64Limpio,
  tipoComida,
  timeoutMs,
}) => {
  const resultado = await ejecutarLlamadaGemini({
    modelo,
    apiKey,
    promptTexto: construirPromptAltaPrecision(tipoComida),
    imagenesBase64: [base64Limpio],
    temperature: 0.1,
    timeoutMs,
  });

  return {
    nombre: String(resultado?.nombre || `${tipoComida} analizada`).trim(),
    calorias: Math.round(Number(resultado?.calorias) || 0),
    proteinas: Math.round((Number(resultado?.proteinas) || 0) * 10) / 10,
    carbohidratos: Math.round((Number(resultado?.carbohidratos) || 0) * 10) / 10,
    grasas: Math.round((Number(resultado?.grasas) || 0) * 10) / 10,
    modeloUsado: modelo,
  };
};

/**
 * Analiza una imagen de comida en Base64 usando la API REST de Gemini Vision.
 * Recorre la cadena de modelos (principal + respaldos) hasta que uno responda.
 * @param {string} base64Image - Imagen codificada en Base64
 * @param {string} [tipoComida='Comida'] - Tipo de comida ('Desayuno', 'Comida', 'Cena', 'Snack')
 * @param {{
 *   onProgreso?: (estado: { modelo: string, indice: number, total: number, falloAnterior?: { modelo: string, status: any } }) => void,
 *   timeoutMs?: number
 * }} [opciones]
 * @returns {Promise<{ nombre: string, calorias: number, proteinas: number, carbohidratos: number, grasas: number, modeloUsado: string }>}
 */
export const analizarComidaConGemini = async (
  base64Image,
  tipoComida = 'Comida',
  opciones = {}
) => {
  const { onProgreso, timeoutMs = TIMEOUT_POR_PETICION_MS } = opciones;
  const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;

  if (!apiKey) {
    throw new GeminiError(
      'Falta configurar EXPO_PUBLIC_GEMINI_API_KEY en tus variables de entorno (.env).'
    );
  }

  if (!base64Image || typeof base64Image !== 'string') {
    throw new GeminiError('No se recibió una imagen válida en formato Base64.');
  }

  const base64Limpio = base64Image.replace(/^data:image\/[a-zA-Z+]+;base64,/, '');
  const modelos = obtenerModelos();
  const fallos = [];

  for (let indice = 0; indice < modelos.length; indice += 1) {
    const modelo = modelos[indice];
    onProgreso?.({
      modelo,
      indice: indice + 1,
      total: modelos.length,
      falloAnterior: fallos[fallos.length - 1],
    });

    try {
      return await solicitarAnalisis({
        modelo,
        apiKey,
        base64Limpio,
        tipoComida,
        timeoutMs,
      });
    } catch (error) {
      fallos.push({
        modelo,
        status: error?.status ?? 'DESCONOCIDO',
        mensaje: error?.message || 'error desconocido',
      });
    }
  }

  const resumen = fallos.map((f) => `• ${f.modelo}: ${f.status}`).join('\n');
  throw new GeminiError(
    `No se pudo analizar la comida. Los ${modelos.length} modelos de Gemini fallaron:\n${resumen}\n\nIntenta de nuevo en unos minutos.`,
    { status: fallos[fallos.length - 1]?.status ?? null, fallos }
  );
};

/**
 * Analiza entre 1 y 10 fotografías de cambio físico con Gemini Vision tomando en cuenta
 * todos los datos biológicos y registros diarios del usuario (RF-11, RF-12).
 * @param {string[]} imagenesBase64 - Arreglo de 1 a 10 imágenes en Base64
 * @param {Object} contextoUsuario - Datos del perfil biológico, peso, hora 12h y actividad del día
 * @param {{
 *   onProgreso?: (estado: { modelo: string, indice: number, total: number, falloAnterior?: { modelo: string, status: any } }) => void,
 *   timeoutMs?: number
 * }} [opciones]
 * @returns {Promise<{ resumenSimple: string, resumenDetallado: string, balanceDelDia: string, veredicto: number, puntosClave: string[], modeloUsado: string }>}
 */
export const analizarCambioFisicoConGemini = async (
  imagenesBase64,
  contextoUsuario = {},
  opciones = {}
) => {
  const { onProgreso, timeoutMs = TIMEOUT_POR_PETICION_MS } = opciones;
  const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;

  if (!apiKey) {
    throw new GeminiError(
      'Falta configurar EXPO_PUBLIC_GEMINI_API_KEY en tus variables de entorno (.env).'
    );
  }

  if (!Array.isArray(imagenesBase64) || imagenesBase64.length === 0) {
    throw new GeminiError(
      'Debes seleccionar al menos 1 fotografía para analizar tu cambio físico.'
    );
  }

  const fotosLimpias = imagenesBase64
    .slice(0, 10)
    .map((img) =>
      typeof img === 'string'
        ? img.replace(/^data:image\/[a-zA-Z+]+;base64,/, '').trim()
        : ''
    )
    .filter(Boolean);

  if (fotosLimpias.length === 0) {
    throw new GeminiError(
      'No se recibieron imágenes válidas en formato Base64 para el análisis físico.'
    );
  }

  const promptTexto = construirPromptCambioFisico(
    contextoUsuario,
    fotosLimpias.length
  );
  const modelos = obtenerModelos();
  const fallos = [];

  for (let indice = 0; indice < modelos.length; indice += 1) {
    const modelo = modelos[indice];
    onProgreso?.({
      modelo,
      indice: indice + 1,
      total: modelos.length,
      falloAnterior: fallos[fallos.length - 1],
    });

    try {
      const resultado = await ejecutarLlamadaGemini({
        modelo,
        apiKey,
        promptTexto,
        imagenesBase64: fotosLimpias,
        temperature: 0.2,
        timeoutMs,
      });

      const veredictoBruto = Number(resultado?.veredicto);
      const veredictoNormalizado = Number.isFinite(veredictoBruto)
        ? Math.min(10, Math.max(0, Math.round(veredictoBruto * 10) / 10))
        : 7.5;

      const puntosClave = Array.isArray(resultado?.puntosClave)
        ? resultado.puntosClave
            .map((p) => String(p || '').trim())
            .filter(Boolean)
            .slice(0, 5)
        : [];

      return {
        resumenSimple:
          String(resultado?.resumenSimple || '').trim() ||
          'Buen estado físico general acorde a tu perfil y objetivo de mantenimiento.',
        resumenDetallado:
          String(resultado?.resumenDetallado || '').trim() ||
          String(resultado?.resumenSimple || '').trim() ||
          'Análisis detallado registrado correctamente.',
        balanceDelDia:
          String(resultado?.balanceDelDia || '').trim() ||
          'Mantén el registro de tus comidas y entrenamientos del día para optimizar tu objetivo.',
        veredicto: veredictoNormalizado,
        puntosClave,
        modeloUsado: modelo,
      };
    } catch (error) {
      fallos.push({
        modelo,
        status: error?.status ?? 'DESCONOCIDO',
        mensaje: error?.message || 'error desconocido',
      });
    }
  }

  const resumen = fallos.map((f) => `• ${f.modelo}: ${f.status}`).join('\n');
  throw new GeminiError(
    `No se pudo analizar el cambio físico. Los ${modelos.length} modelos de Gemini fallaron:\n${resumen}\n\nIntenta de nuevo en unos minutos.`,
    { status: fallos[fallos.length - 1]?.status ?? null, fallos }
  );
};

/**
 * Compara bajo demanda el registro físico actual contra el registro anterior (RF-14, RF-15).
 * @param {{
 *   registroActual: Object,
 *   registroAnterior: Object,
 *   imagenesActualesBase64?: string[]
 * }} params
 * @param {{
 *   onProgreso?: (estado: { modelo: string, indice: number, total: number, falloAnterior?: { modelo: string, status: any } }) => void,
 *   timeoutMs?: number
 * }} [opciones]
 * @returns {Promise<{ evolucion: string, recomendacionesOptimizacion: string[], modeloUsado: string }>}
 */
export const compararCambioFisicoConGemini = async (
  { registroActual, registroAnterior, imagenesActualesBase64 = [] } = {},
  opciones = {}
) => {
  const { onProgreso, timeoutMs = TIMEOUT_POR_PETICION_MS } = opciones;
  const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;

  if (!apiKey) {
    throw new GeminiError(
      'Falta configurar EXPO_PUBLIC_GEMINI_API_KEY en tus variables de entorno (.env).'
    );
  }

  if (!registroActual || !registroAnterior) {
    throw new GeminiError(
      'Se requieren tanto el registro actual como un registro anterior para realizar la comparación.'
    );
  }

  const fotosLimpias = Array.isArray(imagenesActualesBase64)
    ? imagenesActualesBase64
        .slice(0, 10)
        .map((img) =>
          typeof img === 'string'
            ? img.replace(/^data:image\/[a-zA-Z+]+;base64,/, '').trim()
            : ''
        )
        .filter(Boolean)
    : [];

  const promptTexto = construirPromptComparacionFisica(
    registroActual,
    registroAnterior,
    fotosLimpias.length
  );
  const modelos = obtenerModelos();
  const fallos = [];

  for (let indice = 0; indice < modelos.length; indice += 1) {
    const modelo = modelos[indice];
    onProgreso?.({
      modelo,
      indice: indice + 1,
      total: modelos.length,
      falloAnterior: fallos[fallos.length - 1],
    });

    try {
      const resultado = await ejecutarLlamadaGemini({
        modelo,
        apiKey,
        promptTexto,
        imagenesBase64: fotosLimpias,
        temperature: 0.2,
        timeoutMs,
      });

      const recomendaciones = Array.isArray(
        resultado?.recomendacionesOptimizacion
      )
        ? resultado.recomendacionesOptimizacion
            .map((r) => String(r || '').trim())
            .filter(Boolean)
            .slice(0, 5)
        : [];

      return {
        evolucion:
          String(resultado?.evolucion || '').trim() ||
          'Se observa continuidad consistente entre el registro anterior y el chequeo actual.',
        recomendacionesOptimizacion:
          recomendaciones.length > 0
            ? recomendaciones
            : [
                'Mantén un control constante de proteína diaria y sobrecarga progresiva en tus entrenamientos.',
              ],
        modeloUsado: modelo,
      };
    } catch (error) {
      fallos.push({
        modelo,
        status: error?.status ?? 'DESCONOCIDO',
        mensaje: error?.message || 'error desconocido',
      });
    }
  }

  const resumen = fallos.map((f) => `• ${f.modelo}: ${f.status}`).join('\n');
  throw new GeminiError(
    `No se pudo completar la comparación física. Los ${modelos.length} modelos de Gemini fallaron:\n${resumen}`,
    { status: fallos[fallos.length - 1]?.status ?? null, fallos }
  );
};
