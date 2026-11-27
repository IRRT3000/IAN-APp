/**
 * Estilos del componente.
 * Extraído sin cambios de CambioFisicoView.jsx (Spec 022). No editar la lógica aquí sin revisar el componente.
 */
import { TOKENS } from '../../theme/tokens';

/** Parte 2 de 3 de los estilos (mismo orden que el original). */
export const estilosParte2 = {
  chipContexto: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: TOKENS.colors.surfaceElevated,
    borderRadius: TOKENS.radii.xs,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: TOKENS.colors.borderSubtle,
  },

  textoChipContexto: {
    color: TOKENS.colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },

  circuloVeredicto: {
    backgroundColor: TOKENS.colors.surfaceElevated,
    borderRadius: TOKENS.radii.sm,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: TOKENS.colors.borderStrong,
  },

  etiquetaVeredicto: {
    color: TOKENS.colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  valorVeredicto: {
    color: TOKENS.colors.textPrimary,
    fontSize: 16,
    fontWeight: '800',
  },

  escalaVeredicto: {
    fontSize: 11,
    fontWeight: '600',
    color: TOKENS.colors.textSecondary,
  },

  tiraFotosRegistro: {
    marginVertical: 10,
  },

  miniaturaTarjeta: {
    width: 60,
    height: 60,
    borderRadius: TOKENS.radii.xs,
    marginRight: 6,
    borderWidth: 1,
    borderColor: TOKENS.colors.borderDefault,
  },

  bloqueResumenSimple: {
    backgroundColor: TOKENS.colors.surfaceElevated,
    borderRadius: TOKENS.radii.sm,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: TOKENS.colors.borderSubtle,
  },

  etiquetaBloque: {
    color: TOKENS.colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 4,
  },

  textoResumenSimple: {
    color: TOKENS.colors.textPrimary,
    fontSize: 12,
    lineHeight: 16,
  },

  bloqueBalanceDia: {
    backgroundColor: TOKENS.colors.surfaceElevated,
    borderRadius: TOKENS.radii.sm,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: TOKENS.colors.borderSubtle,
  },

  filaTituloBalance: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },

  etiquetaBalanceDia: {
    color: TOKENS.colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  textoBalanceDia: {
    color: TOKENS.colors.textPrimary,
    fontSize: 12,
    lineHeight: 16,
  },

  filaPuntosClave: {
    marginBottom: 8,
  },

  chipPuntoClave: {
    marginBottom: 3,
  },

  textoPuntoClave: {
    color: TOKENS.colors.textSecondary,
    fontSize: 11,
    lineHeight: 15,
  },

  bloqueComparacionResultado: {
    backgroundColor: TOKENS.colors.surfaceElevated,
    borderRadius: TOKENS.radii.sm,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: TOKENS.colors.borderStrong,
  },

  tituloComparacionResultado: {
    color: TOKENS.colors.textPrimary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 4,
  },

  textoEvolucion: {
    color: TOKENS.colors.textSecondary,
    fontSize: 11,
    lineHeight: 15,
    marginBottom: 4,
  },

  itemRecomendacion: {
    color: TOKENS.colors.textPrimary,
    fontSize: 11,
    lineHeight: 14,
  },

  filaAccionesTarjeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },

  botonComparar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: TOKENS.colors.surfaceElevated,
    borderRadius: TOKENS.radii.xs,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: TOKENS.colors.borderDefault,
  },

  filaComparando: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  textoBotonComparar: {
    color: TOKENS.colors.textPrimary,
    fontSize: 11,
    fontWeight: '600',
  },

  insigniaPrimerRegistro: {
    backgroundColor: TOKENS.colors.surfaceElevated,
    borderRadius: TOKENS.radii.xs,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },

  textoPrimerRegistro: {
    color: TOKENS.colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },

  capsulaBorradoContenedor: {
    width: 58,
    height: 28,
    borderRadius: TOKENS.radii.pill,
    backgroundColor: TOKENS.colors.dangerBg,
    borderWidth: 1,
    borderColor: 'rgba(255, 69, 58, 0.4)',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },

  capsulaBorradoFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    backgroundColor: TOKENS.colors.danger,
    borderRadius: TOKENS.radii.pill,
  },

  capsulaBorradoContenido: {
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 2,
  },

  capsulaBorradoTexto: {
    color: TOKENS.colors.danger,
    fontSize: 11,
    fontWeight: '800',
    marginLeft: 4,
  },

  bannerAvisoBorrado: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: TOKENS.colors.dangerBg,
    borderRadius: TOKENS.radii.xs,
    padding: 6,
    marginTop: 8,
  },

  textoAvisoBorrado: {
    color: TOKENS.colors.danger,
    fontSize: 11,
    fontWeight: '600',
    flex: 1,
  },

  estadoVacio: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
    backgroundColor: TOKENS.colors.surface,
    borderRadius: TOKENS.radii.md,
    borderWidth: 1,
    borderColor: TOKENS.colors.borderSubtle,
    marginTop: 8,
  },

  textoVacio: {
    color: TOKENS.colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },

  fondoModal: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },

  contenedorModal: {
    width: '100%',
    backgroundColor: TOKENS.colors.surface,
    borderRadius: TOKENS.radii.lg,
    padding: 18,
    borderWidth: 1,
    borderColor: TOKENS.colors.borderDefault,
  },

  tituloModal: {
    color: TOKENS.colors.textPrimary,
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 2,
  },

  subtituloModal: {
    color: TOKENS.colors.textSecondary,
    fontSize: 12,
    marginBottom: 16,
  },

  contenedorBasculaExterior: {
    alignItems: 'center',
    marginBottom: 16,
  },

  anilloBasculaExterno: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: TOKENS.colors.surfaceElevated,
    borderWidth: 2,
    borderColor: TOKENS.colors.borderStrong,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },

  circuloCentralBascula: {
    alignItems: 'center',
  },

  etiquetaInteriorBascula: {
    color: TOKENS.colors.textMuted,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },

  filaValorPesoCircular: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },

  valorPesoCircular: {
    color: TOKENS.colors.textPrimary,
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.5,
  },

  unidadPesoCircular: {
    color: TOKENS.colors.textSecondary,
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 2,
  },

  textoDiferenciaBascula: {
    color: TOKENS.colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },

  filaBotonesPeso: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 4,
  },

  botonPasoPeso: {
    backgroundColor: TOKENS.colors.surfaceElevated,
    paddingHorizontal: 10,
    paddingVertical: 8,
    minWidth: 44,
    minHeight: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: TOKENS.radii.xs,
    borderWidth: 1,
    borderColor: TOKENS.colors.borderDefault,
  },

  textoBotonPasoPeso: {
    color: TOKENS.colors.textPrimary,
    fontSize: 11,
    fontWeight: '700',
  },

  bloqueSelectorHora: {
    marginBottom: 16,
  },

  etiquetaSeccionModal: {
    color: TOKENS.colors.textMuted,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
    marginBottom: 8,
  },

  filaReloj12h: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: TOKENS.colors.surfaceElevated,
    borderRadius: TOKENS.radii.md,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: TOKENS.colors.borderDefault,
    marginBottom: 10,
  },

  columnaControlTiempo: {
    alignItems: 'center',
    paddingHorizontal: 12,
  },

  botonFlechaTiempo: {
    minWidth: 44,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 6,
  },

  textoFlechaTiempo: {
    color: TOKENS.colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
  },

  valorTiempoDigital: {
    color: TOKENS.colors.textPrimary,
    fontSize: 22,
    fontWeight: '800',
    marginVertical: 2,
  },

  dosPuntosReloj: {
    color: TOKENS.colors.textPrimary,
    fontSize: 22,
    fontWeight: '800',
    paddingBottom: 4,
  },

  columnaAmPm: {
    marginLeft: 12,
    gap: 4,
  },
};
