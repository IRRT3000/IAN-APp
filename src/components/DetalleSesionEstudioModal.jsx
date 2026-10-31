import React, { useEffect, useRef } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import { TOKENS } from '../theme/tokens';
import {
  vibrarConfirmacionBorrado,
  vibrarInicioPresionBorrado,
  vibrarSeleccionBascula,
} from '../services/haptics';
import { formatearFechaLegible } from '../utils/dateUtilsLocal';
import { useSafeInsets } from '../utils/useSafeInsets';

const DURACION_PULSACION_BORRADO_MS = 1000;

const ESTILOS_COMPRENSION = {
  Bien: {
    bg: '#FFFFFF',
    border: '#FFFFFF',
    text: '#0A0A0A',
    label: 'BIEN',
  },
  'Más o menos': {
    bg: '#3D3D3D',
    border: '#525252',
    text: '#FFFFFF',
    label: 'MÁS O MENOS',
  },
  'No tanto': {
    bg: '#242424',
    border: '#333333',
    text: '#B8B8B8',
    label: 'NO TANTO',
  },
  Nada: {
    bg: '#181818',
    border: '#262626',
    text: '#7A7A7A',
    label: 'NADA',
  },
};

/**
 * Cápsula de borrado sostenido de 1000ms con barra de llenado líquido en UI Thread.
 */
function CapsulaBorradoSeguroSesion({ onBorrar }) {
  const progreso = useSharedValue(0);
  const timerRef = useRef(null);
  const completadoRef = useRef(false);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  const handlePressIn = () => {
    completadoRef.current = false;
    vibrarInicioPresionBorrado();
    progreso.value = withTiming(1, {
      duration: DURACION_PULSACION_BORRADO_MS,
      easing: Easing.linear,
    });

    timerRef.current = setTimeout(() => {
      completadoRef.current = true;
      vibrarConfirmacionBorrado();
      progreso.value = withTiming(0, { duration: 150 });
      if (typeof onBorrar === 'function') {
        onBorrar();
      }
    }, DURACION_PULSACION_BORRADO_MS);
  };

  const handlePressOut = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (!completadoRef.current) {
      progreso.value = withTiming(0, { duration: 180 });
    }
  };

  const estiloProgreso = useAnimatedStyle(() => ({
    width: `${progreso.value * 100}%`,
  }));

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={styles.botonBorradoContenedor}
      accessibilityRole="button"
      accessibilityLabel="Mantén presionado un segundo para eliminar la sesión"
    >
      <Animated.View style={[styles.barraProgresoFill, estiloProgreso]} />
      <View style={styles.contenidoBorrado}>
        <Feather name="trash-2" size={15} color={TOKENS.colors.danger} />
        <Text style={styles.textoBorrado}>Borrar (1s)</Text>
      </View>
    </TouchableOpacity>
  );
}

