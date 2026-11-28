/**
 * Meta nutricional orientativa a partir del perfil (Spec 028, RF-3).
 * Funciones puras: no leen almacenamiento ni el reloj salvo por el parámetro de fecha.
 */
import {
  OBJETIVOS_PERFIL_VALIDOS,
  PERFIL_USUARIO_BASE,
  SEXOS_PERFIL_VALIDOS,
  calcularEdadExacta,
} from '../services/storage';

/** Gasto diario = basal × este factor (actividad moderada: el usuario entrena). */
export const FACTOR_ACTIVIDAD = 1.55;

export const AJUSTE_POR_OBJETIVO = {
  Mantenimiento: 0,
  Volumen: 0.1,
  'Definición': -0.2,
  'Recomposición': -0.1,
};

const numeroPositivo = (valor, respaldo) => {
  const n = Number(valor);
  return Number.isFinite(n) && n > 0 ? n : respaldo;
};

/**
 * @param {Object|null} perfil
 * @param {Date} [fechaReferencia=new Date()]
 * @returns {{calorias:number, proteinas:number, carbohidratos:number, grasas:number, basal:number, gasto:number}}
 */
export function calcularMetaNutricional(perfil, fechaReferencia = new Date()) {
  const p = perfil || {};
  const peso = numeroPositivo(p.pesoKgActual ?? p.pesoKgBase, PERFIL_USUARIO_BASE.pesoKgBase);
  const altura = numeroPositivo(p.alturaCm, PERFIL_USUARIO_BASE.alturaCm);
  const sexo = SEXOS_PERFIL_VALIDOS.includes(p.sexo) ? p.sexo : PERFIL_USUARIO_BASE.sexo;
  const objetivo = OBJETIVOS_PERFIL_VALIDOS.includes(p.objetivo) ? p.objetivo : 'Mantenimiento';
  const edad = calcularEdadExacta(
    fechaReferencia,
    p.fechaNacimiento || PERFIL_USUARIO_BASE.fechaNacimiento
  ).anios;

  const basal = Math.round(10 * peso + 6.25 * altura - 5 * edad + (sexo === 'Mujer' ? -161 : 5));
  const gasto = Math.round(basal * FACTOR_ACTIVIDAD);
  const calorias = Math.round((gasto * (1 + (AJUSTE_POR_OBJETIVO[objetivo] ?? 0))) / 10) * 10;
  const proteinas = Math.round(peso * 2);
  const kcalGrasa = calorias * 0.25;
  const grasas = Math.round(kcalGrasa / 9);
  const carbohidratos = Math.max(0, Math.round((calorias - proteinas * 4 - kcalGrasa) / 4));

  return { calorias, proteinas, carbohidratos, grasas, basal, gasto };
}

/**
 * La meta propia si es válida; si no, la automática del perfil.
 * @param {Object|null} perfil
 * @param {Object|null} metaGuardada - de cargarMetaNutricion
 * @param {Date} [fechaReferencia]
 */
export function resolverMetaActiva(perfil, metaGuardada, fechaReferencia = new Date()) {
  if (metaGuardada?.modo === 'manual' && Number(metaGuardada.calorias) > 0) {
    return {
      modo: 'manual',
      calorias: Number(metaGuardada.calorias),
      proteinas: Number(metaGuardada.proteinas) || 0,
      carbohidratos: Number(metaGuardada.carbohidratos) || 0,
      grasas: Number(metaGuardada.grasas) || 0,
    };
  }
  const auto = calcularMetaNutricional(perfil, fechaReferencia);
  return {
    modo: 'auto',
    calorias: auto.calorias,
    proteinas: auto.proteinas,
    carbohidratos: auto.carbohidratos,
    grasas: auto.grasas,
  };
}

/**
 * @param {number} consumido
 * @param {number} meta
 * @returns {{porcentaje:number, exceso:number}} porcentaje entre 0 y 1
 */
export function calcularProgreso(consumido, meta) {
  const c = Math.max(0, Number(consumido) || 0);
  const m = Math.max(0, Number(meta) || 0);
  if (m === 0) return { porcentaje: 0, exceso: 0 };
  return {
    porcentaje: Math.min(1, c / m),
    exceso: Math.max(0, Math.round(c - m)),
  };
}
