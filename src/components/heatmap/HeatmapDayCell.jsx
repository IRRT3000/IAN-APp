import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { PALETA_NIVELES_VASO } from '../../utils/waterGlassEngine';

/**
 * Celda individual de día en el mapa de calor anual.
 * Memoizada con React.memo para evitar re-renderizados innecesarios de las 365 celdas.
 * Admite modo compacto (14x14) para mapa anual y modo destacado (32x32 con número) para widget mensual.
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
  tamanoGrande = false,
}) {
  if (esVacio) {
    return (
      <View
        style={[styles.celdaVacia, tamanoGrande && styles.celdaVaciaGrande]}
      />
    );
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
      hitSlop={
        tamanoGrande
          ? { top: 2, bottom: 2, left: 2, right: 2 }
          : { top: 3, bottom: 3, left: 3, right: 3 }
      }
      style={[
        styles.celda,
        tamanoGrande && styles.celdaGrande,
        {
          backgroundColor: estiloNivel.fondo,
          borderColor: isToday ? '#FFFFFF' : estiloNivel.borde,
          borderWidth: isToday ? (tamanoGrande ? 2 : 1.5) : 1,
        },
        isFuture && styles.celdaFutura,
      ]}
    >
      {/* En modo grande mostramos el número del día */}
      {tamanoGrande ? (
        <Text
          style={[
            styles.textoDia,
            nivelSeguro >= 3 ? styles.textoDiaOscuro : styles.textoDiaClaro,
            isToday && styles.textoDiaHoy,
          ]}
        >
          {dia}
        </Text>
      ) : null}

      {/* Insignia dorada si hay foto de progreso */}
      {hasPhoto && !isFuture ? (
        <View
          style={[
            styles.puntoFoto,
            tamanoGrande && styles.puntoFotoGrande,
          ]}
        />
      ) : null}

      {/* Indicador de descanso si no hay foto */}
      {isRestDay && !hasPhoto && !isFuture && nivelSeguro < 4 ? (
        <View
          style={[
            styles.puntoDescanso,
            tamanoGrande && styles.puntoDescansoGrande,
          ]}
        />
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
  celdaGrande: {
    width: 34,
    height: 34,
    borderRadius: 7,
    margin: 3.5,
  },
  celdaVacia: {
    width: 14,
    height: 14,
    margin: 1.5,
    backgroundColor: 'transparent',
  },
  celdaVaciaGrande: {
    width: 34,
    height: 34,
    margin: 3.5,
    backgroundColor: 'transparent',
  },
  celdaFutura: {
    opacity: 0.18,
    backgroundColor: '#1E1E1E',
    borderColor: '#262626',
  },
  textoDia: {
    fontSize: 10,
    fontWeight: '700',
  },
  textoDiaClaro: {
    color: '#D4D4D4',
  },
  textoDiaOscuro: {
    color: '#0A2E16',
    fontWeight: '800',
  },
  textoDiaHoy: {
    color: '#FFFFFF',
    fontWeight: '900',
  },
  puntoFoto: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#FFD700',
  },
  puntoFotoGrande: {
    position: 'absolute',
    top: 3,
    right: 3,
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  puntoDescanso: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#60A5FA',
  },
  puntoDescansoGrande: {
    position: 'absolute',
    top: 3,
    right: 3,
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
});
