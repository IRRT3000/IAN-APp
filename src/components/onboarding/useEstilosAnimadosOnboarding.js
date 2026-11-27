/**
 * Estilos animados de Reanimated de cada escena.
 * Extraído sin cambios de OnboardingBienvenidaModal.jsx (Spec 022). No editar la lógica aquí sin revisar el componente.
 */
import { TOKENS } from '../../theme/tokens';
import { interpolate, interpolateColor, useAnimatedStyle } from 'react-native-reanimated';
import { useFadeSlideStyle, useSegmentProgressStyle } from './base';

export function useEstilosAnimadosOnboarding({ bioBannerSV, bloque1SV, bloque2SV, bloque3SV, celebCheckScale, celebCtaSV, celebFlashBorder, celebHeaderSV, celebRingScale, edadPulseSV, heroBadgeSV, heroCtaSV, heroPilar1SV, heroPilar2SV, heroPilar3SV, heroRingPulse, heroTitleSV, imcProgressSV, metricaPulseSV, objetivoBannerSV, pasaporteItem1, pasaporteItem2, pasaporteItem3, pasaporteItem4, pasaporteItem5, pasaporteItem6, prog1SV, prog2SV, prog3SV, prog4SV, sceneOpacity, sceneScale, sceneTranslateX, timelinePulseSV }) {
  // ==========================================================================
  // ESTILOS ANIMADOS (UI THREAD)
  // ==========================================================================
  const heroRingOuterStyle = useAnimatedStyle(() => ({
    transform: [{ scale: heroRingPulse.value }],
    opacity: interpolate(heroRingPulse.value, [1, 1.06], [0.55, 1]),
  }));

  const heroRingMidStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(heroRingPulse.value, [1, 1.06], [1, 1.03]) }],
  }));

  const heroBadgeAnimStyle = useFadeSlideStyle(heroBadgeSV, 14);

  const heroTitleAnimStyle = useFadeSlideStyle(heroTitleSV, 18);

  const heroPilar1AnimStyle = useFadeSlideStyle(heroPilar1SV, 20);

  const heroPilar2AnimStyle = useFadeSlideStyle(heroPilar2SV, 20);

  const heroPilar3AnimStyle = useFadeSlideStyle(heroPilar3SV, 20);

  const heroCtaAnimStyle = useFadeSlideStyle(heroCtaSV, 22);

  const sceneContainerAnimStyle = useAnimatedStyle(() => ({
    opacity: sceneOpacity.value,
    transform: [
      { translateX: sceneTranslateX.value },
      { scale: sceneScale.value },
    ],
  }));

  const bloque1AnimStyle = useFadeSlideStyle(bloque1SV, 16);

  const bloque2AnimStyle = useFadeSlideStyle(bloque2SV, 18);

  const bloque3AnimStyle = useFadeSlideStyle(bloque3SV, 20);

  const seg1Style = useSegmentProgressStyle(prog1SV);

  const seg2Style = useSegmentProgressStyle(prog2SV);

  const seg3Style = useSegmentProgressStyle(prog3SV);

  const seg4Style = useSegmentProgressStyle(prog4SV);

  const edadBadgeAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: edadPulseSV.value }],
  }));

  const bioBannerAnimStyle = useAnimatedStyle(() => ({
    opacity: bioBannerSV.value,
    transform: [{ scale: interpolate(bioBannerSV.value, [0.88, 1], [0.97, 1]) }],
  }));

  const imcFillAnimStyle = useAnimatedStyle(() => ({
    width: `${Math.round(imcProgressSV.value * 100)}%`,
  }));

  const metricaCardAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: metricaPulseSV.value }],
  }));

  const timelineAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: timelinePulseSV.value }],
  }));

  const objetivoBannerAnimStyle = useAnimatedStyle(() => ({
    opacity: objetivoBannerSV.value,
    transform: [{ scale: interpolate(objetivoBannerSV.value, [0.9, 1], [0.97, 1]) }],
  }));

  // Estilos animados de la Escena 5 (Pasaporte Biométrico)
  const celebRingAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: celebRingScale.value }],
    opacity: interpolate(celebRingScale.value, [0.6, 1], [0, 1]),
  }));

  const celebCheckAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: celebCheckScale.value }],
  }));

  const celebHeaderAnimStyle = useFadeSlideStyle(celebHeaderSV, 16);

  const pasaporteCardBorderStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(
      celebFlashBorder.value,
      [0.22, 1],
      [TOKENS.colors.borderStrong, TOKENS.colors.accentWhite]
    ),
  }));

  const pItem1Style = useFadeSlideStyle(pasaporteItem1, 14);

  const pItem2Style = useFadeSlideStyle(pasaporteItem2, 14);

  const pItem3Style = useFadeSlideStyle(pasaporteItem3, 14);

  const pItem4Style = useFadeSlideStyle(pasaporteItem4, 14);

  const pItem5Style = useFadeSlideStyle(pasaporteItem5, 14);

  const pItem6Style = useFadeSlideStyle(pasaporteItem6, 14);

  const celebCtaAnimStyle = useFadeSlideStyle(celebCtaSV, 20);

  return { heroRingOuterStyle, heroRingMidStyle, heroBadgeAnimStyle, heroTitleAnimStyle, heroPilar1AnimStyle, heroPilar2AnimStyle, heroPilar3AnimStyle, heroCtaAnimStyle, sceneContainerAnimStyle, bloque1AnimStyle, bloque2AnimStyle, bloque3AnimStyle, seg1Style, seg2Style, seg3Style, seg4Style, edadBadgeAnimStyle, bioBannerAnimStyle, imcFillAnimStyle, metricaCardAnimStyle, timelineAnimStyle, objetivoBannerAnimStyle, celebRingAnimStyle, celebCheckAnimStyle, celebHeaderAnimStyle, pasaporteCardBorderStyle, pItem1Style, pItem2Style, pItem3Style, pItem4Style, pItem5Style, pItem6Style, celebCtaAnimStyle };
}
