/**
 * Progreso por ejercicio: 1RM estimado, historial por día y récords (Spec 030, RF-1).
 * Lógica pura: sin AsyncStorage ni objetos Date (las fechas son cadenas locales YYYY-MM-DD).
 */

export const REPS_MAX_1RM = 12;

const FECHA_VALIDA = /^\d{4}-\d{2}-\d{2}$/;

/** Número no negativo desde número o texto con coma o punto. NaN o negativos → 0. */
export const aNumero = (valor) => {
  const n = typeof valor === 'number' ? valor : Number(String(valor ?? '').replace(',', '.').trim());
  return Number.isFinite(n) && n > 0 ? n : 0;
};

const redondearMedio = (x) => Math.round(x * 2) / 2;

/** Fórmula de Epley, redondeada a 0,5 kg. 0 si no hay peso, reps o si reps > 12. */
export function estimar1RM(peso, reps) {
  const p = aNumero(peso);
  const r = Math.floor(aNumero(reps));
  if (p <= 0 || r <= 0 || r > REPS_MAX_1RM) return 0;
  if (r === 1) return p;
  return redondearMedio(p * (1 + r / 30));
}

export function normalizarNombre(nombre) {
  return String(nombre ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/** Series de un registro como números. El legado se expande a `series` series idénticas. */
export function seriesDeRegistro(registro) {
  if (Array.isArray(registro?.seriesDetalle) && registro.seriesDetalle.length > 0) {
    return registro.seriesDetalle.map((s) => ({
      peso: aNumero(s?.peso),
      repeticiones: Math.floor(aNumero(s?.repeticiones)),
    }));
  }
  const cantidad = Math.max(1, Math.floor(aNumero(registro?.series)));
  const serie = {
    peso: aNumero(registro?.peso),
    repeticiones: Math.floor(aNumero(registro?.repeticiones)),
  };
  return Array.from({ length: cantidad }, () => ({ ...serie }));
}

/** Mejor serie: mayor 1RM; si todas dan 0, mayor peso y luego más reps. */
const elegirMejorSerie = (series) =>
  series.reduce((mejor, s) => {
    if (!mejor) return s;
    const a = estimar1RM(s.peso, s.repeticiones);
    const b = estimar1RM(mejor.peso, mejor.repeticiones);
    if (a !== b) return a > b ? s : mejor;
    if (s.peso !== mejor.peso) return s.peso > mejor.peso ? s : mejor;
    return s.repeticiones > mejor.repeticiones ? s : mejor;
  }, null);

/** Métricas de un conjunto de series. */
export function resumirSeries(series) {
  const lista = Array.isArray(series) ? series : [];
  const mejorSerie = elegirMejorSerie(lista);
  return {
    pesoMaximo: lista.reduce((m, s) => Math.max(m, s.peso), 0),
    mejor1RM: lista.reduce((m, s) => Math.max(m, estimar1RM(s.peso, s.repeticiones)), 0),
    volumen: lista.reduce((acc, s) => acc + s.peso * s.repeticiones, 0),
    series: lista.length,
    mejorSerie: mejorSerie ? { ...mejorSerie } : null,
  };
}

/** Mapa nombre normalizado → historial por día (ascendente). Se calcula una sola vez. */
export function indexarHistoriales(entrenamientos) {
  const porNombre = new Map();
  (Array.isArray(entrenamientos) ? entrenamientos : []).forEach((registro) => {
    const clave = normalizarNombre(registro?.ejercicio);
    const fecha = registro?.fecha;
    if (!clave || typeof fecha !== 'string' || !FECHA_VALIDA.test(fecha)) return;
    const dias = porNombre.get(clave) ?? new Map();
    dias.set(fecha, [...(dias.get(fecha) ?? []), ...seriesDeRegistro(registro)]);
    porNombre.set(clave, dias);
  });
  const indice = new Map();
  porNombre.forEach((dias, clave) => {
    const historial = [...dias.entries()]
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([fecha, series]) => ({ fecha, ...resumirSeries(series) }));
    indice.set(clave, historial);
  });
  return indice;
}

export function historialEjercicio(entrenamientos, nombre) {
  const clave = normalizarNombre(nombre);
  if (!clave) return [];
  return indexarHistoriales(entrenamientos).get(clave) ?? [];
}

const mejorDe = (historial, campo) =>
  historial.reduce(
    (mejor, dia) => (!mejor || dia[campo] > mejor.valor ? { valor: dia[campo], fecha: dia.fecha } : mejor),
    null
  );

/** Récords del historial (empate: gana la fecha más antigua). null si está vacío. */
export function recordsEjercicio(historial) {
  if (!Array.isArray(historial) || historial.length === 0) return null;
  return {
    pesoMaximo: mejorDe(historial, 'pesoMaximo'),
    mejor1RM: mejorDe(historial, 'mejor1RM'),
    mejorVolumen: mejorDe(historial, 'volumen'),
  };
}

/** ¿Este registro supera los récords de los días anteriores? `indice` es opcional. */
export function registroEsRecord(entrenamientos, registro, indice = null) {
  const fecha = registro?.fecha;
  if (typeof fecha !== 'string' || !FECHA_VALIDA.test(fecha)) return false;
  const propio = resumirSeries(seriesDeRegistro(registro));
  if (propio.pesoMaximo <= 0) return false;
  const historial = (indice ?? indexarHistoriales(entrenamientos)).get(normalizarNombre(registro?.ejercicio)) ?? [];
  const anteriores = historial.filter((dia) => dia.fecha < fecha);
  if (anteriores.length === 0) return false;
  const mejorPeso = Math.max(...anteriores.map((d) => d.pesoMaximo));
  const mejor1RM = Math.max(...anteriores.map((d) => d.mejor1RM));
  return propio.pesoMaximo > mejorPeso || propio.mejor1RM > mejor1RM;
}

/** «116,5», «100» o «12 345»: coma decimal, sin ceros sobrantes y espacio de miles desde 10 000. */
export function formatearKg(valor) {
  const n = Math.round(aNumero(valor) * 10) / 10;
  const [entero, decimal] = String(n).split('.');
  const conMiles = entero.length > 4 ? entero.replace(/\B(?=(\d{3})+(?!\d))/g, '\u00A0') : entero;
  return decimal ? `${conMiles},${decimal}` : conMiles;
}
