/**
 * Sonidos de la interfaz (Spec 024, RF-5, CA-8).
 */
import fs from 'fs';
import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
const mockReproductores = [];
jest.mock('expo-audio', () => ({
  setAudioModeAsync: jest.fn(() => Promise.resolve()),
  createAudioPlayer: jest.fn((fuente) => {
    const r = { fuente, volume: 1, seekTo: jest.fn(() => Promise.resolve()), play: jest.fn(), remove: jest.fn() };
    mockReproductores.push(r);
    return r;
  }),
}));

const servicio = () => require('../src/services/sonidos');
const { generarSonidos, FRECUENCIA_MUESTREO } = require('../scripts/generar-sonidos');

beforeEach(async () => {
  mockReproductores.length = 0;
  await AsyncStorage.clear();
  servicio().__reiniciarSonidosParaTests();
});

describe('servicio de sonidos', () => {
  test('inicializa 5 reproductores con volumen 0.35 y modo que respeta el silencio', async () => {
    const audio = require('expo-audio');
    await servicio().inicializarSonidos();
    expect(mockReproductores).toHaveLength(5);
    expect(mockReproductores.every((r) => r.volume === 0.35)).toBe(true);
    expect(audio.setAudioModeAsync).toHaveBeenCalledWith({ playsInSilentMode: false, interruptionMode: 'mixWithOthers' });
  });

  test('reproduce el sonido pedido desde el inicio', async () => {
    const s = servicio();
    await s.inicializarSonidos();
    await s.reproducirSonido('exito');
    const exito = mockReproductores[s.NOMBRES_SONIDOS.indexOf('exito')];
    expect(exito.seekTo).toHaveBeenCalledWith(0);
    expect(exito.play).toHaveBeenCalledTimes(1);
  });

  test('con el interruptor apagado no suena nada y la preferencia se guarda', async () => {
    const s = servicio();
    await s.inicializarSonidos();
    await s.establecerSonidosActivos(false);
    await s.reproducirSonido('exito');
    expect(mockReproductores.every((r) => r.play.mock.calls.length === 0)).toBe(true);
    expect(JSON.parse(await AsyncStorage.getItem(s.CLAVE_PREFERENCIAS))).toEqual({ sonidos: false });
  });

  test('preferencia ausente o corrupta = sonidos activados', async () => {
    const s = servicio();
    expect(await s.cargarPreferenciaSonidos()).toBe(true);
    await AsyncStorage.setItem(s.CLAVE_PREFERENCIAS, '{corrupto');
    expect(await s.cargarPreferenciaSonidos()).toBe(true);
  });

  test('un fallo de audio (incluido el rechazo de autoplay en web) nunca lanza', async () => {
    const s = servicio();
    await s.inicializarSonidos();
    mockReproductores.forEach((r) => {
      r.play.mockImplementation(() => Promise.reject(new Error('NotAllowedError')));
    });
    await expect(s.reproducirSonido('toque')).resolves.toBeUndefined();
    mockReproductores[0].seekTo.mockRejectedValueOnce(new Error('sin audio'));
    await expect(s.reproducirSonido('toque')).resolves.toBeUndefined();
  });
});

describe('archivos de sonido (CA-8)', () => {
  const NOMBRES = ['toque', 'exito', 'serie', 'error', 'borrado'];
  test.each(NOMBRES)('%s.wav es PCM 16 bits mono 22050 Hz, ≤ 150 ms y < 10 KB', (nombre) => {
    const wav = fs.readFileSync(`assets/sonidos/${nombre}.wav`);
    expect(wav.toString('ascii', 0, 4)).toBe('RIFF');
    expect(wav.readUInt16LE(20)).toBe(1); // PCM
    expect(wav.readUInt16LE(22)).toBe(1); // mono
    expect(wav.readUInt32LE(24)).toBe(FRECUENCIA_MUESTREO);
    expect(wav.readUInt16LE(34)).toBe(16);
    const duracionMs = (wav.readUInt32LE(40) / 2 / FRECUENCIA_MUESTREO) * 1000;
    expect(duracionMs).toBeLessThanOrEqual(150);
    expect(wav.length).toBeLessThan(10 * 1024);
  });

  test('el generador es determinista: dos ejecuciones producen bytes idénticos a los del repo', () => {
    const os = require('os');
    const path = require('path');
    const tmp1 = fs.mkdtempSync(path.join(os.tmpdir(), 'sonidos-a-'));
    const tmp2 = fs.mkdtempSync(path.join(os.tmpdir(), 'sonidos-b-'));
    const a = generarSonidos(tmp1);
    const b = generarSonidos(tmp2);
    for (const nombre of NOMBRES) {
      expect(a[nombre].equals(b[nombre])).toBe(true);
      expect(a[nombre].equals(fs.readFileSync(`assets/sonidos/${nombre}.wav`))).toBe(true);
    }
    fs.rmSync(tmp1, { recursive: true, force: true });
    fs.rmSync(tmp2, { recursive: true, force: true });
  });
});
