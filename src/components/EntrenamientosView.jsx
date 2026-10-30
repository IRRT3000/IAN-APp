import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withSpring,
} from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import SelectorSemanal from './SelectorSemanal';
import CatalogoEjerciciosModal from './CatalogoEjerciciosModal';
import LiveModeModal from './LiveModeModal';
import CalculadoraPesoModal from './CalculadoraPesoModal';
import {
  cargarCatalogoPersonalizado,
  cargarSesionActivaDraft,
  eliminarEntrenamiento,
  eliminarSesionActivaDraft,
  guardarEntrenamiento,
  obtenerDiasConActividad,
  obtenerFechaLocal,
} from '../services/storage';
import {
  obtenerColorGrupo,
} from '../constants/catalogoEjercicios';
import {
  vibrarConfirmacionBorrado,
  vibrarInicioPresionBorrado,
  vibrarSeleccionBascula,
} from '../services/haptics';
import { TOKENS } from '../theme/tokens';

const DURACION_PULSACION_BORRADO_MS = 1000;

const obtenerIconoImplementoFeather = (implemento) => {
  switch (implemento) {
    case 'Barra':
      return 'activity';
    case 'Mancuerna':
      return 'disc';
    case 'Polea':
      return 'sliders';
    case 'Máquina':
      return 'settings';
    case 'Corporal':
      return 'user';
    default:
      return 'zap';
  }
};

/**
 * Cápsula de Progreso Líquido para borrado sostenido de 1000ms en UI Thread (Spec 006).
 */
