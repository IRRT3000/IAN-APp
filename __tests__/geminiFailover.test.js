/**
 * Motor de failover de Gemini (Spec 021, CA-1 a CA-5).
 */
import fs from 'fs';
import {
  analizarComidaConGemini,
  analizarCambioFisicoConGemini,
  compararCambioFisicoConGemini,
  clasificarFallo,
  mensajeParaUsuario,
  __reiniciarEstadoGeminiParaTests,
  GeminiError,
  MODELO_PRINCIPAL_DEFAULT,
} from '../src/services/gemini';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
jest.mock('../src/services/apiKeyStorage', () => ({
  ...jest.requireActual('../src/services/apiKeyStorage'),
  cargarApiKeyGemini: async () => 'CLAVE_DE_PRUEBA_1234567890abcdef',
}));

const CLAVE = 'CLAVE_DE_PRUEBA_1234567890abcdef';
const FOTO = 'QUJD';

const ok = (objeto, extra = {}) => ({
  ok: true,
  status: 200,
  json: async () => ({
    candidates: [{ content: { parts: [{ text: JSON.stringify(objeto) }] }, ...extra }],
  }),
});
const error = (status, cuerpo = {}) => ({
  ok: false,
  status,
  text: async () => JSON.stringify({ error: { message: `error ${status}`, ...cuerpo } }),
});
const modeloDeUrl = (url) => /models\/([^:]+):/.exec(String(url))[1];

/** Reloj falso: esperar() avanza el reloj sin dormir. */
const crearEntorno = () => {
  const estado = { t: 0, esperas: [] };
  return {
    estado,
    entorno: {
      ahora: () => estado.t,
      esperar: async (ms) => {
        estado.esperas.push(ms);
        estado.t += ms;
      },
      aleatorio: () => 0.5,
    },
  };
};

const comidaValida = { nombre: 'Manzana', calorias: 95, proteinas: 0.5, carbohidratos: 25, grasas: 0.3 };

