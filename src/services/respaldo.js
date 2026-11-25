/**
 * Respaldo y restauración de datos (Spec 025).
 *
 * El archivo de respaldo viene de fuera (otro teléfono, Drive, WhatsApp…) y se trata como NO
 * confiable: solo se aceptan las claves de una lista cerrada, cada valor debe tener la forma que la
 * app espera y las rutas de fotos no pueden salir de `Paths.document/fotos/`.
 *
 * La restauración es atómica para AsyncStorage: primero se escriben las claves nuevas, después se
 * borran las sobrantes, y si algo falla se vuelve a dejar todo como estaba. Las fotos nativas se
 * escriben antes y sin borrar nada (las que queden huérfanas no hacen daño).
 *
 * La API key nunca viaja: no está en la lista cerrada y además se descarta cualquier clave que
 * contenga `api_key`.
 */
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  STORAGE_KEY,
  STORAGE_KEY_CAMBIOS_FISICOS,
  STORAGE_KEY_CATALOGO_PERSONALIZADO,
  STORAGE_KEY_COMIDAS,
  STORAGE_KEY_DIAS_DESCANSO,
  STORAGE_KEY_PERFIL,
  STORAGE_KEY_SESION_ACTIVA_DRAFT,
  obtenerFechaLocal,
} from './storage';
import {
  PREFIJO_RESUMEN_ESTUDIO,
  PREFIJO_SESIONES_ESTUDIO,
  STORAGE_KEY_MATERIAS,
} from './estudioStorage';
import { PREFIJO_CLAVE_FOTO_WEB, rotarMiniaturasWeb } from './fotosStorage';
import { CLAVE_PREFERENCIAS } from './sonidos';

export const APP_RESPALDO = 'mi-fitness-app';
export const VERSION_RESPALDO = 1;
export const MAX_BYTES_ARCHIVO = 50 * 1024 * 1024;
export const MAX_BYTES_FOTO = 2 * 1024 * 1024;
export const MAX_FOTOS = 2000;
/** localStorage tiene ~5 MB por origen: se deja margen para lo que la app escriba después. */
export const MAX_BYTES_WEB = 4 * 1024 * 1024;

const esLista = (v) => Array.isArray(v);
const esObjeto = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const RE_DATA_URI = /^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/;
const RE_BASE64 = /^[A-Za-z0-9+/=]+$/;
const RE_RUTA_FOTO = /^fotos\/[a-z0-9_-]{1,40}\/[a-z0-9_-]{1,80}\.jpg$/i;

const CLAVES_EXACTAS = {
  [STORAGE_KEY]: esLista,
  [STORAGE_KEY_COMIDAS]: esLista,
  [STORAGE_KEY_PERFIL]: esObjeto,
  [STORAGE_KEY_CAMBIOS_FISICOS]: esLista,
  [STORAGE_KEY_CATALOGO_PERSONALIZADO]: esLista,
  [STORAGE_KEY_DIAS_DESCANSO]: esLista,
  [STORAGE_KEY_MATERIAS]: esLista,
  [CLAVE_PREFERENCIAS]: esObjeto,
};

const CLAVES_POR_PREFIJO = [
  { prefijo: PREFIJO_SESIONES_ESTUDIO, sufijo: /^\d{4}-\d{2}$/, forma: esLista },
  { prefijo: PREFIJO_RESUMEN_ESTUDIO, sufijo: /^\d{4}-\d{2}-\d{2}$/, forma: esObjeto },
];

const esClaveFotoWeb = (clave) =>
  clave.startsWith(PREFIJO_CLAVE_FOTO_WEB) && /^[0-9a-z-]{1,60}$/i.test(clave.slice(PREFIJO_CLAVE_FOTO_WEB.length));

/** Devuelve la función que valida la forma del valor de una clave, o null si la clave no viaja. */
const formaDeClave = (clave) => {
  if (typeof clave !== 'string') return null;
  if (/api_key/i.test(clave) || clave.includes(':corrupto:')) return null;
  if (Object.prototype.hasOwnProperty.call(CLAVES_EXACTAS, clave)) return CLAVES_EXACTAS[clave];
  const porPrefijo = CLAVES_POR_PREFIJO.find(
    (p) => clave.startsWith(p.prefijo) && p.sufijo.test(clave.slice(p.prefijo.length))
  );
  return porPrefijo ? porPrefijo.forma : null;
};

