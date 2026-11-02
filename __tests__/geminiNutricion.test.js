import { construirPromptAltaPrecision } from '../src/services/gemini';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

describe('Gemini Nutrición Contextual (Spec 018 / T3)', () => {
  const contextoPerfil = {
    sexo: 'Masculino',
    edadTexto: '15 años',
    alturaCm: 175,
    pesoKgActual: 72,
    tiempoEntrenandoTexto: '6 meses',
    objetivo: 'Hipertrofia',
  };

  test('genera prompt estándar sin directiva de usuario cuando descripcionUsuario está vacía (CA-2)', () => {
    const prompt = construirPromptAltaPrecision('Almuerzo', contextoPerfil, '');
    expect(prompt).toContain('Almuerzo');
    expect(prompt).toContain('Hipertrofia');
    expect(prompt).not.toContain('CONTEXTO Y DETALLES ESPECIFICADOS POR EL USUARIO:');
    expect(prompt).not.toContain('DIRECTIVA CRÍTICA DE PRIORIDAD CUANTITATIVA:');
  });

  test('inyecta directiva de verdad base y notas del usuario cuando hay texto (CA-3)', () => {
    const descripcion = '200g pechuga a la plancha, 1 taza arroz blanco, 1 cdta aceite de oliva';
    const prompt = construirPromptAltaPrecision('Comida', contextoPerfil, descripcion);

    expect(prompt).toContain('CONTEXTO Y DETALLES ESPECIFICADOS POR EL USUARIO:');
    expect(prompt).toContain(`"${descripcion}"`);
    expect(prompt).toContain('DIRECTIVA CRÍTICA DE PRIORIDAD CUANTITATIVA:');
    expect(prompt).toContain('VERDAD BASE INMUTABLE');
    expect(prompt).toContain('coherencia termodinámica');
  });

  test('ignora espacios en blanco alrededor de descripcionUsuario', () => {
    const prompt = construirPromptAltaPrecision(
      'Cena',
      contextoPerfil,
      '   1 batido de proteína con 300ml de leche   '
    );
    expect(prompt).toContain('"1 batido de proteína con 300ml de leche"');
    expect(prompt).toContain('DIRECTIVA CRÍTICA DE PRIORIDAD CUANTITATIVA:');
  });
});
