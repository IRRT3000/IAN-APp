import {
  esFechaFutura,
  formatearFechaLegible,
  generarMatrizMes,
  obtenerDiasEnMes,
  obtenerFechaLocal,
  obtenerPrimerDiaSemana,
  parsearFechaLocal,
} from '../src/utils/dateUtilsLocal';

describe('obtenerFechaLocal', () => {
  test('usa los componentes locales y rellena con ceros', () => {
    expect(obtenerFechaLocal(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(obtenerFechaLocal(new Date(2026, 11, 31))).toBe('2026-12-31');
  });

  test('no se desfasa a otro dia a las 23:59 locales', () => {
    expect(obtenerFechaLocal(new Date(2026, 2, 9, 23, 59, 59))).toBe('2026-03-09');
  });
});

describe('parsearFechaLocal', () => {
  test('descompone YYYY-MM-DD', () => {
    expect(parsearFechaLocal('2026-03-09')).toEqual({ anio: 2026, mes: 3, dia: 9, monthIndex: 2 });
  });

  test('acota monthIndex entre 0 y 11', () => {
    expect(parsearFechaLocal('2026-13-01').monthIndex).toBe(11);
  });
});

describe('calendario', () => {
  test('dias del mes con anios bisiestos', () => {
    expect(obtenerDiasEnMes(2024, 1)).toBe(29);
    expect(obtenerDiasEnMes(2026, 1)).toBe(28);
    expect(obtenerDiasEnMes(2026, 3)).toBe(30);
  });

  test('el primer dia de la semana usa lunes como 0', () => {
    expect(obtenerPrimerDiaSemana(2026, 5)).toBe(0); // 1 jun 2026 es lunes
    expect(obtenerPrimerDiaSemana(2026, 2)).toBe(6); // 1 mar 2026 es domingo
  });

  test('la matriz del mes alinea el dia 1 y tiene todos los dias', () => {
    const celdas = generarMatrizMes(2026, 2);
    expect(celdas.filter((c) => c.esVacio)).toHaveLength(6);
    expect(celdas.filter((c) => !c.esVacio)).toHaveLength(31);
    expect(celdas[6]).toEqual({ dia: 1, fechaStr: '2026-03-01', esVacio: false });
  });
});

describe('formatearFechaLegible', () => {
  test('devuelve el dia de la semana en espanol', () => {
    expect(formatearFechaLegible('2026-06-01')).toBe('Lunes, 1 de Junio de 2026');
  });

  test('cadena vacia si no hay fecha', () => {
    expect(formatearFechaLegible('')).toBe('');
  });
});

describe('esFechaFutura', () => {
  test('compara cadenas YYYY-MM-DD', () => {
    expect(esFechaFutura('2026-06-02', '2026-06-01')).toBe(true);
    expect(esFechaFutura('2026-06-01', '2026-06-01')).toBe(false);
    expect(esFechaFutura('', '2026-06-01')).toBe(false);
  });
});
