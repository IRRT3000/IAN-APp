import { obtenerDiasEnMes, esFechaFutura } from './dateUtilsLocal';

export const CATEGORIAS_MATERIA = ['Escuela', 'Personal'];
export const NIVELES_COMPRENSION = ['Bien', 'Más o menos', 'No tanto', 'Nada'];
export const MINUTOS_RAPIDOS = [15, 30, 45, 60, 90];
export const MINUTOS_MAX = 720;
export const APUNTES_MIN = 10;
export const APUNTES_MAX = 5000;
export const TEMA_MAX = 120;
export const MATERIA_MAX = 60;

/**
 * Sanitiza una sola línea de texto: recorta espacios al inicio/final
 * y sustituye cualquier secuencia de saltos de línea por un espacio.
 * @param {string} texto
 * @returns {string}
 */
export function sanitizarTextoLinea(texto) {
  if (typeof texto !== 'string') return '';
  return texto.replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Valida si una fecha local tiene formato YYYY-MM-DD y corresponde a un día real de calendario.
 * @param {string} fecha
 * @returns {boolean}
 */
export function esFechaLocalValida(fecha) {
  if (typeof fecha !== 'string') return false;
  const match = fecha.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return false;

  const anio = parseInt(match[1], 10);
  const mes = parseInt(match[2], 10);
  const dia = parseInt(match[3], 10);

  if (mes < 1 || mes > 12) return false;
  const diasEnMes = obtenerDiasEnMes(anio, mes - 1);
  if (dia < 1 || dia > diasEnMes) return false;

  return true;
}

/**
 * Valida los datos para crear o editar una materia.
 * @param {{ nombre: string, categoria: string }} datos
 * @param {Array<{ id: string, nombre: string, categoria: string }>} materiasExistentes
 * @param {string|null} [idExcluir=null]
 * @returns {{ valido: boolean, errores: Object, datos: { nombre: string, categoria: string } }}
 */
export function validarMateria(datos, materiasExistentes = [], idExcluir = null) {
  const errores = {};
  const nombreSanitizado = sanitizarTextoLinea(datos?.nombre);
  const categoria = datos?.categoria;

  if (!nombreSanitizado || nombreSanitizado.length === 0) {
    errores.nombre = 'El nombre de la materia es obligatorio.';
  } else if (nombreSanitizado.length > MATERIA_MAX) {
    errores.nombre = `El nombre no puede tener más de ${MATERIA_MAX} caracteres.`;
  } else {
    const nombreNormalizado = nombreSanitizado.toLowerCase();
    const yaExiste = materiasExistentes.some((m) => {
      if (idExcluir && m.id === idExcluir) return false;
      return typeof m.nombre === 'string' && m.nombre.trim().toLowerCase() === nombreNormalizado;
    });
    if (yaExiste) {
      errores.nombre = 'Ya existe una materia con este nombre.';
    }
  }

  if (!categoria || !CATEGORIAS_MATERIA.includes(categoria)) {
    errores.categoria = 'Selecciona una categoría válida (Escuela o Personal).';
  }

  return {
    valido: Object.keys(errores).length === 0,
    errores,
    datos: {
      nombre: nombreSanitizado,
      categoria,
    },
  };
}

/**
 * Valida los campos de una sesión de estudio.
 * @param {Object} datos
 * @param {{ fechaHoy?: string, materiasExistentes?: Array, esEdicion?: boolean }} opciones
 * @returns {{ valido: boolean, errores: Object, datos: Object }}
 */
export function validarSesionEstudio(datos, { fechaHoy, materiasExistentes = [], esEdicion = false } = {}) {
  const errores = {};

  const materiaId = datos?.materiaId;
  const materiaExiste = materiasExistentes.some((m) => m.id === materiaId);
  if (!materiaId || !materiaExiste) {
    errores.materiaId = 'Debes seleccionar una materia existente.';
  }

  const temaSanitizado = sanitizarTextoLinea(datos?.tema);
  if (!temaSanitizado || temaSanitizado.length === 0) {
    errores.tema = 'El tema es obligatorio.';
  } else if (temaSanitizado.length > TEMA_MAX) {
    errores.tema = `El tema no puede tener más de ${TEMA_MAX} caracteres.`;
  }

  const comprension = datos?.comprension;
  if (!comprension || !NIVELES_COMPRENSION.includes(comprension)) {
    errores.comprension = 'Selecciona un nivel de comprensión válido.';
  }

  const minNum = Number(datos?.minutos);
  if (!Number.isInteger(minNum) || minNum <= 0 || minNum > MINUTOS_MAX) {
    errores.minutos = `Los minutos deben ser un número entero entre 1 y ${MINUTOS_MAX}.`;
  }

  const apuntesTexto = typeof datos?.apuntes === 'string' ? datos.apuntes.trim() : '';
  if (!apuntesTexto || apuntesTexto.length < APUNTES_MIN) {
    errores.apuntes = `Los apuntes deben tener al menos ${APUNTES_MIN} caracteres.`;
  } else if (apuntesTexto.length > APUNTES_MAX) {
    errores.apuntes = `Los apuntes no pueden superar los ${APUNTES_MAX} caracteres.`;
  }

  const fecha = datos?.fecha;
  if (!esEdicion) {
    if (!esFechaLocalValida(fecha)) {
      errores.fecha = 'La fecha no tiene un formato válido (YYYY-MM-DD).';
    } else if (fechaHoy && esFechaFutura(fecha, fechaHoy)) {
      errores.fecha = 'No se pueden registrar sesiones en fechas futuras.';
    }
  }

  return {
    valido: Object.keys(errores).length === 0,
    errores,
    datos: {
      materiaId,
      tema: temaSanitizado,
      comprension,
      minutos: minNum,
      apuntes: apuntesTexto,
      fecha,
    },
  };
}
