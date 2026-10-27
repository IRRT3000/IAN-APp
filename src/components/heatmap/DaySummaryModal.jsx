import React from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { formatearFechaLegible } from '../../utils/dateUtilsLocal';
import { PALETA_NIVELES_VASO } from '../../utils/waterGlassEngine';
import { TOKENS } from '../../theme/tokens';

/**
 * Modal emergente interactivo que desglosa los hábitos del día seleccionado (Spec 006: Monocromo Matte Luxury):
 * - Vaso de Agua con porcentaje continuo y barra visual
 * - Nutrición (X/3 comidas registradas y Kcal)
 * - Entrenamiento / Descanso sin penalización
 * - Fotos de progreso corporal (insignia)
 * - Botón para alternar descanso únicamente si la fecha es hoy (Inmutabilidad temporal)
 * - CERO EMOJIS: iconos Feather integrados con estética editorial.
 */
export default function DaySummaryModal({
  visible = false,
  fechaStr = null,
  resumen = null,
  fechaHoy,
  onClose,
  onAlternarDescanso,
  onIrAEntrenos,
  onIrANutricion,
}) {
  if (!visible || !fechaStr) {
    return null;
  }

  const esHoy = fechaStr === fechaHoy;
  const esFuturo = fechaStr > fechaHoy;

  const score = resumen?.score || 0;
  const nivel = resumen?.nivelColor || 0;
  const comidasCount = resumen?.comidasCount || 0;
  const hasWorkout = Boolean(resumen?.hasWorkout);
  const isRestDay = Boolean(resumen?.isRestDay);
  const hasPhoto = Boolean(resumen?.hasPhoto);
  const fotosCount = resumen?.fotosCount || 0;
  const calorias = resumen?.calorias || 0;
  const porcentaje = Math.round(score * 100);

  const estiloNivel = PALETA_NIVELES_VASO[nivel] || PALETA_NIVELES_VASO[0];

  return (
    <Modal
      visible={visible}
      transparent={true}
      statusBarTranslucent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.fondoOverlay}>
          <TouchableWithoutFeedback>
            <View style={styles.tarjetaModal}>
              {/* Encabezado con fecha y botón cerrar */}
              <View style={styles.encabezado}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fechaTexto}>
                    {formatearFechaLegible(fechaStr)}
                  </Text>
                  <Text style={styles.subtituloModal}>
                    {esHoy
                      ? 'Día de Hoy · Acciones activas'
                      : esFuturo
                      ? 'Fecha Futura'
                      : 'Registro Histórico'}
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.botonCerrarCruz}
                  onPress={onClose}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  accessibilityLabel="Cerrar resumen del día"
                >
                  <Feather name="x" size={18} color="#FFFFFF" />
                </TouchableOpacity>
              </View>

              {/* Indicador del Vaso de Agua */}
              <View style={styles.seccionVaso}>
                <View style={styles.filaVasoHeader}>
                  <Text style={styles.etiquetaVaso}>VASO DE AGUA</Text>
                  <Text style={[styles.porcentajeVaso, { color: estiloNivel.borde }]}>
                    {porcentaje}% Lleno
                  </Text>
                </View>

                {/* Barra de progreso continua */}
                <View style={styles.contenedorBarra}>
                  <View
                    style={[
                      styles.barraProgreso,
                      {
                        width: `${Math.min(100, Math.max(4, porcentaje))}%`,
                        backgroundColor: estiloNivel.borde,
                      },
                    ]}
                  />
                </View>
              </View>

              {/* Desglose de Hábitos Monocromo */}
              <View style={styles.contenedorDesglose}>
                {/* 1. Nutrición */}
                <View style={styles.filaHabito}>
                  <View style={styles.iconoHabitoContenedor}>
                    <Feather name="pie-chart" size={16} color="#FFFFFF" />
                  </View>
                  <View style={styles.infoHabito}>
                    <Text style={styles.tituloHabito}>Nutrición</Text>
                    <Text style={styles.detalleHabito}>
                      {comidasCount > 0
                        ? `${comidasCount} / 3 comidas (${calorias} kcal)`
                        : 'Sin comidas registradas'}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.scoreHabito,
                      comidasCount > 0 && styles.scoreHabitoPositivo,
                    ]}
                  >
                    +{Math.round(Math.min(comidasCount / 3, 1.0) * 50)}%
                  </Text>
                </View>

                {/* 2. Entrenamiento o Descanso */}
                <View style={styles.filaHabito}>
                  <View style={styles.iconoHabitoContenedor}>
                    <Feather
                      name={hasWorkout ? 'activity' : isRestDay ? 'moon' : 'clock'}
                      size={16}
                      color="#FFFFFF"
                    />
                  </View>
                  <View style={styles.infoHabito}>
                    <Text style={styles.tituloHabito}>
                      {hasWorkout
                        ? 'Entrenamiento de Fuerza'
                        : isRestDay
                        ? 'Día de Descanso'
                        : 'Entrenamiento / Descanso'}
                    </Text>
                    <Text style={styles.detalleHabito}>
                      {hasWorkout
                        ? `${resumen?.entrenamientos?.length || 1} ejercicio(s) completado(s)`
                        : isRestDay
                        ? 'Recuperación muscular activa (sin penalización)'
                        : 'Sin sesión ni descanso marcado'}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.scoreHabito,
                      (hasWorkout || isRestDay) && styles.scoreHabitoPositivo,
                    ]}
                  >
                    {hasWorkout || isRestDay ? '+50%' : '+0%'}
                  </Text>
                </View>

                {/* 3. Fotos de Progreso (Insignia) */}
                <View style={[styles.filaHabito, { borderBottomWidth: 0 }]}>
                  <View style={styles.iconoHabitoContenedor}>
                    <Feather name="camera" size={16} color="#FFFFFF" />
                  </View>
                  <View style={styles.infoHabito}>
                    <Text style={styles.tituloHabito}>Fotos de Progreso</Text>
                    <Text style={styles.detalleHabito}>
                      {hasPhoto
                        ? `${fotosCount} foto(s) física(s) registrada(s)`
                        : 'Sin fotos físicas'}
                    </Text>
                  </View>
                  {hasPhoto ? (
                    <View style={styles.badgeInsignia}>
                      <Feather name="award" size={10} color="#0A0A0A" style={{ marginRight: 3 }} />
                      <Text style={styles.textoInsignia}>INSIGNIA</Text>
                    </View>
                  ) : (
                    <Text style={styles.scoreHabito}>Opcional</Text>
                  )}
                </View>
              </View>

              {/* Acciones interactivas (solo habilitadas para el día de hoy) */}
              {esHoy ? (
                <View style={styles.contenedorAcciones}>
                  <TouchableOpacity
                    style={[
                      styles.botonAccionModal,
                      isRestDay ? styles.botonDescansoActivo : styles.botonDescansoInactivo,
                    ]}
                    activeOpacity={0.85}
                    onPress={() => {
                      if (typeof onAlternarDescanso === 'function') {
                        onAlternarDescanso(fechaStr);
                      }
                    }}
                  >
                    <Feather
                      name="moon"
                      size={14}
                      color={isRestDay ? '#FFFFFF' : '#8E8E93'}
                      style={{ marginRight: 6 }}
                    />
                    <Text
                      style={[
                        styles.textoBotonAccion,
                        isRestDay ? styles.textoDescansoActivo : styles.textoDescansoInactivo,
                      ]}
                    >
                      {isRestDay ? 'Quitar Día de Descanso' : 'Marcar como Día de Descanso'}
                    </Text>
                  </TouchableOpacity>

                  <View style={styles.filaBotonesAccesos}>
                    <TouchableOpacity
                      style={[styles.botonAccesoPequeno, styles.botonPrimario]}
                      activeOpacity={0.85}
                      onPress={() => {
                        onClose();
                        if (typeof onIrAEntrenos === 'function') onIrAEntrenos();
                      }}
                    >
                      <Feather name="activity" size={14} color="#0A0A0A" style={{ marginRight: 4 }} />
                      <Text style={styles.textoBotonPrimario}>Entrenar</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.botonAccesoPequeno}
                      activeOpacity={0.85}
                      onPress={() => {
                        onClose();
                        if (typeof onIrANutricion === 'function') onIrANutricion();
                      }}
                    >
                      <Feather name="pie-chart" size={14} color="#FFFFFF" style={{ marginRight: 4 }} />
                      <Text style={styles.textoBotonSecundario}>Comida</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <View style={styles.bloqueSoloLectura}>
                  <Text style={styles.textoSoloLectura}>
                    Los hábitos pasados son inmutables para preservar la disciplina histórica.
                  </Text>
                </View>
              )}

              <TouchableOpacity
                style={styles.botonCerrar}
                activeOpacity={0.8}
                onPress={onClose}
              >
                <Text style={styles.textoBotonCerrar}>Cerrar</Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fondoOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  tarjetaModal: {
    width: '100%',
    backgroundColor: TOKENS.colors.surface,
    borderRadius: TOKENS.radii.lg,
    borderWidth: 1,
    borderColor: TOKENS.colors.borderDefault,
    padding: 20,
  },
  encabezado: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  fechaTexto: {
    color: TOKENS.colors.textPrimary,
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 3,
  },
  subtituloModal: {
    color: TOKENS.colors.textSecondary,
    fontSize: 12,
    fontWeight: '500',
  },
  botonCerrarCruz: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: TOKENS.colors.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: TOKENS.colors.borderDefault,
  },
  seccionVaso: {
    backgroundColor: TOKENS.colors.surfaceElevated,
    borderRadius: TOKENS.radii.md,
    padding: 14,
    borderWidth: 1,
    borderColor: TOKENS.colors.borderDefault,
    marginBottom: 16,
  },
  filaVasoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  etiquetaVaso: {
    color: TOKENS.colors.textSecondary,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  porcentajeVaso: {
    fontSize: 15,
    fontWeight: '800',
  },
  contenedorBarra: {
    height: 6,
    backgroundColor: TOKENS.colors.surface,
    borderRadius: 3,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: TOKENS.colors.borderDefault,
  },
  barraProgreso: {
    height: '100%',
    borderRadius: 3,
  },
  contenedorDesglose: {
    backgroundColor: TOKENS.colors.surfaceElevated,
    borderRadius: TOKENS.radii.md,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: TOKENS.colors.borderDefault,
    marginBottom: 16,
  },
  filaHabito: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: TOKENS.colors.borderDefault,
  },
  iconoHabitoContenedor: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: TOKENS.colors.surface,
    borderWidth: 1,
    borderColor: TOKENS.colors.borderDefault,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  infoHabito: {
    flex: 1,
  },
  tituloHabito: {
    color: TOKENS.colors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },
  detalleHabito: {
    color: TOKENS.colors.textSecondary,
    fontSize: 11,
    fontWeight: '500',
  },
  scoreHabito: {
    color: TOKENS.colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  scoreHabitoPositivo: {
    color: TOKENS.colors.textPrimary,
  },
  badgeInsignia: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: TOKENS.radii.xs,
  },
  textoInsignia: {
    color: '#0A0A0A',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  contenedorAcciones: {
    marginBottom: 12,
  },
  botonAccionModal: {
    flexDirection: 'row',
    height: 48,
    borderRadius: TOKENS.radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    borderWidth: 1,
  },
  botonDescansoInactivo: {
    backgroundColor: TOKENS.colors.surfaceElevated,
    borderColor: TOKENS.colors.borderDefault,
  },
  botonDescansoActivo: {
    backgroundColor: '#262626',
    borderColor: '#FFFFFF',
  },
  textoBotonAccion: {
    fontSize: 12,
    fontWeight: '700',
  },
  textoDescansoInactivo: {
    color: TOKENS.colors.textSecondary,
  },
  textoDescansoActivo: {
    color: '#FFFFFF',
  },
  filaBotonesAccesos: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  botonAccesoPequeno: {
    flex: 1,
    flexDirection: 'row',
    height: 46,
    backgroundColor: TOKENS.colors.surfaceElevated,
    borderRadius: TOKENS.radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: TOKENS.colors.borderDefault,
  },
  botonPrimario: {
    backgroundColor: '#FFFFFF',
    borderColor: '#FFFFFF',
  },
  textoBotonPrimario: {
    color: '#0A0A0A',
    fontSize: 13,
    fontWeight: '800',
  },
  textoBotonSecundario: {
    color: TOKENS.colors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
  bloqueSoloLectura: {
    backgroundColor: TOKENS.colors.surfaceElevated,
    padding: 10,
    borderRadius: TOKENS.radii.sm,
    borderWidth: 1,
    borderColor: TOKENS.colors.borderDefault,
    marginBottom: 12,
  },
  textoSoloLectura: {
    color: TOKENS.colors.textSecondary,
    fontSize: 11,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  botonCerrar: {
    height: 46,
    backgroundColor: TOKENS.colors.surfaceElevated,
    borderRadius: TOKENS.radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: TOKENS.colors.borderDefault,
  },
  textoBotonCerrar: {
    color: TOKENS.colors.textSecondary,
    fontSize: 13,
    fontWeight: '700',
  },
});
