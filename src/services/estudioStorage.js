import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  validarMateria,
  validarSesionEstudio,
  CATEGORIAS_MATERIA,
  NIVELES_COMPRENSION,
} from '../utils/validacionEstudio';

export const STORAGE_KEY_MATERIAS = '@fitness_tracker_materias_v1';
export const PREFIJO_SESIONES_ESTUDIO = '@fitness_tracker_sesiones_estudio_v1:';
export const PREFIJO_RESUMEN_ESTUDIO = '@fitness_tracker_resumen_estudio_v1:';

export const claveSesionesDeMes = (fecha) => `${PREFIJO_SESIONES_ESTUDIO}${fecha.slice(0, 7)}`;
export const claveResumenDeFecha = (fecha) => `${PREFIJO_RESUMEN_ESTUDIO}${fecha}`;
export { CATEGORIAS_MATERIA, NIVELES_COMPRENSION };

/**
 * Genera un ID único para los registros.
 */
function generarId() {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
}

/**
 * Filtra las claves de sesiones de estudio válidas (excluyendo respaldos corruptos).
 * @param {string[]} keys
 * @returns {string[]}
 */
export function clavesDeSesiones(keys = []) {
  if (!Array.isArray(keys)) return [];
  return keys.filter(
    (k) => typeof k === 'string' && k.startsWith(PREFIJO_SESIONES_ESTUDIO) && !k.includes(':corrupto:')
  );
}

/**
 * Lectura tolerante: devuelve un arreglo vacío ante errores o JSON inválido sin lanzar excepción.
 * @param {string} clave
 * @returns {Promise<any[]>}
 */
export async function leerArregloTolerante(clave) {
  try {
    const raw = await AsyncStorage.getItem(clave);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    console.error(`[estudioStorage] Formato inválido en clave ${clave}, se esperaba un arreglo.`);
    return [];
  } catch (error) {
    console.error(`[estudioStorage] Error leyendo tolerante clave ${clave}:`, error);
    return [];
  }
}

/**
 * Lectura estricta: lanza error si AsyncStorage falla. Si el JSON está corrupto,
 * respalda el contenido crudo en <clave>:corrupto:<timestamp> antes de devolver [].
 * @param {string} clave
 * @returns {Promise<any[]>}
 */
export async function leerArregloEstricto(clave) {
  const raw = await AsyncStorage.getItem(clave);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    throw new Error('El valor almacenado no es un arreglo.');
  } catch (_parseError) {
    const claveRespaldo = `${clave}:corrupto:${Date.now()}`;
    await AsyncStorage.setItem(claveRespaldo, raw);
    return [];
  }
}

/**
 * Cola serial de escrituras para evitar condiciones de carrera (Defensa 4).
 */
let colaEscrituras = Promise.resolve();

function encolar(tarea) {
  const siguiente = colaEscrituras.then(
    () => tarea(),
    () => tarea()
  );
  colaEscrituras = siguiente;
  return siguiente;
}

/**
 * Carga todas las materias existentes. Nunca lanza excepción (devuelve [] ante fallos).
 * @returns {Promise<Array<{ id: string, nombre: string, categoria: string, creadaEn: number }>>}
 */
export async function cargarMaterias() {
  return leerArregloTolerante(STORAGE_KEY_MATERIAS);
}

/**
 * Carga todas las sesiones de estudio en AsyncStorage a través de todas las claves mensuales.
 * Nunca lanza excepción para no romper el Promise.all inicial de App.js.
 * Devuelve las sesiones ordenadas por fecha descendente y luego creadaEn descendente.
 * @returns {Promise<any[]>}
 */
export async function cargarSesionesEstudio() {
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    const claves = clavesDeSesiones(allKeys);
    if (claves.length === 0) return [];

    const pares = await AsyncStorage.multiGet(claves);
    const sesiones = [];

    for (const [, raw] of pares) {
      if (!raw) continue;
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          sesiones.push(...parsed);
        }
      } catch (error) {
        console.error('[estudioStorage] Error parseando sesiones de mes:', error);
      }
    }

    // Ordenar fecha descendente, luego creadaEn descendente
    sesiones.sort((a, b) => {
      if (b.fecha !== a.fecha) {
        return b.fecha.localeCompare(a.fecha);
      }
      return (b.creadaEn || 0) - (a.creadaEn || 0);
    });

    return sesiones;
  } catch (error) {
    console.error('[estudioStorage] Error general al cargar sesiones:', error);
    return [];
  }
}

