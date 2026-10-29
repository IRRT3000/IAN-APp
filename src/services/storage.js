import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@fitness_tracker_entrenamientos_v1';
const STORAGE_KEY_COMIDAS = '@fitness_tracker_comidas_v1';
const STORAGE_KEY_PERFIL = '@fitness_tracker_perfil_v1';
const STORAGE_KEY_CAMBIOS_FISICOS = '@fitness_tracker_cambios_fisicos_v1';
export const STORAGE_KEY_CATALOGO_PERSONALIZADO =
  '@fitness_tracker_catalogo_personalizado_v1';
export const STORAGE_KEY_SESION_ACTIVA_DRAFT =
  '@fitness_tracker_sesion_activa_draft_v1';
export const STORAGE_KEY_DIAS_DESCANSO =
  '@fitness_tracker_dias_descanso_v1';

import { calcularScoreVaso, obtenerNivelColor } from '../utils/waterGlassEngine';

export const OBJETIVOS_PERFIL_VALIDOS = [
  'Mantenimiento',
  'Volumen',
  'Definición',
  'Recomposición',
];

export const SEXOS_PERFIL_VALIDOS = ['Hombre', 'Mujer'];

/**
 * Propiedades base por defecto del perfil del usuario (RF-2, RF-3, RF-4, Spec 010).
 * Se emplean como fallback seguro antes de completar el Onboarding Biométrico.
 */
export const PERFIL_USUARIO_BASE = {
  nombre: '',
  alturaCm: 182,
  alturaMetros: 1.82,
  pesoKgBase: 74,
  pesoKgActual: 74,
  sexo: 'Hombre',
  fechaNacimiento: '2010-11-26',
  fechaInicioEntreno: '2025-11-01',
  objetivo: 'Mantenimiento',
  onboardingCompletado: false,
  actualizadoEn: null,
};

const sanitizarNombrePerfil = (nombre) =>
  String(nombre ?? '')
    .replace(/[\r\n]+/g, ' ')
    .trim()
    .slice(0, 40);

const sanitizarAlturaCm = (valor, fallback = PERFIL_USUARIO_BASE.alturaCm) => {
  if (valor === undefined || valor === null || valor === '') {
    return fallback;
  }
  const num = Number(valor);
  if (!Number.isFinite(num) || num <= 0) {
    return fallback;
  }
  const redondeado = Math.round(num);
  return Math.min(230, Math.max(120, redondeado));
};

const sanitizarPesoKg = (valor, fallback = PERFIL_USUARIO_BASE.pesoKgBase) => {
  if (valor === undefined || valor === null || valor === '') {
    return fallback;
  }
  const num = Number(valor);
  if (!Number.isFinite(num) || num <= 0) {
    return fallback;
  }
  const redondeado = Math.round(num * 10) / 10;
  return Math.min(250, Math.max(30, redondeado));
};

/**
 * Calcula una fecha en formato local YYYY-MM-DD empleando el reloj del dispositivo.
 * @param {Date} [fecha=new Date()]
 * @returns {string} Fecha formateada en YYYY-MM-DD
 */
