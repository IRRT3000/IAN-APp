import React, { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { vibrarInicioPresionBorrado } from '../services/haptics';
import DaySummaryModal from './heatmap/DaySummaryModal';
import MonthBlock from './heatmap/MonthBlock';
import {
  NOMBRES_MESES,
  formatearFechaLegible,
} from '../utils/dateUtilsLocal';
import { TOKENS } from '../theme/tokens';

/**
 * Pantalla principal de Inicio / Bienvenida (Spec 006: Rediseño Monocromo Matte Luxury).
 * Editorial Dashboard con tipografía de alta jerarquía, KPIs en caja unificada con
 * divisores hairline de 1px, acciones rápidas con iconos Feather (cero emojis) y
 * widget interactivo del mes actual con scroll clearance inferior de 110dp.
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
  onAbrirConfiguracion,
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

  const escalaConfig = useSharedValue(1);
  const rotacionConfig = useSharedValue(0);

  const handlePressInConfig = () => {
    escalaConfig.value = withSpring(0.9, { damping: 15, stiffness: 220 });
    rotacionConfig.value = withSpring(18, { damping: 15, stiffness: 220 });
    vibrarInicioPresionBorrado();
  };

  const handlePressOutConfig = () => {
    escalaConfig.value = withSpring(1, { damping: 15, stiffness: 200 });
    rotacionConfig.value = withSpring(0, { damping: 15, stiffness: 200 });
  };

  const estiloAnimadoConfig = useAnimatedStyle(() => ({
    transform: [
      { scale: escalaConfig.value },
      { rotate: `${rotacionConfig.value}deg` },
    ],
  }));

  const fechaFormateadaEditorial = formatearFechaLegible(fechaHoy).toUpperCase();

  return (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* 1. Encabezado Editorial Monocromo */}
      <View style={styles.bloqueSuperior}>
        <View style={styles.filaInsigniaFecha}>
          <Text style={styles.etiquetaFecha}>{fechaFormateadaEditorial}</Text>
          <View style={styles.accionesDerechaSuperior}>
            <View style={styles.insigniaEstado}>
              <View
                style={[
                  styles.puntoEstado,
                  metaCumplidaHoy ? styles.puntoActivo : styles.puntoInactivo,
                ]}
              />
              <Text style={styles.textoInsignia}>
                {metaCumplidaHoy ? 'ACTIVO' : 'EN ESPERA'}
              </Text>
            </View>

            <Animated.View style={estiloAnimadoConfig}>
              <TouchableOpacity
                style={styles.botonConfiguracion}
                activeOpacity={0.8}
                onPressIn={handlePressInConfig}
                onPressOut={handlePressOutConfig}
                onPress={onAbrirConfiguracion}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityLabel="Abrir configuración"
              >
                <Feather
                  name="settings"
                  size={16}
                  color={TOKENS.colors.textPrimary}
                />
              </TouchableOpacity>
            </Animated.View>
          </View>
        </View>
        <Text style={styles.tituloHero}>Fitness Tracker</Text>
        <Text style={styles.subtituloEditorial}>
          Entrenamiento de fuerza, nutrición IA y análisis físico de alta precisión.
        </Text>
      </View>

      {/* 2. Caja de 3 KPIs con Divisores Hairline de 1px */}
      <View style={styles.contenedorKpis}>
        <View style={styles.celdaKpi}>
          <Text style={styles.valorKpi}>{totalEjerciciosHoy}</Text>
          <Text style={styles.etiquetaKpi}>Ejercicios</Text>
        </View>

        <View style={styles.divisorVertical} />

        <View style={styles.celdaKpi}>
          <Text style={styles.valorKpi}>{totalDiasActivos}</Text>
          <Text style={styles.etiquetaKpi}>Días Activos</Text>
        </View>

        <View style={styles.divisorVertical} />

        <View style={styles.celdaKpi}>
          <Text style={styles.valorKpi}>{caloriasHoy}</Text>
          <Text style={styles.etiquetaKpi}>Kcal Hoy</Text>
        </View>
      </View>

      {/* 3. Acciones Rápidas y Último Ejercicio */}
      <View style={styles.tarjetaAccesoRapido}>
        <View style={styles.encabezadoSeccion}>
          <Text style={styles.etiquetaCategoria}>ACCESO RÁPIDO</Text>
          {ultimoEjercicioHoy ? (
            <View style={styles.badgeUltimo}>
              <Feather name="check" size={10} color="#FFFFFF" style={{ marginRight: 4 }} />
              <Text style={styles.textoBadgeUltimo}>ÚLTIMO REGISTRO</Text>
            </View>
          ) : null}
        </View>

        {ultimoEjercicioHoy ? (
          <View style={styles.cajaUltimoEjercicio}>
            <View style={styles.iconoUltimoContenedor}>
              <Feather name="activity" size={16} color="#FFFFFF" />
            </View>
            <View style={styles.detallesUltimoEjercicio}>
              <Text style={styles.nombreUltimoEjercicio} numberOfLines={1}>
                {ultimoEjercicioHoy.ejercicio}
              </Text>
              <Text style={styles.subtextoUltimoEjercicio}>
                {ultimoEjercicioHoy.series} series · {ultimoEjercicioHoy.repeticiones} reps ·{' '}
                {ultimoEjercicioHoy.peso} kg
              </Text>
            </View>
          </View>
        ) : (
          <Text style={styles.textoSinRegistro}>
            Comienza tu jornada registrando series de fuerza, analizando comidas o
            capturando tu progreso corporal.
          </Text>
        )}

        <View style={styles.filaBotonesAcceso}>
          <TouchableOpacity
            style={[styles.botonAcceso, styles.botonAccesoDestacado]}
            activeOpacity={0.8}
            onPress={onIrAFitnessTracker}
          >
            <Feather name="activity" size={15} color="#0A0A0A" style={styles.iconoBoton} />
            <Text style={styles.textoBotonDestacado}>Entrenos</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.botonAcceso}
            activeOpacity={0.8}
            onPress={onIrANutricion}
          >
            <Feather name="pie-chart" size={15} color="#FFFFFF" style={styles.iconoBoton} />
            <Text style={styles.textoBotonNormal}>Nutrición</Text>
          </TouchableOpacity>

          {typeof onIrACambioFisico === 'function' ? (
            <TouchableOpacity
              style={styles.botonAcceso}
              activeOpacity={0.8}
              onPress={onIrACambioFisico}
            >
              <Feather name="camera" size={15} color="#FFFFFF" style={styles.iconoBoton} />
              <Text style={styles.textoBotonNormal}>Físico</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* 4. Widget Interactivo de Consistencia Mensual */}
      <View style={styles.contenedorMesActual}>
        <View style={styles.encabezadoMesActual}>
          <View>
            <Text style={styles.etiquetaCategoria}>CONSISTENCIA MENSUAL</Text>
            <Text style={styles.tituloMesActual}>
              {NOMBRES_MESES[mesActualIndex]} {anioActual}
            </Text>
          </View>

          {typeof onIrAHeatmap === 'function' ? (
            <TouchableOpacity
              style={styles.botonEnlaceAnual}
              activeOpacity={0.7}
              onPress={onIrAHeatmap}
            >
              <Text style={styles.textoEnlaceAnual}>Ver Año</Text>
              <Feather name="arrow-right" size={12} color="#FFFFFF" style={{ marginLeft: 4 }} />
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
            style={styles.botonAbrirHeatmapCompleto}
            activeOpacity={0.85}
            onPress={onIrAHeatmap}
          >
            <Feather name="calendar" size={15} color="#FFFFFF" style={{ marginRight: 8 }} />
            <Text style={styles.textoBotonHeatmapCompleto}>
              Ver Heatmap Anual Completo
            </Text>
            <Feather name="chevron-right" size={16} color="#8E8E93" style={{ marginLeft: 'auto' }} />
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: 12,
    paddingBottom: 110, // Scroll clearance para barra inferior flotante (RF-3)
  },
  bloqueSuperior: {
    marginTop: 4,
    marginBottom: TOKENS.spacing.md,
  },
  accionesDerechaSuperior: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  botonConfiguracion: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: TOKENS.colors.surface,
    borderWidth: 1,
    borderColor: TOKENS.colors.borderDefault,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filaInsigniaFecha: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  etiquetaFecha: {
    fontSize: TOKENS.typography.labelCategory.fontSize,
    fontWeight: TOKENS.typography.labelCategory.fontWeight,
    letterSpacing: TOKENS.typography.labelCategory.letterSpacing,
    color: TOKENS.colors.textSecondary,
    textTransform: 'uppercase',
  },
  insigniaEstado: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: TOKENS.colors.surface,
    borderWidth: 1,
    borderColor: TOKENS.colors.borderDefault,
    borderRadius: TOKENS.radii.pill,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  puntoEstado: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  puntoActivo: {
    backgroundColor: '#FFFFFF',
  },
  puntoInactivo: {
    backgroundColor: TOKENS.colors.textMuted,
  },
  textoInsignia: {
    color: TOKENS.colors.textSecondary,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  tituloHero: {
    fontSize: TOKENS.typography.hero.fontSize,
    fontWeight: TOKENS.typography.hero.fontWeight,
    letterSpacing: TOKENS.typography.hero.letterSpacing,
    color: TOKENS.colors.textPrimary,
    marginBottom: 6,
  },
  subtituloEditorial: {
    fontSize: TOKENS.typography.subtitle.fontSize,
    fontWeight: TOKENS.typography.subtitle.fontWeight,
    color: TOKENS.colors.textSecondary,
    lineHeight: 18,
  },
  contenedorKpis: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: TOKENS.colors.surface,
    borderRadius: TOKENS.radii.md,
    borderWidth: 1,
    borderColor: TOKENS.colors.borderDefault,
    paddingVertical: 14,
    marginBottom: TOKENS.spacing.md,
  },
  celdaKpi: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  divisorVertical: {
    width: 1,
    height: 28,
    backgroundColor: TOKENS.colors.borderDefault,
  },
  valorKpi: {
    fontSize: TOKENS.typography.metricValue.fontSize,
    fontWeight: TOKENS.typography.metricValue.fontWeight,
    letterSpacing: TOKENS.typography.metricValue.letterSpacing,
    color: TOKENS.colors.textPrimary,
    marginBottom: 3,
  },
  etiquetaKpi: {
    fontSize: TOKENS.typography.metricLabel.fontSize,
    fontWeight: TOKENS.typography.metricLabel.fontWeight,
    letterSpacing: TOKENS.typography.metricLabel.letterSpacing,
    color: TOKENS.colors.textSecondary,
    textTransform: 'uppercase',
  },
  tarjetaAccesoRapido: {
    backgroundColor: TOKENS.colors.surface,
    borderRadius: TOKENS.radii.lg,
    padding: TOKENS.spacing.md,
    borderWidth: 1,
    borderColor: TOKENS.colors.borderDefault,
    marginBottom: TOKENS.spacing.md,
  },
  encabezadoSeccion: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  etiquetaCategoria: {
    fontSize: TOKENS.typography.labelCategory.fontSize,
    fontWeight: TOKENS.typography.labelCategory.fontWeight,
    letterSpacing: TOKENS.typography.labelCategory.letterSpacing,
    color: TOKENS.colors.textSecondary,
    textTransform: 'uppercase',
  },
  badgeUltimo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: TOKENS.colors.surfaceElevated,
    borderRadius: TOKENS.radii.xs,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: TOKENS.colors.borderDefault,
  },
  textoBadgeUltimo: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.6,
    color: TOKENS.colors.textPrimary,
  },
  cajaUltimoEjercicio: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: TOKENS.colors.surfaceElevated,
    borderRadius: TOKENS.radii.md,
    padding: 12,
    borderWidth: 1,
    borderColor: TOKENS.colors.borderDefault,
    marginBottom: 12,
  },
  iconoUltimoContenedor: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: '#2A2A2A',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  detallesUltimoEjercicio: {
    flex: 1,
  },
  nombreUltimoEjercicio: {
    fontSize: 14,
    fontWeight: '700',
    color: TOKENS.colors.textPrimary,
    marginBottom: 2,
  },
  subtextoUltimoEjercicio: {
    fontSize: 12,
    fontWeight: '500',
    color: TOKENS.colors.textSecondary,
  },
  textoSinRegistro: {
    fontSize: 13,
    color: TOKENS.colors.textSecondary,
    lineHeight: 18,
    marginBottom: 12,
  },
  filaBotonesAcceso: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  botonAcceso: {
    flex: 1,
    flexDirection: 'row',
    height: 44,
    backgroundColor: TOKENS.colors.surfaceElevated,
    borderRadius: TOKENS.radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: TOKENS.colors.borderDefault,
    paddingHorizontal: 6,
  },
  botonAccesoDestacado: {
    backgroundColor: '#FFFFFF',
    borderColor: '#FFFFFF',
  },
  iconoBoton: {
    marginRight: 6,
  },
  textoBotonDestacado: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0A0A0A',
    letterSpacing: 0.2,
  },
  textoBotonNormal: {
    fontSize: 12,
    fontWeight: '700',
    color: TOKENS.colors.textPrimary,
    letterSpacing: 0.2,
  },
  contenedorMesActual: {
    backgroundColor: TOKENS.colors.surface,
    borderRadius: TOKENS.radii.lg,
    padding: TOKENS.spacing.md,
    borderWidth: 1,
    borderColor: TOKENS.colors.borderDefault,
    marginBottom: TOKENS.spacing.md,
  },
  encabezadoMesActual: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  tituloMesActual: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.3,
    color: TOKENS.colors.textPrimary,
    marginTop: 2,
  },
  botonEnlaceAnual: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: TOKENS.colors.surfaceElevated,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: TOKENS.radii.pill,
    borderWidth: 1,
    borderColor: TOKENS.colors.borderDefault,
  },
  textoEnlaceAnual: {
    fontSize: 11,
    fontWeight: '700',
    color: TOKENS.colors.textPrimary,
  },
  botonAbrirHeatmapCompleto: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 46,
    backgroundColor: TOKENS.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: TOKENS.colors.borderDefault,
    borderRadius: TOKENS.radii.md,
    paddingHorizontal: 14,
    marginTop: 14,
  },
  textoBotonHeatmapCompleto: {
    color: TOKENS.colors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
