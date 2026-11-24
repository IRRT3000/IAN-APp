/**
 * Render de "renderPaso1Identidad". ctx se rellena en el componente antes de renderizar.
 * Extraído sin cambios de OnboardingBienvenidaModal.jsx (Spec 022). No editar la lógica aquí sin revisar el componente.
 */
import Animated from 'react-native-reanimated';
import { BotonInteractivo, MESES_CORTOS, formatearFechaLegible } from './base';
import { Feather } from '@expo/vector-icons';
import { Keyboard, Pressable, Text, TextInput, View } from 'react-native';
import { SEXOS_PERFIL_VALIDOS } from '../../services/storage';
import { TOKENS } from '../../theme/tokens';
import { styles } from './estilos';
import { vibrarSeleccionBascula } from '../../services/haptics';

export const crearRenderPaso1Identidad = (ctx) => (...args) => {
  const { ajustarAnioNacimiento, ajustarDiaNacimiento, ajustarMesNacimiento, anioNac, bioBannerAnimStyle, bloque1AnimStyle, bloque2AnimStyle, bloque3AnimStyle, diaSeguro, edadBadgeAnimStyle, edadCalculada, errorValidacion, fechaNacimientoYYYYMMDD, focoNombre, mesNac, nombre, seleccionarSexo, setErrorValidacion, setFocoNombre, setNombre, sexo } = ctx;
  const renderPaso1Identidad = () => (
      <View style={styles.stepBlocksContainer}>
        {/* Bloque 1: Encabezado + Nombre */}
        <Animated.View style={[styles.stepBlock, bloque1AnimStyle]}>
          <Text style={styles.stepKicker}>PASO 01 · IDENTIDAD Y BIOLOGÍA</Text>
          <Text style={styles.stepTitle}>¿Quién entrena hoy?</Text>
          <Text style={styles.stepSubtitle}>
            Tu identidad, sexo biológico y edad exacta determinan tu tasa metabólica basal.
          </Text>
  
          <View style={styles.inputSectionCard}>
            <View style={styles.inputHeaderRow}>
              <Text style={styles.fieldLabel}>NOMBRE O ALIAS (OPCIONAL)</Text>
              <Text style={styles.charCountText}>
                {`${String(nombre || '').replace(/[\r\n]+/g, ' ').trim().length}/40`}
              </Text>
            </View>
  
            <View
              style={[
                styles.textInputWrapper,
                focoNombre && styles.textInputWrapperFocused,
              ]}
            >
              <Feather
                name="user"
                size={16}
                color={
                  focoNombre ? TOKENS.colors.textPrimary : TOKENS.colors.textSecondary
                }
              />
              <TextInput
                value={nombre}
                onChangeText={(txt) => {
                  setNombre(String(txt || '').replace(/[\r\n]+/g, ' ').slice(0, 40));
                  if (errorValidacion) setErrorValidacion('');
                }}
                onFocus={() => setFocoNombre(true)}
                onBlur={() => setFocoNombre(false)}
                placeholder="Ej. Alex, Ian, Atleta..."
                placeholderTextColor={TOKENS.colors.textMuted}
                maxLength={40}
                returnKeyType="done"
                onSubmitEditing={() => Keyboard.dismiss()}
                style={styles.textInputField}
              />
              {nombre.length > 0 && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Limpiar nombre"
                  onPress={() => {
                    vibrarSeleccionBascula();
                    setNombre('');
                  }}
                  hitSlop={10}
                  style={styles.clearInputBtn}
                >
                  <Feather name="x-circle" size={16} color={TOKENS.colors.textSecondary} />
                </Pressable>
              )}
            </View>
          </View>
        </Animated.View>
  
        {/* Bloque 2: Selector de Sexo Biológico */}
        <Animated.View style={[styles.stepBlock, bloque2AnimStyle]}>
          <Text style={styles.fieldLabel}>SEXO BIOLÓGICO</Text>
          <View style={styles.sexCardsRow}>
            {SEXOS_PERFIL_VALIDOS.map((opcionSexo) => {
              const activo = sexo === opcionSexo;
              return (
                <View key={opcionSexo} style={styles.sexCardFlex}>
                  <BotonInteractivo
                    seleccionado={activo}
                    accessibilityLabel={`Seleccionar ${opcionSexo}`}
                    onPress={() => seleccionarSexo(opcionSexo)}
                    style={[styles.sexCard, activo && styles.sexCardActive]}
                  >
                    <View style={styles.sexCardTopRow}>
                      <View
                        style={[
                          styles.sexCardIconCircle,
                          activo && styles.sexCardIconCircleActive,
                        ]}
                      >
                        <Feather
                          name={opcionSexo === 'Hombre' ? 'shield' : 'award'}
                          size={16}
                          color={
                            activo
                              ? TOKENS.colors.textPrimary
                              : TOKENS.colors.textSecondary
                          }
                        />
                      </View>
                      {activo && (
                        <Feather
                          name="check-circle"
                          size={16}
                          color={TOKENS.colors.textInverse}
                        />
                      )}
                    </View>
                    <Text style={[styles.sexCardTitle, activo && styles.sexCardTitleActive]}>
                      {opcionSexo}
                    </Text>
                    <Text style={[styles.sexCardMeta, activo && styles.sexCardMetaActive]}>
                      {opcionSexo === 'Hombre'
                        ? 'Coeficiente basal masculino'
                        : 'Coeficiente basal femenino'}
                    </Text>
                  </BotonInteractivo>
                </View>
              );
            })}
          </View>
  
          <Animated.View style={[styles.bioCalibrationBanner, bioBannerAnimStyle]}>
            <Feather name="sliders" size={14} color={TOKENS.colors.textPrimary} />
            <View style={styles.bioCalibrationTextCol}>
              <Text style={styles.bioCalibrationTag}>
                BIOLOGÍA CALIBRADA · PARÁMETROS METABÓLICOS ACTIVOS
              </Text>
              <Text style={styles.bioCalibrationDesc}>
                {sexo === 'Hombre'
                  ? 'Ajuste hormonal y de masa magra de referencia para estimación calórica masculina.'
                  : 'Ajuste metabólico y de distribución corporal de referencia para estimación femenina.'}
              </Text>
            </View>
          </Animated.View>
        </Animated.View>
  
        {/* Bloque 3: Fecha de Nacimiento y Panel de Edad Viva */}
        <Animated.View style={[styles.stepBlock, bloque3AnimStyle]}>
          <View style={styles.sectionHeaderSpread}>
            <Text style={styles.fieldLabel}>FECHA DE NACIMIENTO</Text>
            <Text style={styles.fieldSubtleHint}>
              {formatearFechaLegible(fechaNacimientoYYYYMMDD)}
            </Text>
          </View>
  
          <View style={styles.dateSpinnersGrid}>
            {/* Columna Día */}
            <View style={styles.dateSpinnerColumn}>
              <Text style={styles.spinnerColLabel}>DÍA</Text>
              <BotonInteractivo
                accessibilityLabel="Aumentar día"
                onPress={() => ajustarDiaNacimiento(1)}
                scaleDown={0.93}
                style={styles.spinnerTouchBtn}
              >
                <Feather name="plus" size={18} color={TOKENS.colors.textPrimary} />
              </BotonInteractivo>
              <View style={styles.spinnerValueBox}>
                <Text style={styles.spinnerValueText}>
                  {String(diaSeguro).padStart(2, '0')}
                </Text>
              </View>
              <BotonInteractivo
                accessibilityLabel="Disminuir día"
                onPress={() => ajustarDiaNacimiento(-1)}
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
                accessibilityLabel="Aumentar mes"
                onPress={() => ajustarMesNacimiento(1)}
                scaleDown={0.93}
                style={styles.spinnerTouchBtn}
              >
                <Feather name="plus" size={18} color={TOKENS.colors.textPrimary} />
              </BotonInteractivo>
              <View style={styles.spinnerValueBox}>
                <Text style={styles.spinnerValueText}>
                  {MESES_CORTOS[mesNac - 1] || 'ENE'}
                </Text>
                <Text style={styles.spinnerSubNumber}>
                  {String(mesNac).padStart(2, '0')}
                </Text>
              </View>
              <BotonInteractivo
                accessibilityLabel="Disminuir mes"
                onPress={() => ajustarMesNacimiento(-1)}
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
                accessibilityLabel="Aumentar año"
                onPress={() => ajustarAnioNacimiento(1)}
                scaleDown={0.93}
                style={styles.spinnerTouchBtn}
              >
                <Feather name="plus" size={18} color={TOKENS.colors.textPrimary} />
              </BotonInteractivo>
              <View style={styles.spinnerValueBox}>
                <Text style={styles.spinnerValueText}>{String(anioNac)}</Text>
              </View>
              <BotonInteractivo
                accessibilityLabel="Disminuir año"
                onPress={() => ajustarAnioNacimiento(-1)}
                scaleDown={0.93}
                style={styles.spinnerTouchBtn}
              >
                <Feather name="minus" size={18} color={TOKENS.colors.textPrimary} />
              </BotonInteractivo>
            </View>
          </View>
  
          {/* Panel de Edad en Vivo */}
          <Animated.View style={[styles.liveAgePanel, edadBadgeAnimStyle]}>
            <View style={styles.liveAgeLeft}>
              <Text style={styles.liveAgeLabel}>EDAD BIOLÓGICA EN VIVO</Text>
              <Text style={styles.liveAgeSub}>
                Se actualiza automáticamente cada cumpleaños
              </Text>
            </View>
            <View style={styles.liveAgeBadge}>
              <Text style={styles.liveAgeValueText}>
                {`${edadCalculada !== null ? edadCalculada : '--'} AÑOS`}
              </Text>
            </View>
          </Animated.View>
        </Animated.View>
      </View>
    );
  return renderPaso1Identidad(...args);
};
