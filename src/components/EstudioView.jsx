import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import { TOKENS } from '../theme/tokens';
import { vibrarSeleccionBascula } from '../services/haptics';
import { formatearFechaLegible } from '../utils/dateUtilsLocal';
import { useSafeInsets } from '../utils/useSafeInsets';
import { useEstudio } from '../utils/useEstudio';
import SelectorSemanal from './SelectorSemanal';
import TarjetaSesionEstudio from './TarjetaSesionEstudio';
import SesionEstudioModal from './SesionEstudioModal';
import DetalleSesionEstudioModal from './DetalleSesionEstudioModal';
import GestionMateriasModal from './GestionMateriasModal';
import ResumenEstudioCard from './ResumenEstudioCard';

const CONFIG_RESORTE = {
  damping: 15,
  stiffness: 250,
};

/**
 * Pastilla animada con resorte para la barra horizontal de filtros por materia.
 */
const PastillaFiltro = React.memo(function PastillaFiltro({
  etiqueta,
  esActiva,
  categoria,
  onPress,
}) {
  const scale = useSharedValue(1);

  const handlePressIn = () => {
    scale.value = withSpring(0.94, CONFIG_RESORTE);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1.0, CONFIG_RESORTE);
  };

  const estiloAnimado = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    vibrarSeleccionBascula();
    onPress();
  };

  return (
    <Animated.View style={[styles.envoltorioPastilla, estiloAnimado]}>
      <TouchableOpacity
        style={[styles.pastillaFiltro, esActiva && styles.pastillaFiltroActiva]}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={handlePress}
        activeOpacity={0.85}
        accessibilityRole="tab"
        accessibilityState={{ selected: esActiva }}
      >
        {categoria ? (
          <View
            style={[
              styles.puntoCategoriaPastilla,
              { backgroundColor: categoria === 'Escuela' ? '#FFFFFF' : '#8E8E93' },
            ]}
          />
        ) : (
          <Feather
            name="grid"
            size={12}
            color={esActiva ? TOKENS.colors.textInverse : TOKENS.colors.textSecondary}
            style={{ marginRight: 6 }}
          />
        )}
        <Text
          style={[
            styles.textoPastillaFiltro,
            esActiva && styles.textoPastillaFiltroActiva,
          ]}
          numberOfLines={1}
        >
          {etiqueta}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
});

