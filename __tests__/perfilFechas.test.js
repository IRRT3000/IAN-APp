import {
  calcularEdadExacta,
  calcularFechaInicioDesdeAntiguedad,
  calcularTiempoEntrenando,
  parsearFechaLocalYYYYMMDD,
} from '../src/services/storage';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

describe('perfilFechas - parsearFechaLocalYYYYMMDD', () => {
  test('parsea fecha valida bisiesta 2024-02-29 correctamente', () => {
    expect(parsearFechaLocalYYYYMMDD('2024-02-29')).toEqual({
      anio: 2024,
      mes: 2,
      dia: 29,
      iso: '2024-02-29',
      legible: '29/02/2024',
    });
  });

  test('2026-02-29 no bisiesto cae al fallback por defecto', () => {
    expect(parsearFechaLocalYYYYMMDD('2026-02-29').iso).toBe('2010-11-26');
  });

  test('anio anterior a 1900 (1899-01-01) cae al fallback', () => {
    expect(parsearFechaLocalYYYYMMDD('1899-01-01').iso).toBe('2010-11-26');
  });

  test('mes invalido (2026-13-01) cae al fallback', () => {
    expect(parsearFechaLocalYYYYMMDD('2026-13-01').iso).toBe('2010-11-26');
  });

  test('cadena basura cae al fallback por defecto', () => {
    expect(parsearFechaLocalYYYYMMDD('basura').iso).toBe('2010-11-26');
  });

  test('ignora espacios en blanco al inicio y final', () => {
    expect(parsearFechaLocalYYYYMMDD(' 2026-03-09 ').iso).toBe('2026-03-09');
  });

  test('cadena basura con fallback personalizado devuelve el fallback provisto', () => {
    expect(parsearFechaLocalYYYYMMDD('basura', '2020-01-15').iso).toBe('2020-01-15');
  });
});

describe('perfilFechas - calcularEdadExacta', () => {
  test('un dia antes del cumpleanios tiene un anio menos', () => {
    const ref = new Date(2026, 10, 25);
    expect(calcularEdadExacta(ref, '2010-11-26').anios).toBe(15);
  });

  test('el dia del cumpleanios cumple la edad exacta con formato legible', () => {
    const ref = new Date(2026, 10, 26);
    const resultado = calcularEdadExacta(ref, '2010-11-26');
    expect(resultado.anios).toBe(16);
    expect(resultado.texto).toBe('16 años');
  });

  test('fecha de nacimiento en el futuro devuelve edad 0 segura', () => {
    const ref = new Date(2026, 0, 1);
    expect(calcularEdadExacta(ref, '2030-01-01').anios).toBe(0);
  });
});

describe('perfilFechas - calcularTiempoEntrenando', () => {
  test('calcula anios, meses, dias y texto correctamente', () => {
    const ref = new Date(2026, 9, 29);
    const resultado = calcularTiempoEntrenando(ref, '2025-11-01');
    expect(resultado.anios).toBe(0);
    expect(resultado.meses).toBe(11);
    expect(resultado.dias).toBe(28);
    expect(resultado.texto).toBe('11 meses y 28 días');
  });

  test('mismo dia de inicio devuelve Recién iniciado', () => {
    const ref = new Date(2026, 9, 29);
    expect(calcularTiempoEntrenando(ref, '2026-10-29').texto).toBe('Recién iniciado');
  });

  test('fecha futura devuelve Recién iniciado', () => {
    const ref = new Date(2026, 9, 29);
    expect(calcularTiempoEntrenando(ref, '2027-01-01').texto).toBe('Recién iniciado');
  });
});

describe('perfilFechas - calcularFechaInicioDesdeAntiguedad', () => {
  test('calcula fecha hacia atras con anios y meses', () => {
    const ref = new Date(2026, 9, 29);
    expect(calcularFechaInicioDesdeAntiguedad({ anios: 1, meses: 2 }, ref)).toBe('2025-08-29');
  });

  test('recorta el dia si el mes anterior tiene menos dias', () => {
    const ref = new Date(2026, 2, 31);
    expect(calcularFechaInicioDesdeAntiguedad({ meses: 1 }, ref)).toBe('2026-02-28');
  });

  test('sanitiza valores invalidos o negativos devolviendo la fecha de referencia', () => {
    const ref = new Date(2026, 9, 29);
    expect(calcularFechaInicioDesdeAntiguedad({ anios: -3, meses: 'x' }, ref)).toBe('2026-10-29');
  });
});