/**
 * ¿La clave entra en un respaldo? Se usa igual al exportar, al validar y al limpiar.
 * @param {string} clave
 * @param {{ incluirFotos?: boolean }} [opciones]
 */
export const esClavePermitida = (clave, { incluirFotos = false } = {}) => {
  if (typeof clave !== 'string') return false;
  if (/api_key/i.test(clave) || clave.includes(':corrupto:')) return false;
  if (esClaveFotoWeb(clave)) return incluirFotos;
  return formaDeClave(clave) !== null;
};

const esWeb = () => Platform.OS === 'web';
const cargarFileSystem = () => require('expo-file-system');

const dos = (n) => String(n).padStart(2, '0');
const marcaCreado = (fecha = new Date()) =>
  `${obtenerFechaLocal(fecha)} ${dos(fecha.getHours())}:${dos(fecha.getMinutes())}`;

/** Fotos nativas: recorre `fotos/<carpeta>/<archivo>.jpg` (Directory.list no es recursivo). */
const leerFotosNativas = async () => {
  const { Directory, File, Paths } = cargarFileSystem();
  const raiz = new Directory(Paths.document, 'fotos');
  if (!raiz.exists) return [];
  const fotos = [];
  for (const carpeta of raiz.list()) {
    if (!(carpeta instanceof Directory)) continue;
    const nombreCarpeta = carpeta.name;
    for (const archivo of carpeta.list()) {
      if (!(archivo instanceof File)) continue;
      const ruta = `fotos/${nombreCarpeta}/${archivo.name}`;
      if (!RE_RUTA_FOTO.test(ruta)) continue;
      // En secuencia a propósito: leerlas todas a la vez dispararía la memoria.
      const base64 = await archivo.base64();
      fotos.push({ ruta, base64 });
    }
  }
  return fotos;
};

/**
 * Construye el objeto de respaldo con los datos actuales.
 * @param {{ incluirFotos?: boolean }} [opciones]
 */
export const construirRespaldo = async ({ incluirFotos = false } = {}) => {
  const claves = (await AsyncStorage.getAllKeys()).filter((k) => esClavePermitida(k, { incluirFotos }));
  const pares = claves.length ? await AsyncStorage.multiGet(claves) : [];
  const datos = {};
  pares.forEach(([clave, valor]) => {
    if (typeof valor === 'string') datos[clave] = valor;
  });
  const fotos = incluirFotos && !esWeb() ? await leerFotosNativas() : [];
  return {
    app: APP_RESPALDO,
    version: VERSION_RESPALDO,
    creado: marcaCreado(),
    plataforma: Platform.OS,
    datos,
    fotos,
  };
};

const contarLista = (datos, clave) => {
  try {
    const v = JSON.parse(datos[clave] ?? '[]');
    return Array.isArray(v) ? v.length : 0;
  } catch {
    return 0;
  }
};

const resumir = (datos, fotos) => {
  const sesiones = Object.keys(datos)
    .filter((k) => k.startsWith(PREFIJO_SESIONES_ESTUDIO))
    .reduce((total, k) => total + contarLista(datos, k), 0);
  const miniaturas = Object.keys(datos).filter(esClaveFotoWeb).length;
  return {
    entrenamientos: contarLista(datos, STORAGE_KEY),
    comidas: contarLista(datos, STORAGE_KEY_COMIDAS),
    cambiosFisicos: contarLista(datos, STORAGE_KEY_CAMBIOS_FISICOS),
    sesionesEstudio: sesiones,
    fotos: fotos.length + miniaturas,
  };
};

const fallo = (error) => ({ ok: false, error });

export const ERRORES_RESPALDO = {
  grande: 'El archivo es demasiado grande para ser un respaldo de esta app.',
  noJson: 'El archivo no es un respaldo válido (no se pudo leer).',
  otraApp: 'Este archivo no es un respaldo de esta app.',
  version: 'Este respaldo es de una versión que esta app no reconoce.',
  danado: 'El respaldo está dañado y no se puede restaurar.',
  webLleno: 'El respaldo es demasiado grande para este navegador. Exporta uno sin fotos.',
};

