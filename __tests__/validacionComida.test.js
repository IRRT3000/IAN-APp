import { sanearValoresComida } from '../src/utils/validacionComida';

describe('sanearValoresComida (Spec 018 / T2)', () => {
  test('devuelve valores por defecto cuando se invoca sin argumentos o vacío', () => {
    const resultado = sanearValoresComida();
    expect(resultado).toEqual({
      nombre: 'Comida registrada',
      calorias: 0,
      proteinas: 0,
      carbohidratos: 0,
      grasas: 0,
      detalles: '',
    });
  });

  test('usa nombreDefault si nombre es vacío o solo espacios', () => {
    expect(
      sanearValoresComida({ nombre: '', nombreDefault: 'Almuerzo' }).nombre
    ).toBe('Almuerzo');
    expect(
      sanearValoresComida({ nombre: '   ', nombreDefault: 'Cena ligera' }).nombre
    ).toBe('Cena ligera');
    expect(
      sanearValoresComida({ nombre: null, nombreDefault: 'Merienda' }).nombre
    ).toBe('Merienda');
  });

  test('normaliza números negativos a 0 (Defensa 2)', () => {
    const resultado = sanearValoresComida({
      calorias: -250,
      proteinas: -30.5,
      carbohidratos: -45,
      grasas: -12.3,
    });
    expect(resultado.calorias).toBe(0);
    expect(resultado.proteinas).toBe(0);
    expect(resultado.carbohidratos).toBe(0);
    expect(resultado.grasas).toBe(0);
  });

  test('convierte entradas no numéricas (NaN, strings alfabéticos) a 0', () => {
    const resultado = sanearValoresComida({
      calorias: 'invalido',
      proteinas: 'NaN',
      carbohidratos: undefined,
      grasas: null,
    });
    expect(resultado.calorias).toBe(0);
    expect(resultado.proteinas).toBe(0);
    expect(resultado.carbohidratos).toBe(0);
    expect(resultado.grasas).toBe(0);
  });

  test('acepta coma decimal y la convierte a número válido', () => {
    const resultado = sanearValoresComida({
      calorias: '350,7',
      proteinas: '32,5',
      carbohidratos: '40,2',
      grasas: '15,8',
    });
    expect(resultado.calorias).toBe(351); // redondeado a entero
    expect(resultado.proteinas).toBe(32.5);
    expect(resultado.carbohidratos).toBe(40.2);
    expect(resultado.grasas).toBe(15.8);
  });

  test('redondea calorías a enteros y macronutrientes a 1 decimal', () => {
    const resultado = sanearValoresComida({
      calorias: 420.4,
      proteinas: 35.67,
      carbohidratos: 52.12,
      grasas: 11.45,
    });
    expect(resultado.calorias).toBe(420);
    expect(resultado.proteinas).toBe(35.7);
    expect(resultado.carbohidratos).toBe(52.1);
    expect(resultado.grasas).toBe(11.5);
  });

  test('limpia y recorta cadenas de detalles', () => {
    const resultado = sanearValoresComida({
      detalles: '   Aporte proteico excelente para hipertrofia.   ',
    });
    expect(resultado.detalles).toBe('Aporte proteico excelente para hipertrofia.');
  });
});
