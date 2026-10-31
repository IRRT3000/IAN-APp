import { obtenerFechaLocal } from './dateUtilsLocal';
import { NIVELES_COMPRENSION } from './validacionEstudio';

/**
 * Resta una cantidad de días a una fecha local YYYY-MM-DD sin desfasar a UTC.
 * @param {string} fechaISO
 * @param {number} dias
 * @returns {string} Fecha local YYYY-MM-DD
 */
export function restarDiasFechaLocal(fechaISO, dias) {
  const [yStr, mStr, dStr] = fechaISO.split('-');
  const y = parseInt(yStr, 10);
  const m = parseInt(mStr, 10);
  const d = parseInt(dStr, 10);

  const date = new Date(y, m - 1, d - dias);
  return obtenerFechaLocal(date);
}

/**
 * Formatea una fecha u hora en formato 12 horas 'h:mm AM' / 'h:mm PM'.
 * Sin toLocaleTimeString para consistencia multi-plataforma.
 * @param {Date} [fecha=new Date()]
 * @returns {string}
 */
export function formatearHora12h(fecha = new Date()) {
  const h = fecha.getHours();
  const m = String(fecha.getMinutes()).padStart(2, '0');
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hora12 = h % 12 === 0 ? 12 : h % 12;
  return `${hora12}:${m} ${ampm}`;
}

/**
 * Normaliza una cadena de nivel de comprensión eliminando acentos y mayúsculas
 * para compararla con los literales canónicos de NIVELES_COMPRENSION.
 * @param {string} str
 * @returns {string|null} Literal canónico o null si no coincide
 */
export function obtenerNivelComprensionCanonico(str) {
  if (typeof str !== 'string') return null;
  const limpio = str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

  for (const nivel of NIVELES_COMPRENSION) {
    const nivelLimpio = nivel
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
    if (limpio === nivelLimpio) {
      return nivel;
    }
  }
  return null;
}

/**
 * Construye el contexto completo que se enviará a Gemini.
 * @param {{ sesiones: any[], materias: any[], fechaHoy: string }} params
 * @returns {Object}
 */
export function construirContextoResumenEstudio({
  sesiones = [],
  materias = [],
  fechaHoy,
}) {
  const mapaMaterias = new Map();
  materias.forEach((m) => mapaMaterias.set(m.id, m));

  const resolverMateria = (materiaId) => {
    const mat = mapaMaterias.get(materiaId);
    if (mat) {
      return {
        nombre: mat.nombre || 'Sin materia',
        categoria: mat.categoria || 'Personal',
      };
    }
    return { nombre: 'Sin materia', categoria: 'Personal' };
  };

  // 1. Sesiones de hoy (ordenadas por creadaEn asc)
  const sesionesHoyOriginales = sesiones
    .filter((s) => s.fecha === fechaHoy)
    .sort((a, b) => (a.creadaEn || 0) - (b.creadaEn || 0));

  let sesionesHoy = sesionesHoyOriginales.map((s) => {
    const infoMateria = resolverMateria(s.materiaId);
    return {
      id: s.id,
      materia: infoMateria.nombre,
      categoria: infoMateria.categoria,
      tema: s.tema || '',
      comprension: s.comprension || 'Bien',
      minutos: Number(s.minutos) || 0,
      apuntes: s.apuntes || '',
    };
  });

  // Defensa 5: Si la suma de apuntes de hoy supera 40 000 caracteres, tope igual por sesión
  const totalCaracteresApuntes = sesionesHoy.reduce(
    (acc, s) => acc + (s.apuntes ? s.apuntes.length : 0),
    0
  );

  if (totalCaracteresApuntes > 40000 && sesionesHoy.length > 0) {
    const tope = Math.floor(40000 / sesionesHoy.length);
    sesionesHoy = sesionesHoy.map((s) => {
      if (s.apuntes && s.apuntes.length > tope) {
        return {
          ...s,
          apuntes: `${s.apuntes.slice(0, tope)} [recortado]`,
        };
      }
      return s;
    });
  }

  // 2. Sesiones de los últimos 7 días (hoy-7 a hoy-1, sin apuntes, máx 60)
  const fechaInicio = restarDiasFechaLocal(fechaHoy, 7);
  const fechaFin = restarDiasFechaLocal(fechaHoy, 1);

  const sesionesPrevias = sesiones
    .filter((s) => s.fecha >= fechaInicio && s.fecha <= fechaFin)
    .sort((a, b) => {
      if (b.fecha !== a.fecha) {
        return b.fecha.localeCompare(a.fecha);
      }
      return (b.creadaEn || 0) - (a.creadaEn || 0);
    })
    .slice(0, 60)
    .map((s) => {
      const infoMateria = resolverMateria(s.materiaId);
      return {
        fecha: s.fecha,
        materia: infoMateria.nombre,
        categoria: infoMateria.categoria,
        tema: s.tema || '',
        comprension: s.comprension || 'Bien',
        minutos: Number(s.minutos) || 0,
      };
    });

  // 3. Totales calculados localmente
  const minutosTotales = sesionesHoy.reduce((acc, s) => acc + s.minutos, 0);

  const agrupado = {};
  sesionesHoy.forEach((s) => {
    const clave = `${s.materia}__${s.categoria}`;
    if (!agrupado[clave]) {
      agrupado[clave] = {
        materia: s.materia,
        categoria: s.categoria,
        minutos: 0,
      };
    }
    agrupado[clave].minutos += s.minutos;
  });

  const materiasAgrupadas = Object.values(agrupado).sort(
    (a, b) => b.minutos - a.minutos
  );

  // 4. Firmas de las sesiones analizadas de hoy: { [id]: editadaEn ?? creadaEn }
  const firmas = {};
  sesionesHoyOriginales.forEach((s) => {
    firmas[s.id] = s.editadaEn ?? s.creadaEn;
  });

  return {
    fechaHoy,
    sesionesHoy,
    sesionesPrevias,
    minutosTotales,
    materias: materiasAgrupadas,
    firmas,
  };
}

