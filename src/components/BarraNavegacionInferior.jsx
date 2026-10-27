import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import { vibrarSeleccionBascula } from '../services/haptics';
import { useSafeInsets } from '../utils/useSafeInsets';

export default function BarraNavegacionInferior({
  vistaActiva,
  onCambiarVista,
  contadorHoy = 0,
  contadorComidasHoy = 0,
  contadorFisicoHoy = 0,
}) {
  const insets = useSafeInsets();
  const { width: anchoPantalla } = useWindowDimensions();

  // 5 Pestañas oficiales con iconografía Feather exclusiva (CERO EMOJIS)
  const PESTANAS = [
    { id: 'bienvenida', etiqueta: 'Inicio', icono: 'home' },
    { id: 'tracker', etiqueta: 'Entrenos', icono: 'activity', contador: contadorHoy },
    { id: 'nutricion', etiqueta: 'Nutrición', icono: 'pie-chart', contador: contadorComidasHoy },
    { id: 'fisico', etiqueta: 'Físico', icono: 'camera', contador: contadorFisicoHoy },
    { id: 'heatmap', etiqueta: 'Heatmap', icono: 'calendar' },
  ];

  // Cálculo de ancho inicial inmediato para 0ms de parpadeo (FOUC)
  const anchoContenedorEstimado = Math.max(300, anchoPantalla - 32 - 8);
  const [anchoTab, setAnchoTab] = useState(anchoContenedorEstimado / PESTANAS.length);

  const indiceActivo = Math.max(
    0,
    PESTANAS.findIndex((item) => item.id === vistaActiva)
  );

  const translateX = useSharedValue(indiceActivo * anchoTab);

  // Sincronización del resorte numérico en UI Thread sin rebote desbordado
  useEffect(() => {
    translateX.value = withSpring(indiceActivo * anchoTab, {
      duration: 240,
      dampingRatio: 1,
      overshootClamping: true,
    });
  }, [indiceActivo, anchoTab, translateX]);

  const estiloPillAnimado = useAnimatedStyle(() => ({
    width: anchoTab,
    transform: [{ translateX: translateX.value }],
  }));

  const manejarMedicionContenedor = (e) => {
    const anchoReal = e.nativeEvent.layout.width - 8; // Restar padding interno
    if (anchoReal > 0) {
      setAnchoTab(anchoReal / PESTANAS.length);
    }
  };

  const manejarPulsarTab = (id) => {
    if (id !== vistaActiva) {
      vibrarSeleccionBascula();
      onCambiarVista(id);
    }
  };

  return (
    <View
      style={[
        styles.envoltorioFlotante,
        { bottom: Math.max(insets.bottom, 12) },
      ]}
      pointerEvents="box-none"
    >
      <View
        style={styles.contenedorBarra}
        onLayout={manejarMedicionContenedor}
      >
        {/* Pastilla deslizante animada con físicas de resorte en UI Thread */}
        <Animated.View style={[styles.pillDeslizante, estiloPillAnimado]} />

        {PESTANAS.map((tab) => {
          const esActivo = vistaActiva === tab.id;
          const tieneContador = tab.contador && tab.contador > 0;

          return (
            <TouchableOpacity
              key={tab.id}
              style={styles.botonTab}
              activeOpacity={0.75}
              onPress={() => manejarPulsarTab(tab.id)}
              hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
              accessibilityRole="tab"
              accessibilityState={{ selected: esActivo }}
              accessibilityLabel={`${tab.etiqueta}${tieneContador ? `, ${tab.contador} registros hoy` : ''}`}
            >
              <View style={styles.filaIcono}>
                <Feather
                  name={tab.icono}
                  size={18}
                  color={esActivo ? '#FFFFFF' : '#666666'}
                />
                {tieneContador ? (
                  <View style={styles.badgeContador}>
                    <Text style={styles.textoBadge}>{tab.contador}</Text>
                  </View>
                ) : null}
              </View>

              <Text
                numberOfLines={1}
                style={[
                  styles.etiquetaTab,
                  esActivo ? styles.etiquetaActiva : styles.etiquetaInactiva,
                ]}
              >
                {tab.etiqueta}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  envoltorioFlotante: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 999,
  },
  contenedorBarra: {
    height: 58,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#141414',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#262626',
    paddingHorizontal: 4,
    paddingVertical: 4,
    // Elevación nativa para Android y sombra sutil
    elevation: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
  },
  pillDeslizante: {
    position: 'absolute',
    top: 4,
    bottom: 4,
    left: 4,
    backgroundColor: '#222222',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#2E2E2E',
  },
  botonTab: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  filaIcono: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    height: 22,
  },
  etiquetaTab: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.2,
    marginTop: 2,
  },
  etiquetaActiva: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  etiquetaInactiva: {
    color: '#666666',
  },
  badgeContador: {
    position: 'absolute',
    top: -4,
    right: -10,
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
    minWidth: 14,
    height: 14,
    paddingHorizontal: 3,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#0A0A0A',
  },
  textoBadge: {
    color: '#0A0A0A',
    fontSize: 9,
    fontWeight: '800',
    lineHeight: 11,
  },
});
