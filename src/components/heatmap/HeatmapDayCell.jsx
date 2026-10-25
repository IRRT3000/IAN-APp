import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { PALETA_NIVELES_VASO } from '../../utils/waterGlassEngine';

/**
 * Celda individual de día en el mapa de calor anual.
 * Memoizada con React.memo para evitar re-renderizados innecesarios de las 365 celdas.
 */
function HeatmapDayCell({
  fechaStr,
  dia,
  score = 0,
  nivelColor = 0,
  isFuture = false,
  isToday = false,
  isRestDay = false,
  hasPhoto = false,
  esVacio = false,
  onPress,
}) {
  if (esVacio) {
    return <View style={styles.celdaVacia} />;
  }

  const nivelSeguro = Math.max(0, Math.min(4, Number(nivelColor) || 0));
  const estiloNivel = PALETA_NIVELES_VASO[nivelSeguro] || PALETA_NIVELES_VASO[0];

  const handlePress = () => {
    if (isFuture) return;
    if (typeof onPress === 'function') {
      onPress(fechaStr);
    }
  };

  return (
    <TouchableOpacity
      activeOpacity={isFuture ? 1 : 0.7}
      disabled={isFuture}
      onPress={handlePress}
      hitSlop={{ top: 3, bottom: 3, left: 3, right: 3 }}
      style={[
        styles.celda,
        {
          backgroundColor: estiloNivel.fondo,
          borderColor: isToday ? '#FFFFFF' : estiloNivel.borde,
          borderWidth: isToday ? 1.5 : 1,
        },
        isFuture && styles.celdaFutura,
      ]}
    >
      {/* Insignia dorada sutil si hay foto de progreso */}
      {hasPhoto && !isFuture ? (
        <View style={styles.puntoFoto} />
      ) : null}

      {/* Indicador de descanso sutil si no hay foto */}
      {isRestDay && !hasPhoto && !isFuture && nivelSeguro < 4 ? (
        <View style={styles.puntoDescanso} />
      ) : null}
    </TouchableOpacity>
  );
}

export default React.memo(HeatmapDayCell);

const styles = StyleSheet.create({
  celda: {
    width: 14,
    height: 14,
    borderRadius: 3,
    margin: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  celdaVacia: {
    width: 14,
    height: 14,
    margin: 1.5,
    backgroundColor: 'transparent',
  },
  celdaFutura: {
    opacity: 0.18,
    backgroundColor: '#1E1E1E',
    borderColor: '#262626',
  },
  puntoFoto: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#FFD700',
  },
  puntoDescanso: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#60A5FA',
  },
});