export const obtenerFechaLocal = (fecha = new Date()) => {
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${anio}-${mes}-${dia}`;
};

/**
 * Parsea y valida una fecha local en formato YYYY-MM-DD usando aritmética entera
 * sin invocar jamás new Date("YYYY-MM-DD") ni toISOString() (Defensa 2).
 * Verifica años bisiestos y el número máximo de días de cada mes.
 * @param {string} fechaISO
 * @param {string} [fallbackISO='2010-11-26']
 * @returns {{ anio: number, mes: number, dia: number, iso: string, legible: string }}
 */
export const parsearFechaLocalYYYYMMDD = (
  fechaISO,
  fallbackISO = '2010-11-26'
) => {
  const intentarParsear = (cadena) => {
    const limpio = String(cadena || '').trim();
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(limpio);
    if (!match) return null;

    const anio = parseInt(match[1], 10);
    const mes = parseInt(match[2], 10);
    const dia = parseInt(match[3], 10);

    if (anio < 1900 || anio > 2100) return null;
    if (mes < 1 || mes > 12) return null;

    const maxDiasMes = new Date(anio, mes, 0).getDate();
    if (dia < 1 || dia > maxDiasMes) return null;

    const mm = String(mes).padStart(2, '0');
    const dd = String(dia).padStart(2, '0');

    return {
      anio,
      mes,
      dia,
      iso: `${anio}-${mm}-${dd}`,
      legible: `${dd}/${mm}/${anio}`,
    };
  };

  return (
    intentarParsear(fechaISO) ||
    intentarParsear(fallbackISO) || {
      anio: 2010,
      mes: 11,
      dia: 26,
      iso: '2010-11-26',
      legible: '26/11/2010',
    }
  );
};

/**
 * Calcula en tiempo constante O(1) la edad exacta del usuario a partir de su fecha de nacimiento
 * usando únicamente aritmética entera sobre la fecha local (RF-2, Spec 010).
 * @param {Date} [fechaReferencia=new Date()]
 * @param {string} [fechaNacimientoISO=PERFIL_USUARIO_BASE.fechaNacimiento]
 * @returns {{ anios: number, fechaNacimiento: string, fechaNacimientoISO: string, texto: string }}
 */
export const calcularEdadExacta = (
  fechaReferencia = new Date(),
  fechaNacimientoISO = PERFIL_USUARIO_BASE.fechaNacimiento
) => {
  if (typeof fechaReferencia === 'string') {
    fechaNacimientoISO = fechaReferencia;
    fechaReferencia = new Date();
  } else if (!(fechaReferencia instanceof Date)) {
    fechaReferencia = new Date();
  }

  const parsed = parsearFechaLocalYYYYMMDD(
    fechaNacimientoISO,
    PERFIL_USUARIO_BASE.fechaNacimiento
  );
  const anioActual = fechaReferencia.getFullYear();
  const mesActual = fechaReferencia.getMonth() + 1;
  const diaActual = fechaReferencia.getDate();

  let anios = anioActual - parsed.anio;
  if (
    mesActual < parsed.mes ||
    (mesActual === parsed.mes && diaActual < parsed.dia)
  ) {
    anios -= 1;
  }

  const edadSegura = Math.max(0, anios);
  return {
    anios: edadSegura,
    fechaNacimiento: parsed.legible,
    fechaNacimientoISO: parsed.iso,
    texto: `${edadSegura} años`,
  };
};

/**
 * Calcula en tiempo constante O(1) el tiempo que el usuario lleva entrenando
 * desde su fecha de inicio usando únicamente aritmética entera local (RF-3, Spec 010).
 * @param {Date} [fechaReferencia=new Date()]
 * @param {string} [fechaInicioISO=PERFIL_USUARIO_BASE.fechaInicioEntreno]
 * @returns {{ anios: number, meses: number, dias: number, mesesTotales: number, fechaInicio: string, fechaInicioISO: string, texto: string }}
 */
export const calcularTiempoEntrenando = (
  fechaReferencia = new Date(),
  fechaInicioISO = PERFIL_USUARIO_BASE.fechaInicioEntreno
) => {
  if (typeof fechaReferencia === 'string') {
    fechaInicioISO = fechaReferencia;
    fechaReferencia = new Date();
  } else if (!(fechaReferencia instanceof Date)) {
    fechaReferencia = new Date();
  }

  const parsed = parsearFechaLocalYYYYMMDD(
    fechaInicioISO,
    PERFIL_USUARIO_BASE.fechaInicioEntreno
  );
  const anioActual = fechaReferencia.getFullYear();
  const mesActual = fechaReferencia.getMonth() + 1;
  const diaActual = fechaReferencia.getDate();

  let mesesTotales =
    (anioActual - parsed.anio) * 12 + (mesActual - parsed.mes);
  let dias = diaActual - parsed.dia;

  if (dias < 0) {
    mesesTotales -= 1;
    const diasMesAnterior = new Date(anioActual, mesActual - 1, 0).getDate();
    dias += diasMesAnterior;
  }

  if (mesesTotales < 0 || (mesesTotales === 0 && dias <= 0)) {
    return {
      anios: 0,
      meses: 0,
      dias: 0,
      mesesTotales: 0,
      fechaInicio: parsed.legible,
      fechaInicioISO: parsed.iso,
      texto: 'Recién iniciado',
    };
  }

  const anios = Math.floor(mesesTotales / 12);
  const meses = mesesTotales % 12;

  const partes = [];
  if (anios > 0) {
    partes.push(`${anios} ${anios === 1 ? 'año' : 'años'}`);
  }
  if (meses > 0) {
    partes.push(`${meses} ${meses === 1 ? 'mes' : 'meses'}`);
  }
  if (dias > 0 || partes.length === 0) {
    partes.push(`${dias} ${dias === 1 ? 'día' : 'días'}`);
  }

  return {
    anios,
    meses,
    dias,
    mesesTotales,
    fechaInicio: parsed.legible,
    fechaInicioISO: parsed.iso,
    texto: partes.join(' y '),
  };
};

/**
 * Calcula una fecha local YYYY-MM-DD de inicio de entrenamiento a partir de
 * años y meses de antigüedad usando aritmética entera local (Spec 010).
 * @param {{ anios?: number, meses?: number }} [antiguedad={}]
 * @param {Date} [fechaReferencia=new Date()]
 * @returns {string} Fecha en formato YYYY-MM-DD
 */
export const calcularFechaInicioDesdeAntiguedad = (
  { anios = 0, meses = 0 } = {},
  fechaReferencia = new Date()
) => {
  const aniosLimpios = Math.max(0, Math.min(80, parseInt(anios, 10) || 0));
  const mesesLimpios = Math.max(0, Math.min(11, parseInt(meses, 10) || 0));
  const totalMesesRestar = aniosLimpios * 12 + mesesLimpios;

  const anioRef = fechaReferencia.getFullYear();
  const mesRef = fechaReferencia.getMonth() + 1;
  const diaRef = fechaReferencia.getDate();

  const mesesAbsolutos = anioRef * 12 + (mesRef - 1) - totalMesesRestar;
  const anioInicio = Math.max(1900, Math.floor(mesesAbsolutos / 12));
  const mesInicio = (((mesesAbsolutos % 12) + 12) % 12) + 1;
  const maxDiasMesDestino = new Date(anioInicio, mesInicio, 0).getDate();
  const diaInicio = Math.min(diaRef, maxDiasMesDestino);

  const mm = String(mesInicio).padStart(2, '0');
  const dd = String(diaInicio).padStart(2, '0');
  return `${anioInicio}-${mm}-${dd}`;
};

/**
 * Carga el perfil físico del usuario desde AsyncStorage fusionándolo de forma inmutable
 * con las propiedades base y sanitizando rangos biométricos (Defensa 4, Spec 010).
 * @returns {Promise<Object>}
 */
export const cargarPerfilUsuario = async () => {
  try {
    const jsonValue = await AsyncStorage.getItem(STORAGE_KEY_PERFIL);
    if (!jsonValue) {
      return { ...PERFIL_USUARIO_BASE };
    }

    const parsed = JSON.parse(jsonValue);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { ...PERFIL_USUARIO_BASE };
    }

    const nombreResuelto = sanitizarNombrePerfil(parsed.nombre);
    const sexoResuelto = SEXOS_PERFIL_VALIDOS.includes(parsed.sexo)
      ? parsed.sexo
      : PERFIL_USUARIO_BASE.sexo;
    const fechaNacimientoResuelta = parsearFechaLocalYYYYMMDD(
      parsed.fechaNacimiento,
      PERFIL_USUARIO_BASE.fechaNacimiento
    ).iso;
    const fechaInicioEntrenoResuelta = parsearFechaLocalYYYYMMDD(
      parsed.fechaInicioEntreno,
      PERFIL_USUARIO_BASE.fechaInicioEntreno
    ).iso;
    const alturaCmResuelta = sanitizarAlturaCm(
      parsed.alturaCm,
      PERFIL_USUARIO_BASE.alturaCm
    );
    const alturaMetrosResuelta = Math.round(alturaCmResuelta) / 100;
    const pesoKgBaseResuelto = sanitizarPesoKg(
      parsed.pesoKgBase,
      PERFIL_USUARIO_BASE.pesoKgBase
    );
    const pesoKgActualResuelto = sanitizarPesoKg(
      parsed.pesoKgActual,
      pesoKgBaseResuelto
    );
    const objetivoGuardado = OBJETIVOS_PERFIL_VALIDOS.includes(parsed.objetivo)
      ? parsed.objetivo
      : PERFIL_USUARIO_BASE.objetivo;

    return {
      ...PERFIL_USUARIO_BASE,
      nombre: nombreResuelto,
      sexo: sexoResuelto,
      fechaNacimiento: fechaNacimientoResuelta,
      fechaInicioEntreno: fechaInicioEntrenoResuelta,
      alturaCm: alturaCmResuelta,
      alturaMetros: alturaMetrosResuelta,
      pesoKgBase: pesoKgBaseResuelto,
      pesoKgActual: pesoKgActualResuelto,
      objetivo: objetivoGuardado,
      onboardingCompletado: Boolean(parsed.onboardingCompletado),
      actualizadoEn: Number(parsed.actualizadoEn) || null,
    };
  } catch (error) {
    console.error('Error al cargar perfil del usuario:', error);
    return { ...PERFIL_USUARIO_BASE };
  }
};

/**
 * Guarda de forma inmutable el perfil biométrico completo del usuario en AsyncStorage
 * sanitizando todos los campos y marcando onboardingCompletado = true (Spec 010).
 * @param {Object} [datosPerfil={}]
 * @returns {Promise<Object>} Copia inmutable del perfil guardado
 */
export const guardarPerfilCompletoUsuario = async (datosPerfil = {}) => {
  try {
    const perfilActual = await cargarPerfilUsuario();
    const hoyISO = obtenerFechaLocal(new Date());

    const nombreResuelto =
      datosPerfil.nombre !== undefined
        ? sanitizarNombrePerfil(datosPerfil.nombre)
        : perfilActual.nombre;

    const sexoResuelto = SEXOS_PERFIL_VALIDOS.includes(datosPerfil.sexo)
      ? datosPerfil.sexo
      : perfilActual.sexo;

    let fechaNacimientoResuelta = parsearFechaLocalYYYYMMDD(
      datosPerfil.fechaNacimiento ?? perfilActual.fechaNacimiento,
      perfilActual.fechaNacimiento
    ).iso;
    if (fechaNacimientoResuelta > hoyISO) {
      fechaNacimientoResuelta = perfilActual.fechaNacimiento;
    }

    let fechaInicioCandidata = datosPerfil.fechaInicioEntreno;
    if (
      !fechaInicioCandidata &&
      (datosPerfil.antiguedadAnios !== undefined ||
        datosPerfil.antiguedadMeses !== undefined)
    ) {
      fechaInicioCandidata = calcularFechaInicioDesdeAntiguedad({
        anios: datosPerfil.antiguedadAnios,
        meses: datosPerfil.antiguedadMeses,
      });
    }

    let fechaInicioEntrenoResuelta = parsearFechaLocalYYYYMMDD(
      fechaInicioCandidata ?? perfilActual.fechaInicioEntreno,
      perfilActual.fechaInicioEntreno
    ).iso;
    if (fechaInicioEntrenoResuelta > hoyISO) {
      fechaInicioEntrenoResuelta = hoyISO;
    }

    const alturaCandidata =
      datosPerfil.alturaCm ?? datosPerfil.estaturaCm ?? perfilActual.alturaCm;
    const alturaCmResuelta = sanitizarAlturaCm(
      alturaCandidata,
      perfilActual.alturaCm
    );
    const alturaMetrosResuelta = Math.round(alturaCmResuelta) / 100;

    const pesoBaseCandidato =
      datosPerfil.pesoKgBase ??
      datosPerfil.pesoInicialKg ??
      datosPerfil.pesoKg ??
      perfilActual.pesoKgBase;
    const pesoKgBaseResuelto = sanitizarPesoKg(
      pesoBaseCandidato,
      perfilActual.pesoKgBase
    );

    let pesoKgActualResuelto = perfilActual.pesoKgActual;
    if (!perfilActual.onboardingCompletado) {
      pesoKgActualResuelto = pesoKgBaseResuelto;
    } else if (
      datosPerfil.pesoKgActual !== undefined &&
      datosPerfil.pesoKgActual !== null
    ) {
      pesoKgActualResuelto = sanitizarPesoKg(
        datosPerfil.pesoKgActual,
        pesoKgBaseResuelto
      );
    } else if (
      datosPerfil.actualizarPesoActual !== false ||
      perfilActual.pesoKgActual === perfilActual.pesoKgBase
    ) {
      pesoKgActualResuelto = pesoKgBaseResuelto;
    }

    const objetivoResuelto = OBJETIVOS_PERFIL_VALIDOS.includes(
      datosPerfil.objetivo
    )
      ? datosPerfil.objetivo
      : perfilActual.objetivo;

    const nuevoPerfil = {
      ...perfilActual,
      nombre: nombreResuelto,
      sexo: sexoResuelto,
      fechaNacimiento: fechaNacimientoResuelta,
      fechaInicioEntreno: fechaInicioEntrenoResuelta,
      alturaCm: alturaCmResuelta,
      alturaMetros: alturaMetrosResuelta,
      pesoKgBase: pesoKgBaseResuelto,
      pesoKgActual: pesoKgActualResuelto,
      objetivo: objetivoResuelto,
      onboardingCompletado: true,
      actualizadoEn: Date.now(),
    };

    await AsyncStorage.setItem(STORAGE_KEY_PERFIL, JSON.stringify(nuevoPerfil));
    return { ...nuevoPerfil };
  } catch (error) {
    console.error('Error al guardar el perfil completo del usuario:', error);
    return { ...PERFIL_USUARIO_BASE };
  }
};

/**
 * Actualiza de forma inmutable el objetivo del usuario ('Mantenimiento', 'Volumen', 'Definición', 'Recomposición') (RF-4).
 * @param {string} nuevoObjetivo
 * @returns {Promise<Object>} Perfil actualizado e inmutable
 */
export const actualizarObjetivoPerfil = async (nuevoObjetivo) => {
  try {
    const perfilActual = await cargarPerfilUsuario();
    const objetivoNormalizado = OBJETIVOS_PERFIL_VALIDOS.includes(nuevoObjetivo)
      ? nuevoObjetivo
      : PERFIL_USUARIO_BASE.objetivo;

    const nuevoPerfil = {
      ...perfilActual,
      objetivo: objetivoNormalizado,
      actualizadoEn: Date.now(),
    };

    await AsyncStorage.setItem(STORAGE_KEY_PERFIL, JSON.stringify(nuevoPerfil));
    return { ...nuevoPerfil };
  } catch (error) {
    console.error('Error al actualizar el objetivo del perfil:', error);
    return { ...PERFIL_USUARIO_BASE };
  }
};

/**
 * Carga la lista completa de entrenamientos almacenados en AsyncStorage.
 * Garantiza inmutabilidad devolviendo una nueva instancia de arreglo y clonando seriesDetalle.
 * @returns {Promise<Array<Object>>}
 */
export const cargarEntrenamientos = async () => {
  try {
    const jsonValue = await AsyncStorage.getItem(STORAGE_KEY);
    if (!jsonValue) {
      return [];
    }

    const parsed = JSON.parse(jsonValue);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.map((registro) => ({
      ...registro,
      seriesDetalle: Array.isArray(registro.seriesDetalle)
        ? registro.seriesDetalle.map((s) => ({ ...s }))
        : [],
    }));
  } catch (error) {
    console.error('Error al cargar entrenamientos desde AsyncStorage:', error);
    return [];
  }
};

/**
 * Guarda un nuevo registro de entrenamiento de manera inmutable en AsyncStorage.
 * Soporta tanto estructura híbrida nueva (con seriesDetalle) como legado (series, repeticiones, peso).
 * @param {Object} nuevoRegistro - Datos del entrenamiento
 * @returns {Promise<Array<Object>>} Lista actualizada e inmutable de entrenamientos
 */
export const guardarEntrenamiento = async (nuevoRegistro) => {
  try {
    const entrenamientosActuales = await cargarEntrenamientos();
    const fechaLocal = nuevoRegistro?.fecha || obtenerFechaLocal(new Date());

    const tieneSeriesDetalle =
      Array.isArray(nuevoRegistro?.seriesDetalle) &&
      nuevoRegistro.seriesDetalle.length > 0;

    let registroNormalizado;

    if (tieneSeriesDetalle) {
      const seriesDetalleSanitizadas = nuevoRegistro.seriesDetalle.map(
        (s, idx) => {
          const pesoNum = Math.max(0, parseFloat(s.peso) || 0);
          const repsNum = Math.max(0, parseInt(s.repeticiones, 10) || 0);
          return {
            serie: Number(s.serie) || idx + 1,
            peso: pesoNum,
            repeticiones: repsNum,
          };
        }
      );

      const totalSeries = seriesDetalleSanitizadas.length;
      const repsTotales = seriesDetalleSanitizadas.reduce(
        (acc, cur) => acc + cur.repeticiones,
        0
      );
      const maxPeso = seriesDetalleSanitizadas.reduce(
        (max, cur) => Math.max(max, cur.peso),
        0
      );
      const volTotal = seriesDetalleSanitizadas.reduce(
        (acc, cur) => acc + cur.peso * cur.repeticiones,
        0
      );

      registroNormalizado = {
        id:
          nuevoRegistro?.id ||
          `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
        ejercicio: String(nuevoRegistro?.ejercicio ?? '').trim(),
        grupoMuscular:
          String(nuevoRegistro?.grupoMuscular ?? '').trim() || 'General',
        implemento: String(nuevoRegistro?.implemento ?? '').trim() || 'Otro',
        series: totalSeries,
        repeticiones: repsTotales,
        peso: maxPeso,
        pesoMaximo: maxPeso,
        volumenTotal: volTotal,
        seriesDetalle: seriesDetalleSanitizadas,
        fecha: fechaLocal,
        creadoEn: Date.now(),
      };
    } else {
      const numSeries = Number(nuevoRegistro?.series) || 0;
      const numRepeticiones = Number(nuevoRegistro?.repeticiones) || 0;
      const numPeso = Number(nuevoRegistro?.peso) || 0;

      registroNormalizado = {
        id:
          nuevoRegistro?.id ||
          `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
        ejercicio: String(nuevoRegistro?.ejercicio ?? '').trim(),
        grupoMuscular:
          String(nuevoRegistro?.grupoMuscular ?? '').trim() || 'General',
        implemento: String(nuevoRegistro?.implemento ?? '').trim() || 'Otro',
        series: numSeries,
        repeticiones: numRepeticiones,
        peso: numPeso,
        pesoMaximo: numPeso,
        volumenTotal: numSeries * numRepeticiones * numPeso,
        seriesDetalle: [],
        fecha: fechaLocal,
        creadoEn: Date.now(),
      };
    }

    const nuevaListaInmutable = [
      registroNormalizado,
      ...entrenamientosActuales.map((item) => ({
        ...item,
        seriesDetalle: Array.isArray(item.seriesDetalle)
          ? item.seriesDetalle.map((s) => ({ ...s }))
          : [],
      })),
    ];

    await AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(nuevaListaInmutable)
    );

    return nuevaListaInmutable.map((item) => ({
      ...item,
      seriesDetalle: Array.isArray(item.seriesDetalle)
        ? item.seriesDetalle.map((s) => ({ ...s }))
        : [],
    }));
  } catch (error) {
    console.error('Error al guardar entrenamiento en AsyncStorage:', error);
    return [];
  }
};

/**
 * Elimina de forma inmutable un registro de entrenamiento por su ID en AsyncStorage.
 * Lanza excepción si falla la escritura en AsyncStorage para mantener la consistencia visual (RF-12).
 * @param {string} id - Identificador único del entrenamiento a eliminar
 * @returns {Promise<Array<Object>>} Lista actualizada e inmutable de entrenamientos
 */
export const eliminarEntrenamiento = async (id) => {
  try {
    const entrenamientosActuales = await cargarEntrenamientos();
    const nuevaListaInmutable = entrenamientosActuales
      .filter((registro) => String(registro.id) !== String(id))
      .map((registro) => ({
        ...registro,
        seriesDetalle: Array.isArray(registro.seriesDetalle)
          ? registro.seriesDetalle.map((s) => ({ ...s }))
          : [],
      }));

    await AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(nuevaListaInmutable)
    );

    return nuevaListaInmutable.map((item) => ({
      ...item,
      seriesDetalle: Array.isArray(item.seriesDetalle)
        ? item.seriesDetalle.map((s) => ({ ...s }))
        : [],
    }));
  } catch (error) {
    console.error('Error al eliminar entrenamiento en AsyncStorage:', error);
    throw new Error('No se pudo eliminar el entrenamiento del almacenamiento local.');
  }
};

/**
 * Carga el catálogo de ejercicios personalizados creados por el usuario desde AsyncStorage (RF-8).
 * @returns {Promise<Array<{ id: string, nombre: string, grupoMuscular: string, implemento: string }>>}
 */
export const cargarCatalogoPersonalizado = async () => {
  try {
    const jsonValue = await AsyncStorage.getItem(
      STORAGE_KEY_CATALOGO_PERSONALIZADO
    );
    if (!jsonValue) {
      return [];
    }
    const parsed = JSON.parse(jsonValue);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.map((item) => ({ ...item }));
  } catch (error) {
    console.error('Error al cargar catálogo personalizado:', error);
    return [];
  }
};

/**
 * Guarda un ejercicio personalizado en AsyncStorage validando longitud mínima y duplicados (RF-8).
 * Directriz 7: Validar nombre.trim().length >= 2, normalizar texto y evitar duplicados exactos.
 * @param {{ nombre: string, grupoMuscular: string, implemento: string }} ejercicio
 * @returns {Promise<Array<Object>>} Lista actualizada de ejercicios personalizados
 */
export const guardarEjercicioPersonalizado = async (ejercicio) => {
  try {
    const nombreLimpio = String(ejercicio?.nombre ?? '').trim();
    if (nombreLimpio.length < 2) {
      throw new Error(
        'El nombre del ejercicio debe contener al menos 2 caracteres.'
      );
    }

    const grupoLimpio = String(ejercicio?.grupoMuscular ?? 'Pecho').trim();
    const implementoLimpio = String(ejercicio?.implemento ?? 'Barra').trim();

    const catalogoActual = await cargarCatalogoPersonalizado();

    const nombreNormalizado = nombreLimpio.toLowerCase();
    const yaExiste = catalogoActual.some(
      (item) => item.nombre.trim().toLowerCase() === nombreNormalizado
    );

    if (yaExiste) {
      throw new Error('Ya existe un ejercicio personalizado con este nombre.');
    }

    const nuevoItem = {
      id: `pers-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      nombre: nombreLimpio,
      grupoMuscular: grupoLimpio,
      implemento: implementoLimpio,
      esPersonalizado: true,
      creadoEn: Date.now(),
    };

    const nuevaListaInmutable = [
      nuevoItem,
      ...catalogoActual.map((item) => ({ ...item })),
    ];

    await AsyncStorage.setItem(
      STORAGE_KEY_CATALOGO_PERSONALIZADO,
      JSON.stringify(nuevaListaInmutable)
    );

    return nuevaListaInmutable.map((item) => ({ ...item }));
  } catch (error) {
    console.error('Error al guardar ejercicio personalizado:', error);
    throw error;
  }
};

