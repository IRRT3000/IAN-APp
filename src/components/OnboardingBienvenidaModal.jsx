import Animated from 'react-native-reanimated';
import { BotonInteractivo } from './onboarding/base';
import { Feather } from '@expo/vector-icons';
import { Keyboard, KeyboardAvoidingView, Modal, Platform, ScrollView, View } from 'react-native';
import { Text } from './base/Texto';
import { TOKENS } from '../theme/tokens';
import { styles } from './onboarding/estilos';
import { useEstadoOnboarding } from './onboarding/useEstadoOnboarding';
import { useDerivadosOnboarding } from './onboarding/useDerivadosOnboarding';
import { useAccionesOnboarding } from './onboarding/useAccionesOnboarding';
import { useEstilosAnimadosOnboarding } from './onboarding/useEstilosAnimadosOnboarding';
import { crearRenderEscenaHero } from './onboarding/renderEscenaHero';
import { crearRenderCabeceraWizard } from './onboarding/renderCabeceraWizard';
import { crearRenderPaso1Identidad } from './onboarding/renderPaso1Identidad';
import { crearRenderPaso2Antropometria } from './onboarding/renderPaso2Antropometria';
import { crearRenderPaso3Antiguedad } from './onboarding/renderPaso3Antiguedad';
import { crearRenderPaso4Objetivo } from './onboarding/renderPaso4Objetivo';
import { crearRenderEscenaCelebracion } from './onboarding/renderEscenaCelebracion';

// Se re-exportan para no romper ningún import existente.
export { SPRING_SCENE, SPRING_SNAPPY, SPRING_ELASTIC, SPRING_PRESS, EASE_OUT_STRONG } from './onboarding/base';

