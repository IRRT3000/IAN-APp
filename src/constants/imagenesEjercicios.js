/**
 * Mapa de miniaturas de ejercicios (Spec 014). Ilustraciones de RepDB (repdb.co), ver créditos.
 * Las claves coinciden con los `id` de CATALOGO_EJERCICIOS_BASE y con el nombre del WebP.
 * Metro solo admite `require` literales, por eso cada entrada se declara a mano.
 */

import { CATALOGO_EJERCICIOS_BASE } from './catalogoEjercicios';

export const IMAGENES_EJERCICIOS = {
  'base-pecho-1': require('../../assets/ejercicios/base-pecho-1.webp'),
  'base-pecho-2': require('../../assets/ejercicios/base-pecho-2.webp'),
  'base-pecho-3': require('../../assets/ejercicios/base-pecho-3.webp'),
  'base-pecho-4': require('../../assets/ejercicios/base-pecho-4.webp'),
  'base-pecho-5': require('../../assets/ejercicios/base-pecho-5.webp'),
  'base-pecho-6': require('../../assets/ejercicios/base-pecho-6.webp'),
  'base-pecho-7': require('../../assets/ejercicios/base-pecho-7.webp'),
  'base-pecho-8': require('../../assets/ejercicios/base-pecho-8.webp'),
  'base-espalda-1': require('../../assets/ejercicios/base-espalda-1.webp'),
  'base-espalda-2': require('../../assets/ejercicios/base-espalda-2.webp'),
  'base-espalda-3': require('../../assets/ejercicios/base-espalda-3.webp'),
  'base-espalda-4': require('../../assets/ejercicios/base-espalda-4.webp'),
  'base-espalda-5': require('../../assets/ejercicios/base-espalda-5.webp'),
  'base-espalda-6': require('../../assets/ejercicios/base-espalda-6.webp'),
  'base-espalda-7': require('../../assets/ejercicios/base-espalda-7.webp'),
  'base-espalda-8': require('../../assets/ejercicios/base-espalda-8.webp'),
  'base-pierna-1': require('../../assets/ejercicios/base-pierna-1.webp'),
  'base-pierna-2': require('../../assets/ejercicios/base-pierna-2.webp'),
  'base-pierna-3': require('../../assets/ejercicios/base-pierna-3.webp'),
  'base-pierna-4': require('../../assets/ejercicios/base-pierna-4.webp'),
  'base-pierna-5': require('../../assets/ejercicios/base-pierna-5.webp'),
  'base-pierna-6': require('../../assets/ejercicios/base-pierna-6.webp'),
  'base-pierna-7': require('../../assets/ejercicios/base-pierna-7.webp'),
  'base-pierna-8': require('../../assets/ejercicios/base-pierna-8.webp'),
  'base-pierna-9': require('../../assets/ejercicios/base-pierna-9.webp'),
  'base-pierna-10': require('../../assets/ejercicios/base-pierna-10.webp'),
  'base-hombro-1': require('../../assets/ejercicios/base-hombro-1.webp'),
  'base-hombro-2': require('../../assets/ejercicios/base-hombro-2.webp'),
  'base-hombro-3': require('../../assets/ejercicios/base-hombro-3.webp'),
  'base-hombro-4': require('../../assets/ejercicios/base-hombro-4.webp'),
  'base-hombro-5': require('../../assets/ejercicios/base-hombro-5.webp'),
  'base-hombro-6': require('../../assets/ejercicios/base-hombro-6.webp'),
  'base-hombro-7': require('../../assets/ejercicios/base-hombro-7.webp'),
  'base-hombro-8': require('../../assets/ejercicios/base-hombro-8.webp'),
  'base-brazo-1': require('../../assets/ejercicios/base-brazo-1.webp'),
  'base-brazo-2': require('../../assets/ejercicios/base-brazo-2.webp'),
  'base-brazo-3': require('../../assets/ejercicios/base-brazo-3.webp'),
  'base-brazo-4': require('../../assets/ejercicios/base-brazo-4.webp'),
  'base-brazo-5': require('../../assets/ejercicios/base-brazo-5.webp'),
  'base-brazo-6': require('../../assets/ejercicios/base-brazo-6.webp'),
  'base-brazo-7': require('../../assets/ejercicios/base-brazo-7.webp'),
  'base-brazo-8': require('../../assets/ejercicios/base-brazo-8.webp'),
  'base-core-1': require('../../assets/ejercicios/base-core-1.webp'),
  'base-core-2': require('../../assets/ejercicios/base-core-2.webp'),
  'base-core-3': require('../../assets/ejercicios/base-core-3.webp'),
  'base-core-4': require('../../assets/ejercicios/base-core-4.webp'),
  'base-core-5': require('../../assets/ejercicios/base-core-5.webp'),
};

const normalizarNombre = (nombre) => String(nombre ?? '').trim().toLowerCase();

// Índice nombre normalizado → id, construido una sola vez desde el catálogo base.
export const INDICE_NOMBRE_A_ID = new Map(
  CATALOGO_EJERCICIOS_BASE.map((ejercicio) => [normalizarNombre(ejercicio.nombre), ejercicio.id])
);

/**
 * Resuelve el id de imagen de un ejercicio: primero por id (solo claves propias del mapa)
 * y, si no hay coincidencia, por nombre dentro del catálogo base.
 * @param {{ id?: string, nombre?: string }} datos
 * @returns {string|null}
 */
export const obtenerIdImagenEjercicio = (datos) => {
  const { id, nombre } = datos ?? {};
  if (typeof id === 'string' && Object.hasOwn(IMAGENES_EJERCICIOS, id)) {
    return id;
  }
  return INDICE_NOMBRE_A_ID.get(normalizarNombre(nombre)) ?? null;
};

/**
 * Devuelve el asset de la miniatura de un ejercicio o null si no tiene imagen.
 * @param {{ id?: string, nombre?: string }} datos
 * @returns {number|null}
 */
export const obtenerImagenEjercicio = (datos) => {
  const idResuelto = obtenerIdImagenEjercicio(datos);
  return idResuelto ? IMAGENES_EJERCICIOS[idResuelto] ?? null : null;
};
