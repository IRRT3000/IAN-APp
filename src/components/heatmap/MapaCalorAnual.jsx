import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import MonthBlock from './MonthBlock';
import DaySummaryModal from './DaySummaryModal';
import { PALETA_NIVELES_VASO } from '../../utils/waterGlassEngine';
import { TOKENS } from '../../theme/tokens';

export default function MapaCalorAnual({
  resumenAnual = {},
  year = new Date().getFullYear(),
  onYearChange,
  fechaHoy,
  onAlternarDescanso,
  onIrAFitnessTracker,
  onIrANutricion,
}) {
  const anioActualLocal = new Date().getFullYear();
  const [fechaSeleccionada, setFechaSeleccionada] = useState(null);

  const puedeAvanzarAnio = year < anioActualLocal;
  const mesesIndices = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

  const handlePrevYear = () => {
    if (typeof onYearChange === 'function') {
      onYearChange(year - 1);
    }
  };

  const handleNextYear = () => {
    if (puedeAvanzarAnio && typeof onYearChange === 'function') {
      onYearChange(year + 1);
    }
  };

  const handleSelectDay = (fechaStr) => {
    setFechaSeleccionada(fechaStr);
  };

  const handleCloseModal = () => {
    setFechaSeleccionada(null);
  };

  return (
    <View style={styles.contenedor}>
      <View style={styles.encabezado}>
        <View style={styles.textosEncabezado}>
          <Text style={styles.titulo}>Mapa de Consistencia</Text>
          <Text style={styles.subtitulo}>Motor Vaso de Agua · 365 días</Text>
        </View>

        <View style={styles.selectorAnio}>
          <TouchableOpacity
            style={styles.botonAnio}
            activeOpacity={0.7}
            onPress={handlePrevYear}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Feather name="chevron-left" size={16} color={TOKENS.colors.textPrimary} />
          </TouchableOpacity>

          <Text style={styles.textoAnioActual}>{year}</Text>

          <TouchableOpacity
            style={[styles.botonAnio, !puedeAvanzarAnio && styles.botonAnioDeshabilitado]}
            activeOpacity={0.7}
            disabled={!puedeAvanzarAnio}
            onPress={handleNextYear}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Feather
              name="chevron-right"
              size={16}
              color={puedeAvanzarAnio ? TOKENS.colors.textPrimary : TOKENS.colors.textMuted}
            />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.cuadriculaMeses}>
        {mesesIndices.map((monthIndex) => (
          <MonthBlock
            key={`mes-${year}-${monthIndex}`}
            year={year}
            monthIndex={monthIndex}
            resumenAnual={resumenAnual}
            fechaHoy={fechaHoy}
            onSelectDay={handleSelectDay}
          />
        ))}
      </View>

      <View style={styles.seccionLeyenda}>
        <Text style={styles.tituloLeyenda}>ESCALA DE CONSISTENCIA</Text>
        <View style={styles.filaMuestrasLeyenda}>
          <Text style={styles.textoExtremoLeyenda}>0%</Text>
          {[0, 1, 2, 3, 4].map((nivel) => (
            <View
              key={`leyenda-${nivel}`}
              style={[
                styles.cuadroLeyenda,
                {
                  backgroundColor: PALETA_NIVELES_VASO[nivel].fondo,
                  borderColor: PALETA_NIVELES_VASO[nivel].borde,
                },
              ]}
            />
          ))}
          <Text style={styles.textoExtremoLeyenda}>100%</Text>
        </View>
      </View>

      <DaySummaryModal
        visible={Boolean(fechaSeleccionada)}
        fechaStr={fechaSeleccionada}
        resumen={fechaSeleccionada ? resumenAnual[fechaSeleccionada] : null}
        fechaHoy={fechaHoy}
        onClose={handleCloseModal}
        onAlternarDescanso={onAlternarDescanso}
        onIrAEntrenos={onIrAFitnessTracker}
        onIrANutricion={onIrANutricion}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    backgroundColor: TOKENS.colors.surface,
    borderRadius: TOKENS.radii.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: TOKENS.colors.borderDefault,
    elevation: 3,
  },
  encabezado: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: TOKENS.colors.borderSubtle,
  },
  textosEncabezado: {
    flex: 1,
  },
  titulo: {
    color: TOKENS.colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  subtitulo: {
    color: TOKENS.colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  selectorAnio: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: TOKENS.colors.surfaceElevated,
    borderRadius: TOKENS.radii.pill,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: TOKENS.colors.borderDefault,
  },
  botonAnio: {
    padding: 4,
  },
  botonAnioDeshabilitado: {
    opacity: 0.3,
  },
  textoAnioActual: {
    color: TOKENS.colors.textPrimary,
    fontSize: 13,
    fontWeight: '800',
    marginHorizontal: 8,
  },
  cuadriculaMeses: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  seccionLeyenda: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: TOKENS.colors.borderSubtle,
    alignItems: 'center',
  },
  tituloLeyenda: {
    color: TOKENS.colors.textMuted,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  filaMuestrasLeyenda: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  textoExtremoLeyenda: {
    color: TOKENS.colors.textSecondary,
    fontSize: 10,
    fontWeight: '600',
    marginHorizontal: 6,
  },
  cuadroLeyenda: {
    width: 14,
    height: 14,
    borderRadius: 3,
    marginHorizontal: 3,
    borderWidth: 1,
  },
});