beforeEach(() => {
  __reiniciarEstadoGeminiParaTests();
  jest.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => jest.restoreAllMocks());

describe('CA-1: un solo motor', () => {
  test('gemini.js tiene un solo bucle de modelos y una sola llamada a ejecutarLlamadaGemini', () => {
    const fuente = fs.readFileSync('src/services/gemini.js', 'utf8');
    expect(fuente.match(/for \(let i = 0; i < modelos\.length/g)).toHaveLength(1);
    expect(fuente.match(/ejecutarLlamadaGemini\(/g)).toHaveLength(1);
    expect(fuente.match(/const ejecutarLlamadaGemini = /g)).toHaveLength(1);
  });
});

describe('CA-2: reintentos y tope de tiempo', () => {
  test('(a) 503 → 503 → 200 reintenta el mismo modelo con esperas de 1 s y 2 s', async () => {
    const { estado, entorno } = crearEntorno();
    global.fetch = jest.fn()
      .mockResolvedValueOnce(error(503))
      .mockResolvedValueOnce(error(503))
      .mockResolvedValueOnce(ok(comidaValida));
    const r = await analizarComidaConGemini(FOTO, 'Snack', { entorno });
    expect(global.fetch).toHaveBeenCalledTimes(3);
    expect(global.fetch.mock.calls.every(([u]) => modeloDeUrl(u) === MODELO_PRINCIPAL_DEFAULT)).toBe(true);
    expect(estado.esperas).toEqual([1000, 2000]);
    expect(r.calorias).toBe(95);
  });

  test('(b) 404 pasa al respaldo sin reintentar', async () => {
    const { estado, entorno } = crearEntorno();
    global.fetch = jest.fn().mockResolvedValueOnce(error(404)).mockResolvedValueOnce(ok(comidaValida));
    const r = await analizarComidaConGemini(FOTO, 'Snack', { entorno });
    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(modeloDeUrl(global.fetch.mock.calls[1][0])).not.toBe(MODELO_PRINCIPAL_DEFAULT);
    expect(estado.esperas).toEqual([]);
    expect(r.modeloUsado).toBe(modeloDeUrl(global.fetch.mock.calls[1][0]));
  });

  test('(c) 429 con retryDelay "3s" espera exactamente 3000 ms y reintenta', async () => {
    const { estado, entorno } = crearEntorno();
    global.fetch = jest.fn()
      .mockResolvedValueOnce(error(429, { details: [{ '@type': 'type.googleapis.com/google.rpc.RetryInfo', retryDelay: '3s' }] }))
      .mockResolvedValueOnce(ok(comidaValida));
    await analizarComidaConGemini(FOTO, 'Snack', { entorno });
    expect(estado.esperas).toEqual([3000]);
    expect(modeloDeUrl(global.fetch.mock.calls[1][0])).toBe(MODELO_PRINCIPAL_DEFAULT);
  });

  test('(d) 429 con retryDelay "45s" no espera y pasa al siguiente modelo', async () => {
    const { estado, entorno } = crearEntorno();
    global.fetch = jest.fn()
      .mockResolvedValueOnce(error(429, { details: [{ '@type': 'type.googleapis.com/google.rpc.RetryInfo', retryDelay: '45s' }] }))
      .mockResolvedValueOnce(ok(comidaValida));
    await analizarComidaConGemini(FOTO, 'Snack', { entorno });
    expect(estado.esperas).toEqual([]);
    expect(modeloDeUrl(global.fetch.mock.calls[1][0])).not.toBe(MODELO_PRINCIPAL_DEFAULT);
  });

  test('(e) con peticiones que agotan 60 s la operación termina en ≤ 90 s y no hay tercera petición', async () => {
    const { estado, entorno } = crearEntorno();
    const timeouts = [];
    global.fetch = jest.fn(async (url, init) => {
      // Simula una petición que tarda todo su tiempo máximo y es abortada.
      const limite = Number(init.signal ? 60000 : 60000);
      timeouts.push(limite);
      estado.t += 60000;
      const e = new Error('abort');
      e.name = 'AbortError';
      throw e;
    });
    // La segunda petición debe recibir como máximo el tiempo restante (30 s).
    const original = global.setTimeout;
    const recibidos = [];
    global.setTimeout = (fn, ms) => {
      if (ms >= 1000) recibidos.push(ms);
      return original(fn, 0x7fffffff);
    };
    try {
      await expect(analizarComidaConGemini(FOTO, 'Snack', { entorno })).rejects.toThrow(
        'Gemini está saturado en este momento'
      );
    } finally {
      global.setTimeout = original;
    }
    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(recibidos[0]).toBe(60000);
    expect(recibidos[1]).toBeLessThanOrEqual(30000);
    expect(estado.t).toBeLessThanOrEqual(120000);
  });

  test('(f) JSON inválido pasa al siguiente modelo sin reintentar el mismo', async () => {
    const { estado, entorno } = crearEntorno();
    global.fetch = jest.fn()
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ candidates: [{ content: { parts: [{ text: 'no json' }] } }] }) })
      .mockResolvedValueOnce(ok(comidaValida));
    await analizarComidaConGemini(FOTO, 'Snack', { entorno });
    expect(estado.esperas).toEqual([]);
    expect(modeloDeUrl(global.fetch.mock.calls[1][0])).not.toBe(MODELO_PRINCIPAL_DEFAULT);
  });
});

