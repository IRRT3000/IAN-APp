/**
 * Motor Matemático y Proporcional del "Vaso de Agua" (Spec 004).
 * Evalúa el llenado diario (0.0 a 1.0) combinando nutrición (50%) y entrenamiento o descanso (50%).
 * Fotos de progreso se tratan como insignia sin penalizar el score.
 */

/**
 * Calcula el llenado del Vaso de Agua para una fecha dada (0.0 a 1.0).
 * 
 * @param {Object} [resumenDia={}]
 * @param {number} [resumenDia.comidasCount=0] - Cantidad de comidas registradas (0 a 3+)
 * @param {boolean} [resumenDia.hasWorkout=false] - Si hubo al menos un ejercicio completado
 * @param {boolean} [resumenDia.isRestDay=false] - Si la fecha fue marcada como día de descanso
 * @returns {number} Score continuo entre 0.0 y 1.0 (redondeado a 2 decimales)
 */
export function calcularScoreVaso(resumenDia = {}) {
  if (!resumenDia || typeof resumenDia !== 'object') {
    return 0.0;
  }

  const { comidasCount = 0, hasWorkout = false, isRestDay = false } = resumenDia;

  let score = 0;

  // 1. Nutrición: hasta 0.50 (proporcional: ~0.1667 por comida hasta 3)
  const countNumerico = Math.max(0, Number(comidasCount) || 0);
  const proporcionComidas = Math.min(countNumerico / 3, 1.0);
  score += proporcionComidas * 0.50;

  // 2. Gimnasio o Descanso Muscular: 0.50 sin penalización
  if (Boolean(hasWorkout) || Boolean(isRestDay)) {
    score += 0.50;
  }

  const scoreFinal = Math.min(Number(score.toFixed(2)), 1.0);
  return Math.max(0.0, scoreFinal);
}

/**
 * Mapea el score continuo (0.0 a 1.0) a uno de los 5 niveles de color visual (0 a 4).
 * - Nivel 0: score === 0.0 (vacío)
 * - Nivel 1: 0.0 < score <= 0.35 (tenue)
 * - Nivel 2: 0.35 < score <= 0.65 (medio)
 * - Nivel 3: 0.65 < score < 1.0 (intenso)
 * - Nivel 4: score >= 1.0 (vaso lleno 100%)
 * 
 * @param {number} score
 * @returns {number} Nivel entero entre 0 y 4
 */
export function obtenerNivelColor(score) {
  const num = Number(score) || 0;
  if (num <= 0) return 0;
  if (num <= 0.35) return 1;
  if (num <= 0.65) return 2;
  if (num < 1.0) return 3;
  return 4;
}

/**
 * Paleta de colores para los 5 niveles del Vaso de Agua.
 * Basado en el verde primario del tema (#00E676).
 */
export const PALETA_NIVELES_VASO = {
  0: {
    fondo: '#262626',
    borde: '#333333',
    etiqueta: '0% Vacío',
    descripcion: 'Sin actividad',
  },
  1: {
    fondo: 'rgba(0, 230, 118, 0.30)',
    borde: 'rgba(0, 230, 118, 0.45)',
    etiqueta: '17% - 33%',
    descripcion: 'Progreso inicial',
  },
  2: {
    fondo: 'rgba(0, 230, 118, 0.60)',
    borde: 'rgba(0, 230, 118, 0.75)',
    etiqueta: '50% - 66%',
    descripcion: 'Medio vaso',
  },
  3: {
    fondo: 'rgba(0, 230, 118, 0.85)',
    borde: '#00E676',
    etiqueta: '67% - 83%',
    descripcion: 'Casi lleno',
  },
  4: {
    fondo: '#00E676',
    borde: '#69F0AE',
    etiqueta: '100% Vaso Lleno',
    descripcion: 'Meta diaria cumplida',
  },
};