/**
 * Carga el borrador de sesión activa (Live Mode) si existe en AsyncStorage (RF-11, RF-12).
 * @returns {Promise<Object|null>} Objeto de borrador o null
 */
export const cargarSesionActivaDraft = async () => {
  try {
    const jsonValue = await AsyncStorage.getItem(
      STORAGE_KEY_SESION_ACTIVA_DRAFT
    );
    if (!jsonValue) {
      return null;
    }
    const parsed = JSON.parse(jsonValue);
    if (!parsed || typeof parsed !== 'object') {
      return null;
    }

    return {
      ...parsed,
      seriesDetalle: Array.isArray(parsed.seriesDetalle)
        ? parsed.seriesDetalle.map((s) => ({ ...s }))
        : [],
    };
  } catch (error) {
    console.error('Error al cargar borrador de sesión activa:', error);
    return null;
  }
};

/**
 * Persiste de forma inmutable el borrador de la sesión activa en AsyncStorage (RF-11).
 * @param {Object} draft - Datos de la sesión activa
 * @returns {Promise<Object|null>}
 */
export const guardarSesionActivaDraft = async (draft) => {
  try {
    if (!draft || !draft.ejercicio) {
      return null;
    }

    const draftNormalizado = {
      idEjercicio: String(draft.idEjercicio ?? ''),
      ejercicio: String(draft.ejercicio ?? '').trim(),
      grupoMuscular: String(draft.grupoMuscular ?? 'Pecho').trim(),
      implemento: String(draft.implemento ?? 'Barra').trim(),
      seriesDetalle: Array.isArray(draft.seriesDetalle)
        ? draft.seriesDetalle.map((s, idx) => ({
            serie: Number(s.serie) || idx + 1,
            peso:
              s.peso !== undefined && s.peso !== null ? String(s.peso) : '',
            repeticiones:
              s.repeticiones !== undefined && s.repeticiones !== null
                ? String(s.repeticiones)
                : '',
          }))
        : [],
      iniciadoEn: Number(draft.iniciadoEn) || Date.now(),
      actualizadoEn: Date.now(),
    };

    await AsyncStorage.setItem(
      STORAGE_KEY_SESION_ACTIVA_DRAFT,
      JSON.stringify(draftNormalizado)
    );

    return {
      ...draftNormalizado,
      seriesDetalle: draftNormalizado.seriesDetalle.map((s) => ({ ...s })),
    };
  } catch (error) {
    console.error('Error al guardar borrador de sesión activa:', error);
    return null;
  }
};

