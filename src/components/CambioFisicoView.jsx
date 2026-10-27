import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import * as ImagePicker from 'expo-image-picker';
import { Feather } from '@expo/vector-icons';
import SelectorSemanal from './SelectorSemanal';
import {
  analizarCambioFisicoConGemini,
  compararCambioFisicoConGemini,
} from '../services/gemini';
import {
  OBJETIVOS_PERFIL_VALIDOS,
  PERFIL_USUARIO_BASE,
  actualizarComparacionCambioFisico,
  actualizarObjetivoPerfil,
  calcularEdadExacta,
  calcularTiempoEntrenando,
  cargarCambiosFisicos,
  cargarPerfilUsuario,
  eliminarCambioFisico,
  guardarCambioFisico,
  obtenerFechaLocal,
} from '../services/storage';
import {
  vibrarConfirmacionBorrado,
  vibrarInicioPresionBorrado,
  vibrarSeleccionBascula,
  vibrarToqueComparacion,
} from '../services/haptics';
import { TOKENS } from '../theme/tokens';

const MAX_FOTOS_POR_ANALISIS = 10;
const DURACION_PULSACION_BORRADO_MS = 1000;
const MOMENTOS_DIA = ['En ayunas', 'Mediodía', 'Post-entreno', 'Noche'];
const PASOS_BASCULA = [-1.0, -0.5, -0.1, 0.1, 0.5, 1.0];

