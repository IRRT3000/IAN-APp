/**
 * Fotos permanentes (Spec 020, plan §6, CA-8a).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

const mockRaizDoc = 'file:///data/user/0/app/files/';
const mockArchivos = new Set();
const mockCopias = [];
const mockBorrados = [];

jest.mock('expo-file-system', () => {
  const unir = (partes) =>
    partes
      .map((p) => (typeof p === 'string' ? p : p.uri))
      .reduce((acc, p) => (acc ? `${acc.replace(/\/$/, '')}/${p.replace(/^\//, '')}` : p), '');
  class Directory {
    constructor(...partes) {
      this.uri = unir(partes);
    }
    create() {}
  }
  class File {
    constructor(...partes) {
      this.uri = unir(partes);
    }
    get exists() {
      return mockArchivos.has(this.uri);
    }
    // Lanza de forma SÍNCRONA a propósito: el código debe tolerar tanto un error síncrono como una promesa rechazada.
    copy(destino) {
      if (this.uri.includes('falla')) throw new Error('copia fallida');
      mockCopias.push({ desde: this.uri, hasta: destino.uri });
      mockArchivos.add(destino.uri);
      return Promise.resolve();
    }
    delete() {
      mockBorrados.push(this.uri);
      mockArchivos.delete(this.uri);
    }
  }
  return { File, Directory, Paths: { document: new Directory(mockRaizDoc) } };
});

const mockLiberaciones = [];
jest.mock('expo-image-manipulator', () => ({
  SaveFormat: { JPEG: 'jpeg' },
  ImageManipulator: {
    manipulate: (uri) => ({
      resize: jest.fn(),
      release: () => mockLiberaciones.push('contexto'),
      renderAsync: async () => ({
        release: () => mockLiberaciones.push('imagen'),
        saveAsync: async () => {
          if (String(uri).includes('falla')) throw new Error('sin canvas');
          return { base64: 'QUJD' };
        },
      }),
    }),
  },
}));

const cargarModulo = () => require('../src/services/fotosStorage');

describe('fotosStorage en nativo', () => {
  beforeEach(async () => {
    Platform.OS = 'android';
    mockCopias.length = 0;
    mockBorrados.length = 0;
    mockArchivos.clear();
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => jest.restoreAllMocks());

  test('copia la foto a fotos/<carpeta>/ y devuelve una referencia relativa', async () => {
    const { persistirFoto, resolverUriFotoSincrona } = cargarModulo();
    const ref = await persistirFoto('file:///cache/ImagePicker/abc.jpg', 'comidas');
    expect(ref).toMatch(/^foto-doc:fotos\/comidas\/[\w-]+\.jpg$/);
    expect(mockCopias).toHaveLength(1);
    expect(mockCopias[0].hasta.startsWith(`${mockRaizDoc}fotos/comidas/`)).toBe(true);
    expect(resolverUriFotoSincrona(ref)).toBe(mockCopias[0].hasta);
  });

  test('si la copia falla devuelve la URI temporal sin lanzar', async () => {
    const { persistirFoto } = cargarModulo();
    await expect(persistirFoto('file:///cache/falla.jpg', 'fisico')).resolves.toBe(
      'file:///cache/falla.jpg'
    );
  });

  test('una URI vacía o una carpeta inválida no copian nada', async () => {
    const { persistirFoto } = cargarModulo();
    expect(await persistirFoto('', 'comidas')).toBe('');
    expect(await persistirFoto('file:///cache/a.jpg', '../otra')).toBe('file:///cache/a.jpg');
    expect(mockCopias).toHaveLength(0);
  });

  test('eliminarFoto borra dentro de la carpeta de la app y nunca fuera', async () => {
    const { persistirFoto, eliminarFoto } = cargarModulo();
    const ref = await persistirFoto('file:///cache/x.jpg', 'comidas');
    await eliminarFoto(ref);
    expect(mockBorrados).toHaveLength(1);

    mockArchivos.add('file:///cache/ajena.jpg');
    await eliminarFoto('file:///cache/ajena.jpg');
    await eliminarFoto('foto-doc:fotos/../../secreto');
    expect(mockBorrados).toHaveLength(1);
  });

  test('las URIs normales se pintan en el primer render (sin parpadeo)', () => {
    const { resolverUriFotoSincrona } = cargarModulo();
    expect(resolverUriFotoSincrona('file:///cache/legado.jpg')).toBe('file:///cache/legado.jpg');
    expect(resolverUriFotoSincrona('foto-local:123')).toBeNull();
    expect(resolverUriFotoSincrona('')).toBe('');
  });
});

describe('fotosStorage en web', () => {
  beforeEach(async () => {
    Platform.OS = 'web';
    mockLiberaciones.length = 0;
    await AsyncStorage.clear();
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => {
    Platform.OS = 'ios';
    jest.restoreAllMocks();
  });

  test('guarda la miniatura con prefijo data: en su propia clave y devuelve foto-local:', async () => {
    const { persistirFoto, resolverUriFoto, PREFIJO_CLAVE_FOTO_WEB } = cargarModulo();
    const ref = await persistirFoto('blob:http://localhost/abc', 'comidas');
    expect(ref).toMatch(/^foto-local:[\w-]+$/);
    const id = ref.slice('foto-local:'.length);
    expect(await AsyncStorage.getItem(`${PREFIJO_CLAVE_FOTO_WEB}${id}`)).toBe(
      'data:image/jpeg;base64,QUJD'
    );
    expect(await resolverUriFoto(ref)).toBe('data:image/jpeg;base64,QUJD');
    expect(mockLiberaciones).toEqual(expect.arrayContaining(['contexto', 'imagen']));
  });

  test('si falla devuelve cadena vacía, nunca la foto completa', async () => {
    const { persistirFoto } = cargarModulo();
    await expect(persistirFoto('data:image/jpeg;base64,falla', 'comidas')).resolves.toBe('');
  });

  test('eliminarFoto borra la clave de la miniatura', async () => {
    const { persistirFoto, eliminarFoto, resolverUriFoto } = cargarModulo();
    const ref = await persistirFoto('blob:http://localhost/abc', 'comidas');
    await eliminarFoto(ref);
    expect(await resolverUriFoto(ref)).toBe('');
  });
});

describe('borrado de registros', () => {
  beforeEach(async () => {
    Platform.OS = 'web';
    await AsyncStorage.clear();
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => {
    Platform.OS = 'ios';
    jest.restoreAllMocks();
  });

  test('eliminarComida borra también su foto', async () => {
    const { persistirFoto, resolverUriFoto } = cargarModulo();
    const { guardarComida, eliminarComida, cargarComidas } = require('../src/services/storage');
    const ref = await persistirFoto('blob:http://localhost/abc', 'comidas');
    await guardarComida({ nombre: 'Avena', calorias: 300, uriFoto: ref, fecha: '2026-11-23' });
    const [comida] = await cargarComidas();
    await eliminarComida(comida.id);
    expect(await cargarComidas()).toHaveLength(0);
    expect(await resolverUriFoto(ref)).toBe('');
  });

  test('si borrar la foto falla, eliminarComida igual devuelve la lista nueva', async () => {
    const { guardarComida, eliminarComida, cargarComidas } = require('../src/services/storage');
    await guardarComida({ nombre: 'Huevo', calorias: 78, uriFoto: 'foto-local:x', fecha: '2026-11-23' });
    const [comida] = await cargarComidas();
    jest.spyOn(AsyncStorage, 'removeItem').mockRejectedValueOnce(new Error('cuota'));
    await expect(eliminarComida(comida.id)).resolves.toEqual([]);
  });
});

describe('cuota del navegador (revisión de código de la Spec 020, hallazgo 1)', () => {
  beforeEach(async () => {
    Platform.OS = 'web';
    await AsyncStorage.clear();
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => {
    Platform.OS = 'ios';
    jest.restoreAllMocks();
  });

  test('nunca guarda más de MAX_MINIATURAS_WEB y borra primero las más antiguas', async () => {
    const { persistirFoto, MAX_MINIATURAS_WEB, PREFIJO_CLAVE_FOTO_WEB } = cargarModulo();
    const ahora = jest.spyOn(Date, 'now');
    for (let i = 0; i < MAX_MINIATURAS_WEB + 5; i += 1) {
      ahora.mockReturnValue(1700000000000 + i);
      await persistirFoto('blob:http://localhost/f', 'comidas');
    }
    const claves = (await AsyncStorage.getAllKeys()).filter((k) => k.startsWith(PREFIJO_CLAVE_FOTO_WEB));
    expect(claves).toHaveLength(MAX_MINIATURAS_WEB);
    expect(claves.some((k) => k.includes('1700000000000-'))).toBe(false);
    expect(claves.some((k) => k.includes(`${1700000000000 + MAX_MINIATURAS_WEB + 4}-`))).toBe(true);
  });

  test('si el navegador está lleno libera miniaturas antiguas y reintenta una vez', async () => {
    const { persistirFoto } = cargarModulo();
    AsyncStorage.setItem.mockImplementationOnce(() => Promise.reject(new Error('QuotaExceededError')));
    await expect(persistirFoto('blob:http://localhost/f', 'comidas')).resolves.toMatch(/^foto-local:/);
  });

  test('guardarComida lanza en vez de devolver [] cuando no se puede escribir', async () => {
    const { guardarComida } = require('../src/services/storage');
    AsyncStorage.setItem.mockImplementationOnce(() => Promise.reject(new Error('QuotaExceededError')));
    await expect(
      guardarComida({ nombre: 'Pan', calorias: 75, fecha: '2026-11-23' })
    ).rejects.toThrow('No se pudo guardar la comida');
  });
});
