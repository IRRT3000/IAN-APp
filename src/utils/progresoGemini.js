/**
 * Texto de progreso de un análisis con Gemini (Spec 021, plan §6).
 * Los eventos de reintento traen `reintento` y `motivo`; los de cambio de modelo traen `falloAnterior`.
 * @param {{ modelo?: string, indice?: number, total?: number, reintento?: number, motivo?: string, falloAnterior?: Object }} info
 * @param {string} textoNormal - texto a mostrar cuando no hay reintento ni fallo previo
 * @returns {string}
 */
export const textoProgresoGemini = (info = {}, textoNormal = 'Analizando...') => {
  if (info.reintento) {
    return info.motivo === 'LIMITE'
      ? 'Esperando el límite de uso de Gemini...'
      : `Gemini está saturado, reintentando (${info.reintento}/2)...`;
  }
  if (info.falloAnterior) {
    return `Probando otro modelo (${info.indice}/${info.total})...`;
  }
  return textoNormal;
};