export default function DetalleSesionEstudioModal({
  visible = false,
  sesion = null,
  materia = null,
  onCerrar,
  onEditar,
  onBorrar,
}) {
  const insets = useSafeInsets();

  if (!visible || !sesion) {
    return null;
  }

  const nombreMateria = materia?.nombre || 'Sin materia';
  const categoriaMateria = materia?.categoria || 'Personal';
  const esEscuela = categoriaMateria === 'Escuela';
  const fechaTexto = formatearFechaLegible(sesion.fecha) || sesion.fecha;

  const configComprension =
    ESTILOS_COMPRENSION[sesion.comprension] || ESTILOS_COMPRENSION['Bien'];

  const handleIniciarEdicion = () => {
    vibrarSeleccionBascula();
    if (typeof onEditar === 'function') {
      onEditar(sesion);
    }
  };

  const handleEjecutarBorrado = () => {
    if (typeof onBorrar === 'function') {
      onBorrar(sesion.id, sesion.fecha);
    }
    if (typeof onCerrar === 'function') {
      onCerrar();
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      statusBarTranslucent
      onRequestClose={onCerrar}
    >
      <View style={[styles.contenedorModal, { paddingTop: insets.top }]}>
        {/* Cabecera */}
        <View style={styles.cabeceraModal}>
          <TouchableOpacity
            style={styles.botonCerrar}
            onPress={onCerrar}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityRole="button"
            accessibilityLabel="Cerrar detalle de sesión"
          >
            <Feather name="x" size={20} color={TOKENS.colors.textSecondary} />
          </TouchableOpacity>
          <Text style={styles.tituloModal}>Detalle de Sesión</Text>
          <View style={styles.espaciadorCabecera} />
        </View>

        {/* Contenido scrolleable */}
        <ScrollView
          style={styles.scrollDetalle}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + 90 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* Bloque Hero Materia & Fecha */}
          <View style={styles.tarjetaHero}>
            <View style={styles.filaBadgesHero}>
              <View
                style={[
                  styles.badgeCategoriaHero,
                  esEscuela ? styles.badgeEscuela : styles.badgePersonal,
                ]}
              >
                <Feather
                  name={esEscuela ? 'book' : 'compass'}
                  size={10}
                  color={esEscuela ? '#E0E0E0' : '#A0A0A0'}
                  style={{ marginRight: 4 }}
                />
                <Text
                  style={[
                    styles.textoBadgeCategoriaHero,
                    { color: esEscuela ? '#E0E0E0' : '#A0A0A0' },
                  ]}
                >
                  {categoriaMateria.toUpperCase()}
                </Text>
              </View>

              <View style={styles.badgeFechaHero}>
                <Feather
                  name="calendar"
                  size={10}
                  color={TOKENS.colors.textSecondary}
                  style={{ marginRight: 4 }}
                />
                <Text style={styles.textoBadgeFechaHero}>{fechaTexto}</Text>
              </View>
            </View>

            <Text style={styles.tituloHeroMateria}>{nombreMateria}</Text>
          </View>

          {/* Bloque Métricas (Comprensión & Duración) */}
          <View style={styles.filaMetricasDuales}>
            <View style={styles.tarjetaMetrica}>
              <Text style={styles.labelMetrica}>COMPRENSIÓN</Text>
              <View
                style={[
                  styles.badgeComprensionDetalle,
                  {
                    backgroundColor: configComprension.bg,
                    borderColor: configComprension.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.textoBadgeComprensionDetalle,
                    { color: configComprension.text },
                  ]}
                >
                  {configComprension.label}
                </Text>
              </View>
            </View>

            <View style={styles.tarjetaMetrica}>
              <Text style={styles.labelMetrica}>DURACIÓN</Text>
              <View style={styles.filaValorDuracion}>
                <Feather
                  name="clock"
                  size={14}
                  color={TOKENS.colors.textSecondary}
                  style={{ marginRight: 6 }}
                />
                <Text style={styles.valorDuracion}>{sesion.minutos} min</Text>
              </View>
            </View>
          </View>

          {/* Bloque Tema */}
          <View style={styles.tarjetaSeccion}>
            <Text style={styles.labelSeccion}>TEMA ESTUDIADO</Text>
            <Text style={styles.textoTemaDetalle}>{sesion.tema}</Text>
          </View>

          {/* Bloque Apuntes Completos */}
          <View style={styles.tarjetaSeccion}>
            <View style={styles.filaCabeceraSeccion}>
              <Text style={styles.labelSeccion}>APUNTES Y NOTAS</Text>
              <Feather
                name="file-text"
                size={12}
                color={TOKENS.colors.textSecondary}
              />
            </View>
            <View style={styles.contenedorTextoApuntes}>
              <Text style={styles.textoApuntesDetalle} selectable>
                {sesion.apuntes}
              </Text>
            </View>
          </View>
        </ScrollView>

        {/* Barra Inferior Fija de Acciones Ergonómicas */}
        <View
          style={[
            styles.stickyFooterThumbZone,
            { paddingBottom: insets.bottom + 12 },
          ]}
        >
          <TouchableOpacity
            style={styles.botonSecundarioEditar}
            onPress={handleIniciarEdicion}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Editar sesión"
          >
            <Feather
              name="edit-2"
              size={16}
              color={TOKENS.colors.textPrimary}
              style={{ marginRight: 6 }}
            />
            <Text style={styles.textoBotonSecundarioEditar}>Editar sesión</Text>
          </TouchableOpacity>

          {/* Botón Borrado Sostenido 1000ms */}
          <CapsulaBorradoSeguroSesion onBorrar={handleEjecutarBorrado} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  contenedorModal: {
    flex: 1,
    backgroundColor: TOKENS.colors.canvas,
  },
  cabeceraModal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: TOKENS.spacing.md,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: TOKENS.colors.borderDefault,
    backgroundColor: TOKENS.colors.surface,
  },
  botonCerrar: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tituloModal: {
    color: TOKENS.colors.textPrimary,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  espaciadorCabecera: {
    width: 44,
  },
  scrollDetalle: {
    flex: 1,
  },
  scrollContent: {
    padding: TOKENS.spacing.md,
    gap: 14,
  },
  tarjetaHero: {
    backgroundColor: TOKENS.colors.surface,
    borderRadius: TOKENS.radii.lg,
    borderWidth: 1,
    borderColor: TOKENS.colors.borderDefault,
    padding: 18,
  },
  filaBadgesHero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
    flexWrap: 'wrap',
  },
  badgeCategoriaHero: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: TOKENS.radii.xs,
    paddingHorizontal: 8,
    paddingVertical: 3,
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
  textoBadgeCategoriaHero: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  badgeFechaHero: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: TOKENS.colors.surfaceElevated,
    borderRadius: TOKENS.radii.xs,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: TOKENS.colors.borderSubtle,
  },
  textoBadgeFechaHero: {
    color: TOKENS.colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
  },
  tituloHeroMateria: {
    color: TOKENS.colors.textPrimary,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  filaMetricasDuales: {
    flexDirection: 'row',
    gap: 12,
  },
  tarjetaMetrica: {
    flex: 1,
    backgroundColor: TOKENS.colors.surface,
    borderRadius: TOKENS.radii.md,
    borderWidth: 1,
    borderColor: TOKENS.colors.borderDefault,
    padding: 14,
    justifyContent: 'center',
  },
  labelMetrica: {
    color: TOKENS.colors.textMuted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  badgeComprensionDetalle: {
    alignSelf: 'flex-start',
    borderRadius: TOKENS.radii.xs,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
  },
  textoBadgeComprensionDetalle: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  filaValorDuracion: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  valorDuracion: {
    color: TOKENS.colors.textPrimary,
    fontSize: 15,
    fontWeight: '800',
  },
  tarjetaSeccion: {
    backgroundColor: TOKENS.colors.surface,
    borderRadius: TOKENS.radii.md,
    borderWidth: 1,
    borderColor: TOKENS.colors.borderDefault,
    padding: 16,
  },
  filaCabeceraSeccion: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  labelSeccion: {
    color: TOKENS.colors.textMuted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  textoTemaDetalle: {
    color: TOKENS.colors.textPrimary,
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 22,
  },
  contenedorTextoApuntes: {
    backgroundColor: TOKENS.colors.canvas,
    borderRadius: TOKENS.radii.sm,
    borderWidth: 1,
    borderColor: TOKENS.colors.borderSubtle,
    padding: 14,
  },
  textoApuntesDetalle: {
    color: '#D4D4D4',
    fontSize: 14,
    lineHeight: 22,
  },
  stickyFooterThumbZone: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: TOKENS.colors.surface,
    borderTopWidth: 1,
    borderTopColor: TOKENS.colors.borderDefault,
    paddingHorizontal: TOKENS.spacing.md,
    paddingTop: 12,
    flexDirection: 'row',
    gap: 12,
  },
  botonSecundarioEditar: {
    flex: 1,
    height: TOKENS.touchTarget.ctaHeight,
    backgroundColor: TOKENS.colors.surfaceElevated,
    borderRadius: TOKENS.radii.md,
    borderWidth: 1,
    borderColor: TOKENS.colors.borderStrong,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textoBotonSecundarioEditar: {
    color: TOKENS.colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  botonBorradoContenedor: {
    flex: 1,
    height: TOKENS.touchTarget.ctaHeight,
    backgroundColor: TOKENS.colors.dangerBg,
    borderRadius: TOKENS.radii.md,
    borderWidth: 1,
    borderColor: TOKENS.colors.danger,
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'center',
  },
  barraProgresoFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: TOKENS.colors.danger,
    opacity: 0.55,
  },
  contenidoBorrado: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  textoBorrado: {
    color: TOKENS.colors.danger,
    fontSize: 13,
    fontWeight: '800',
  },
});