function CapsulaBorradoSeguro({ onBorrar, onAvisoCorto }) {
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

/**
 * Tarjeta individual de entrenamiento con acordeón colapsable y resorte (Spec 006).
 */
function TarjetaEntrenamientoItem({
  item,
  esHoy,
  mostrandoAviso,
  onBorrar,
  onAvisoCorto,
}) {
  const [expandido, setExpandido] = useState(false);
  const tieneSeriesDetalle =
    Array.isArray(item.seriesDetalle) && item.seriesDetalle.length > 0;
  const colorGrupo = obtenerColorGrupo(item.grupoMuscular);
  const iconoFeather = obtenerIconoImplementoFeather(item.implemento);

  const alternarExpandido = () => {
    vibrarSeleccionBascula();
    setExpandido((prev) => !prev);
  };

  return (
    <View style={styles.tarjetaEntrenamiento}>
      <View style={styles.cabeceraTarjeta}>
        <View style={styles.infoTituloEjercicio}>
          <View style={styles.filaBadgesTarjeta}>
            {item.grupoMuscular ? (
              <View style={styles.badgeGrupoTarjeta}>
                <Text style={styles.textoBadgeGrupoTarjeta}>
                  {item.grupoMuscular.toUpperCase()}
                </Text>
              </View>
            ) : null}

            {item.implemento ? (
              <View style={styles.badgeImplementoTarjeta}>
                <Feather
                  name={iconoFeather}
                  size={10}
                  color={TOKENS.colors.textSecondary}
                  style={{ marginRight: 4 }}
                />
                <Text style={styles.textoBadgeImplementoTarjeta}>
                  {item.implemento}
                </Text>
              </View>
            ) : null}
          </View>

          <Text style={styles.nombreEjercicioTarjeta}>{item.ejercicio}</Text>
        </View>

        {esHoy ? (
          <CapsulaBorradoSeguro
            onBorrar={() => onBorrar(item)}
            onAvisoCorto={() => onAvisoCorto(item.id)}
          />
        ) : (
          <View style={styles.badgeSoloLecturaItem}>
            <Feather
              name="lock"
              size={10}
              color={TOKENS.colors.textMuted}
              style={{ marginRight: 4 }}
            />
            <Text style={styles.textoBadgeSoloLecturaItem}>Historial</Text>
          </View>
        )}
      </View>

      <View style={styles.filaMetricasTarjeta}>
        <View style={styles.bloqueMetrica}>
          <Text style={styles.etiquetaMetrica}>SERIES</Text>
          <Text style={styles.valorMetrica}>{item.series}</Text>
        </View>
        <View style={styles.bloqueMetrica}>
          <Text style={styles.etiquetaMetrica}>REPS</Text>
          <Text style={styles.valorMetrica}>{item.repeticiones}</Text>
        </View>
        <View style={[styles.bloqueMetrica, styles.bloqueMetricaAcento]}>
          <Text style={styles.etiquetaMetrica}>PESO MÁX</Text>
          <Text style={[styles.valorMetrica, styles.valorMetricaAcento]}>
            {item.pesoMaximo ?? item.peso} kg
          </Text>
        </View>
        {item.volumenTotal ? (
          <View style={styles.bloqueMetrica}>
            <Text style={styles.etiquetaMetrica}>VOLUMEN</Text>
            <Text style={styles.valorMetrica}>{item.volumenTotal} kg</Text>
          </View>
        ) : null}
      </View>

      {tieneSeriesDetalle ? (
        <View style={styles.seccionDesglose}>
          <TouchableOpacity
            style={styles.botonAlternarDesglose}
            activeOpacity={0.7}
            onPress={alternarExpandido}
          >
            <Text style={styles.textoAlternarDesglose}>
              {expandido
                ? 'Ocultar desglose de series'
                : `Ver ${item.seriesDetalle.length} series registradas`}
            </Text>
            <Feather
              name={expandido ? 'chevron-up' : 'chevron-down'}
              size={14}
              color={TOKENS.colors.textSecondary}
            />
          </TouchableOpacity>

          {expandido ? (
            <View style={styles.filaChipsSeries}>
              {item.seriesDetalle.map((serieItem, sIdx) => (
                <View key={String(sIdx)} style={styles.chipSerieDetalle}>
                  <Text style={styles.numeroSerieChip}>S{serieItem.serie}</Text>
                  <Text style={styles.textoSerieChip}>
                    {serieItem.peso}kg × {serieItem.repeticiones}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>
      ) : null}

      {mostrandoAviso ? (
        <View style={styles.bannerAvisoBorrado}>
          <Feather
            name="alert-circle"
            size={12}
            color={TOKENS.colors.danger}
            style={{ marginRight: 6 }}
          />
          <Text style={styles.textoAvisoBorrado}>
            Mantén presionado 1 segundo para eliminar este ejercicio
          </Text>
        </View>
      ) : null}
    </View>
  );
}

export default function EntrenamientosView({
  entrenamientos = [],
  diasConActividad = [],
  onEntrenamientosActualizados,
  onLiveModeChange,
}) {
  const [fechaSeleccionada, setFechaSeleccionada] = useState(obtenerFechaLocal());
  const [catalogoModalVisible, setCatalogoModalVisible] = useState(false);
  const [calculadoraVisible, setCalculadoraVisible] = useState(false);
  const [liveModeVisible, setLiveModeVisible] = useState(false);
  const [ejercicioActivo, setEjercicioActivo] = useState(null);
  const [draftSesion, setDraftSesion] = useState(null);
  const [ejerciciosPersonalizados, setEjerciciosPersonalizados] = useState([]);
  const [avisoBorradoId, setAvisoBorradoId] = useState(null);
  const timerAvisoRef = useRef(null);

  const hoyDinamico = obtenerFechaLocal();
  const esHoy = fechaSeleccionada === hoyDinamico;

  const cambiarEstadoLiveMode = useCallback(
    (activo) => {
      setLiveModeVisible(activo);
      if (typeof onLiveModeChange === 'function') {
        onLiveModeChange(activo);
      }
    },
    [onLiveModeChange]
  );

  useEffect(() => {
    let montado = true;

    const inicializar = async () => {
      try {
        const [catalogoPers, draftGuardado] = await Promise.all([
          cargarCatalogoPersonalizado(),
          cargarSesionActivaDraft(),
        ]);

        if (!montado) return;

        setEjerciciosPersonalizados(catalogoPers);

        if (draftGuardado && draftGuardado.ejercicio) {
          setDraftSesion(draftGuardado);
          setEjercicioActivo({
            id: draftGuardado.idEjercicio || `draft-${Date.now()}`,
            nombre: draftGuardado.ejercicio,
            grupoMuscular: draftGuardado.grupoMuscular || 'Pecho',
            implemento: draftGuardado.implemento || 'Barra',
          });
          cambiarEstadoLiveMode(true);
        }
      } catch (err) {
        console.error('Error al inicializar EntrenamientosView:', err);
      }
    };

    inicializar();

    return () => {
      montado = false;
      if (timerAvisoRef.current) {
        clearTimeout(timerAvisoRef.current);
      }
    };
  }, [cambiarEstadoLiveMode]);

  const entrenamientosFecha = useMemo(() => {
    return entrenamientos.filter((item) => item.fecha === fechaSeleccionada);
  }, [entrenamientos, fechaSeleccionada]);

  const manejarSeleccionarEjercicio = (ejercicio) => {
    setCatalogoModalVisible(false);
    setDraftSesion(null);
    setEjercicioActivo(ejercicio);
    cambiarEstadoLiveMode(true);
  };

  const manejarTerminarLiveMode = async (datosEjercicio) => {
    try {
      const fechaConsolidacion = obtenerFechaLocal();

      const listaActualizada = await guardarEntrenamiento({
        ejercicio: datosEjercicio.ejercicio,
        grupoMuscular: datosEjercicio.grupoMuscular,
        implemento: datosEjercicio.implemento,
        seriesDetalle: datosEjercicio.seriesDetalle,
        fecha: fechaConsolidacion,
      });

      await eliminarSesionActivaDraft();

      cambiarEstadoLiveMode(false);
      setEjercicioActivo(null);
      setDraftSesion(null);
      setFechaSeleccionada(fechaConsolidacion);

      if (typeof onEntrenamientosActualizados === 'function') {
        onEntrenamientosActualizados(listaActualizada);
      }
    } catch (err) {
      console.error('Error al terminar sesión activa:', err);
      Alert.alert(
        'Error',
        'No se pudo guardar el entrenamiento en el almacenamiento local.'
      );
    }
  };

  const manejarDescartarLiveMode = async () => {
    cambiarEstadoLiveMode(false);
    setEjercicioActivo(null);
    setDraftSesion(null);
  };

  const mostrarAvisoToqueCorto = (idEntrenamiento) => {
    if (!esHoy) return;
    setAvisoBorradoId(idEntrenamiento);
    if (timerAvisoRef.current) {
      clearTimeout(timerAvisoRef.current);
    }
    timerAvisoRef.current = setTimeout(() => {
      setAvisoBorradoId(null);
    }, 2500);
  };

  const ejecutarBorradoEntrenamiento = async (idEntrenamiento) => {
    try {
      const listaActualizada = await eliminarEntrenamiento(idEntrenamiento);
      setAvisoBorradoId(null);
      if (typeof onEntrenamientosActualizados === 'function') {
        onEntrenamientosActualizados(listaActualizada);
      }
    } catch (error) {
      Alert.alert(
        'Error al eliminar',
        error?.message || 'No se pudo eliminar el entrenamiento.',
        [{ text: 'Entendido', style: 'cancel' }]
      );
    }
  };

  const solicitarConfirmacionBorrado = (item) => {
    if (!esHoy) return;
    setAvisoBorradoId(null);
    Alert.alert(
      'Eliminar entrenamiento',
      `¿Estás seguro de eliminar "${item.ejercicio}"?\n\nEsta acción borrará el registro definitivamente del historial.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => ejecutarBorradoEntrenamiento(item.id),
        },
      ]
    );
  };

  return (
    <View style={styles.contenedor}>
      <SelectorSemanal
        fechaSeleccionada={fechaSeleccionada}
        onSeleccionarFecha={setFechaSeleccionada}
        diasConActividad={diasConActividad}
      />

      {!esHoy ? (
        <View style={styles.bannerSoloLectura}>
          <Feather
            name="lock"
            size={13}
            color={TOKENS.colors.textSecondary}
            style={{ marginRight: 8 }}
          />
          <Text style={styles.textoSoloLectura}>
            Historial ({fechaSeleccionada}) · Modo solo lectura. Días pasados no
            pueden modificarse.
          </Text>
        </View>
      ) : null}

      {esHoy ? (
        <TouchableOpacity
          style={styles.botonIniciarEjercicio}
          activeOpacity={0.85}
          onPress={() => setCatalogoModalVisible(true)}
        >
          <Feather
            name="plus"
            size={18}
            color={TOKENS.colors.textInverse}
            style={{ marginRight: 8 }}
          />
          <Text style={styles.textoIniciarEjercicio}>
            Iniciar Nuevo Ejercicio
          </Text>
        </TouchableOpacity>
      ) : null}

      <View style={styles.encabezadoLista}>
        <View style={styles.columnaTituloEncabezado}>
          <Text style={styles.tituloSeccion}>
            {esHoy ? 'Entrenamientos de Hoy' : `Sesión del ${fechaSeleccionada}`}
          </Text>
          <Text style={styles.contadorLista}>
            {entrenamientosFecha.length} ejercicio(s)
          </Text>
        </View>

        <TouchableOpacity
          style={styles.botonCalculadoraPastilla}
          activeOpacity={0.7}
          onPress={() => {
            vibrarSeleccionBascula();
            setCalculadoraVisible(true);
          }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityLabel="Abrir calculadora de conversión de peso"
        >
          <Feather
            name="repeat"
            size={13}
            color={TOKENS.colors.textPrimary}
            style={{ marginRight: 6 }}
          />
          <Text style={styles.textoBotonCalculadoraPastilla}>Lbs ⟷ Kg</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={entrenamientosFecha}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <TarjetaEntrenamientoItem
            item={item}
            esHoy={esHoy}
            mostrandoAviso={avisoBorradoId === item.id}
            onBorrar={solicitarConfirmacionBorrado}
            onAvisoCorto={mostrarAvisoToqueCorto}
          />
        )}
        contentContainerStyle={styles.listaContenido}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.estadoVacio}>
            <Feather
              name="activity"
              size={36}
              color={TOKENS.colors.textMuted}
              style={{ marginBottom: 12 }}
            />
            <Text style={styles.textoEstadoVacio}>
              {esHoy
                ? 'Aún no has registrado ejercicios hoy.'
                : `No hubo entrenamientos registrados el ${fechaSeleccionada}.`}
            </Text>
            {esHoy ? (
              <Text style={styles.subtextoEstadoVacio}>
                Pulsa en &quot;Iniciar Nuevo Ejercicio&quot; para registrar tus series con
                autorrelleno y auto-save.
              </Text>
            ) : null}
          </View>
        }
      />

      <CatalogoEjerciciosModal
        visible={catalogoModalVisible}
        onCerrar={() => setCatalogoModalVisible(false)}
        onSeleccionarEjercicio={manejarSeleccionarEjercicio}
        ejerciciosPersonalizados={ejerciciosPersonalizados}
        onEjercicioPersonalizadoCreado={setEjerciciosPersonalizados}
      />

      <LiveModeModal
        visible={liveModeVisible}
        ejercicioActivo={ejercicioActivo}
        draftInicial={draftSesion}
        onTerminarEjercicio={manejarTerminarLiveMode}
        onDescartarEjercicio={manejarDescartarLiveMode}
      />

      <CalculadoraPesoModal
        visible={calculadoraVisible}
        onCerrar={() => setCalculadoraVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    flex: 1,
    backgroundColor: TOKENS.colors.canvas,
  },
  bannerSoloLectura: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: TOKENS.colors.surface,
    borderRadius: TOKENS.radii.sm,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: TOKENS.colors.borderDefault,
  },
  textoSoloLectura: {
    flex: 1,
    color: TOKENS.colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
  },
  botonIniciarEjercicio: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: TOKENS.colors.accentWhite,
    borderRadius: TOKENS.radii.md,
    paddingVertical: 14,
    marginBottom: 16,
    elevation: 3,
  },
  textoIniciarEjercicio: {
    color: TOKENS.colors.textInverse,
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  columnaTituloEncabezado: {
    flex: 1,
    marginRight: 8,
  },
  botonCalculadoraPastilla: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: TOKENS.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: TOKENS.colors.borderDefault,
    borderRadius: TOKENS.radii.pill,
    paddingHorizontal: 12,
    minHeight: 44,
  },
  textoBotonCalculadoraPastilla: {
    color: TOKENS.colors.textPrimary,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  encabezadoLista: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  tituloSeccion: {
    color: TOKENS.colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  contadorLista: {
    color: TOKENS.colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  listaContenido: {
    paddingBottom: 110, // Scroll clearance mandatorio
  },
  tarjetaEntrenamiento: {
    backgroundColor: TOKENS.colors.surface,
    borderRadius: TOKENS.radii.md,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: TOKENS.colors.borderDefault,
    elevation: 2,
  },
  cabeceraTarjeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  infoTituloEjercicio: {
    flex: 1,
    marginRight: 8,
  },
  filaBadgesTarjeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  badgeGrupoTarjeta: {
    borderWidth: 1,
    borderColor: TOKENS.colors.borderStrong,
    backgroundColor: TOKENS.colors.surfaceElevated,
    borderRadius: TOKENS.radii.xs,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginRight: 6,
  },
  textoBadgeGrupoTarjeta: {
    color: TOKENS.colors.textSecondary,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  badgeImplementoTarjeta: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: TOKENS.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: TOKENS.colors.borderSubtle,
    borderRadius: TOKENS.radii.xs,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  textoBadgeImplementoTarjeta: {
    color: TOKENS.colors.textSecondary,
    fontSize: 10,
    fontWeight: '600',
  },
  nombreEjercicioTarjeta: {
    color: TOKENS.colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  capsulaBorradoContenedor: {
    width: 58,
    height: 30,
    borderRadius: TOKENS.radii.pill,
    backgroundColor: TOKENS.colors.dangerBg,
    borderWidth: 1,
    borderColor: 'rgba(255, 69, 58, 0.4)',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  capsulaBorradoFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    backgroundColor: TOKENS.colors.danger,
    borderRadius: TOKENS.radii.pill,
  },
  capsulaBorradoContenido: {
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 2,
  },
  capsulaBorradoTexto: {
    color: TOKENS.colors.danger,
    fontSize: 11,
    fontWeight: '800',
    marginLeft: 4,
  },
  badgeSoloLecturaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: TOKENS.colors.surfaceElevated,
    borderRadius: TOKENS.radii.xs,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: TOKENS.colors.borderSubtle,
  },
  textoBadgeSoloLecturaItem: {
    color: TOKENS.colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
  },
  filaMetricasTarjeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 6,
  },
  bloqueMetrica: {
    flex: 1,
    backgroundColor: TOKENS.colors.surfaceElevated,
    borderRadius: TOKENS.radii.sm,
    paddingVertical: 6,
    paddingHorizontal: 6,
    marginHorizontal: 2,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: TOKENS.colors.borderSubtle,
  },
  bloqueMetricaAcento: {
    borderColor: TOKENS.colors.borderStrong,
  },
  etiquetaMetrica: {
    color: TOKENS.colors.textMuted,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  valorMetrica: {
    color: TOKENS.colors.textPrimary,
    fontSize: 13,
    fontWeight: '800',
    marginTop: 2,
  },
  valorMetricaAcento: {
    color: TOKENS.colors.textPrimary,
  },
  seccionDesglose: {
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: TOKENS.colors.borderSubtle,
    paddingTop: 8,
  },
  botonAlternarDesglose: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  textoAlternarDesglose: {
    color: TOKENS.colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  filaChipsSeries: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  chipSerieDetalle: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: TOKENS.colors.surfaceElevated,
    borderRadius: TOKENS.radii.xs,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 6,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: TOKENS.colors.borderDefault,
  },
  numeroSerieChip: {
    color: TOKENS.colors.textSecondary,
    fontSize: 10,
    fontWeight: '800',
    marginRight: 4,
  },
  textoSerieChip: {
    color: TOKENS.colors.textPrimary,
    fontSize: 11,
    fontWeight: '700',
  },
  bannerAvisoBorrado: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: TOKENS.colors.dangerBg,
    borderRadius: TOKENS.radii.xs,
    paddingVertical: 6,
    paddingHorizontal: 8,
    marginTop: 8,
  },
  textoAvisoBorrado: {
    color: TOKENS.colors.danger,
    fontSize: 11,
    fontWeight: '600',
    flex: 1,
  },
  estadoVacio: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
    backgroundColor: TOKENS.colors.surface,
    borderRadius: TOKENS.radii.md,
    borderWidth: 1,
    borderColor: TOKENS.colors.borderSubtle,
    marginTop: 8,
  },
  textoEstadoVacio: {
    color: TOKENS.colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  subtextoEstadoVacio: {
    color: TOKENS.colors.textSecondary,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
});
