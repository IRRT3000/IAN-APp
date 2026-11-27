/**
 * Respaldo y restauración (Spec 025, CA-1 a CA-4 y CA-8).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
jest.mock('expo-audio', () => ({
  createAudioPlayer: jest.fn(() => ({ play: jest.fn(), seekTo: jest.fn(), volume: 1 })),
  setAudioModeAsync: jest.fn(async () => {}),
}));

const mockArchivos = new Map();
const mockRaiz = 'file:///doc';
jest.mock('expo-file-system', () => {
  const unir = (partes) =>
    partes
      .map((p) => (typeof p === 'string' ? p : p.uri))
      .reduce((acc, p) => (acc ? `${acc.replace(/\/$/, '')}/${p.replace(/^\//, '')}` : p), '');
  class File {
    constructor(...partes) {
      this.uri = unir(partes);
      this.name = this.uri.split('/').pop();
    }
    get exists() {
      return mockArchivos.has(this.uri);
    }
    get size() {
      return Math.floor(((mockArchivos.get(this.uri) || '').length * 3) / 4);
    }
    delete() {
      mockArchivos.delete(this.uri);
    }
    async base64() {
      return mockArchivos.get(this.uri);
    }
    async write(contenido) {
      if (this.uri.includes('falla')) throw new Error('disco lleno');
      mockArchivos.set(this.uri, contenido);
    }
  }
  class Directory {
    constructor(...partes) {
      this.uri = unir(partes);
      this.name = this.uri.split('/').pop();
    }
    get exists() {
      return [...mockArchivos.keys()].some((k) => k.startsWith(`${this.uri}/`));
    }
    create() {}
    list() {
      const hijos = new Map();
      for (const k of mockArchivos.keys()) {
        if (!k.startsWith(`${this.uri}/`)) continue;
        const resto = k.slice(this.uri.length + 1).split('/');
        const nombre = resto[0];
        hijos.set(nombre, resto.length > 1 ? new Directory(this.uri, nombre) : new File(this.uri, nombre));
      }
      return [...hijos.values()];
    }
  }
  return { File, Directory, Paths: { document: new Directory(mockRaiz), cache: new Directory('file:///cache') } };
});

const mockCompartidos = [];
jest.mock('expo-sharing', () => ({
  shareAsync: jest.fn(async (uri) => {
    mockCompartidos.push({ uri, contenido: mockArchivos.get(uri) });
  }),
}));

const respaldo = require('../src/services/respaldo');

const K = {
  entrenamientos: '@fitness_tracker_entrenamientos_v1',
  comidas: '@fitness_tracker_comidas_v1',
  perfil: '@fitness_tracker_perfil_v1',
  cambios: '@fitness_tracker_cambios_fisicos_v1',
  materias: '@fitness_tracker_materias_v1',
  sesiones: '@fitness_tracker_sesiones_estudio_v1:2026-11',
  resumen: '@fitness_tracker_resumen_estudio_v1:2026-11-24',
  preferencias: '@fitness_tracker_preferencias_v1',
  corrupto: '@fitness_tracker_sesiones_estudio_v1:2026-10:corrupto:123',
  apiKey: '@fitness_tracker_gemini_api_key_web',
  apiKeyLegada: '@fitness_tracker_gemini_api_key',
  borrador: '@fitness_tracker_sesion_activa_draft_v1',
  fotoWeb: '@fitness_tracker_foto_v1:1700000000000-abc123',
};

const DATOS_BASE = {
  [K.entrenamientos]: JSON.stringify([{ id: 'e1', ejercicio: 'Sentadilla' }]),
  [K.comidas]: JSON.stringify([{ id: 'c1', nombre: 'Manzana' }, { id: 'c2', nombre: 'Pan' }]),
  [K.perfil]: JSON.stringify({ nombre: 'Prueba', onboardingCompletado: true }),
  [K.cambios]: JSON.stringify([]),
  [K.materias]: JSON.stringify([{ id: 'm1', nombre: 'Física' }]),
  [K.sesiones]: JSON.stringify([{ id: 's1' }]),
  [K.resumen]: JSON.stringify({ texto: 'bien' }),
  [K.preferencias]: JSON.stringify({ sonidos: false }),
};

const sembrar = async (pares) => {
  await AsyncStorage.clear();
  await AsyncStorage.multiSet(Object.entries(pares));
};

const volcado = async () => {
  const claves = await AsyncStorage.getAllKeys();
  const pares = await AsyncStorage.multiGet(claves);
  return Object.fromEntries(pares);
};

const plataformaOriginal = Platform.OS;
beforeEach(async () => {
  Platform.OS = 'android';
  mockArchivos.clear();
  await AsyncStorage.clear();
  jest.restoreAllMocks();
});
afterAll(() => {
  Platform.OS = plataformaOriginal;
});

const respaldoValido = (datos = DATOS_BASE, extra = {}) => ({
  app: 'mi-fitness-app',
  version: 1,
  creado: '2026-11-24 19:30',
  plataforma: 'android',
  datos,
  fotos: [],
  ...extra,
});

describe('exportar (CA-1, CA-2)', () => {
  test('incluye solo la lista cerrada: sin API key, borrador ni copias :corrupto:', async () => {
    await sembrar({
      ...DATOS_BASE,
      [K.corrupto]: 'esto no es json',
      [K.apiKey]: 'AIzaSECRETA',
      [K.apiKeyLegada]: 'AIzaSECRETA',
      [K.borrador]: JSON.stringify({ series: [] }),
      '@otra_app_clave': '"x"',
    });
    const r = await respaldo.construirRespaldo();
    expect(Object.keys(r.datos).sort()).toEqual(Object.keys(DATOS_BASE).sort());
    expect(JSON.stringify(r)).not.toContain('AIzaSECRETA');
    expect(r.app).toBe('mi-fitness-app');
    expect(r.version).toBe(1);
    expect(r.creado).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/);
  });

  test('ida y vuelta: exportar y restaurar en una app vacía deja los mismos datos', async () => {
    await sembrar({ ...DATOS_BASE, [K.corrupto]: 'crudo' });
    const r = await respaldo.construirRespaldo();
    const texto = JSON.stringify(r);
    await AsyncStorage.clear();
    const validado = respaldo.validarRespaldo(JSON.parse(texto));
    expect(validado.ok).toBe(true);
    await respaldo.restaurarRespaldo(validado);
    expect(await volcado()).toEqual(DATOS_BASE);
  });

  test('el resumen cuenta los registros para la confirmación', () => {
    const v = respaldo.validarRespaldo(respaldoValido());
    expect(v.resumen).toEqual({ entrenamientos: 1, comidas: 2, cambiosFisicos: 0, sesionesEstudio: 1, fotos: 0 });
    expect(v.creado).toBe('2026-11-24 19:30');
  });
});

describe('restaurar reemplaza todo y conserva lo que no viaja', () => {
  test('borra lo sobrante y el borrador, y no toca la API key', async () => {
    await sembrar({
      [K.entrenamientos]: JSON.stringify([{ id: 'viejo' }]),
      '@fitness_tracker_sesiones_estudio_v1:2025-01': JSON.stringify([{ id: 'vieja' }]),
      [K.apiKey]: 'AIzaSECRETA',
      [K.borrador]: JSON.stringify({ series: [1] }),
    });
    await respaldo.restaurarRespaldo(respaldo.validarRespaldo(respaldoValido()));
    const final = await volcado();
    expect(final[K.entrenamientos]).toBe(DATOS_BASE[K.entrenamientos]);
    expect(final['@fitness_tracker_sesiones_estudio_v1:2025-01']).toBeUndefined();
    expect(final[K.borrador]).toBeUndefined();
    expect(final[K.apiKey]).toBe('AIzaSECRETA');
  });
});

describe('validación de archivos no confiables (CA-3)', () => {
  const E = () => respaldo.ERRORES_RESPALDO;
  test.each([
    ['no es objeto', () => 'hola', 'noJson'],
    ['otra app', () => ({ ...respaldoValido(), app: 'otra' }), 'otraApp'],
    ['versión desconocida', () => ({ ...respaldoValido(), version: 2 }), 'version'],
    ['datos no es objeto', () => ({ ...respaldoValido(), datos: [] }), 'danado'],
    ['valor que no es JSON', () => respaldoValido({ ...DATOS_BASE, [K.comidas]: '{roto' }), 'danado'],
    ['forma incorrecta (perfil como lista)', () => respaldoValido({ ...DATOS_BASE, [K.perfil]: '[]' }), 'danado'],
    ['entrenamientos como objeto', () => respaldoValido({ ...DATOS_BASE, [K.entrenamientos]: '{}' }), 'danado'],
    ['ruta con ..', () => respaldoValido(DATOS_BASE, { fotos: [{ ruta: 'fotos/../secreto.jpg', base64: 'QUJD' }] }), 'danado'],
    ['ruta fuera del patrón', () => respaldoValido(DATOS_BASE, { fotos: [{ ruta: '/etc/passwd', base64: 'QUJD' }] }), 'danado'],
    ['base64 inválido', () => respaldoValido(DATOS_BASE, { fotos: [{ ruta: 'fotos/comidas/a.jpg', base64: '<script>' }] }), 'danado'],
    ['miniatura que no es JPEG', () => respaldoValido({ ...DATOS_BASE, [K.fotoWeb]: 'javascript:alert(1)' }), 'danado'],
  ])('%s se rechaza con su mensaje', (_, crear, error) => {
    const v = respaldo.validarRespaldo(crear());
    expect(v.ok).toBe(false);
    expect(v.error).toBe(E()[error]);
  });

  test('un archivo inválido no borra ningún dato actual', async () => {
    await sembrar(DATOS_BASE);
    const v = respaldo.validarRespaldo({ ...respaldoValido(), version: 99 });
    await expect(respaldo.restaurarRespaldo(v)).rejects.toThrow();
    expect(await volcado()).toEqual(DATOS_BASE);
  });

  test('claves ajenas, __proto__, api_key y :corrupto: se ignoran', () => {
    const datos = JSON.parse(
      `{"__proto__": {"contaminado": true}, "${K.apiKey}": "\\"AIza\\"", "${K.corrupto}": "[]", "@otra": "[]", "${K.perfil}": "{}"}`
    );
    const v = respaldo.validarRespaldo(respaldoValido(datos));
    expect(v.ok).toBe(true);
    expect(Object.keys(v.datos)).toEqual([K.perfil]);
    expect({}.contaminado).toBeUndefined();
  });

  test('web: más de 4 MB se rechaza antes de escribir', () => {
    Platform.OS = 'web';
    const grande = JSON.stringify([{ texto: 'x'.repeat(respaldo.MAX_BYTES_WEB) }]);
    const v = respaldo.validarRespaldo(respaldoValido({ [K.comidas]: grande }));
    expect(v).toEqual({ ok: false, error: respaldo.ERRORES_RESPALDO.webLleno });
  });

  test('nativo: un archivo de más de 50 MB se rechaza sin leerlo', async () => {
    const { File } = require('expo-file-system');
    const text = jest.fn();
    File.pickFileAsync = jest.fn(async () => ({ canceled: false, result: { size: respaldo.MAX_BYTES_ARCHIVO + 1, text } }));
    const v = await respaldo.elegirYLeerRespaldo();
    expect(v).toEqual({ ok: false, error: respaldo.ERRORES_RESPALDO.grande });
    expect(text).not.toHaveBeenCalled();
  });

  test('nativo: cancelar el selector devuelve null y un JSON roto da su mensaje', async () => {
    const { File } = require('expo-file-system');
    File.pickFileAsync = jest.fn(async () => ({ canceled: true, result: null }));
    expect(await respaldo.elegirYLeerRespaldo()).toBeNull();
    File.pickFileAsync = jest.fn(async () => ({ canceled: false, result: { size: 10, text: async () => '{roto' } }));
    expect(await respaldo.elegirYLeerRespaldo()).toEqual({ ok: false, error: respaldo.ERRORES_RESPALDO.noJson });
  });
});

describe('fotos (CA-4)', () => {
  test('web: sin la casilla no viajan las miniaturas; con ella sí y se pueden leer tras restaurar', async () => {
    Platform.OS = 'web';
    const miniatura = 'data:image/jpeg;base64,QUJD';
    await sembrar({ ...DATOS_BASE, [K.fotoWeb]: miniatura });
    expect((await respaldo.construirRespaldo()).datos[K.fotoWeb]).toBeUndefined();
    const conFotos = await respaldo.construirRespaldo({ incluirFotos: true });
    expect(conFotos.datos[K.fotoWeb]).toBe(miniatura);
    await AsyncStorage.clear();
    await respaldo.restaurarRespaldo(respaldo.validarRespaldo(JSON.parse(JSON.stringify(conFotos))));
    const { resolverUriFoto } = require('../src/services/fotosStorage');
    expect(await resolverUriFoto('foto-local:1700000000000-abc123')).toBe(miniatura);
  });

  test('nativo: lee fotos/<carpeta>/<archivo>.jpg y las escribe de vuelta en fotos/', async () => {
    await sembrar(DATOS_BASE);
    mockArchivos.set(`${mockRaiz}/fotos/comidas/1-a.jpg`, 'QUJD');
    mockArchivos.set(`${mockRaiz}/fotos/cambios_fisicos/2-b.jpg`, 'REVG');
    mockArchivos.set(`${mockRaiz}/fotos/comidas/notas.txt`, 'x');
    expect((await respaldo.construirRespaldo()).fotos).toEqual([]);
    const r = await respaldo.construirRespaldo({ incluirFotos: true });
    expect(r.fotos.map((f) => f.ruta).sort()).toEqual(['fotos/cambios_fisicos/2-b.jpg', 'fotos/comidas/1-a.jpg']);
    mockArchivos.clear();
    await AsyncStorage.clear();
    await respaldo.restaurarRespaldo(respaldo.validarRespaldo(JSON.parse(JSON.stringify(r))));
    expect(mockArchivos.get(`${mockRaiz}/fotos/comidas/1-a.jpg`)).toBe('QUJD');
    expect(mockArchivos.get(`${mockRaiz}/fotos/cambios_fisicos/2-b.jpg`)).toBe('REVG');
  });

  test('nativo: si una foto no se puede escribir, AsyncStorage no se toca', async () => {
    await sembrar(DATOS_BASE);
    const v = respaldo.validarRespaldo(respaldoValido({ [K.perfil]: '{}' }, { fotos: [{ ruta: 'fotos/comidas/falla.jpg', base64: 'QUJD' }] }));
    await expect(respaldo.restaurarRespaldo(v)).rejects.toThrow(respaldo.MENSAJE_RESTAURACION_FALLIDA);
    expect(await volcado()).toEqual(DATOS_BASE);
  });
});

describe('atomicidad (CA-8)', () => {
  test('si multiSet falla a la mitad, los datos quedan como estaban', async () => {
    await sembrar({ ...DATOS_BASE, [K.borrador]: '{"series":[1]}' });
    const antes = await volcado();
    const original = AsyncStorage.multiSet.getMockImplementation();
    let llamadas = 0;
    AsyncStorage.multiSet.mockImplementation(async (pares) => {
      llamadas += 1;
      if (llamadas === 1) {
        await original([pares[0]]); // escribe una parte y luego falla
        throw new Error('cuota llena');
      }
      return original(pares);
    });
    const nuevo = respaldoValido({ [K.perfil]: '{"nombre":"Otro"}', [K.comidas]: '[]' });
    await expect(respaldo.restaurarRespaldo(respaldo.validarRespaldo(nuevo))).rejects.toThrow(
      respaldo.MENSAJE_RESTAURACION_FALLIDA
    );
    AsyncStorage.multiSet.mockImplementation(original);
    expect(llamadas).toBe(2);
    expect(await volcado()).toEqual(antes);
  });

  test('si multiRemove falla, también se deshace', async () => {
    await sembrar(DATOS_BASE);
    const antes = await volcado();
    const original = AsyncStorage.multiRemove.getMockImplementation();
    let llamadas = 0;
    AsyncStorage.multiRemove.mockImplementation(async (claves) => {
      llamadas += 1;
      if (llamadas === 1) throw new Error('fallo');
      return original(claves);
    });
    const nuevo = respaldoValido({ [K.perfil]: '{"nombre":"Otro"}', '@fitness_tracker_sesiones_estudio_v1:2026-12': '[]' });
    await expect(respaldo.restaurarRespaldo(respaldo.validarRespaldo(nuevo))).rejects.toThrow();
    AsyncStorage.multiRemove.mockImplementation(original);
    expect(llamadas).toBe(2);
    expect(await volcado()).toEqual(antes);
  });
});

describe('correcciones de la revisión de código', () => {
  const fotoDe = (megas) => 'A'.repeat(Math.ceil(megas * 1024 * 1024 * 4 / 3 / 4) * 4);

  test('BLOQUEANTE: una foto real de 3 MB hace ida y vuelta completa', async () => {
    await sembrar(DATOS_BASE);
    const grande = fotoDe(3);
    mockArchivos.set(`${mockRaiz}/fotos/comidas/1-a.jpg`, grande);
    mockCompartidos.length = 0;
    const { fotosOmitidas } = await respaldo.exportarRespaldo({ incluirFotos: true });
    expect(fotosOmitidas).toBe(0);
    const { uri, contenido } = mockCompartidos[0];
    expect(mockArchivos.has(uri)).toBe(false); // no queda en la caché
    mockArchivos.clear();
    await AsyncStorage.clear();
    const v = respaldo.validarRespaldo(JSON.parse(contenido));
    expect(v.ok).toBe(true);
    await respaldo.restaurarRespaldo(v);
    expect(mockArchivos.get(`${mockRaiz}/fotos/comidas/1-a.jpg`)).toBe(grande);
  });

  test('BLOQUEANTE: al exportar se omiten (y cuentan) las fotos que no se podrían restaurar', async () => {
    await sembrar(DATOS_BASE);
    mockArchivos.set(`${mockRaiz}/fotos/comidas/1-enorme.jpg`, fotoDe(7)); // > 8 MB en base64
    mockArchivos.set(`${mockRaiz}/fotos/comidas/2-normal.jpg`, 'QUJD');
    mockCompartidos.length = 0;
    const { fotosOmitidas } = await respaldo.exportarRespaldo({ incluirFotos: true });
    expect(fotosOmitidas).toBe(1);
    const enArchivo = JSON.parse(mockCompartidos[0].contenido);
    expect(enArchivo.fotos.map((f) => f.ruta)).toEqual(['fotos/comidas/2-normal.jpg']);
    expect(enArchivo.omitidas).toBeUndefined();
    expect(respaldo.validarRespaldo(enArchivo).ok).toBe(true);
  });

  test('web: restaurar un respaldo SIN fotos conserva las miniaturas actuales', async () => {
    Platform.OS = 'web';
    await sembrar({ ...DATOS_BASE, [K.fotoWeb]: 'data:image/jpeg;base64,QUJD' });
    await respaldo.restaurarRespaldo(respaldo.validarRespaldo(respaldoValido()));
    expect((await volcado())[K.fotoWeb]).toBe('data:image/jpeg;base64,QUJD');
  });

  test('nativo: las miniaturas web de un respaldo hecho en web se ignoran', () => {
    const v = respaldo.validarRespaldo(respaldoValido({ ...DATOS_BASE, [K.fotoWeb]: 'data:image/jpeg;base64,QUJD' }));
    expect(v.ok).toBe(true);
    expect(v.datos[K.fotoWeb]).toBeUndefined();
  });

  test('la preferencia de sonidos restaurada se aplica al releerla', async () => {
    const sonidos = require('../src/services/sonidos');
    await sembrar({ [K.preferencias]: JSON.stringify({ sonidos: true }) });
    await sonidos.cargarPreferenciaSonidos();
    expect(sonidos.obtenerSonidosActivos()).toBe(true);
    await respaldo.restaurarRespaldo(respaldo.validarRespaldo(respaldoValido({ [K.preferencias]: '{"sonidos":false}' })));
    await sonidos.cargarPreferenciaSonidos();
    expect(sonidos.obtenerSonidosActivos()).toBe(false);
  });

  test('web: si se llena la cuota, el mensaje lo dice y los datos quedan como estaban', async () => {
    await sembrar(DATOS_BASE);
    const antes = await volcado();
    const original = AsyncStorage.multiSet.getMockImplementation();
    let llamadas = 0;
    AsyncStorage.multiSet.mockImplementation(async (pares) => {
      llamadas += 1;
      if (llamadas === 1) {
        const e = new Error('The quota has been exceeded.');
        e.name = 'QuotaExceededError';
        throw e;
      }
      return original(pares);
    });
    await expect(
      respaldo.restaurarRespaldo(respaldo.validarRespaldo(respaldoValido({ [K.perfil]: '{}' })))
    ).rejects.toThrow(respaldo.MENSAJE_SIN_ESPACIO);
    AsyncStorage.multiSet.mockImplementation(original);
    expect(await volcado()).toEqual(antes);
  });
});

test('un valor guardado ya dañado se deja fuera sin impedir el respaldo', async () => {
  await sembrar({ ...DATOS_BASE, [K.perfil]: 'null' });
  const r = await respaldo.construirRespaldo();
  expect(r.datos[K.perfil]).toBeUndefined();
  expect(respaldo.validarRespaldo(JSON.parse(JSON.stringify(r))).ok).toBe(true);
});