export default function OnboardingBienvenidaModal({
  visible = false,
  modoEdicion = false,
  perfilInicial = null,
  onPerfilActualizado,
  onCompletado,
  onCerrar,
}) {
  const { insets, anioActual, minAnioPermitido, maxAnioPermitido, escena, nombre, setNombre, focoNombre, setFocoNombre, sexo, setSexo, anioNac, setAnioNac, mesNac, setMesNac, diaNac, setDiaNac, estaturaCm, setEstaturaCm, pesoInicialKg, setPesoInicialKg, anioInicio, setAnioInicio, mesInicio, setMesInicio, diaInicio, setDiaInicio, objetivo, setObjetivo, errorValidacion, setErrorValidacion, guardando, setGuardando, perfilConsolidado, setPerfilConsolidado, guardandoRef, heroRingPulse, heroBadgeSV, heroTitleSV, heroPilar1SV, heroPilar2SV, heroPilar3SV, heroCtaSV, sceneTranslateX, sceneScale, sceneOpacity, bloque1SV, bloque2SV, bloque3SV, prog1SV, prog2SV, prog3SV, prog4SV, edadPulseSV, bioBannerSV, imcProgressSV, metricaPulseSV, timelinePulseSV, objetivoBannerSV, celebCheckScale, celebRingScale, celebHeaderSV, celebFlashBorder, pasaporteItem1, pasaporteItem2, pasaporteItem3, pasaporteItem4, pasaporteItem5, pasaporteItem6, celebCtaSV, transicionarAEscena } = useEstadoOnboarding({ modoEdicion, perfilInicial, visible });
  const { diaSeguro, fechaNacimientoYYYYMMDD, edadCalculada, imcCalculado, clasificacionImc, minAnioInicioPermitido, maxAnioInicioPermitido, obtenerMaxMesInicio, obtenerMaxDiaInicio, anioInicioSeguro, mesInicioSeguro, diaInicioSeguro, fechaInicioEntrenoEfectiva, esFechaInicioHoy, resumenTiempoEntreno, nivelExperienciaIA, datosObjetivoActivo } = useDerivadosOnboarding({ anioActual, anioInicio, anioNac, diaInicio, diaNac, edadPulseSV, escena, estaturaCm, imcProgressSV, mesInicio, mesNac, metricaPulseSV, objetivo, pesoInicialKg });
  const { seleccionarSexo, ajustarDiaNacimiento, ajustarMesNacimiento, ajustarAnioNacimiento, ajustarEstatura, ajustarPesoInicial, seleccionarEmpeceHoy, ajustarDiaInicio, ajustarMesInicio, ajustarAnioInicio, seleccionarObjetivo, handleAvanzarPaso, handleRetrocederPaso, handleFinalizarCelebracion } = useAccionesOnboarding({ anioInicioSeguro, anioNac, bioBannerSV, edadCalculada, escena, estaturaCm, fechaInicioEntrenoEfectiva, fechaNacimientoYYYYMMDD, guardandoRef, maxAnioInicioPermitido, maxAnioPermitido, mesInicioSeguro, mesNac, minAnioInicioPermitido, minAnioPermitido, modoEdicion, nombre, objetivo, objetivoBannerSV, obtenerMaxDiaInicio, obtenerMaxMesInicio, onCerrar, onCompletado, onPerfilActualizado, perfilConsolidado, pesoInicialKg, setAnioInicio, setAnioNac, setDiaInicio, setDiaNac, setErrorValidacion, setEstaturaCm, setGuardando, setMesInicio, setMesNac, setObjetivo, setPerfilConsolidado, setPesoInicialKg, setSexo, sexo, timelinePulseSV, transicionarAEscena });
  const { heroRingOuterStyle, heroRingMidStyle, heroBadgeAnimStyle, heroTitleAnimStyle, heroPilar1AnimStyle, heroPilar2AnimStyle, heroPilar3AnimStyle, heroCtaAnimStyle, sceneContainerAnimStyle, bloque1AnimStyle, bloque2AnimStyle, bloque3AnimStyle, seg1Style, seg2Style, seg3Style, seg4Style, edadBadgeAnimStyle, bioBannerAnimStyle, imcFillAnimStyle, metricaCardAnimStyle, timelineAnimStyle, objetivoBannerAnimStyle, celebRingAnimStyle, celebCheckAnimStyle, celebHeaderAnimStyle, pasaporteCardBorderStyle, pItem1Style, pItem2Style, pItem3Style, pItem4Style, pItem5Style, pItem6Style, celebCtaAnimStyle } = useEstilosAnimadosOnboarding({ bioBannerSV, bloque1SV, bloque2SV, bloque3SV, celebCheckScale, celebCtaSV, celebFlashBorder, celebHeaderSV, celebRingScale, edadPulseSV, heroBadgeSV, heroCtaSV, heroPilar1SV, heroPilar2SV, heroPilar3SV, heroRingPulse, heroTitleSV, imcProgressSV, metricaPulseSV, objetivoBannerSV, pasaporteItem1, pasaporteItem2, pasaporteItem3, pasaporteItem4, pasaporteItem5, pasaporteItem6, prog1SV, prog2SV, prog3SV, prog4SV, sceneOpacity, sceneScale, sceneTranslateX, timelinePulseSV });

  // Las funciones de render leen sus variables de este contexto al ejecutarse (Spec 022).
  const ctxRender = {};
  const renderEscenaHero = crearRenderEscenaHero(ctxRender);
  const renderCabeceraWizard = crearRenderCabeceraWizard(ctxRender);
  const renderPaso1Identidad = crearRenderPaso1Identidad(ctxRender);
  const renderPaso2Antropometria = crearRenderPaso2Antropometria(ctxRender);
  const renderPaso3Antiguedad = crearRenderPaso3Antiguedad(ctxRender);
  const renderPaso4Objetivo = crearRenderPaso4Objetivo(ctxRender);
  const renderEscenaCelebracion = crearRenderEscenaCelebracion(ctxRender);

  const etiquetaCtaWizard = () => {
    if (escena < 4) return 'Continuar';
    if (guardando) return 'Calibrando Perfil...';
    return modoEdicion ? 'Guardar Cambios' : 'Guardar y Calibrar IA';
  };

  Object.assign(ctxRender, { ajustarAnioInicio, ajustarAnioNacimiento, ajustarDiaInicio, ajustarDiaNacimiento, ajustarEstatura, ajustarMesInicio, ajustarMesNacimiento, ajustarPesoInicial, anioInicioSeguro, anioNac, bioBannerAnimStyle, bloque1AnimStyle, bloque2AnimStyle, bloque3AnimStyle, celebCheckAnimStyle, celebCtaAnimStyle, celebHeaderAnimStyle, celebRingAnimStyle, clasificacionImc, datosObjetivoActivo, diaInicioSeguro, diaSeguro, edadBadgeAnimStyle, edadCalculada, errorValidacion, esFechaInicioHoy, escena, estaturaCm, fechaInicioEntrenoEfectiva, fechaNacimientoYYYYMMDD, focoNombre, handleAvanzarPaso, handleFinalizarCelebracion, handleRetrocederPaso, heroBadgeAnimStyle, heroCtaAnimStyle, heroPilar1AnimStyle, heroPilar2AnimStyle, heroPilar3AnimStyle, heroRingMidStyle, heroRingOuterStyle, heroTitleAnimStyle, imcCalculado, imcFillAnimStyle, insets, mesInicioSeguro, mesNac, metricaCardAnimStyle, modoEdicion, nivelExperienciaIA, nombre, objetivo, objetivoBannerAnimStyle, onCerrar, pItem1Style, pItem2Style, pItem3Style, pItem4Style, pItem5Style, pItem6Style, pasaporteCardBorderStyle, perfilConsolidado, pesoInicialKg, resumenTiempoEntreno, seg1Style, seg2Style, seg3Style, seg4Style, seleccionarEmpeceHoy, seleccionarObjetivo, seleccionarSexo, setErrorValidacion, setFocoNombre, setNombre, sexo, timelineAnimStyle });

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={false}
      statusBarTranslucent
      onRequestClose={() => {
        if (escena === 5) {
          handleFinalizarCelebracion();
          return;
        }
        if (escena >= 2 && escena <= 4) {
          handleRetrocederPaso();
          return;
        }
        if (escena === 1) {
          handleRetrocederPaso();
          return;
        }
        if (modoEdicion && onCerrar) {
          Keyboard.dismiss();
          onCerrar();
        }
      }}
    >
      <View style={styles.modalCanvas}>
        {escena === 0 && renderEscenaHero()}

        {escena >= 1 && escena <= 4 && (
          <KeyboardAvoidingView
            style={styles.fullSceneContainer}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            {renderCabeceraWizard()}

            <ScrollView
              contentContainerStyle={styles.wizardScrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <Animated.View style={sceneContainerAnimStyle}>
                {escena === 1 && renderPaso1Identidad()}
                {escena === 2 && renderPaso2Antropometria()}
                {escena === 3 && renderPaso3Antiguedad()}
                {escena === 4 && renderPaso4Objetivo()}
              </Animated.View>
            </ScrollView>

            {/* Barra Inferior Fija Thumb-Zone (54dp) */}
            <View
              style={[
                styles.bottomCtaBar,
                { paddingBottom: Math.max(insets.bottom, 16) },
              ]}
            >
              {Boolean(errorValidacion) && (
                <View style={styles.errorBannerRow}>
                  <Feather name="alert-circle" size={14} color={TOKENS.colors.danger} />
                  <Text style={styles.errorBannerText}>{errorValidacion}</Text>
                </View>
              )}

              <BotonInteractivo
                accessibilityLabel={etiquetaCtaWizard()}
                disabled={guardando}
                onPress={handleAvanzarPaso}
                style={[
                  styles.primaryCtaButton,
                  guardando && styles.primaryCtaButtonDisabled,
                ]}
              >
                <Text style={styles.primaryCtaText}>{etiquetaCtaWizard()}</Text>
                <Feather
                  name={escena === 4 ? 'cpu' : 'arrow-right'}
                  size={18}
                  color={TOKENS.colors.textInverse}
                />
              </BotonInteractivo>
            </View>
          </KeyboardAvoidingView>
        )}

        {escena === 5 && renderEscenaCelebracion()}
      </View>
    </Modal>
  );
}
