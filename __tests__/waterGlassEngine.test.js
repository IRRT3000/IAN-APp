import { calcularScoreVaso, obtenerNivelColor } from '../src/utils/waterGlassEngine';

describe('waterGlassEngine', () => {
  test('score 0 sin actividad', () => {
    expect(calcularScoreVaso({})).toBe(0);
  });
  test('score 0.5 solo entrenamiento', () => {
    expect(calcularScoreVaso({ hasWorkout: true, comidasCount: 0 })).toBe(0.5);
  });
  test('score 1.0 con 3 comidas y entrenamiento', () => {
    expect(calcularScoreVaso({ hasWorkout: true, comidasCount: 3 })).toBe(1);
  });
  test('descanso no penaliza', () => {
    expect(calcularScoreVaso({ isRestDay: true, comidasCount: 0 })).toBe(0.5);
  });
  test('nivel color', () => {
    expect(obtenerNivelColor(0)).toBe(0);
    expect(obtenerNivelColor(1)).toBe(4);
    expect(obtenerNivelColor(0.5)).toBe(2);
  });
});