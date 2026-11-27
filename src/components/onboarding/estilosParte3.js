/**
 * Estilos del componente.
 * Extraído sin cambios de OnboardingBienvenidaModal.jsx (Spec 022). No editar la lógica aquí sin revisar el componente.
 */
import { TOKENS } from '../../theme/tokens';

/** Parte 3 de 3 de los estilos (mismo orden que el original). */
export const estilosParte3 = {
  geminiCalibrationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  geminiCalibrationTitle: {
    color: TOKENS.colors.textPrimary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.9,
  },

  geminiCalibrationBody: {
    color: TOKENS.colors.textSecondary,
    fontSize: 12.5,
    lineHeight: 18,
  },

  // ==========================================================================
  // ESCENA 5: CELEBRACIÓN PASAPORTE BIOMÉTRICO
  // ==========================================================================
  celebrationScrollContent: {
    paddingHorizontal: 20,
  },

  celebEmblemContainer: {
    width: 96,
    height: 96,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },

  celebOuterRing: {
    position: 'absolute',
    width: 92,
    height: 92,
    borderRadius: 9999,
    borderWidth: 1.5,
    borderColor: TOKENS.colors.accentWhite,
    backgroundColor: TOKENS.colors.surface,
  },

  celebInnerCircle: {
    width: 62,
    height: 62,
    borderRadius: 9999,
    backgroundColor: TOKENS.colors.accentWhite,
    alignItems: 'center',
    justifyContent: 'center',
  },

  celebHeaderBlock: {
    alignItems: 'center',
    gap: 10,
    marginBottom: 22,
  },

  celebMainTitle: {
    color: TOKENS.colors.textPrimary,
    fontSize: 23,
    fontWeight: '900',
    letterSpacing: -0.4,
    textAlign: 'center',
  },

  celebSubtitle: {
    color: TOKENS.colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    paddingHorizontal: 8,
  },

  passportCard: {
    backgroundColor: TOKENS.colors.surface,
    borderWidth: 1.5,
    borderColor: TOKENS.colors.borderStrong,
    borderRadius: TOKENS.radii.lg,
    padding: 18,
    gap: 16,
  },

  passportTopHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: TOKENS.colors.borderDefault,
  },

  passportSerialLabel: {
    color: TOKENS.colors.textMuted,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 3,
  },

  passportOwnerName: {
    color: TOKENS.colors.textPrimary,
    fontSize: 20,
    fontWeight: '800',
  },

  passportStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: TOKENS.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: TOKENS.colors.borderStrong,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },

  passportStatusText: {
    color: TOKENS.colors.textPrimary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },

  passportGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },

  passportCell: {
    width: '47%',
    flexGrow: 1,
    backgroundColor: TOKENS.colors.canvas,
    borderWidth: 1,
    borderColor: TOKENS.colors.borderDefault,
    borderRadius: 12,
    padding: 12,
    gap: 3,
  },

  passportCellLabel: {
    color: TOKENS.colors.textSecondary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },

  passportCellValue: {
    color: TOKENS.colors.textPrimary,
    fontSize: 14.5,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },

  passportCellSub: {
    color: TOKENS.colors.textMuted,
    fontSize: 11,
    fontVariant: ['tabular-nums'],
  },

  passportFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: TOKENS.colors.borderDefault,
  },

  passportFooterText: {
    color: TOKENS.colors.textSecondary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.1,
  },

  // ==========================================================================
  // BARRA INFERIOR THUMB-ZONE (54DP)
  // ==========================================================================
  bottomCtaBar: {
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: TOKENS.colors.canvas,
    borderTopWidth: 1,
    borderTopColor: TOKENS.colors.borderSubtle,
    gap: 10,
  },

  errorBannerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: TOKENS.colors.dangerBg,
    borderWidth: 1,
    borderColor: TOKENS.colors.danger,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },

  errorBannerText: {
    flex: 1,
    color: TOKENS.colors.textPrimary,
    fontSize: 12,
    fontWeight: '600',
  },

  primaryCtaButton: {
    height: TOKENS.touchTarget.ctaHeight,
    borderRadius: TOKENS.radii.md,
    backgroundColor: TOKENS.colors.accentWhite,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },

  primaryCtaButtonDisabled: {
    opacity: 0.6,
  },

  primaryCtaText: {
    color: TOKENS.colors.textInverse,
    fontSize: 15.5,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
};
