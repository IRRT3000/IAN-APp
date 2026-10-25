// @refresh reset
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Platform, SafeAreaView, StyleSheet, View } from 'react-native';
import BarraNavegacionInferior from './src/components/BarraNavegacionInferior';
import CambioFisicoView from './src/components/CambioFisicoView';
import EntrenamientosView from './src/components/EntrenamientosView';
import HeatmapView from './src/components/HeatmapView';
import MenuBienvenida from './src/components/MenuBienvenida';
import NutricionView from './src/components/NutricionView';
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

export default function App() {
  const [entrenamientos, setEntrenamientos] = useState([]);
  const [diasConActividad, setDiasConActividad] = useState([]);
  const [comidas, setComidas] = useState([]);
  const [cambiosFisicos, setCambiosFisicos] = useState([]);
  const [perfilUsuario, setPerfilUsuario] = useState(PERFIL_USUARIO_BASE);
  const [vistaActiva, setVistaActiva] = useState('bienvenida');
  const [enLiveMode, setEnLiveMode] = useState(false);
  const [anioHeatmap, setAnioHeatmap] = useState(new Date().getFullYear());
  const [resumenAnual, setResumenAnual] = useState({});

  const fechaHoy = obtenerFechaLocal();

  const sincronizarDatos = useCallback(async () => {
    const [
      listaGuardada,
      diasActivos,
      comidasGuardadas,
      cambiosGuardados,
      perfilCargado,
      resumenHabitos,
    ] = await Promise.all([
      cargarEntrenamientos(),
      obtenerDiasConActividad(),
      cargarComidas(),
      cargarCambiosFisicos(),
      cargarPerfilUsuario(),
      obtenerResumenAnualHabitos(anioHeatmap),
    ]);
    setEntrenamientos(listaGuardada);
    setDiasConActividad(diasActivos);
    setComidas(comidasGuardadas);
    setCambiosFisicos(cambiosGuardados);
    setPerfilUsuario(perfilCargado);
    setResumenAnual(resumenHabitos);
  }, [anioHeatmap]);

  useEffect(() => {
    sincronizarDatos();
  }, [sincronizarDatos]);

  // El resumen anual ya se recalcula dentro de sincronizarDatos (dependiente de anioHeatmap).

  const manejarAlternarDescanso = useCallback(
    async (fecha) => {
      await alternarDiaDescanso(fecha);
      await sincronizarDatos();
    },
    [sincronizarDatos]
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
      const [diasActualizados, nuevoResumen] = await Promise.all([
        obtenerDiasConActividad(),
        obtenerResumenAnualHabitos(anioHeatmap),
      ]);
      setDiasConActividad(diasActualizados);
      setResumenAnual(nuevoResumen);
    },
    [anioHeatmap]
  );

  // Reactividad inmediata: al registrar o borrar comida, recalcula los días activos y el resumen del heatmap (RF-1)
  const manejarCambioComidas = useCallback(
    async (nuevaListaComidas) => {
      setComidas(nuevaListaComidas);
      const [diasActualizados, nuevoResumen] = await Promise.all([
        obtenerDiasConActividad(),
        obtenerResumenAnualHabitos(anioHeatmap),
      ]);
      setDiasConActividad(diasActualizados);
      setResumenAnual(nuevoResumen);
    },
    [anioHeatmap]
  );

  // Reactividad inmediata: al registrar cambio físico, actualiza resumen anual
  const manejarCambioFisico = useCallback(
    async (nuevaListaCambios) => {
      setCambiosFisicos(nuevaListaCambios);
      const [diasActualizados, nuevoResumen] = await Promise.all([
        obtenerDiasConActividad(),
        obtenerResumenAnualHabitos(anioHeatmap),
      ]);
      setDiasConActividad(diasActualizados);
      setResumenAnual(nuevoResumen);
    },
    [anioHeatmap]
  );

  const renderizarVistaActiva = () => {
    if (vistaActiva === 'heatmap') {
      return (
        <HeatmapView
          resumenAnual={resumenAnual}
          anioSeleccionado={anioHeatmap}
          onCambiarAnio={setAnioHeatmap}
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
        resumenAnual={resumenAnual}
        onAlternarDescanso={manejarAlternarDescanso}
        onIrAFitnessTracker={() => setVistaActiva('tracker')}
        onIrANutricion={() => setVistaActiva('nutricion')}
        onIrACambioFisico={() => setVistaActiva('fisico')}
        onIrAHeatmap={() => setVistaActiva('heatmap')}
      />
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <View style={styles.contenedorPrincipal}>
        <View style={styles.areaContenido}>{renderizarVistaActiva()}</View>

        {/* La barra inferior se oculta dinámicamente si el Live Mode está activo (RF-9) */}
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#121212',
  },
  contenedorPrincipal: {
    flex: 1,
    backgroundColor: '#121212',
    paddingTop: Platform.OS === 'android' ? 42 : 16,
    paddingBottom: Platform.OS === 'android' ? 24 : 10,
    paddingHorizontal: 16,
  },
  areaContenido: {
    flex: 1,
  },
});
