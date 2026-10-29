import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  CLAVE_STORAGE_API_KEY,
  cargarApiKeyGemini,
  eliminarApiKeyGemini,
  guardarApiKeyGemini,
} from '../src/services/apiKeyStorage';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

describe('apiKeyStorage', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  test('guarda la clave sin espacios y la vuelve a cargar', async () => {
    await expect(guardarApiKeyGemini('  clave-de-prueba  ')).resolves.toBe(true);
    await expect(AsyncStorage.getItem(CLAVE_STORAGE_API_KEY)).resolves.toBe('clave-de-prueba');
    await expect(cargarApiKeyGemini()).resolves.toBe('clave-de-prueba');
  });

  test('rechaza claves vacias o que no son texto', async () => {
    await expect(guardarApiKeyGemini('   ')).resolves.toBe(false);
    await expect(guardarApiKeyGemini(null)).resolves.toBe(false);
    await expect(guardarApiKeyGemini(123)).resolves.toBe(false);
    await expect(cargarApiKeyGemini()).resolves.toBeNull();
  });

  test('eliminar deja la clave en null', async () => {
    await guardarApiKeyGemini('otra-clave');
    await expect(eliminarApiKeyGemini()).resolves.toBe(true);
    await expect(cargarApiKeyGemini()).resolves.toBeNull();
  });
});
