import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import HeatmapDayCell from './HeatmapDayCell';
import {
  DIAS_SEMANA_CORTO,
  NOMBRES_MESES,
  esFechaFutura,
  generarMatrizMes,
} from '../../utils/dateUtilsLocal';

/**
 * Bloque individual de un mes dentro del Mapa de Calor Anual.
 * Renderiza encabezado abreviado, cabecera L-D de 7 columnas y celdas memoizadas.
 */
export default function MonthBlock({
  year,
  monthIndex,
  resumenAnual = {},
  fechaHoy,
  onSelectDay,
}) {
  const nombreMes = NOMBRES_MESES[monthIndex] || `M${monthIndex + 1}`;

  const celdas = useMemo(
    () => generarMatrizMes(year, monthIndex),
    [year, monthIndex]
  );

  return (
    <View style={styles.contenedorMes}>
      <Text style={styles.tituloMes}>{nombreMes}</Text>

      {/* Cabecera de 7 columnas de días de la semana (L a D) */}
      <View style={styles.filaDiasSemana}>
        {DIAS_SEMANA_CORTO.map((diaLetra, idx) => (
          <Text key={`cab-${monthIndex}-${idx}`} style={styles.textoDiaSemana}>
            {diaLetra}
          </Text>
        ))}
      </View>

      {/* Cuadrícula de celdas del mes */}
      <View style={styles.cuadriculaMes}>
        {celdas.map((item, idx) => {
          if (item.esVacio) {
            return (
              <HeatmapDayCell
                key={`empty-${monthIndex}-${idx}`}
                esVacio={true}
              />
            );
          }

          const datosDia = resumenAnual[item.fechaStr] || null;
          const isFuture = esFechaFutura(item.fechaStr, fechaHoy);
          const isToday = item.fechaStr === fechaHoy;

          return (
            <HeatmapDayCell
              key={item.fechaStr}
              fechaStr={item.fechaStr}
              dia={item.dia}
              score={datosDia?.score || 0}
              nivelColor={datosDia?.nivelColor || 0}
              isFuture={isFuture}
              isToday={isToday}
              isRestDay={Boolean(datosDia?.isRestDay)}
              hasPhoto={Boolean(datosDia?.hasPhoto)}
              esVacio={false}
              onPress={onSelectDay}
            />
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  contenedorMes: {
    backgroundColor: '#1E1E1E',
    borderRadius: 10,
    padding: 8,
    marginVertical: 5,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    width: '48.5%',
    alignItems: 'center',
  },
  tituloMes: {
    color: '#00E676',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 4,
    alignSelf: 'flex-start',
    paddingLeft: 2,
  },
  filaDiasSemana: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    width: 7 * 17,
    marginBottom: 3,
  },
  textoDiaSemana: {
    width: 14,
    marginHorizontal: 1.5,
    textAlign: 'center',
    color: '#666666',
    fontSize: 8,
    fontWeight: '700',
  },
  cuadriculaMes: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: 7 * 17,
    justifyContent: 'flex-start',
  },
});
