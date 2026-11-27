/**
 * Render de "renderPaso3Antiguedad". ctx se rellena en el componente antes de renderizar.
 * Extraído sin cambios de OnboardingBienvenidaModal.jsx (Spec 022). No editar la lógica aquí sin revisar el componente.
 */
import Animated from 'react-native-reanimated';
import { BotonInteractivo, MESES_CORTOS, formatearFechaLegible } from './base';
import { Feather } from '@expo/vector-icons';
import { TOKENS } from '../../theme/tokens';
import { View } from 'react-native';
import { Text } from '../base/Texto';
import { styles } from './estilos';

export const crearRenderPaso3Antiguedad = (ctx) => (...args) => {
  const { ajustarAnioInicio, ajustarDiaInicio, ajustarMesInicio, anioInicioSeguro, bloque1AnimStyle, bloque2AnimStyle, bloque3AnimStyle, diaInicioSeguro, esFechaInicioHoy, fechaInicioEntrenoEfectiva, mesInicioSeguro, nivelExperienciaIA, resumenTiempoEntreno, seleccionarEmpeceHoy, timelineAnimStyle } = ctx;
  const renderPaso3Antiguedad = () => (
      <View style={styles.stepBlocksContainer}>
        {/* Bloque 1: Encabezado + Botón Rápido "Empecé hoy (Usar fecha actual)" */}
        <Animated.View style={[styles.stepBlock, bloque1AnimStyle]}>
          <Text style={styles.stepKicker}>PASO 03 · TIEMPO ENTRENANDO</Text>
          <Text style={styles.stepTitle}>Experiencia bajo la barra</Text>
          <Text style={styles.stepSubtitle}>
            Selecciona el día, mes y año en que comenzaste a entrenar para que tu
            antigüedad avance día a día con exactitud.
          </Text>
  
          <BotonInteractivo
            accessibilityLabel="Empecé hoy (Usar fecha actual)"
            onPress={seleccionarEmpeceHoy}
            style={[
              styles.startedTodayButton,
              esFechaInicioHoy && styles.startedTodayButtonActive,
            ]}
          >
            <Feather
              name={esFechaInicioHoy ? 'check-circle' : 'calendar'}
              size={18}
              color={
                esFechaInicioHoy
                  ? TOKENS.colors.textInverse
                  : TOKENS.colors.textPrimary
              }
            />
            <Text
              style={[
                styles.startedTodayButtonText,
                esFechaInicioHoy && styles.startedTodayButtonTextActive,
              ]}
            >
              Empecé hoy (Usar fecha actual)
            </Text>
          </BotonInteractivo>
        </Animated.View>
  
        {/* Bloque 2: Selector Táctil de 3 Columnas (DÍA, MES, AÑO) */}
        <Animated.View style={[styles.stepBlock, bloque2AnimStyle]}>
          <View style={styles.sectionHeaderSpread}>
            <Text style={styles.fieldLabel}>FECHA DE INICIO</Text>
            <Text style={styles.fieldSubtleHint}>
              {formatearFechaLegible(fechaInicioEntrenoEfectiva)}
            </Text>
          </View>
  
          <View style={styles.dateSpinnersGrid}>
            {/* Columna Día */}
            <View style={styles.dateSpinnerColumn}>
              <Text style={styles.spinnerColLabel}>DÍA</Text>
              <BotonInteractivo
                accessibilityLabel="Aumentar día de inicio"
                onPress={() => ajustarDiaInicio(1)}
                scaleDown={0.93}
                style={styles.spinnerTouchBtn}
              >
                <Feather name="plus" size={18} color={TOKENS.colors.textPrimary} />
              </BotonInteractivo>
              <View style={styles.spinnerValueBox}>
                <Text style={styles.spinnerValueText}>
                  {String(diaInicioSeguro).padStart(2, '0')}
                </Text>
              </View>
              <BotonInteractivo
                accessibilityLabel="Disminuir día de inicio"
                onPress={() => ajustarDiaInicio(-1)}
                scaleDown={0.93}
                style={styles.spinnerTouchBtn}
              >
                <Feather name="minus" size={18} color={TOKENS.colors.textPrimary} />
              </BotonInteractivo>
            </View>
  
            {/* Columna Mes */}
            <View style={styles.dateSpinnerColumn}>
              <Text style={styles.spinnerColLabel}>MES</Text>
              <BotonInteractivo
                accessibilityLabel="Aumentar mes de inicio"
                onPress={() => ajustarMesInicio(1)}
                scaleDown={0.93}
                style={styles.spinnerTouchBtn}
              >
                <Feather name="plus" size={18} color={TOKENS.colors.textPrimary} />
              </BotonInteractivo>
              <View style={styles.spinnerValueBox}>
                <Text style={styles.spinnerValueText}>
                  {MESES_CORTOS[mesInicioSeguro - 1] || 'ENE'}
                </Text>
                <Text style={styles.spinnerSubNumber}>
                  {String(mesInicioSeguro).padStart(2, '0')}
                </Text>
              </View>
              <BotonInteractivo
                accessibilityLabel="Disminuir mes de inicio"
                onPress={() => ajustarMesInicio(-1)}
                scaleDown={0.93}
                style={styles.spinnerTouchBtn}
              >
                <Feather name="minus" size={18} color={TOKENS.colors.textPrimary} />
              </BotonInteractivo>
            </View>
  
            {/* Columna Año */}
            <View style={styles.dateSpinnerColumn}>
              <Text style={styles.spinnerColLabel}>AÑO</Text>
              <BotonInteractivo
                accessibilityLabel="Aumentar año de inicio"
                onPress={() => ajustarAnioInicio(1)}
                scaleDown={0.93}
                style={styles.spinnerTouchBtn}
              >
                <Feather name="plus" size={18} color={TOKENS.colors.textPrimary} />
              </BotonInteractivo>
              <View style={styles.spinnerValueBox}>
                <Text style={styles.spinnerValueText}>{String(anioInicioSeguro)}</Text>
              </View>
              <BotonInteractivo
                accessibilityLabel="Disminuir año de inicio"
                onPress={() => ajustarAnioInicio(-1)}
                scaleDown={0.93}
                style={styles.spinnerTouchBtn}
              >
                <Feather name="minus" size={18} color={TOKENS.colors.textPrimary} />
              </BotonInteractivo>
            </View>
          </View>
        </Animated.View>
  
        {/* Bloque 3: Tarjeta de Línea de Tiempo en Vivo Protagonista */}
        <Animated.View
          style={[styles.stepBlock, bloque3AnimStyle, timelineAnimStyle]}
        >
          <View style={styles.timelineLiveCard}>
            <View style={styles.timelineHeaderRow}>
              <Text style={styles.timelineKickerLabel}>TIEMPO ENTRENANDO EN VIVO</Text>
              <View style={styles.timelineBadgePill}>
                <Feather name="clock" size={12} color={TOKENS.colors.textInverse} />
                <Text style={styles.timelineBadgePillText}>
                  {`INICIO: ${formatearFechaLegible(fechaInicioEntrenoEfectiva)}`}
                </Text>
              </View>
            </View>
  
            <Text style={styles.timelineHeroDuration}>
              {resumenTiempoEntreno.texto}
            </Text>
  
            <View style={styles.timelineCalibrationDivider} />
  
            <Text style={styles.timelineLevelTitle}>{nivelExperienciaIA.nivel}</Text>
            <Text style={styles.timelineLevelDesc}>{nivelExperienciaIA.detalle}</Text>
          </View>
        </Animated.View>
      </View>
    );
  return renderPaso3Antiguedad(...args);
};
