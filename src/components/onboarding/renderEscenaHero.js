/**
 * Render de "renderEscenaHero". ctx se rellena en el componente antes de renderizar.
 * Extraído sin cambios de OnboardingBienvenidaModal.jsx (Spec 022). No editar la lógica aquí sin revisar el componente.
 */
import Animated from 'react-native-reanimated';
import { BotonInteractivo, PILARES_HERO } from './base';
import { Feather } from '@expo/vector-icons';
import { ScrollView, Text, View } from 'react-native';
import { TOKENS } from '../../theme/tokens';
import { styles } from './estilos';

export const crearRenderEscenaHero = (ctx) => (...args) => {
  const { handleAvanzarPaso, heroBadgeAnimStyle, heroCtaAnimStyle, heroPilar1AnimStyle, heroPilar2AnimStyle, heroPilar3AnimStyle, heroRingMidStyle, heroRingOuterStyle, heroTitleAnimStyle, insets } = ctx;
  const renderEscenaHero = () => (
      <View style={styles.fullSceneContainer}>
        <ScrollView
          contentContainerStyle={[
            styles.heroScrollContent,
            { paddingTop: insets.headerPaddingTop + 12, paddingBottom: 24 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* Emblema Geométrico Concéntrico de 3 Anillos */}
          <View style={styles.heroEmblemWrapper}>
            <Animated.View style={[styles.heroRingOuter, heroRingOuterStyle]} />
            <Animated.View style={[styles.heroRingMiddle, heroRingMidStyle]} />
            <View style={styles.heroRingInner}>
              <Feather name="cpu" size={24} color={TOKENS.colors.textPrimary} />
            </View>
          </View>
  
          <Animated.View style={[styles.badgeWrapCenter, heroBadgeAnimStyle]}>
            <View style={styles.whitePillBadge}>
              <Text style={styles.whitePillBadgeText}>CALIBRACIÓN BIOMÉTRICA IA</Text>
            </View>
          </Animated.View>
  
          <Animated.View style={[styles.heroTitleBlock, heroTitleAnimStyle]}>
            <Text style={styles.heroMainTitle}>Precisión Biométrica Personalizada</Text>
            <Text style={styles.heroMainSubtitle}>
              Configura tu arquitectura física base en 4 pasos. Estos parámetros alimentan
              en tiempo real tus entrenamientos, cálculos metabólicos y los modelos de
              Gemini IA.
            </Text>
          </Animated.View>
  
          <View style={styles.heroPilaresList}>
            {[heroPilar1AnimStyle, heroPilar2AnimStyle, heroPilar3AnimStyle].map(
              (animStyle, idx) => {
                const pilar = PILARES_HERO[idx];
                return (
                  <Animated.View key={pilar.id} style={[styles.heroPilarCard, animStyle]}>
                    <View style={styles.heroPilarIconBox}>
                      <Feather
                        name={pilar.icono}
                        size={18}
                        color={TOKENS.colors.textPrimary}
                      />
                    </View>
                    <View style={styles.heroPilarTextCol}>
                      <Text style={styles.heroPilarTitle}>{pilar.titulo}</Text>
                      <Text style={styles.heroPilarSub}>{pilar.subtitulo}</Text>
                    </View>
                  </Animated.View>
                );
              }
            )}
          </View>
        </ScrollView>
  
        {/* Barra Inferior Thumb-Zone */}
        <Animated.View
          style={[
            styles.bottomCtaBar,
            { paddingBottom: Math.max(insets.bottom, 16) },
            heroCtaAnimStyle,
          ]}
        >
          <BotonInteractivo
            accessibilityLabel="Configurar mi Perfil"
            onPress={handleAvanzarPaso}
            style={styles.primaryCtaButton}
          >
            <Text style={styles.primaryCtaText}>Configurar mi Perfil</Text>
            <Feather name="arrow-right" size={18} color={TOKENS.colors.textInverse} />
          </BotonInteractivo>
        </Animated.View>
      </View>
    );
  return renderEscenaHero(...args);
};