describe('CA-3: sin resultados inventados', () => {
  test('cambio físico sin veredicto (o null) no devuelve 7.5: falla con mensaje de respuesta incompleta', async () => {
    const { entorno } = crearEntorno();
    global.fetch = jest.fn()
      .mockResolvedValueOnce(ok({ resumenSimple: 'x' }))
      .mockResolvedValueOnce(ok({ resumenSimple: 'x', veredicto: null }))
      .mockResolvedValueOnce(ok({ resumenSimple: 'x', veredicto: '' }));
    await expect(analizarCambioFisicoConGemini([FOTO], {}, { entorno })).rejects.toThrow(
      'Gemini devolvió una respuesta incompleta'
    );
  });

  test('veredicto 0 es válido', async () => {
    const { entorno } = crearEntorno();
    global.fetch = jest.fn().mockResolvedValueOnce(ok({ resumenSimple: 'x', veredicto: 0 }));
    const r = await analizarCambioFisicoConGemini([FOTO], {}, { entorno });
    expect(r.veredicto).toBe(0);
  });

  test('comparación sin evolucion es incompleta', async () => {
    const { entorno } = crearEntorno();
    global.fetch = jest.fn().mockResolvedValue(ok({ recomendacionesOptimizacion: ['a'] }));
    await expect(
      compararCambioFisicoConGemini(
        { registroActual: { id: 1 }, registroAnterior: { id: 2 }, perfilUsuario: {} },
        { entorno }
      )
    ).rejects.toThrow('Gemini devolvió una respuesta incompleta');
  });

  test('comida con 0 kcal se devuelve sin reintentos; sin calorías es incompleta', async () => {
    const { entorno } = crearEntorno();
    global.fetch = jest.fn().mockResolvedValueOnce(ok({ nombre: 'Café negro', calorias: 0 }));
    const r = await analizarComidaConGemini(FOTO, 'Snack', { entorno });
    expect(r.calorias).toBe(0);
    expect(global.fetch).toHaveBeenCalledTimes(1);

    global.fetch = jest.fn().mockResolvedValue(ok({ nombre: 'Algo' }));
    await expect(analizarComidaConGemini(FOTO, 'Snack', { entorno })).rejects.toThrow(
      'Gemini devolvió una respuesta incompleta'
    );
  });
});

describe('CA-4: razonamiento acotado', () => {
  test('envía thinkingLevel y maxOutputTokens; si el modelo no lo soporta reintenta sin él y lo recuerda', async () => {
    const { estado, entorno } = crearEntorno();
    global.fetch = jest.fn()
      .mockResolvedValueOnce(error(400, { message: 'Invalid JSON payload received. Unknown name "thinkingConfig"' }))
      .mockResolvedValueOnce(ok(comidaValida))
      .mockResolvedValueOnce(ok(comidaValida));
    await analizarComidaConGemini(FOTO, 'Snack', { entorno });
    const cuerpo1 = JSON.parse(global.fetch.mock.calls[0][1].body);
    const cuerpo2 = JSON.parse(global.fetch.mock.calls[1][1].body);
    expect(cuerpo1.generationConfig.thinkingConfig).toEqual({ thinkingLevel: 'low' });
    expect(cuerpo1.generationConfig.maxOutputTokens).toBe(4096);
    expect(modeloDeUrl(global.fetch.mock.calls[1][0])).toBe(MODELO_PRINCIPAL_DEFAULT);
    expect(cuerpo2.generationConfig.thinkingConfig).toBeUndefined();
    expect(estado.esperas).toEqual([]);

    await analizarComidaConGemini(FOTO, 'Snack', { entorno });
    const cuerpo3 = JSON.parse(global.fetch.mock.calls[2][1].body);
    expect(cuerpo3.generationConfig.thinkingConfig).toBeUndefined();
  });
});

