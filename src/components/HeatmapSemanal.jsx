import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  obtenerDiasConActividad,
  obtenerFechaLocal,
} from '../services/storage';

// Mapa de iniciales por índice de getDay() (0 = Domingo, 1 = Lunes, ..., 6 = Sábado)
const INICIALES_DIA_SEMANA = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];

/**
 * Genera de forma inmutable el arreglo de los últimos 7 días calendario (incluyendo hoy).
 * @returns {Array<{ fecha: string, inicial: string, diaMes: string, fechaCorta: string, esHoy: boolean }>}
 */
const calcularUltimosSieteDias = () => {
  const hoy = new Date();
  const fechaHoyStr = obtenerFechaLocal(hoy);

  return Array.from({ length: 7 }, (_, index) => {
    const desplazamiento = 6 - index;
    const fechaDia = new Date(
      hoy.getFullYear(),
      hoy.getMonth(),
      hoy.getDate() - desplazamiento
    );

    const fechaFormateada = obtenerFechaLocal(fechaDia);
    const diaMes = String(fechaDia.getDate()).padStart(2, '0');
    const mes = String(fechaDia.getMonth() + 1).padStart(2, '0');
    const inicial = INICIALES_DIA_SEMANA[fechaDia.getDay()];

    return {
      fecha: fechaFormateada,
      inicial,
      diaMes,
      fechaCorta: `${diaMes}/${mes}`,
      esHoy: fechaFormateada === fechaHoyStr,
    };
  });
};

export default function HeatmapSemanal({ diasConActividad, diasActivos }) {
  const [diasGuardadosInternos, setDiasGuardadosInternos] = useState([]);
  const diasSemana = calcularUltimosSieteDias();

  const listaExterna = Array.isArray(diasConActividad)
    ? diasConActividad
    : Array.isArray(diasActivos)
      ? diasActivos
      : null;

  useEffect(() => {
    let montado = true;

    const sincronizarActividad = async () => {
      try {
        const dias = await obtenerDiasConActividad();
        if (montado) {
          setDiasGuardadosInternos([...dias]);
        }
      } catch (error) {
        console.error('Error al sincronizar HeatmapSemanal:', error);
      }
    };

    if (!listaExterna) {
      sincronizarActividad();
    }

    return () => {
      montado = false;
    };
  }, [listaExterna]);

  const ConjuntoDiasActivos = new Set(listaExterna ?? diasGuardadosInternos);

  return (
    <View style={styles.contenedor}>
      <View style={styles.encabezado}>
        <Text style={styles.titulo}>Actividad de los últimos 7 días</Text>
        <View style={styles.leyenda}>
          <View style={[styles.puntoLeyenda, styles.celdaInactiva]} />
          <Text style={styles.textoLeyenda}>Sin registro</Text>
          <View style={[styles.puntoLeyenda, styles.celdaActiva]} />
          <Text style={styles.textoLeyenda}>Activo</Text>
        </View>
      </View>

      <View style={styles.filaDias}>
        {diasSemana.map((item) => {
          const tieneActividad = ConjuntoDiasActivos.has(item.fecha);

          return (
            <View
              key={item.fecha}
              style={[
                styles.celda,
                tieneActividad ? styles.celdaActiva : styles.celdaInactiva,
                item.esHoy && styles.celdaHoyBorde,
              ]}
            >
              <Text
                style={[
                  styles.textoInicial,
                  tieneActividad
                    ? styles.textoActivo
                    : styles.textoInactivo,
                ]}
              >
                {item.inicial}
              </Text>
              <Text
                style={[
                  styles.textoFechaDia,
                  tieneActividad
                    ? styles.textoActivo
                    : styles.textoInactivo,
                ]}
              >
                {item.diaMes}
              </Text>
              <Text
                style={[
                  styles.textoFechaCompleta,
                  tieneActividad
                    ? styles.textoSubtituloActivo
                    : styles.textoSubtituloInactivo,
                ]}
              >
                {item.fecha.slice(5)}
              </Text>
            </View>
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
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#2E2E2E',
  },
  encabezado: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  titulo: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  leyenda: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  puntoLeyenda: {
    width: 10,
    height: 10,
    borderRadius: 3,
    marginLeft: 8,
    marginRight: 4,
  },
  textoLeyenda: {
    color: '#9E9E9E',
    fontSize: 11,
  },
  filaDias: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  celda: {
    flex: 1,
    marginHorizontal: 3,
    paddingVertical: 10,
    paddingHorizontal: 2,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  celdaActiva: {
    backgroundColor: '#00E676',
  },
  celdaInactiva: {
    backgroundColor: '#2A2A2A',
  },
  celdaHoyBorde: {
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  textoInicial: {
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 2,
  },
  textoFechaDia: {
    fontSize: 15,
    fontWeight: '700',
  },
  textoFechaCompleta: {
    fontSize: 10,
    marginTop: 2,
  },
  textoActivo: {
    color: '#121212',
  },
  textoInactivo: {
    color: '#E0E0E0',
  },
  textoSubtituloActivo: {
    color: '#1B3B2B',
    fontWeight: '600',
  },
  textoSubtituloInactivo: {
    color: '#8D8D8D',
  },
});
