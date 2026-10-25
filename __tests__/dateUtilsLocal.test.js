import {
  obtenerFechaLocal,
  parsearFechaLocal,
  obtenerDiasEnMes,
  obtenerPrimerDiaSemana,
  generarMatrizMes,
  esFechaFutura,
} from '../src/utils/dateUtilsLocal';

describe('dateUtilsLocal', () => {
  test('obtenerFechaLocal formato', () => {
    const d = new Date(2026, 0, 5);
    expect(obtenerFechaLocal(d)).toBe('2026-01-05');
  });
  test('parsearFechaLocal', () => {
    expect(parsearFechaLocal('2026-02-10')).toEqual({
      anio: 2026, mes: 2, dia: 10, monthIndex: 1,
    });
  });
  test('febrero bisiesto', () => {
    expect(obtenerDiasEnMes(2024, 1)).toBe(29);
    expect(obtenerDiasEnMes(2023, 1)).toBe(28);
  });
  test('generarMatrizMes contains all days', () => {
    const celdas = generarMatrizMes(2026, 0);
    const diasReales = celdas.filter((c) => !c.esVacio);
    expect(diasReales.length).toBe(31);
  });
  test('esFechaFutura', () => {
    expect(esFechaFutura('2026-01-02', '2026-01-01')).toBe(true);
    expect(esFechaFutura('2026-01-01', '2026-01-01')).toBe(false);
  });
});