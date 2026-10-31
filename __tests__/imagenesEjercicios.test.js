import fs from 'fs';
import { CATALOGO_EJERCICIOS_BASE } from '../src/constants/catalogoEjercicios';
import {
  IMAGENES_EJERCICIOS,
  INDICE_NOMBRE_A_ID,
  obtenerIdImagenEjercicio,
  obtenerImagenEjercicio,
} from '../src/constants/imagenesEjercicios';

// jest-expo transforma toda imagen a `1`: las pruebas comparan ids y leen los archivos con fs.
// Las rutas son relativas a la raíz del proyecto, desde donde corre jest.
const DIRECTORIO_ASSETS = 'assets/ejercicios';
const RUTA_MAPA = 'src/constants/imagenesEjercicios.js';
const IDS_CATALOGO = CATALOGO_EJERCICIOS_BASE.map((ejercicio) => ejercicio.id);
const TOTAL_EJERCICIOS = 100;

const listarWebps = () =>
  fs.readdirSync(DIRECTORIO_ASSETS).filter((archivo) => archivo.endsWith('.webp'));

// Lee ancho y alto de un WebP según su primer chunk: VP8 (con pérdida), VP8L (sin pérdida) o VP8X (extendido).
const leerDimensionesWebp = (buf) => {
  if (buf.toString('ascii', 0, 4) !== 'RIFF' || buf.toString('ascii', 8, 12) !== 'WEBP') {
    return null;
  }
  const chunk = buf.toString('ascii', 12, 16);
  if (chunk === 'VP8 ') {
    // Start code de un keyframe VP8: 9d 01 2a
    if (buf[23] !== 0x9d || buf[24] !== 0x01 || buf[25] !== 0x2a) {
      return null;
    }
    return { ancho: buf.readUInt16LE(26) & 0x3fff, alto: buf.readUInt16LE(28) & 0x3fff };
  }
  if (chunk === 'VP8L') {
    // Firma de VP8L
    if (buf[20] !== 0x2f) {
      return null;
    }
    const bits = buf.readUInt32LE(21);
    return { ancho: (bits & 0x3fff) + 1, alto: ((bits >>> 14) & 0x3fff) + 1 };
  }
  if (chunk === 'VP8X') {
    return { ancho: buf.readUIntLE(24, 3) + 1, alto: buf.readUIntLE(27, 3) + 1 };
  }
  return null;
};

describe('imagenesEjercicios - mapa id → imagen', () => {
  test('cada id del catálogo base tiene entrada y no sobran claves', () => {
    const claves = Object.keys(IMAGENES_EJERCICIOS);
    expect(IDS_CATALOGO).toHaveLength(TOTAL_EJERCICIOS);
    expect([...claves].sort()).toEqual([...IDS_CATALOGO].sort());
  });

  test('cada clave del mapa apunta al WebP con su mismo nombre', () => {
    const fuente = fs.readFileSync(RUTA_MAPA, 'utf8');
    const patron =
      /['"]([\w-]+)['"]\s*:\s*require\(\s*['"]\.\.\/\.\.\/assets\/ejercicios\/([\w-]+)\.webp['"]\s*\)/g;
    const entradas = [...fuente.matchAll(patron)];

    expect(entradas).toHaveLength(TOTAL_EJERCICIOS);
    entradas.forEach(([, clave, archivo]) => {
      expect(clave).toBe(archivo);
    });
  });
});

describe('imagenesEjercicios - assets en disco (CA-1)', () => {
  test('hay exactamente 100 WebP y coinciden uno a uno con los ids', () => {
    const nombres = listarWebps().map((archivo) => archivo.replace(/\.webp$/, ''));
    expect(nombres.sort()).toEqual([...IDS_CATALOGO].sort());
  });

  test('cada WebP es válido, mide 192×192 y respeta el peso máximo', () => {
    let pesoTotal = 0;
    listarWebps().forEach((archivo) => {
      const buf = fs.readFileSync(`${DIRECTORIO_ASSETS}/${archivo}`);
      pesoTotal += buf.length;

      expect(leerDimensionesWebp(buf)).toEqual({ ancho: 192, alto: 192 });
      expect(buf.length).toBeLessThanOrEqual(15360);
    });
    expect(pesoTotal).toBeLessThanOrEqual(768000);
  });
});

describe('imagenesEjercicios - resolución por id y nombre', () => {
  test('resuelve por id propio del mapa', () => {
    expect(obtenerIdImagenEjercicio({ id: 'base-espalda-1' })).toBe('base-espalda-1');
    expect(obtenerImagenEjercicio({ id: 'base-espalda-1' })).not.toBeNull();
  });

  test('resuelve por nombre ignorando espacios y mayúsculas', () => {
    expect(obtenerIdImagenEjercicio({ nombre: '  jalón al pecho en polea ' })).toBe(
      'base-espalda-1'
    );
    CATALOGO_EJERCICIOS_BASE.forEach(({ id, nombre }) => {
      expect(obtenerIdImagenEjercicio({ id: 'pers-123', nombre })).toBe(id);
    });
    expect(INDICE_NOMBRE_A_ID.size).toBe(TOTAL_EJERCICIOS);
  });

  test('devuelve null sin coincidencia ni errores con entradas raras', () => {
    const casos = [
      { nombre: 'Ejercicio inventado' },
      { nombre: '' },
      { nombre: undefined },
      undefined,
      null,
      { id: 'pers-123' },
      { id: 'constructor' },
      { nombre: 'toString' },
      { nombre: 'constructor' },
    ];
    casos.forEach((caso) => {
      expect(obtenerIdImagenEjercicio(caso)).toBeNull();
      expect(obtenerImagenEjercicio(caso)).toBeNull();
    });
    expect(obtenerIdImagenEjercicio()).toBeNull();
    expect(obtenerImagenEjercicio()).toBeNull();
  });
});
