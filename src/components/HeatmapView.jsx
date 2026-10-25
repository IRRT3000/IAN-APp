import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import MapaCalorAnual from './heatmap/MapaCalorAnual';
import { TOKENS } from '../theme/tokens';

export default function HeatmapView({
  resumenAnual = {},
  anioSeleccionado = new Date().getFullYear(),
  onCambiarAnio,
  fechaHoy,
  onAlternarDescanso,
  onIrAFitnessTracker,
  onIrANutricion,
}) {
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
      <View style={styles.encabezado}>
        <View style={styles.insigniaPestana}>
          <Feather
            name="calendar"
            size={12}
            color={TOKENS.colors.textSecondary}
            style={{ marginRight: 6 }}
          />
          <Text style={styles.textoInsignia}>HISTORIAL Y CONSISTENCIA</Text>
        </View>
        <Text style={styles.titulo}>Heatmap Anual</Text>
        <Text style={styles.subtitulo}>
          Seguimiento de 365 días con el motor Vaso de Agua. Cada comida, serie
          o día de descanso alimenta tu constancia.
        </Text>
      </View>

      <View style={styles.filaMetricas}>
        <View style={styles.tarjetaMetrica}>
          <Text style={styles.valorMetrica}>{estadisticasAnio.diasActivos}</Text>
          <Text style={styles.etiquetaMetrica}>Días activos</Text>
        </View>

        <View style={styles.tarjetaMetrica}>
          <Text style={styles.valorMetrica}>{estadisticasAnio.diasAlCien}</Text>
          <Text style={styles.etiquetaMetrica}>Días al 100%</Text>
        </View>

        <View style={styles.tarjetaMetrica}>
          <Text style={styles.valorMetrica}>{estadisticasAnio.diasDescanso}</Text>
          <Text style={styles.etiquetaMetrica}>Descansos</Text>
        </View>
      </View>

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
    backgroundColor: TOKENS.colors.canvas,
  },
  scrollContent: {
    paddingBottom: 110, // Scroll clearance mandatorio
  },
  encabezado: {
    marginBottom: 16,
  },
  insigniaPestana: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: TOKENS.colors.surfaceElevated,
    borderRadius: TOKENS.radii.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: TOKENS.colors.borderDefault,
  },
  textoInsignia: {
    color: TOKENS.colors.textSecondary,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  titulo: {
    color: TOKENS.colors.textPrimary,
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  subtitulo: {
    color: TOKENS.colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
  filaMetricas: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  tarjetaMetrica: {
    flex: 1,
    backgroundColor: TOKENS.colors.surface,
    borderRadius: TOKENS.radii.md,
    padding: 12,
    marginHorizontal: 3,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: TOKENS.colors.borderDefault,
    elevation: 2,
  },
  valorMetrica: {
    color: TOKENS.colors.textPrimary,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  etiquetaMetrica: {
    color: TOKENS.colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginTop: 4,
  },
});
