/**
 * Estilos del componente.
 * Extraído sin cambios de CambioFisicoView.jsx (Spec 022). No editar la lógica aquí sin revisar el componente.
 */
import { TOKENS } from '../../theme/tokens';

/** Parte 3 de 3 de los estilos (mismo orden que el original). */
export const estilosParte3 = {
  botonAmPm: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: TOKENS.radii.xs,
    borderWidth: 1,
  },

  botonAmPmActivo: {
    backgroundColor: TOKENS.colors.accentWhite,
    borderColor: TOKENS.colors.accentWhite,
  },

  botonAmPmInactivo: {
    backgroundColor: TOKENS.colors.surface,
    borderColor: TOKENS.colors.borderDefault,
  },

  textoAmPm: {
    fontSize: 11,
    fontWeight: '800',
  },

  textoAmPmActivo: {
    color: TOKENS.colors.textInverse,
  },

  textoAmPmInactivo: {
    color: TOKENS.colors.textSecondary,
  },

  filaMomentosDia: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 4,
  },

  chipMomentoModal: {
    flex: 1,
    paddingVertical: 6,
    alignItems: 'center',
    borderRadius: TOKENS.radii.xs,
    borderWidth: 1,
  },

  chipMomentoActivo: {
    backgroundColor: TOKENS.colors.accentWhite,
    borderColor: TOKENS.colors.accentWhite,
  },

  chipMomentoInactivo: {
    backgroundColor: TOKENS.colors.surfaceElevated,
    borderColor: TOKENS.colors.borderDefault,
  },

  textoChipMomento: {
    fontSize: 11,
    fontWeight: '700',
  },

  textoChipMomentoActivo: {
    color: TOKENS.colors.textInverse,
  },

  textoChipMomentoInactivo: {
    color: TOKENS.colors.textSecondary,
  },

  filaBotonesModal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },

  botonCancelarModal: {
    flex: 1,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: TOKENS.radii.md,
    backgroundColor: TOKENS.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: TOKENS.colors.borderDefault,
  },

  textoCancelarModal: {
    color: TOKENS.colors.textSecondary,
    fontSize: 13,
    fontWeight: '700',
  },

  botonConfirmarModal: {
    flex: 1.5,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: TOKENS.radii.md,
    backgroundColor: TOKENS.colors.accentWhite,
  },

  textoConfirmarModal: {
    color: TOKENS.colors.textInverse,
    fontSize: 13,
    fontWeight: '800',
  },
};
