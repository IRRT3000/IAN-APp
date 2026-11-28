/**
 * Estilos del componente.
 * Extraído sin cambios de CambioFisicoView.jsx (Spec 022). No editar la lógica aquí sin revisar el componente.
 */
import { TOKENS } from '../../theme/tokens';

/** Parte 1 de 3 de los estilos (mismo orden que el original). */
export const estilosParte1 = {
  bannerModoHistorial: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: TOKENS.colors.surface,
    borderRadius: TOKENS.radii.sm,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: TOKENS.colors.borderDefault,
  },

  textoModoHistorial: {
    flex: 1,
    color: TOKENS.colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
  },

  badgeSoloLecturaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: TOKENS.colors.surfaceElevated,
    borderRadius: TOKENS.radii.xs,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: TOKENS.colors.borderSubtle,
  },

  textoBadgeSoloLecturaItem: {
    color: TOKENS.colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
  },

  contenedor: {
    flex: 1,
    backgroundColor: TOKENS.colors.canvas,
  },

  encabezado: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 12,
  },

  tituloVista: {
    color: TOKENS.colors.textPrimary,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.4,
  },

  subtituloFecha: {
    color: TOKENS.colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },

  contenidoLista: {
    paddingBottom: 110, // Scroll clearance mandatorio
  },

  tarjetaPerfil: {
    backgroundColor: TOKENS.colors.surface,
    borderRadius: TOKENS.radii.md,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: TOKENS.colors.borderDefault,
  },

  cabeceraTarjetaPerfil: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },

  tituloPasaporteFila: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },

  etiquetaPasaporteBio: {
    color: TOKENS.colors.textSecondary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },

  botonEditarPerfilBio: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: TOKENS.colors.surfaceElevated,
    borderRadius: TOKENS.radii.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: TOKENS.colors.borderDefault,
  },

  textoBotonEditarPerfilBio: {
    color: TOKENS.colors.textPrimary,
    fontSize: 11,
    fontWeight: '700',
  },

  filaMetricasBio: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },

  itemBio: {
    flex: 1,
    backgroundColor: TOKENS.colors.surfaceElevated,
    borderRadius: TOKENS.radii.sm,
    paddingVertical: 8,
    paddingHorizontal: 6,
    marginHorizontal: 2,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: TOKENS.colors.borderSubtle,
  },

  etiquetaBio: {
    color: TOKENS.colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
  },

  valorBio: {
    color: TOKENS.colors.textPrimary,
    fontSize: 13,
    fontWeight: '800',
    marginTop: 2,
  },

  subvalorBio: {
    color: TOKENS.colors.textSecondary,
    fontSize: 11,
    marginTop: 1,
  },

  bloqueObjetivo: {
    marginTop: 4,
  },

  etiquetaObjetivo: {
    color: TOKENS.colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 6,
    letterSpacing: 0.4,
  },

  filaObjetivos: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  chipObjetivo: {
    // Spec 026: ancho según la etiqueta para que "Recomposición" quepa con texto de 11 px.
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 'auto',
    paddingHorizontal: 4,
    paddingVertical: 6,
    marginHorizontal: 2,
    borderRadius: TOKENS.radii.xs,
    alignItems: 'center',
    borderWidth: 1,
  },

  chipObjetivoActivo: {
    backgroundColor: TOKENS.colors.accentWhite,
    borderColor: TOKENS.colors.accentWhite,
  },

  chipObjetivoInactivo: {
    backgroundColor: TOKENS.colors.surfaceElevated,
    borderColor: TOKENS.colors.borderDefault,
  },

  textoChipObjetivo: {
    fontSize: 11,
    fontWeight: '700',
  },

  textoChipObjetivoActivo: {
    color: TOKENS.colors.textInverse,
  },

  textoChipObjetivoInactivo: {
    color: TOKENS.colors.textSecondary,
  },

  tarjetaCaptura: {
    backgroundColor: TOKENS.colors.surface,
    borderRadius: TOKENS.radii.md,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: TOKENS.colors.borderDefault,
  },

  filaTituloCaptura: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },

  tituloSeccion: {
    color: TOKENS.colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },

  insigniaContadorFotos: {
    backgroundColor: TOKENS.colors.surfaceElevated,
    borderRadius: TOKENS.radii.xs,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },

  textoContadorFotos: {
    color: TOKENS.colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },

  filaBotonesCaptura: {
    flexDirection: 'row',
  },

  botonCaptura: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: TOKENS.radii.sm,
  },

  botonCamara: {
    backgroundColor: TOKENS.colors.accentWhite,
    marginRight: 8,
  },

  textoBotonCamara: {
    color: TOKENS.colors.textInverse,
    fontSize: 13,
    fontWeight: '800',
  },

  botonGaleria: {
    backgroundColor: TOKENS.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: TOKENS.colors.borderDefault,
  },

  textoBotonGaleria: {
    color: TOKENS.colors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },

  botonDeshabilitado: {
    opacity: 0.4,
  },

  textoAvisoLimite: {
    color: TOKENS.colors.textSecondary,
    fontSize: 11,
    marginTop: 6,
  },

  contenedorPreviaFotos: {
    marginTop: 12,
  },

  scrollMiniaturas: {
    marginBottom: 10,
  },

  contenedorMiniaturaPrevia: {
    position: 'relative',
    marginRight: 8,
  },

  imagenMiniaturaPrevia: {
    width: 68,
    height: 68,
    borderRadius: TOKENS.radii.sm,
    borderWidth: 1,
    borderColor: TOKENS.colors.borderStrong,
  },

  badgeIndiceFoto: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },

  textoBadgeIndice: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },

  botonQuitarFoto: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  filaAccionesPreAnalisis: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  botonContinuarBascula: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: TOKENS.colors.accentWhite,
    borderRadius: TOKENS.radii.sm,
    paddingVertical: 12,
    marginRight: 8,
  },

  textoBotonContinuarBascula: {
    color: TOKENS.colors.textInverse,
    fontSize: 13,
    fontWeight: '800',
  },

  botonLimpiarSeleccion: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: TOKENS.colors.surfaceElevated,
    borderRadius: TOKENS.radii.sm,
    borderWidth: 1,
    borderColor: TOKENS.colors.borderDefault,
  },

  textoLimpiarSeleccion: {
    color: TOKENS.colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },

  contenedorCarga: {
    alignItems: 'center',
    paddingVertical: 16,
  },

  textoCarga: {
    color: TOKENS.colors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 8,
  },

  subtextoCarga: {
    color: TOKENS.colors.textSecondary,
    fontSize: 11,
    marginTop: 4,
  },

  textoError: {
    color: TOKENS.colors.danger,
    fontSize: 12,
    marginTop: 6,
  },

  encabezadoHistorial: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    marginTop: 6,
  },

  contadorLista: {
    color: TOKENS.colors.textSecondary,
    fontSize: 12,
  },

  tarjetaRegistro: {
    backgroundColor: TOKENS.colors.surface,
    borderRadius: TOKENS.radii.md,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: TOKENS.colors.borderDefault,
  },

  filaEncabezadoTarjeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },

  columnaFechaHora: {
    flex: 1,
  },

  fechaTarjeta: {
    color: TOKENS.colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },

  filaEtiquetasContexto: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
};
