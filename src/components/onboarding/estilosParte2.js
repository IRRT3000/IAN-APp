/**
 * Estilos del componente.
 * Extraído sin cambios de OnboardingBienvenidaModal.jsx (Spec 022). No editar la lógica aquí sin revisar el componente.
 */
import { TOKENS } from '../../theme/tokens';

/** Parte 2 de 3 de los estilos (mismo orden que el original). */
export const estilosParte2 = {
  spinnerTouchBtn: {
    width: '100%',
    minHeight: 44,
    borderRadius: 10,
    backgroundColor: TOKENS.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: TOKENS.colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },

  spinnerValueBox: {
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
  },

  spinnerValueText: {
    color: TOKENS.colors.textPrimary,
    fontSize: 20,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },

  spinnerSubNumber: {
    color: TOKENS.colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },

  liveAgePanel: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: TOKENS.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: TOKENS.colors.borderStrong,
    borderRadius: TOKENS.radii.md,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },

  liveAgeLeft: {
    flex: 1,
    paddingRight: 10,
  },

  liveAgeLabel: {
    color: TOKENS.colors.textPrimary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 2,
  },

  liveAgeSub: {
    color: TOKENS.colors.textSecondary,
    fontSize: 11.5,
  },

  liveAgeBadge: {
    backgroundColor: TOKENS.colors.accentWhite,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },

  liveAgeValueText: {
    color: TOKENS.colors.textInverse,
    fontSize: 15,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },

  // PASO 2: Antropometría
  instrumentCard: {
    backgroundColor: TOKENS.colors.surface,
    borderWidth: 1,
    borderColor: TOKENS.colors.borderDefault,
    borderRadius: TOKENS.radii.md,
    padding: 16,
    gap: 14,
  },

  instrumentTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  instrumentRangeHint: {
    color: TOKENS.colors.textMuted,
    fontSize: 11.5,
    marginTop: 2,
  },

  instrumentReadoutRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 5,
  },

  instrumentBigValue: {
    color: TOKENS.colors.textPrimary,
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: -0.8,
    fontVariant: ['tabular-nums'],
  },

  instrumentUnitText: {
    color: TOKENS.colors.textSecondary,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
  },

  steppersRow: {
    flexDirection: 'row',
    gap: 8,
  },

  stepperBtnFlex: {
    flex: 1,
  },

  stepperPillBtn: {
    minHeight: 46,
    borderRadius: 10,
    backgroundColor: TOKENS.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: TOKENS.colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },

  stepperPillBtnCompact: {
    minHeight: 46,
    borderRadius: 10,
    backgroundColor: TOKENS.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: TOKENS.colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },

  stepperPillBtnText: {
    color: TOKENS.colors.textPrimary,
    fontSize: 14,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },

  stepperPillBtnTextCompact: {
    color: TOKENS.colors.textPrimary,
    fontSize: 12.5,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },

  anthropometryLiveCard: {
    backgroundColor: TOKENS.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: TOKENS.colors.borderStrong,
    borderRadius: TOKENS.radii.md,
    padding: 16,
    gap: 14,
  },

  anthroMetricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  anthroMetricCol: {
    flex: 1,
    alignItems: 'center',
  },

  anthroDivider: {
    width: 1,
    height: 30,
    backgroundColor: TOKENS.colors.borderStrong,
  },

  anthroMetricLabel: {
    color: TOKENS.colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 4,
  },

  anthroMetricVal: {
    color: TOKENS.colors.textPrimary,
    fontSize: 17,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },

  imcBarTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: TOKENS.colors.canvas,
    borderWidth: 1,
    borderColor: TOKENS.colors.borderDefault,
    overflow: 'hidden',
  },

  imcBarFill: {
    height: '100%',
    backgroundColor: TOKENS.colors.accentWhite,
    borderRadius: 999,
  },

  imcFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  imcClassificationText: {
    color: TOKENS.colors.textPrimary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.7,
  },

  imcNoteText: {
    color: TOKENS.colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },

  // PASO 3: Antigüedad Entrenando (Fecha Exacta de Inicio)
  startedTodayButton: {
    minHeight: 50,
    borderRadius: 12,
    backgroundColor: TOKENS.colors.surface,
    borderWidth: 1,
    borderColor: TOKENS.colors.borderStrong,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    gap: 10,
  },

  startedTodayButtonActive: {
    backgroundColor: TOKENS.colors.accentWhite,
    borderColor: TOKENS.colors.accentWhite,
  },

  startedTodayButtonText: {
    color: TOKENS.colors.textPrimary,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: -0.1,
  },

  startedTodayButtonTextActive: {
    color: TOKENS.colors.textInverse,
  },

  timelineLiveCard: {
    backgroundColor: TOKENS.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: TOKENS.colors.borderStrong,
    borderRadius: TOKENS.radii.md,
    padding: 16,
    gap: 8,
  },

  timelineHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
  },

  timelineKickerLabel: {
    color: TOKENS.colors.textSecondary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.1,
  },

  timelineBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: TOKENS.colors.accentWhite,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    gap: 6,
  },

  timelineBadgePillText: {
    color: TOKENS.colors.textInverse,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.7,
    fontVariant: ['tabular-nums'],
  },

  timelineHeroDuration: {
    color: TOKENS.colors.textPrimary,
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.5,
    fontVariant: ['tabular-nums'],
    marginTop: 2,
  },

  timelineCalibrationDivider: {
    height: 1,
    backgroundColor: TOKENS.colors.borderDefault,
    marginVertical: 4,
  },

  timelineLevelTitle: {
    color: TOKENS.colors.textPrimary,
    fontSize: 11.5,
    fontWeight: '800',
    letterSpacing: 0.8,
  },

  timelineLevelDesc: {
    color: TOKENS.colors.textSecondary,
    fontSize: 12.5,
    lineHeight: 18,
  },

  // PASO 4: Objetivo Físico
  objectivesStack: {
    gap: 10,
  },

  objectiveCard: {
    backgroundColor: TOKENS.colors.surface,
    borderWidth: 1,
    borderColor: TOKENS.colors.borderDefault,
    borderRadius: TOKENS.radii.md,
    padding: 15,
    gap: 8,
  },

  objectiveCardActive: {
    backgroundColor: TOKENS.colors.accentWhite,
    borderColor: TOKENS.colors.accentWhite,
  },

  objectiveTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  objectiveTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  objectiveIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: TOKENS.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: TOKENS.colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },

  objectiveIconBoxActive: {
    backgroundColor: TOKENS.colors.canvas,
    borderColor: TOKENS.colors.canvas,
  },

  objectiveTagText: {
    color: TOKENS.colors.textMuted,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },

  objectiveTagTextActive: {
    color: '#444444',
  },

  objectiveTitleText: {
    color: TOKENS.colors.textPrimary,
    fontSize: 17,
    fontWeight: '800',
  },

  objectiveTitleTextActive: {
    color: TOKENS.colors.textInverse,
  },

  objectiveRadioOuter: {
    width: 24,
    height: 24,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: TOKENS.colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },

  objectiveRadioOuterActive: {
    backgroundColor: TOKENS.colors.canvas,
    borderColor: TOKENS.colors.canvas,
  },

  objectiveSubText: {
    color: TOKENS.colors.textSecondary,
    fontSize: 12.5,
    lineHeight: 18,
  },

  objectiveSubTextActive: {
    color: '#222222',
    fontWeight: '500',
  },

  geminiCalibrationBox: {
    backgroundColor: TOKENS.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: TOKENS.colors.borderStrong,
    borderRadius: TOKENS.radii.md,
    padding: 15,
    gap: 6,
  },
};
