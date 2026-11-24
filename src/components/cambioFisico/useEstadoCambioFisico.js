/**
 * Estado de la vista, perfil activo, valores derivados y sincronización de datos.
 * Extraído sin cambios de CambioFisicoView.jsx (Spec 022). No editar la lógica aquí sin revisar el componente.
 */
import { PERFIL_USUARIO_BASE, calcularEdadExacta, calcularTiempoEntrenando, cargarCambiosFisicos, cargarPerfilUsuario, obtenerFechaLocal } from '../../services/storage';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

export function useEstadoCambioFisico({ cambiosExternos, perfilExterno, perfilUsuario }) {
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

  const listaRegistros = Array.isArray(cambiosExternos)
    ? cambiosExternos
    : registrosInternos;

  const perfilActivo = perfilExterno || perfilUsuario || perfilInterno;

  const edadInfo = useMemo(
    () =>
      calcularEdadExacta(
        new Date(),
        perfilActivo?.fechaNacimiento || PERFIL_USUARIO_BASE.fechaNacimiento
      ),
    [perfilActivo?.fechaNacimiento]
  );

  const tiempoEntrenoInfo = useMemo(
    () =>
      calcularTiempoEntrenando(
        new Date(),
        perfilActivo?.fechaInicioEntreno || PERFIL_USUARIO_BASE.fechaInicioEntreno
      ),
    [perfilActivo?.fechaInicioEntreno]
  );

  const pesoBasePerfil = useMemo(() => {
    if (Number(perfilActivo?.pesoKgBase) > 0) {
      return Math.round(Number(perfilActivo.pesoKgBase) * 10) / 10;
    }
    return PERFIL_USUARIO_BASE.pesoKgBase;
  }, [perfilActivo?.pesoKgBase]);

  // eslint-disable-next-line react-hooks/preserve-manual-memoization -- spec futura
  const alturaCmPerfil = useMemo(() => {
    if (Number(perfilActivo?.alturaCm) > 0) {
      return Math.round(Number(perfilActivo.alturaCm));
    }
    return PERFIL_USUARIO_BASE.alturaCm;
  }, [perfilActivo?.alturaCm]);

  const alturaMetrosPerfil = useMemo(
    () => Math.round(alturaCmPerfil) / 100,
    [alturaCmPerfil]
  );

  const sexoPerfil = perfilActivo?.sexo || PERFIL_USUARIO_BASE.sexo;

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
      // eslint-disable-next-line react-hooks/set-state-in-effect -- spec futura
      sincronizarDatosLocales();
    }
  }, [cambiosExternos, perfilExterno, sincronizarDatosLocales]);

  useEffect(() => {
    return () => {
      if (timerAvisoRef.current) {
        // eslint-disable-next-line react-hooks/exhaustive-deps -- timerAvisoRef guarda un setTimeout, no un nodo; se lee al desmontar a propósito (código original).
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
    return pesoBasePerfil;
  }, [listaRegistros, perfilActivo, pesoBasePerfil]);

  return { fechaSeleccionada, setFechaSeleccionada, registrosInternos, setRegistrosInternos, perfilInterno, setPerfilInterno, fotosSeleccionadas, setFotosSeleccionadas, avisoLimiteFotos, setAvisoLimiteFotos, mensajeError, setMensajeError, analizando, setAnalizando, textoProgreso, setTextoProgreso, comparandoId, setComparandoId, avisoBorradoId, setAvisoBorradoId, modalVisible, setModalVisible, pesoSeleccionadoKg, setPesoSeleccionadoKg, hora12, setHora12, minutos12, setMinutos12, periodo12, setPeriodo12, momentoDia, setMomentoDia, fotosBase64PorRegistroRef, timerAvisoRef, fechaHoy, esHoy, listaRegistros, perfilActivo, edadInfo, tiempoEntrenoInfo, pesoBasePerfil, alturaCmPerfil, alturaMetrosPerfil, sexoPerfil, diasConFoto, registrosDelDia, sincronizarDatosLocales, ultimoPesoConocido };
}