/**
 * Elimina el borrador de la sesión activa tras consolidar o descartar (RF-13, RF-15).
 * @returns {Promise<boolean>}
 */
export const eliminarSesionActivaDraft = async () => {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY_SESION_ACTIVA_DRAFT);
    return true;
  } catch (error) {
    console.error('Error al eliminar borrador de sesión activa:', error);
    return false;
  }
};

/**
 * Carga la lista completa de comidas almacenadas en AsyncStorage.
 * Garantiza inmutabilidad devolviendo una nueva instancia de arreglo.
 * @returns {Promise<Array<{ id: string, fecha: string, tipo: string, nombre: string, calorias: number, proteinas: number, carbohidratos: number, grasas: number, uriFoto: string }>>}
 */
export const cargarComidas = async () => {
  try {
    const jsonValue = await AsyncStorage.getItem(STORAGE_KEY_COMIDAS);
    if (!jsonValue) {
      return [];
    }

    const parsed = JSON.parse(jsonValue);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.map((comida) => ({ ...comida }));
  } catch (error) {
    console.error('Error al cargar comidas desde AsyncStorage:', error);
    return [];
  }
};

/**
 * Guarda un nuevo registro de comida de manera inmutable en AsyncStorage.
 * Esquema: { id, fecha, tipo, nombre, calorias, proteinas, carbohidratos, grasas, uriFoto }
 * @param {Object} nuevaComida
 * @returns {Promise<Array<Object>>} Lista actualizada e inmutable de comidas
 */
