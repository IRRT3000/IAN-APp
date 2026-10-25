import React, { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import DaySummaryModal from './heatmap/DaySummaryModal';
import MonthBlock from './heatmap/MonthBlock';
import { NOMBRES_MESES } from '../utils/dateUtilsLocal';

/**
 * Pantalla principal de Inicio / Bienvenida (Spec 004, Spec 005).
 * Muestra el resumen del día, accesos directos, el widget interactivo del mes actual
 * y un acceso directo a la nueva 5ª pestaña "Heatmap".
 */
export default function MenuBienvenida({
  fechaHoy,
  totalEjerciciosHoy = 0,
  totalDiasActivos = 0,
  caloriasHoy = 0,
  ultimoEjercicioHoy = null,
  resumenAnual = {},
  onAlternarDescanso,
  onIrAFitnessTracker,
  onIrANutricion,
  onIrACambioFisico,
  onIrAHeatmap,
}) {
  const metaCumplidaHoy = totalEjerciciosHoy > 0;
  const mesActualIndex = new Date().getMonth();
  const anioActual = new Date().getFullYear();

  const [fechaSeleccionada, setFechaSeleccionada] = useState(null);

  const handleSelectDay = (fechaStr) => {
    setFechaSeleccionada(fechaStr);
  };

  const handleCloseModal = () => {
    setFechaSeleccionada(null);
  };

  return (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
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

      {/* Widget Interactivo del Mes Actual (Spec 005) */}
      <View style={styles.contenedorMesActual}>
        <View style={styles.encabezadoMesActual}>
          <View>
            <Text style={styles.etiquetaMesActual}>CONSISTENCIA MENSUAL</Text>
            <Text style={styles.tituloMesActual}>
              {NOMBRES_MESES[mesActualIndex]} {anioActual}
            </Text>
          </View>
          {typeof onIrAHeatmap === 'function' ? (
            <TouchableOpacity
              style={styles.botonVerAnualLink}
              activeOpacity={0.7}
              onPress={onIrAHeatmap}
            >
              <Text style={styles.textoVerAnualLink}>Año completo →</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        <MonthBlock
          year={anioActual}
          monthIndex={mesActualIndex}
          resumenAnual={resumenAnual}
          fechaHoy={fechaHoy}
          onSelectDay={handleSelectDay}
          anchoCompleto={true}
          tamanoGrande={true}
          mostrarTitulo={false}
        />

        {typeof onIrAHeatmap === 'function' ? (
          <TouchableOpacity
            style={styles.botonExplorarHeatmap}
            activeOpacity={0.85}
            onPress={onIrAHeatmap}
          >
            <Text style={styles.textoBotonExplorarHeatmap}>
              🔥 Abrir Heatmap Anual Completo (12 Meses) →
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Modal Interactivo de Desglose del Día al Tocar una Celda */}
      {fechaSeleccionada ? (
        <DaySummaryModal
          visible={Boolean(fechaSeleccionada)}
          fechaStr={fechaSeleccionada}
          resumen={resumenAnual[fechaSeleccionada] || null}
          fechaHoy={fechaHoy}
          onClose={handleCloseModal}
          onAlternarDescanso={onAlternarDescanso}
          onIrAEntrenos={onIrAFitnessTracker}
          onIrANutricion={onIrANutricion}
        />
      ) : null}

      <View style={styles.guiaInferior}>
        <Text style={styles.textoGuiaInferior}>
          Usa la barra inferior para alternar entre Inicio, Entrenos, Nutrición,
          Físico y Heatmap
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: 12,
    paddingBottom: 24,
  },
  bloqueSuperior: {
    marginTop: 8,
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
    marginBottom: 16,
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
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  subtituloBienvenida: {
    color: '#9E9E9E',
    fontSize: 14,
    lineHeight: 20,
  },
  filaMetricas: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 16,
  },
  tarjetaMetrica: {
    flex: 1,
    backgroundColor: '#1A1A1A',
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 8,
    marginHorizontal: 3,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  valorMetrica: {
    color: '#FFFFFF',
    fontSize: 22,
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
    padding: 16,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    marginBottom: 16,
  },
  etiquetaResumen: {
    color: '#757575',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  detalleUltimo: {
    marginBottom: 14,
  },
  tituloUltimo: {
    color: '#FFFFFF',
    fontSize: 15,
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
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 14,
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
  contenedorMesActual: {
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    marginBottom: 16,
  },
  encabezadoMesActual: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  etiquetaMesActual: {
    color: '#757575',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  tituloMesActual: {
    color: '#00E676',
    fontSize: 18,
    fontWeight: '800',
  },
  botonVerAnualLink: {
    backgroundColor: '#242424',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333333',
  },
  textoVerAnualLink: {
    color: '#00E676',
    fontSize: 11,
    fontWeight: '700',
  },
  botonExplorarHeatmap: {
    backgroundColor: '#222222',
    borderWidth: 1,
    borderColor: '#00E676',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginTop: 14,
    alignItems: 'center',
  },
  textoBotonExplorarHeatmap: {
    color: '#00E676',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  guiaInferior: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  textoGuiaInferior: {
    color: '#6E6E6E',
    fontSize: 12,
    textAlign: 'center',
  },
});
