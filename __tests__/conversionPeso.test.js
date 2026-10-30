import {
  FACTOR_KG_A_LBS,
  FACTOR_LBS_A_KG,
  MODOS_CONVERSION,
  convertirKgALbs,
  convertirLbsAKg,
  convertirPeso,
  normalizarInputPeso,
} from '../src/utils/conversionPeso';

describe('conversionPeso - normalizarInputPeso', () => {
  test('convierte comas en puntos decimales correctamente', () => {
    expect(normalizarInputPeso('100,5')).toBe('100.5');
    expect(normalizarInputPeso('45,25')).toBe('45.25');
  });

  test('mantiene números enteros y decimales con punto', () => {
    expect(normalizarInputPeso('100')).toBe('100');
    expect(normalizarInputPeso('45.4')).toBe('45.4');
  });

  test('descarta múltiples puntos y comas conservando solo la primera porción', () => {
    expect(normalizarInputPeso('10.5.2')).toBe('10.5');
    expect(normalizarInputPeso('10,5,2')).toBe('10.5');
    expect(normalizarInputPeso('10.5.2.8.9')).toBe('10.5');
  });

  test('descarta caracteres alfabéticos o símbolos no numéricos', () => {
    expect(normalizarInputPeso('abc10.5lbs')).toBe('10.5');
    expect(normalizarInputPeso('$50,2kg')).toBe('50.2');
  });

  test('maneja entradas vacías, nulas o con espacios en blanco', () => {
    expect(normalizarInputPeso('')).toBe('');
    expect(normalizarInputPeso('   ')).toBe('');
    expect(normalizarInputPeso(null)).toBe('');
    expect(normalizarInputPeso(undefined)).toBe('');
  });

  test('acepta valores numéricos directos', () => {
    expect(normalizarInputPeso(100.5)).toBe('100.5');
    expect(normalizarInputPeso(50)).toBe('50');
  });
});

describe('conversionPeso - convertirLbsAKg', () => {
  test('convierte caso normal 100 lbs a 45.4 kg (1 decimal)', () => {
    expect(convertirLbsAKg(100)).toBe(45.4);
    expect(convertirLbsAKg('100')).toBe(45.4);
  });

  test('convierte caso con coma "100,5" lbs a 45.6 kg', () => {
    // 100.5 * 0.45359237 = 45.586033 -> 45.6
    expect(convertirLbsAKg('100,5')).toBe(45.6);
  });

  test('convierte caso de múltiples puntos "10.5.2" lbs a 4.8 kg', () => {
    // 10.5 * 0.45359237 = 4.762719 -> 4.8
    expect(convertirLbsAKg('10.5.2')).toBe(4.8);
  });

  test('devuelve 0 ante entradas cero, negativas o no válidas sin generar NaN', () => {
    expect(convertirLbsAKg(0)).toBe(0);
    expect(convertirLbsAKg(-10)).toBe(0);
    expect(convertirLbsAKg('-50')).toBe(0);
    expect(convertirLbsAKg('')).toBe(0);
    expect(convertirLbsAKg('abc')).toBe(0);
    expect(convertirLbsAKg(null)).toBe(0);
    expect(convertirLbsAKg(NaN)).toBe(0);
  });
});

describe('conversionPeso - convertirKgALbs', () => {
  test('convierte caso normal 50 kg a 110.2 lbs (1 decimal)', () => {
    // 50 * 2.20462262 = 110.231131 -> 110.2
    expect(convertirKgALbs(50)).toBe(110.2);
    expect(convertirKgALbs('50')).toBe(110.2);
  });

  test('convierte caso normal 100 kg a 220.5 lbs', () => {
    // 100 * 2.20462262 = 220.462262 -> 220.5
    expect(convertirKgALbs(100)).toBe(220.5);
  });

  test('convierte caso con coma "74,5" kg a 164.2 lbs', () => {
    // 74.5 * 2.20462262 = 164.244385 -> 164.2
    expect(convertirKgALbs('74,5')).toBe(164.2);
  });

  test('devuelve 0 ante entradas cero, negativas o no válidas sin generar NaN', () => {
    expect(convertirKgALbs(0)).toBe(0);
    expect(convertirKgALbs(-5)).toBe(0);
    expect(convertirKgALbs('-20')).toBe(0);
    expect(convertirKgALbs('')).toBe(0);
    expect(convertirKgALbs('texto')).toBe(0);
    expect(convertirKgALbs(null)).toBe(0);
    expect(convertirKgALbs(NaN)).toBe(0);
  });
});

describe('conversionPeso - convertirPeso', () => {
  test('retorna estructura completa en modo LBS_A_KG', () => {
    const res = convertirPeso({ valor: '100', modo: MODOS_CONVERSION.LBS_A_KG });
    expect(res).toEqual({
      valorOriginal: 100,
      valorConvertido: 45.4,
      unidadOrigen: 'lbs',
      unidadDestino: 'kg',
      esValido: true,
    });
  });

  test('retorna estructura completa en modo KG_A_LBS', () => {
    const res = convertirPeso({ valor: '50', modo: MODOS_CONVERSION.KG_A_LBS });
    expect(res).toEqual({
      valorOriginal: 50,
      valorConvertido: 110.2,
      unidadOrigen: 'kg',
      unidadDestino: 'lbs',
      esValido: true,
    });
  });

  test('maneja valores inválidos o vacíos marcando esValido: false sin producir NaN', () => {
    const vacio = convertirPeso({ valor: '' });
    expect(vacio.esValido).toBe(false);
    expect(vacio.valorConvertido).toBe(0);
    expect(isNaN(vacio.valorConvertido)).toBe(false);

    const negativo = convertirPeso({ valor: '-25', modo: MODOS_CONVERSION.LBS_A_KG });
    expect(negativo.esValido).toBe(false);
    expect(negativo.valorConvertido).toBe(0);

    const cero = convertirPeso({ valor: '0' });
    expect(cero.esValido).toBe(false);
    expect(cero.valorConvertido).toBe(0);

    const basura = convertirPeso({ valor: 'invalido' });
    expect(basura.esValido).toBe(false);
    expect(basura.valorConvertido).toBe(0);
  });

  test('soporta llamada sin parámetros o con objeto vacío', () => {
    const porDefecto = convertirPeso();
    expect(porDefecto.esValido).toBe(false);
    expect(porDefecto.valorConvertido).toBe(0);
    expect(porDefecto.unidadOrigen).toBe('lbs');
    expect(porDefecto.unidadDestino).toBe('kg');
  });

  test('constantes de conversión coinciden exactamente con la especificación', () => {
    expect(FACTOR_LBS_A_KG).toBe(0.45359237);
    expect(FACTOR_KG_A_LBS).toBe(2.20462262);
  });
});