/**
 * Valida un respaldo ya parseado. Nunca lanza.
 * @param {any} objeto
 * @returns {{ ok: true, datos: Record<string,string>, fotos: Array<{ruta:string,base64:string}>, resumen: object, creado: string } | { ok: false, error: string }}
 */
export const validarRespaldo = (objeto) => {
  if (!esObjeto(objeto)) return fallo(ERRORES_RESPALDO.noJson);
  if (objeto.app !== APP_RESPALDO) return fallo(ERRORES_RESPALDO.otraApp);
  if (objeto.version !== VERSION_RESPALDO) return fallo(ERRORES_RESPALDO.version);
  if (!esObjeto(objeto.datos)) return fallo(ERRORES_RESPALDO.danado);

  const datos = Object.create(null);
  let bytes = 0;
  for (const clave of Object.keys(objeto.datos)) {
    const valor = objeto.datos[clave];
    if (esClaveFotoWeb(clave)) {
      if (typeof valor !== 'string' || !RE_DATA_URI.test(valor) || valor.length > MAX_BYTES_FOTO) {
        return fallo(ERRORES_RESPALDO.danado);
      }
      datos[clave] = valor;
      bytes += valor.length;
      continue;
    }
    const forma = formaDeClave(clave);
    if (!forma) continue; // clave ajena: se ignora
    if (typeof valor !== 'string') return fallo(ERRORES_RESPALDO.danado);
    let parseado;
    try {
      parseado = JSON.parse(valor);
    } catch {
      return fallo(ERRORES_RESPALDO.danado);
    }
    if (!forma(parseado)) return fallo(ERRORES_RESPALDO.danado);
    datos[clave] = valor;
    bytes += valor.length;
  }

  const fotosEntrada = objeto.fotos === undefined ? [] : objeto.fotos;
  if (!Array.isArray(fotosEntrada) || fotosEntrada.length > MAX_FOTOS) return fallo(ERRORES_RESPALDO.danado);
  const fotos = [];
  for (const foto of fotosEntrada) {
    const ruta = foto?.ruta;
    const base64 = foto?.base64;
    if (typeof ruta !== 'string' || !RE_RUTA_FOTO.test(ruta) || ruta.split('/').includes('..')) {
      return fallo(ERRORES_RESPALDO.danado);
    }
    if (typeof base64 !== 'string' || !base64 || base64.length > MAX_BYTES_FOTO || !RE_BASE64.test(base64)) {
      return fallo(ERRORES_RESPALDO.danado);
    }
    fotos.push({ ruta, base64 });
  }

  if (esWeb() && bytes > MAX_BYTES_WEB) return fallo(ERRORES_RESPALDO.webLleno);

  return {
    ok: true,
    datos: { ...datos },
    fotos,
    creado: typeof objeto.creado === 'string' ? objeto.creado.slice(0, 16) : '',
    resumen: resumir(datos, fotos),
  };
};

/** Escribe las fotos nativas en `Paths.document/fotos/` sin borrar ninguna y comprueba que existen. */
const escribirFotosNativas = async (fotos) => {
  if (!fotos.length || esWeb()) return;
  const { Directory, File, Paths } = cargarFileSystem();
  for (const { ruta, base64 } of fotos) {
    const [, carpeta, nombre] = ruta.split('/');
    const directorio = new Directory(Paths.document, 'fotos', carpeta);
    directorio.create({ intermediates: true, idempotent: true });
    const archivo = new File(directorio, nombre);
    await archivo.write(base64, { encoding: 'base64' });
    if (!archivo.exists) throw new Error(`No se pudo escribir la foto ${ruta}`);
  }
};

export const MENSAJE_RESTAURACION_FALLIDA = 'No se pudo restaurar; tus datos siguen como estaban.';

/**
 * Reemplaza los datos actuales por los del respaldo validado.
 * @param {{ ok: true, datos: Record<string,string>, fotos: Array<{ruta:string,base64:string}> }} validado
 */
