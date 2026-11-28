/**
 * Estilos compartidos por los formularios de Nutrición (Spec 028).
 */
import { StyleSheet } from 'react-native';
import { TOKENS } from '../../theme/tokens';

export const estilosFormulario = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    padding: TOKENS.spacing.md,
  },
  keyboardContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  tarjetaModal: {
    backgroundColor: TOKENS.colors.surface,
    borderColor: TOKENS.colors.borderDefault,
    borderWidth: 1,
    borderRadius: TOKENS.radii.lg,
    maxHeight: '92%',
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: TOKENS.spacing.md,
  },
  scrollArea: {
    flexShrink: 1,
  },
  scrollContent: {
    paddingVertical: TOKENS.spacing.xs,
  },
  cabecera: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: TOKENS.spacing.sm,
  },
  tituloCabecera: {
    ...TOKENS.typography.title,
    fontSize: 16,
  },
  botonCerrar: {
    width: TOKENS.touchTarget.minSize,
    height: TOKENS.touchTarget.minSize,
    borderRadius: TOKENS.touchTarget.minSize / 2,
    backgroundColor: TOKENS.colors.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
  },
  etiquetaCampo: {
    ...TOKENS.typography.labelCategory,
    fontSize: 11,
    marginBottom: 6,
  },
  inputSimple: {
    backgroundColor: TOKENS.colors.surfaceElevated,
    borderColor: TOKENS.colors.borderDefault,
    borderWidth: 1,
    borderRadius: TOKENS.radii.md,
    color: TOKENS.colors.textPrimary,
    paddingHorizontal: TOKENS.spacing.sm + 4,
    minHeight: TOKENS.touchTarget.minSize,
    fontSize: 14,
    marginBottom: TOKENS.spacing.md,
  },
  filaChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: TOKENS.spacing.md,
  },
  chip: {
    minHeight: TOKENS.touchTarget.minSize,
    paddingHorizontal: 14,
    borderRadius: TOKENS.radii.md,
    borderWidth: 1,
    borderColor: TOKENS.colors.borderDefault,
    backgroundColor: TOKENS.colors.surfaceElevated,
    justifyContent: 'center',
    marginRight: 8,
    marginBottom: 8,
  },
  chipActivo: {
    backgroundColor: TOKENS.colors.accentWhite,
    borderColor: TOKENS.colors.accentWhite,
  },
  textoChip: {
    color: TOKENS.colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  textoChipActivo: {
    color: TOKENS.colors.textInverse,
  },
  gridMacros: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  cajaMacro: {
    width: '48%',
    backgroundColor: TOKENS.colors.surfaceElevated,
    borderColor: TOKENS.colors.borderDefault,
    borderWidth: 1,
    borderRadius: TOKENS.radii.md,
    padding: TOKENS.spacing.sm,
    marginBottom: TOKENS.spacing.sm,
  },
  etiquetaMacroInput: {
    ...TOKENS.typography.labelCategory,
    fontSize: 11,
    marginBottom: 4,
  },
  inputMacro: {
    ...TOKENS.typography.metricValue,
    fontSize: 18,
    color: TOKENS.colors.textPrimary,
    padding: 0,
    minHeight: 32,
  },
  textoAyuda: {
    color: TOKENS.colors.textMuted,
    fontSize: 11,
    marginBottom: TOKENS.spacing.sm,
  },
  bloqueError: {
    backgroundColor: TOKENS.colors.dangerBg,
    borderColor: TOKENS.colors.danger,
    borderWidth: 1,
    borderRadius: TOKENS.radii.sm,
    padding: TOKENS.spacing.sm,
    marginBottom: TOKENS.spacing.sm,
  },
  textoError: {
    color: TOKENS.colors.danger,
    fontSize: 12,
  },
  footerAcciones: {
    flexDirection: 'row',
    paddingTop: TOKENS.spacing.sm,
    marginTop: TOKENS.spacing.xs,
    borderTopWidth: 1,
    borderTopColor: TOKENS.colors.borderDefault,
  },
  botonSecundario: {
    flex: 1,
    backgroundColor: TOKENS.colors.surfaceElevated,
    borderColor: TOKENS.colors.borderDefault,
    borderWidth: 1,
    borderRadius: TOKENS.radii.md,
    minHeight: TOKENS.touchTarget.minSize,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
  },
  textoBotonSecundario: {
    color: TOKENS.colors.textPrimary,
    fontWeight: '600',
    fontSize: 14,
  },
  botonPrimario: {
    flex: 1,
    backgroundColor: TOKENS.colors.accentWhite,
    borderRadius: TOKENS.radii.md,
    minHeight: TOKENS.touchTarget.minSize,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    marginLeft: 6,
  },
  botonDeshabilitado: {
    opacity: 0.4,
  },
  textoBotonPrimario: {
    color: TOKENS.colors.textInverse,
    fontWeight: '700',
    fontSize: 14,
  },
  enlace: {
    minHeight: TOKENS.touchTarget.minSize,
    justifyContent: 'center',
    alignSelf: 'flex-start',
    marginBottom: TOKENS.spacing.sm,
  },
  textoEnlace: {
    color: TOKENS.colors.textPrimary,
    fontSize: 13,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});
