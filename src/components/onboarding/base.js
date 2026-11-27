/**
 * Constantes, utilidades y subcomponentes de módulo.
 * Extraído sin cambios de OnboardingBienvenidaModal.jsx (Spec 022). No editar la lógica aquí sin revisar el componente.
 */
import Animated, { Easing, interpolate, interpolateColor, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { Pressable } from 'react-native';
import { TOKENS } from '../../theme/tokens';
import { parsearFechaLocalYYYYMMDD } from '../../services/storage';

// ============================================================================
// CONSTANTES DE RESORTE Y TIMING (UI THREAD - REACT NATIVE REANIMATED)
// ============================================================================
export const SPRING_SCENE = { damping: 24, stiffness: 260, mass: 0.9 };

export const SPRING_SNAPPY = { damping: 18, stiffness: 320, mass: 0.7 };

export const SPRING_ELASTIC = { damping: 12, stiffness: 220, mass: 0.8 };

export const SPRING_PRESS = { damping: 16, stiffness: 380, mass: 0.6 };

export const EASE_OUT_STRONG = Easing.bezier(0.22, 1, 0.36, 1);

export const MESES_CORTOS = [
  'ENE',
  'FEB',
  'MAR',
  'ABR',
  'MAY',
  'JUN',
  'JUL',
  'AGO',
  'SEP',
  'OCT',
  'NOV',
  'DIC',
];

export const PILARES_HERO = [
  {
    id: 'fuerza',
    icono: 'activity',
    titulo: 'Entreno de Fuerza',
    subtitulo: 'Línea base antropométrica y antigüedad real para calibrar tu volumen y progresión.',
  },
  {
    id: 'nutricion',
    icono: 'zap',
    titulo: 'Nutrición IA',
    subtitulo: 'Ajuste metabólico por edad exacta, sexo biológico, peso base y objetivo activo.',
  },
  {
    id: 'analisis',
    icono: 'eye',
    titulo: 'Análisis Físico IA',
    subtitulo: 'Evaluación contextualizada según tu estatura, etapa física y tiempo entrenando.',
  },
];

export const CATALOGO_OBJETIVOS = [
  {
    id: 'Volumen',
    icono: 'trending-up',
    tag: 'SUPERÁVIT CONTROLADO',
    subtitulo: 'Priorizar hipertrofia muscular y ganancia de fuerza con superávit calórico limpio.',
    calibracionIA:
      'Gemini IA priorizará densidad proteica, superávit energético sostenible y evaluación de masa magra y simetría muscular.',
  },
  {
    id: 'Definición',
    icono: 'zap',
    tag: 'DÉFICIT PRESERVANDO MASA',
    subtitulo: 'Reducir porcentaje graso manteniendo la masa muscular y el rendimiento en fuerza.',
    calibracionIA:
      'Gemini IA ajustará el análisis nutricional hacia saciedad, control calórico estricto, retención muscular y cortes de definición.',
  },
  {
    id: 'Mantenimiento',
    icono: 'shield',
    tag: 'EQUILIBRIO METABÓLICO',
    subtitulo: 'Sostener composición corporal óptima, energía estable y consolidación atlética.',
    calibracionIA:
      'Gemini IA calibrará un balance normocalórico de alto rendimiento y seguimiento de estabilidad antropométrica.',
  },
  {
    id: 'Recomposición',
    icono: 'sliders',
    tag: 'OPTIMIZACIÓN DUAL',
    subtitulo: 'Disminuir tejido adiposo mientras se construye tejido muscular de forma simultánea.',
    calibracionIA:
      'Gemini IA exigirá alta precisión proteica por kg corporal y evaluará la evolución simultánea de cintura, hombros y tono muscular.',
  },
];

/**
 * Calcula el número máximo de días de un mes específico (1-12),
 * contemplando años bisiestos (ej. febrero 2004, 2008, 2024).
 */
export function obtenerMaxDiasMes(anio, mes1a12) {
  return new Date(anio, mes1a12, 0).getDate();
}

/**
 * Formatea una cadena YYYY-MM-DD a DD/MM/AAAA para lectura editorial.
 */
export function formatearFechaLegible(fechaYYYYMMDD) {
  const f = parsearFechaLocalYYYYMMDD(fechaYYYYMMDD);
  return f?.legible || '--/--/----';
}

/**
 * Hook animado de entrada con fade + desplazamiento vertical en UI Thread.
 */
export function useFadeSlideStyle(sv, distanciaY = 18) {
  return useAnimatedStyle(() => ({
    opacity: sv.value,
    transform: [{ translateY: interpolate(sv.value, [0, 1], [distanciaY, 0]) }],
  }));
}

/**
 * Hook animado para cada barra de progreso segmentada (Pasos 1 a 4).
 */
export function useSegmentProgressStyle(sv) {
  return useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      sv.value,
      [0, 1],
      [TOKENS.colors.borderDefault, TOKENS.colors.accentWhite]
    ),
    transform: [{ scaleY: interpolate(sv.value, [0, 1], [1, 1.25]) }],
  }));
}

/**
 * Botón táctil con micro-interacción elástica en UI Thread.
 */
export function BotonInteractivo({
  onPress,
  disabled = false,
  style,
  children,
  scaleDown = 0.97,
  accessibilityLabel,
  accessibilityHint,
  accessibilityRole = 'button',
  seleccionado,
}) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    if (disabled) return;
    // eslint-disable-next-line react-hooks/immutability -- spec futura
    scale.value = withSpring(scaleDown, SPRING_PRESS);
  };

  const handlePressOut = () => {
    // eslint-disable-next-line react-hooks/immutability -- spec futura
    scale.value = withSpring(1, SPRING_PRESS);
  };

  return (
    <Pressable
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      aria-selected={accessibilityRole === 'radio' ? undefined : seleccionado}
      aria-checked={accessibilityRole === 'radio' ? seleccionado : undefined}
      aria-disabled={disabled || undefined}
      disabled={disabled}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={onPress}
    >
      <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>
    </Pressable>
  );
}
