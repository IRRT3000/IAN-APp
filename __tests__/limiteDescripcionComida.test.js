import fs from 'fs';
import {
  construirPromptAltaPrecision,
  LIMITE_DESCRIPCION_COMIDA,
} from '../src/services/gemini';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

const contarCaracter = (texto, caracter) => texto.split(caracter).length - 1;

describe('Límite de la descripción de comida (Spec 020, RF-6)', () => {
  test('el límite es de 500 caracteres', () => {
    expect(LIMITE_DESCRIPCION_COMIDA).toBe(500);
  });

  test('una descripción de 2000 caracteres llega recortada a exactamente 500 (CA-6)', () => {
    const prompt = construirPromptAltaPrecision('Comida', {}, '§'.repeat(2000));
    expect(contarCaracter(prompt, '§')).toBe(500);
  });

  test('una descripción corta se conserva completa (CA-6)', () => {
    const descripcion = `200g de pechuga, ${'arroz '.repeat(17)}`.trim();
    expect(descripcion.length).toBeLessThan(500);
    const prompt = construirPromptAltaPrecision('Comida', {}, descripcion);
    expect(prompt).toContain(`"${descripcion}"`);
  });

  test('el recorte no parte emojis ni caracteres compuestos', () => {
    const prompt = construirPromptAltaPrecision('Comida', {}, '🍎'.repeat(600));
    expect(contarCaracter(prompt, '🍎')).toBe(500);
    expect(prompt).not.toMatch(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])/);
  });

  test('el campo de descripción del modal limita la entrada a LIMITE_DESCRIPCION_COMIDA (CA-6)', () => {
    const fuente = fs.readFileSync('src/components/ModalAnalisisComida.jsx', 'utf8');
    expect(fuente).toContain('maxLength={LIMITE_DESCRIPCION_COMIDA}');
  });
});
