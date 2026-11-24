/**
 * Constantes, utilidades y subcomponentes de módulo.
 * Extraído sin cambios de CambioFisicoView.jsx (Spec 022). No editar la lógica aquí sin revisar el componente.
 */
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import { TOKENS } from '../../theme/tokens';
import { Text, TouchableOpacity, View } from 'react-native';
import { styles } from './estilos';
import { useRef } from 'react';
import { vibrarConfirmacionBorrado, vibrarInicioPresionBorrado } from '../../services/haptics';

export const MAX_FOTOS_POR_ANALISIS = 10;

export const DURACION_PULSACION_BORRADO_MS = 1000;

export const MOMENTOS_DIA = ['En ayunas', 'Mediodía', 'Post-entreno', 'Noche'];

export const PASOS_BASCULA = [-1.0, -0.5, -0.1, 0.1, 0.5, 1.0];

export const obtenerEstadoHoraInicial = (fecha = new Date()) => {
  const horas24 = fecha.getHours();
  const minutos = fecha.getMinutes();
  const periodo = horas24 >= 12 ? 'PM' : 'AM';
  const hora12 = horas24 % 12 === 0 ? 12 : horas24 % 12;

  let momentoSugerido = 'Mediodía';
  if (horas24 >= 5 && horas24 < 11) {
    momentoSugerido = 'En ayunas';
  } else if (horas24 >= 11 && horas24 < 16) {
    momentoSugerido = 'Mediodía';
  } else if (horas24 >= 16 && horas24 < 20) {
    momentoSugerido = 'Post-entreno';
  } else {
    momentoSugerido = 'Noche';
  }

  return {
    hora: hora12,
    minutos,
    periodo,
    momentoDia: momentoSugerido,
  };
};

export const formatearHora12h = (hora, minutos, periodo) => {
  const hh = String(hora).padStart(2, '0');
  const mm = String(minutos).padStart(2, '0');
  return `${hh}:${mm} ${periodo}`;
};

export function CapsulaBorradoSeguroFisico({ onBorrar, onAvisoCorto }) {
  const progreso = useSharedValue(0);
  const timerRef = useRef(null);
  const presionadoLargoRef = useRef(false);

  const handlePressIn = () => {
    presionadoLargoRef.current = false;
    vibrarInicioPresionBorrado();
    progreso.value = withTiming(1, { duration: DURACION_PULSACION_BORRADO_MS });
    timerRef.current = setTimeout(() => {
      presionadoLargoRef.current = true;
      vibrarConfirmacionBorrado();
      onBorrar();
      progreso.value = withTiming(0, { duration: 150 });
    }, DURACION_PULSACION_BORRADO_MS);
  };

  const handlePressOut = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    if (!presionadoLargoRef.current) {
      progreso.value = withTiming(0, { duration: 180 });
      if (typeof onAvisoCorto === 'function') {
        onAvisoCorto();
      }
    }
  };

  const estiloFill = useAnimatedStyle(() => ({
    width: `${progreso.value * 100}%`,
  }));

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={styles.capsulaBorradoContenedor}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      <Animated.View style={[styles.capsulaBorradoFill, estiloFill]} />
      <View style={styles.capsulaBorradoContenido}>
        <Feather name="trash-2" size={12} color={TOKENS.colors.danger} />
        <Text style={styles.capsulaBorradoTexto}>1s</Text>
      </View>
    </TouchableOpacity>
  );
}