export const guardarComida = async (nuevaComida) => {
  try {
    const comidasActuales = await cargarComidas();
    const fechaLocal = nuevaComida?.fecha || obtenerFechaLocal(new Date());

    const nombreFinal = String(
      nuevaComida?.nombre || nuevaComida?.descripcion || 'Platillo registrado'
    ).trim();
    const uriFotoFinal = String(
      nuevaComida?.uriFoto || nuevaComida?.fotoUri || ''
    );
    const caloriasFinal = Math.round(Number(nuevaComida?.calorias) || 0);
    const proteinasFinal =
      Math.round(
        (Number(nuevaComida?.proteinas ?? nuevaComida?.macros?.proteinas) || 0) * 10
      ) / 10;
    const carbohidratosFinal =
      Math.round(
        (Number(
          nuevaComida?.carbohidratos ?? nuevaComida?.macros?.carbohidratos
        ) || 0) * 10
      ) / 10;
    const grasasFinal =
      Math.round(
        (Number(nuevaComida?.grasas ?? nuevaComida?.macros?.grasas) || 0) * 10
      ) / 10;

    const comidaNormalizada = {
      id:
        nuevaComida?.id ||
        `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      fecha: fechaLocal,
      tipo: String(nuevaComida?.tipo ?? 'Comida').trim(),
      nombre: nombreFinal,
      descripcion: nombreFinal,
      calorias: caloriasFinal,
      proteinas: proteinasFinal,
      carbohidratos: carbohidratosFinal,
      grasas: grasasFinal,
      macros: {
        proteinas: proteinasFinal,
        carbohidratos: carbohidratosFinal,
        grasas: grasasFinal,
      },
      detalles: String(nuevaComida?.detalles || '').trim(),
      uriFoto: uriFotoFinal,
      fotoUri: uriFotoFinal,
    };

    const nuevaListaInmutable = [
      comidaNormalizada,
      ...comidasActuales.map((item) => ({ ...item })),
    ];

    await AsyncStorage.setItem(
      STORAGE_KEY_COMIDAS,
      JSON.stringify(nuevaListaInmutable)
    );

    return nuevaListaInmutable.map((item) => ({ ...item }));
  } catch (error) {
    console.error('Error al guardar comida en AsyncStorage:', error);
    return [];
  }
};

/**
 * Elimina de forma inmutable un registro de comida por su ID en AsyncStorage.
 * Lanza excepción si falla la escritura en AsyncStorage para mantener la consistencia visual (RF-12).
 * @param {string} id - Identificador único de la comida a eliminar
 * @returns {Promise<Array<Object>>} Lista actualizada e inmutable de comidas
 */
export const eliminarComida = async (id) => {
  try {
    const comidasActuales = await cargarComidas();
    const nuevaListaInmutable = comidasActuales
      .filter((comida) => String(comida.id) !== String(id))
      .map((comida) => ({ ...comida }));

    await AsyncStorage.setItem(
      STORAGE_KEY_COMIDAS,
      JSON.stringify(nuevaListaInmutable)
    );

    return nuevaListaInmutable.map((item) => ({ ...item }));
  } catch (error) {
    console.error('Error al eliminar comida en AsyncStorage:', error);
    throw new Error('No se pudo eliminar la comida del almacenamiento local.');
  }
};

/**
 * Clona de manera profunda e inmutable un registro de cambio físico.
 * Nunca conserva cadenas Base64 en AsyncStorage para prevenir CursorWindow overflow en Android.
 * @param {Object} registro
 * @returns {Object}
 */
const clonarCambioFisico = (registro) => ({
  id: String(registro?.id ?? ''),
  fecha: String(registro?.fecha ?? ''),
  creadoEn: Number(registro?.creadoEn) || Date.now(),
  hora12h: String(registro?.hora12h ?? '12:00 PM'),
  momentoDia: String(registro?.momentoDia ?? 'Mediodía'),
  pesoKg:
    Math.round((Number(registro?.pesoKg) || PERFIL_USUARIO_BASE.pesoKgBase) * 10) /
    10,
  alturaCm: Number(registro?.alturaCm) || PERFIL_USUARIO_BASE.alturaCm,
  edadExacta:
    Number(registro?.edadExacta) ||
    calcularEdadExacta(new Date(), registro?.fechaNacimiento).anios,
  tiempoEntrenandoTexto: String(
    registro?.tiempoEntrenandoTexto ??
      calcularTiempoEntrenando(new Date(), registro?.fechaInicioEntreno).texto
  ),
  objetivo: String(registro?.objetivo ?? PERFIL_USUARIO_BASE.objetivo),
  urisFotos: Array.isArray(registro?.urisFotos)
    ? [...registro.urisFotos].slice(0, 10).map((u) => String(u || ''))
    : [],
  cantidadFotos:
    Number(registro?.cantidadFotos) ||
    (Array.isArray(registro?.urisFotos) ? registro.urisFotos.length : 1),
  resumenSimple: String(registro?.resumenSimple ?? ''),
  resumenDetallado: String(registro?.resumenDetallado ?? ''),
  balanceDelDia: String(registro?.balanceDelDia ?? ''),
  veredicto:
    Math.round(
      Math.min(10, Math.max(0, Number(registro?.veredicto) || 0)) * 10
    ) / 10,
  puntosClave: Array.isArray(registro?.puntosClave)
    ? [...registro.puntosClave].map((p) => String(p || ''))
    : [],
  modeloUsado: String(registro?.modeloUsado ?? ''),
  comparacionAnterior: registro?.comparacionAnterior
    ? {
        idRegistroAnterior: String(
          registro.comparacionAnterior.idRegistroAnterior ?? ''
        ),
        fechaAnterior: String(
          registro.comparacionAnterior.fechaAnterior ?? ''
        ),
        pesoAnteriorKg:
          Number(registro.comparacionAnterior.pesoAnteriorKg) || 74,
        evolucion: String(registro.comparacionAnterior.evolucion ?? ''),
        recomendacionesOptimizacion: Array.isArray(
          registro.comparacionAnterior.recomendacionesOptimizacion
        )
          ? [...registro.comparacionAnterior.recomendacionesOptimizacion].map(
              (r) => String(r || '')
            )
          : [],
        modeloUsado: String(registro.comparacionAnterior.modeloUsado ?? ''),
        comparadoEn:
          Number(registro.comparacionAnterior.comparadoEn) || Date.now(),
      }
    : null,
});

/**
 * Carga la lista inmutable de registros de cambio físico desde AsyncStorage (RF-16).
 * @returns {Promise<Array<Object>>}
 */
export const cargarCambiosFisicos = async () => {
  try {
    const jsonValue = await AsyncStorage.getItem(STORAGE_KEY_CAMBIOS_FISICOS);
    if (!jsonValue) {
      return [];
    }

    const parsed = JSON.parse(jsonValue);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.map(clonarCambioFisico);
  } catch (error) {
    console.error(
      'Error al cargar cambios físicos desde AsyncStorage:',
      error
    );
    return [];
  }
};

/**
 * Guarda de forma inmutable un nuevo registro de cambio físico (incluyendo resumenSimple,
 * resumenDetallado para la siguiente Spec, balanceDelDia y veredicto 0/10) y actualiza
 * el último peso en el perfil del usuario (RF-12, RF-13, RF-16).
 * @param {Object} nuevoRegistro
 * @returns {Promise<Array<Object>>}
 */
export const guardarCambioFisico = async (nuevoRegistro) => {
  try {
    const [registrosActuales, perfilActual] = await Promise.all([
      cargarCambiosFisicos(),
      cargarPerfilUsuario(),
    ]);
    const fechaLocal = nuevoRegistro?.fecha || obtenerFechaLocal(new Date());

    const registroNormalizado = clonarCambioFisico({
      ...nuevoRegistro,
      id:
        nuevoRegistro?.id ||
        `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      fecha: fechaLocal,
      creadoEn: Date.now(),
    });

    const nuevaListaInmutable = [
      registroNormalizado,
      ...registrosActuales.map(clonarCambioFisico),
    ];

    const nuevoPerfil = {
      ...perfilActual,
      pesoKgActual: registroNormalizado.pesoKg,
      actualizadoEn: Date.now(),
    };

    await Promise.all([
      AsyncStorage.setItem(
        STORAGE_KEY_CAMBIOS_FISICOS,
        JSON.stringify(nuevaListaInmutable)
      ),
      AsyncStorage.setItem(STORAGE_KEY_PERFIL, JSON.stringify(nuevoPerfil)),
    ]);

    return nuevaListaInmutable.map(clonarCambioFisico);
  } catch (error) {
    console.error('Error al guardar cambio físico en AsyncStorage:', error);
    return [];
  }
};

