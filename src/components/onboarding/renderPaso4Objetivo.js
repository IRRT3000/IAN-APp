/**
 * Render de "renderPaso4Objetivo". ctx se rellena en el componente antes de renderizar.
 * Extraído sin cambios de OnboardingBienvenidaModal.jsx (Spec 022). No editar la lógica aquí sin revisar el componente.
 */
import Animated from 'react-native-reanimated';
import { BotonInteractivo, CATALOGO_OBJETIVOS } from './base';
import { Feather } from '@expo/vector-icons';
import { TOKENS } from '../../theme/tokens';
import { View } from 'react-native';
import { Text } from '../base/Texto';
import { styles } from './estilos';

export const crearRenderPaso4Objetivo = (ctx) => (...args) => {
  const { bloque1AnimStyle, bloque2AnimStyle, bloque3AnimStyle, datosObjetivoActivo, objetivo, objetivoBannerAnimStyle, seleccionarObjetivo } = ctx;
  const renderPaso4Objetivo = () => (
      <View style={styles.stepBlocksContainer}>
        {/* Bloque 1: Encabezado */}
        <Animated.View style={[styles.stepBlock, bloque1AnimStyle]}>
          <Text style={styles.stepKicker}>PASO 04 · OBJETIVO FÍSICO PRINCIPAL</Text>
          <Text style={styles.stepTitle}>Dirección Estratégica</Text>
          <Text style={styles.stepSubtitle}>
            Selecciona tu meta actual. Puedes recalibrarla desde Estadísticas cuando
            cambies de etapa física.
          </Text>
        </Animated.View>
  
        {/* Bloque 2: 4 Tarjetas Editoriales Interactivas */}
        <Animated.View style={[styles.stepBlock, bloque2AnimStyle]}>
          <View style={styles.objectivesStack}>
            {CATALOGO_OBJETIVOS.map((item) => {
              const activo = objetivo === item.id;
              return (
                <BotonInteractivo
                  seleccionado={activo}
                  key={item.id}
                  accessibilityLabel={`Objetivo ${item.id}`}
                  onPress={() => seleccionarObjetivo(item.id)}
                  style={[styles.objectiveCard, activo && styles.objectiveCardActive]}
                >
                  <View style={styles.objectiveTopRow}>
                    <View style={styles.objectiveTitleGroup}>
                      <View
                        style={[
                          styles.objectiveIconBox,
                          activo && styles.objectiveIconBoxActive,
                        ]}
                      >
                        <Feather
                          name={item.icono}
                          size={16}
                          color={
                            activo
                              ? TOKENS.colors.textPrimary
                              : TOKENS.colors.textSecondary
                          }
                        />
                      </View>
                      <View>
                        <Text
                          style={[
                            styles.objectiveTagText,
                            activo && styles.objectiveTagTextActive,
                          ]}
                        >
                          {item.tag}
                        </Text>
                        <Text
                          style={[
                            styles.objectiveTitleText,
                            activo && styles.objectiveTitleTextActive,
                          ]}
                        >
                          {item.id}
                        </Text>
                      </View>
                    </View>
  
                    <View
                      style={[
                        styles.objectiveRadioOuter,
                        activo && styles.objectiveRadioOuterActive,
                      ]}
                    >
                      {activo && (
                        <Feather
                          name="check"
                          size={13}
                          color={TOKENS.colors.textPrimary}
                        />
                      )}
                    </View>
                  </View>
  
                  <Text
                    style={[
                      styles.objectiveSubText,
                      activo && styles.objectiveSubTextActive,
                    ]}
                  >
                    {item.subtitulo}
                  </Text>
                </BotonInteractivo>
              );
            })}
          </View>
        </Animated.View>
  
        {/* Bloque 3: Confirmación de Calibración Gemini IA */}
        <Animated.View
          style={[styles.stepBlock, bloque3AnimStyle, objetivoBannerAnimStyle]}
        >
          <View style={styles.geminiCalibrationBox}>
            <View style={styles.geminiCalibrationHeader}>
              <Feather name="cpu" size={14} color={TOKENS.colors.textPrimary} />
              <Text style={styles.geminiCalibrationTitle}>
                {`CALIBRACIÓN GEMINI IA ACTIVA · ${datosObjetivoActivo.id.toUpperCase()}`}
              </Text>
            </View>
            <Text style={styles.geminiCalibrationBody}>
              {datosObjetivoActivo.calibracionIA}
            </Text>
          </View>
        </Animated.View>
      </View>
    );
  return renderPaso4Objetivo(...args);
};
