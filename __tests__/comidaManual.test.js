/**
 * Editar comidas y meta nutricional en almacenamiento (Spec 028, CA-3 y CA-6).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  STORAGE_KEY_COMIDAS,
  STORAGE_KEY_META_NUTRICION,
  actualizarComida,
  cargarComidas,
  cargarMetaNutricion,
  guardarComida,
  guardarMetaNutricion,
} from '../src/services/storage';
import { construirRespaldo, esClavePermitida } from '../src/services/respaldo';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
jest.mock('expo-audio', () => ({
  setAudioModeAsync: jest.fn(() => Promise.resolve()),
  createAudioPlayer: jest.fn(() => ({ volume: 1, seekTo: jest.fn(), play: jest.fn(), remove: jest.fn() })),
}));

beforeEach(async () => {
  jest.restoreAllMocks();
  await AsyncStorage.clear();
});

describe('actualizarComida (CA-3)', () => {
  test('cambia nombre, tipo, kcal y macros y conserva id, fecha, foto y detalles', async () => {
    await guardarComida({
      id: 'c1',
      fecha: '2026-11-28',
      tipo: 'Comida',
      nombre: 'Pollo',
      calorias: 500,
      proteinas: 40,
      carbohidratos: 30,
      grasas: 10,
      uriFoto: 'foto-local:abc',
      detalles: 'Evaluación IA',
    });
    await guardarComida({ id: 'c2', fecha: '2026-11-28', nombre: 'Otra' });

    const lista = await actualizarComida('c1', {
      nombre: '  Pollo con arroz ',
      tipo: 'Cena',
      calorias: 650.6,
      proteinas: 45.25,
      carbohidratos: 70,
      grasas: 12,
      detalles: 'no debe pisar',
    });
    const c1 = lista.find((c) => c.id === 'c1');
    expect(c1).toMatchObject({
      id: 'c1',
      fecha: '2026-11-28',
      tipo: 'Cena',
      nombre: 'Pollo con arroz',
      descripcion: 'Pollo con arroz',
      calorias: 651,
      proteinas: 45.3,
      carbohidratos: 70,
      grasas: 12,
      macros: { proteinas: 45.3, carbohidratos: 70, grasas: 12 },
      uriFoto: 'foto-local:abc',
      fotoUri: 'foto-local:abc',
      detalles: 'Evaluación IA',
    });
    expect(lista.find((c) => c.id === 'c2').nombre).toBe('Otra');
    expect((await cargarComidas()).find((c) => c.id === 'c1').calorias).toBe(651);
  });

  test('un campo ausente conserva su valor original', async () => {
    await guardarComida({ id: 'c1', nombre: 'Pollo', calorias: 500, proteinas: 40, carbohidratos: 30, grasas: 10 });
    const [c] = await actualizarComida('c1', { nombre: 'Pollo asado' });
    expect(c).toMatchObject({ nombre: 'Pollo asado', calorias: 500, proteinas: 40, carbohidratos: 30, grasas: 10 });
  });

  test('lanza si el id no existe', async () => {
    await expect(actualizarComida('nada', { nombre: 'x' })).rejects.toThrow('No se encontró la comida.');
  });

  test('lanza si falla la escritura', async () => {
    await guardarComida({ id: 'c1', nombre: 'Pollo' });
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(AsyncStorage, 'setItem').mockRejectedValueOnce(new Error('lleno'));
    await expect(actualizarComida('c1', { nombre: 'x' })).rejects.toThrow(/No se pudo guardar el cambio/);
  });

  test('una comida manual sin foto se guarda con uriFoto vacío', async () => {
    const lista = await guardarComida({ nombre: 'Avena', calorias: 300, uriFoto: '', fecha: '2026-11-28' });
    expect(lista[0]).toMatchObject({ nombre: 'Avena', calorias: 300, uriFoto: '', fotoUri: '' });
  });
});

describe('meta nutricional (CA-6)', () => {
  test('sin meta guardada devuelve automática', async () => {
    expect(await cargarMetaNutricion()).toEqual({ modo: 'auto' });
  });

  test('guarda y carga una meta propia', async () => {
    const meta = { modo: 'manual', calorias: 2200, proteinas: 150, carbohidratos: 250, grasas: 70 };
    expect(await guardarMetaNutricion(meta)).toEqual(meta);
    expect(await cargarMetaNutricion()).toEqual(meta);
    expect(JSON.parse(await AsyncStorage.getItem(STORAGE_KEY_META_NUTRICION))).toEqual(meta);
  });

  test('volver a automática', async () => {
    await guardarMetaNutricion({ modo: 'manual', calorias: 2200, proteinas: 1, carbohidratos: 1, grasas: 1 });
    await guardarMetaNutricion({ modo: 'auto' });
    expect(await cargarMetaNutricion()).toEqual({ modo: 'auto' });
  });

  test.each([
    [{ modo: 'manual', calorias: 500, proteinas: 1, carbohidratos: 1, grasas: 1 }],
    [{ modo: 'manual', calorias: 9000, proteinas: 1, carbohidratos: 1, grasas: 1 }],
    [{ modo: 'manual', calorias: 2000, proteinas: 1500, carbohidratos: 1, grasas: 1 }],
    [{ modo: 'manual', calorias: 'abc', proteinas: 1, carbohidratos: 1, grasas: 1 }],
  ])('guardar fuera de rango lanza y no escribe: %j', async (meta) => {
    await expect(guardarMetaNutricion(meta)).rejects.toThrow(/fuera de rango/);
    expect(await AsyncStorage.getItem(STORAGE_KEY_META_NUTRICION)).toBeNull();
  });

  test.each([
    ['basura', 'esto no es json'],
    ['fuera de rango', JSON.stringify({ modo: 'manual', calorias: 99999, proteinas: 1, carbohidratos: 1, grasas: 1 })],
    ['modo raro', JSON.stringify({ modo: 'x', calorias: 2000 })],
    ['arreglo', '[]'],
  ])('carga tolerante con %s: devuelve automática sin lanzar', async (_, valor) => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    await AsyncStorage.setItem(STORAGE_KEY_META_NUTRICION, valor);
    expect(await cargarMetaNutricion()).toEqual({ modo: 'auto' });
  });

  test('la meta viaja en el respaldo', async () => {
    expect(esClavePermitida(STORAGE_KEY_META_NUTRICION)).toBe(true);
    await guardarMetaNutricion({ modo: 'manual', calorias: 2200, proteinas: 150, carbohidratos: 250, grasas: 70 });
    await AsyncStorage.setItem(STORAGE_KEY_COMIDAS, '[]');
    const r = await construirRespaldo();
    expect(Object.keys(r.datos)).toContain(STORAGE_KEY_META_NUTRICION);
  });
});
