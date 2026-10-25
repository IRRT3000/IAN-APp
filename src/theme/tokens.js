/**
 * Tokens de diseño centralizados para Fitness Tracker.
 * Spec 006: Rediseño Total Monocromo Matte Luxury (Android-First Edition).
 * 
 * Reglas de diseño:
 * - Fondo negro profundo (#0A0A0A) y superficies carbón (#141414, #1C1C1E).
 * - Bordes hairline de 1px (#262626) para evitar el empastamiento (black crush) en pantallas AMOLED.
 * - Tipografía de alto contraste con jerarquía editorial de lujo (#FFFFFF, #8E8E93, #666666).
 * - Cero emojis: todo elemento gráfico se construye con trazos geométricos y Feather icons.
 */

export const TOKENS = {
  colors: {
    // Fondos y Superficies
    canvas: '#0A0A0A',
    surface: '#141414',
    surfaceElevated: '#1C1C1E',
    surfaceInteractive: '#222222',

    // Bordes Estructurales
    borderSubtle: '#1C1C1E',
    borderDefault: '#262626',
    borderStrong: '#3A3A3A',
    borderFocus: '#FFFFFF',

    // Tipografía Monocroma
    textPrimary: '#FFFFFF',
    textSecondary: '#8E8E93',
    textMuted: '#666666',
    textInverse: '#0A0A0A',

    // Acciones y Estados
    accentWhite: '#FFFFFF',
    accentDisabled: '#262626',
    danger: '#FF453A',
    dangerBg: '#2C1515',

    // Badges / Insignias
    badgeBg: '#FFFFFF',
    badgeText: '#0A0A0A',

    // Escala de 5 Niveles para el Mapa de Calor (Inversión tipográfica en niveles 3 y 4)
    heatmap: {
      level0: { bg: '#141414', border: '#222222', text: '#666666' },
      level1: { bg: '#2C2C2C', border: '#3D3D3D', text: '#D4D4D4' },
      level2: { bg: '#525252', border: '#666666', text: '#FFFFFF' },
      level3: { bg: '#9E9E9E', border: '#B8B8B8', text: '#0A0A0A' },
      level4: { bg: '#FFFFFF', border: '#FFFFFF', text: '#0A0A0A' },
    },
  },

  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },

  radii: {
    xs: 4,
    sm: 8,
    md: 14,
    lg: 20,
    bar: 24,
    pill: 9999,
  },

  typography: {
    hero: {
      fontSize: 26,
      fontWeight: '800',
      letterSpacing: -0.5,
      color: '#FFFFFF',
    },
    title: {
      fontSize: 18,
      fontWeight: '700',
      letterSpacing: -0.3,
      color: '#FFFFFF',
    },
    subtitle: {
      fontSize: 13,
      fontWeight: '500',
      letterSpacing: 0,
      color: '#8E8E93',
    },
    labelCategory: {
      fontSize: 10,
      fontWeight: '700',
      letterSpacing: 1.2,
      color: '#8E8E93',
      textTransform: 'uppercase',
    },
    metricValue: {
      fontSize: 22,
      fontWeight: '800',
      letterSpacing: -0.5,
      color: '#FFFFFF',
    },
    metricLabel: {
      fontSize: 10,
      fontWeight: '600',
      letterSpacing: 0.8,
      color: '#8E8E93',
      textTransform: 'uppercase',
    },
  },

  touchTarget: {
    minHeight: 48,
    barHeight: 56,
  },
};
