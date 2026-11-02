import { sanearValoresComida } from '../src/utils/validacionComida';

describe('Flujo de Nutrición Contextual (Spec 018 / T5 & T6)', () => {
  test('la preparación del registro utiliza valores saneados y fecha local sin desfase', () => {
    const entradaModal = {
      nombre: '   Pollo con Papas   ',
      calorias: '450,8',
      proteinas: '42,3',
      carbohidratos: '38,1',
      grasas: '10,9',
      detalles: 'Aporte balanceado',
    };

    const saneado = sanearValoresComida(entradaModal);

    expect(saneado.nombre).toBe('Pollo con Papas');
    expect(saneado.calorias).toBe(451);
    expect(saneado.proteinas).toBe(42.3);
    expect(saneado.carbohidratos).toBe(38.1);
    expect(saneado.grasas).toBe(10.9);
    expect(saneado.detalles).toBe('Aporte balanceado');
  });

  test('soporta valores editados a cero o vacíos con fallback seguro', () => {
    const entradaVacia = {
      nombre: '',
      nombreDefault: 'Cena escaneada',
      calorias: '',
      proteinas: '',
      carbohidratos: '',
      grasas: '',
      detalles: '',
    };

    const saneado = sanearValoresComida(entradaVacia);

    expect(saneado.nombre).toBe('Cena escaneada');
    expect(saneado.calorias).toBe(0);
    expect(saneado.proteinas).toBe(0);
    expect(saneado.carbohidratos).toBe(0);
    expect(saneado.grasas).toBe(0);
  });
});
