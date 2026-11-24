/**
 * Render de "renderCabeceraWizard". ctx se rellena en el componente antes de renderizar.
 * Extraído sin cambios de OnboardingBienvenidaModal.jsx (Spec 022). No editar la lógica aquí sin revisar el componente.
 */
import Animated from 'react-native-reanimated';
import { BotonInteractivo } from './base';
import { Feather } from '@expo/vector-icons';
import { Keyboard, Text, View } from 'react-native';
import { TOKENS } from '../../theme/tokens';
import { styles } from './estilos';
import { vibrarInicioPresionBorrado } from '../../services/haptics';

export const crearRenderCabeceraWizard = (ctx) => (...args) => {
  const { escena, handleRetrocederPaso, insets, modoEdicion, onCerrar, seg1Style, seg2Style, seg3Style, seg4Style } = ctx;
  const renderCabeceraWizard = () => {
      const mostrarBotonAtras = !modoEdicion || escena > 1;
      return (
        <View style={[styles.wizardHeader, { paddingTop: insets.headerPaddingTop }]}>
          <View style={styles.wizardTopRow}>
            {mostrarBotonAtras ? (
              <BotonInteractivo
                accessibilityLabel="Atrás"
                onPress={handleRetrocederPaso}
                scaleDown={0.92}
                style={styles.headerIconBtn}
              >
                <Feather name="chevron-left" size={20} color={TOKENS.colors.textPrimary} />
              </BotonInteractivo>
            ) : (
              <View style={styles.headerIconSpacer} />
            )}
  
            <View style={styles.wizardStepCounterBox}>
              <Text style={styles.wizardStepCategory}>
                {modoEdicion ? 'EDICIÓN BIOMÉTRICA' : 'CALIBRACIÓN INICIAL'}
              </Text>
              <Text style={styles.wizardStepCounterText}>
                {`PASO 0${escena} / 04`}
              </Text>
            </View>
  
            {modoEdicion && onCerrar ? (
              <BotonInteractivo
                accessibilityLabel="Cerrar"
                onPress={() => {
                  vibrarInicioPresionBorrado();
                  Keyboard.dismiss();
                  onCerrar();
                }}
                scaleDown={0.92}
                style={styles.headerIconBtn}
              >
                <Feather name="x" size={18} color={TOKENS.colors.textPrimary} />
              </BotonInteractivo>
            ) : (
              <View style={styles.headerIconSpacer} />
            )}
          </View>
  
          {/* 4 Segmentos de Progreso Animados */}
          <View style={styles.progressSegmentsRow}>
            <Animated.View style={[styles.progressSegment, seg1Style]} />
            <Animated.View style={[styles.progressSegment, seg2Style]} />
            <Animated.View style={[styles.progressSegment, seg3Style]} />
            <Animated.View style={[styles.progressSegment, seg4Style]} />
          </View>
        </View>
      );
    };
  return renderCabeceraWizard(...args);
};
