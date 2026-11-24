/**
 * Servicio Multimodal Gemini Vision para análisis nutricional y de cambio físico.
 * Lee la clave de API desde el almacenamiento seguro del dispositivo (BYOK),
 * y el modelo desde process.env.EXPO_PUBLIC_GEMINI_MODEL.
 * Modelos de respaldo: process.env.EXPO_PUBLIC_GEMINI_FALLBACK_MODELS (por defecto MODELOS_RESPALDO_DEFAULT).
 *
 * NOTA CRÍTICA (RF-1, Spec 002): Cualquier variante 3.8 de Gemini está prohibida y se filtra
 * aunque figure en variables de entorno. Re-probada el 2026-11-23: sigue devolviendo 503.
 *
 * Estrategia de resiliencia (Spec 021): un único motor `ejecutarConFailover`.
 *   - Saturación (5xx/red): hasta 2 reintentos en el mismo modelo con espera exponencial.
 *   - Límite (429): 1 reintento solo si el servidor pide ≤ 10 s; si no, siguiente modelo.
 *   - Clave inválida o contenido bloqueado: se corta la cadena.
 *   - Toda la operación dura como máximo 90 s; el usuario ve una frase clara, nunca códigos.
 */

import {
  cargarApiKeyGemini,
  esFormatoApiKeyValido,
  normalizarApiKey,
  MENSAJE_FORMATO_API_KEY_INVALIDO,
} from './apiKeyStorage';
import {
  PERFIL_USUARIO_BASE,
  calcularEdadExacta,
  calcularTiempoEntrenando,
  cargarPerfilUsuario,
} from './storage';
import { formatearFechaLegible } from '../utils/dateUtilsLocal';
import {
  formatearHora12h,
  normalizarResumenEstudio,
} from '../utils/resumenEstudio';

const GEMINI_API_BASE_URL =
  'https://generativelanguage.googleapis.com/v1beta/models';

const construirEncabezados = (apiKey) => ({
  'Content-Type': 'application/json',
  'x-goog-api-key': apiKey,
});

export const TIMEOUT_POR_PETICION_MS = 60000;
/** Máximo de caracteres de la descripción opcional de una comida que se envía a Gemini (Spec 020, RF-6). */
export const LIMITE_DESCRIPCION_COMIDA = 500;
// Spec 021 (2026-11-23): con clave gratuita, 3.5 Flash-Lite acertó 6/6 fotos dentro del rango USDA en ~1.6 s;
// los demás modelos quedaron limitados por 429/503. Respaldos: 3.6 Flash y 3-flash-preview.
export const MODELO_PRINCIPAL_DEFAULT = 'gemini-3.5-flash-lite';
export const MODELOS_RESPALDO_DEFAULT = ['gemini-3.6-flash', 'gemini-3-flash-preview'];

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
 * Valida una clave candidata de Gemini haciendo una llamada de prueba ultraligera (timeout 8s).
 * @param {string} claveCandidata
 * @returns {Promise<{ valida: boolean, error?: string }>}
 */
export const validarApiKeyGemini = async (claveCandidata) => {
  if (!claveCandidata || typeof claveCandidata !== 'string') {
    return { valida: false, error: 'Ingresa una clave de API válida.' };
  }

  const claveLimpia = normalizarApiKey(claveCandidata);
  if (!claveLimpia) {
    return { valida: false, error: 'La clave de API no puede estar vacía.' };
  }

  if (!esFormatoApiKeyValido(claveLimpia)) {
    return { valida: false, error: MENSAJE_FORMATO_API_KEY_INVALIDO };
  }

  const endpoint = GEMINI_API_BASE_URL;
  const controlador = new AbortController();
  const temporizador = setTimeout(() => controlador.abort(), 8000);

  try {
    const respuesta = await fetch(endpoint, {
      method: 'GET',
      headers: construirEncabezados(claveLimpia),
      signal: controlador.signal,
    });

    if (respuesta.ok) {
      return { valida: true };
    }

    if (respuesta.status === 400) {
      return {
        valida: false,
        error: 'La clave ingresada no es válida. Revisa los caracteres.',
      };
    }

    if (respuesta.status === 403) {
      return {
        valida: false,
        error:
          'Permiso denegado. Revisa las restricciones de tu proyecto en Google Cloud.',
      };
    }

    return {
      valida: false,
      error: `Error de verificación en Google AI Studio (HTTP ${respuesta.status}).`,
    };
  } catch (error) {
    if (error?.name === 'AbortError') {
      return {
        valida: false,
        error:
          'Tiempo de espera agotado al conectar con Google AI Studio. Verifica tu conexión.',
      };
    }
    return {
      valida: false,
      error:
        'Sin conexión a internet. Comprueba tu conexión Wi-Fi o datos móviles.',
    };
  } finally {
    clearTimeout(temporizador);
  }
};

/**
 * Resuelve la clave de API activa:
 * Única fuente: Almacenamiento seguro del dispositivo (BYOK).
 * @returns {Promise<string>}
 */
export const obtenerApiKeyActiva = async () => {
  const claveGuardada = await cargarApiKeyGemini();
  if (claveGuardada && claveGuardada.length > 0) {
    return claveGuardada;
  }

  throw new GeminiError(
    'No se ha configurado ninguna clave de API de Gemini. Toca el botón de engranaje en la pantalla de Inicio para ingresar tu Gemini API Key.'
  );
};

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
 * Construye el prompt de análisis nutricional exhaustivo priorizando exactitud y rigor cuantitativo,
 * integrando el perfil biométrico y objetivo físico actual del usuario (Spec 010, Defensa 6).
 * @param {string} tipoComida - 'Desayuno' | 'Comida' | 'Cena' | 'Snack'
 * @param {Object} [contextoPerfil={}]
 * @returns {string}
 */
