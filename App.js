// @refresh reset
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { BackHandler, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Animated, { FadeIn } from 'react-native-reanimated';
import BarraNavegacionInferior from './src/components/BarraNavegacionInferior';
import CambioFisicoView from './src/components/CambioFisicoView';
import EntrenamientosView from './src/components/EntrenamientosView';
import EstudioView from './src/components/EstudioView';
import HeatmapView from './src/components/HeatmapView';
import MenuBienvenida from './src/components/MenuBienvenida';
import NutricionView from './src/components/NutricionView';
import OnboardingBienvenidaModal from './src/components/OnboardingBienvenidaModal';
import PanelConfiguracionLateral from './src/components/PanelConfiguracionLateral';
import {
  PERFIL_USUARIO_BASE,
  alternarDiaDescanso,
  cargarCambiosFisicos,
  cargarComidas,
  cargarEntrenamientos,
  cargarPerfilUsuario,
  obtenerDiasConActividad,
  obtenerFechaLocal,
  obtenerResumenAnualHabitos,
} from './src/services/storage';
import {
  cargarMaterias,
  cargarSesionesEstudio,
} from './src/services/estudioStorage';
import { TOKENS } from './src/theme/tokens';
import { useSafeInsets } from './src/utils/useSafeInsets';

function AppPrincipal() {
  const insets = useSafeInsets();
  const [entrenamientos, setEntrenamientos] = useState([]);
  const [diasConActividad, setDiasConActividad] = useState([]);
  const [comidas, setComidas] = useState([]);
  const [cambiosFisicos, setCambiosFisicos] = useState([]);
  const [sesionesEstudio, setSesionesEstudio] = useState([]);
  const [materiasEstudio, setMateriasEstudio] = useState([]);
  const [datosEstudioCargados, setDatosEstudioCargados] = useState(false);
  const [perfilUsuario, setPerfilUsuario] = useState(PERFIL_USUARIO_BASE);
  const [vistaActiva, setVistaActiva] = useState('bienvenida');
  const [enLiveMode, setEnLiveMode] = useState(false);
  const [panelConfiguracionVisible, setPanelConfiguracionVisible] = useState(false);
  const [onboardingVisible, setOnboardingVisible] = useState(false);
  const [modoEdicionPerfil, setModoEdicionPerfil] = useState(false);
  const timerTransicionModalRef = useRef(null);

  // Funciones memoizadas para controlar el drawer de configuracion
  const abrirConfiguracion = useCallback(
    () => setPanelConfiguracionVisible(true),
    []
  );
  const cerrarConfiguracion = useCallback(
    () => setPanelConfiguracionVisible(false),
    []
  );

  // Defensa 9: Transición limpia si el Drawer de Configuración estaba abierto para evitar conflicto de doble <Modal>
  const abrirEdicionPerfil = useCallback(() => {
    if (timerTransicionModalRef.current) {
      clearTimeout(timerTransicionModalRef.current);
    }
    if (panelConfiguracionVisible) {
      setPanelConfiguracionVisible(false);
      timerTransicionModalRef.current = setTimeout(() => {
        setModoEdicionPerfil(true);
        setOnboardingVisible(true);
      }, 220);
    } else {
      setModoEdicionPerfil(true);
      setOnboardingVisible(true);
    }
  }, [panelConfiguracionVisible]);

  useEffect(() => {
    return () => {
      if (timerTransicionModalRef.current) {
        clearTimeout(timerTransicionModalRef.current);
      }
    };
  }, []);

  // Estados separados para el año del widget de Inicio y el año del Heatmap (RF-1, RF-4)
  const fechaHoy = obtenerFechaLocal();
  const anioActual = Number(fechaHoy.slice(0, 4));
  const [anioHeatmap, setAnioHeatmap] = useState(anioActual);
  const [resumenAnioActual, setResumenAnioActual] = useState({});
  const [resumenAnual, setResumenAnual] = useState({});

  // Recálculo reactivo y concurrente de los resúmenes de hábitos
  const refrescarHabitosConcurrentes = useCallback(
    async (nuevoAnioHeatmap = anioHeatmap) => {
      const esMismoAnio = nuevoAnioHeatmap === anioActual;

      const [delAnioActual, delAnioSeleccionado] = await Promise.all([
        obtenerResumenAnualHabitos(anioActual),
        esMismoAnio
          ? Promise.resolve(null)
          : obtenerResumenAnualHabitos(nuevoAnioHeatmap),
      ]);

      setResumenAnioActual(delAnioActual);
      setResumenAnual(esMismoAnio ? delAnioActual : delAnioSeleccionado);
    },
    [anioHeatmap, anioActual]
  );

  const sincronizarDatos = useCallback(async () => {
    const [
      listaGuardada,
      diasActivos,
      comidasGuardadas,
      cambiosGuardados,
      perfilCargado,
      sesionesCargadas,
      materiasCargadas,
    ] = await Promise.all([
      cargarEntrenamientos(),
      obtenerDiasConActividad(),
      cargarComidas(),
      cargarCambiosFisicos(),
      cargarPerfilUsuario(),
      cargarSesionesEstudio(),
      cargarMaterias(),
      refrescarHabitosConcurrentes(),

    ]);
    setEntrenamientos(listaGuardada);
    setDiasConActividad(diasActivos);
    setComidas(comidasGuardadas);
    setCambiosFisicos(cambiosGuardados);
    setPerfilUsuario(perfilCargado);
    setSesionesEstudio(sesionesCargadas);
    setMateriasEstudio(materiasCargadas);
    setDatosEstudioCargados(true);

    // Defensa 7: Activar onboarding únicamente tras resolver la carga asíncrona si no se ha completado
    if (!perfilCargado?.onboardingCompletado) {
      setModoEdicionPerfil(false);
      setOnboardingVisible(true);
    }
  }, [refrescarHabitosConcurrentes]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- spec futura
    sincronizarDatos();
  }, [sincronizarDatos]);

  // Soporte Android-First: BackHandler retorna a bienvenida antes de salir de la app (RF-4, Spec 010)
  useEffect(() => {
    const onBackPress = () => {
      if (onboardingVisible) {
        if (modoEdicionPerfil) {
          setOnboardingVisible(false);
          setModoEdicionPerfil(false);
          return true;
        }
        return true; // Bloquea salida accidental durante la calibración inicial
      }
      if (panelConfiguracionVisible) {
        setPanelConfiguracionVisible(false);
        return true;
      }
      if (enLiveMode) {
        return false; // LiveModeModal intercepta su propio BackHandler
      }
      if (vistaActiva !== 'bienvenida') {
        setVistaActiva('bienvenida');
        return true; // Intercepta el botón Atrás y regresa al dashboard de inicio
      }
      return false; // Permite el comportamiento nativo de salida en 'bienvenida'
    };

    const suscripcion = BackHandler.addEventListener(
      'hardwareBackPress',
      onBackPress
    );
    return () => suscripcion.remove();
  }, [
    vistaActiva,
    enLiveMode,
    panelConfiguracionVisible,
    onboardingVisible,
    modoEdicionPerfil,
  ]);

  const manejarCambiarAnioHeatmap = useCallback(
    async (nuevoAnio) => {
      setAnioHeatmap(nuevoAnio);
      await refrescarHabitosConcurrentes(nuevoAnio);
    },
    [refrescarHabitosConcurrentes]
  );

  const manejarAlternarDescanso = useCallback(
    async (fecha) => {
      await alternarDiaDescanso(fecha);
      const [diasActualizados] = await Promise.all([
        obtenerDiasConActividad(),
        refrescarHabitosConcurrentes(),

      ]);
      setDiasConActividad(diasActualizados);
    },
    [refrescarHabitosConcurrentes]
  );

  const entrenamientosDeHoy = useMemo(
    () => entrenamientos.filter((item) => item.fecha === fechaHoy),
    [entrenamientos, fechaHoy]
  );

  const comidasDeHoy = useMemo(
    () => comidas.filter((item) => item.fecha === fechaHoy),
    [comidas, fechaHoy]
  );

  const sesionesEstudioDeHoy = useMemo(
    () => sesionesEstudio.filter((item) => item.fecha === fechaHoy),
    [sesionesEstudio, fechaHoy]
  );

  const cambiosFisicosDeHoy = useMemo(
    () => cambiosFisicos.filter((item) => item.fecha === fechaHoy),
    [cambiosFisicos, fechaHoy]
  );

  const caloriasHoy = useMemo(
    () =>
      comidasDeHoy.reduce(
        (acumulado, item) => acumulado + (Number(item.calorias) || 0),
        0
      ),
    [comidasDeHoy]
  );

  // Reactividad inmediata: al actualizar entrenamientos, recalcula los días activos y el resumen del heatmap (RF-1)
  const manejarEntrenamientosActualizados = useCallback(
    async (nuevaLista) => {
      setEntrenamientos(nuevaLista);
      const [diasActualizados] = await Promise.all([
        obtenerDiasConActividad(),
        refrescarHabitosConcurrentes(),

      ]);
      setDiasConActividad(diasActualizados);
    },
    [refrescarHabitosConcurrentes]
  );

  // Reactividad inmediata: al registrar o borrar comida, recalcula los días activos y el resumen del heatmap (RF-1)
  const manejarCambioComidas = useCallback(
    async (nuevaListaComidas) => {
      setComidas(nuevaListaComidas);
      const [diasActualizados] = await Promise.all([
        obtenerDiasConActividad(),
        refrescarHabitosConcurrentes(),

      ]);
      setDiasConActividad(diasActualizados);
    },
    [refrescarHabitosConcurrentes]
  );

  // Reactividad inmediata: al registrar cambio físico, actualiza resumen anual
  const manejarCambioFisico = useCallback(
    async (nuevaListaCambios) => {
      setCambiosFisicos(nuevaListaCambios);
      const [diasActualizados] = await Promise.all([
        obtenerDiasConActividad(),
        refrescarHabitosConcurrentes(),

      ]);
      setDiasConActividad(diasActualizados);
    },
    [refrescarHabitosConcurrentes]
  );

  const renderizarVistaActiva = () => {
    if (vistaActiva === 'estudio') {
      return (
        <EstudioView
          sesionesExternas={sesionesEstudio}
          materiasExternas={materiasEstudio}
          datosCargados={datosEstudioCargados}
          onSesionesActualizadas={setSesionesEstudio}
          onMateriasActualizadas={setMateriasEstudio}
        />
      );
    }

    if (vistaActiva === 'heatmap') {
      return (
        <HeatmapView
          resumenAnual={resumenAnual}
          anioSeleccionado={anioHeatmap}
          onCambiarAnio={manejarCambiarAnioHeatmap}
          fechaHoy={fechaHoy}
          onAlternarDescanso={manejarAlternarDescanso}
          onIrAFitnessTracker={() => setVistaActiva('tracker')}
          onIrANutricion={() => setVistaActiva('nutricion')}
        />
      );
    }

    if (vistaActiva === 'fisico') {
      return (
        <CambioFisicoView
          cambiosExternos={cambiosFisicos}
          entrenamientosHoy={entrenamientosDeHoy}
          comidasHoy={comidasDeHoy}
          perfilExterno={perfilUsuario}
          perfilUsuario={perfilUsuario}
          onCambioFisicoActualizado={manejarCambioFisico}
          onPerfilActualizado={setPerfilUsuario}
          onAbrirEdicionPerfil={abrirEdicionPerfil}
        />
      );
    }

    if (vistaActiva === 'nutricion') {
      return (
        <NutricionView
          comidasExternas={comidas}
          perfilUsuario={perfilUsuario}
          onComidaRegistrada={manejarCambioComidas}
          onAbrirEdicionPerfil={abrirEdicionPerfil}
        />
      );
    }

    if (vistaActiva === 'tracker') {
      return (
        <EntrenamientosView
          entrenamientos={entrenamientos}
          diasConActividad={diasConActividad}
          onEntrenamientosActualizados={manejarEntrenamientosActualizados}
          onLiveModeChange={setEnLiveMode}
        />
      );
    }

    return (
      <MenuBienvenida
        fechaHoy={fechaHoy}
        totalEjerciciosHoy={entrenamientosDeHoy.length}
        totalDiasActivos={diasConActividad.length}
        caloriasHoy={caloriasHoy}
        ultimoEjercicioHoy={entrenamientosDeHoy[0] || null}
        resumenAnual={resumenAnioActual}
        perfilUsuario={perfilUsuario}
        onAlternarDescanso={manejarAlternarDescanso}
        onIrAFitnessTracker={() => setVistaActiva('tracker')}
        onIrANutricion={() => setVistaActiva('nutricion')}
        onIrACambioFisico={() => setVistaActiva('fisico')}
        onIrAHeatmap={() => setVistaActiva('heatmap')}
        onAbrirConfiguracion={abrirConfiguracion}
        onAbrirEdicionPerfil={abrirEdicionPerfil}
      />
    );
  };

  return (
    <View style={styles.contenedorRoot}>
      <StatusBar style="light" />
      <View
        style={[
          styles.contenedorPrincipal,
          {
            paddingTop: insets.top,
            paddingLeft: Math.max(insets.left, 16),
            paddingRight: Math.max(insets.right, 16),
          },
        ]}
      >
        <View style={styles.areaContenido}>
          <Animated.View
            key={vistaActiva}
            entering={FadeIn.duration(180)}
            style={styles.areaTransicion}
          >
            {renderizarVistaActiva()}
          </Animated.View>
        </View>

        {/* La barra flotante se oculta dinámicamente si el Live Mode está activo */}
        {!enLiveMode ? (
          <BarraNavegacionInferior
            vistaActiva={vistaActiva}
            onCambiarVista={setVistaActiva}
            contadorHoy={entrenamientosDeHoy.length}
            contadorComidasHoy={comidasDeHoy.length}
            contadorFisicoHoy={cambiosFisicosDeHoy.length}
            contadorEstudioHoy={sesionesEstudioDeHoy.length}
          />
        ) : null}
      </View>

      <PanelConfiguracionLateral
        visible={panelConfiguracionVisible}
        onCerrar={cerrarConfiguracion}
        perfilUsuario={perfilUsuario}
        onEditarPerfil={abrirEdicionPerfil}
        onAbrirOnboardingPerfil={abrirEdicionPerfil}
        onAbrirEdicionPerfil={abrirEdicionPerfil}
      />

      <OnboardingBienvenidaModal
        visible={onboardingVisible}
        modoEdicion={modoEdicionPerfil}
        perfilInicial={perfilUsuario}
        onPerfilActualizado={(nuevoPerfil) => setPerfilUsuario(nuevoPerfil)}
        onCompletado={(nuevoPerfil) => {
          if (nuevoPerfil) setPerfilUsuario(nuevoPerfil);
          setOnboardingVisible(false);
          setModoEdicionPerfil(false);
        }}
        onCerrar={() => {
          setOnboardingVisible(false);
          setModoEdicionPerfil(false);
        }}
      />
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={styles.contenedorRoot}>
        <AppPrincipal />
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  contenedorRoot: {
    flex: 1,
    backgroundColor: TOKENS.colors.canvas,
  },
  contenedorPrincipal: {
    flex: 1,
    backgroundColor: TOKENS.colors.canvas,
    paddingBottom: 0,
  },
  areaContenido: {
    flex: 1,
  },
  areaTransicion: {
    flex: 1,
  },
});
