/**
 * Contraste de los tokens de color (Spec 023, CA-5). Fórmula de luminancia relativa de WCAG 2.2.
 */
import { TOKENS } from '../src/theme/tokens';

const luminancia = (hex) => {
  const canales = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const lineal = canales.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * lineal[0] + 0.7152 * lineal[1] + 0.0722 * lineal[2];
};
const contraste = (a, b) => {
  const [l1, l2] = [luminancia(a), luminancia(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
};

const c = TOKENS.colors;
const SUPERFICIES = ['canvas', 'surface', 'surfaceElevated', 'surfaceInteractive'];
const TEXTOS = ['textPrimary', 'textSecondary', 'textMuted'];

describe('Contraste WCAG AA de los tokens (Spec 023)', () => {
  test.each(TEXTOS.flatMap((t) => SUPERFICIES.map((s) => [t, s])))(
    '%s sobre %s ≥ 4.5',
    (texto, superficie) => {
      expect(contraste(c[texto], c[superficie])).toBeGreaterThanOrEqual(4.5);
    }
  );

  test('danger sobre dangerBg ≥ 4.5', () => {
    expect(contraste(c.danger, c.dangerBg)).toBeGreaterThanOrEqual(4.5);
  });

  // Los números del mapa de calor son texto grande/corto: WCAG exige 3:1 para texto grande.
  test.each(Object.entries(c.heatmap))('heatmap %s: texto sobre fondo ≥ 3', (_nivel, { bg, text }) => {
    expect(contraste(text, bg)).toBeGreaterThanOrEqual(3);
  });
});