export const construirPromptAltaPrecision = (
  tipoComida,
  contextoPerfil = {},
  descripcionUsuario = ''
) => {
  const {
    sexo = PERFIL_USUARIO_BASE.sexo,
    edadTexto = 'edad no especificada',
    alturaCm = PERFIL_USUARIO_BASE.alturaCm,
    pesoKgActual = PERFIL_USUARIO_BASE.pesoKgActual,
    tiempoEntrenandoTexto = 'En progreso',
    objetivo = PERFIL_USUARIO_BASE.objetivo,
  } = contextoPerfil || {};

  // Recorte por puntos de código (Array.from) para no partir emojis ni caracteres compuestos (Spec 020, RF-6).
  const textoUsuarioLimpio = Array.from(String(descripcionUsuario || '').trim())
    .slice(0, LIMITE_DESCRIPCION_COMIDA)
    .join('');
  const bloqueContextoUsuario =
    textoUsuarioLimpio.length > 0
      ? `\nCONTEXTO Y DETALLES ESPECIFICADOS POR EL USUARIO:\n"${textoUsuarioLimpio}"\n\nDIRECTIVA CRÍTICA DE PRIORIDAD CUANTITATIVA:\n1. Si el usuario especificó cantidades, pesos (ej. gramos, mililitros, piezas) o ingredientes concretos en la descripción, toma esos datos como la VERDAD BASE INMUTABLE y no los contradigas por la perspectiva o ángulo de la foto.\n2. Utiliza la fotografía para identificar ingredientes secundarios no mencionados (guarniciones, aderezos, aceites visibles), evaluar el método de preparación observable y complementar el análisis.\n3. Calcula las calorías y macronutrientes asegurando coherencia termodinámica con las cantidades declaradas por el usuario.\n`
      : '';

  return `
Actúa como un nutricionista clínico y especialista en bromatología e inspección visual de alimentos.
Estás analizando una fotografía correspondiente al tiempo de comida: "${tipoComida}".

PERFIL BIOMÉTRICO Y OBJETIVO DEL USUARIO:
- Sexo biológico: ${sexo}
- Edad exacta: ${edadTexto}
- Estatura: ${alturaCm} cm
- Peso actual: ${Number(pesoKgActual || PERFIL_USUARIO_BASE.pesoKgBase).toFixed(1)} kg
- Experiencia entrenando fuerza: ${tiempoEntrenandoTexto}
- Objetivo físico actual: ${objetivo}
${bloqueContextoUsuario}
Prioriza la MÁXIMA PRECISIÓN Y EXACTITUD por encima de la brevedad en tu razonamiento interno:
1. Identifica exhaustivamente todos los ingredientes visibles en el plato, vaso o envase (proteínas animales/vegetales, cereales, tubérculos, verduras, frutas, salsas, aderezos, quesos, cremas y aceites de cocción).
2. Estima el volumen y peso en gramos (g) o mililitros (ml) de cada componente tomando como referencia las proporciones del plato, cubiertos, grosor de los cortes y densidad de cada alimento.
3. Considera el método de preparación observable (frito, empanizado, salteado con aceite, a la plancha, al vapor, horneado o crudo) y suma las calorías y lípidos ocultos derivados de la cocción o aderezos.
4. Calcula para cada ingrediente individual sus kilocalorías (kcal), gramos de proteína, gramos de carbohidratos netos/totales y gramos de grasas, basándote en tablas nutricionales estándar (USDA / equivalentes).
5. Verifica que la suma calórica sea termodinámicamente consistente con los macronutrientes estimados (aprox. 4 kcal/g de proteína, 4 kcal/g de carbohidratos, 9 kcal/g de grasa).
6. Redacta en "detalles" una evaluación concisa de 1 a 2 oraciones sobre cómo encaja este platillo con el perfil biométrico (${alturaCm} cm, ${Number(pesoKgActual || PERFIL_USUARIO_BASE.pesoKgBase).toFixed(1)} kg, ${edadTexto}) y el objetivo actual de "${objetivo}" del usuario (sin usar emojis).

Devuelve ÚNICAMENTE un objeto JSON válido (sin bloques markdown ni texto adicional) con esta estructura exacta:
{
  "nombre": "Nombre descriptivo y preciso del platillo con sus ingredientes principales",
  "calorias": 0,
  "proteinas": 0,
  "carbohidratos": 0,
  "grasas": 0,
  "detalles": "Evaluación concisa de 1 a 2 oraciones sobre cómo aporta este plato al objetivo actual del usuario."
}
Donde "calorias", "proteinas", "carbohidratos" y "grasas" sean números (enteros o decimales con máximo 1 decimal) representando el total estimado de toda la porción mostrada.
`.trim();
};

/**
 * Construye el prompt multimodal para evaluar de 1 a 10 fotos de cambio físico
 * integrando absolutamente todos los datos biológicos y registros del día del usuario (RF-11, RF-12).
 * @param {Object} contexto
 * @param {number} cantidadFotos
 * @returns {string}
 */