/**
 * Guarda de forma inmutable el resultado de la comparativa contra el registro anterior
 * dentro del registro de cambio físico indicado (RF-15, RF-16).
 * @param {string} idRegistro
 * @param {Object} datosComparacion
 * @returns {Promise<Array<Object>>}
 */
export const actualizarComparacionCambioFisico = async (
  idRegistro,
  datosComparacion
) => {
  try {
    const registrosActuales = await cargarCambiosFisicos();
    const nuevaListaInmutable = registrosActuales.map((registro) => {
      if (String(registro.id) !== String(idRegistro)) {
        return clonarCambioFisico(registro);
      }
      return clonarCambioFisico({
        ...registro,
        comparacionAnterior: {
          ...datosComparacion,
          comparadoEn: Date.now(),
        },
      });
    });

    await AsyncStorage.setItem(
      STORAGE_KEY_CAMBIOS_FISICOS,
      JSON.stringify(nuevaListaInmutable)
    );

    return nuevaListaInmutable.map(clonarCambioFisico);
  } catch (error) {
    console.error(
      'Error al actualizar comparación de cambio físico en AsyncStorage:',
      error
    );
    throw new Error(
      'No se pudo guardar la comparación en el almacenamiento local.'
    );
  }
};

/**
 * Elimina de forma inmutable un registro de cambio físico por su ID en AsyncStorage (RF-17).
 * @param {string} id
 * @returns {Promise<Array<Object>>}
 */
