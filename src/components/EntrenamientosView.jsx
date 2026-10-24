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
import SelectorSemanal from './SelectorSemanal';
import CatalogoEjerciciosModal from './CatalogoEjerciciosModal';
import LiveModeModal from './LiveModeModal';
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
  obtenerIconoImplemento,
} from '../constants/catalogoEjercicios';
import {
  vibrarConfirmacionBorrado,
  vibrarInicioPresionBorrado,
} from '../services/haptics';

const DURACION_PULSACION_BORRADO_MS = 1000;

export default function EntrenamientosView({
  entrenamientos = [],
  diasConActividad = [],
  onEntrenamientosActualizados,
  onLiveModeChange,
}) {
  const [fechaSeleccionada, setFechaSeleccionada] = useState(obtenerFechaLocal());
  const [catalogoModalVisible, setCatalogoModalVisible] = useState(false);
  const [liveModeVisible, setLiveModeVisible] = useState(false);
  const [ejercicioActivo, setEjercicioActivo] = useState(null);
  const [draftSesion, setDraftSesion] = useState(null);
  const [ejerciciosPersonalizados, setEjerciciosPersonalizados] = useState([]);
  const [avisoBorradoId, setAvisoBorradoId] = useState(null);
  const timerAvisoRef = useRef(null);

  // Fecha de hoy recalculada dinámicamente para soportar medianoche (Directriz 6)
  const hoyDinamico = obtenerFechaLocal();
  const esHoy = fechaSeleccionada === hoyDinamico;

  // Notificar cambio de estado Live Mode hacia App.js (RF-9)
  const cambiarEstadoLiveMode = useCallback(
    (activo) => {
      setLiveModeVisible(activo);
      if (typeof onLiveModeChange === 'function') {
        onLiveModeChange(activo);
      }
    },
    [onLiveModeChange]
  );

  // Cargar catálogo personalizado y restaurar sesión activa si hay draft (RF-12)
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

  // Filtrar de forma inmutable los entrenamientos correspondientes a la fecha seleccionada (RF-2)
  const entrenamientosFecha = useMemo(() => {
    return entrenamientos.filter((item) => item.fecha === fechaSeleccionada);
  }, [entrenamientos, fechaSeleccionada]);

  // Selección de ejercicio desde el catálogo
  const manejarSeleccionarEjercicio = (ejercicio) => {
    setCatalogoModalVisible(false);
    setDraftSesion(null);
    setEjercicioActivo(ejercicio);
    cambiarEstadoLiveMode(true);
  };

  // Finalización y consolidación híbrida de la sesión activa (RF-14, RF-15)
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

      // Si la sesión se terminó en hoy, sincronizar selección
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

  // Descarte de la sesión activa
  const manejarDescartarLiveMode = async () => {
    cambiarEstadoLiveMode(false);
    setEjercicioActivo(null);
    setDraftSesion(null);
  };

  // Borrado seguro 1 segundo con doble pulso háptico (RF-16)
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
    vibrarConfirmacionBorrado();
    Alert.alert(
      '⚠️ Eliminar entrenamiento',
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

  // Renderizado adaptativo de tarjeta de entrenamiento (Directriz 2: Compatibilidad hacia atrás)
  const renderizarTarjeta = ({ item }) => {
    const mostrandoAviso = avisoBorradoId === item.id;
    const tieneSeriesDetalle =
      Array.isArray(item.seriesDetalle) && item.seriesDetalle.length > 0;
    const colorGrupo = obtenerColorGrupo(item.grupoMuscular);
    const icono = obtenerIconoImplemento(item.implemento);

    return (
      <View
        style={[
          styles.tarjetaEntrenamiento,
          { borderLeftColor: colorGrupo || '#00E676' },
        ]}
      >
        <View style={styles.cabeceraTarjeta}>
          <View style={styles.infoTituloEjercicio}>
            <View style={styles.filaBadgesTarjeta}>
              {item.grupoMuscular ? (
                <View
                  style={[
                    styles.badgeGrupoTarjeta,
                    {
                      borderColor: colorGrupo,
                      backgroundColor: `${colorGrupo}22`,
                    },
                  ]}
                >
                  <Text
                    style={[styles.textoBadgeGrupoTarjeta, { color: colorGrupo }]}
                  >
                    {item.grupoMuscular}
                  </Text>
                </View>
              ) : null}

              {item.implemento ? (
                <View style={styles.badgeImplementoTarjeta}>
                  <Text style={styles.iconoImplementoTarjeta}>{icono}</Text>
                  <Text style={styles.textoBadgeImplementoTarjeta}>
                    {item.implemento}
                  </Text>
                </View>
              ) : null}
            </View>

            <Text style={styles.nombreEjercicioTarjeta}>{item.ejercicio}</Text>
          </View>

          {/* Botón de borrado seguro solo habilitado en el día actual (RF-3, RF-4, RF-16) */}
          {esHoy ? (
            <TouchableOpacity
              style={styles.botonEliminar}
              activeOpacity={0.7}
              delayLongPress={DURACION_PULSACION_BORRADO_MS}
              onPressIn={vibrarInicioPresionBorrado}
              onPress={() => mostrarAvisoToqueCorto(item.id)}
              onLongPress={() => solicitarConfirmacionBorrado(item)}
            >
              <Text style={styles.iconoEliminar}>🗑</Text>
              <Text style={styles.textoBotonEliminar}>1s</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.badgeSoloLecturaItem}>
              <Text style={styles.textoBadgeSoloLecturaItem}>Historial</Text>
            </View>
          )}
        </View>

        {/* Métricas consolidadas */}
        <View style={styles.filaMetricasTarjeta}>
          <View style={styles.bloqueMetrica}>
            <Text style={styles.etiquetaMetrica}>SERIES</Text>
            <Text style={styles.valorMetrica}>{item.series}</Text>
          </View>
          <View style={styles.bloqueMetrica}>
            <Text style={styles.etiquetaMetrica}>REPS TOTALES</Text>
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

        {/* Desglose de series si cuenta con la nueva estructura (Directriz 2) */}
        {tieneSeriesDetalle ? (
          <View style={styles.desgloseSeries}>
            <Text style={styles.tituloDesglose}>Desglose de series:</Text>
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
          </View>
        ) : null}

        {mostrandoAviso ? (
          <View style={styles.bannerAvisoBorrado}>
            <Text style={styles.textoAvisoBorrado}>
              ⚠️ Mantén presionado 1 segundo para eliminar este ejercicio
            </Text>
          </View>
        ) : null}
      </View>
    );
  };

  return (
    <View style={styles.contenedor}>
      {/* Selector Semanal Superior (RF-1, RF-2) */}
      <SelectorSemanal
        fechaSeleccionada={fechaSeleccionada}
        onSeleccionarFecha={setFechaSeleccionada}
        diasConActividad={diasConActividad}
      />

      {/* Banner de Modo Solo Lectura si la fecha no es hoy (RF-4) */}
      {!esHoy ? (
        <View style={styles.bannerSoloLectura}>
          <Text style={styles.iconoBannerSoloLectura}>🔒</Text>
          <Text style={styles.textoSoloLectura}>
            Historial ({fechaSeleccionada}) · Modo solo lectura. Días pasados no
            pueden modificarse.
          </Text>
        </View>
      ) : null}

      {/* Botón Iniciar Ejercicio únicamente visible hoy (RF-3) */}
      {esHoy ? (
        <TouchableOpacity
          style={styles.botonIniciarEjercicio}
          activeOpacity={0.85}
          onPress={() => setCatalogoModalVisible(true)}
        >
          <Text style={styles.iconoIniciarEjercicio}>＋</Text>
          <Text style={styles.textoIniciarEjercicio}>
            Iniciar Nuevo Ejercicio
          </Text>
        </TouchableOpacity>
      ) : null}

      {/* Encabezado del listado */}
      <View style={styles.encabezadoLista}>
        <Text style={styles.tituloSeccion}>
          {esHoy ? 'Entrenamientos de Hoy' : `Sesión del ${fechaSeleccionada}`}
        </Text>
        <Text style={styles.contadorLista}>
          {entrenamientosFecha.length} ejercicio(s)
        </Text>
      </View>

      {/* Listado de Entrenamientos */}
      <FlatList
        data={entrenamientosFecha}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderizarTarjeta}
        contentContainerStyle={styles.listaContenido}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.estadoVacio}>
            <Text style={styles.iconoEstadoVacio}>🏋️‍♂️</Text>
            <Text style={styles.textoEstadoVacio}>
              {esHoy
                ? 'Aún no has registrado ejercicios hoy.'
                : `No hubo entrenamientos registrados el ${fechaSeleccionada}.`}
            </Text>
            {esHoy ? (
              <Text style={styles.subtextoEstadoVacio}>
                Pulsa en "Iniciar Nuevo Ejercicio" para registrar tus series con
                autorrelleno y auto-save.
              </Text>
            ) : null}
          </View>
        }
      />

      {/* Modal de Catálogo y Búsqueda */}
      <CatalogoEjerciciosModal
        visible={catalogoModalVisible}
        onCerrar={() => setCatalogoModalVisible(false)}
        onSeleccionarEjercicio={manejarSeleccionarEjercicio}
        ejerciciosPersonalizados={ejerciciosPersonalizados}
        onEjercicioPersonalizadoCreado={setEjerciciosPersonalizados}
      />

      {/* Modal de Live Mode a Pantalla Completa (RF-9 a RF-15) */}
      <LiveModeModal
        visible={liveModeVisible}
        ejercicioActivo={ejercicioActivo}
        draftInicial={draftSesion}
        onTerminarEjercicio={manejarTerminarLiveMode}
        onDescartarEjercicio={manejarDescartarLiveMode}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    flex: 1,
  },
  bannerSoloLectura: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E232A',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#448AFF',
  },
  iconoBannerSoloLectura: {
    fontSize: 14,
    marginRight: 8,
  },
  textoSoloLectura: {
    flex: 1,
    color: '#90CAF9',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16,
  },
  botonIniciarEjercicio: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00E676',
    borderRadius: 12,
    paddingVertical: 13,
    marginBottom: 14,
    shadowColor: '#00E676',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  iconoIniciarEjercicio: {
    color: '#121212',
    fontSize: 18,
    fontWeight: '900',
    marginRight: 8,
  },
  textoIniciarEjercicio: {
    color: '#121212',
    fontSize: 15,
    fontWeight: '800',
  },
  encabezadoLista: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  tituloSeccion: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  contadorLista: {
    color: '#8D8D8D',
    fontSize: 12,
    fontWeight: '600',
  },
  listaContenido: {
    paddingBottom: 24,
  },
  tarjetaEntrenamiento: {
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    borderLeftWidth: 4,
  },
  cabeceraTarjeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  infoTituloEjercicio: {
    flex: 1,
    marginRight: 8,
  },
  filaBadgesTarjeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  badgeGrupoTarjeta: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginRight: 6,
  },
  textoBadgeGrupoTarjeta: {
    fontSize: 10,
    fontWeight: '700',
  },
  badgeImplementoTarjeta: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2A2A2A',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  iconoImplementoTarjeta: {
    fontSize: 10,
    marginRight: 3,
  },
  textoBadgeImplementoTarjeta: {
    color: '#B0B0B0',
    fontSize: 10,
    fontWeight: '600',
  },
  nombreEjercicioTarjeta: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    marginTop: 2,
  },
  botonEliminar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2C1518',
    borderWidth: 1.5,
    borderColor: '#FF5252',
    borderRadius: 8,
    paddingVertical: 7,
    paddingHorizontal: 9,
  },
  iconoEliminar: {
    fontSize: 12,
    marginRight: 4,
  },
  textoBotonEliminar: {
    color: '#FF5252',
    fontSize: 11,
    fontWeight: '800',
  },
  badgeSoloLecturaItem: {
    backgroundColor: '#2A2A2A',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  textoBadgeSoloLecturaItem: {
    color: '#8D8D8D',
    fontSize: 10,
    fontWeight: '700',
  },
  filaMetricasTarjeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 4,
  },
  bloqueMetrica: {
    flex: 1,
    backgroundColor: '#262626',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 6,
    marginHorizontal: 2,
    alignItems: 'center',
  },
  bloqueMetricaAcento: {
    borderWidth: 1,
    borderColor: '#00E676',
  },
  etiquetaMetrica: {
    color: '#8D8D8D',
    fontSize: 9,
    fontWeight: '700',
  },
  valorMetrica: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    marginTop: 2,
  },
  valorMetricaAcento: {
    color: '#00E676',
  },
  desgloseSeries: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#282828',
  },
  tituloDesglose: {
    color: '#8D8D8D',
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 6,
  },
  filaChipsSeries: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  chipSerieDetalle: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2A2A2A',
    borderRadius: 6,
    paddingVertical: 3,
    paddingHorizontal: 7,
    marginRight: 6,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#383838',
  },
  numeroSerieChip: {
    color: '#00E676',
    fontSize: 10,
    fontWeight: '800',
    marginRight: 4,
  },
  textoSerieChip: {
    color: '#E0E0E0',
    fontSize: 11,
    fontWeight: '600',
  },
  bannerAvisoBorrado: {
    marginTop: 8,
    backgroundColor: '#2C1518',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#FF5252',
  },
  textoAvisoBorrado: {
    color: '#FF8A80',
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
  estadoVacio: {
    backgroundColor: '#1E1E1E',
    borderRadius: 14,
    padding: 28,
    alignItems: 'center',
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  iconoEstadoVacio: {
    fontSize: 32,
    marginBottom: 8,
  },
  textoEstadoVacio: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 4,
  },
  subtextoEstadoVacio: {
    color: '#8D8D8D',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
});
