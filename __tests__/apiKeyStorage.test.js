/* eslint-disable import/namespace */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

import {
  CLAVE_SECURE_STORE_API_KEY,
  CLAVE_STORAGE_API_KEY_LEGADA,
  normalizarApiKey,
  esFormatoApiKeyValido,
  guardarApiKeyGemini,
  cargarApiKeyGemini,
  eliminarApiKeyGemini,
} from '../src/services/apiKeyStorage';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
jest.mock('expo-secure-store');

describe('apiKeyStorage (Spec 017)', () => {
  const CLAVE_AIZA = 'AIza' + 'A'.repeat(35);
  const CLAVE_AQ = 'AQ.' + 'Ab8RN6'.repeat(8) + 'xY';
  const CLAVE_20 = 'K'.repeat(20);
  const CLAVE_256 = 'K'.repeat(256);

  beforeEach(async () => {
    await AsyncStorage.clear();
    SecureStore.__reiniciar();
  });

  describe('normalizarApiKey y esFormatoApiKeyValido', () => {
    test('normalizar recorta espacios de los extremos y trata no-strings como vacíos', () => {
      expect(normalizarApiKey('  clave  ')).toBe('clave');
      expect(normalizarApiKey(null)).toBe('');
      expect(normalizarApiKey(undefined)).toBe('');
      expect(normalizarApiKey(12345)).toBe('');
    });

    test('acepta longitudes límite 20 y 256 y formatos válidos de Google (CA-7)', () => {
      expect(esFormatoApiKeyValido(CLAVE_20)).toBe(true);
      expect(esFormatoApiKeyValido(CLAVE_256)).toBe(true);
      expect(esFormatoApiKeyValido(CLAVE_AIZA)).toBe(true);
      expect(esFormatoApiKeyValido(CLAVE_AQ)).toBe(true);
    });

    test('rechaza longitudes 19 y 257 y caracteres no permitidos (CA-7)', () => {
      expect(esFormatoApiKeyValido('K'.repeat(19))).toBe(false);
      expect(esFormatoApiKeyValido('K'.repeat(257))).toBe(false);
      expect(esFormatoApiKeyValido('clave con espacios 123456')).toBe(false);
      expect(esFormatoApiKeyValido('clave@con@arroba12345678')).toBe(false);
      expect(esFormatoApiKeyValido('clave\ncon\nsaltos12345678')).toBe(false);
    });
  });

  describe('guardarApiKeyGemini (CA-4, CA-7)', () => {
    test('guarda en SecureStore con keychainAccessible 6 y elimina copia de AsyncStorage', async () => {
      await AsyncStorage.setItem(CLAVE_STORAGE_API_KEY_LEGADA, CLAVE_20);

      const exito = await guardarApiKeyGemini(`  ${CLAVE_AIZA}  `);
      expect(exito).toBe(true);

      const entrada = SecureStore.__obtenerEntrada(CLAVE_SECURE_STORE_API_KEY);
      expect(entrada).toBeDefined();
      expect(entrada.valor).toBe(CLAVE_AIZA);
      expect(entrada.opciones.keychainAccessible).toBe(
        SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY
      );

      const legada = await AsyncStorage.getItem(CLAVE_STORAGE_API_KEY_LEGADA);
      expect(legada).toBeNull();
    });

    test('rechaza claves con formato inválido sin tocar el almacenamiento', async () => {
      const exito = await guardarApiKeyGemini('invalida');
      expect(exito).toBe(false);
      expect(SecureStore.__obtenerEntrada(CLAVE_SECURE_STORE_API_KEY)).toBeUndefined();
    });

    test('si SecureStore falla al escribir, devuelve false (Defensa 3)', async () => {
      SecureStore.__simularFallos({ escritura: true });
      const exito = await guardarApiKeyGemini(CLAVE_20);
      expect(exito).toBe(false);
    });
  });

  describe('cargarApiKeyGemini y migración (CA-5)', () => {
    test('devuelve la clave de SecureStore si ya existe y purga copias legadas (Defensa 2)', async () => {
      await SecureStore.setItemAsync(
        CLAVE_SECURE_STORE_API_KEY,
        CLAVE_AQ,
        {}
      );
      await AsyncStorage.setItem(CLAVE_STORAGE_API_KEY_LEGADA, CLAVE_20);

      const resultado = await cargarApiKeyGemini();
      expect(resultado).toBe(CLAVE_AQ);

      const legada = await AsyncStorage.getItem(CLAVE_STORAGE_API_KEY_LEGADA);
      expect(legada).toBeNull();
    });

    test('migra atómicamente la copia legada a SecureStore y borra AsyncStorage', async () => {
      await AsyncStorage.setItem(CLAVE_STORAGE_API_KEY_LEGADA, `  ${CLAVE_AIZA}  `);

      const resultado = await cargarApiKeyGemini();
      expect(resultado).toBe(CLAVE_AIZA);

      const enSeguro = SecureStore.__obtenerEntrada(CLAVE_SECURE_STORE_API_KEY);
      expect(enSeguro.valor).toBe(CLAVE_AIZA);

      const legada = await AsyncStorage.getItem(CLAVE_STORAGE_API_KEY_LEGADA);
      expect(legada).toBeNull();
    });

    test('si escritura falla en migración, devuelve la clave y conserva la copia (Defensa 1)', async () => {
      await AsyncStorage.setItem(CLAVE_STORAGE_API_KEY_LEGADA, CLAVE_20);
      SecureStore.__simularFallos({ escritura: true });

      const resultado = await cargarApiKeyGemini();
      expect(resultado).toBe(CLAVE_20);

      const legada = await AsyncStorage.getItem(CLAVE_STORAGE_API_KEY_LEGADA);
      expect(legada).toBe(CLAVE_20);
    });

    test('si lectura de SecureStore falla, devuelve copia legada sin escribir ni borrar (Defensa 1)', async () => {
      await AsyncStorage.setItem(CLAVE_STORAGE_API_KEY_LEGADA, CLAVE_20);
      SecureStore.__simularFallos({ lectura: true });

      const resultado = await cargarApiKeyGemini();
      expect(resultado).toBe(CLAVE_20);

      const legada = await AsyncStorage.getItem(CLAVE_STORAGE_API_KEY_LEGADA);
      expect(legada).toBe(CLAVE_20);
      expect(SecureStore.__obtenerEntrada(CLAVE_SECURE_STORE_API_KEY)).toBeUndefined();
    });

    test('si lectura de SecureStore falla y no hay copia legada, devuelve null (Defensa 3)', async () => {
      SecureStore.__simularFallos({ lectura: true });
      const resultado = await cargarApiKeyGemini();
      expect(resultado).toBeNull();
    });

    test('copia legada con formato inválido se borra y devuelve null', async () => {
      await AsyncStorage.setItem(CLAVE_STORAGE_API_KEY_LEGADA, 'clave-corta');

      const resultado = await cargarApiKeyGemini();
      expect(resultado).toBeNull();

      const legada = await AsyncStorage.getItem(CLAVE_STORAGE_API_KEY_LEGADA);
      expect(legada).toBeNull();
    });
  });

  describe('eliminarApiKeyGemini (CA-6)', () => {
    test('elimina la clave de SecureStore y de AsyncStorage, devolviendo true', async () => {
      await guardarApiKeyGemini(CLAVE_AIZA);
      await AsyncStorage.setItem(CLAVE_STORAGE_API_KEY_LEGADA, CLAVE_AIZA);

      const exito = await eliminarApiKeyGemini();
      expect(exito).toBe(true);

      const enSeguro = SecureStore.__obtenerEntrada(CLAVE_SECURE_STORE_API_KEY);
      expect(enSeguro).toBeUndefined();

      const legada = await AsyncStorage.getItem(CLAVE_STORAGE_API_KEY_LEGADA);
      expect(legada).toBeNull();
    });

    test('si SecureStore falla al borrar, devuelve false', async () => {
      SecureStore.__simularFallos({ borrado: true });
      const exito = await eliminarApiKeyGemini();
      expect(exito).toBe(false);
    });
  });
});
