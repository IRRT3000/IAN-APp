/**
 * Render de "renderPaso2Antropometria". ctx se rellena en el componente antes de renderizar.
 * Extraído sin cambios de OnboardingBienvenidaModal.jsx (Spec 022). No editar la lógica aquí sin revisar el componente.
 */
import Animated from 'react-native-reanimated';
import { BotonInteractivo } from './base';
import { View } from 'react-native';
import { Text } from '../base/Texto';
import { styles } from './estilos';

export const crearRenderPaso2Antropometria = (ctx) => (...args) => {
  const { ajustarEstatura, ajustarPesoInicial, bloque1AnimStyle, bloque2AnimStyle, bloque3AnimStyle, clasificacionImc, estaturaCm, imcCalculado, imcFillAnimStyle, metricaCardAnimStyle, pesoInicialKg } = ctx;
  const renderPaso2Antropometria = () => (
      <View style={styles.stepBlocksContainer}>
        {/* Bloque 1: Estatura */}
        <Animated.View style={[styles.stepBlock, bloque1AnimStyle]}>
          <Text style={styles.stepKicker}>PASO 02 · ANTROPOMETRÍA BASE</Text>
          <Text style={styles.stepTitle}>Estatura y Peso de Partida</Text>
          <Text style={styles.stepSubtitle}>
            Establece el punto cero de tu historial corporal para medir tu progreso real.
          </Text>
  
          <View style={styles.instrumentCard}>
            <View style={styles.instrumentTopRow}>
              <View>
                <Text style={styles.fieldLabel}>ESTATURA TOTAL</Text>
                <Text style={styles.instrumentRangeHint}>Rango: 120 – 230 cm</Text>
              </View>
              <View style={styles.instrumentReadoutRow}>
                <Text style={styles.instrumentBigValue}>{estaturaCm}</Text>
                <Text style={styles.instrumentUnitText}>CM</Text>
              </View>
            </View>
  
            <View style={styles.steppersRow}>
              {[
                { label: '-5', delta: -5 },
                { label: '-1', delta: -1 },
                { label: '+1', delta: 1 },
                { label: '+5', delta: 5 },
              ].map((btn) => (
                <View key={btn.label} style={styles.stepperBtnFlex}>
                  <BotonInteractivo
                    accessibilityLabel={`Ajustar estatura ${btn.label} cm`}
                    onPress={() => ajustarEstatura(btn.delta)}
                    scaleDown={0.94}
                    style={styles.stepperPillBtn}
                  >
                    <Text style={styles.stepperPillBtnText}>{btn.label}</Text>
                  </BotonInteractivo>
                </View>
              ))}
            </View>
          </View>
        </Animated.View>
  
        {/* Bloque 2: Peso Inicial */}
        <Animated.View style={[styles.stepBlock, bloque2AnimStyle]}>
          <View style={styles.instrumentCard}>
            <View style={styles.instrumentTopRow}>
              <View>
                <Text style={styles.fieldLabel}>PESO INICIAL BASE</Text>
                <Text style={styles.instrumentRangeHint}>Rango: 30.0 – 250.0 kg</Text>
              </View>
              <View style={styles.instrumentReadoutRow}>
                <Text style={styles.instrumentBigValue}>
                  {pesoInicialKg.toFixed(1)}
                </Text>
                <Text style={styles.instrumentUnitText}>KG</Text>
              </View>
            </View>
  
            <View style={styles.steppersRow}>
              {[
                { label: '-1.0', delta: -1.0 },
                { label: '-0.5', delta: -0.5 },
                { label: '-0.1', delta: -0.1 },
                { label: '+0.1', delta: 0.1 },
                { label: '+0.5', delta: 0.5 },
                { label: '+1.0', delta: 1.0 },
              ].map((btn) => (
                <View key={btn.label} style={styles.stepperBtnFlex}>
                  <BotonInteractivo
                    accessibilityLabel={`Ajustar peso ${btn.label} kg`}
                    onPress={() => ajustarPesoInicial(btn.delta)}
                    scaleDown={0.94}
                    style={styles.stepperPillBtnCompact}
                  >
                    <Text style={styles.stepperPillBtnTextCompact}>{btn.label}</Text>
                  </BotonInteractivo>
                </View>
              ))}
            </View>
          </View>
        </Animated.View>
  
        {/* Bloque 3: Panel Antropométrico Vivo */}
        <Animated.View
          style={[styles.stepBlock, bloque3AnimStyle, metricaCardAnimStyle]}
        >
          <View style={styles.anthropometryLiveCard}>
            <View style={styles.anthroMetricsRow}>
              <View style={styles.anthroMetricCol}>
                <Text style={styles.anthroMetricLabel}>ESTATURA</Text>
                <Text style={styles.anthroMetricVal}>{`${estaturaCm} cm`}</Text>
              </View>
              <View style={styles.anthroDivider} />
              <View style={styles.anthroMetricCol}>
                <Text style={styles.anthroMetricLabel}>PESO BASE</Text>
                <Text style={styles.anthroMetricVal}>
                  {`${pesoInicialKg.toFixed(1)} kg`}
                </Text>
              </View>
              <View style={styles.anthroDivider} />
              <View style={styles.anthroMetricCol}>
                <Text style={styles.anthroMetricLabel}>IMC REF.</Text>
                <Text style={styles.anthroMetricVal}>{imcCalculado.toFixed(1)}</Text>
              </View>
            </View>
  
            <View style={styles.imcBarTrack}>
              <Animated.View style={[styles.imcBarFill, imcFillAnimStyle]} />
            </View>
  
            <View style={styles.imcFooterRow}>
              <Text style={styles.imcClassificationText}>{clasificacionImc}</Text>
              <Text style={styles.imcNoteText}>CALIBRACIÓN IA</Text>
            </View>
          </View>
        </Animated.View>
      </View>
    );
  return renderPaso2Antropometria(...args);
};
