import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MonthBlock from './MonthBlock';
import DaySummaryModal from './DaySummaryModal';
import { PALETA_NIVELES_VASO } from '../../utils/waterGlassEngine';

/**
 * Componente principal del Mapa de Calor Anual (Spec 004).
 * Incluye selector de año < [Año] >, cuadrícula de 12 meses, leyenda de 5 niveles
 * y modal interactivo de desglose diario.
 */
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
      {/* Encabezado con título y selector de año */}
      <View style={styles.encabezado}>
        <View style={styles.textosEncabezado}>
          <Text style={styles.titulo}>Mapa de Consistencia</Text>
          <Text style={styles.subtitulo}>Motor Vaso de Agua · 365 días</Text>
        </View>

        {/* Selector de año < 2026 > */}
        <View style={styles.selectorAnio}>
          <TouchableOpacity
            style={styles.botonAnio}
            activeOpacity={0.7}
            onPress={handlePrevYear}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.flechaAnio}>◀</Text>
          </TouchableOpacity>

          <Text style={styles.textoAnioActual}>{year}</Text>

          <TouchableOpacity
            style={[styles.botonAnio, !puedeAvanzarAnio && styles.botonAnioDeshabilitado]}
            activeOpacity={0.7}
            disabled={!puedeAvanzarAnio}
            onPress={handleNextYear}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text
              style={[
                styles.flechaAnio,
                !puedeAvanzarAnio && styles.flechaDeshabilitada,
              ]}
            >
              ▶
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Cuadrícula de 12 Meses (2 columnas adaptables) */}
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

      {/* Leyenda de los 5 Niveles del Vaso de Agua */}
      <View style={styles.seccionLeyenda}>
        <Text style={styles.tituloLeyenda}>Llenado del Vaso:</Text>
        <View style={styles.filaMuestras}>
          <Text style={styles.textoRangoLeyenda}>0%</Text>
          {[0, 1, 2, 3, 4].map((nivel) => {
            const estilo = PALETA_NIVELES_VASO[nivel];
            return (
              <View
                key={`leyenda-${nivel}`}
                style={[
                  styles.muestraCelda,
                  {
                    backgroundColor: estilo.fondo,
                    borderColor: estilo.borde,
                  },
                ]}
              />
            );
          })}
          <Text style={styles.textoRangoLeyenda}>100%</Text>
        </View>
      </View>

      {/* Modal de Desglose Diario */}
      <DaySummaryModal
        visible={Boolean(fechaSeleccionada)}
        fechaStr={fechaSeleccionada}
        resumen={fechaSeleccionada ? resumenAnual[fechaSeleccionada] || null : null}
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
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    marginVertical: 16,
  },
  encabezado: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  textosEncabezado: {
    flex: 1,
  },
  titulo: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  subtitulo: {
    color: '#8D8D8D',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  selectorAnio: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#262626',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: '#333333',
  },
  botonAnio: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  botonAnioDeshabilitado: {
    opacity: 0.3,
  },
  flechaAnio: {
    color: '#00E676',
    fontSize: 11,
    fontWeight: '800',
  },
  flechaDeshabilitada: {
    color: '#757575',
  },
  textoAnioActual: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    marginHorizontal: 8,
  },
  cuadriculaMeses: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  seccionLeyenda: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#262626',
  },
  tituloLeyenda: {
    color: '#757575',
    fontSize: 10,
    fontWeight: '600',
    marginRight: 6,
  },
  filaMuestras: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  muestraCelda: {
    width: 11,
    height: 11,
    borderRadius: 2,
    marginHorizontal: 2,
    borderWidth: 1,
  },
  textoRangoLeyenda: {
    color: '#888888',
    fontSize: 9,
    fontWeight: '700',
    marginHorizontal: 4,
  },
});
