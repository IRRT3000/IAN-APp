import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import MapaCalorAnual from './heatmap/MapaCalorAnual';

/**
 * Pantalla principal de la 5ª pestaña "Heatmap" (Spec 005).
 * Alberga la cuadrícula completa de 12 meses, selector de año, leyenda de colores,
 * estadísticas globales del año y modal interactivo de desglose diario.
 */
export default function HeatmapView({
  resumenAnual = {},
  anioSeleccionado = new Date().getFullYear(),
  onCambiarAnio,
  fechaHoy,
  onAlternarDescanso,
  onIrAFitnessTracker,
  onIrANutricion,
}) {
  // Estadísticas del año seleccionado calculadas a partir de resumenAnual
  const estadisticasAnio = useMemo(() => {
    const entries = Object.values(resumenAnual);
    let diasActivos = 0;
    let diasAlCien = 0;
    let diasDescanso = 0;

    for (let i = 0; i < entries.length; i += 1) {
      const e = entries[i];
      if (e?.hasWorkout || (e?.comidasCount && e.comidasCount > 0) || e?.isRestDay) {
        diasActivos += 1;
      }
      if (e?.score >= 1.0) {
        diasAlCien += 1;
      }
      if (e?.isRestDay) {
        diasDescanso += 1;
      }
    }

    return { diasActivos, diasAlCien, diasDescanso };
  }, [resumenAnual]);

  return (
    <ScrollView
      style={styles.contenedor}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Encabezado Principal */}
      <View style={styles.encabezado}>
        <View style={styles.insigniaPestana}>
          <Text style={styles.textoInsignia}>🔥 HISTORIAL Y CONSISTENCIA</Text>
        </View>
        <Text style={styles.titulo}>Heatmap Anual</Text>
        <Text style={styles.subtitulo}>
          Seguimiento de 365 días con el motor Vaso de Agua. Cada comida, serie
          o día de descanso alimenta tu constancia.
        </Text>
      </View>

      {/* Tarjetas de Métricas Anuales */}
      <View style={styles.filaMetricas}>
        <View style={styles.tarjetaMetrica}>
          <Text style={[styles.valorMetrica, styles.valorVerde]}>
            {estadisticasAnio.diasActivos}
          </Text>
          <Text style={styles.etiquetaMetrica}>Días activos</Text>
        </View>

        <View style={styles.tarjetaMetrica}>
          <Text style={[styles.valorMetrica, styles.valorDorado]}>
            {estadisticasAnio.diasAlCien}
          </Text>
          <Text style={styles.etiquetaMetrica}>Días al 100%</Text>
        </View>

        <View style={styles.tarjetaMetrica}>
          <Text style={[styles.valorMetrica, styles.valorAzul]}>
            {estadisticasAnio.diasDescanso}
          </Text>
          <Text style={styles.etiquetaMetrica}>Descansos</Text>
        </View>
      </View>

      {/* Componente Modular Mapa de Calor Anual (12 Meses, Selector y Leyenda) */}
      <MapaCalorAnual
        resumenAnual={resumenAnual}
        year={anioSeleccionado}
        onYearChange={onCambiarAnio}
        fechaHoy={fechaHoy}
        onAlternarDescanso={onAlternarDescanso}
        onIrAFitnessTracker={onIrAFitnessTracker}
        onIrANutricion={onIrANutricion}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    flex: 1,
    backgroundColor: '#121212',
  },
  scrollContent: {
    paddingVertical: 12,
    paddingBottom: 28,
  },
  encabezado: {
    marginBottom: 16,
    marginTop: 4,
  },
  insigniaPestana: {
    alignSelf: 'flex-start',
    backgroundColor: '#1E1E1E',
    borderWidth: 1,
    borderColor: '#2E2E2E',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginBottom: 8,
  },
  textoInsignia: {
    color: '#00E676',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  titulo: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  subtitulo: {
    color: '#9E9E9E',
    fontSize: 13,
    lineHeight: 18,
  },
  filaMetricas: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  tarjetaMetrica: {
    flex: 1,
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 8,
    marginHorizontal: 3,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  valorMetrica: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 2,
  },
  valorVerde: {
    color: '#00E676',
  },
  valorDorado: {
    color: '#FFD700',
  },
  valorAzul: {
    color: '#60A5FA',
  },
  etiquetaMetrica: {
    color: '#8D8D8D',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
});
