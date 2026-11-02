/**
 * Utilidades puras de validación y saneamiento para registros de comida.
 * Spec 018: Análisis Nutricional Contextual y de Alta Precisión.
 *
 * Normaliza y sanea los valores de una comida editada manualmente o devuelta por IA.
 * Protege contra valores NaN, negativos, comas decimales europeas/latinas y nombres vacíos.
 */

function normalizarNumero(valor, esEntero = false) {
  if (valor === null || valor === undefined) return 0;
  const num = Number(String(valor).replace(',', '.').trim());
  if (!Number.isFinite(num)) return 0;
  if (esEntero) {
    return Math.max(0, Math.round(num));
  }
  return Math.max(0, Math.round(num * 10) / 10);
}

/**
 * Normaliza y sanea los valores de una comida editada manualmente o devuelta por IA.
 * @param {Object} valores
 * @returns {Object} Valores normalizados con números >= 0 y strings limpios.
 */
export function sanearValoresComida({
  nombre = '',
  nombreDefault = 'Comida registrada',
  calorias = 0,
  proteinas = 0,
  carbohidratos = 0,
  grasas = 0,
  detalles = '',
} = {}) {
  const nombreLimpio =
    String(nombre || '').trim() ||
    String(nombreDefault || 'Comida registrada').trim();

  return {
    nombre: nombreLimpio,
    calorias: normalizarNumero(calorias, true),
    proteinas: normalizarNumero(proteinas, false),
    carbohidratos: normalizarNumero(carbohidratos, false),
    grasas: normalizarNumero(grasas, false),
    detalles: String(detalles || '').trim(),
  };
}
