import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import { TOKENS } from '../theme/tokens';
import { vibrarSeleccionBascula } from '../services/haptics';

const CONFIG_RESORTE = {
  damping: 15,
  stiffness: 250,
};

const ESTILOS_COMPRENSION = {
  Bien: {
    bg: '#FFFFFF',
    border: '#FFFFFF',
    text: '#0A0A0A',
  },
  'Más o menos': {
    bg: '#3D3D3D',
    border: '#525252',
    text: '#FFFFFF',
  },
  'No tanto': {
    bg: '#242424',
    border: '#333333',
    text: '#B8B8B8',
  },
  Nada: {
    bg: '#181818',
    border: '#262626',
    text: '#7A7A7A',
  },
};

const TarjetaSesionEstudio = React.memo(function TarjetaSesionEstudio({
  sesion,
  nombreMateria = 'Sin materia',
  categoriaMateria = 'Personal',
  mostrarFecha = false,
  fechaFormateada = '',
  onPress,
}) {
  const scale = useSharedValue(1);

  const handlePressIn = () => {
    scale.value = withSpring(0.97, CONFIG_RESORTE);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1.0, CONFIG_RESORTE);
  };

  const estiloAnimado = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    vibrarSeleccionBascula();
    if (typeof onPress === 'function') {
      onPress(sesion);
    }
  };

  const estiloComprension =
    ESTILOS_COMPRENSION[sesion.comprension] || ESTILOS_COMPRENSION['Bien'];

  const esEscuela = categoriaMateria === 'Escuela';

  return (
    <Animated.View style={[styles.contenedorAnimado, estiloAnimado]}>
      <TouchableOpacity
        activeOpacity={0.92}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={handlePress}
        style={styles.tarjeta}
        accessibilityRole="button"
        accessibilityLabel={`Sesión de ${nombreMateria}, tema: ${sesion.tema}, duración: ${sesion.minutos} minutos`}
      >
        {/* Cabecera: Materia, Categoría y Fecha opcional */}
        <View style={styles.filaCabecera}>
          <View style={styles.bloqueMateria}>
            <Text style={styles.nombreMateria} numberOfLines={1}>
              {nombreMateria}
            </Text>
            <View
              style={[
                styles.badgeCategoria,
                esEscuela ? styles.badgeEscuela : styles.badgePersonal,
              ]}
            >
              <Feather
                name={esEscuela ? 'book' : 'compass'}
                size={9}
                color={esEscuela ? '#E0E0E0' : '#A0A0A0'}
                style={styles.iconoCategoria}
              />
              <Text
                style={[
                  styles.textoBadgeCategoria,
                  { color: esEscuela ? '#E0E0E0' : '#A0A0A0' },
                ]}
              >
                {categoriaMateria.toUpperCase()}
              </Text>
            </View>
          </View>

          {mostrarFecha && (fechaFormateada || sesion.fecha) ? (
            <View style={styles.badgeFecha}>
              <Feather
                name="calendar"
                size={10}
                color={TOKENS.colors.textSecondary}
                style={styles.iconoFecha}
              />
              <Text style={styles.textoBadgeFecha}>
                {fechaFormateada || sesion.fecha}
              </Text>
            </View>
          ) : (
            <Feather
              name="chevron-right"
              size={16}
              color={TOKENS.colors.textMuted}
            />
          )}
        </View>

        {/* Tema */}
        <Text style={styles.tema} numberOfLines={2}>
          {sesion.tema}
        </Text>

        {/* Metadatos: Comprensión y Minutos */}
        <View style={styles.filaMetadatos}>
          <View
            style={[
              styles.badgeComprension,
              {
                backgroundColor: estiloComprension.bg,
                borderColor: estiloComprension.border,
              },
            ]}
          >
            <Text
              style={[
                styles.textoBadgeComprension,
                { color: estiloComprension.text },
              ]}
            >
              {sesion.comprension}
            </Text>
          </View>

          <View style={styles.chipDato}>
            <Feather
              name="clock"
              size={12}
              color={TOKENS.colors.textSecondary}
              style={styles.iconoDato}
            />
            <Text style={styles.textoDato}>{sesion.minutos} min</Text>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  contenedorAnimado: {
    marginBottom: TOKENS.spacing.sm,
  },
  tarjeta: {
    backgroundColor: TOKENS.colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: TOKENS.colors.borderDefault,
    padding: TOKENS.spacing.md,
    minHeight: TOKENS.touchTarget.minHeight,
  },
  filaCabecera: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: TOKENS.spacing.xs,
  },
  bloqueMateria: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: TOKENS.spacing.sm,
  },
  nombreMateria: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.2,
    color: TOKENS.colors.textPrimary,
    marginRight: 8,
    flexShrink: 1,
  },
  badgeCategoria: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: TOKENS.radii.xs,
    borderWidth: 1,
  },
  badgeEscuela: {
    backgroundColor: '#1C1C1E',
    borderColor: '#3A3A3A',
  },
  badgePersonal: {
    backgroundColor: '#161616',
    borderColor: '#2E2E2E',
  },
  iconoCategoria: {
    marginRight: 4,
  },
  textoBadgeCategoria: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  badgeFecha: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: TOKENS.colors.surfaceElevated,
    borderRadius: TOKENS.radii.xs,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: TOKENS.colors.borderSubtle,
  },
  iconoFecha: {
    marginRight: 4,
  },
  textoBadgeFecha: {
    color: TOKENS.colors.textSecondary,
    fontSize: 10,
    fontWeight: '700',
  },
  tema: {
    fontSize: 14,
    fontWeight: '600',
    color: '#D4D4D4',
    lineHeight: 19,
    marginBottom: TOKENS.spacing.sm,
  },
  filaMetadatos: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: TOKENS.spacing.sm,
  },
  badgeComprension: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: TOKENS.radii.xs,
    borderWidth: 1,
  },
  textoBadgeComprension: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  chipDato: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: TOKENS.colors.surfaceElevated,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: TOKENS.radii.xs,
    borderWidth: 1,
    borderColor: TOKENS.colors.borderSubtle,
  },
  iconoDato: {
    marginRight: 5,
  },
  textoDato: {
    fontSize: 11,
    fontWeight: '700',
    color: TOKENS.colors.textPrimary,
  },
});

export default TarjetaSesionEstudio;
