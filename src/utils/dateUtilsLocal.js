/**
 * Utilidades de Calendario y Fechas Locales Estrictas (Spec 004 / AGENTS.md).
 * Prohibido el uso de toISOString() o new Date("YYYY-MM-DD") para evitar desajustes de zona horaria (UTC).
 */

export const NOMBRES_MESES = [
  'ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN',
  'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC',
];

export const NOMBRES_MESES_COMPLETOS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

export const DIAS_SEMANA_CORTO = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

export const DIAS_SEMANA_COMPLETOS = [
  'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo',
];

/**
 * Obtiene la fecha local actual en formato YYYY-MM-DD sin desfase UTC.
 * @param {Date} [fecha=new Date()]
 * @returns {string} Fecha local 'YYYY-MM-DD'
 */
export function obtenerFechaLocal(fecha = new Date()) {
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${anio}-${mes}-${dia}`;
}

/**
 * Descompone una cadena 'YYYY-MM-DD' en enteros de año, mes (1-12) y día (1-31).
 * @param {string} fechaStr
 * @returns {{ anio: number, mes: number, dia: number, monthIndex: number }}
 */
export function parsearFechaLocal(fechaStr) {
  if (!fechaStr || typeof fechaStr !== 'string') {
    const hoy = new Date();
    return {
      anio: hoy.getFullYear(),
      mes: hoy.getMonth() + 1,
      dia: hoy.getDate(),
      monthIndex: hoy.getMonth(),
    };
  }

  const [anioStr, mesStr, diaStr] = fechaStr.split('-');
  const anio = parseInt(anioStr, 10) || new Date().getFullYear();
  const mes = parseInt(mesStr, 10) || 1;
  const dia = parseInt(diaStr, 10) || 1;

  return {
    anio,
    mes,
    dia,
    monthIndex: Math.max(0, Math.min(11, mes - 1)),
  };
}

/**
 * Retorna la cantidad de días de un mes específico con manejo exacto de años bisiestos.
 * @param {number} year
 * @param {number} monthIndex (0 = Enero, 11 = Diciembre)
 * @returns {number}
 */
export function obtenerDiasEnMes(year, monthIndex) {
  return new Date(year, monthIndex + 1, 0).getDate();
}

/**
 * Retorna el índice del primer día de la semana para un mes (0 = Lunes, 6 = Domingo).
 * Corrección de revisor-crítico: (date.getDay() + 6) % 7
 * @param {number} year
 * @param {number} monthIndex
 * @returns {number}
 */
export function obtenerPrimerDiaSemana(year, monthIndex) {
  const primerDiaDate = new Date(year, monthIndex, 1);
  return (primerDiaDate.getDay() + 6) % 7;
}

/**
 * Genera la matriz de celdas para un mes de 7 columnas (Lunes a Domingo).
 * Incluye celdas vacías al inicio para preservar la alineación del día 1.
 * 
 * @param {number} year
 * @param {number} monthIndex (0 a 11)
 * @returns {Array<{ dia: number|null, fechaStr: string|null, esVacio: boolean }>}
 */
export function generarMatrizMes(year, monthIndex) {
  const offsetInicial = obtenerPrimerDiaSemana(year, monthIndex);
  const totalDias = obtenerDiasEnMes(year, monthIndex);

  const celdas = [];

  // 1. Celdas vacías previas al día 1
  for (let i = 0; i < offsetInicial; i += 1) {
    celdas.push({
      dia: null,
      fechaStr: null,
      esVacio: true,
    });
  }

  // 2. Días reales del mes
  const mesPadded = String(monthIndex + 1).padStart(2, '0');
  for (let dia = 1; dia <= totalDias; dia += 1) {
    const diaPadded = String(dia).padStart(2, '0');
    celdas.push({
      dia,
      fechaStr: `${year}-${mesPadded}-${diaPadded}`,
      esVacio: false,
    });
  }

  return celdas;
}

/**
 * Formatea una fecha 'YYYY-MM-DD' a texto legible en español.
 * Ej: "Lunes, 12 de Mayo de 2026"
 * @param {string} fechaStr
 * @returns {string}
 */
export function formatearFechaLegible(fechaStr) {
  if (!fechaStr) return '';
  const { anio, monthIndex, dia } = parsearFechaLocal(fechaStr);
  const fechaObj = new Date(anio, monthIndex, dia);
  const indiceDiaSemana = (fechaObj.getDay() + 6) % 7;

  const nombreDia = DIAS_SEMANA_COMPLETOS[indiceDiaSemana] || '';
  const nombreMes = NOMBRES_MESES_COMPLETOS[monthIndex] || '';

  return `${nombreDia}, ${dia} de ${nombreMes} de ${anio}`;
}

/**
 * Determina en O(1) si una fecha es futura comparada con la fecha de hoy.
 * @param {string} fechaStr
 * @param {string} fechaHoyStr
 * @returns {boolean}
 */
export function esFechaFutura(fechaStr, fechaHoyStr) {
  if (!fechaStr || !fechaHoyStr) return false;
  return fechaStr > fechaHoyStr;
}
