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
import * as ImagePicker from 'expo-image-picker';
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

const MAX_FOTOS_POR_ANALISIS = 10;
const DURACION_PULSACION_BORRADO_MS = 1000;
const MOMENTOS_DIA = ['En ayunas', 'Mediodía', 'Post-entreno', 'Noche'];
const PASOS_BASCULA = [-1.0, -0.5, -0.1, 0.1, 0.5, 1.0];

/**
 * Obtiene la hora local actual desglosada en formato de 12 horas (hh:mm AM/PM)
 * y sugiere el momento del día según la franja horaria.
 */
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

export default function CambioFisicoView({
  cambiosExternos,
  entrenamientosHoy = [],
  comidasHoy = [],
  perfilExterno = null,
  onCambioFisicoActualizado,
  onPerfilActualizado,
}) {
  const [registrosInternos, setRegistrosInternos] = useState([]);
  const [perfilInterno, setPerfilInterno] = useState(PERFIL_USUARIO_BASE);
  const [fotosSeleccionadas, setFotosSeleccionadas] = useState([]);
  const [avisoLimiteFotos, setAvisoLimiteFotos] = useState('');
  const [mensajeError, setMensajeError] = useState('');
  const [analizando, setAnalizando] = useState(false);
  const [textoProgreso, setTextoProgreso] = useState('');
  const [comparandoId, setComparandoId] = useState(null);
  const [avisoBorradoId, setAvisoBorradoId] = useState(null);

  // Estado del menú interactivo pre-análisis (Báscula circular + Hora 12h)
  const [modalVisible, setModalVisible] = useState(false);
  const [pesoSeleccionadoKg, setPesoSeleccionadoKg] = useState(
    PERFIL_USUARIO_BASE.pesoKgBase
  );
  const [hora12, setHora12] = useState(8);
  const [minutos12, setMinutos12] = useState(0);
  const [periodo12, setPeriodo12] = useState('AM');
  const [momentoDia, setMomentoDia] = useState('En ayunas');

  // Caché en memoria de las fotos Base64 recién analizadas en la sesión actual (sin guardar Base64 en AsyncStorage)
  const fotosBase64PorRegistroRef = useRef({});
  const timerAvisoRef = useRef(null);

  const fechaHoy = obtenerFechaLocal();
  const edadInfo = useMemo(() => calcularEdadExacta(), []);
  const tiempoEntrenoInfo = useMemo(() => calcularTiempoEntrenando(), []);

  const listaRegistros = Array.isArray(cambiosExternos)
    ? cambiosExternos
    : registrosInternos;
  const perfilActivo = perfilExterno || perfilInterno;

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
    if (analizando) {
      return;
    }
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
    if (analizando) {
      return;
    }
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
    if (analizando) {
      return;
    }
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

      // Advertencia Crítica 2: NO usar allowsEditing junto con allowsMultipleSelection
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
    if (fotosSeleccionadas.length === 0 || analizando) {
      return;
    }
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
    setHora12((prev) => {
      const siguiente = ((prev - 1 + delta + 12) % 12) + 1;
      return siguiente;
    });
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
    if (analizando || fotosSeleccionadas.length === 0) {
      return;
    }

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
                ? `${falloAnterior.modelo} falló (${falloAnterior.status}). Probando ${modelo} (${indice}/${total})...`
                : `Evaluando ${imagenesBase64.length} foto(s) con ${modelo} (${indice}/${total})...`
            );
          },
        }
      );

      const idNuevoRegistro = `${Date.now()}-${Math.random()
        .toString(36)
        .substring(2, 8)}`;

      // Guardar Base64 sólo en memoria de sesión para comparación inmediata (nunca en AsyncStorage)
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

  /**
   * Un solo toque (onPress): dispara simultáneamente vibración háptica y la comparativa con Gemini (RF-14, RF-15).
   */
  const manejarComparacionEnUnToque = async (registroActual, registroAnterior) => {
    if (!registroActual || !registroAnterior || Boolean(comparandoId)) {
      return;
    }

    // 1. Pulso háptico inmediato en el mismo toque (RF-15)
    vibrarToqueComparacion();

    // 2. Bloqueo contra doble toque e inicio de comparación
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
    setAvisoBorradoId(null);
    vibrarConfirmacionBorrado();
    Alert.alert(
      '⚠️ Eliminar chequeo físico',
      `¿Estás seguro de eliminar el análisis del ${item.fecha} (${item.pesoKg} kg · Veredicto ${item.veredicto}/10)?\n\nEsta acción borrará el registro definitivamente.`,
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
                <Text style={styles.textoChipContexto}>
                  ⚖️ {Number(item.pesoKg).toFixed(1)} kg
                </Text>
              </View>
              <View style={styles.chipContexto}>
                <Text style={styles.textoChipContexto}>
                  🎯 {item.objetivo || 'Mantenimiento'}
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

        {/* RF-13: Se muestra resumenSimple y balanceDelDia; resumenDetallado permanece guardado en AsyncStorage para futura Spec */}
        <View style={styles.bloqueResumenSimple}>
          <Text style={styles.etiquetaBloque}>RESUMEN GENERAL</Text>
          <Text style={styles.textoResumenSimple}>{item.resumenSimple}</Text>
        </View>

        {item.balanceDelDia ? (
          <View style={styles.bloqueBalanceDia}>
            <Text style={styles.etiquetaBalanceDia}>
              ⚡ BALANCE DEL DÍA (COMIDAS Y ENTRENAMIENTOS HOY)
            </Text>
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
              🔄 COMPARATIVA VS {item.comparacionAnterior.fechaAnterior} (
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
                  <ActivityIndicator size="small" color="#121212" />
                  <Text style={styles.textoBotonComparar}>
                    {' '}
                    Comparando con anterior...
                  </Text>
                </View>
              ) : (
                <Text style={styles.textoBotonComparar}>
                  {item.comparacionAnterior
                    ? '🔄 Re-comparar con anterior'
                    : '🔄 Comparar con registro anterior'}
                </Text>
              )}
            </TouchableOpacity>
          ) : (
            <View style={styles.insigniaPrimerRegistro}>
              <Text style={styles.textoPrimerRegistro}>
                🏁 Primer registro físico base
              </Text>
            </View>
          )}

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
        </View>

        {mostrandoAviso ? (
          <View style={styles.bannerAvisoBorrado}>
            <Text style={styles.textoAvisoBorrado}>
              ⚠️ Mantén presionado 1 segundo para eliminar este chequeo físico
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
        <Text style={styles.tituloVista}>Cambio Físico IA</Text>
        <Text style={styles.subtituloFecha}>Hoy: {fechaHoy}</Text>
      </View>

      <FlatList
        data={listaRegistros}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderizarTarjetaCambio}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contenidoLista}
        ListHeaderComponent={
          <View>
            {/* Ficha Biológica O(1) y Objetivo configurable (RF-2, RF-3, RF-4) */}
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
                    {PERFIL_USUARIO_BASE.alturaCm} cm ·{' '}
                    {ultimoPesoConocido.toFixed(1)} kg
                  </Text>
                  <Text style={styles.subvalorBio}>
                    {PERFIL_USUARIO_BASE.sexo} ({PERFIL_USUARIO_BASE.alturaMetros}{' '}
                    m)
                  </Text>
                </View>
              </View>

              <View style={styles.bloqueObjetivo}>
                <Text style={styles.etiquetaObjetivo}>
                  OBJETIVO ACTUAL (PREPARADO PARA CAMBIO):
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

            {/* Captura de 1 a 10 Fotografías (RF-6, RF-7) */}
            <View style={styles.tarjetaCaptura}>
              <View style={styles.filaTituloCaptura}>
                <Text style={styles.tituloSeccion}>
                  1. Selecciona de 1 a 10 fotografías
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
                  <Text style={styles.textoBotonCamara}>📷 Cámara</Text>
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
                  <Text style={styles.textoBotonGaleria}>
                    🖼 Galería (1–10)
                  </Text>
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
                          onPress={() => quitarFotoSeleccionada(foto.idTemp)}
                        >
                          <Text style={styles.textoQuitarFoto}>✕</Text>
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
                      <Text style={styles.textoBotonContinuarBascula}>
                        ⚖️ Continuar a Báscula y Hora · Analizar (
                        {fotosSeleccionadas.length})
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
                  <ActivityIndicator size="large" color="#00E676" />
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

            <View style={styles.encabezadoHistorial}>
              <Text style={styles.tituloSeccion}>
                Historial de Chequeos Físicos
              </Text>
              <Text style={styles.contadorLista}>
                {listaRegistros.length} registro(s)
              </Text>
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.estadoVacio}>
            <Text style={styles.textoVacio}>
              Aún no tienes análisis de cambio físico registrados. Adjunta entre
              1 y 10 fotografías para abrir la báscula circular y obtener tu
              veredicto 0/10.
            </Text>
          </View>
        }
      />

      {/* Menú Interactivo Pre-Análisis: Báscula Circular Moderna + Hora 12h AM/PM (RF-8, RF-9, RF-10) */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.fondoModal}>
          <View style={styles.contenedorModal}>
            <Text style={styles.tituloModal}>
              Contexto del Chequeo ({fotosSeleccionadas.length} foto
              {fotosSeleccionadas.length === 1 ? '' : 's'})
            </Text>
            <Text style={styles.subtituloModal}>
              Ajusta tu peso en la báscula circular y la hora de la toma
            </Text>

            {/* Báscula Moderna Circular (RF-9) */}
            <View style={styles.contenedorBasculaExterior}>
              <View style={styles.anilloBasculaExterno}>
                <View style={styles.agujaSuperiorBascula} />
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
                      style={[
                        styles.botonPasoPeso,
                        paso > 0
                          ? styles.botonPasoPositivo
                          : styles.botonPasoNegativo,
                      ]}
                      activeOpacity={0.8}
                      onPress={() => ajustarPesoBascula(paso)}
                    >
                      <Text style={styles.textoBotonPasoPeso}>{etiqueta}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Selector de Hora 12h (AM/PM) + Momento del Día (RF-10) */}
            <View style={styles.bloqueSelectorHora}>
              <Text style={styles.etiquetaSeccionModal}>
                HORA DE LA TOMA (FORMATO 12 HORAS)
              </Text>

              <View style={styles.filaReloj12h}>
                <View style={styles.columnaControlTiempo}>
                  <TouchableOpacity
                    style={styles.botonFlechaTiempo}
                    onPress={() => ajustarHora12(1)}
                  >
                    <Text style={styles.textoFlechaTiempo}>▲</Text>
                  </TouchableOpacity>
                  <Text style={styles.valorTiempoDigital}>
                    {String(hora12).padStart(2, '0')}
                  </Text>
                  <TouchableOpacity
                    style={styles.botonFlechaTiempo}
                    onPress={() => ajustarHora12(-1)}
                  >
                    <Text style={styles.textoFlechaTiempo}>▼</Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.dosPuntosReloj}>:</Text>

                <View style={styles.columnaControlTiempo}>
                  <TouchableOpacity
                    style={styles.botonFlechaTiempo}
                    onPress={() => ajustarMinutos12(5)}
                  >
                    <Text style={styles.textoFlechaTiempo}>+5m</Text>
                  </TouchableOpacity>
                  <Text style={styles.valorTiempoDigital}>
                    {String(minutos12).padStart(2, '0')}
                  </Text>
                  <TouchableOpacity
                    style={styles.botonFlechaTiempo}
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
                  ✨ Analizar con Gemini
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    flex: 1,
  },
  encabezado: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 10,
  },
  tituloVista: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
  },
  subtituloFecha: {
    color: '#00E676',
    fontSize: 13,
    fontWeight: '600',
  },
  contenidoLista: {
    paddingBottom: 16,
  },
  tarjetaPerfil: {
    backgroundColor: '#1E1E1E',
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2E2E2E',
  },
  filaMetricasBio: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  itemBio: {
    flex: 1,
    backgroundColor: '#262626',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 6,
    marginHorizontal: 3,
    alignItems: 'center',
  },
  etiquetaBio: {
    color: '#9E9E9E',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  valorBio: {
    color: '#00E676',
    fontSize: 13,
    fontWeight: '800',
    marginTop: 2,
  },
  subvalorBio: {
    color: '#8D8D8D',
    fontSize: 10,
    marginTop: 1,
  },
  bloqueObjetivo: {
    marginTop: 2,
  },
  etiquetaObjetivo: {
    color: '#9E9E9E',
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
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
  },
  chipObjetivoActivo: {
    backgroundColor: '#00E676',
    borderColor: '#00E676',
  },
  chipObjetivoInactivo: {
    backgroundColor: '#262626',
    borderColor: '#383838',
  },
  textoChipObjetivo: {
    fontSize: 10,
    fontWeight: '700',
  },
  textoChipObjetivoActivo: {
    color: '#121212',
  },
  textoChipObjetivoInactivo: {
    color: '#CFCFCF',
  },
  tarjetaCaptura: {
    backgroundColor: '#1E1E1E',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2E2E2E',
  },
  filaTituloCaptura: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  tituloSeccion: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  insigniaContadorFotos: {
    backgroundColor: '#262626',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: '#00E676',
  },
  textoContadorFotos: {
    color: '#00E676',
    fontSize: 11,
    fontWeight: '800',
  },
  filaBotonesCaptura: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  botonCaptura: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 3,
  },
  botonCamara: {
    backgroundColor: '#00E676',
  },
  botonGaleria: {
    backgroundColor: '#2A2A2A',
    borderWidth: 1,
    borderColor: '#00E676',
  },
  botonDeshabilitado: {
    opacity: 0.5,
  },
  textoBotonCamara: {
    color: '#121212',
    fontSize: 13,
    fontWeight: '800',
  },
  textoBotonGaleria: {
    color: '#00E676',
    fontSize: 13,
    fontWeight: '700',
  },
  textoAvisoLimite: {
    color: '#FFD54F',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 8,
  },
  contenedorPreviaFotos: {
    marginTop: 12,
  },
  scrollMiniaturas: {
    marginBottom: 10,
  },
  contenedorMiniaturaPrevia: {
    width: 68,
    height: 68,
    marginRight: 8,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#2A2A2A',
    position: 'relative',
  },
  imagenMiniaturaPrevia: {
    width: '100%',
    height: '100%',
  },
  badgeIndiceFoto: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    backgroundColor: 'rgba(18, 18, 18, 0.8)',
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  textoBadgeIndice: {
    color: '#00E676',
    fontSize: 9,
    fontWeight: '800',
  },
  botonQuitarFoto: {
    position: 'absolute',
    top: 3,
    right: 3,
    backgroundColor: 'rgba(255, 82, 82, 0.9)',
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textoQuitarFoto: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  filaAccionesPreAnalisis: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  botonContinuarBascula: {
    flex: 1,
    backgroundColor: '#00E676',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 10,
    alignItems: 'center',
    marginRight: 8,
  },
  textoBotonContinuarBascula: {
    color: '#121212',
    fontSize: 13,
    fontWeight: '800',
  },
  botonLimpiarSeleccion: {
    backgroundColor: '#2A2A2A',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#383838',
  },
  textoLimpiarSeleccion: {
    color: '#B0B0B0',
    fontSize: 12,
    fontWeight: '700',
  },
  contenedorCarga: {
    backgroundColor: '#242424',
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  textoCarga: {
    color: '#00E676',
    fontSize: 13,
    fontWeight: '800',
    marginTop: 8,
  },
  subtextoCarga: {
    color: '#9E9E9E',
    fontSize: 11,
    marginTop: 4,
    textAlign: 'center',
  },
  textoError: {
    color: '#FF5252',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 8,
  },
  encabezadoHistorial: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  contadorLista: {
    color: '#9E9E9E',
    fontSize: 12,
    fontWeight: '600',
  },
  tarjetaRegistro: {
    backgroundColor: '#1E1E1E',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#00E676',
  },
  filaEncabezadoTarjeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  columnaFechaHora: {
    flex: 1,
    marginRight: 10,
  },
  fechaTarjeta: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 6,
  },
  filaEtiquetasContexto: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  chipContexto: {
    backgroundColor: '#2A2A2A',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
    marginRight: 6,
    marginBottom: 4,
  },
  textoChipContexto: {
    color: '#D0D0D0',
    fontSize: 10,
    fontWeight: '700',
  },
  circuloVeredicto: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#14261D',
    borderWidth: 2,
    borderColor: '#00E676',
    alignItems: 'center',
    justifyContent: 'center',
  },
  etiquetaVeredicto: {
    color: '#9E9E9E',
    fontSize: 8,
    fontWeight: '800',
  },
  valorVeredicto: {
    color: '#00E676',
    fontSize: 18,
    fontWeight: '900',
  },
  escalaVeredicto: {
    color: '#B0B0B0',
    fontSize: 10,
    fontWeight: '700',
  },
  tiraFotosRegistro: {
    marginBottom: 10,
  },
  miniaturaTarjeta: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 8,
    backgroundColor: '#2A2A2A',
  },
  bloqueResumenSimple: {
    backgroundColor: '#252525',
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
  },
  etiquetaBloque: {
    color: '#00E676',
    fontSize: 10,
    fontWeight: '800',
    marginBottom: 4,
    letterSpacing: 0.4,
  },
  textoResumenSimple: {
    color: '#F0F0F0',
    fontSize: 13,
    lineHeight: 19,
  },
  bloqueBalanceDia: {
    backgroundColor: '#1B2520',
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#284636',
  },
  etiquetaBalanceDia: {
    color: '#00E676',
    fontSize: 10,
    fontWeight: '800',
    marginBottom: 4,
  },
  textoBalanceDia: {
    color: '#D8F3DC',
    fontSize: 12,
    lineHeight: 18,
  },
  filaPuntosClave: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  chipPuntoClave: {
    backgroundColor: '#262626',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 6,
    marginBottom: 4,
  },
  textoPuntoClave: {
    color: '#BDBDBD',
    fontSize: 11,
    fontWeight: '600',
  },
  bloqueComparacionResultado: {
    backgroundColor: '#21262D',
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#00E676',
  },
  tituloComparacionResultado: {
    color: '#00E676',
    fontSize: 10,
    fontWeight: '800',
    marginBottom: 4,
  },
  textoEvolucion: {
    color: '#FFFFFF',
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 6,
  },
  itemRecomendacion: {
    color: '#CFE8D5',
    fontSize: 11,
    lineHeight: 16,
    marginBottom: 2,
  },
  filaAccionesTarjeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  botonComparar: {
    flex: 1,
    backgroundColor: '#00E676',
    borderRadius: 8,
    paddingVertical: 9,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  filaComparando: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  textoBotonComparar: {
    color: '#121212',
    fontSize: 12,
    fontWeight: '800',
  },
  insigniaPrimerRegistro: {
    flex: 1,
    backgroundColor: '#262626',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginRight: 8,
    alignItems: 'center',
  },
  textoPrimerRegistro: {
    color: '#9E9E9E',
    fontSize: 11,
    fontWeight: '700',
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
    paddingHorizontal: 10,
  },
  iconoEliminar: {
    fontSize: 13,
    marginRight: 4,
  },
  textoBotonEliminar: {
    color: '#FF5252',
    fontSize: 11,
    fontWeight: '800',
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
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  textoVacio: {
    color: '#8D8D8D',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
  },
  fondoModal: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.82)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  contenedorModal: {
    width: '100%',
    backgroundColor: '#1A1A1A',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#2E2E2E',
  },
  tituloModal: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
  subtituloModal: {
    color: '#9E9E9E',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 2,
    marginBottom: 14,
  },
  contenedorBasculaExterior: {
    alignItems: 'center',
    marginBottom: 16,
  },
  anilloBasculaExterno: {
    width: 176,
    height: 176,
    borderRadius: 88,
    backgroundColor: '#121212',
    borderWidth: 5,
    borderColor: '#00E676',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    position: 'relative',
  },
  agujaSuperiorBascula: {
    position: 'absolute',
    top: 6,
    width: 6,
    height: 14,
    borderRadius: 3,
    backgroundColor: '#00E676',
  },
  circuloCentralBascula: {
    width: 142,
    height: 142,
    borderRadius: 71,
    backgroundColor: '#1F2923',
    borderWidth: 1.5,
    borderColor: '#2E4F3B',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  etiquetaInteriorBascula: {
    color: '#8D8D8D',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  filaValorPesoCircular: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginVertical: 2,
  },
  valorPesoCircular: {
    color: '#FFFFFF',
    fontSize: 34,
    fontWeight: '900',
  },
  unidadPesoCircular: {
    color: '#00E676',
    fontSize: 15,
    fontWeight: '800',
    marginLeft: 4,
  },
  textoDiferenciaBascula: {
    color: '#00E676',
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
  },
  filaBotonesPeso: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  botonPasoPeso: {
    flex: 1,
    paddingVertical: 8,
    marginHorizontal: 2,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
  },
  botonPasoNegativo: {
    backgroundColor: '#262626',
    borderColor: '#3A3A3A',
  },
  botonPasoPositivo: {
    backgroundColor: '#193326',
    borderColor: '#00E676',
  },
  textoBotonPasoPeso: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  bloqueSelectorHora: {
    backgroundColor: '#222222',
    borderRadius: 14,
    padding: 12,
    marginBottom: 16,
  },
  etiquetaSeccionModal: {
    color: '#9E9E9E',
    fontSize: 10,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: 0.6,
  },
  filaReloj12h: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  columnaControlTiempo: {
    alignItems: 'center',
    marginHorizontal: 6,
  },
  botonFlechaTiempo: {
    backgroundColor: '#2E2E2E',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  textoFlechaTiempo: {
    color: '#00E676',
    fontSize: 11,
    fontWeight: '800',
  },
  valorTiempoDigital: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '900',
    marginVertical: 4,
  },
  dosPuntosReloj: {
    color: '#00E676',
    fontSize: 24,
    fontWeight: '900',
    marginHorizontal: 2,
  },
  columnaAmPm: {
    marginLeft: 10,
  },
  botonAmPm: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginVertical: 2,
    borderWidth: 1,
  },
  botonAmPmActivo: {
    backgroundColor: '#00E676',
    borderColor: '#00E676',
  },
  botonAmPmInactivo: {
    backgroundColor: '#2C2C2C',
    borderColor: '#3E3E3E',
  },
  textoAmPm: {
    fontSize: 11,
    fontWeight: '800',
  },
  textoAmPmActivo: {
    color: '#121212',
  },
  textoAmPmInactivo: {
    color: '#B0B0B0',
  },
  filaMomentosDia: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  chipMomentoModal: {
    flex: 1,
    paddingVertical: 7,
    marginHorizontal: 2,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
  },
  chipMomentoActivo: {
    backgroundColor: '#00E676',
    borderColor: '#00E676',
  },
  chipMomentoInactivo: {
    backgroundColor: '#2C2C2C',
    borderColor: '#3A3A3A',
  },
  textoChipMomento: {
    fontSize: 10,
    fontWeight: '700',
  },
  textoChipMomentoActivo: {
    color: '#121212',
  },
  textoChipMomentoInactivo: {
    color: '#D0D0D0',
  },
  filaBotonesModal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  botonCancelarModal: {
    flex: 1,
    backgroundColor: '#2A2A2A',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginRight: 6,
  },
  textoCancelarModal: {
    color: '#CFCFCF',
    fontSize: 13,
    fontWeight: '700',
  },
  botonConfirmarModal: {
    flex: 2,
    backgroundColor: '#00E676',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginLeft: 6,
  },
  textoConfirmarModal: {
    color: '#121212',
    fontSize: 14,
    fontWeight: '900',
  },
});
