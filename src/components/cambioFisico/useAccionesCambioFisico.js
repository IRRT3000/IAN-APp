/**
 * Fotos, báscula y hora, análisis con Gemini, comparación y borrado de registros.
 * Extraído sin cambios de CambioFisicoView.jsx (Spec 022). No editar la lógica aquí sin revisar el componente.
 */
import * as ImagePicker from 'expo-image-picker';
import { MAX_FOTOS_POR_ANALISIS, formatearHora12h, obtenerEstadoHoraInicial } from './base';
import { PERFIL_USUARIO_BASE, actualizarComparacionCambioFisico, actualizarObjetivoPerfil, calcularEdadExacta, calcularTiempoEntrenando, cargarPerfilUsuario, eliminarCambioFisico, guardarCambioFisico, obtenerFechaLocal } from '../../services/storage';
import { Platform } from 'react-native';
import { analizarCambioFisicoConGemini, compararCambioFisicoConGemini } from '../../services/gemini';
import { eliminarFotos, persistirFoto } from '../../services/fotosStorage';
import { mostrarAlerta } from '../../utils/alertUtils';
import { textoProgresoGemini } from '../../utils/progresoGemini';
import {
  vibrarSeleccionBascula,
  vibrarToqueComparacion,
  vibrarExito,
  vibrarError,
} from '../../services/haptics';
import { anunciar } from '../../utils/accesibilidad';
import { reproducirSonido } from '../../services/sonidos';

export function useAccionesCambioFisico({ alturaCmPerfil, alturaMetrosPerfil, analizando, comidasHoy, comparandoId, entrenamientosHoy, esHoy, fotosBase64PorRegistroRef, fotosSeleccionadas, hora12, listaRegistros, minutos12, momentoDia, onCambioFisicoActualizado, onPerfilActualizado, perfilActivo, periodo12, pesoBasePerfil, pesoSeleccionadoKg, setAnalizando, setAvisoBorradoId, setAvisoLimiteFotos, setComparandoId, setFotosSeleccionadas, setHora12, setMensajeError, setMinutos12, setModalVisible, setMomentoDia, setPerfilInterno, setPeriodo12, setPesoSeleccionadoKg, setRegistrosInternos, setTextoProgreso, sexoPerfil, timerAvisoRef, ultimoPesoConocido }) {
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
      if (Platform.OS !== 'web') {
        const permiso = await ImagePicker.requestCameraPermissionsAsync();
        if (!permiso.granted) {
          setMensajeError('Se requiere permiso para acceder a la cámara.');
          return;
        }
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
    const urisTemporales = fotosSeleccionadas
      .slice(0, MAX_FOTOS_POR_ANALISIS)
      .map((f) => f.uri);
    let urisFotos = [];
    let registroGuardado = false;

    setModalVisible(false);
    setAnalizando(true);
    setMensajeError('');

    try {
      const edadActual = calcularEdadExacta(
        new Date(),
        perfilActivo?.fechaNacimiento || PERFIL_USUARIO_BASE.fechaNacimiento
      );
      const antiguedadActual = calcularTiempoEntrenando(
        new Date(),
        perfilActivo?.fechaInicioEntreno || PERFIL_USUARIO_BASE.fechaInicioEntreno
      );

      const contextoUsuario = {
        edadTexto: edadActual.texto,
        fechaNacimiento: edadActual.fechaNacimiento,
        tiempoEntrenandoTexto: antiguedadActual.texto,
        fechaInicioEntreno: antiguedadActual.fechaInicio,
        alturaCm: alturaCmPerfil,
        alturaMetros: alturaMetrosPerfil,
        pesoKg: pesoSeleccionadoKg,
        pesoKgBase: pesoBasePerfil,
        sexo: sexoPerfil,
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
          onProgreso: (info) => {
            setTextoProgreso(
              textoProgresoGemini(
                info,
                `Evaluando ${imagenesBase64.length} foto(s) con ${info.modelo} (${info.indice}/${info.total})...`
              )
            );
          },
        }
      );

      // Solo tras un análisis exitoso se copian las fotos a almacenamiento permanente (Spec 020, plan §6).
      urisFotos = await Promise.all(
        urisTemporales.map((uri) => persistirFoto(uri, 'fisico'))
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
        alturaCm: alturaCmPerfil,
        edadExacta: edadActual.anios,
        fechaNacimiento: edadActual.fechaNacimientoISO,
        fechaInicioEntreno: antiguedadActual.fechaInicioISO,
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
      registroGuardado = true;
      anunciar('Análisis de cambio físico guardado');
      vibrarExito();
      reproducirSonido('exito');
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
      // Solo si el registro NO se guardó, las copias permanentes quedan sin dueño y se borran.
      if (!registroGuardado) {
        eliminarFotos(urisFotos.filter((uri) => !urisTemporales.includes(uri)));
      }
      const mensaje =
        error?.message ||
        'No se pudo completar el análisis físico con Gemini. Verifica tu conexión o API Key.';
      setMensajeError(mensaje);
      vibrarError();
      reproducirSonido('error');
      mostrarAlerta('No se pudo analizar el cambio físico', mensaje, [
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
        perfilUsuario: perfilActivo,
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
      anunciar('Comparación con el registro anterior lista');
      vibrarExito();
      reproducirSonido('exito');

      if (typeof onCambioFisicoActualizado === 'function') {
        await onCambioFisicoActualizado(listaActualizada);
      }
    } catch (error) {
      const mensaje =
        error?.message ||
        'No se pudo comparar con el registro anterior en este momento.';
      setMensajeError(mensaje);
      mostrarAlerta('Error al comparar registros', mensaje, [
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
      anunciar('Registro borrado');
      setRegistrosInternos(listaActualizada);
      setAvisoBorradoId(null);

      if (typeof onCambioFisicoActualizado === 'function') {
        await onCambioFisicoActualizado(listaActualizada);
      }
    } catch (error) {
      const mensaje =
        error?.message || 'No se pudo eliminar el chequeo físico.';
      mostrarAlerta('Error al eliminar', mensaje, [
        { text: 'Entendido', style: 'cancel' },
      ]);
    }
  };

  const solicitarConfirmacionBorrado = (item) => {
    if (!esHoy) return;
    setAvisoBorradoId(null);
    mostrarAlerta(
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

  return { cambiarObjetivo, agregarActivosSeleccionados, abrirCamara, abrirGaleria, quitarFotoSeleccionada, limpiarFotosSeleccionadas, abrirMenuInteractivoPreAnalisis, ajustarPesoBascula, ajustarHora12, ajustarMinutos12, alternarPeriodo12, confirmarYAnalizarCambioFisico, manejarComparacionEnUnToque, mostrarAvisoToqueCorto, ejecutarBorradoRegistro, solicitarConfirmacionBorrado };
}