const obtenerEstadoHoraInicial = (fecha = new Date()) => {
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

const formatearHora12h = (hora, minutos, periodo) => {
  const hh = String(hora).padStart(2, '0');
  const mm = String(minutos).padStart(2, '0');
  return `${hh}:${mm} ${periodo}`;
};

function CapsulaBorradoSeguroFisico({ onBorrar, onAvisoCorto }) {
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

export default function CambioFisicoView({
  cambiosExternos,
  entrenamientosHoy = [],
  comidasHoy = [],
  perfilExterno = null,
  onCambioFisicoActualizado,
  onPerfilActualizado,
}) {
  const [fechaSeleccionada, setFechaSeleccionada] = useState(obtenerFechaLocal());
  const [registrosInternos, setRegistrosInternos] = useState([]);
  const [perfilInterno, setPerfilInterno] = useState(PERFIL_USUARIO_BASE);
  const [fotosSeleccionadas, setFotosSeleccionadas] = useState([]);
  const [avisoLimiteFotos, setAvisoLimiteFotos] = useState('');
  const [mensajeError, setMensajeError] = useState('');
  const [analizando, setAnalizando] = useState(false);
  const [textoProgreso, setTextoProgreso] = useState('');
  const [comparandoId, setComparandoId] = useState(null);
  const [avisoBorradoId, setAvisoBorradoId] = useState(null);

  const [modalVisible, setModalVisible] = useState(false);
  const [pesoSeleccionadoKg, setPesoSeleccionadoKg] = useState(
    PERFIL_USUARIO_BASE.pesoKgBase
  );
  const [hora12, setHora12] = useState(8);
  const [minutos12, setMinutos12] = useState(0);
  const [periodo12, setPeriodo12] = useState('AM');
  const [momentoDia, setMomentoDia] = useState('En ayunas');

  const fotosBase64PorRegistroRef = useRef({});
  const timerAvisoRef = useRef(null);

  const fechaHoy = obtenerFechaLocal();
  const esHoy = fechaSeleccionada === fechaHoy;
  const edadInfo = useMemo(() => calcularEdadExacta(), []);
  const tiempoEntrenoInfo = useMemo(() => calcularTiempoEntrenando(), []);

  const listaRegistros = Array.isArray(cambiosExternos)
    ? cambiosExternos
    : registrosInternos;
  const perfilActivo = perfilExterno || perfilInterno;

  // Extraer días con registros fotográficos para los puntos de actividad del selector semanal
  const diasConFoto = useMemo(() => {
    return Array.from(
      new Set(listaRegistros.map((item) => item.fecha).filter(Boolean))
    );
  }, [listaRegistros]);

  // Filtrar registros correspondientes exclusivamente a la fecha seleccionada
  const registrosDelDia = useMemo(
    () => listaRegistros.filter((item) => item.fecha === fechaSeleccionada),
    [listaRegistros, fechaSeleccionada]
  );

  const sincronizarDatosLocales = useCallback(async () => {
    const [guardados, perfilCargado] = await Promise.all([
      cargarCambiosFisicos(),
      cargarPerfilUsuario(),
    ]);
    setRegistrosInternos(guardados);
    setPerfilInterno(perfilCargado);
  }, []);

  useEffect(() => {
    if (!Array.isArray(cambiosExternos) || !perfilExterno) {
      sincronizarDatosLocales();
    }
  }, [cambiosExternos, perfilExterno, sincronizarDatosLocales]);

  useEffect(() => {
    return () => {
      if (timerAvisoRef.current) {
        clearTimeout(timerAvisoRef.current);
      }
    };
  }, []);

  const ultimoPesoConocido = useMemo(() => {
    if (listaRegistros.length > 0 && Number(listaRegistros[0]?.pesoKg) > 0) {
      return Math.round(Number(listaRegistros[0].pesoKg) * 10) / 10;
    }
    if (Number(perfilActivo?.pesoKgActual) > 0) {
      return Math.round(Number(perfilActivo.pesoKgActual) * 10) / 10;
    }
    return PERFIL_USUARIO_BASE.pesoKgBase;
  }, [listaRegistros, perfilActivo]);

  const cambiarObjetivo = async (nuevoObjetivo) => {
    if (analizando) return;
    vibrarSeleccionBascula();
    const actualizado = await actualizarObjetivoPerfil(nuevoObjetivo);
    setPerfilInterno(actualizado);
    if (typeof onPerfilActualizado === 'function') {
      onPerfilActualizado(actualizado);
    }
  };

  const agregarActivosSeleccionados = (assets = []) => {
    const validos = assets
      .filter((a) => Boolean(a?.base64))
      .map((a, idx) => ({
        idTemp: `${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 7)}`,
        uri: a.uri || '',
        base64: a.base64,
      }));

    if (validos.length === 0) {
      setMensajeError('No se pudo obtener la imagen en formato Base64.');
      return;
    }

    setFotosSeleccionadas((prev) => {
      const combinadas = [...prev, ...validos];
      if (combinadas.length > MAX_FOTOS_POR_ANALISIS) {
        setAvisoLimiteFotos(
          `Se alcanzó el máximo permitido de ${MAX_FOTOS_POR_ANALISIS} fotografías por sesión. Se conservaron las primeras ${MAX_FOTOS_POR_ANALISIS}.`
        );
        return combinadas.slice(0, MAX_FOTOS_POR_ANALISIS);
      }
      setAvisoLimiteFotos('');
      return combinadas;
    });
  };

  const abrirCamara = async () => {
    if (analizando) return;
    if (fotosSeleccionadas.length >= MAX_FOTOS_POR_ANALISIS) {
      setAvisoLimiteFotos(
        `Ya tienes ${MAX_FOTOS_POR_ANALISIS} fotos seleccionadas (máximo permitido).`
      );
      return;
    }

    try {
      setMensajeError('');
      const permiso = await ImagePicker.requestCameraPermissionsAsync();
      if (!permiso.granted) {
        setMensajeError('Se requiere permiso para acceder a la cámara.');
        return;
      }

      const resultado = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 0.7,
        base64: true,
      });

      if (!resultado.canceled && resultado.assets?.length) {
        agregarActivosSeleccionados(resultado.assets);
      }
    } catch (error) {
      console.error('Error al abrir cámara en cambio físico:', error);
      setMensajeError('No fue posible abrir la cámara del dispositivo.');
    }
  };

  const abrirGaleria = async () => {
    if (analizando) return;
    const cupoRestante = MAX_FOTOS_POR_ANALISIS - fotosSeleccionadas.length;
    if (cupoRestante <= 0) {
      setAvisoLimiteFotos(
        `Ya alcanzaste el límite máximo de ${MAX_FOTOS_POR_ANALISIS} fotos por análisis.`
      );
      return;
    }

    try {
      setMensajeError('');
      const permiso = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permiso.granted) {
        setMensajeError('Se requiere permiso para acceder a la galería.');
        return;
      }

      const resultado = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        selectionLimit: Math.max(1, cupoRestante),
        quality: 0.7,
        base64: true,
      });

      if (!resultado.canceled && resultado.assets?.length) {
        agregarActivosSeleccionados(resultado.assets);
      }
    } catch (error) {
      console.error('Error al abrir galería en cambio físico:', error);
      setMensajeError('No fue posible abrir la galería de imágenes.');
    }
  };

  const quitarFotoSeleccionada = (idTemp) => {
    setFotosSeleccionadas((prev) =>
      prev.filter((foto) => foto.idTemp !== idTemp)
    );
    setAvisoLimiteFotos('');
  };

  const limpiarFotosSeleccionadas = () => {
    setFotosSeleccionadas([]);
    setAvisoLimiteFotos('');
  };

  const abrirMenuInteractivoPreAnalisis = () => {
    if (fotosSeleccionadas.length === 0 || analizando) return;
    const estadoHora = obtenerEstadoHoraInicial(new Date());
    setPesoSeleccionadoKg(ultimoPesoConocido);
    setHora12(estadoHora.hora);
    setMinutos12(estadoHora.minutos);
    setPeriodo12(estadoHora.periodo);
    setMomentoDia(estadoHora.momentoDia);
    setMensajeError('');
    vibrarSeleccionBascula();
    setModalVisible(true);
  };

  const ajustarPesoBascula = (delta) => {
    vibrarSeleccionBascula();
    setPesoSeleccionadoKg((prev) => {
      const nuevo = Math.round((prev + delta) * 10) / 10;
      return Math.min(250, Math.max(30, nuevo));
    });
  };

  const ajustarHora12 = (delta) => {
    vibrarSeleccionBascula();
    setHora12((prev) => ((prev - 1 + delta + 12) % 12) + 1);
  };

  const ajustarMinutos12 = (delta) => {
    vibrarSeleccionBascula();
    setMinutos12((prev) => (prev + delta + 60) % 60);
  };

  const alternarPeriodo12 = (nuevoPeriodo) => {
    vibrarSeleccionBascula();
    setPeriodo12(nuevoPeriodo);
  };

  const confirmarYAnalizarCambioFisico = async () => {
    if (analizando || fotosSeleccionadas.length === 0) return;

    const horaFormateada = formatearHora12h(hora12, minutos12, periodo12);
    const imagenesBase64 = fotosSeleccionadas
      .slice(0, MAX_FOTOS_POR_ANALISIS)
      .map((f) => f.base64);
    const urisFotos = fotosSeleccionadas
      .slice(0, MAX_FOTOS_POR_ANALISIS)
      .map((f) => f.uri);

    setModalVisible(false);
    setAnalizando(true);
    setMensajeError('');

    try {
      const edadActual = calcularEdadExacta(new Date());
      const antiguedadActual = calcularTiempoEntrenando(new Date());

      const contextoUsuario = {
        edadTexto: edadActual.texto,
        fechaNacimiento: edadActual.fechaNacimiento,
        tiempoEntrenandoTexto: antiguedadActual.texto,
        fechaInicioEntreno: antiguedadActual.fechaInicio,
        alturaCm: PERFIL_USUARIO_BASE.alturaCm,
        alturaMetros: PERFIL_USUARIO_BASE.alturaMetros,
        pesoKg: pesoSeleccionadoKg,
        sexo: PERFIL_USUARIO_BASE.sexo,
        objetivo: perfilActivo?.objetivo || PERFIL_USUARIO_BASE.objetivo,
        hora12h: horaFormateada,
        momentoDia,
        fechaHoy: obtenerFechaLocal(),
        entrenamientosHoy,
        comidasHoy,
        historialPesosPrevios: listaRegistros.slice(0, 5),
      };

      const resultadoAnalisis = await analizarCambioFisicoConGemini(
        imagenesBase64,
        contextoUsuario,
        {
          onProgreso: ({ modelo, indice, total, falloAnterior }) => {
            setTextoProgreso(
              falloAnterior
                ? `${falloAnterior.modelo} falló. Probando ${modelo} (${indice}/${total})...`
                : `Evaluando ${imagenesBase64.length} foto(s) con ${modelo} (${indice}/${total})...`
            );
          },
        }
      );

      const idNuevoRegistro = `${Date.now()}-${Math.random()
        .toString(36)
        .substring(2, 8)}`;

      fotosBase64PorRegistroRef.current = {
        ...fotosBase64PorRegistroRef.current,
        [idNuevoRegistro]: imagenesBase64,
      };

      const nuevoRegistro = {
        id: idNuevoRegistro,
        fecha: obtenerFechaLocal(),
        hora12h: horaFormateada,
        momentoDia,
        pesoKg: pesoSeleccionadoKg,
        alturaCm: PERFIL_USUARIO_BASE.alturaCm,
        edadExacta: edadActual.anios,
        tiempoEntrenandoTexto: antiguedadActual.texto,
        objetivo: perfilActivo?.objetivo || PERFIL_USUARIO_BASE.objetivo,
        urisFotos,
        cantidadFotos: imagenesBase64.length,
        resumenSimple: resultadoAnalisis.resumenSimple,
        resumenDetallado: resultadoAnalisis.resumenDetallado,
        balanceDelDia: resultadoAnalisis.balanceDelDia,
        veredicto: resultadoAnalisis.veredicto,
        puntosClave: resultadoAnalisis.puntosClave,
        modeloUsado: resultadoAnalisis.modeloUsado,
        comparacionAnterior: null,
      };

      const listaActualizada = await guardarCambioFisico(nuevoRegistro);
      const perfilActualizado = await cargarPerfilUsuario();

      setRegistrosInternos(listaActualizada);
      setPerfilInterno(perfilActualizado);
      setFotosSeleccionadas([]);
      setAvisoLimiteFotos('');

      if (typeof onCambioFisicoActualizado === 'function') {
        await onCambioFisicoActualizado(listaActualizada);
      }
      if (typeof onPerfilActualizado === 'function') {
        onPerfilActualizado(perfilActualizado);
      }
    } catch (error) {
      const mensaje =
        error?.message ||
        'No se pudo completar el análisis físico con Gemini. Verifica tu conexión o API Key.';
      setMensajeError(mensaje);
      Alert.alert('No se pudo analizar el cambio físico', mensaje, [
        { text: 'Entendido', style: 'cancel' },
      ]);
    } finally {
      setAnalizando(false);
      setTextoProgreso('');
    }
  };

  const manejarComparacionEnUnToque = async (registroActual, registroAnterior) => {
    if (!registroActual || !registroAnterior || Boolean(comparandoId)) return;

    vibrarToqueComparacion();
    setComparandoId(registroActual.id);
    setMensajeError('');

    try {
      const imagenesEnMemoria =
        fotosBase64PorRegistroRef.current[registroActual.id] || [];

      const resultadoComparacion = await compararCambioFisicoConGemini({
        registroActual,
        registroAnterior,
        imagenesActualesBase64: imagenesEnMemoria,
      });

      const datosComparacion = {
        idRegistroAnterior: registroAnterior.id,
        fechaAnterior: `${registroAnterior.fecha} (${registroAnterior.hora12h || ''})`,
        pesoAnteriorKg: registroAnterior.pesoKg,
        evolucion: resultadoComparacion.evolucion,
        recomendacionesOptimizacion:
          resultadoComparacion.recomendacionesOptimizacion,
        modeloUsado: resultadoComparacion.modeloUsado,
      };

      const listaActualizada = await actualizarComparacionCambioFisico(
        registroActual.id,
        datosComparacion
      );
      setRegistrosInternos(listaActualizada);

      if (typeof onCambioFisicoActualizado === 'function') {
        await onCambioFisicoActualizado(listaActualizada);
      }
    } catch (error) {
      const mensaje =
        error?.message ||
        'No se pudo comparar con el registro anterior en este momento.';
      setMensajeError(mensaje);
      Alert.alert('Error al comparar registros', mensaje, [
        { text: 'Entendido', style: 'cancel' },
      ]);
    } finally {
      setComparandoId(null);
    }
  };

  const mostrarAvisoToqueCorto = (idRegistro) => {
    if (!esHoy) return;
    setAvisoBorradoId(idRegistro);
    if (timerAvisoRef.current) {
      clearTimeout(timerAvisoRef.current);
    }
    timerAvisoRef.current = setTimeout(() => {
      setAvisoBorradoId(null);
    }, 2500);
  };

  const ejecutarBorradoRegistro = async (idRegistro) => {
    try {
      const listaActualizada = await eliminarCambioFisico(idRegistro);
      setRegistrosInternos(listaActualizada);
      setAvisoBorradoId(null);

      if (typeof onCambioFisicoActualizado === 'function') {
        await onCambioFisicoActualizado(listaActualizada);
      }
    } catch (error) {
      const mensaje =
        error?.message || 'No se pudo eliminar el chequeo físico.';
      Alert.alert('Error al eliminar', mensaje, [
        { text: 'Entendido', style: 'cancel' },
      ]);
    }
  };

  const solicitarConfirmacionBorrado = (item) => {
    if (!esHoy) return;
    setAvisoBorradoId(null);
    Alert.alert(
      'Eliminar chequeo físico',
      `¿Deseas eliminar el análisis del ${item.fecha} (${item.pesoKg} kg · Veredicto ${item.veredicto}/10)?\n\nEsta acción borrará el registro definitivamente.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => ejecutarBorradoRegistro(item.id),
        },
      ]
    );
  };

  const renderizarTarjetaCambio = ({ item, index }) => {
    const registroAnterior =
      index + 1 < listaRegistros.length ? listaRegistros[index + 1] : null;
    const estaComparandoEste = comparandoId === item.id;
    const mostrandoAviso = avisoBorradoId === item.id;

    return (
      <View style={styles.tarjetaRegistro}>
        <View style={styles.filaEncabezadoTarjeta}>
          <View style={styles.columnaFechaHora}>
            <Text style={styles.fechaTarjeta}>
              {item.fecha} · {item.hora12h}
            </Text>
            <View style={styles.filaEtiquetasContexto}>
              <View style={styles.chipContexto}>
                <Text style={styles.textoChipContexto}>{item.momentoDia}</Text>
              </View>
              <View style={styles.chipContexto}>
                <Feather
                  name="sliders"
                  size={10}
                  color={TOKENS.colors.textSecondary}
                  style={{ marginRight: 4 }}
                />
                <Text style={styles.textoChipContexto}>
                  {Number(item.pesoKg).toFixed(1)} kg
                </Text>
              </View>
              <View style={styles.chipContexto}>
                <Feather
                  name="target"
                  size={10}
                  color={TOKENS.colors.textSecondary}
                  style={{ marginRight: 4 }}
                />
                <Text style={styles.textoChipContexto}>
                  {item.objetivo || 'Mantenimiento'}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.circuloVeredicto}>
            <Text style={styles.etiquetaVeredicto}>VEREDICTO</Text>
            <Text style={styles.valorVeredicto}>
              {Number(item.veredicto).toFixed(1)}
              <Text style={styles.escalaVeredicto}>/10</Text>
            </Text>
          </View>
        </View>

        {Array.isArray(item.urisFotos) && item.urisFotos.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.tiraFotosRegistro}
          >
            {item.urisFotos.map((uri, idxFoto) =>
              uri ? (
                <Image
                  key={`${item.id}-foto-${idxFoto}`}
                  source={{ uri }}
                  style={styles.miniaturaTarjeta}
                />
              ) : null
            )}
          </ScrollView>
        ) : null}

        <View style={styles.bloqueResumenSimple}>
          <Text style={styles.etiquetaBloque}>RESUMEN GENERAL</Text>
          <Text style={styles.textoResumenSimple}>{item.resumenSimple}</Text>
        </View>

        {item.balanceDelDia ? (
          <View style={styles.bloqueBalanceDia}>
            <View style={styles.filaTituloBalance}>
              <Feather
                name="activity"
                size={12}
                color={TOKENS.colors.textSecondary}
                style={{ marginRight: 6 }}
              />
              <Text style={styles.etiquetaBalanceDia}>
                BALANCE DEL DÍA
              </Text>
            </View>
            <Text style={styles.textoBalanceDia}>{item.balanceDelDia}</Text>
          </View>
        ) : null}

        {Array.isArray(item.puntosClave) && item.puntosClave.length > 0 ? (
          <View style={styles.filaPuntosClave}>
            {item.puntosClave.map((punto, idxPunto) => (
              <View
                key={`${item.id}-pt-${idxPunto}`}
                style={styles.chipPuntoClave}
              >
                <Text style={styles.textoPuntoClave}>• {punto}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {item.comparacionAnterior ? (
          <View style={styles.bloqueComparacionResultado}>
            <Text style={styles.tituloComparacionResultado}>
              COMPARATIVA VS {item.comparacionAnterior.fechaAnterior} (
              {Number(item.comparacionAnterior.pesoAnteriorKg).toFixed(1)} kg)
            </Text>
            <Text style={styles.textoEvolucion}>
              {item.comparacionAnterior.evolucion}
            </Text>
            {Array.isArray(
              item.comparacionAnterior.recomendacionesOptimizacion
            ) &&
              item.comparacionAnterior.recomendacionesOptimizacion.map(
                (rec, idxRec) => (
                  <Text
                    key={`${item.id}-rec-${idxRec}`}
                    style={styles.itemRecomendacion}
                  >
                    ▸ {rec}
                  </Text>
                )
              )}
          </View>
        ) : null}

        <View style={styles.filaAccionesTarjeta}>
          {registroAnterior ? (
            <TouchableOpacity
              style={[
                styles.botonComparar,
                Boolean(comparandoId) && styles.botonDeshabilitado,
              ]}
              activeOpacity={0.85}
              disabled={Boolean(comparandoId) || analizando}
              onPress={() =>
                manejarComparacionEnUnToque(item, registroAnterior)
              }
            >
              {estaComparandoEste ? (
                <View style={styles.filaComparando}>
                  <ActivityIndicator size="small" color={TOKENS.colors.textPrimary} />
                  <Text style={styles.textoBotonComparar}>
                    Comparando...
                  </Text>
                </View>
              ) : (
                <View style={styles.filaComparando}>
                  <Feather
                    name="refresh-cw"
                    size={13}
                    color={TOKENS.colors.textPrimary}
                    style={{ marginRight: 6 }}
                  />
                  <Text style={styles.textoBotonComparar}>
                    {item.comparacionAnterior
                      ? 'Re-comparar con anterior'
                      : 'Comparar con registro anterior'}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          ) : (
            <View style={styles.insigniaPrimerRegistro}>
              <Text style={styles.textoPrimerRegistro}>
                Primer registro base
              </Text>
            </View>
          )}

          {esHoy ? (
            <CapsulaBorradoSeguroFisico
              onBorrar={() => solicitarConfirmacionBorrado(item)}
              onAvisoCorto={() => mostrarAvisoToqueCorto(item.id)}
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

        {mostrandoAviso ? (
          <View style={styles.bannerAvisoBorrado}>
            <Feather
              name="alert-circle"
              size={12}
              color={TOKENS.colors.danger}
              style={{ marginRight: 6 }}
            />
            <Text style={styles.textoAvisoBorrado}>
              Mantén presionado 1 segundo para eliminar este chequeo físico
            </Text>
          </View>
        ) : null}
      </View>
    );
  };

  const diferenciaContraBase =
    Math.round((pesoSeleccionadoKg - PERFIL_USUARIO_BASE.pesoKgBase) * 10) / 10;
  const textoDiferenciaBase =
    diferenciaContraBase === 0
      ? 'En tu peso base (74.0 kg)'
      : `${diferenciaContraBase > 0 ? '+' : ''}${diferenciaContraBase.toFixed(
          1
        )} kg vs base (74.0 kg)`;

  return (
    <View style={styles.contenedor}>
      <View style={styles.encabezado}>
        <Text style={styles.tituloVista}>Cambio Físico Editorial</Text>
        <Text style={styles.subtituloFecha}>Fecha: {fechaSeleccionada}</Text>
      </View>

      <FlatList
        data={registrosDelDia}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderizarTarjetaCambio}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contenidoLista}
        ListHeaderComponent={
          <View>
            {/* Selector Semanal Superior (Spec 007) */}
            <SelectorSemanal
              fechaSeleccionada={fechaSeleccionada}
              onSeleccionarFecha={setFechaSeleccionada}
              diasConActividad={diasConFoto}
            />

            {/* Banner de Modo Solo Lectura si no es hoy */}
            {!esHoy ? (
              <View style={styles.bannerModoHistorial}>
                <Feather
                  name="calendar"
                  size={13}
                  color={TOKENS.colors.textSecondary}
                  style={{ marginRight: 8 }}
                />
                <Text style={styles.textoModoHistorial}>
                  Historial de cambio físico ({fechaSeleccionada}) · Modo solo lectura. Días pasados no pueden modificarse.
                </Text>
              </View>
            ) : null}

            <View style={styles.tarjetaPerfil}>
              <View style={styles.filaMetricasBio}>
                <View style={styles.itemBio}>
                  <Text style={styles.etiquetaBio}>EDAD EXACTA</Text>
                  <Text style={styles.valorBio}>{edadInfo.texto}</Text>
                  <Text style={styles.subvalorBio}>
                    Nac: {edadInfo.fechaNacimiento}
                  </Text>
                </View>
                <View style={styles.itemBio}>
                  <Text style={styles.etiquetaBio}>ENTRENANDO</Text>
                  <Text style={styles.valorBio} numberOfLines={1}>
                    {tiempoEntrenoInfo.texto}
                  </Text>
                  <Text style={styles.subvalorBio}>
                    Desde {tiempoEntrenoInfo.fechaInicio}
                  </Text>
                </View>
                <View style={styles.itemBio}>
                  <Text style={styles.etiquetaBio}>PERFIL FÍSICO</Text>
                  <Text style={styles.valorBio}>
                    {PERFIL_USUARIO_BASE.alturaCm} cm · {ultimoPesoConocido.toFixed(1)} kg
                  </Text>
                  <Text style={styles.subvalorBio}>
                    {PERFIL_USUARIO_BASE.sexo} ({PERFIL_USUARIO_BASE.alturaMetros} m)
                  </Text>
                </View>
              </View>

              <View style={styles.bloqueObjetivo}>
                <Text style={styles.etiquetaObjetivo}>
                  OBJETIVO ACTUAL:
                </Text>
                <View style={styles.filaObjetivos}>
                  {OBJETIVOS_PERFIL_VALIDOS.map((obj) => {
                    const activo =
                      (perfilActivo?.objetivo ||
                        PERFIL_USUARIO_BASE.objetivo) === obj;
                    return (
                      <TouchableOpacity
                        key={obj}
                        style={[
                          styles.chipObjetivo,
                          activo
                            ? styles.chipObjetivoActivo
                            : styles.chipObjetivoInactivo,
                        ]}
                        activeOpacity={0.85}
                        onPress={() => cambiarObjetivo(obj)}
                      >
                        <Text
                          style={[
                            styles.textoChipObjetivo,
                            activo
                              ? styles.textoChipObjetivoActivo
                              : styles.textoChipObjetivoInactivo,
                          ]}
                        >
                          {obj}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </View>

            {esHoy ? (
            <View style={styles.tarjetaCaptura}>
              <View style={styles.filaTituloCaptura}>
                <Text style={styles.tituloSeccion}>
                  Selecciona de 1 a 10 fotografías
                </Text>
                <View style={styles.insigniaContadorFotos}>
                  <Text style={styles.textoContadorFotos}>
                    {fotosSeleccionadas.length}/{MAX_FOTOS_POR_ANALISIS} fotos
                  </Text>
                </View>
              </View>

              <View style={styles.filaBotonesCaptura}>
                <TouchableOpacity
                  style={[
                    styles.botonCaptura,
                    styles.botonCamara,
                    (analizando ||
                      fotosSeleccionadas.length >= MAX_FOTOS_POR_ANALISIS) &&
                      styles.botonDeshabilitado,
                  ]}
                  activeOpacity={0.85}
                  disabled={
                    analizando ||
                    fotosSeleccionadas.length >= MAX_FOTOS_POR_ANALISIS
                  }
                  onPress={abrirCamara}
                >
                  <Feather
                    name="camera"
                    size={16}
                    color={TOKENS.colors.textInverse}
                    style={{ marginRight: 6 }}
                  />
                  <Text style={styles.textoBotonCamara}>Cámara</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.botonCaptura,
                    styles.botonGaleria,
                    (analizando ||
                      fotosSeleccionadas.length >= MAX_FOTOS_POR_ANALISIS) &&
                      styles.botonDeshabilitado,
                  ]}
                  activeOpacity={0.85}
                  disabled={
                    analizando ||
                    fotosSeleccionadas.length >= MAX_FOTOS_POR_ANALISIS
                  }
                  onPress={abrirGaleria}
                >
                  <Feather
                    name="image"
                    size={16}
                    color={TOKENS.colors.textPrimary}
                    style={{ marginRight: 6 }}
                  />
                  <Text style={styles.textoBotonGaleria}>Galería (1–10)</Text>
                </TouchableOpacity>
              </View>

              {avisoLimiteFotos ? (
                <Text style={styles.textoAvisoLimite}>{avisoLimiteFotos}</Text>
              ) : null}

              {fotosSeleccionadas.length > 0 ? (
                <View style={styles.contenedorPreviaFotos}>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.scrollMiniaturas}
                  >
                    {fotosSeleccionadas.map((foto, index) => (
                      <View
                        key={foto.idTemp}
                        style={styles.contenedorMiniaturaPrevia}
                      >
                        <Image
                          source={{ uri: foto.uri }}
                          style={styles.imagenMiniaturaPrevia}
                        />
                        <View style={styles.badgeIndiceFoto}>
                          <Text style={styles.textoBadgeIndice}>
                            #{index + 1}
                          </Text>
                        </View>
                        <TouchableOpacity
                          style={styles.botonQuitarFoto}
                          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                          onPress={() => quitarFotoSeleccionada(foto.idTemp)}
                        >
                          <Feather name="x" size={12} color="#FFFFFF" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </ScrollView>

                  <View style={styles.filaAccionesPreAnalisis}>
                    <TouchableOpacity
                      style={[
                        styles.botonContinuarBascula,
                        analizando && styles.botonDeshabilitado,
                      ]}
                      activeOpacity={0.85}
                      disabled={analizando}
                      onPress={abrirMenuInteractivoPreAnalisis}
                    >
                      <Feather
                        name="sliders"
                        size={16}
                        color={TOKENS.colors.textInverse}
                        style={{ marginRight: 6 }}
                      />
                      <Text style={styles.textoBotonContinuarBascula}>
                        Continuar a Báscula y Hora ({fotosSeleccionadas.length})
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.botonLimpiarSeleccion}
                      disabled={analizando}
                      onPress={limpiarFotosSeleccionadas}
                    >
                      <Text style={styles.textoLimpiarSeleccion}>Limpiar</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : null}

              {analizando ? (
                <View style={styles.contenedorCarga}>
                  <ActivityIndicator size="large" color={TOKENS.colors.accentWhite} />
                  <Text style={styles.textoCarga}>
                    Analizando cambio físico y balance del día...
                  </Text>
                  <Text style={styles.subtextoCarga}>
                    {textoProgreso ||
                      'Procesando fotografías, perfil biológico y actividad de hoy'}
                  </Text>
                </View>
              ) : null}

              {mensajeError ? (
                <Text style={styles.textoError}>{mensajeError}</Text>
              ) : null}
            </View>
            ) : null}

            <View style={styles.encabezadoHistorial}>
              <Text style={styles.tituloSeccion}>
                {esHoy ? `Chequeos Físicos de Hoy (${registrosDelDia.length})` : `Chequeos del Día (${registrosDelDia.length})`}
              </Text>
              <Text style={styles.contadorLista}>
                {registrosDelDia.length} registro(s)
              </Text>
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.estadoVacio}>
            <Feather
              name="camera"
              size={32}
              color={TOKENS.colors.textMuted}
              style={{ marginBottom: 12 }}
            />
            <Text style={styles.textoVacio}>
              {esHoy
                ? 'Aún no tienes análisis de cambio físico registrados hoy. Adjunta entre 1 y 10 fotografías para abrir la báscula circular y obtener tu veredicto 0/10.'
                : `Sin registros fotográficos ni pesaje en esta fecha (${fechaSeleccionada}).`}
            </Text>
          </View>
        }
      />

      <Modal
        visible={modalVisible}
        transparent
        statusBarTranslucent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.fondoModal}>
          <View style={styles.contenedorModal}>
            <ScrollView style={{ maxHeight: '85%' }} contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false} bounces={false}>
            <Text style={styles.tituloModal}>
              Contexto del Chequeo ({fotosSeleccionadas.length} foto
              {fotosSeleccionadas.length === 1 ? '' : 's'})
            </Text>
            <Text style={styles.subtituloModal}>
              Ajusta tu peso en la báscula circular y la hora de la toma
            </Text>

            {/* Báscula Moderna Circular Monocroma */}
            <View style={styles.contenedorBasculaExterior}>
              <View style={styles.anilloBasculaExterno}>
                <View style={styles.circuloCentralBascula}>
                  <Text style={styles.etiquetaInteriorBascula}>
                    BÁSCULA DIGITAL
                  </Text>
                  <View style={styles.filaValorPesoCircular}>
                    <Text style={styles.valorPesoCircular}>
                      {pesoSeleccionadoKg.toFixed(1)}
                    </Text>
                    <Text style={styles.unidadPesoCircular}>kg</Text>
                  </View>
                  <Text style={styles.textoDiferenciaBascula}>
                    {textoDiferenciaBase}
                  </Text>
                </View>
              </View>

              <View style={styles.filaBotonesPeso}>
                {PASOS_BASCULA.map((paso) => {
                  const etiqueta = paso > 0 ? `+${paso}` : `${paso}`;
                  return (
                    <TouchableOpacity
                      key={etiqueta}
                      style={styles.botonPasoPeso}
                      hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                      activeOpacity={0.8}
                      onPress={() => ajustarPesoBascula(paso)}
                    >
                      <Text style={styles.textoBotonPasoPeso}>{etiqueta}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Selector de Hora 12h */}
            <View style={styles.bloqueSelectorHora}>
              <Text style={styles.etiquetaSeccionModal}>
                HORA DE LA TOMA (FORMATO 12 HORAS)
              </Text>

              <View style={styles.filaReloj12h}>
                <View style={styles.columnaControlTiempo}>
                  <TouchableOpacity
                    style={styles.botonFlechaTiempo} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    onPress={() => ajustarHora12(1)}
                  >
                    <Feather name="chevron-up" size={16} color={TOKENS.colors.textPrimary} />
                  </TouchableOpacity>
                  <Text style={styles.valorTiempoDigital}>
                    {String(hora12).padStart(2, '0')}
                  </Text>
                  <TouchableOpacity
                    style={styles.botonFlechaTiempo} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    onPress={() => ajustarHora12(-1)}
                  >
                    <Feather name="chevron-down" size={16} color={TOKENS.colors.textPrimary} />
                  </TouchableOpacity>
                </View>

                <Text style={styles.dosPuntosReloj}>:</Text>

                <View style={styles.columnaControlTiempo}>
                  <TouchableOpacity
                    style={styles.botonFlechaTiempo} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    onPress={() => ajustarMinutos12(5)}
                  >
                    <Text style={styles.textoFlechaTiempo}>+5m</Text>
                  </TouchableOpacity>
                  <Text style={styles.valorTiempoDigital}>
                    {String(minutos12).padStart(2, '0')}
                  </Text>
                  <TouchableOpacity
                    style={styles.botonFlechaTiempo} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    onPress={() => ajustarMinutos12(-5)}
                  >
                    <Text style={styles.textoFlechaTiempo}>-5m</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.columnaAmPm}>
                  {['AM', 'PM'].map((p) => {
                    const activo = periodo12 === p;
                    return (
                      <TouchableOpacity
                        key={p}
                        style={[
                          styles.botonAmPm,
                          activo
                            ? styles.botonAmPmActivo
                            : styles.botonAmPmInactivo,
                        ]}
                        onPress={() => alternarPeriodo12(p)}
                      >
                        <Text
                          style={[
                            styles.textoAmPm,
                            activo
                              ? styles.textoAmPmActivo
                              : styles.textoAmPmInactivo,
                          ]}
                        >
                          {p}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <View style={styles.filaMomentosDia}>
                {MOMENTOS_DIA.map((m) => {
                  const activo = momentoDia === m;
                  return (
                    <TouchableOpacity
                      key={m}
                      style={[
                        styles.chipMomentoModal,
                        activo
                          ? styles.chipMomentoActivo
                          : styles.chipMomentoInactivo,
                      ]}
                      onPress={() => {
                        vibrarSeleccionBascula();
                        setMomentoDia(m);
                      }}
                    >
                      <Text
                        style={[
                          styles.textoChipMomento,
                          activo
                            ? styles.textoChipMomentoActivo
                            : styles.textoChipMomentoInactivo,
                        ]}
                      >
                        {m}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={styles.filaBotonesModal}>
              <TouchableOpacity
                style={styles.botonCancelarModal}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.textoCancelarModal}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.botonConfirmarModal,
                  analizando && styles.botonDeshabilitado,
                ]}
                disabled={analizando}
                onPress={confirmarYAnalizarCambioFisico}
              >
                <Text style={styles.textoConfirmarModal}>
                  Analizar con Gemini
                </Text>
              </TouchableOpacity>
            </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  bannerModoHistorial: {
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
  textoModoHistorial: {
    flex: 1,
    color: TOKENS.colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
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
  contenedor: {
    flex: 1,
    backgroundColor: TOKENS.colors.canvas,
  },
  encabezado: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 12,
  },
  tituloVista: {
    color: TOKENS.colors.textPrimary,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  subtituloFecha: {
    color: TOKENS.colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  contenidoLista: {
    paddingBottom: 110, // Scroll clearance mandatorio
  },
  tarjetaPerfil: {
    backgroundColor: TOKENS.colors.surface,
    borderRadius: TOKENS.radii.md,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: TOKENS.colors.borderDefault,
  },
  filaMetricasBio: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  itemBio: {
    flex: 1,
    backgroundColor: TOKENS.colors.surfaceElevated,
    borderRadius: TOKENS.radii.sm,
    paddingVertical: 8,
    paddingHorizontal: 6,
    marginHorizontal: 2,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: TOKENS.colors.borderSubtle,
  },
  etiquetaBio: {
    color: TOKENS.colors.textMuted,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  valorBio: {
    color: TOKENS.colors.textPrimary,
    fontSize: 13,
    fontWeight: '800',
    marginTop: 2,
  },
  subvalorBio: {
    color: TOKENS.colors.textSecondary,
    fontSize: 10,
    marginTop: 1,
  },
  bloqueObjetivo: {
    marginTop: 4,
  },
  etiquetaObjetivo: {
    color: TOKENS.colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 6,
    letterSpacing: 0.4,
  },
  filaObjetivos: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  chipObjetivo: {
    flex: 1,
    paddingVertical: 6,
    marginHorizontal: 2,
    borderRadius: TOKENS.radii.xs,
    alignItems: 'center',
    borderWidth: 1,
  },
  chipObjetivoActivo: {
    backgroundColor: TOKENS.colors.accentWhite,
    borderColor: TOKENS.colors.accentWhite,
  },
  chipObjetivoInactivo: {
    backgroundColor: TOKENS.colors.surfaceElevated,
    borderColor: TOKENS.colors.borderDefault,
  },
  textoChipObjetivo: {
    fontSize: 10,
    fontWeight: '700',
  },
  textoChipObjetivoActivo: {
    color: TOKENS.colors.textInverse,
  },
  textoChipObjetivoInactivo: {
    color: TOKENS.colors.textSecondary,
  },
  tarjetaCaptura: {
    backgroundColor: TOKENS.colors.surface,
    borderRadius: TOKENS.radii.md,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: TOKENS.colors.borderDefault,
  },
  filaTituloCaptura: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  tituloSeccion: {
    color: TOKENS.colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  insigniaContadorFotos: {
    backgroundColor: TOKENS.colors.surfaceElevated,
    borderRadius: TOKENS.radii.xs,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  textoContadorFotos: {
    color: TOKENS.colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  filaBotonesCaptura: {
    flexDirection: 'row',
  },
  botonCaptura: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: TOKENS.radii.sm,
  },
  botonCamara: {
    backgroundColor: TOKENS.colors.accentWhite,
    marginRight: 8,
  },
  textoBotonCamara: {
    color: TOKENS.colors.textInverse,
    fontSize: 13,
    fontWeight: '800',
  },
  botonGaleria: {
    backgroundColor: TOKENS.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: TOKENS.colors.borderDefault,
  },
  textoBotonGaleria: {
    color: TOKENS.colors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
  botonDeshabilitado: {
    opacity: 0.4,
  },
  textoAvisoLimite: {
    color: TOKENS.colors.textSecondary,
    fontSize: 11,
    marginTop: 6,
  },
  contenedorPreviaFotos: {
    marginTop: 12,
  },
  scrollMiniaturas: {
    marginBottom: 10,
  },
  contenedorMiniaturaPrevia: {
    position: 'relative',
    marginRight: 8,
  },
  imagenMiniaturaPrevia: {
    width: 68,
    height: 68,
    borderRadius: TOKENS.radii.sm,
    borderWidth: 1,
    borderColor: TOKENS.colors.borderStrong,
  },
  badgeIndiceFoto: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  textoBadgeIndice: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700',
  },
  botonQuitarFoto: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filaAccionesPreAnalisis: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  botonContinuarBascula: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: TOKENS.colors.accentWhite,
    borderRadius: TOKENS.radii.sm,
    paddingVertical: 12,
    marginRight: 8,
  },
  textoBotonContinuarBascula: {
    color: TOKENS.colors.textInverse,
    fontSize: 13,
    fontWeight: '800',
  },
  botonLimpiarSeleccion: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: TOKENS.colors.surfaceElevated,
    borderRadius: TOKENS.radii.sm,
    borderWidth: 1,
    borderColor: TOKENS.colors.borderDefault,
  },
  textoLimpiarSeleccion: {
    color: TOKENS.colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  contenedorCarga: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  textoCarga: {
    color: TOKENS.colors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 8,
  },
  subtextoCarga: {
    color: TOKENS.colors.textSecondary,
    fontSize: 11,
    marginTop: 4,
  },
  textoError: {
    color: TOKENS.colors.danger,
    fontSize: 12,
    marginTop: 6,
  },
  encabezadoHistorial: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    marginTop: 6,
  },
  contadorLista: {
    color: TOKENS.colors.textSecondary,
    fontSize: 12,
  },
  tarjetaRegistro: {
    backgroundColor: TOKENS.colors.surface,
    borderRadius: TOKENS.radii.md,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: TOKENS.colors.borderDefault,
  },
  filaEncabezadoTarjeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  columnaFechaHora: {
    flex: 1,
  },
  fechaTarjeta: {
    color: TOKENS.colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  filaEtiquetasContexto: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  chipContexto: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: TOKENS.colors.surfaceElevated,
    borderRadius: TOKENS.radii.xs,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: TOKENS.colors.borderSubtle,
  },
  textoChipContexto: {
    color: TOKENS.colors.textSecondary,
    fontSize: 10,
    fontWeight: '600',
  },
  circuloVeredicto: {
    backgroundColor: TOKENS.colors.surfaceElevated,
    borderRadius: TOKENS.radii.sm,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: TOKENS.colors.borderStrong,
  },
  etiquetaVeredicto: {
    color: TOKENS.colors.textMuted,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  valorVeredicto: {
    color: TOKENS.colors.textPrimary,
    fontSize: 16,
    fontWeight: '800',
  },
  escalaVeredicto: {
    fontSize: 10,
    fontWeight: '600',
    color: TOKENS.colors.textSecondary,
  },
  tiraFotosRegistro: {
    marginVertical: 10,
  },
  miniaturaTarjeta: {
    width: 60,
    height: 60,
    borderRadius: TOKENS.radii.xs,
    marginRight: 6,
    borderWidth: 1,
    borderColor: TOKENS.colors.borderDefault,
  },
  bloqueResumenSimple: {
    backgroundColor: TOKENS.colors.surfaceElevated,
    borderRadius: TOKENS.radii.sm,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: TOKENS.colors.borderSubtle,
  },
  etiquetaBloque: {
    color: TOKENS.colors.textMuted,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  textoResumenSimple: {
    color: TOKENS.colors.textPrimary,
    fontSize: 12,
    lineHeight: 16,
  },
  bloqueBalanceDia: {
    backgroundColor: TOKENS.colors.surfaceElevated,
    borderRadius: TOKENS.radii.sm,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: TOKENS.colors.borderSubtle,
  },
  filaTituloBalance: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  etiquetaBalanceDia: {
    color: TOKENS.colors.textSecondary,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  textoBalanceDia: {
    color: TOKENS.colors.textPrimary,
    fontSize: 12,
    lineHeight: 16,
  },
  filaPuntosClave: {
    marginBottom: 8,
  },
  chipPuntoClave: {
    marginBottom: 3,
  },
  textoPuntoClave: {
    color: TOKENS.colors.textSecondary,
    fontSize: 11,
    lineHeight: 15,
  },
  bloqueComparacionResultado: {
    backgroundColor: TOKENS.colors.surfaceElevated,
    borderRadius: TOKENS.radii.sm,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: TOKENS.colors.borderStrong,
  },
  tituloComparacionResultado: {
    color: TOKENS.colors.textPrimary,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  textoEvolucion: {
    color: TOKENS.colors.textSecondary,
    fontSize: 11,
    lineHeight: 15,
    marginBottom: 4,
  },
  itemRecomendacion: {
    color: TOKENS.colors.textPrimary,
    fontSize: 10,
    lineHeight: 14,
  },
  filaAccionesTarjeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  botonComparar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: TOKENS.colors.surfaceElevated,
    borderRadius: TOKENS.radii.xs,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: TOKENS.colors.borderDefault,
  },
  filaComparando: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  textoBotonComparar: {
    color: TOKENS.colors.textPrimary,
    fontSize: 11,
    fontWeight: '600',
  },
  insigniaPrimerRegistro: {
    backgroundColor: TOKENS.colors.surfaceElevated,
    borderRadius: TOKENS.radii.xs,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  textoPrimerRegistro: {
    color: TOKENS.colors.textMuted,
    fontSize: 10,
    fontWeight: '600',
  },
  capsulaBorradoContenedor: {
    width: 58,
    height: 28,
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
  bannerAvisoBorrado: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: TOKENS.colors.dangerBg,
    borderRadius: TOKENS.radii.xs,
    padding: 6,
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
  textoVacio: {
    color: TOKENS.colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
  fondoModal: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  contenedorModal: {
    width: '100%',
    backgroundColor: TOKENS.colors.surface,
    borderRadius: TOKENS.radii.lg,
    padding: 18,
    borderWidth: 1,
    borderColor: TOKENS.colors.borderDefault,
  },
  tituloModal: {
    color: TOKENS.colors.textPrimary,
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 2,
  },
  subtituloModal: {
    color: TOKENS.colors.textSecondary,
    fontSize: 12,
    marginBottom: 16,
  },
  contenedorBasculaExterior: {
    alignItems: 'center',
    marginBottom: 16,
  },
  anilloBasculaExterno: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: TOKENS.colors.surfaceElevated,
    borderWidth: 2,
    borderColor: TOKENS.colors.borderStrong,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  circuloCentralBascula: {
    alignItems: 'center',
  },
  etiquetaInteriorBascula: {
    color: TOKENS.colors.textMuted,
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  filaValorPesoCircular: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  valorPesoCircular: {
    color: TOKENS.colors.textPrimary,
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  unidadPesoCircular: {
    color: TOKENS.colors.textSecondary,
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 2,
  },
  textoDiferenciaBascula: {
    color: TOKENS.colors.textSecondary,
    fontSize: 9,
    fontWeight: '600',
  },
  filaBotonesPeso: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 4,
  },
  botonPasoPeso: {
    backgroundColor: TOKENS.colors.surfaceElevated,
    paddingHorizontal: 10,
    paddingVertical: 8,
    minWidth: 44,
    minHeight: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: TOKENS.radii.xs,
    borderWidth: 1,
    borderColor: TOKENS.colors.borderDefault,
  },
  textoBotonPasoPeso: {
    color: TOKENS.colors.textPrimary,
    fontSize: 11,
    fontWeight: '700',
  },
  bloqueSelectorHora: {
    marginBottom: 16,
  },
  etiquetaSeccionModal: {
    color: TOKENS.colors.textMuted,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  filaReloj12h: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: TOKENS.colors.surfaceElevated,
    borderRadius: TOKENS.radii.md,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: TOKENS.colors.borderDefault,
    marginBottom: 10,
  },
  columnaControlTiempo: {
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  botonFlechaTiempo: {
    minWidth: 44,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 6,
  },
  textoFlechaTiempo: {
    color: TOKENS.colors.textSecondary,
    fontSize: 10,
    fontWeight: '700',
  },
  valorTiempoDigital: {
    color: TOKENS.colors.textPrimary,
    fontSize: 22,
    fontWeight: '800',
    marginVertical: 2,
  },
  dosPuntosReloj: {
    color: TOKENS.colors.textPrimary,
    fontSize: 22,
    fontWeight: '800',
    paddingBottom: 4,
  },
  columnaAmPm: {
    marginLeft: 12,
    gap: 4,
  },
  botonAmPm: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: TOKENS.radii.xs,
    borderWidth: 1,
  },
  botonAmPmActivo: {
    backgroundColor: TOKENS.colors.accentWhite,
    borderColor: TOKENS.colors.accentWhite,
  },
  botonAmPmInactivo: {
    backgroundColor: TOKENS.colors.surface,
    borderColor: TOKENS.colors.borderDefault,
  },
  textoAmPm: {
    fontSize: 10,
    fontWeight: '800',
  },
  textoAmPmActivo: {
    color: TOKENS.colors.textInverse,
  },
  textoAmPmInactivo: {
    color: TOKENS.colors.textSecondary,
  },
  filaMomentosDia: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 4,
  },
  chipMomentoModal: {
    flex: 1,
    paddingVertical: 6,
    alignItems: 'center',
    borderRadius: TOKENS.radii.xs,
    borderWidth: 1,
  },
  chipMomentoActivo: {
    backgroundColor: TOKENS.colors.accentWhite,
    borderColor: TOKENS.colors.accentWhite,
  },
  chipMomentoInactivo: {
    backgroundColor: TOKENS.colors.surfaceElevated,
    borderColor: TOKENS.colors.borderDefault,
  },
  textoChipMomento: {
    fontSize: 10,
    fontWeight: '700',
  },
  textoChipMomentoActivo: {
    color: TOKENS.colors.textInverse,
  },
  textoChipMomentoInactivo: {
    color: TOKENS.colors.textSecondary,
  },
  filaBotonesModal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  botonCancelarModal: {
    flex: 1,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: TOKENS.radii.md,
    backgroundColor: TOKENS.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: TOKENS.colors.borderDefault,
  },
  textoCancelarModal: {
    color: TOKENS.colors.textSecondary,
    fontSize: 13,
    fontWeight: '700',
  },
  botonConfirmarModal: {
    flex: 1.5,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: TOKENS.radii.md,
    backgroundColor: TOKENS.colors.accentWhite,
  },
  textoConfirmarModal: {
    color: TOKENS.colors.textInverse,
    fontSize: 13,
    fontWeight: '800',
  },
});
