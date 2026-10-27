// @refresh reset
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { BackHandler, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Animated, { FadeIn } from 'react-native-reanimated';
import BarraNavegacionInferior from './src/components/BarraNavegacionInferior';
import CambioFisicoView from './src/components/CambioFisicoView';
import EntrenamientosView from './src/components/EntrenamientosView';
import HeatmapView from './src/components/HeatmapView';
import MenuBienvenida from './src/components/MenuBienvenida';
import NutricionView from './src/components/NutricionView';
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
import { TOKENS } from './src/theme/tokens';
import { useSafeInsets } from './src/utils/useSafeInsets';

function AppPrincipal() {
  const insets = useSafeInsets();
  const [entrenamientos, setEntrenamientos] = useState([]);
  const [diasConActividad, setDiasConActividad] = useState([]);
  const [comidas, setComidas] = useState([]);
  const [cambiosFisicos, setCambiosFisicos] = useState([]);
  const [perfilUsuario, setPerfilUsuario] = useState(PERFIL_USUARIO_BASE);
  const [vistaActiva, setVistaActiva] = useState('bienvenida');
  const [enLiveMode, setEnLiveMode] = useState(false);
  const [panelConfiguracionVisible, setPanelConfiguracionVisible] = useState(false);

  // Funciones memoizadas para controlar el drawer de configuracion
  const abrirConfiguracion = useCallback(
    () => setPanelConfiguracionVisible(true),
    []
  );
  const cerrarConfiguracion = useCallback(
    () => setPanelConfiguracionVisible(false),
    []
  );

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
    ] = await Promise.all([
      cargarEntrenamientos(),
      obtenerDiasConActividad(),
      cargarComidas(),
      cargarCambiosFisicos(),
      cargarPerfilUsuario(),
      refrescarHabitosConcurrentes(),
    ]);
    setEntrenamientos(listaGuardada);
    setDiasConActividad(diasActivos);
    setComidas(comidasGuardadas);
    setCambiosFisicos(cambiosGuardados);
    setPerfilUsuario(perfilCargado);
  }, [refrescarHabitosConcurrentes]);

  useEffect(() => {
    sincronizarDatos();
  }, [sincronizarDatos]);

  // Soporte Android-First: BackHandler retorna a bienvenida antes de salir de la app (RF-4)
  useEffect(() => {
    const onBackPress = () => {
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
  }, [vistaActiva, enLiveMode, panelConfiguracionVisible]);

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
          onCambioFisicoActualizado={manejarCambioFisico}
          onPerfilActualizado={setPerfilUsuario}
        />
      );
    }

    if (vistaActiva === 'nutricion') {
      return (
        <NutricionView
          comidasExternas={comidas}
          onComidaRegistrada={manejarCambioComidas}
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
        onAlternarDescanso={manejarAlternarDescanso}
        onIrAFitnessTracker={() => setVistaActiva('tracker')}
        onIrANutricion={() => setVistaActiva('nutricion')}
        onIrACambioFisico={() => setVistaActiva('fisico')}
        onIrAHeatmap={() => setVistaActiva('heatmap')}
        onAbrirConfiguracion={abrirConfiguracion}
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
          />
        ) : null}
      </View>

      <PanelConfiguracionLateral
        visible={panelConfiguracionVisible}
        onCerrar={cerrarConfiguracion}
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