export const eliminarCambioFisico = async (id) => {
  try {
    const registrosActuales = await cargarCambiosFisicos();
    const nuevaListaInmutable = registrosActuales
      .filter((registro) => String(registro.id) !== String(id))
      .map(clonarCambioFisico);

    await AsyncStorage.setItem(
      STORAGE_KEY_CAMBIOS_FISICOS,
      JSON.stringify(nuevaListaInmutable)
    );

    return nuevaListaInmutable.map(clonarCambioFisico);
  } catch (error) {
    console.error('Error al eliminar cambio físico en AsyncStorage:', error);
    throw new Error(
      'No se pudo eliminar el registro físico del almacenamiento local.'
    );
  }
};

/**
 * Obtiene un arreglo inmutable con las fechas únicas (YYYY-MM-DD) que tienen actividad registrada
 * (al menos un entrenamiento, una comida, un registro de cambio físico o día de descanso). Si todos quedan en 0
 * para un día, la fecha deja de incluirse y su celda en el heatmap vuelve a gris (#2A2A2A).
 * @returns {Promise<Array<string>>} Lista de fechas en formato local YYYY-MM-DD
 */
export const obtenerDiasConActividad = async () => {
  try {
    const [entrenamientos, comidas, cambiosFisicos, diasDescanso] = await Promise.all([
      cargarEntrenamientos(),
      cargarComidas(),
      cargarCambiosFisicos(),
      cargarDiasDescanso(),
    ]);

    const fechasEntrenamientos = entrenamientos
      .map((registro) => registro.fecha)
      .filter(Boolean);

    const fechasComidas = comidas
      .map((comida) => comida.fecha)
      .filter(Boolean);

    const fechasCambiosFisicos = cambiosFisicos
      .map((cambio) => cambio.fecha)
      .filter(Boolean);

    const fechasDescanso = diasDescanso.filter(Boolean);

    const diasUnicos = Array.from(
      new Set([
        ...fechasEntrenamientos,
        ...fechasComidas,
        ...fechasCambiosFisicos,
        ...fechasDescanso,
      ])
    );
    return [...diasUnicos];
  } catch (error) {
    console.error('Error al obtener días con actividad:', error);
    return [];
  }
};

