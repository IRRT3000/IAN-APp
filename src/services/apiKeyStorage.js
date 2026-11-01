import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

export const CLAVE_SECURE_STORE_API_KEY = 'fitness_tracker_gemini_api_key';
export const CLAVE_STORAGE_API_KEY_LEGADA = '@fitness_tracker_gemini_api_key';
export const MENSAJE_FORMATO_API_KEY_INVALIDO =
  'La clave debe tener entre 20 y 256 caracteres, sin espacios, y solo letras, números, punto, guion o guion bajo.';

const OPCIONES_SECURE_STORE = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

export const normalizarApiKey = (clave) => {
  if (typeof clave === 'string') {
    return clave.trim();
  }
  return '';
};

export const esFormatoApiKeyValido = (clave) => {
  const limpia = normalizarApiKey(clave);
  return /^[A-Za-z0-9._-]{20,256}$/.test(limpia);
};

const eliminarCopiaLegada = async () => {
  try {
    await AsyncStorage.removeItem(CLAVE_STORAGE_API_KEY_LEGADA);
    return true;
  } catch (error) {
    console.error('Error al eliminar la copia legada de la API key en AsyncStorage:', error);
    return false;
  }
};

const leerSegura = async () => {
  try {
    const valor = await SecureStore.getItemAsync(CLAVE_SECURE_STORE_API_KEY);
    return { error: false, valor };
  } catch (error) {
    console.error('Error al leer la clave de API desde SecureStore:', error);
    return { error: true, valor: null };
  }
};

const leerLegada = async () => {
  try {
    const valor = await AsyncStorage.getItem(CLAVE_STORAGE_API_KEY_LEGADA);
    return typeof valor === 'string' && valor.length > 0 ? valor : null;
  } catch (error) {
    console.error('Error al leer la copia legada de la API key en AsyncStorage:', error);
    return null;
  }
};

const migrarClaveLegada = async () => {
  const legada = await leerLegada();
  if (!legada) {
    return null;
  }

  const limpia = normalizarApiKey(legada);
  if (!esFormatoApiKeyValido(limpia)) {
    await eliminarCopiaLegada();
    return null;
  }

  // Defensa 2b: verificar concurrencia antes de escribir
  const reintentoSegura = await leerSegura();
  if (!reintentoSegura.error && esFormatoApiKeyValido(reintentoSegura.valor)) {
    await eliminarCopiaLegada();
    return normalizarApiKey(reintentoSegura.valor);
  }

  try {
    await SecureStore.setItemAsync(
      CLAVE_SECURE_STORE_API_KEY,
      limpia,
      OPCIONES_SECURE_STORE
    );
  } catch (error) {
    console.error('Error al migrar la clave a SecureStore:', error);
    // Conserva copia en AsyncStorage y retorna limpia para esta sesión (Defensa 1)
    return limpia;
  }

  await eliminarCopiaLegada();
  return limpia;
};

export const guardarApiKeyGemini = async (clave) => {
  const claveLimpia = normalizarApiKey(clave);
  if (!esFormatoApiKeyValido(claveLimpia)) {
    return false;
  }

  try {
    await SecureStore.setItemAsync(
      CLAVE_SECURE_STORE_API_KEY,
      claveLimpia,
      OPCIONES_SECURE_STORE
    );
  } catch (error) {
    console.error('Error al guardar la clave de API en SecureStore:', error);
    return false;
  }

  await eliminarCopiaLegada();
  return true;
};

export const cargarApiKeyGemini = async () => {
  const segura = await leerSegura();

  if (!segura.error && esFormatoApiKeyValido(segura.valor)) {
    await eliminarCopiaLegada();
    return normalizarApiKey(segura.valor);
  }

  if (segura.error) {
    const legada = await leerLegada();
    if (legada && esFormatoApiKeyValido(legada)) {
      return normalizarApiKey(legada);
    }
    return null;
  }

  return migrarClaveLegada();
};

export const eliminarApiKeyGemini = async () => {
  let exitoSeguro = true;
  try {
    await SecureStore.deleteItemAsync(CLAVE_SECURE_STORE_API_KEY);
  } catch (error) {
    console.error('Error al eliminar la clave de API en SecureStore:', error);
    exitoSeguro = false;
  }

  const exitoLegado = await eliminarCopiaLegada();
  return exitoSeguro && exitoLegado;
};