/**
 * Cuenta la cantidad de sesiones de hoy sin analizar (nuevas, modificadas o borradas).
 * @param {{ sesionesHoy: any[], firmas: Object }} params
 * @returns {number}
 */
export function contarSesionesSinAnalizar({ sesionesHoy = [], firmas = {} }) {
  let contador = 0;
  const mapaHoy = new Map();

  for (const s of sesionesHoy) {
    mapaHoy.set(s.id, s);
    const firmaGuardada = firmas[s.id];
    if (firmaGuardada === undefined) {
      // Sesión nueva
      contador += 1;
    } else {
      const firmaActual = s.editadaEn ?? s.creadaEn;
      if (firmaActual !== firmaGuardada) {
        // Sesión editada
        contador += 1;
      }
    }
  }

  // Comprobar sesiones eliminadas (presentes en firmas pero ya no en sesionesHoy)
  for (const id in firmas) {
    if (!mapaHoy.has(id)) {
      contador += 1;
    }
  }

  return contador;
}

/**
 * Genera el texto informativo para la tarjeta de resumen si hay sesiones sin analizar.
 * @param {number} n
 * @returns {string|null}
 */
export function textoSesionesSinAnalizar(n) {
  if (n === 1) {
    return '1 sesión nueva, editada o eliminada sin analizar';
  }
  if (n > 1) {
    return `${n} sesiones nuevas, editadas o eliminadas sin analizar`;
  }
  return null;
}

/**
 * Normaliza y valida la respuesta estructurada de Gemini (Defensa 4).
 * Devuelve el objeto estructurado o null si es inválido.
 * @param {any} json
 * @param {Object} contexto
 * @returns {Object|null}
 */
export function normalizarResumenEstudio(json, contexto) {
  if (!json || typeof json !== 'object' || Array.isArray(json)) {
    return null;
  }

  // Validación de textos indispensables
  const resumenSimple =
    typeof json.resumenSimple === 'string' ? json.resumenSimple.trim() : '';
  const resumenDetallado =
    typeof json.resumenDetallado === 'string' ? json.resumenDetallado.trim() : '';

  if (!resumenSimple || !resumenDetallado) {
    return null;
  }

  // Validación estricta de veredicto
  let veredictoNum = null;
  if (typeof json.veredicto === 'number' && Number.isFinite(json.veredicto)) {
    veredictoNum = json.veredicto;
  } else if (
    typeof json.veredicto === 'string' &&
    json.veredicto.trim() !== '' &&
    /^-?\d+(\.\d+)?$/.test(json.veredicto.trim())
  ) {
    veredictoNum = parseFloat(json.veredicto.trim());
  }

  if (veredictoNum === null || !Number.isFinite(veredictoNum)) {
    return null;
  }

  // Acotar [0, 10] con 1 decimal
  const veredicto =
    Math.round(Math.max(0, Math.min(10, veredictoNum)) * 10) / 10;

  // minutosTotales y materias SIEMPRE provienen del contexto local
  const minutosTotales = contexto?.minutosTotales || 0;
  const materias = Array.isArray(contexto?.materias) ? contexto.materias : [];

  // Arreglos de listas textuales
  const temasDominados = Array.isArray(json.temasDominados)
    ? json.temasDominados
        .filter((t) => typeof t === 'string' && t.trim().length > 0)
        .map((t) => t.trim())
        .slice(0, 8)
    : [];

  const puntosClave = Array.isArray(json.puntosClave)
    ? json.puntosClave
        .filter((p) => typeof p === 'string' && p.trim().length > 0)
        .map((p) => p.trim())
        .slice(0, 5)
    : [];

  const recomendacionesManana = Array.isArray(json.recomendacionesManana)
    ? json.recomendacionesManana
        .filter((r) => typeof r === 'string' && r.trim().length > 0)
        .map((r) => r.trim())
        .slice(0, 5)
    : [];

  // Temas por repasar: validar comprensión con literales canónicos
  const temasPorRepasar = [];
  if (Array.isArray(json.temasPorRepasar)) {
    for (const item of json.temasPorRepasar) {
      if (temasPorRepasar.length >= 8) break;
      if (!item || typeof item !== 'object') continue;

      const tema = typeof item.tema === 'string' ? item.tema.trim() : '';
      if (!tema) continue;

      const nivelCanonico = obtenerNivelComprensionCanonico(item.comprension);
      if (!nivelCanonico) continue;

      const materia =
        typeof item.materia === 'string' ? item.materia.trim() : '';
      const sugerencia =
        typeof item.sugerencia === 'string' ? item.sugerencia.trim() : '';

      temasPorRepasar.push({
        materia,
        tema,
        comprension: nivelCanonico,
        sugerencia,
      });
    }
  }

  return {
    resumenSimple,
    resumenDetallado,
    veredicto,
    minutosTotales,
    materias,
    temasDominados,
    temasPorRepasar,
    puntosClave,
    recomendacionesManana,
  };
}
