import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { PALETA_NIVELES_VASO } from '../../utils/waterGlassEngine';

/**
 * Celda individual de día en el mapa de calor anual.
 * Spec 006: Monocromo Matte Luxury con inversión tipográfica automática.
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
  tamanoGrande = false,
  tamanoCelda = 34,
}) {
  const estiloDimension = tamanoGrande
    ? { width: tamanoCelda, height: tamanoCelda }
    : null;

  if (esVacio) {
    return (
      <View
        style={[
          styles.celdaVacia,
          tamanoGrande && styles.celdaVaciaGrande,
          estiloDimension,
        ]}
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

  const colorTextoDia = isFuture
    ? '#444444'
    : isToday
    ? (nivelSeguro >= 3 ? '#0A0A0A' : '#FFFFFF')
    : estiloNivel.texto;

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
        estiloDimension,
        {
          backgroundColor: estiloNivel.fondo,
          borderColor: isToday ? '#FFFFFF' : estiloNivel.borde,
          borderWidth: isToday ? (tamanoGrande ? 2 : 1.5) : 1,
        },
        isFuture && styles.celdaFutura,
      ]}
    >
      {/* En modo grande mostramos el número del día con inversión de contraste automática */}
      {tamanoGrande ? (
        <Text
          style={[
            styles.textoDia,
            { color: colorTextoDia },
            isToday && styles.textoDiaHoy,
          ]}
        >
          {dia}
        </Text>
      ) : null}

      {/* Micro-anillo de foto de progreso (Monocromo platino) */}
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
    opacity: 0.25,
    backgroundColor: '#121212',
    borderColor: '#1C1C1E',
  },
  textoDia: {
    fontSize: 10,
    fontWeight: '700',
  },
  textoDiaHoy: {
    fontWeight: '900',
  },
  puntoFoto: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#FFFFFF',
    borderWidth: 0.5,
    borderColor: '#0A0A0A',
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
    backgroundColor: '#8E8E93',
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