export default function EstudioView({
  sesionesExternas = [],
  materiasExternas = [],
  datosCargados = false,
  onSesionesActualizadas,
  onMateriasActualizadas,
}) {
  const insets = useSafeInsets();

  const {
    fechaHoy,
    fechaSeleccionada,
    setFechaSeleccionada,
    materiaFiltro,
    setMateriaFiltro,
    diasConSesiones,
    sesionesDelDia,
    sesionesDeMateria,
    conteoPorMateria,
    obtenerMateriaPorId,
    crearSesion,
    actualizarSesion,
    borrarSesion,
    crearNuevaMateria,
    editarMateria,
    borrarMateria,
    entradaResumen,
    analizando,
    progreso,
    manejarAnalizar,
  } = useEstudio({
    sesionesExternas,
    materiasExternas,
    onSesionesActualizadas,
    onMateriasActualizadas,
  });

  // Modales
  const [modalSesionVisible, setModalSesionVisible] = useState(false);
  const [sesionEditando, setSesionEditando] = useState(null);
  const [modalDetalleVisible, setModalDetalleVisible] = useState(false);
  const [sesionSeleccionadaDetalle, setSesionSeleccionadaDetalle] = useState(null);
  const [modalGestionMateriasVisible, setModalGestionMateriasVisible] = useState(false);

  const esHoy = fechaSeleccionada === fechaHoy;
  const materiaFiltroObj = useMemo(
    () => (materiaFiltro ? obtenerMateriaPorId(materiaFiltro) : null),
    [materiaFiltro, obtenerMateriaPorId]
  );

  const sesionesAMostrar = materiaFiltro ? sesionesDeMateria : sesionesDelDia;

  const tituloPantalla = useMemo(() => {
    if (materiaFiltroObj) {
      return `Materia: ${materiaFiltroObj.nombre}`;
    }
    if (esHoy) {
      return 'Estudio de hoy';
    }
    return `Estudio del ${fechaSeleccionada.slice(8, 10)}/${fechaSeleccionada.slice(5, 7)}`;
  }, [materiaFiltroObj, esHoy, fechaSeleccionada]);

  // Manejadores
  const handleAbrirNuevaSesion = useCallback(() => {
    vibrarSeleccionBascula();
    setSesionEditando(null);
    setModalSesionVisible(true);
  }, []);

  const handleSeleccionarSesion = useCallback((sesion) => {
    setSesionSeleccionadaDetalle(sesion);
    setModalDetalleVisible(true);
  }, []);

  const handleIniciarEditarDesdeDetalle = useCallback((sesion) => {
    setModalDetalleVisible(false);
    setSesionEditando(sesion);
    setModalSesionVisible(true);
  }, []);

  const handleGuardarSesion = useCallback(
    async (datos) => {
      if (sesionEditando) {
        await actualizarSesion(sesionEditando.id, sesionEditando.fecha, datos);
      } else {
        await crearSesion(datos);
      }
    },
    [sesionEditando, actualizarSesion, crearSesion]
  );

  const claveTransicion = materiaFiltro
    ? `materia-${materiaFiltro}`
    : `dia-${fechaSeleccionada}`;

  return (
    <View style={styles.contenedor}>
      {/* 1. Cabecera */}
      <View style={styles.cabecera}>
        <View style={styles.bloqueTitulo}>
          <Text style={styles.etiquetaSeccion}>HÁBITO DE APRENDIZAJE</Text>
          <Text style={styles.tituloPantalla} numberOfLines={1}>
            {tituloPantalla}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.botonCabecera}
          onPress={() => {
            vibrarSeleccionBascula();
            setModalGestionMateriasVisible(true);
          }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityRole="button"
          accessibilityLabel="Abrir gestión de materias"
        >
          <Feather name="sliders" size={18} color={TOKENS.colors.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* 2. Selector Semanal (Visible en modo por día) */}
      {!materiaFiltro ? (
        <SelectorSemanal
          fechaSeleccionada={fechaSeleccionada}
          onSeleccionarFecha={setFechaSeleccionada}
          diasConActividad={diasConSesiones}
        />
      ) : null}

      {/* 3. Filtros Horizontales por Materia */}
      <View style={styles.contenedorFiltros}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollFiltrosContent}
        >
          <PastillaFiltro
            etiqueta="Todas"
            esActiva={!materiaFiltro}
            onPress={() => setMateriaFiltro(null)}
          />

          {materiasExternas.map((mat) => (
            <PastillaFiltro
              key={mat.id}
              etiqueta={mat.nombre}
              categoria={mat.categoria}
              esActiva={materiaFiltro === mat.id}
              onPress={() => setMateriaFiltro(mat.id)}
            />
          ))}
        </ScrollView>
      </View>

      {/* 4. Cuerpo de Sesiones con FadeIn */}
      {!datosCargados ? (
        <View style={styles.estadoCargando}>
          <ActivityIndicator size="small" color={TOKENS.colors.accentWhite} />
          <Text style={styles.textoCargando}>Cargando sesiones de estudio...</Text>
        </View>
      ) : (
        <Animated.View
          key={claveTransicion}
          entering={FadeIn.duration(180)}
          style={styles.areaListaAnimada}
        >
          <FlatList
            data={sesionesAMostrar}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => {
              const mat = obtenerMateriaPorId(item.materiaId);
              return (
                <TarjetaSesionEstudio
                  sesion={item}
                  nombreMateria={mat.nombre}
                  categoriaMateria={mat.categoria}
                  mostrarFecha={Boolean(materiaFiltro)}
                  fechaFormateada={formatearFechaLegible(item.fecha)}
                  onPress={handleSeleccionarSesion}
                />
              );
            }}
            ListEmptyComponent={
              <View style={styles.estadoVacio}>
                <View style={styles.iconoEstadoVacioContenedor}>
                  <Feather
                    name="book-open"
                    size={36}
                    color={TOKENS.colors.textMuted}
                  />
                </View>
                <Text style={styles.textoEstadoVacio}>
                  Sin sesiones registradas
                </Text>
                <Text style={styles.subtextoEstadoVacio}>
                  {materiaFiltro
                    ? 'No tienes registros para esta materia todavía.'
                    : esHoy
                      ? 'Comienza tu primera sesión de estudio de hoy pulsando el botón inferior.'
                      : 'No registraste horas de estudio durante este día.'}
                </Text>
              </View>
            }
            ListFooterComponent={
              !materiaFiltro ? (
                <ResumenEstudioCard
                  esHoy={esHoy}
                  hayDatos={datosCargados}
                  sesionesHoy={sesionesDelDia}
                  entradaResumen={entradaResumen}
                  analizando={analizando}
                  progreso={progreso}
                  onAnalizar={manejarAnalizar}
                />
              ) : null
            }
            contentContainerStyle={[
              styles.listaContenido,
              { paddingBottom: insets.bottom + 140 },
            ]}
            showsVerticalScrollIndicator={false}
          />
        </Animated.View>
      )}

      {/* 5. Botón Primario Sticky en Thumb-Zone (54dp) */}
      <View
        style={[
          styles.stickyFooterThumbZone,
          { bottom: Math.max(insets.bottom, 12) + 68 },
        ]}
      >
        <TouchableOpacity
          style={styles.botonPrimarioNuevaSesion}
          activeOpacity={0.88}
          onPress={handleAbrirNuevaSesion}
          accessibilityRole="button"
          accessibilityLabel="Registrar nueva sesión de estudio"
        >
          <Feather
            name="plus"
            size={18}
            color={TOKENS.colors.textInverse}
            style={{ marginRight: 8 }}
          />
          <Text style={styles.textoBotonPrimario}>Nueva sesión de estudio</Text>
        </TouchableOpacity>
      </View>

      {/* Modal Crear / Editar Sesión */}
      {modalSesionVisible ? (
        <SesionEstudioModal
          visible={modalSesionVisible}
          esEdicion={Boolean(sesionEditando)}
          sesionInicial={sesionEditando}
          fechaSeleccionada={fechaSeleccionada}
          fechaHoy={fechaHoy}
          materias={materiasExternas}
          onCerrar={() => {
            setModalSesionVisible(false);
            setSesionEditando(null);
          }}
          onGuardar={handleGuardarSesion}
          onCrearMateria={crearNuevaMateria}
        />
      ) : null}

      {/* Modal Detalle Sesión */}
      <DetalleSesionEstudioModal
        visible={modalDetalleVisible}
        sesion={sesionSeleccionadaDetalle}
        materia={
          sesionSeleccionadaDetalle
            ? obtenerMateriaPorId(sesionSeleccionadaDetalle.materiaId)
            : null
        }
        onCerrar={() => {
          setModalDetalleVisible(false);
          setSesionSeleccionadaDetalle(null);
        }}
        onEditar={handleIniciarEditarDesdeDetalle}
        onBorrar={borrarSesion}
      />

      {/* Modal Gestión de Materias */}
      <GestionMateriasModal
        visible={modalGestionMateriasVisible}
        materias={materiasExternas}
        conteoPorMateria={conteoPorMateria}
        onCerrar={() => setModalGestionMateriasVisible(false)}
        onCrearMateria={crearNuevaMateria}
        onEditarMateria={editarMateria}
        onBorrarMateria={borrarMateria}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    flex: 1,
    backgroundColor: TOKENS.colors.canvas,
  },
  cabecera: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  bloqueTitulo: {
    flex: 1,
    marginRight: 10,
  },
  etiquetaSeccion: {
    ...TOKENS.typography.labelCategory,
    marginBottom: 2,
  },
  tituloPantalla: {
    color: TOKENS.colors.textPrimary,
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  botonCabecera: {
    width: 44,
    height: 44,
    borderRadius: TOKENS.radii.md,
    backgroundColor: TOKENS.colors.surface,
    borderWidth: 1,
    borderColor: TOKENS.colors.borderDefault,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contenedorFiltros: {
    marginBottom: 8,
    marginTop: 4,
  },
  scrollFiltrosContent: {
    paddingVertical: 2,
    gap: 8,
  },
  envoltorioPastilla: {
    marginRight: 2,
  },
  pastillaFiltro: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 38,
    paddingHorizontal: 14,
    borderRadius: TOKENS.radii.pill,
    backgroundColor: TOKENS.colors.surface,
    borderWidth: 1,
    borderColor: TOKENS.colors.borderDefault,
  },
  pastillaFiltroActiva: {
    backgroundColor: TOKENS.colors.accentWhite,
    borderColor: TOKENS.colors.accentWhite,
  },
  textoPastillaFiltro: {
    color: TOKENS.colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  textoPastillaFiltroActiva: {
    color: TOKENS.colors.textInverse,
    fontWeight: '800',
  },
  puntoCategoriaPastilla: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  areaListaAnimada: {
    flex: 1,
  },
  listaContenido: {
    paddingTop: 4,
  },
  estadoCargando: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
  },
  textoCargando: {
    color: TOKENS.colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    marginTop: 12,
  },
  estadoVacio: {
    backgroundColor: TOKENS.colors.surface,
    borderRadius: TOKENS.radii.md,
    borderWidth: 1,
    borderColor: TOKENS.colors.borderDefault,
    paddingVertical: 40,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  iconoEstadoVacioContenedor: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: TOKENS.colors.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: TOKENS.colors.borderSubtle,
  },
  textoEstadoVacio: {
    color: TOKENS.colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 6,
  },
  subtextoEstadoVacio: {
    color: TOKENS.colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    maxWidth: 280,
  },
  stickyFooterThumbZone: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 10,
  },
  botonPrimarioNuevaSesion: {
    height: TOKENS.touchTarget.ctaHeight,
    borderRadius: TOKENS.radii.md,
    backgroundColor: TOKENS.colors.accentWhite,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  textoBotonPrimario: {
    color: TOKENS.colors.textInverse,
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
});
