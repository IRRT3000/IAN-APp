import React, { useMemo } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import HeatmapDayCell from './HeatmapDayCell';
import {
  DIAS_SEMANA_CORTO,
  NOMBRES_MESES,
  esFechaFutura,
  generarMatrizMes,
} from '../../utils/dateUtilsLocal';

// Espacio horizontal ocupado fuera de la cuadrícula en el widget de Inicio:
// padding de App (16*2) + padding de tarjeta (16*2) + padding del bloque (8*2) + margen de seguridad.
const MARGEN_HORIZONTAL_WIDGET = 86;
const MARGEN_CELDA_GRANDE = 7; // 3.5 por lado
const ANCHO_MAX_COLUMNA_GRANDE = 41; // Para celda de 34px

/**
 * Bloque individual de un mes dentro del Mapa de Calor.
 * Spec 006: Monocromo Matte Luxury editorial.
 */
export default function MonthBlock({
  year,
  monthIndex,
  resumenAnual = {},
  fechaHoy,
  onSelectDay,
  anchoCompleto = false,
  tamanoGrande = false,
  mostrarTitulo = true,
}) {
  const nombreMes = NOMBRES_MESES[monthIndex] || `M${monthIndex + 1}`;
  const { width: anchoPantalla } = useWindowDimensions();

  // En modo grande, la celda se ajusta para que 7 columnas quepan en pantallas estrechas (p. ej. 360dp)
  const anchoColumnaGrande = Math.min(
    ANCHO_MAX_COLUMNA_GRANDE,
    Math.max(30, Math.floor((anchoPantalla - MARGEN_HORIZONTAL_WIDGET) / 7))
  );
  const tamanoCelda = anchoColumnaGrande - MARGEN_CELDA_GRANDE;
  const estiloAnchoGrande = tamanoGrande
    ? { width: 7 * anchoColumnaGrande }
    : null;

  const celdas = useMemo(
    () => generarMatrizMes(year, monthIndex),
    [year, monthIndex]
  );

  return (
    <View
      style={[
        styles.contenedorMes,
        anchoCompleto && styles.contenedorMesCompleto,
      ]}
    >
      {mostrarTitulo ? (
        <Text
          style={[
            styles.tituloMes,
            tamanoGrande && styles.tituloMesGrande,
          ]}
        >
          {nombreMes.toUpperCase()}
        </Text>
      ) : null}

      {/* Cabecera de 7 columnas de días de la semana (L a D) */}
      <View
        style={[
          styles.filaDiasSemana,
          tamanoGrande && styles.filaDiasSemanaGrande,
          estiloAnchoGrande,
        ]}
      >
        {DIAS_SEMANA_CORTO.map((diaLetra, idx) => (
          <Text
            key={`cab-${monthIndex}-${idx}`}
            style={[
              styles.textoDiaSemana,
              tamanoGrande && styles.textoDiaSemanaGrande,
              tamanoGrande && { width: tamanoCelda },
            ]}
          >
            {diaLetra}
          </Text>
        ))}
      </View>

      {/* Cuadrícula de celdas del mes */}
      <View
        style={[
          styles.cuadriculaMes,
          tamanoGrande && styles.cuadriculaMesGrande,
          estiloAnchoGrande,
        ]}
      >
        {celdas.map((item, idx) => {
          if (item.esVacio) {
            return (
              <HeatmapDayCell
                key={`empty-${monthIndex}-${idx}`}
                esVacio={true}
                tamanoGrande={tamanoGrande}
                tamanoCelda={tamanoCelda}
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
              tamanoGrande={tamanoGrande}
              tamanoCelda={tamanoCelda}
            />
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  contenedorMes: {
    backgroundColor: '#141414',
    borderRadius: 14,
    padding: 8,
    marginVertical: 4,
    borderWidth: 1,
    borderColor: '#262626',
    width: '48.5%',
    alignItems: 'center',
  },
  contenedorMesCompleto: {
    width: '100%',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 8,
    marginVertical: 0,
    backgroundColor: '#141414',
    borderColor: '#262626',
  },
  tituloMes: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginBottom: 4,
    alignSelf: 'flex-start',
    paddingLeft: 2,
  },
  tituloMesGrande: {
    fontSize: 13,
    letterSpacing: 1.4,
    marginBottom: 8,
    alignSelf: 'center',
  },
  filaDiasSemana: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    width: 7 * 17,
    marginBottom: 3,
  },
  filaDiasSemanaGrande: {
    marginBottom: 6,
    justifyContent: 'center',
  },
  textoDiaSemana: {
    width: 14,
    marginHorizontal: 1.5,
    textAlign: 'center',
    color: '#555555',
    fontSize: 8,
    fontWeight: '700',
  },
  textoDiaSemanaGrande: {
    marginHorizontal: 3.5,
    fontSize: 10,
    fontWeight: '700',
    color: '#8E8E93',
  },
  cuadriculaMes: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: 7 * 17,
    justifyContent: 'flex-start',
  },
  cuadriculaMesGrande: {
    justifyContent: 'center',
  },
});
