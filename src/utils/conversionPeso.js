/**
 * Utilidades puras para la conversión y normalización de peso (Spec 013).
 * Conversión bidireccional Lbs ⟷ Kg con alta precisión y sanitización de entradas.
 * 
 * Reglas mandatorias:
 * - 1 lb = 0.45359237 kg
 * - 1 kg = 2.20462262 lbs
 * - Redondeo a 1 decimal (ej. Math.round(val * 10) / 10)
 * - Manejo seguro de entradas vacías, comas, múltiples puntos, ceros y negativos.
 * - Cero NaN bajo cualquier circunstancia.
 */

export const FACTOR_LBS_A_KG = 0.45359237;
export const FACTOR_KG_A_LBS = 2.20462262;

export const MODOS_CONVERSION = {
  LBS_A_KG: 'LBS_A_KG',
  KG_A_LBS: 'KG_A_LBS',
};

/**
 * Normaliza una cadena de entrada de peso:
 * - Acepta comas y puntos convirtiendo comas a puntos ("100,5" -> "100.5").
 * - Rechaza valores negativos retornando cadena vacía (pesos en gimnasio son estrictamente positivos).
 * - Descarta caracteres no numéricos excepto el separador decimal.
 * - Descarta múltiples puntos conservando solo la primera porción decimal ("10.5.2" -> "10.5").
 * - Trimea espacios en blanco.
 *
 * @param {string|number} inputStr
 * @returns {string} Cadena normalizada o vacía
 */
export function normalizarInputPeso(inputStr) {
  if (inputStr === null || inputStr === undefined) {
    return '';
  }

  const str = String(inputStr).trim().replace(/,/g, '.');
  if (str.includes('-')) {
    return '';
  }

  // Conservar solo dígitos y puntos
  const soloNumerosYPuntos = str.replace(/[^0-9.]/g, '');
  if (!soloNumerosYPuntos) {
    return '';
  }

  const partes = soloNumerosYPuntos.split('.');
  if (partes.length === 1) {
    return partes[0];
  }

  // Conserva solo el primer punto y su parte decimal inmediata, descartando puntos subsiguientes
  return `${partes[0]}.${partes[1]}`;
}

/**
 * Convierte un peso en Libras (lbs) a Kilogramos (kg) con redondeo a 1 decimal.
 * 1 lb = 0.45359237 kg.
 *
 * @param {number|string} lbs
 * @returns {number} Valor en kg redondeado a 1 decimal, o 0 si la entrada es inválida/no positiva
 */
export function convertirLbsAKg(lbs) {
  const normalizado = normalizarInputPeso(lbs);
  if (!normalizado) {
    return 0;
  }

  const num = Number(normalizado);
  if (isNaN(num) || num <= 0 || !isFinite(num)) {
    return 0;
  }

  return Math.round(num * FACTOR_LBS_A_KG * 10) / 10;
}

/**
 * Convierte un peso en Kilogramos (kg) a Libras (lbs) con redondeo a 1 decimal.
 * 1 kg = 2.20462262 lbs.
 *
 * @param {number|string} kg
 * @returns {number} Valor en lbs redondeado a 1 decimal, o 0 si la entrada es inválida/no positiva
 */
export function convertirKgALbs(kg) {
  const normalizado = normalizarInputPeso(kg);
  if (!normalizado) {
    return 0;
  }

  const num = Number(normalizado);
  if (isNaN(num) || num <= 0 || !isFinite(num)) {
    return 0;
  }

  return Math.round(num * FACTOR_KG_A_LBS * 10) / 10;
}

/**
 * Función principal unificada de conversión de peso.
 * Retorna un objeto descriptivo garantizando cero generación de NaN.
 *
 * @param {Object} opciones
 * @param {string|number} opciones.valor Valor a convertir
 * @param {string} [opciones.modo='LBS_A_KG'] 'LBS_A_KG' o 'KG_A_LBS'
 * @returns {{ valorOriginal: number, valorConvertido: number, unidadOrigen: string, unidadDestino: string, esValido: boolean }}
 */
export function convertirPeso(opciones = {}) {
  const { valor = '', modo = MODOS_CONVERSION.LBS_A_KG } = opciones || {};
  const normalizado = normalizarInputPeso(valor);

  const esLbsAKg = modo === MODOS_CONVERSION.LBS_A_KG || modo === 'lbs_a_kg';
  const unidadOrigen = esLbsAKg ? 'lbs' : 'kg';
  const unidadDestino = esLbsAKg ? 'kg' : 'lbs';

  if (!normalizado) {
    return {
      valorOriginal: 0,
      valorConvertido: 0,
      unidadOrigen,
      unidadDestino,
      esValido: false,
    };
  }

  const num = Number(normalizado);
  const esValido = !isNaN(num) && num > 0 && isFinite(num);

  if (!esValido) {
    return {
      valorOriginal: 0,
      valorConvertido: 0,
      unidadOrigen,
      unidadDestino,
      esValido: false,
    };
  }

  const valorConvertido = esLbsAKg ? convertirLbsAKg(num) : convertirKgALbs(num);

  return {
    valorOriginal: num,
    valorConvertido,
    unidadOrigen,
    unidadDestino,
    esValido: true,
  };
}