describe('CA-5: mensajes claros y cortes de cadena', () => {
  const casos = [
    ['CLAVE', 'comida', 'Tu clave de Gemini no es válida'],
    ['PERMISO', 'comida', 'Tu clave de Gemini no es válida'],
    ['LIMITE', 'comida', 'Llegaste al límite de uso'],
    ['SATURACION', 'comida', 'Gemini está saturado'],
    ['TIMEOUT', 'fisico', 'Gemini está saturado'],
    ['INCOMPLETA', 'comida', 'respuesta incompleta'],
    ['SEGURIDAD', 'comida', 'no pudo analizar esta imagen'],
    ['SEGURIDAD', 'estudio', 'no pudo procesar este resumen'],
    ['OTRO', 'comida', 'No se pudo completar el análisis'],
  ];
  test.each(casos)('%s en %s → frase clara sin datos técnicos', (clase, contexto, frase) => {
    const mensaje = mensajeParaUsuario([{ clase, modelo: 'gemini-3.5-flash-lite', status: 503 }], contexto);
    expect(mensaje).toContain(frase);
    expect(mensaje).not.toMatch(/gemini-\d|\b[45]\d\d\b|CLAVE_DE_PRUEBA/);
  });

  test('API_KEY_INVALID (400) corta la cadena con una sola llamada', async () => {
    const { entorno } = crearEntorno();
    global.fetch = jest.fn().mockResolvedValue(
      error(400, { message: 'API key not valid. Please pass a valid API key.', details: [{ '@type': 'type.googleapis.com/google.rpc.ErrorInfo', reason: 'API_KEY_INVALID' }] })
    );
    await expect(analizarComidaConGemini(FOTO, 'Snack', { entorno })).rejects.toThrow('Tu clave de Gemini no es válida');
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  test('401 corta la cadena con una sola llamada', async () => {
    const { entorno } = crearEntorno();
    global.fetch = jest.fn().mockResolvedValue(error(401));
    await expect(analizarComidaConGemini(FOTO, 'Snack', { entorno })).rejects.toThrow(GeminiError);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  test('403 → 403 corta tras exactamente dos llamadas', async () => {
    const { entorno } = crearEntorno();
    global.fetch = jest.fn().mockResolvedValue(error(403));
    await expect(analizarComidaConGemini(FOTO, 'Snack', { entorno })).rejects.toThrow('no tiene permiso');
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  test('finishReason SAFETY o promptFeedback.blockReason corta con una sola llamada', async () => {
    const { entorno } = crearEntorno();
    global.fetch = jest.fn().mockResolvedValue(ok(comidaValida, { finishReason: 'SAFETY' }));
    await expect(analizarCambioFisicoConGemini([FOTO], {}, { entorno })).rejects.toThrow('no pudo analizar esta imagen');
    expect(global.fetch).toHaveBeenCalledTimes(1);

    global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ promptFeedback: { blockReason: 'SAFETY' } }) });
    await expect(analizarComidaConGemini(FOTO, 'Snack', { entorno })).rejects.toThrow('no pudo analizar esta imagen');
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  test('las partes de razonamiento (thought) no se mezclan con el JSON', async () => {
    const { entorno } = crearEntorno();
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ candidates: [{ content: { parts: [{ text: 'pensando...', thought: true }, { text: JSON.stringify(comidaValida) }] } }] }),
    });
    const r = await analizarComidaConGemini(FOTO, 'Snack', { entorno });
    expect(r.calorias).toBe(95);
  });

  test('el mensaje final nunca expone la clave aunque el servidor la repita', async () => {
    const { entorno } = crearEntorno();
    global.fetch = jest.fn().mockResolvedValue(error(500, { message: `fallo con ${CLAVE}` }));
    const promesa = analizarComidaConGemini(FOTO, 'Snack', { entorno });
    await expect(promesa).rejects.toThrow('Gemini está saturado');
    await promesa.catch((e) => expect(e.message).not.toContain(CLAVE));
  });

  test('clasificarFallo cubre los estados principales', () => {
    expect(clasificarFallo({ status: 503 })).toBe('SATURACION');
    expect(clasificarFallo({ status: 'RED' })).toBe('SATURACION');
    expect(clasificarFallo({ status: 'VACIO' })).toBe('INCOMPLETA');
    expect(clasificarFallo({ status: 'CORTADO' })).toBe('INCOMPLETA');
    expect(clasificarFallo({ status: 404 })).toBe('OTRO');
  });
});
