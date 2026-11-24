/**
 * Ajustes de los selectores, validación por paso, avance, retroceso y guardado del perfil.
 * Extraído sin cambios de OnboardingBienvenidaModal.jsx (Spec 022). No editar la lógica aquí sin revisar el componente.
 */
import { Keyboard } from 'react-native';
import { SEXOS_PERFIL_VALIDOS, guardarPerfilCompletoUsuario, parsearFechaLocalYYYYMMDD } from '../../services/storage';
import { SPRING_SNAPPY, obtenerMaxDiasMes } from './base';
import { vibrarEjercicioCompletado, vibrarInicioPresionBorrado, vibrarSeleccionBascula, vibrarToqueComparacion } from '../../services/haptics';
import { withSequence, withSpring, withTiming } from 'react-native-reanimated';

export function useAccionesOnboarding({ anioInicioSeguro, anioNac, bioBannerSV, edadCalculada, escena, estaturaCm, fechaInicioEntrenoEfectiva, fechaNacimientoYYYYMMDD, guardandoRef, maxAnioInicioPermitido, maxAnioPermitido, mesInicioSeguro, mesNac, minAnioInicioPermitido, minAnioPermitido, modoEdicion, nombre, objetivo, objetivoBannerSV, obtenerMaxDiaInicio, obtenerMaxMesInicio, onCerrar, onCompletado, onPerfilActualizado, perfilConsolidado, pesoInicialKg, setAnioInicio, setAnioNac, setDiaInicio, setDiaNac, setErrorValidacion, setEstaturaCm, setGuardando, setMesInicio, setMesNac, setObjetivo, setPerfilConsolidado, setPesoInicialKg, setSexo, sexo, timelinePulseSV, transicionarAEscena }) {
  // ==========================================================================
  // MANEJADORES DE INTERACCIÓN Y CONTROLES TÁCTILES
  // ==========================================================================
  const seleccionarSexo = (nuevoSexo) => {
    vibrarToqueComparacion();
    setSexo(nuevoSexo);
    bioBannerSV.value = 0.88;
    bioBannerSV.value = withSpring(1, SPRING_SNAPPY);
  };

  // Defensa 2: Ajustadores de Fecha de Nacimiento con acotación sincrónica de días del mes
  const ajustarDiaNacimiento = (delta) => {
    vibrarSeleccionBascula();
    const maxD = obtenerMaxDiasMes(anioNac, mesNac);
    setDiaNac((prev) => {
      let sig = prev + delta;
      if (sig > maxD) sig = 1;
      if (sig < 1) sig = maxD;
      return sig;
    });
  };

  const ajustarMesNacimiento = (delta) => {
    vibrarSeleccionBascula();
    setMesNac((prevMes) => {
      let nuevoMes = prevMes + delta;
      if (nuevoMes > 12) nuevoMes = 1;
      if (nuevoMes < 1) nuevoMes = 12;
      const maxD = obtenerMaxDiasMes(anioNac, nuevoMes);
      setDiaNac((prevDia) => Math.min(prevDia, maxD));
      return nuevoMes;
    });
  };

  const ajustarAnioNacimiento = (delta) => {
    vibrarSeleccionBascula();
    setAnioNac((prevAnio) => {
      const nuevoAnio = Math.max(
        minAnioPermitido,
        Math.min(maxAnioPermitido, prevAnio + delta)
      );
      const maxD = obtenerMaxDiasMes(nuevoAnio, mesNac);
      setDiaNac((prevDia) => Math.min(prevDia, maxD));
      return nuevoAnio;
    });
  };

  const ajustarEstatura = (delta) => {
    vibrarSeleccionBascula();
    setEstaturaCm((prev) => Math.max(120, Math.min(230, prev + delta)));
  };

  const ajustarPesoInicial = (delta) => {
    vibrarSeleccionBascula();
    setPesoInicialKg((prev) => {
      const sig = Number((prev + delta).toFixed(1));
      return Math.max(30.0, Math.min(250.0, sig));
    });
  };

  const dispararPulsoTimeline = () => {
    timelinePulseSV.value = withSequence(
      withTiming(1.03, { duration: 95 }),
      withSpring(1, SPRING_SNAPPY)
    );
  };

  const seleccionarEmpeceHoy = () => {
    vibrarToqueComparacion();
    const hoy = new Date();
    setAnioInicio(hoy.getFullYear());
    setMesInicio(hoy.getMonth() + 1);
    setDiaInicio(hoy.getDate());
    dispararPulsoTimeline();
  };

  const ajustarDiaInicio = (delta) => {
    vibrarSeleccionBascula();
    const maxD = obtenerMaxDiaInicio(anioInicioSeguro, mesInicioSeguro);
    setDiaInicio((prev) => {
      const baseDia = Math.min(prev, maxD);
      let sig = baseDia + delta;
      if (sig > maxD) sig = 1;
      if (sig < 1) sig = maxD;
      return sig;
    });
    dispararPulsoTimeline();
  };

  const ajustarMesInicio = (delta) => {
    vibrarSeleccionBascula();
    const maxM = obtenerMaxMesInicio(anioInicioSeguro);
    setMesInicio((prevMes) => {
      const baseMes = Math.min(prevMes, maxM);
      let nuevoMes = baseMes + delta;
      if (nuevoMes > maxM) nuevoMes = 1;
      if (nuevoMes < 1) nuevoMes = maxM;
      const maxD = obtenerMaxDiaInicio(anioInicioSeguro, nuevoMes);
      setDiaInicio((prevDia) => Math.min(prevDia, maxD));
      return nuevoMes;
    });
    dispararPulsoTimeline();
  };

  const ajustarAnioInicio = (delta) => {
    vibrarSeleccionBascula();
    setAnioInicio((prevAnio) => {
      const nuevoAnio = Math.max(
        minAnioInicioPermitido,
        Math.min(maxAnioInicioPermitido, prevAnio + delta)
      );
      const maxM = obtenerMaxMesInicio(nuevoAnio);
      const mesAcotado = Math.min(mesInicioSeguro, maxM);
      setMesInicio(mesAcotado);
      const maxD = obtenerMaxDiaInicio(nuevoAnio, mesAcotado);
      setDiaInicio((prevDia) => Math.min(prevDia, maxD));
      return nuevoAnio;
    });
    dispararPulsoTimeline();
  };

  const seleccionarObjetivo = (nuevoObj) => {
    vibrarToqueComparacion();
    setObjetivo(nuevoObj);
    objetivoBannerSV.value = 0.9;
    objetivoBannerSV.value = withSpring(1, SPRING_SNAPPY);
  };

  // ==========================================================================
  // NAVEGACIÓN ENTRE PASOS Y GUARDADO CONSOLIDADO
  // ==========================================================================
  const validarPasoActual = () => {
    if (escena === 1) {
      if (!SEXOS_PERFIL_VALIDOS.includes(sexo)) {
        setErrorValidacion('Selecciona tu sexo biológico para calibrar las fórmulas.');
        vibrarInicioPresionBorrado();
        return false;
      }
      if (edadCalculada === null || edadCalculada < 10 || edadCalculada > 100) {
        setErrorValidacion('Verifica tu fecha de nacimiento (entre 10 y 90 años).');
        vibrarInicioPresionBorrado();
        return false;
      }
    }
    if (escena === 3) {
      const hoy = new Date();
      const hoyISO = `${String(hoy.getFullYear()).padStart(4, '0')}-${String(
        hoy.getMonth() + 1
      ).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
      const parsedIni = parsearFechaLocalYYYYMMDD(fechaInicioEntrenoEfectiva);
      if (!parsedIni || parsedIni.iso > hoyISO) {
        setErrorValidacion(
          'La fecha de inicio de entrenamiento no puede ser posterior al día de hoy.'
        );
        vibrarInicioPresionBorrado();
        return false;
      }
    }
    setErrorValidacion('');
    return true;
  };

  const handleAvanzarPaso = async () => {
    if (escena === 0) {
      vibrarToqueComparacion();
      transicionarAEscena(1, 1);
      return;
    }

    if (!validarPasoActual()) return;

    if (escena >= 1 && escena <= 3) {
      vibrarInicioPresionBorrado();
      transicionarAEscena(escena + 1, 1);
      return;
    }

    if (escena === 4) {
      // Defensa 8: bloqueo síncrono contra doble tap
      if (guardandoRef.current) return;
      guardandoRef.current = true;
      setGuardando(true);
      setErrorValidacion('');
      Keyboard.dismiss();

      try {
        const nombreSanitizado = String(nombre || '')
          .replace(/[\r\n]+/g, ' ')
          .trim()
          .slice(0, 40);
        const alturaRedondeada = Math.round(estaturaCm);
        const pesoRedondeado = Number(pesoInicialKg.toFixed(1));

        const payloadPerfil = {
          nombre: nombreSanitizado,
          sexo,
          fechaNacimiento: fechaNacimientoYYYYMMDD,
          alturaCm: alturaRedondeada,
          estaturaCm: alturaRedondeada,
          pesoKgBase: pesoRedondeado,
          pesoInicialKg: pesoRedondeado,
          fechaInicioEntreno: fechaInicioEntrenoEfectiva,
          objetivo,
          onboardingCompletado: true,
        };

        const perfilGuardado = await guardarPerfilCompletoUsuario(payloadPerfil);
        setPerfilConsolidado(perfilGuardado);
        onPerfilActualizado?.(perfilGuardado);
        await vibrarEjercicioCompletado();
        transicionarAEscena(5, 1);
      } catch (error) {
        setErrorValidacion('No se pudo guardar el perfil. Inténtalo de nuevo.');
        guardandoRef.current = false;
      } finally {
        setGuardando(false);
      }
    }
  };

  const handleRetrocederPaso = () => {
    if (escena === 1) {
      if (!modoEdicion) {
        vibrarInicioPresionBorrado();
        transicionarAEscena(0, -1);
      } else if (onCerrar) {
        vibrarInicioPresionBorrado();
        Keyboard.dismiss();
        onCerrar();
      }
      return;
    }
    if (escena >= 2 && escena <= 4) {
      vibrarInicioPresionBorrado();
      transicionarAEscena(escena - 1, -1);
    }
  };

  const handleFinalizarCelebracion = () => {
    vibrarToqueComparacion();
    const nombreSanitizado = String(nombre || '')
      .replace(/[\r\n]+/g, ' ')
      .trim()
      .slice(0, 40);
    const alturaRedondeada = Math.round(estaturaCm);
    const pesoRedondeado = Number(pesoInicialKg.toFixed(1));

    const perfilFinal = perfilConsolidado || {
      nombre: nombreSanitizado,
      sexo,
      fechaNacimiento: fechaNacimientoYYYYMMDD,
      alturaCm: alturaRedondeada,
      estaturaCm: alturaRedondeada,
      pesoKgBase: pesoRedondeado,
      pesoInicialKg: pesoRedondeado,
      fechaInicioEntreno: fechaInicioEntrenoEfectiva,
      objetivo,
      onboardingCompletado: true,
    };
    onCompletado?.(perfilFinal);
  };

  return { seleccionarSexo, ajustarDiaNacimiento, ajustarMesNacimiento, ajustarAnioNacimiento, ajustarEstatura, ajustarPesoInicial, dispararPulsoTimeline, seleccionarEmpeceHoy, ajustarDiaInicio, ajustarMesInicio, ajustarAnioInicio, seleccionarObjetivo, validarPasoActual, handleAvanzarPaso, handleRetrocederPaso, handleFinalizarCelebracion };
}
