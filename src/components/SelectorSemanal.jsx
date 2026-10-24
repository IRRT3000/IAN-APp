import React, { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { obtenerFechaLocal } from '../services/storage';

const INICIALES_DIA_SEMANA = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];

/**
 * Genera de forma inmutable el arreglo de los últimos 7 días con aritmética de fecha local pura (RF-1, Directriz 5).
 * Prohibido el uso de toISOString() o new Date("YYYY-MM-DD").
 * @returns {Array<{ fecha: string, inicial: string, diaMes: string, fechaCorta: string, esHoy: boolean }>}
 */
const calcularDiasSemana = () => {
  const hoy = new Date();
  const fechaHoyStr = obtenerFechaLocal(hoy);

  return Array.from({ length: 7 }, (_, index) => {
    const desplazamiento = 6 - index;
    const fechaItem = new Date(
      hoy.getFullYear(),
      hoy.getMonth(),
      hoy.getDate() - desplazamiento
    );

    const fechaStr = obtenerFechaLocal(fechaItem);
    const diaMes = String(fechaItem.getDate()).padStart(2, '0');
    const mes = String(fechaItem.getMonth() + 1).padStart(2, '0');
    const inicial = INICIALES_DIA_SEMANA[fechaItem.getDay()];

    return {
      fecha: fechaStr,
      inicial,
      diaMes,
      fechaCorta: `${diaMes}/${mes}`,
      esHoy: fechaStr === fechaHoyStr,
    };
  });
};

export default function SelectorSemanal({
  fechaSeleccionada,
  onSeleccionarFecha,
  diasConActividad = [],
}) {
  const dias = useMemo(() => calcularDiasSemana(), []);
  const conjuntoActividad = useMemo(
    () => new Set(Array.isArray(diasConActividad) ? diasConActividad : []),
    [diasConActividad]
  );

  return (
    <View style={styles.contenedor}>
      <View style={styles.filaDias}>
        {dias.map((item) => {
          const estaSeleccionado = item.fecha === fechaSeleccionada;
          const tieneActividad = conjuntoActividad.has(item.fecha);

          return (
            <TouchableOpacity
              key={item.fecha}
              style={[
                styles.celda,
                estaSeleccionado && styles.celdaSeleccionada,
                item.esHoy && !estaSeleccionado && styles.celdaHoy,
              ]}
              activeOpacity={0.75}
              onPress={() => onSeleccionarFecha(item.fecha)}
            >
              <Text
                style={[
                  styles.textoInicial,
                  estaSeleccionado
                    ? styles.textoInicialSeleccionado
                    : item.esHoy
                      ? styles.textoInicialHoy
                      : styles.textoInicialNormal,
                ]}
              >
                {item.inicial}
              </Text>

              <Text
                style={[
                  styles.textoDiaMes,
                  estaSeleccionado
                    ? styles.textoDiaMesSeleccionado
                    : styles.textoDiaMesNormal,
                ]}
              >
                {item.diaMes}
              </Text>

              <Text
                style={[
                  styles.textoFechaCorta,
                  estaSeleccionado
                    ? styles.textoFechaCortaSeleccionado
                    : styles.textoFechaCortaNormal,
                ]}
              >
                {item.fechaCorta}
              </Text>

              <View style={styles.contenedorIndicador}>
                {tieneActividad ? (
                  <View
                    style={[
                      styles.puntoActividad,
                      estaSeleccionado && styles.puntoActividadSeleccionado,
                    ]}
                  />
                ) : item.esHoy ? (
                  <Text style={styles.badgeHoy}>HOY</Text>
                ) : (
                  <View style={styles.espaciadorPunto} />
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    backgroundColor: '#1E1E1E',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 6,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2E2E2E',
  },
  filaDias: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  celda: {
    flex: 1,
    marginHorizontal: 2,
    paddingVertical: 8,
    paddingHorizontal: 2,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2A2A2A',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  celdaSeleccionada: {
    backgroundColor: '#00E676',
    borderColor: '#00E676',
  },
  celdaHoy: {
    borderColor: '#00E676',
    backgroundColor: '#223026',
  },
  textoInicial: {
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 2,
  },
  textoInicialNormal: {
    color: '#B0B0B0',
  },
  textoInicialHoy: {
    color: '#00E676',
  },
  textoInicialSeleccionado: {
    color: '#121212',
  },
  textoDiaMes: {
    fontSize: 14,
    fontWeight: '700',
  },
  textoDiaMesNormal: {
    color: '#FFFFFF',
  },
  textoDiaMesSeleccionado: {
    color: '#121212',
    fontWeight: '800',
  },
  textoFechaCorta: {
    fontSize: 9,
    marginTop: 2,
    fontWeight: '600',
  },
  textoFechaCortaNormal: {
    color: '#8D8D8D',
  },
  textoFechaCortaSeleccionado: {
    color: '#1E3B2B',
  },
  contenedorIndicador: {
    height: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  puntoActividad: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#00E676',
  },
  puntoActividadSeleccionado: {
    backgroundColor: '#121212',
  },
  badgeHoy: {
    fontSize: 8,
    fontWeight: '800',
    color: '#00E676',
    letterSpacing: 0.3,
  },
  espaciadorPunto: {
    width: 6,
    height: 6,
  },
});
