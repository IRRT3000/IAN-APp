import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function MenuBienvenida({
  fechaHoy,
  totalEjerciciosHoy = 0,
  totalDiasActivos = 0,
  caloriasHoy = 0,
  ultimoEjercicioHoy = null,
  onIrAFitnessTracker,
  onIrANutricion,
  onIrACambioFisico,
}) {
  const metaCumplidaHoy = totalEjerciciosHoy > 0;

  return (
    <View style={styles.contenedor}>
      <View style={styles.bloqueSuperior}>
        <View style={styles.insigniaEstado}>
          <View
            style={[
              styles.puntoEstado,
              metaCumplidaHoy ? styles.puntoActivo : styles.puntoPendiente,
            ]}
          />
          <Text style={styles.textoInsignia}>
            {metaCumplidaHoy ? 'ENTRENAMIENTO ACTIVO HOY' : 'LISTO PARA HOY'}
          </Text>
        </View>

        <Text style={styles.fechaMinimalista}>{fechaHoy}</Text>
        <Text style={styles.tituloBienvenida}>Fitness Tracker</Text>
        <Text style={styles.subtituloBienvenida}>
          Entrenamiento de fuerza, nutrición IA y análisis de cambio físico con
          Gemini Vision.
        </Text>
      </View>

      <View style={styles.filaMetricas}>
        <View style={styles.tarjetaMetrica}>
          <Text style={styles.valorMetrica}>{totalEjerciciosHoy}</Text>
          <Text style={styles.etiquetaMetrica}>Ejercicios hoy</Text>
        </View>

        <View style={styles.tarjetaMetrica}>
          <Text style={[styles.valorMetrica, styles.valorAcento]}>
            {totalDiasActivos}
          </Text>
          <Text style={styles.etiquetaMetrica}>Días activos</Text>
        </View>

        <View style={styles.tarjetaMetrica}>
          <Text style={styles.valorMetrica}>{caloriasHoy}</Text>
          <Text style={styles.etiquetaMetrica}>Kcal hoy</Text>
        </View>
      </View>

      <View style={styles.tarjetaResumenDia}>
        <Text style={styles.etiquetaResumen}>ACCESO RÁPIDO</Text>
        {ultimoEjercicioHoy ? (
          <View style={styles.detalleUltimo}>
            <Text style={styles.tituloUltimo}>
              Último ejercicio: {ultimoEjercicioHoy.ejercicio}
            </Text>
            <Text style={styles.subtituloUltimo}>
              {ultimoEjercicioHoy.series} series ×{' '}
              {ultimoEjercicioHoy.repeticiones} reps · {ultimoEjercicioHoy.peso}{' '}
              kg
            </Text>
          </View>
        ) : (
          <Text style={styles.textoSinSesion}>
            Registra tus series del día, analiza tus comidas o evalúa tu cambio
            físico con báscula circular.
          </Text>
        )}

        <View style={styles.filaBotonesAcceso}>
          <TouchableOpacity
            style={[styles.botonAccesoDirecto, styles.botonPrimario]}
            activeOpacity={0.85}
            onPress={onIrAFitnessTracker}
          >
            <Text style={styles.textoBotonPrimario}>⚡ Entrenos</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.botonAccesoDirecto}
            activeOpacity={0.85}
            onPress={onIrANutricion}
          >
            <Text style={styles.textoBotonAcceso}>🥗 Nutrición</Text>
          </TouchableOpacity>

          {typeof onIrACambioFisico === 'function' ? (
            <TouchableOpacity
              style={styles.botonAccesoDirecto}
              activeOpacity={0.85}
              onPress={onIrACambioFisico}
            >
              <Text style={styles.textoBotonAcceso}>💪 Físico IA</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      <View style={styles.guiaInferior}>
        <Text style={styles.textoGuiaInferior}>
          Usa la barra inferior para alternar entre Inicio, Entrenos, Nutrición
          y Físico
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    flex: 1,
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  bloqueSuperior: {
    marginTop: 16,
  },
  insigniaEstado: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#1E1E1E',
    borderWidth: 1,
    borderColor: '#2E2E2E',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 20,
  },
  puntoEstado: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  puntoActivo: {
    backgroundColor: '#00E676',
  },
  puntoPendiente: {
    backgroundColor: '#757575',
  },
  textoInsignia: {
    color: '#B0B0B0',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  fechaMinimalista: {
    color: '#00E676',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  tituloBienvenida: {
    color: '#FFFFFF',
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 10,
  },
  subtituloBienvenida: {
    color: '#9E9E9E',
    fontSize: 15,
    lineHeight: 22,
  },
  filaMetricas: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 20,
  },
  tarjetaMetrica: {
    flex: 1,
    backgroundColor: '#1A1A1A',
    borderRadius: 14,
    paddingVertical: 18,
    paddingHorizontal: 10,
    marginHorizontal: 4,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  valorMetrica: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 4,
  },
  valorAcento: {
    color: '#00E676',
  },
  etiquetaMetrica: {
    color: '#8D8D8D',
    fontSize: 11,
    fontWeight: '600',
  },
  tarjetaResumenDia: {
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  etiquetaResumen: {
    color: '#757575',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  detalleUltimo: {
    marginBottom: 16,
  },
  tituloUltimo: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtituloUltimo: {
    color: '#00E676',
    fontSize: 13,
    fontWeight: '600',
  },
  textoSinSesion: {
    color: '#B0B0B0',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  filaBotonesAcceso: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  botonAccesoDirecto: {
    flex: 1,
    backgroundColor: '#2A2A2A',
    borderRadius: 10,
    paddingVertical: 12,
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
  textoBotonAcceso: {
    color: '#00E676',
    fontSize: 12,
    fontWeight: '700',
  },
  guiaInferior: {
    alignItems: 'center',
    paddingBottom: 6,
  },
  textoGuiaInferior: {
    color: '#6E6E6E',
    fontSize: 12,
    textAlign: 'center',
  },
});
