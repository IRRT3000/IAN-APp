import React from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { formatearFechaLegible } from '../../utils/dateUtilsLocal';
import { PALETA_NIVELES_VASO } from '../../utils/waterGlassEngine';

/**
 * Modal emergente interactivo que desglosa los hábitos del día seleccionado:
 * - Vaso de Agua con porcentaje continuo y barra visual
 * - Nutrición (X/3 comidas registradas y Kcal)
 * - Entrenamiento / Descanso sin penalización
 * - Fotos de progreso corporal (insignia)
 * - Botón para alternar descanso únicamente si la fecha es hoy (Inmutabilidad temporal)
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
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.fondoOverlay}>
          <TouchableWithoutFeedback>
            <View style={styles.tarjetaModal}>
              {/* Encabezado con fecha y badge */}
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
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={styles.textoCruz}>✕</Text>
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

              {/* Desglose de Hábitos */}
              <View style={styles.contenedorDesglose}>
                {/* 1. Nutrición */}
                <View style={styles.filaHabito}>
                  <Text style={styles.iconoHabito}>🥗</Text>
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
                  <Text style={styles.iconoHabito}>
                    {hasWorkout ? '🏋️' : isRestDay ? '🛌' : '⏳'}
                  </Text>
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
                <View style={styles.filaHabito}>
                  <Text style={styles.iconoHabito}>📸</Text>
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
                      <Text style={styles.textoInsignia}>⭐ INSIGNIA</Text>
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
                    <Text
                      style={[
                        styles.textoBotonAccion,
                        isRestDay ? styles.textoDescansoActivo : styles.textoDescansoInactivo,
                      ]}
                    >
                      {isRestDay ? '🛌 Quitar Día de Descanso' : '🛌 Marcar como Día de Descanso'}
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
                      <Text style={styles.textoBotonPrimario}>⚡ Entrenar</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.botonAccesoPequeno}
                      activeOpacity={0.85}
                      onPress={() => {
                        onClose();
                        if (typeof onIrANutricion === 'function') onIrANutricion();
                      }}
                    >
                      <Text style={styles.textoBotonSecundario}>🥗 Comida</Text>
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
    backgroundColor: 'rgba(0, 0, 0, 0.78)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  tarjetaModal: {
    width: '100%',
    backgroundColor: '#1E1E1E',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#2E2E2E',
    padding: 20,
  },
  encabezado: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  fechaTexto: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 3,
  },
  subtituloModal: {
    color: '#8D8D8D',
    fontSize: 12,
    fontWeight: '600',
  },
  botonCerrarCruz: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#2A2A2A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  textoCruz: {
    color: '#B0B0B0',
    fontSize: 13,
    fontWeight: '700',
  },
  seccionVaso: {
    backgroundColor: '#151515',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#262626',
    marginBottom: 16,
  },
  filaVasoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  etiquetaVaso: {
    color: '#888888',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  porcentajeVaso: {
    fontSize: 16,
    fontWeight: '800',
  },
  contenedorBarra: {
    height: 8,
    backgroundColor: '#2A2A2A',
    borderRadius: 4,
    overflow: 'hidden',
  },
  barraProgreso: {
    height: '100%',
    borderRadius: 4,
  },
  contenedorDesglose: {
    marginBottom: 16,
  },
  filaHabito: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#262626',
  },
  iconoHabito: {
    fontSize: 20,
    marginRight: 12,
  },
  infoHabito: {
    flex: 1,
  },
  tituloHabito: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  detalleHabito: {
    color: '#9E9E9E',
    fontSize: 12,
  },
  scoreHabito: {
    color: '#757575',
    fontSize: 13,
    fontWeight: '700',
  },
  scoreHabitoPositivo: {
    color: '#00E676',
  },
  badgeInsignia: {
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.4)',
  },
  textoInsignia: {
    color: '#FFD700',
    fontSize: 10,
    fontWeight: '800',
  },
  contenedorAcciones: {
    marginBottom: 12,
  },
  botonAccionModal: {
    paddingVertical: 11,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 1,
  },
  botonDescansoInactivo: {
    backgroundColor: '#2A2A2A',
    borderColor: '#3B82F6',
  },
  botonDescansoActivo: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    borderColor: '#60A5FA',
  },
  textoBotonAccion: {
    fontSize: 13,
    fontWeight: '700',
  },
  textoDescansoInactivo: {
    color: '#60A5FA',
  },
  textoDescansoActivo: {
    color: '#93C5FD',
  },
  filaBotonesAccesos: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  botonAccesoPequeno: {
    flex: 1,
    backgroundColor: '#262626',
    borderRadius: 10,
    paddingVertical: 10,
    marginHorizontal: 3,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#00E676',
  },
  botonPrimario: {
    backgroundColor: '#00E676',
  },
  textoBotonPrimario: {
    color: '#121212',
    fontSize: 12,
    fontWeight: '800',
  },
  textoBotonSecundario: {
    color: '#00E676',
    fontSize: 12,
    fontWeight: '700',
  },
  bloqueSoloLectura: {
    backgroundColor: '#151515',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  textoSoloLectura: {
    color: '#757575',
    fontSize: 11,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  botonCerrar: {
    backgroundColor: '#2A2A2A',
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
  },
  textoBotonCerrar: {
    color: '#CCCCCC',
    fontSize: 13,
    fontWeight: '700',
  },
});