export const restaurarRespaldo = async (validado) => {
  if (!validado?.ok) throw new Error(ERRORES_RESPALDO.danado);
  try {
    await escribirFotosNativas(validado.fotos);
  } catch {
    throw new Error(MENSAJE_RESTAURACION_FALLIDA);
  }

  const actuales = (await AsyncStorage.getAllKeys()).filter((k) => esClavePermitida(k, { incluirFotos: true }));
  const copia = actuales.length ? await AsyncStorage.multiGet(actuales) : [];
  const nuevas = Object.keys(validado.datos);
  const sobrantes = actuales.filter((k) => !nuevas.includes(k));

  try {
    if (nuevas.length) await AsyncStorage.multiSet(nuevas.map((k) => [k, validado.datos[k]]));
    if (sobrantes.length) await AsyncStorage.multiRemove(sobrantes);
  } catch {
    try {
      const creadas = nuevas.filter((k) => !actuales.includes(k));
      if (creadas.length) await AsyncStorage.multiRemove(creadas);
      const pares = copia.filter(([, v]) => typeof v === 'string');
      if (pares.length) await AsyncStorage.multiSet(pares);
    } catch {
      // Si incluso deshacer falla no hay más que hacer: el mensaje avisa al usuario.
    }
    throw new Error(MENSAJE_RESTAURACION_FALLIDA);
  }

  // El borrador pertenece al estado anterior: se borra solo cuando todo salió bien.
  try {
    await AsyncStorage.removeItem(STORAGE_KEY_SESION_ACTIVA_DRAFT);
  } catch {
    // no impide la restauración
  }
  if (esWeb()) await rotarMiniaturasWeb();
};

export const nombreArchivoRespaldo = () => `respaldo-fitness-${obtenerFechaLocal()}.json`;

const descargarEnWeb = (texto, nombre) => {
  const blob = new Blob([texto], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = nombre;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

/**
 * Crea el respaldo y lo comparte (nativo) o lo descarga (web).
 * @param {{ incluirFotos?: boolean }} [opciones]
 * @returns {Promise<{ resumen: object }>}
 */
export const exportarRespaldo = async ({ incluirFotos = false } = {}) => {
  const respaldo = await construirRespaldo({ incluirFotos });
  const texto = JSON.stringify(respaldo);
  const nombre = nombreArchivoRespaldo();
  if (esWeb()) {
    descargarEnWeb(texto, nombre);
  } else {
    const { File, Paths } = cargarFileSystem();
    const archivo = new File(Paths.cache, nombre);
    await archivo.write(texto);
    const Sharing = require('expo-sharing');
    await Sharing.shareAsync(archivo.uri, {
      mimeType: 'application/json',
      dialogTitle: 'Guardar respaldo',
      UTI: 'public.json',
    });
  }
  return { resumen: resumir(respaldo.datos, respaldo.fotos) };
};

const elegirArchivoWeb = () =>
  new Promise((resolve) => {
    const entrada = document.createElement('input');
    entrada.type = 'file';
    entrada.accept = 'application/json,.json';
    entrada.onchange = () => resolve(entrada.files?.[0] || null);
    entrada.oncancel = () => resolve(null);
    entrada.click();
  });

/**
 * Abre el selector de archivos, lee y valida el respaldo.
 * @returns {Promise<null | ReturnType<typeof validarRespaldo>>} null si el usuario canceló.
 */
export const elegirYLeerRespaldo = async () => {
  let texto;
  if (esWeb()) {
    const archivo = await elegirArchivoWeb();
    if (!archivo) return null;
    if (archivo.size > MAX_BYTES_ARCHIVO) return fallo(ERRORES_RESPALDO.grande);
    texto = await archivo.text();
  } else {
    const { File } = cargarFileSystem();
    const seleccion = await File.pickFileAsync({ mimeTypes: ['application/json'] });
    if (!seleccion || seleccion.canceled || !seleccion.result) return null;
    if ((seleccion.result.size ?? 0) > MAX_BYTES_ARCHIVO) return fallo(ERRORES_RESPALDO.grande);
    texto = await seleccion.result.text();
  }
  let objeto;
  try {
    objeto = JSON.parse(texto);
  } catch {
    return fallo(ERRORES_RESPALDO.noJson);
  }
  return validarRespaldo(objeto);
};
