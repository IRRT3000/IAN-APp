/**
 * Etiquetas legibles para lectores de pantalla (Spec 026, RF-1 y RF-3).
 * Las fechas se construyen con componentes locales; prohibido new Date('YYYY-MM-DD') y toISOString().
 */
const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

const descomponer = (fechaLocal) => {
  if (typeof fechaLocal !== 'string') return null;
  const partes = fechaLocal.split('-').map(Number);
  if (partes.length !== 3 || partes.some((n) => !Number.isInteger(n))) return null;
  const [anio, mes, dia] = partes;
  const fecha = new Date(anio, mes - 1, dia);
  if (fecha.getFullYear() !== anio || fecha.getMonth() !== mes - 1 || fecha.getDate() !== dia) return null;
  return { anio, mes, dia, diaSemana: fecha.getDay() };
};

/** "viernes 27 de noviembre de 2026"; con opciones se omite el año o el día de la semana. */
export function etiquetaFecha(fechaLocal, { conAnio = true, conDiaSemana = true } = {}) {
  const f = descomponer(fechaLocal);
  if (!f) return '';
  const base = `${f.dia} de ${MESES[f.mes - 1]}`;
  const conDia = conDiaSemana ? `${DIAS[f.diaSemana]} ${base}` : base;
  return conAnio ? `${conDia} de ${f.anio}` : conDia;
}

/** Día del selector semanal: "viernes 27 de noviembre, hoy, con actividad". */
export function etiquetaDiaSelector({ fecha, esHoy = false, tieneActividad = false }) {
  // Si la fecha no es válida se usa tal cual, para que el control nunca quede sin nombre.
  const base = etiquetaFecha(fecha, { conAnio: false }) || String(fecha || '');
  if (!base) return '';
  return [base, esHoy && 'hoy', tieneActividad && 'con actividad'].filter(Boolean).join(', ');
}

/** Celda de calendario o heatmap: "viernes 27 de noviembre, hoy, actividad nivel 2 de 4". */
export function etiquetaCeldaHeatmap({ fecha, nivel = 0, esHoy = false, esFutura = false }) {
  // Si la fecha no es válida se usa tal cual, para que el control nunca quede sin nombre.
  const base = etiquetaFecha(fecha, { conAnio: false }) || String(fecha || '');
  if (!base) return '';
  if (esFutura) return `${base}, día futuro`;
  const nivelSeguro = Math.max(0, Math.min(4, Number(nivel) || 0));
  const actividad = nivelSeguro ? `actividad nivel ${nivelSeguro} de 4` : 'sin actividad';
  return [base, esHoy && 'hoy', actividad].filter(Boolean).join(', ');
}

/** Campo de una serie en Live Mode: "Peso en kilogramos, serie 2" / "Repeticiones, serie 2". */
export function etiquetaCampoSerie({ campo, serie, unidad = 'kg' }) {
  if (campo === 'repeticiones') return `Repeticiones, serie ${serie}`;
  return `Peso en ${unidad === 'lb' ? 'libras' : 'kilogramos'}, serie ${serie}`;
}