/**
 * Guarda una nueva materia tras validarla estrictamente.
 * @param {{ nombre: string, categoria: string }} datos
 * @returns {Promise<any[]>} Arreglo actualizado de materias
 */
export function guardarMateria(datos) {
  return encolar(async () => {
    const materias = await leerArregloEstricto(STORAGE_KEY_MATERIAS);
    const { valido, errores, datos: datosValidados } = validarMateria(datos, materias);

    if (!valido) {
      const primerMensaje = Object.values(errores)[0] || 'Datos de materia inválidos.';
      throw new Error(primerMensaje);
    }

    const nuevaMateria = {
      id: generarId(),
      nombre: datosValidados.nombre,
      categoria: datosValidados.categoria,
      creadaEn: Date.now(),
    };

    const actualizadas = [...materias, nuevaMateria];
    await AsyncStorage.setItem(STORAGE_KEY_MATERIAS, JSON.stringify(actualizadas));
    return actualizadas;
  });
}

/**
 * Actualiza una materia existente.
 * @param {string} id
 * @param {{ nombre: string, categoria: string }} datos
 * @returns {Promise<any[]>} Arreglo actualizado de materias
 */
export function actualizarMateria(id, datos) {
  return encolar(async () => {
    const materias = await leerArregloEstricto(STORAGE_KEY_MATERIAS);
    const index = materias.findIndex((m) => m.id === id);
    if (index === -1) {
      throw new Error('Materia no encontrada.');
    }

    const { valido, errores, datos: datosValidados } = validarMateria(datos, materias, id);
    if (!valido) {
      const primerMensaje = Object.values(errores)[0] || 'Datos de materia inválidos.';
      throw new Error(primerMensaje);
    }

    const actualizadas = materias.map((m) =>
      m.id === id
        ? {
            ...m,
            nombre: datosValidados.nombre,
            categoria: datosValidados.categoria,
          }
        : m
    );

    await AsyncStorage.setItem(STORAGE_KEY_MATERIAS, JSON.stringify(actualizadas));
    return actualizadas;
  });
}

/**
 * Elimina una materia si y solo si no tiene sesiones registradas.
 * Lanza excepción si hay sesiones asociadas o si AsyncStorage falla.
 * @param {string} id
 * @returns {Promise<any[]>} Arreglo actualizado de materias
 */
export function eliminarMateria(id) {
  return encolar(async () => {
    const allKeys = await AsyncStorage.getAllKeys();
    const claves = clavesDeSesiones(allKeys);

    for (const clave of claves) {
      const sesiones = await leerArregloEstricto(clave);
      if (sesiones.some((s) => s.materiaId === id)) {
        throw new Error('No puedes borrar una materia que tiene sesiones registradas.');
      }
    }

    const materias = await leerArregloEstricto(STORAGE_KEY_MATERIAS);
    const actualizadas = materias.filter((m) => m.id !== id);
    await AsyncStorage.setItem(STORAGE_KEY_MATERIAS, JSON.stringify(actualizadas));
    return actualizadas;
  });
}

/**
 * Guarda una nueva sesión de estudio en la clave mensual correspondiente.
 * @param {Object} datos
 * @param {{ fechaHoy: string, materias: any[] }} opciones
 * @returns {Promise<Object>} Sesión de estudio guardada
 */
export function guardarSesionEstudio(datos, { fechaHoy, materias = [] } = {}) {
  return encolar(async () => {
    const { valido, errores, datos: datosValidados } = validarSesionEstudio(datos, {
      fechaHoy,
      materiasExistentes: materias,
      esEdicion: false,
    });

    if (!valido) {
      const primerMensaje = Object.values(errores)[0] || 'Datos de sesión inválidos.';
      throw new Error(primerMensaje);
    }

    const clave = claveSesionesDeMes(datosValidados.fecha);
    const sesionesMes = await leerArregloEstricto(clave);

    const nuevaSesion = {
      id: generarId(),
      fecha: datosValidados.fecha,
      materiaId: datosValidados.materiaId,
      tema: datosValidados.tema,
      comprension: datosValidados.comprension,
      minutos: datosValidados.minutos,
      apuntes: datosValidados.apuntes,
      creadaEn: Date.now(),
      editadaEn: null,
    };

    const actualizadas = [nuevaSesion, ...sesionesMes];
    await AsyncStorage.setItem(clave, JSON.stringify(actualizadas));
    return nuevaSesion;
  });
}

