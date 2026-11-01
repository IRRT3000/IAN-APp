/* eslint-disable import/namespace */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

import {
  obtenerApiKeyActiva,
  obtenerModelos,
  validarApiKeyGemini,
  analizarComidaConGemini,
  GeminiError,
} from '../src/services/gemini';
import {
  guardarApiKeyGemini,
  MENSAJE_FORMATO_API_KEY_INVALIDO,
} from '../src/services/apiKeyStorage';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
jest.mock('expo-secure-store');

describe('Seguridad de API Key en Gemini Service (Spec 017)', () => {
  const CLAVE_AIZA = 'AIza' + 'A'.repeat(35);
  const CLAVE_AQ = 'AQ.' + 'Ab8RN6'.repeat(8) + 'xY';
  const fetchOriginal = globalThis.fetch;

  beforeEach(async () => {
    await AsyncStorage.clear();
    SecureStore.__reiniciar();
    globalThis.fetch = jest.fn();
  });

  afterEach(() => {
    globalThis.fetch = fetchOriginal;
  });

  test('obtenerApiKeyActiva sin clave guardada lanza GeminiError (CA-2)', async () => {
    await expect(obtenerApiKeyActiva()).rejects.toThrow(GeminiError);
    await expect(obtenerApiKeyActiva()).rejects.toThrow(
      'No se ha configurado ninguna clave de API de Gemini.'
    );
  });

  test('validarApiKeyGemini con clave válida envía x-goog-api-key y URL sin query param (CA-3)', async () => {
    globalThis.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({}),
    });

    const resultado = await validarApiKeyGemini(CLAVE_AIZA);
    expect(resultado).toEqual({ valida: true });

    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    const [url, opciones] = globalThis.fetch.mock.calls[0];
    expect(url).toBe('https://generativelanguage.googleapis.com/v1beta/models');
    expect(url).not.toContain('key=');
    expect(opciones.headers['x-goog-api-key']).toBe(CLAVE_AIZA);
    expect(opciones.headers['Content-Type']).toBe('application/json');
  });

  test('validarApiKeyGemini con formato inválido falla sin llamar a fetch (CA-7)', async () => {
    const resultado = await validarApiKeyGemini('clave con espacios internos 123456');
    expect(resultado).toEqual({
      valida: false,
      error: MENSAJE_FORMATO_API_KEY_INVALIDO,
    });
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  test('analizarComidaConGemini ejecuta llamada con x-goog-api-key y URL sin key= (CA-3)', async () => {
    await guardarApiKeyGemini(CLAVE_AQ);

    globalThis.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: async () => '',
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [{ text: '{"nombrePlatillo":"Avena","caloriasTotales":350}' }],
            },
          },
        ],
      }),
    });

    const resultado = await analizarComidaConGemini('aGVsbG8=', 'Avena');
    expect(resultado).toBeDefined();

    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    const [url, opciones] = globalThis.fetch.mock.calls[0];
    expect(url).not.toContain('key=');
    expect(opciones.headers['x-goog-api-key']).toBe(CLAVE_AQ);
  });

  test('contrato de API exporta funciones requeridas y GeminiError es clase (CA-12)', () => {
    expect(typeof obtenerApiKeyActiva).toBe('function');
    expect(typeof obtenerModelos).toBe('function');
    expect(typeof validarApiKeyGemini).toBe('function');
    expect(typeof GeminiError).toBe('function');
    const err = new GeminiError('prueba');
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe('GeminiError');
  });
});