const construirPromptCambioFisico = (contexto, cantidadFotos) => {
  const {
    edadTexto = 'edad no especificada',
    fechaNacimiento = 'no especificada',
    tiempoEntrenandoTexto = 'En progreso',
    fechaInicioEntreno = '01/11/2025',
    alturaCm = PERFIL_USUARIO_BASE.alturaCm,
    alturaMetros = PERFIL_USUARIO_BASE.alturaMetros,
    pesoKg = PERFIL_USUARIO_BASE.pesoKgBase,
    pesoKgBase = PERFIL_USUARIO_BASE.pesoKgBase,
    sexo = PERFIL_USUARIO_BASE.sexo,
    objetivo = PERFIL_USUARIO_BASE.objetivo,
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
- Peso actual en báscula circular hoy: ${pesoKg} kg (Peso base de referencia: ${Number(pesoKgBase).toFixed(1)} kg)
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
 * @param {Object} [perfilUsuario=PERFIL_USUARIO_BASE]
 * @returns {string}
 */
const construirPromptComparacionFisica = (
  registroActual,
  registroAnterior,
  cantidadFotosActuales,
  perfilUsuario = PERFIL_USUARIO_BASE
) => {
  const pesoBaseDefault =
    Number(perfilUsuario?.pesoKgBase) || PERFIL_USUARIO_BASE.pesoKgBase;
  const pesoActualNum = Number(registroActual?.pesoKg) || pesoBaseDefault;
  const pesoAnteriorNum = Number(registroAnterior?.pesoKg) || pesoBaseDefault;
  const diffPeso = Math.round((pesoActualNum - pesoAnteriorNum) * 10) / 10;
  const signoPeso = diffPeso > 0 ? `+${diffPeso}` : `${diffPeso}`;

  const sexo = perfilUsuario?.sexo || PERFIL_USUARIO_BASE.sexo;
  const alturaCm =
    Number(registroActual?.alturaCm) ||
    Number(perfilUsuario?.alturaCm) ||
    PERFIL_USUARIO_BASE.alturaCm;
  const alturaMetros = (Math.round(alturaCm) / 100).toFixed(2);
  const edadInfo = calcularEdadExacta(
    new Date(),
    perfilUsuario?.fechaNacimiento || PERFIL_USUARIO_BASE.fechaNacimiento
  );
  const tiempoInfo = calcularTiempoEntrenando(
    new Date(),
    perfilUsuario?.fechaInicioEntreno || PERFIL_USUARIO_BASE.fechaInicioEntreno
  );

  return `
Actúa como un preparador físico experto en seguimiento antropométrico y optimización corporal.
Compara el REGISTRO ANTERIOR del usuario contra su NUEVO REGISTRO ACTUAL${
    cantidadFotosActuales > 0
      ? ` (acompañado de ${cantidadFotosActuales} fotografía(s) actuales adjuntas)`
      : ''
  }.

PERFIL DEL USUARIO:
- Sexo: ${sexo} | Estatura: ${alturaCm} cm (${alturaMetros} m) | Fecha de nacimiento: ${edadInfo.fechaNacimiento} (${edadInfo.texto}) | Inicio entrenando: ${tiempoInfo.fechaInicio} (${tiempoInfo.texto})
- Objetivo actual: ${registroActual?.objetivo || perfilUsuario?.objetivo || PERFIL_USUARIO_BASE.objetivo}

REGISTRO ANTERIOR:
- Fecha y hora: ${registroAnterior?.fecha || 'N/D'} a las ${registroAnterior?.hora12h || 'N/D'} (${registroAnterior?.momentoDia || 'N/D'})
- Peso en báscula: ${pesoAnteriorNum} kg
- Veredicto anterior: ${registroAnterior?.veredicto ?? 'N/D'}/10
- Resumen simple anterior: ${registroAnterior?.resumenSimple || 'Sin resumen'}
- Análisis detallado anterior: ${registroAnterior?.resumenDetallado || 'Sin detalle previo'}

NUEVO REGISTRO ACTUAL:
- Fecha y hora: ${registroActual?.fecha || 'N/D'} a las ${registroActual?.hora12h || 'N/D'} (${registroActual?.momentoDia || 'N/D'})
- Peso en báscula: ${pesoActualNum} kg (Variación de peso: ${signoPeso} kg)
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
 * Nivel de razonamiento ("thinking") por caso de uso (Spec 021, RF-4).
 * Los modelos Flash 3.x cobran el razonamiento como salida; 'low' reduce costo y latencia.
 */
export const NIVEL_RAZONAMIENTO = {
  comida: 'low',
  fisico: 'low',
  comparacion: 'low',
  estudio: 'low',
};

/** Tope de tokens de salida para que el razonamiento no se coma la respuesta (RF-7). */
export const MAX_TOKENS_SALIDA = 4096;

/** Política de reintentos (Spec 021, RF-2). */
export const POLITICA_REINTENTOS = {
  reintentosSaturacion: 2,
  baseMs: 1000,
  factor: 2,
  jitter: 0.3,
  maxRetryDelayMs: 10000,
  presupuestoTotalMs: 90000,
  minimoRestanteMs: 5000,
};

const FINISH_REASONS_BLOQUEO = new Set([
  'SAFETY',
  'RECITATION',
  'PROHIBITED_CONTENT',
  'BLOCKLIST',
  'SPII',
]);

/** Modelos que rechazaron `thinkingConfig` en esta sesión: no se les vuelve a enviar (RF-4). */
const modelosSinRazonamiento = new Set();

/** Solo para pruebas: limpia el estado de módulo entre tests. */
export const __reiniciarEstadoGeminiParaTests = () => {
  modelosSinRazonamiento.clear();
};

const convertirRetryDelayAMs = (valor) => {
  const coincidencia = /^(\d+(?:\.\d+)?)s$/.exec(String(valor || '').trim());
  return coincidencia ? Math.round(Number(coincidencia[1]) * 1000) : null;
};

/**
 * Ejecuta UNA petición a un modelo concreto (Spec 021, plan §1).
 * Lanza GeminiError con `status` (HTTP o 'TIMEOUT' | 'RED' | 'VACIO' | 'JSON' | 'CORTADO' | 'SEGURIDAD'),
 * `detalle` (cuerpo de error completo), `reason` y `retryDelayMs` cuando el servidor los indica.
 */
const ejecutarLlamadaGemini = async ({
  modelo,
  apiKey,
  promptTexto,
  imagenesBase64 = [],
  temperature = 0.15,
  timeoutMs = TIMEOUT_POR_PETICION_MS,
  nivelRazonamiento = null,
}) => {
  const endpoint = `${GEMINI_API_BASE_URL}/${modelo}:generateContent`;

  const partesImagen = imagenesBase64.map((b64) => ({
    inline_data: {
      mime_type: 'image/jpeg',
      data: String(b64).replace(/^data:image\/[a-zA-Z+]+;base64,/, ''),
    },
  }));

  const generationConfig = {
    response_mime_type: 'application/json',
    temperature,
    maxOutputTokens: MAX_TOKENS_SALIDA,
  };
  if (nivelRazonamiento) {
    generationConfig.thinkingConfig = { thinkingLevel: nivelRazonamiento };
  }

  const payload = {
    contents: [{ parts: [{ text: promptTexto }, ...partesImagen] }],
    generationConfig,
  };

  const controlador = new AbortController();
  const temporizador = setTimeout(() => controlador.abort(), timeoutMs);

  try {
    let response;
    try {
      response = await fetch(endpoint, {
        method: 'POST',
        headers: construirEncabezados(apiKey),
        body: JSON.stringify(payload),
        signal: controlador.signal,
      });
    } catch (errorRed) {
      if (errorRed?.name === 'AbortError') {
        throw new GeminiError(`sin respuesta en ${Math.round(timeoutMs / 1000)} s`, {
          status: 'TIMEOUT',
        });
      }
      throw new GeminiError('fallo de red', { status: 'RED' });
    }

    if (!response.ok) {
      const textoError = await response.text();
      let mensajeServidor = textoError;
      let reason = null;
      let retryDelayMs = null;
      try {
        const cuerpo = JSON.parse(textoError)?.error || {};
        mensajeServidor = cuerpo.message || textoError;
        for (const detalle of Array.isArray(cuerpo.details) ? cuerpo.details : []) {
          const tipo = String(detalle?.['@type'] || '');
          if (tipo.endsWith('ErrorInfo') && detalle.reason) reason = detalle.reason;
          if (tipo.endsWith('RetryInfo')) retryDelayMs = convertirRetryDelayAMs(detalle.retryDelay);
        }
      } catch {
        // cuerpo no JSON: se usa el texto tal cual
      }
      const error = new GeminiError(String(mensajeServidor).slice(0, 200), {
        status: response.status,
      });
      error.detalle = String(textoError);
      error.reason = reason;
      error.retryDelayMs = retryDelayMs;
      throw error;
    }

    const data = await response.json();

    if (data?.promptFeedback?.blockReason) {
      throw new GeminiError('contenido bloqueado', { status: 'SEGURIDAD' });
    }
    const candidato = data?.candidates?.[0];
    if (FINISH_REASONS_BLOQUEO.has(candidato?.finishReason)) {
      throw new GeminiError('respuesta bloqueada', { status: 'SEGURIDAD' });
    }
    if (candidato?.finishReason === 'MAX_TOKENS') {
      throw new GeminiError('respuesta cortada', { status: 'CORTADO' });
    }

    const textoRespuesta =
      candidato?.content?.parts
        ?.filter((part) => part?.thought !== true)
        .map((part) => part.text || '')
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
 * Clasifica un fallo en su clase de reintento (Spec 021, RF-2).
 * @param {GeminiError} error
 * @returns {'SATURACION'|'LIMITE'|'TIMEOUT'|'INCOMPLETA'|'CLAVE'|'PERMISO'|'SEGURIDAD'|'RAZONAMIENTO_NO_SOPORTADO'|'OTRO'}
 */
export const clasificarFallo = (error) => {
  const status = error?.status;
  const detalle = String(error?.detalle || error?.message || '');
  if (status === 401) return 'CLAVE';
  if (status === 400) {
    if (error?.reason === 'API_KEY_INVALID' || /api key/i.test(detalle)) return 'CLAVE';
    if (/thinking[_ ]?(config|level)|thinkingLevel/i.test(detalle)) return 'RAZONAMIENTO_NO_SOPORTADO';
    return 'OTRO';
  }
  if (status === 403) return 'PERMISO';
  if (status === 429) return 'LIMITE';
  if ([500, 502, 503, 504, 'RED'].includes(status)) return 'SATURACION';
  if (status === 'TIMEOUT') return 'TIMEOUT';
  if (['JSON', 'VACIO', 'CORTADO'].includes(status)) return 'INCOMPLETA';
  if (status === 'SEGURIDAD') return 'SEGURIDAD';
  return 'OTRO';
};

const MENSAJES_POR_CLASE = {
  CLAVE: 'Tu clave de Gemini no es válida o no tiene permiso. Revísala en Configuración.',
  PERMISO: 'Tu clave de Gemini no es válida o no tiene permiso. Revísala en Configuración.',
  LIMITE:
    'Llegaste al límite de uso de tu clave de Gemini. Espera un minuto o revisa tu plan en Google AI Studio.',
  SATURACION: 'Gemini está saturado en este momento. Inténtalo de nuevo en unos minutos.',
  TIMEOUT: 'Gemini está saturado en este momento. Inténtalo de nuevo en unos minutos.',
  INCOMPLETA: 'Gemini devolvió una respuesta incompleta. Inténtalo de nuevo.',
  OTRO: 'No se pudo completar el análisis. Inténtalo de nuevo en unos minutos.',
};

/**
 * Frase para el usuario según los fallos (Spec 021, RF-6). Nunca incluye modelos, códigos ni la clave.
 * @param {Array<{clase: string}>} fallos
 * @param {'comida'|'fisico'|'comparacion'|'estudio'} contexto
 * @returns {string}
 */
export const mensajeParaUsuario = (fallos = [], contexto = 'comida') => {
  const prioritaria = ['CLAVE', 'PERMISO', 'SEGURIDAD'].find((clase) =>
    fallos.some((f) => f.clase === clase)
  );
  // Si TODOS los intentos fallaron por red, el problema es la conexión del usuario, no Gemini.
  if (!prioritaria && fallos.length > 0 && fallos.every((f) => f.status === 'RED')) {
    return 'No hay conexión a internet. Revisa tu red e inténtalo de nuevo.';
  }
  const clase = prioritaria || fallos[fallos.length - 1]?.clase || 'SATURACION';
  if (clase === 'SEGURIDAD') {
    return contexto === 'estudio'
      ? 'Gemini no pudo procesar este resumen.'
      : 'Gemini no pudo analizar esta imagen.';
  }
  return MENSAJES_POR_CLASE[clase] || MENSAJES_POR_CLASE.OTRO;
};

const esperarMs = (ms) => new Promise((resolver) => setTimeout(resolver, ms));
const ENTORNO_POR_DEFECTO = { esperar: esperarMs, ahora: () => Date.now(), aleatorio: Math.random };

/**
 * Motor único de failover con reintentos y tope de tiempo (Spec 021, RF-1/RF-2, plan §2).
 * @param {Object} params
 * @param {string} params.apiKey - se recibe por parámetro; el motor no la relee ni la registra
 * @param {'comida'|'fisico'|'comparacion'|'estudio'} params.contexto
 * @param {(modelo: string) => {promptTexto: string, imagenesBase64?: string[], temperature?: number, nivelRazonamiento?: string|null}} params.construirPeticion
 * @param {(json: Object, modelo: string) => any} params.interpretar - lanza GeminiError status 'JSON' si la respuesta está incompleta
 * @param {Function} [params.onProgreso]
 * @param {number} [params.timeoutMs]
 * @param {{esperar?: Function, ahora?: Function, aleatorio?: Function}} [params.entorno]
 */
const ejecutarConFailover = async ({
  apiKey,
  contexto,
  construirPeticion,
  interpretar,
  onProgreso,
  timeoutMs = TIMEOUT_POR_PETICION_MS,
  entorno = {},
}) => {
  const { esperar, ahora, aleatorio } = { ...ENTORNO_POR_DEFECTO, ...entorno };
  const politica = POLITICA_REINTENTOS;
  const modelos = obtenerModelos();
  const inicio = ahora();
  const fallos = [];
  let permisosFallidos = 0;

  const terminar = () => {
    const ultimo = fallos[fallos.length - 1];
    throw new GeminiError(mensajeParaUsuario(fallos, contexto), {
      status: ultimo?.status ?? 'FALLO_TOTAL',
      fallos,
    });
  };

  for (let i = 0; i < modelos.length; i += 1) {
    const modelo = modelos[i];
    onProgreso?.({
      modelo,
      indice: i + 1,
      total: modelos.length,
      falloAnterior: i > 0 ? fallos[fallos.length - 1] : undefined,
    });

    let reintentosHechos = 0;
    let usarRazonamiento = !modelosSinRazonamiento.has(modelo);

    // Bucle de intentos sobre el MISMO modelo.
    for (;;) {
      const restante = politica.presupuestoTotalMs - (ahora() - inicio);
      if (restante < politica.minimoRestanteMs) terminar();

      const peticion = construirPeticion(modelo);
      try {
        const json = await ejecutarLlamadaGemini({
          modelo,
          apiKey,
          promptTexto: peticion.promptTexto,
          imagenesBase64: peticion.imagenesBase64 || [],
          temperature: peticion.temperature,
          nivelRazonamiento: usarRazonamiento ? peticion.nivelRazonamiento ?? null : null,
          timeoutMs: Math.min(timeoutMs, restante),
        });
        return interpretar(json, modelo);
      } catch (error) {
        const clase = clasificarFallo(error);

        if (clase === 'RAZONAMIENTO_NO_SOPORTADO' && usarRazonamiento) {
          modelosSinRazonamiento.add(modelo);
          usarRazonamiento = false;
          continue; // no consume reintentos
        }

        fallos.push({
          modelo,
          status: error?.status ?? 'DESCONOCIDO',
          clase,
          // Nunca se guarda la clave aunque el servidor la repita (Spec 021, RF-6).
          mensaje: apiKey
            ? String(error?.message || 'error desconocido').split(apiKey).join('***')
            : String(error?.message || 'error desconocido'),
        });

        if (clase === 'CLAVE' || clase === 'SEGURIDAD') terminar();
        if (clase === 'PERMISO') {
          permisosFallidos += 1;
          if (permisosFallidos >= 2) terminar();
          break;
        }

        let espera = null;
        if (clase === 'SATURACION' && reintentosHechos < politica.reintentosSaturacion) {
          const variacion = 1 + (aleatorio() * 2 - 1) * politica.jitter;
          espera = Math.round(
            politica.baseMs * Math.pow(politica.factor, reintentosHechos) * variacion
          );
        } else if (
          clase === 'LIMITE' &&
          reintentosHechos === 0 &&
          Number.isFinite(error?.retryDelayMs) &&
          error.retryDelayMs <= politica.maxRetryDelayMs
        ) {
          espera = error.retryDelayMs;
        }

        if (espera === null) break; // siguiente modelo
        if (ahora() - inicio + espera + politica.minimoRestanteMs > politica.presupuestoTotalMs) {
          break;
        }

        onProgreso?.({
          modelo,
          indice: i + 1,
          total: modelos.length,
          reintento: reintentosHechos + 1,
          motivo: clase,
        });
        await esperar(espera);
        reintentosHechos += 1;
      }
    }
  }

  terminar();
  return undefined;
};

/** Error de respuesta incompleta, que el motor clasifica como INCOMPLETA. */
const respuestaIncompleta = (motivo) =>
  new GeminiError(`respuesta incompleta: ${motivo}`, { status: 'JSON' });

const redondear1 = (valor) => Math.round((Number(valor) || 0) * 10) / 10;

/**
 * Normaliza la respuesta de comida (Spec 021, RF-3): solo valida el esquema.
 * Acepta 0 kcal (agua, café, foto sin comida) y el alias `caloriasTotales`.
 */
const interpretarComida = (resultado, modelo, tipoComida) => {
  const caloriasBrutas = resultado?.calorias ?? resultado?.caloriasTotales;
  const esNumerico =
    typeof caloriasBrutas === 'number' ||
    (typeof caloriasBrutas === 'string' && caloriasBrutas.trim() !== '');
  const calorias = Number(caloriasBrutas);
  if (!esNumerico || !Number.isFinite(calorias) || calorias < 0) {
    throw respuestaIncompleta('calorías');
  }

  const nombreFinal = String(
    resultado?.nombre || resultado?.nombrePlatillo || resultado?.descripcion || `${tipoComida} analizada`
  ).trim();
  const proteinas = redondear1(resultado?.proteinas ?? resultado?.macros?.proteinas);
  const carbohidratos = redondear1(resultado?.carbohidratos ?? resultado?.macros?.carbohidratos);
  const grasas = redondear1(resultado?.grasas ?? resultado?.macros?.grasas);

  return {
    nombre: nombreFinal,
    descripcion: nombreFinal,
    calorias: Math.round(calorias),
    proteinas,
    carbohidratos,
    grasas,
    macros: { proteinas, carbohidratos, grasas },
    detalles: String(resultado?.detalles || '').trim(),
    modeloUsado: modelo,
  };
};

/**
 * Analiza una imagen de comida en Base64 usando la API REST de Gemini Vision.
 * Recorre la cadena de modelos (principal + respaldos) hasta que uno responda.
 * Defensa 6 (Spec 010): carga automáticamente el perfil biométrico del usuario si no viene en opciones.
 */
export const analizarComidaConGemini = async (
  base64Image,
  tipoComida = 'Comida',
  opciones = {}
) => {
  const {
    descripcionUsuario = '',
    onProgreso,
    timeoutMs = TIMEOUT_POR_PETICION_MS,
  } = opciones;
  const apiKey = await obtenerApiKeyActiva();

  if (!base64Image || typeof base64Image !== 'string') {
    throw new GeminiError('No se recibió una imagen válida en formato Base64.');
  }

  const perfil = opciones?.perfilUsuario || (await cargarPerfilUsuario());
  const edadInfo = calcularEdadExacta(
    new Date(),
    perfil?.fechaNacimiento || PERFIL_USUARIO_BASE.fechaNacimiento
  );
  const tiempoInfo = calcularTiempoEntrenando(
    new Date(),
    perfil?.fechaInicioEntreno || PERFIL_USUARIO_BASE.fechaInicioEntreno
  );

  const contextoPerfil = {
    sexo: perfil?.sexo || PERFIL_USUARIO_BASE.sexo,
    edadTexto: edadInfo.texto,
    alturaCm: Number(perfil?.alturaCm) || PERFIL_USUARIO_BASE.alturaCm,
    pesoKgActual:
      Number(perfil?.pesoKgActual) ||
      Number(perfil?.pesoKgBase) ||
      PERFIL_USUARIO_BASE.pesoKgBase,
    tiempoEntrenandoTexto: tiempoInfo.texto,
    objetivo: perfil?.objetivo || PERFIL_USUARIO_BASE.objetivo,
  };

  const base64Limpio = base64Image.replace(/^data:image\/[a-zA-Z+]+;base64,/, '');
  const promptTexto = construirPromptAltaPrecision(
    tipoComida,
    contextoPerfil,
    descripcionUsuario
  );

  return ejecutarConFailover({
    apiKey,
    contexto: 'comida',
    construirPeticion: () => ({
      promptTexto,
      imagenesBase64: [base64Limpio],
      temperature: 0.1,
      nivelRazonamiento: NIVEL_RAZONAMIENTO.comida,
    }),
    interpretar: (json, modelo) => interpretarComida(json, modelo, tipoComida),
    onProgreso,
    timeoutMs,
    entorno: opciones.entorno,
  });
};

/**
 * Analiza entre 1 y 10 fotografías de cambio físico con Gemini Vision tomando en cuenta
 * todos los datos biológicos y registros diarios del usuario (RF-11, RF-12).
 */
export const analizarCambioFisicoConGemini = async (
  imagenesBase64,
  contextoUsuario = {},
  opciones = {}
) => {
  const { onProgreso, timeoutMs = TIMEOUT_POR_PETICION_MS } = opciones;
  const apiKey = await obtenerApiKeyActiva();

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
  return ejecutarConFailover({
    apiKey,
    contexto: 'fisico',
    construirPeticion: () => ({
      promptTexto,
      imagenesBase64: fotosLimpias,
      temperature: 0.2,
      nivelRazonamiento: NIVEL_RAZONAMIENTO.fisico,
    }),
    interpretar: interpretarCambioFisico,
    onProgreso,
    timeoutMs,
    entorno: opciones.entorno,
  });
};

/**
 * Valida un veredicto 0-10: número, o texto numérico no vacío. null/undefined/'' no son válidos.
 * @returns {number|null}
 */
const leerVeredicto = (valor) => {
  const esCandidato =
    typeof valor === 'number' || (typeof valor === 'string' && valor.trim() !== '');
  const numero = Number(valor);
  if (!esCandidato || !Number.isFinite(numero) || numero < 0 || numero > 10) return null;
  return Math.round(numero * 10) / 10;
};

/** Spec 021, RF-3: sin veredicto válido o sin resumen, la respuesta es incompleta (ya no se inventa 7.5). */
const interpretarCambioFisico = (resultado, modelo) => {
  const veredicto = leerVeredicto(resultado?.veredicto);
  const resumenSimple = String(resultado?.resumenSimple || '').trim();
  if (veredicto === null) throw respuestaIncompleta('veredicto');
  if (!resumenSimple) throw respuestaIncompleta('resumenSimple');

  const puntosClave = Array.isArray(resultado?.puntosClave)
    ? resultado.puntosClave
        .map((p) => String(p || '').trim())
        .filter(Boolean)
        .slice(0, 5)
    : [];

  return {
    resumenSimple,
    resumenDetallado: String(resultado?.resumenDetallado || '').trim() || resumenSimple,
    balanceDelDia:
      String(resultado?.balanceDelDia || '').trim() ||
      'Mantén el registro de tus comidas y entrenamientos del día para optimizar tu objetivo.',
    veredicto,
    puntosClave,
    modeloUsado: modelo,
  };
};

/**
 * Compara bajo demanda el registro físico actual contra el registro anterior (RF-14, RF-15, Spec 010).
 */
export const compararCambioFisicoConGemini = async (
  {
    registroActual,
    registroAnterior,
    imagenesActualesBase64 = [],
    perfilUsuario = null,
  } = {},
  opciones = {}
) => {
  const { onProgreso, timeoutMs = TIMEOUT_POR_PETICION_MS } = opciones;
  const apiKey = await obtenerApiKeyActiva();

  if (!registroActual || !registroAnterior) {
    throw new GeminiError(
      'Se requieren tanto el registro actual como un registro anterior para realizar la comparación.'
    );
  }

  const perfilActivo =
    perfilUsuario || opciones?.perfilUsuario || (await cargarPerfilUsuario());

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
    fotosLimpias.length,
    perfilActivo
  );
  return ejecutarConFailover({
    apiKey,
    contexto: 'comparacion',
    construirPeticion: () => ({
      promptTexto,
      imagenesBase64: fotosLimpias,
      temperature: 0.2,
      nivelRazonamiento: NIVEL_RAZONAMIENTO.comparacion,
    }),
    interpretar: interpretarComparacion,
    onProgreso,
    timeoutMs,
    entorno: opciones.entorno,
  });
};

/** Spec 021, RF-3: sin `evolucion` la comparación es incompleta (ya no se inventa un texto). */
const interpretarComparacion = (resultado, modelo) => {
  const evolucion = String(resultado?.evolucion || '').trim();
  if (!evolucion) throw respuestaIncompleta('evolucion');

  const recomendaciones = Array.isArray(resultado?.recomendacionesOptimizacion)
    ? resultado.recomendacionesOptimizacion
        .map((r) => String(r || '').trim())
        .filter(Boolean)
        .slice(0, 5)
    : [];

  return {
    evolucion,
    recomendacionesOptimizacion:
      recomendaciones.length > 0
        ? recomendaciones
        : [
            'Mantén un control constante de proteína diaria y sobrecarga progresiva en tus entrenamientos.',
          ],
    modeloUsado: modelo,
  };
};


/**
 * Construye el prompt para la evaluación pedagógica del día de estudio con Gemini (Spec 016).
 * No contiene emojis.
 * @param {Object} contexto
 * @param {{ edadTexto: string, fechaLegible: string, hora12h: string }} perfilTexto
 * @returns {string}
 */
export function construirPromptEstudioDelDia(contexto, perfilTexto = {}) {
  const { edadTexto = 'Desconocida', fechaLegible = '', hora12h = '' } =
    perfilTexto;

  const sesionesHoy = contexto?.sesionesHoy || [];
  const sesionesPrevias = contexto?.sesionesPrevias || [];
  const minutosTotales = contexto?.minutosTotales || 0;

  const sesionesHoyTexto = sesionesHoy
    .map((s, idx) => {
      const i = idx + 1;
      return `${i}. [${s.categoria}] ${s.materia} — Tema: "${s.tema}"
   Duración: ${s.minutos} min | Comprensión declarada por el usuario: ${s.comprension}
   Apuntes:
   """
   ${s.apuntes}
   """`;
    })
    .join('\n\n');

  const minutosPorMateriaTexto =
    (contexto?.materias || [])
      .map((m) => `${m.materia} (${m.categoria}): ${m.minutos} min`)
      .join(' | ') || 'Ninguna';

  let bloqueHistorialPrevio = '';
  if (sesionesPrevias.length > 0) {
    const lineas = sesionesPrevias
      .map(
        (s) =>
          `- ${s.fecha} | [${s.categoria}] ${s.materia} | "${s.tema}" | ${s.minutos} min | Comprensión: ${s.comprension}`
      )
      .join('\n');
    bloqueHistorialPrevio = `HISTORIAL DE ESTUDIO DE LOS ÚLTIMOS 7 DÍAS (sin hoy, sin apuntes) — úsalo solo para dar contexto:
${lineas}
`;
  }

  const instruccionHistorial =
    sesionesPrevias.length > 0
      ? 'Relaciona lo de hoy con los últimos 7 días: temas que se repiten, temas que siguen con comprensión baja, materias abandonadas y constancia del hábito.'
      : 'Es el primer registro de estudio disponible; no hagas comparaciones con días anteriores.';

  return `Actúa como un pedagogo experto en ciencias del aprendizaje, técnicas de estudio basadas en evidencia (recuperación activa, repetición espaciada, interleaving, técnica Feynman) y acompañamiento académico.
Estás evaluando el día de estudio del usuario de hoy (${fechaLegible}), registrado a las ${hora12h}.

PERFIL DEL USUARIO:
- Edad exacta: ${edadTexto}

SESIONES DE ESTUDIO DE HOY (${sesionesHoy.length}) — fuente principal del análisis:
${sesionesHoyTexto}

TOTALES CALCULADOS POR LA APP (no los recalcules ni los cambies):
- Minutos totales de hoy: ${minutosTotales}
- Minutos por materia: ${minutosPorMateriaTexto}

${bloqueHistorialPrevio}
INSTRUCCIONES DE EVALUACIÓN:
1. Analiza únicamente la información anterior. No inventes sesiones, temas, materias, minutos ni contenido que no aparezca en los datos.
2. Evalúa la comprensión real de cada tema contrastando la comprensión declarada con la calidad, profundidad y coherencia de sus apuntes (definiciones correctas, ejemplos, conexiones entre ideas, errores conceptuales visibles).
3. ${instruccionHistorial}
4. Redacta "resumenSimple": 2 a 3 oraciones claras, directas y motivadoras sobre el día de estudio.
5. Redacta "resumenDetallado": análisis completo por materia y tema (qué se estudió, nivel real de dominio según los apuntes, vacíos detectados y relación con el historial si existe).
6. Asigna "veredicto" de 0 a 10 (número, máximo 1 decimal) que califique de forma realista el día de estudio, considerando tiempo invertido, comprensión, calidad de los apuntes y constancia.
7. "temasDominados": temas de hoy que el usuario domina según su comprensión declarada y sus apuntes.
8. "temasPorRepasar": temas de hoy con comprensión "Más o menos", "No tanto" o "Nada", y también temas declarados como "Bien" cuyos apuntes muestren vacíos o errores. En "comprension" pon la comprensión que declaró el usuario para ese tema. Para cada uno, "sugerencia" debe ser una técnica concreta y accionable para repasarlo (por ejemplo: "Haz 5 tarjetas de recuperación activa con las fórmulas de derivadas y repásalas mañana y en 3 días").
9. "puntosClave": 3 observaciones cortas y concretas del día.
10. "recomendacionesManana": 3 acciones concretas para la próxima sesión de estudio.
11. Escribe en español neutro, sin emojis.

Devuelve ÚNICAMENTE un objeto JSON válido (sin bloques markdown ni texto adicional) con esta estructura exacta:
{
  "resumenSimple": "2 a 3 oraciones sobre el día de estudio.",
  "resumenDetallado": "Análisis completo por materia y tema.",
  "veredicto": 7.8,
  "minutosTotales": ${minutosTotales},
  "materias": [{ "materia": "Nombre", "categoria": "Escuela", "minutos": 0 }],
  "temasDominados": ["Tema dominado"],
  "temasPorRepasar": [{ "materia": "Nombre", "tema": "Tema", "comprension": "No tanto", "sugerencia": "Técnica concreta para repasarlo." }],
  "puntosClave": ["Punto 1", "Punto 2", "Punto 3"],
  "recomendacionesManana": ["Acción 1", "Acción 2", "Acción 3"]
}
"comprension" solo puede ser "Bien", "Más o menos", "No tanto" o "Nada". Si no hay temas por repasar o dominados, devuelve arreglos vacíos.`;
}

/**
 * Analiza las sesiones del día de estudio usando Gemini con failover de modelos (Spec 016).
 * @param {Object} contexto
 * @param {Object} [opciones={}]
 * @returns {Promise<{ resultado: Object, modeloUsado: string, hora12h: string }>}
 */
export const analizarEstudioDelDiaConGemini = async (
  contexto,
  opciones = {}
) => {
  const { onProgreso, timeoutMs = TIMEOUT_POR_PETICION_MS } = opciones;

  if (!contexto?.sesionesHoy || contexto.sesionesHoy.length === 0) {
    throw new GeminiError('No hay sesiones de estudio hoy para analizar.');
  }

  const apiKey = await obtenerApiKeyActiva();

  const perfil = opciones?.perfilUsuario || (await cargarPerfilUsuario());
  const edadInfo = calcularEdadExacta(
    new Date(),
    perfil?.fechaNacimiento || PERFIL_USUARIO_BASE.fechaNacimiento
  );
  const fechaLegible =
    formatearFechaLegible(contexto.fechaHoy) || contexto.fechaHoy;
  const hora12h = formatearHora12h();

  const promptTexto = construirPromptEstudioDelDia(contexto, {
    edadTexto: edadInfo.texto,
    fechaLegible,
    hora12h,
  });

  return ejecutarConFailover({
    apiKey,
    contexto: 'estudio',
    construirPeticion: () => ({
      promptTexto,
      temperature: 0.3,
      nivelRazonamiento: NIVEL_RAZONAMIENTO.estudio,
    }),
    interpretar: (json, modelo) => {
      const resultado = normalizarResumenEstudio(json, contexto);
      if (!resultado) throw respuestaIncompleta('resumen de estudio');
      return { resultado, modeloUsado: modelo, hora12h };
    },
    onProgreso,
    timeoutMs,
    entorno: opciones.entorno,
  });
};