/**
 * Actualiza una sesión de estudio existente sin alterar id, fecha ni creadaEn.
 * @param {string} id
 * @param {string} fecha
 * @param {Object} cambios
 * @param {{ materias: any[] }} opciones
 * @returns {Promise<Object>} Sesión actualizada
 */
export function actualizarSesionEstudio(id, fecha, cambios, { materias = [] } = {}) {
  return encolar(async () => {
    const clave = claveSesionesDeMes(fecha);
    const sesionesMes = await leerArregloEstricto(clave);

    const sesionExistente = sesionesMes.find((s) => s.id === id);
    if (!sesionExistente) {
      throw new Error('Sesión de estudio no encontrada.');
    }

    const { valido, errores, datos: datosValidados } = validarSesionEstudio(
      { ...cambios, fecha },
      { materiasExistentes: materias, esEdicion: true }
    );

    if (!valido) {
      const primerMensaje = Object.values(errores)[0] || 'Datos de sesión inválidos.';
      throw new Error(primerMensaje);
    }

    const sesionActualizada = {
      ...sesionExistente,
      materiaId: datosValidados.materiaId,
      tema: datosValidados.tema,
      comprension: datosValidados.comprension,
      minutos: datosValidados.minutos,
      apuntes: datosValidados.apuntes,
      editadaEn: Date.now(),
    };

    const actualizadas = sesionesMes.map((s) => (s.id === id ? sesionActualizada : s));
    await AsyncStorage.setItem(clave, JSON.stringify(actualizadas));
    return sesionActualizada;
  });
}

/**
 * Elimina una sesión de estudio por ID y fecha (para ubicar su partición mensual).
 * @param {string} id
 * @param {string} fecha
 * @returns {Promise<string>} ID de la sesión eliminada
 */
export function eliminarSesionEstudio(id, fecha) {
  return encolar(async () => {
    const clave = claveSesionesDeMes(fecha);
    const sesionesMes = await leerArregloEstricto(clave);

    const actualizadas = sesionesMes.filter((s) => s.id !== id);
    await AsyncStorage.setItem(clave, JSON.stringify(actualizadas));
    return id;
  });
}

/**
 * Obtiene el resumen de estudio de una fecha de forma tolerante (lectura para UI).
 * Devuelve null si no existe, si el JSON es inválido o si no es un objeto plano. Nunca lanza excepción.
 * @param {string} fecha
 * @returns {Promise<Object|null>}
 */
export async function obtenerResumenEstudio(fecha) {
  try {
    const clave = claveResumenDeFecha(fecha);
    const raw = await AsyncStorage.getItem(clave);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed;
    }
    return null;
  } catch (error) {
    console.error(`[estudioStorage] Error al obtener resumen de estudio de ${fecha}:`, error);
    return null;
  }
}

/**
 * Comprueba si ya existe una clave guardada para el resumen de una fecha dada.
 * Si getItem falla, propaga el error (lectura estricta).
 * @param {string} fecha
 * @returns {Promise<boolean>}
 */
export async function existeClaveResumenEstudio(fecha) {
  const clave = claveResumenDeFecha(fecha);
  const raw = await AsyncStorage.getItem(clave);
  return raw !== null;
}

/**
 * Guarda el resumen de estudio de una fecha garantizando unicidad y cola serial.
 * Si ya existe un resumen para esa fecha o si AsyncStorage falla, lanza excepción.
 * @param {string} fecha
 * @param {Object} entrada
 * @returns {Promise<Object>}
 */
export function guardarResumenEstudio(fecha, entrada) {
  return encolar(async () => {
    const clave = claveResumenDeFecha(fecha);
    const crudo = await AsyncStorage.getItem(clave);
    if (crudo !== null) {
      throw new Error('Ya existe un resumen de estudio para esta fecha.');
    }
    await AsyncStorage.setItem(clave, JSON.stringify({ ...entrada }));
    return entrada;
  });
}
