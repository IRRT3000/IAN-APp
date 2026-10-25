import React, { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { obtenerFechaLocal } from '../services/storage';
import { vibrarSeleccionBascula } from '../services/haptics';
import { TOKENS } from '../theme/tokens';

const INICIALES_DIA_SEMANA = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];

/**
 * Genera de forma inmutable el arreglo de los últimos 7 días con aritmética de fecha local pura (RF-1, Directriz 5).
 * Prohibido el uso de toISOString() o new Date("YYYY-MM-DD").
 * @returns {Array<{ fecha: string, inicial: string, diaMes: string, fechaCorta: string, esHoy: boolean }>}
 */
const calcularDiasSemana = () => {
  const hoy = new Date();
  const fechaHoyStr = obtenerFechaLocal(hoy);

  return Array.from({ length: 7 }, (_, index) => {
    const desplazamiento = 6 - index;
    const fechaItem = new Date(
      hoy.getFullYear(),
      hoy.getMonth(),
      hoy.getDate() - desplazamiento
    );

    const fechaStr = obtenerFechaLocal(fechaItem);
    const diaMes = String(fechaItem.getDate()).padStart(2, '0');
    const mes = String(fechaItem.getMonth() + 1).padStart(2, '0');
    const inicial = INICIALES_DIA_SEMANA[fechaItem.getDay()];

    return {
      fecha: fechaStr,
      inicial,
      diaMes,
      fechaCorta: `${diaMes}/${mes}`,
      esHoy: fechaStr === fechaHoyStr,
    };
  });
};

/**
 * Celda individual de día semanal memoizada con físicas de resorte en UI Thread (Reanimated 4).
 */
const CeldaDiaSemanal = React.memo(function CeldaDiaSemanal({
  item,
  estaSeleccionado,
  tieneActividad,
  onPress,
}) {
  const scale = useSharedValue(1);

  const handlePressIn = () => {
    scale.value = withSpring(0.94, { damping: 15, stiffness: 250 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1.0, { damping: 15, stiffness: 250 });
  };

  const estiloAnimado = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    vibrarSeleccionBascula();
    onPress(item.fecha);
  };

  return (
    <Animated.View style={[styles.envoltorioCelda, estiloAnimado]}>
      <TouchableOpacity
        style={[
          styles.celda,
          estaSeleccionado && styles.celdaSeleccionada,
          item.esHoy && !estaSeleccionado && styles.celdaHoy,
        ]}
        activeOpacity={0.9}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={handlePress}
      >
        <Text
          style={[
            styles.textoInicial,
            estaSeleccionado
              ? styles.textoInicialSeleccionado
              : item.esHoy
                ? styles.textoInicialHoy
                : styles.textoInicialNormal,
          ]}
        >
          {item.inicial}
        </Text>

        <Text
          style={[
            styles.textoDiaMes,
            estaSeleccionado
              ? styles.textoDiaMesSeleccionado
              : styles.textoDiaMesNormal,
          ]}
        >
          {item.diaMes}
        </Text>

        <Text
          style={[
            styles.textoFechaCorta,
            estaSeleccionado
              ? styles.textoFechaCortaSeleccionado
              : styles.textoFechaCortaNormal,
          ]}
        >
          {item.fechaCorta}
        </Text>

        <View style={styles.contenedorIndicador}>
          {tieneActividad ? (
            <View
              style={[
                styles.puntoActividad,
                estaSeleccionado && styles.puntoActividadSeleccionado,
              ]}
            />
          ) : item.esHoy ? (
            <Text
              style={[
                styles.badgeHoy,
                estaSeleccionado && styles.badgeHoySeleccionado,
              ]}
            >
              HOY
            </Text>
          ) : (
            <View style={styles.espaciadorPunto} />
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
});

export default function SelectorSemanal({
  fechaSeleccionada,
  onSeleccionarFecha,
  diasConActividad = [],
}) {
  const dias = useMemo(() => calcularDiasSemana(), []);
  const conjuntoActividad = useMemo(
    () => new Set(Array.isArray(diasConActividad) ? diasConActividad : []),
    [diasConActividad]
  );

  return (
    <View style={styles.contenedor}>
      <View style={styles.filaDias}>
        {dias.map((item) => {
          const estaSeleccionado = item.fecha === fechaSeleccionada;
          const tieneActividad = conjuntoActividad.has(item.fecha);

          return (
            <CeldaDiaSemanal
              key={item.fecha}
              item={item}
              estaSeleccionado={estaSeleccionado}
              tieneActividad={tieneActividad}
              onPress={onSeleccionarFecha}
            />
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    backgroundColor: TOKENS.colors.surface, // #141414
    borderRadius: TOKENS.radii.md,
    paddingVertical: 10,
    paddingHorizontal: 6,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: TOKENS.colors.borderDefault, // #262626
  },
  filaDias: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  envoltorioCelda: {
    flex: 1,
    marginHorizontal: 2,
  },
  celda: {
    paddingVertical: 8,
    paddingHorizontal: 2,
    borderRadius: TOKENS.radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: TOKENS.colors.surfaceElevated, // #1C1C1E
    borderWidth: 1.5,
    borderColor: TOKENS.colors.borderDefault, // #262626
  },
  celdaSeleccionada: {
    backgroundColor: TOKENS.colors.accentWhite, // #FFFFFF
    borderColor: TOKENS.colors.accentWhite,
  },
  celdaHoy: {
    backgroundColor: '#222224',
    borderColor: TOKENS.colors.borderStrong, // #3A3A3A
  },
  textoInicial: {
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 2,
  },
  textoInicialNormal: {
    color: TOKENS.colors.textSecondary, // #8E8E93
  },
  textoInicialHoy: {
    color: TOKENS.colors.textSecondary, // #8E8E93
  },
  textoInicialSeleccionado: {
    color: TOKENS.colors.textInverse, // #0A0A0A
    fontWeight: '900',
  },
  textoDiaMes: {
    fontSize: 14,
    fontWeight: '700',
  },
  textoDiaMesNormal: {
    color: TOKENS.colors.textPrimary, // #FFFFFF
  },
  textoDiaMesSeleccionado: {
    color: TOKENS.colors.textInverse, // #0A0A0A
    fontWeight: '900',
  },
  textoFechaCorta: {
    fontSize: 9,
    marginTop: 2,
    fontWeight: '600',
  },
  textoFechaCortaNormal: {
    color: TOKENS.colors.textMuted, // #666666
  },
  textoFechaCortaSeleccionado: {
    color: TOKENS.colors.textInverse, // #0A0A0A
    fontWeight: '700',
  },
  contenedorIndicador: {
    height: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  puntoActividad: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: TOKENS.colors.accentWhite, // #FFFFFF en inactiva
  },
  puntoActividadSeleccionado: {
    backgroundColor: TOKENS.colors.textInverse, // #0A0A0A en activa
  },
  badgeHoy: {
    fontSize: 8,
    fontWeight: '800',
    color: TOKENS.colors.textSecondary, // #8E8E93
    letterSpacing: 0.3,
  },
  badgeHoySeleccionado: {
    color: TOKENS.colors.textInverse, // #0A0A0A
  },
  espaciadorPunto: {
    width: 5,
    height: 5,
  },
});
