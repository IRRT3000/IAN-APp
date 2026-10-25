import { obtenerFechaLocal, calcularEdadExacta, calcularTiempoEntrenando } from '../src/services/storage';

describe('storage pure helpers', () => {
  test('obtenerFechaLocal', () => {
    expect(obtenerFechaLocal(new Date(2026, 9, 25))).toBe('2026-10-25');
  });
  test('calcularEdadExacta', () => {
    const r = calcularEdadExacta(new Date(2026, 9, 25));
    expect(r.anios).toBe(15);
  });
});