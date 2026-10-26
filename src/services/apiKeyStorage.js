import AsyncStorage from '@react-native-async-storage/async-storage';

export const CLAVE_STORAGE_API_KEY = '@fitness_tracker_gemini_api_key';

/**
 * Guarda la clave de API de Gemini en AsyncStorage de forma aislada e inmutable.
 * @param {string} clave
 * @returns {Promise<boolean>} Indica si la clave se guardó exitosamente.
 */
export const guardarApiKeyGemini = async (clave) => {
  try {
    if (!clave || typeof clave !== 'string') {
      return false;
    }
    const claveLimpia = clave.trim();
    if (!claveLimpia) {
      return false;
    }
    await AsyncStorage.setItem(CLAVE_STORAGE_API_KEY, claveLimpia);
    return true;
  } catch (error) {
    console.error('Error al guardar la clave de API de Gemini en AsyncStorage:', error);
    return false;
  }
};

/**
 * Carga la clave de API de Gemini almacenada en AsyncStorage.
 * @returns {Promise<string|null>} La clave almacenada o null si no existe o hubo un error.
 */
export const cargarApiKeyGemini = async () => {
  try {
    const clave = await AsyncStorage.getItem(CLAVE_STORAGE_API_KEY);
    return clave && typeof clave === 'string' && clave.trim().length > 0
      ? clave.trim()
      : null;
  } catch (error) {
    console.error('Error al cargar la clave de API de Gemini desde AsyncStorage:', error);
    return null;
  }
};

/**
 * Elimina la clave de API de Gemini almacenada en AsyncStorage.
 * @returns {Promise<boolean>} Indica si la eliminación fue exitosa.
 */
export const eliminarApiKeyGemini = async () => {
  try {
    await AsyncStorage.removeItem(CLAVE_STORAGE_API_KEY);
    return true;
  } catch (error) {
    console.error('Error al eliminar la clave de API de Gemini en AsyncStorage:', error);
    return false;
  }
};
