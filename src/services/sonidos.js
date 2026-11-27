/**
 * Sonidos sutiles de la interfaz (Spec 024, RF-5).
 * - 5 sonidos sintetizados (scripts/generar-sonidos.js), ≤ 140 ms, volumen 0.35.
 * - Respetan el modo silencio (iOS y Android) y se mezclan con la música del usuario.
 * - Interruptor «Sonidos de la interfaz» en Configuración, activado por defecto.
 * - Mismo patrón que haptics.js: ninguna función lanza errores.
 * Los reproductores se crean una sola vez al arrancar (inicializarSonidos) y viven toda la sesión.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';

export const CLAVE_PREFERENCIAS = '@fitness_tracker_preferencias_v1';
export const VOLUMEN_SONIDOS = 0.35;

const FUENTES = {
  toque: require('../../assets/sonidos/toque.wav'),
  exito: require('../../assets/sonidos/exito.wav'),
  serie: require('../../assets/sonidos/serie.wav'),
  error: require('../../assets/sonidos/error.wav'),
  borrado: require('../../assets/sonidos/borrado.wav'),
};
export const NOMBRES_SONIDOS = Object.keys(FUENTES);

const reproductores = {};
let inicializado = false;
let sonidosActivos = true;

const leerPreferencias = async () => {
  try {
    const crudo = await AsyncStorage.getItem(CLAVE_PREFERENCIAS);
    const objeto = crudo ? JSON.parse(crudo) : null;
    return objeto && typeof objeto === 'object' && !Array.isArray(objeto) ? objeto : {};
  } catch {
    return {};
  }
};

/** Carga la preferencia guardada (por defecto, sonidos activados). */
export const cargarPreferenciaSonidos = async () => {
  const preferencias = await leerPreferencias();
  sonidosActivos = preferencias.sonidos !== false;
  return sonidosActivos;
};

/** Guarda la preferencia y la aplica al instante. */
export const establecerSonidosActivos = async (activos) => {
  sonidosActivos = Boolean(activos);
  try {
    const preferencias = await leerPreferencias();
    await AsyncStorage.setItem(CLAVE_PREFERENCIAS, JSON.stringify({ ...preferencias, sonidos: sonidosActivos }));
  } catch {
    // si no se puede guardar, la preferencia sigue aplicada en esta sesión
  }
  return sonidosActivos;
};

export const obtenerSonidosActivos = () => sonidosActivos;

/** Crea los reproductores y fija el modo de audio. Idempotente; se llama una vez al arrancar. */
export const inicializarSonidos = async () => {
  if (inicializado) return;
  inicializado = true;
  try {
    await setAudioModeAsync({ playsInSilentMode: false, interruptionMode: 'mixWithOthers' });
  } catch {
    // el modo de audio es una mejora; sin él los sonidos siguen funcionando
  }
  for (const nombre of NOMBRES_SONIDOS) {
    try {
      const reproductor = createAudioPlayer(FUENTES[nombre]);
      reproductor.volume = VOLUMEN_SONIDOS;
      reproductores[nombre] = reproductor;
    } catch {
      // un sonido que no carga no debe afectar a los demás
    }
  }
  await cargarPreferenciaSonidos();
};

/**
 * Reproduce un sonido de la interfaz si la preferencia lo permite. Nunca lanza.
 * @param {'toque'|'exito'|'serie'|'error'|'borrado'} nombre
 */
export const reproducirSonido = async (nombre) => {
  if (!sonidosActivos) return;
  const reproductor = reproductores[nombre];
  if (!reproductor) return;
  try {
    await reproductor.seekTo(0);
    // En web, play() puede rechazarse por la política de autoplay del navegador.
    Promise.resolve(reproductor.play()).catch(() => {});
  } catch {
    // un sonido fallido nunca interrumpe la app
  }
};

/** Solo para pruebas. */
export const __reiniciarSonidosParaTests = () => {
  inicializado = false;
  sonidosActivos = true;
  for (const n of Object.keys(reproductores)) delete reproductores[n];
};
