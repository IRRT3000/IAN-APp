/**
 * Persistencia de fotos (Spec 020, H-7 / plan §6).
 *
 * Las URIs que entrega expo-image-picker apuntan a la caché (nativo), que el sistema puede vaciar,
 * o a blob:/data: (web), que no sobreviven a una recarga. Aquí se copian a un lugar permanente:
 *
 * - Nativo: se copia el archivo a `Paths.document/fotos/<carpeta>/<id>.jpg` y se guarda una
 *   referencia RELATIVA `foto-doc:fotos/<carpeta>/<id>.jpg`, porque la ruta absoluta del contenedor
 *   de iOS cambia tras actualizar o restaurar la app.
 * - Web: se guarda una miniatura JPEG (512 px de ancho) en su propia clave de AsyncStorage
 *   (`@fitness_tracker_foto_v1:<id>`) y se devuelve `foto-local:<id>`. Así las listas de comidas
 *   o de cambio físico solo guardan una referencia corta.
 *
 * Ninguna función lanza errores: guardar un registro nunca se bloquea por su foto.
 */
import { useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

export const PREFIJO_FOTO_LOCAL = 'foto-local:';
export const PREFIJO_FOTO_DOC = 'foto-doc:';
export const PREFIJO_CLAVE_FOTO_WEB = '@fitness_tracker_foto_v1:';
export const ANCHO_MINIATURA_WEB = 512;

const esWeb = () => Platform.OS === 'web';

// expo-file-system solo existe en nativo: se carga de forma perezosa para que web y Jest no lo instancien.
const cargarFileSystem = () => require('expo-file-system');

const generarIdFoto = () =>
  `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

const esCarpetaValida = (carpeta) => /^[a-z0-9_-]{1,40}$/i.test(String(carpeta || ''));

/**
 * Convierte una referencia `foto-doc:` en la URI absoluta actual del archivo (solo nativo).
 * @param {string} referencia
 * @returns {string}
 */
const uriDesdeReferenciaDoc = (referencia) => {
  const relativa = referencia.slice(PREFIJO_FOTO_DOC.length);
  const partes = relativa.split('/').filter(Boolean);
  if (partes.length === 0 || partes.some((p) => p === '..')) return '';
  const { File, Paths } = cargarFileSystem();
  return new File(Paths.document, ...partes).uri;
};

const persistirNativo = async (uriTemporal, carpeta) => {
  const { File, Directory, Paths } = cargarFileSystem();
  const directorio = new Directory(Paths.document, 'fotos', carpeta);
  directorio.create({ intermediates: true, idempotent: true });
  const nombre = `${generarIdFoto()}.jpg`;
  await new File(uriTemporal).copy(new File(directorio, nombre));
  return `${PREFIJO_FOTO_DOC}fotos/${carpeta}/${nombre}`;
};

const persistirWeb = async (uriTemporal) => {
  let contexto = null;
  let imagen = null;
  try {
    contexto = ImageManipulator.manipulate(uriTemporal);
    contexto.resize({ width: ANCHO_MINIATURA_WEB });
    imagen = await contexto.renderAsync();
    const resultado = await imagen.saveAsync({
      base64: true,
      compress: 0.7,
      format: SaveFormat.JPEG,
    });
    if (!resultado?.base64) throw new Error('miniatura vacía');
    const id = generarIdFoto();
    await AsyncStorage.setItem(
      `${PREFIJO_CLAVE_FOTO_WEB}${id}`,
      `data:image/jpeg;base64,${resultado.base64}`
    );
    return `${PREFIJO_FOTO_LOCAL}${id}`;
  } finally {
    try {
      imagen?.release?.();
      contexto?.release?.();
    } catch {
      // liberar es de mejor esfuerzo
    }
  }
};

/**
 * Copia una foto recién tomada o elegida a un almacenamiento permanente.
 * @param {string} uriTemporal - URI que entregó expo-image-picker
 * @param {string} carpeta - 'comidas' | 'fisico'
 * @returns {Promise<string>} referencia permanente; si falla, la URI temporal en nativo o '' en web
 */
export const persistirFoto = async (uriTemporal, carpeta) => {
  const uri = String(uriTemporal || '');
  if (!uri) return '';
  if (!esCarpetaValida(carpeta)) return esWeb() ? '' : uri;

  try {
    return esWeb() ? await persistirWeb(uri) : await persistirNativo(uri, carpeta);
  } catch (error) {
    console.error('fotosStorage: no se pudo persistir la foto:', error?.message);
    // En web la URI temporal es blob: (muere al recargar) o data: (varios MB): no se guarda.
    return esWeb() ? '' : uri;
  }
};

/**
 * Devuelve una URI que <Image> puede pintar, de forma síncrona, si no hace falta leer almacenamiento.
 * @param {string} uri
 * @returns {string|null} la URI lista, o null si es una referencia web que hay que leer de forma asíncrona
 */
export const resolverUriFotoSincrona = (uri) => {
  const valor = String(uri || '');
  if (!valor) return '';
  if (valor.startsWith(PREFIJO_FOTO_LOCAL)) return null;
  if (valor.startsWith(PREFIJO_FOTO_DOC)) {
    if (esWeb()) return '';
    try {
      return uriDesdeReferenciaDoc(valor);
    } catch {
      return '';
    }
  }
  return valor;
};

/**
 * Resuelve cualquier referencia de foto a una URI pintable.
 * @param {string} uri
 * @returns {Promise<string>}
 */
export const resolverUriFoto = async (uri) => {
  const sincrona = resolverUriFotoSincrona(uri);
  if (sincrona !== null) return sincrona;
  try {
    const id = String(uri).slice(PREFIJO_FOTO_LOCAL.length);
    return (await AsyncStorage.getItem(`${PREFIJO_CLAVE_FOTO_WEB}${id}`)) || '';
  } catch {
    return '';
  }
};

/**
 * Hook para pintar una foto guardada. Para URIs normales y referencias nativas responde en el
 * primer render (sin parpadeo); solo las referencias web se leen de forma asíncrona.
 * @param {string} uri
 * @returns {string} URI pintable, o '' mientras carga o si no existe
 */
export const useUriFoto = (uri) => {
  const sincrona = useMemo(() => resolverUriFotoSincrona(uri), [uri]);
  const [asincrona, setAsincrona] = useState({ referencia: null, valor: '' });

  useEffect(() => {
    if (sincrona !== null) return undefined;
    let activo = true;
    resolverUriFoto(uri).then((valor) => {
      if (activo) setAsincrona({ referencia: uri, valor });
    });
    return () => {
      activo = false;
    };
  }, [uri, sincrona]);

  if (sincrona !== null) return sincrona;
  return asincrona.referencia === uri ? asincrona.valor : '';
};

/**
 * Borra una foto persistida. Nunca borra fuera de la carpeta de la app y nunca lanza.
 * @param {string} uri
 * @returns {Promise<void>}
 */
export const eliminarFoto = async (uri) => {
  const valor = String(uri || '');
  if (!valor) return;
  try {
    if (valor.startsWith(PREFIJO_FOTO_LOCAL)) {
      const id = valor.slice(PREFIJO_FOTO_LOCAL.length);
      await AsyncStorage.removeItem(`${PREFIJO_CLAVE_FOTO_WEB}${id}`);
      return;
    }
    if (esWeb()) return;

    const { File, Paths } = cargarFileSystem();
    const uriAbsoluta = valor.startsWith(PREFIJO_FOTO_DOC)
      ? uriDesdeReferenciaDoc(valor)
      : valor;
    const raizDocumentos = Paths.document.uri;
    if (!uriAbsoluta || !uriAbsoluta.startsWith(raizDocumentos)) return;
    const archivo = new File(uriAbsoluta);
    if (archivo.exists) archivo.delete();
  } catch (error) {
    console.error('fotosStorage: no se pudo borrar la foto:', error?.message);
  }
};

/**
 * Borra varias fotos sin repetir y sin lanzar.
 * @param {Array<string>} uris
 * @returns {Promise<void>}
 */
export const eliminarFotos = async (uris = []) => {
  const unicas = Array.from(new Set((uris || []).filter(Boolean).map(String)));
  for (const uri of unicas) {
    await eliminarFoto(uri);
  }
};
