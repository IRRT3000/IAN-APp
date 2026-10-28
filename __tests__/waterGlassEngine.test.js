import { calcularScoreVaso, obtenerNivelColor, PALETA_NIVELES_VASO } from '../src/utils/waterGlassEngine';

describe('calcularScoreVaso', () => {
  test('dia vacio vale 0', () => {
    expect(calcularScoreVaso({})).toBe(0);
    expect(calcularScoreVaso()).toBe(0);
    expect(calcularScoreVaso(null)).toBe(0);
  });

  test('las comidas aportan hasta 0.5 y no pasan de 3', () => {
    expect(calcularScoreVaso({ comidasCount: 1 })).toBe(0.17);
    expect(calcularScoreVaso({ comidasCount: 3 })).toBe(0.5);
    expect(calcularScoreVaso({ comidasCount: 9 })).toBe(0.5);
  });

  test('entrenar o descansar aporta 0.5 y no se suman entre si', () => {
    expect(calcularScoreVaso({ hasWorkout: true })).toBe(0.5);
    expect(calcularScoreVaso({ isRestDay: true })).toBe(0.5);
    expect(calcularScoreVaso({ hasWorkout: true, isRestDay: true })).toBe(0.5);
  });

  test('dia completo vale 1', () => {
    expect(calcularScoreVaso({ comidasCount: 3, hasWorkout: true })).toBe(1);
  });

  test('ignora valores invalidos', () => {
    expect(calcularScoreVaso({ comidasCount: -2 })).toBe(0);
    expect(calcularScoreVaso({ comidasCount: 'abc' })).toBe(0);
  });
});

describe('obtenerNivelColor', () => {
  test('respeta los umbrales 0 / 0.35 / 0.65 / 1', () => {
    expect(obtenerNivelColor(0)).toBe(0);
    expect(obtenerNivelColor(0.17)).toBe(1);
    expect(obtenerNivelColor(0.35)).toBe(1);
    expect(obtenerNivelColor(0.36)).toBe(2);
    expect(obtenerNivelColor(0.65)).toBe(2);
    expect(obtenerNivelColor(0.66)).toBe(3);
    expect(obtenerNivelColor(0.99)).toBe(3);
    expect(obtenerNivelColor(1)).toBe(4);
  });

  test('entradas no numericas caen al nivel 0', () => {
    expect(obtenerNivelColor(undefined)).toBe(0);
    expect(obtenerNivelColor('x')).toBe(0);
  });

  test('cada nivel tiene entrada en la paleta', () => {
    for (const nivel of [0, 1, 2, 3, 4]) expect(PALETA_NIVELES_VASO[nivel]).toBeDefined();
  });
});
