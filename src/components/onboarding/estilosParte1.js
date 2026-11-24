/**
 * Estilos del componente.
 * Extraído sin cambios de OnboardingBienvenidaModal.jsx (Spec 022). No editar la lógica aquí sin revisar el componente.
 */
import { TOKENS } from '../../theme/tokens';

/** Parte 1 de 3 de los estilos (mismo orden que el original). */
export const estilosParte1 = {
  modalCanvas: {
    flex: 1,
    backgroundColor: TOKENS.colors.canvas,
  },

  fullSceneContainer: {
    flex: 1,
    backgroundColor: TOKENS.colors.canvas,
  },

  // ==========================================================================
  // ESCENA 0: HERO DE BIENVENIDA
  // ==========================================================================
  heroScrollContent: {
    paddingHorizontal: 22,
  },

  heroEmblemWrapper: {
    width: 112,
    height: 112,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
    marginBottom: 20,
  },

  heroRingOuter: {
    position: 'absolute',
    width: 108,
    height: 108,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: TOKENS.colors.borderStrong,
    backgroundColor: 'rgba(255,255,255,0.02)',
  },

  heroRingMiddle: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: TOKENS.colors.borderDefault,
    backgroundColor: TOKENS.colors.surface,
  },

  heroRingInner: {
    width: 54,
    height: 54,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: TOKENS.colors.accentWhite,
    backgroundColor: TOKENS.colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },

  badgeWrapCenter: {
    alignItems: 'center',
    marginBottom: 14,
  },

  whitePillBadge: {
    backgroundColor: TOKENS.colors.badgeBg,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: TOKENS.radii.pill,
  },

  whitePillBadgeText: {
    color: TOKENS.colors.badgeText,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.3,
  },

  heroTitleBlock: {
    alignItems: 'center',
    marginBottom: 26,
  },

  heroMainTitle: {
    color: TOKENS.colors.textPrimary,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.6,
    textAlign: 'center',
    marginBottom: 10,
  },

  heroMainSubtitle: {
    color: TOKENS.colors.textSecondary,
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    paddingHorizontal: 6,
  },

  heroPilaresList: {
    gap: 12,
  },

  heroPilarCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: TOKENS.colors.surface,
    borderWidth: 1,
    borderColor: TOKENS.colors.borderDefault,
    borderRadius: TOKENS.radii.md,
    padding: 16,
    gap: 14,
  },

  heroPilarIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: TOKENS.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: TOKENS.colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },

  heroPilarTextCol: {
    flex: 1,
  },

  heroPilarTitle: {
    color: TOKENS.colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 3,
  },

  heroPilarSub: {
    color: TOKENS.colors.textSecondary,
    fontSize: 12.5,
    lineHeight: 18,
  },

  // ==========================================================================
  // CABECERA DEL WIZARD (PASOS 1 A 4)
  // ==========================================================================
  wizardHeader: {
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: TOKENS.colors.borderSubtle,
    backgroundColor: TOKENS.colors.canvas,
  },

  wizardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },

  headerIconBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: TOKENS.colors.surface,
    borderWidth: 1,
    borderColor: TOKENS.colors.borderDefault,
    alignItems: 'center',
    justifyContent: 'center',
  },

  headerIconSpacer: {
    width: 44,
    height: 44,
  },

  wizardStepCounterBox: {
    alignItems: 'center',
  },

  wizardStepCategory: {
    color: TOKENS.colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginBottom: 2,
  },

  wizardStepCounterText: {
    color: TOKENS.colors.textPrimary,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1.4,
    fontVariant: ['tabular-nums'],
  },

  progressSegmentsRow: {
    flexDirection: 'row',
    gap: 8,
  },

  progressSegment: {
    flex: 1,
    height: 4,
    borderRadius: 999,
  },

  // ==========================================================================
  // CUERPO DE PASOS DEL WIZARD
  // ==========================================================================
  wizardScrollContent: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 32,
  },

  stepBlocksContainer: {
    gap: 18,
  },

  stepBlock: {
    gap: 10,
  },

  stepKicker: {
    color: TOKENS.colors.textSecondary,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.3,
    textTransform: 'uppercase',
  },

  stepTitle: {
    color: TOKENS.colors.textPrimary,
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
  },

  stepSubtitle: {
    color: TOKENS.colors.textSecondary,
    fontSize: 13.5,
    lineHeight: 19.5,
    marginBottom: 4,
  },

  fieldLabel: {
    color: TOKENS.colors.textSecondary,
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },

  fieldSubtleHint: {
    color: TOKENS.colors.textPrimary,
    fontSize: 12,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },

  sectionHeaderSpread: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  // PASO 1: Input Nombre + Sexo + Fecha
  inputSectionCard: {
    backgroundColor: TOKENS.colors.surface,
    borderWidth: 1,
    borderColor: TOKENS.colors.borderDefault,
    borderRadius: TOKENS.radii.md,
    padding: 14,
    gap: 10,
  },

  inputHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  charCountText: {
    color: TOKENS.colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },

  textInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: TOKENS.colors.canvas,
    borderWidth: 1,
    borderColor: TOKENS.colors.borderDefault,
    borderRadius: 12,
    paddingHorizontal: 14,
    minHeight: 50,
    gap: 10,
  },

  textInputWrapperFocused: {
    borderColor: TOKENS.colors.borderFocus,
  },

  textInputField: {
    flex: 1,
    color: TOKENS.colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
    paddingVertical: 10,
  },

  clearInputBtn: {
    padding: 4,
  },

  sexCardsRow: {
    flexDirection: 'row',
    gap: 12,
  },

  sexCardFlex: {
    flex: 1,
  },

  sexCard: {
    backgroundColor: TOKENS.colors.surface,
    borderWidth: 1,
    borderColor: TOKENS.colors.borderDefault,
    borderRadius: TOKENS.radii.md,
    padding: 15,
    minHeight: 108,
    justifyContent: 'space-between',
  },

  sexCardActive: {
    backgroundColor: TOKENS.colors.accentWhite,
    borderColor: TOKENS.colors.accentWhite,
  },

  sexCardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },

  sexCardIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: TOKENS.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: TOKENS.colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },

  sexCardIconCircleActive: {
    backgroundColor: TOKENS.colors.canvas,
    borderColor: TOKENS.colors.canvas,
  },

  sexCardTitle: {
    color: TOKENS.colors.textPrimary,
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 2,
  },

  sexCardTitleActive: {
    color: TOKENS.colors.textInverse,
  },

  sexCardMeta: {
    color: TOKENS.colors.textSecondary,
    fontSize: 11.5,
    fontWeight: '500',
  },

  sexCardMetaActive: {
    color: '#2C2C2C',
    fontWeight: '600',
  },

  bioCalibrationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: TOKENS.colors.surface,
    borderWidth: 1,
    borderColor: TOKENS.colors.borderStrong,
    borderRadius: 12,
    padding: 12,
    gap: 10,
  },

  bioCalibrationTextCol: {
    flex: 1,
  },

  bioCalibrationTag: {
    color: TOKENS.colors.textPrimary,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.9,
    marginBottom: 2,
  },

  bioCalibrationDesc: {
    color: TOKENS.colors.textSecondary,
    fontSize: 12,
    lineHeight: 16.5,
  },

  dateSpinnersGrid: {
    flexDirection: 'row',
    gap: 10,
  },

  dateSpinnerColumn: {
    flex: 1,
    backgroundColor: TOKENS.colors.surface,
    borderWidth: 1,
    borderColor: TOKENS.colors.borderDefault,
    borderRadius: TOKENS.radii.md,
    padding: 10,
    alignItems: 'center',
    gap: 8,
  },

  spinnerColLabel: {
    color: TOKENS.colors.textSecondary,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.1,
  },
};
