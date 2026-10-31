import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert } from 'react-native';
import { obtenerFechaLocal } from './dateUtilsLocal';
import {
  guardarSesionEstudio,
  actualizarSesionEstudio,
  eliminarSesionEstudio,
  guardarMateria,
  actualizarMateria,
  eliminarMateria,
  obtenerResumenEstudio,
  existeClaveResumenEstudio,
  guardarResumenEstudio,
} from '../services/estudioStorage';
import { construirContextoResumenEstudio } from './resumenEstudio';
import { analizarEstudioDelDiaConGemini } from '../services/gemini';
import { vibrarEjercicioCompletado } from '../services/haptics';

/**
 * Candado de módulo para evitar llamadas concurrentes a Gemini
 * y sobrevivir al desmontaje / remonte de vistas (Defensa 2).
 */
let analisisEnCurso = null;

/**
 * Hook que encapsula la lógica de negocio, filtros y persistencia para la pestaña de Estudio.
 */
export function useEstudio({
  sesionesExternas = [],
  materiasExternas = [],
  onSesionesActualizadas,
  onMateriasActualizadas,
}) {
  const fechaHoy = obtenerFechaLocal();
  const [fechaSeleccionada, setFechaSeleccionada] = useState(fechaHoy);
  const [materiaFiltro, setMateriaFiltro] = useState(null);

  // Estados de Resumen IA (Spec 016)
  const [entradaResumen, setEntradaResumen] = useState(null);
  const [analizando, setAnalizando] = useState(() => Boolean(analisisEnCurso));
  const [progreso, setProgreso] = useState(null);

  const montadoRef = useRef(true);
  const fechaSeleccionadaRef = useRef(fechaSeleccionada);
  useEffect(() => {
    fechaSeleccionadaRef.current = fechaSeleccionada;
  }, [fechaSeleccionada]);

  useEffect(() => {
    montadoRef.current = true;
    return () => {
      montadoRef.current = false;
    };
  }, []);

  // Carga del resumen correspondiente a fechaSeleccionada
  useEffect(() => {
    let cancelado = false;
    obtenerResumenEstudio(fechaSeleccionada)
      .then((resumen) => {
        if (!cancelado && montadoRef.current) {
          setEntradaResumen(resumen);
        }
      })
      .catch(() => {
        if (!cancelado && montadoRef.current) {
          setEntradaResumen(null);
        }
      });

    return () => {
      cancelado = true;
    };
  }, [fechaSeleccionada]);

  // Si se monta una instancia mientras hay un análisis en curso a nivel de módulo
  useEffect(() => {
    if (analisisEnCurso) {
      analisisEnCurso.promesa
        .catch(() => {})
        .finally(() => {
          if (montadoRef.current) {
            setAnalizando(false);
            setProgreso(null);
            obtenerResumenEstudio(fechaSeleccionada).then((res) => {
              if (montadoRef.current) {
                setEntradaResumen(res);
              }
            });
          }
        });
    }
  }, [fechaSeleccionada]);

  // Fechas únicas con sesiones para el punto indicador de SelectorSemanal
  const diasConSesiones = useMemo(() => {
    return Array.from(new Set(sesionesExternas.map((s) => s.fecha)));
  }, [sesionesExternas]);

  // Sesiones del día seleccionado ordenadas por creadaEn descendente
  const sesionesDelDia = useMemo(() => {
    return sesionesExternas
      .filter((s) => s.fecha === fechaSeleccionada)
      .sort((a, b) => (b.creadaEn || 0) - (a.creadaEn || 0));
  }, [sesionesExternas, fechaSeleccionada]);

  // Sesiones de la materia filtrada ordenadas por fecha desc y luego creadaEn desc (CA-8)
  const sesionesDeMateria = useMemo(() => {
    if (!materiaFiltro) return [];
    return sesionesExternas
      .filter((s) => s.materiaId === materiaFiltro)
      .sort((a, b) => {
        if (b.fecha !== a.fecha) {
          return b.fecha.localeCompare(a.fecha);
        }
        return (b.creadaEn || 0) - (a.creadaEn || 0);
      });
  }, [sesionesExternas, materiaFiltro]);

  // Diccionario de materias por ID para resolución O(1) y fallback tolerante (Defensa 3)
  const mapaMaterias = useMemo(() => {
    const mapa = new Map();
    materiasExternas.forEach((m) => mapa.set(m.id, m));
    return mapa;
  }, [materiasExternas]);

  const obtenerMateriaPorId = useCallback(
    (materiaId) => {
      const encontrada = mapaMaterias.get(materiaId);
      if (encontrada) return encontrada;
      return { id: materiaId, nombre: 'Sin materia', categoria: 'Personal' };
    },
    [mapaMaterias]
  );

  // Conteo de sesiones por materia para validar antes de borrado y badges
  const conteoPorMateria = useMemo(() => {
    const conteos = {};
    sesionesExternas.forEach((s) => {
      conteos[s.materiaId] = (conteos[s.materiaId] || 0) + 1;
    });
    return conteos;
  }, [sesionesExternas]);

  // Mutaciones de sesiones
  const crearSesion = useCallback(
    async (datos) => {
      const nuevaSesion = await guardarSesionEstudio(datos, {
        fechaHoy,
        materias: materiasExternas,
      });
      if (typeof onSesionesActualizadas === 'function') {
        onSesionesActualizadas((prev) => [nuevaSesion, ...prev]);
      }
      return nuevaSesion;
    },
    [fechaHoy, materiasExternas, onSesionesActualizadas]
  );

  const actualizarSesion = useCallback(
    async (id, fecha, cambios) => {
      const sesionActualizada = await actualizarSesionEstudio(id, fecha, cambios, {
        materias: materiasExternas,
      });
      if (typeof onSesionesActualizadas === 'function') {
        onSesionesActualizadas((prev) =>
          prev.map((s) => (s.id === id ? sesionActualizada : s))
        );
      }
      return sesionActualizada;
    },
    [materiasExternas, onSesionesActualizadas]
  );

  const borrarSesion = useCallback(
    async (id, fecha) => {
      await eliminarSesionEstudio(id, fecha);
      if (typeof onSesionesActualizadas === 'function') {
        onSesionesActualizadas((prev) => prev.filter((s) => s.id !== id));
      }
      return id;
    },
    [onSesionesActualizadas]
  );

  // Mutaciones de materias
  const crearNuevaMateria = useCallback(
    async (datos) => {
      const listaActualizada = await guardarMateria(datos);
      if (typeof onMateriasActualizadas === 'function') {
        onMateriasActualizadas(listaActualizada);
      }
      return listaActualizada;
    },
    [onMateriasActualizadas]
  );

  const editarMateria = useCallback(
    async (id, datos) => {
      const listaActualizada = await actualizarMateria(id, datos);
      if (typeof onMateriasActualizadas === 'function') {
        onMateriasActualizadas(listaActualizada);
      }
      return listaActualizada;
    },
    [onMateriasActualizadas]
  );

  const borrarMateria = useCallback(
    async (id) => {
      const listaActualizada = await eliminarMateria(id);
      if (typeof onMateriasActualizadas === 'function') {
        onMateriasActualizadas(listaActualizada);
      }
      return listaActualizada;
    },
    [onMateriasActualizadas]
  );

  // Ejecutor del Análisis IA del Día de Estudio (Spec 016)
  const manejarAnalizar = useCallback(async () => {
    if (analisisEnCurso) {
      return;
    }

    const fechaHoyActual = obtenerFechaLocal();
    if (fechaHoyActual !== fechaSeleccionada) {
      Alert.alert(
        'Día no disponible',
        'Cambió el día; vuelve a abrir el día de hoy.'
      );
      return;
    }

    setAnalizando(true);
    setProgreso(null);

    const promesaAnalisis = (async () => {
      try {
        const yaExiste = await existeClaveResumenEstudio(fechaHoyActual);
        if (yaExiste) {
          const resumenGuardado = await obtenerResumenEstudio(fechaHoyActual);
          if (montadoRef.current) {
            setEntradaResumen(resumenGuardado);
          }
          if (!resumenGuardado) {
            Alert.alert(
              'Análisis de estudio',
              'Hay un resumen de hoy que no se pudo leer; no se volverá a analizar.'
            );
          }
          return;
        }

        const contexto = construirContextoResumenEstudio({
          sesiones: sesionesExternas,
          materias: materiasExternas,
          fechaHoy: fechaHoyActual,
        });

        const { resultado, modeloUsado, hora12h } =
          await analizarEstudioDelDiaConGemini(contexto, {
            onProgreso: (p) => {
              if (montadoRef.current) {
                setProgreso(p);
              }
            },
          });

        const entrada = {
          resultado,
          generadoEn: Date.now(),
          hora12h,
          firmas: contexto.firmas,
          modeloUsado,
        };

        await guardarResumenEstudio(fechaHoyActual, entrada);

        if (montadoRef.current && fechaSeleccionadaRef.current === fechaHoyActual) {
          setEntradaResumen(entrada);
        }
        vibrarEjercicioCompletado();
      } catch (error) {
        if (error?.message && error.message.includes('Ya existe')) {
          const resumenGuardado = await obtenerResumenEstudio(fechaHoyActual);
          if (montadoRef.current && fechaSeleccionadaRef.current === fechaHoyActual) {
            setEntradaResumen(resumenGuardado);
          }
          if (!resumenGuardado) {
            Alert.alert(
              'Análisis de estudio',
              'Hay un resumen de hoy que no se pudo leer; no se volverá a analizar.'
            );
          }
        } else {
          Alert.alert(
            'Análisis de estudio',
            error?.message || 'Error al analizar el día de estudio.'
          );
        }
      } finally {
        analisisEnCurso = null;
        if (montadoRef.current) {
          setAnalizando(false);
          setProgreso(null);
        }
      }
    })();

    analisisEnCurso = {
      fecha: fechaHoyActual,
      promesa: promesaAnalisis,
    };

    await promesaAnalisis;
  }, [fechaSeleccionada, sesionesExternas, materiasExternas]);

  return {
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
  };
}
