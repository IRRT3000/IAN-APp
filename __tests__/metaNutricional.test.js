/**
 * Meta nutricional orientativa (Spec 028, CA-5).
 */
import {
  calcularMetaNutricional,
  calcularProgreso,
  resolverMetaActiva,
} from '../src/utils/metaNutricional';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Fecha local fija: el perfil cumple 30 años el 1 de enero de 2026.
const HOY = new Date(2026, 10, 28);
const BASE = {
  sexo: 'Hombre',
  pesoKgActual: 80,
  alturaCm: 180,
  fechaNacimiento: '1996-01-01',
  objetivo: 'Mantenimiento',
};

describe('calcularMetaNutricional', () => {
  test('caso de referencia: Hombre, 80 kg, 180 cm, 30 años, Mantenimiento', () => {
    expect(calcularMetaNutricional(BASE, HOY)).toEqual({
      basal: 1780,
      gasto: 2759,
      calorias: 2760,
      proteinas: 160,
      grasas: 77,
      carbohidratos: 358,
    });
  });

  test('Mujer resta 161 en lugar de sumar 5', () => {
    const meta = calcularMetaNutricional({ ...BASE, sexo: 'Mujer' }, HOY);
    expect(meta.basal).toBe(1614);
    expect(meta.gasto).toBe(2502);
    expect(meta.calorias).toBe(2500);
  });

  test.each([
    ['Volumen', 3030],
    ['Definición', 2210],
    ['Recomposición', 2480],
  ])('objetivo %s ajusta las calorías', (objetivo, esperado) => {
    expect(calcularMetaNutricional({ ...BASE, objetivo }, HOY).calorias).toBe(esperado);
  });

  test('perfil nulo o incompleto usa la base y nunca da NaN ni negativos', () => {
    for (const perfil of [null, {}, { sexo: 'Otro', objetivo: 'X', pesoKgActual: -5, alturaCm: 'abc' }]) {
      const meta = calcularMetaNutricional(perfil, HOY);
      for (const v of Object.values(meta)) {
        expect(Number.isFinite(v)).toBe(true);
        expect(v).toBeGreaterThanOrEqual(0);
      }
    }
  });

  test('usa pesoKgBase si no hay pesoKgActual', () => {
    const { pesoKgActual, ...sinActual } = BASE;
    expect(pesoKgActual).toBe(80);
    expect(calcularMetaNutricional({ ...sinActual, pesoKgBase: 80 }, HOY).calorias).toBe(2760);
  });
});

describe('resolverMetaActiva', () => {
  test('meta manual válida gana a la automática', () => {
    const meta = resolverMetaActiva(BASE, { modo: 'manual', calorias: 2000, proteinas: 150, carbohidratos: 200, grasas: 60 }, HOY);
    expect(meta).toEqual({ modo: 'manual', calorias: 2000, proteinas: 150, carbohidratos: 200, grasas: 60 });
  });

  test('sin meta guardada usa la automática', () => {
    expect(resolverMetaActiva(BASE, { modo: 'auto' }, HOY)).toEqual({
      modo: 'auto',
      calorias: 2760,
      proteinas: 160,
      carbohidratos: 358,
      grasas: 77,
    });
  });
});

describe('calcularProgreso', () => {
  test('por debajo, exacto y sobre la meta', () => {
    expect(calcularProgreso(1380, 2760)).toEqual({ porcentaje: 0.5, exceso: 0 });
    expect(calcularProgreso(2760, 2760)).toEqual({ porcentaje: 1, exceso: 0 });
    expect(calcularProgreso(3000, 2760)).toEqual({ porcentaje: 1, exceso: 240 });
  });

  test('meta 0 no divide por cero', () => {
    expect(calcularProgreso(500, 0)).toEqual({ porcentaje: 0, exceso: 0 });
  });
});