/**
 * Carga la lista de fechas marcadas como día de descanso desde AsyncStorage (RF-3, RF-6).
 * @returns {Promise<Array<string>>} Arreglo inmutable de fechas 'YYYY-MM-DD'
 */
export const cargarDiasDescanso = async () => {
  try {
    const jsonValue = await AsyncStorage.getItem(STORAGE_KEY_DIAS_DESCANSO);
    if (!jsonValue) {
      return [];
    }
    const parsed = JSON.parse(jsonValue);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return [...parsed.filter((item) => typeof item === 'string')];
  } catch (error) {
    console.error('Error al cargar días de descanso desde AsyncStorage:', error);
    return [];
  }
};

/**
 * Alterna de forma inmutable el estado de día de descanso para una fecha (RF-3).
 * Si ya estaba marcado, lo elimina. Si no, lo agrega.
 * @param {string} [fecha=obtenerFechaLocal()]
 * @returns {Promise<Array<string>>} Lista actualizada e inmutable de días de descanso
 */
export const alternarDiaDescanso = async (fecha = obtenerFechaLocal()) => {
  try {
    const diasActuales = await cargarDiasDescanso();
    const yaExiste = diasActuales.includes(fecha);

    const nuevaListaInmutable = yaExiste
      ? diasActuales.filter((f) => f !== fecha)
      : [...diasActuales, fecha];

    await AsyncStorage.setItem(
      STORAGE_KEY_DIAS_DESCANSO,
      JSON.stringify(nuevaListaInmutable)
    );

    return [...nuevaListaInmutable];
  } catch (error) {
    console.error('Error al alternar día de descanso en AsyncStorage:', error);
    return [];
  }
};

/**
 * Genera en un único recorrido O(1) por registro el mapa de resumen anual de hábitos
 * para el año solicitado, cruzando entrenamientos, comidas, fotos físicas y días de descanso.
 * 
 * @param {number} [year=new Date().getFullYear()]
 * @returns {Promise<Record<string, Object>>} Diccionario indexado por 'YYYY-MM-DD'
 */
export const obtenerResumenAnualHabitos = async (
  year = new Date().getFullYear()
) => {
  try {
    const prefijoAnio = `${year}-`;

    const [entrenamientos, comidas, cambiosFisicos, diasDescanso] =
      await Promise.all([
        cargarEntrenamientos(),
        cargarComidas(),
        cargarCambiosFisicos(),
        cargarDiasDescanso(),
      ]);

    const mapaResumen = {};

    const obtenerOCrearEntrada = (fecha) => {
      if (!mapaResumen[fecha]) {
        mapaResumen[fecha] = {
          fecha,
          entrenamientos: [],
          comidas: [],
          comidasCount: 0,
          calorias: 0,
          hasWorkout: false,
          isRestDay: false,
          hasPhoto: false,
          fotosCount: 0,
          score: 0.0,
          nivelColor: 0,
        };
      }
      return mapaResumen[fecha];
    };

    // 1. Agrupar entrenamientos del año
    for (let i = 0; i < entrenamientos.length; i += 1) {
      const e = entrenamientos[i];
      if (e?.fecha && e.fecha.startsWith(prefijoAnio)) {
        const entry = obtenerOCrearEntrada(e.fecha);
        entry.entrenamientos.push(e);
        entry.hasWorkout = true;
      }
    }

    // 2. Agrupar comidas del año
    for (let i = 0; i < comidas.length; i += 1) {
      const c = comidas[i];
      if (c?.fecha && c.fecha.startsWith(prefijoAnio)) {
        const entry = obtenerOCrearEntrada(c.fecha);
        entry.comidas.push(c);
        entry.comidasCount += 1;
        entry.calorias += Number(c.calorias) || 0;
      }
    }

    // 3. Agrupar fotos físicas del año (insignia extra sin penalización)
    for (let i = 0; i < cambiosFisicos.length; i += 1) {
      const cf = cambiosFisicos[i];
      if (cf?.fecha && cf.fecha.startsWith(prefijoAnio)) {
        const entry = obtenerOCrearEntrada(cf.fecha);
        const cantFotos = Array.isArray(cf.urisFotos) && cf.urisFotos.length > 0
          ? cf.urisFotos.length
          : Number(cf.cantidadFotos) || 0;
        if (cantFotos > 0) {
          entry.hasPhoto = true;
          entry.fotosCount += cantFotos;
        }
      }
    }

    // 4. Marcar días de descanso del año
    for (let i = 0; i < diasDescanso.length; i += 1) {
      const f = diasDescanso[i];
      if (typeof f === 'string' && f.startsWith(prefijoAnio)) {
        const entry = obtenerOCrearEntrada(f);
        entry.isRestDay = true;
      }
    }

    // 5. Calcular score y nivel de color para cada día con actividad/descanso
    const fechas = Object.keys(mapaResumen);
    for (let i = 0; i < fechas.length; i += 1) {
      const fecha = fechas[i];
      const entry = mapaResumen[fecha];
      entry.score = calcularScoreVaso(entry);
      entry.nivelColor = obtenerNivelColor(entry.score);
    }

    return { ...mapaResumen };
  } catch (error) {
    console.error('Error al obtener resumen anual de hábitos:', error);
    return {};
  }
};
