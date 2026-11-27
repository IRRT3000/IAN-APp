/**
 * Valores derivados en tiempo real: fechas, edad, IMC, antigüedad y nivel.
 * Extraído sin cambios de OnboardingBienvenidaModal.jsx (Spec 022). No editar la lógica aquí sin revisar el componente.
 */
import { CATALOGO_OBJETIVOS, SPRING_SNAPPY, obtenerMaxDiasMes } from './base';
import { calcularEdadExacta, calcularTiempoEntrenando } from '../../services/storage';
import { useCallback, useEffect, useMemo } from 'react';
import { withSequence, withSpring, withTiming } from 'react-native-reanimated';

export function useDerivadosOnboarding({ anioActual, anioInicio, anioNac, diaInicio, diaNac, edadPulseSV, escena, estaturaCm, imcProgressSV, mesInicio, mesNac, metricaPulseSV, objetivo, pesoInicialKg }) {
  // ==========================================================================
  // CÁLCULOS DERIVADOS EN TIEMPO REAL
  // ==========================================================================
  // Defensa 2: Día siempre acotado a los días reales del mes/año seleccionado
  const maxDiasMesActual = useMemo(
    () => obtenerMaxDiasMes(anioNac, mesNac),
    [anioNac, mesNac]
  );

  const diaSeguro = Math.min(diaNac, maxDiasMesActual);

  const fechaNacimientoYYYYMMDD = useMemo(() => {
    const y = String(anioNac).padStart(4, '0');
    const m = String(mesNac).padStart(2, '0');
    const d = String(diaSeguro).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, [anioNac, mesNac, diaSeguro]);

  const edadCalculada = useMemo(
    () => calcularEdadExacta(new Date(), fechaNacimientoYYYYMMDD)?.anios ?? null,
    [fechaNacimientoYYYYMMDD]
  );

  // Pulso en vivo cuando cambia la edad calculada
  useEffect(() => {
    if (escena !== 1) return;
    // eslint-disable-next-line react-hooks/immutability -- valor animado de Reanimated (se modifica por diseño)
    edadPulseSV.value = withSequence(
      withTiming(1.08, { duration: 110 }),
      withSpring(1, SPRING_SNAPPY)
    );
  }, [edadCalculada, escena, edadPulseSV]);

  // Cálculo de IMC de referencia y barra proporcional en Paso 2
  const imcCalculado = useMemo(() => {
    const alturaM = estaturaCm / 100;
    if (!alturaM || alturaM <= 0) return 22.0;
    return Number((pesoInicialKg / (alturaM * alturaM)).toFixed(1));
  }, [estaturaCm, pesoInicialKg]);

  const clasificacionImc = useMemo(() => {
    if (imcCalculado < 18.5) return 'DENSIDAD LIGERA · PRIORIZAR MASA';
    if (imcCalculado < 25) return 'RANGO ATLÉTICO BASE · ÓPTIMO';
    if (imcCalculado < 29) return 'ALTA MASA CORPORAL / POTENCIA';
    return 'PRIORIDAD RECOMPOSICIÓN METABÓLICA';
  }, [imcCalculado]);

  useEffect(() => {
    if (escena !== 2) return;
    // Normalizamos entre IMC 15 y 35 para la barra viva
    const norm = Math.max(0.06, Math.min(1, (imcCalculado - 15) / 20));
    // eslint-disable-next-line react-hooks/immutability -- valor animado de Reanimated (se modifica por diseño)
    imcProgressSV.value = withSpring(norm, SPRING_SNAPPY);
    // eslint-disable-next-line react-hooks/immutability -- valor animado de Reanimated (se modifica por diseño)
    metricaPulseSV.value = withSequence(
      withTiming(1.03, { duration: 90 }),
      withSpring(1, SPRING_SNAPPY)
    );
  }, [imcCalculado, estaturaCm, pesoInicialKg, escena, imcProgressSV, metricaPulseSV]);

  // Defensas A, B y C: Fecha exacta de inicio de entreno acotada contra fechas futuras
  const minAnioInicioPermitido = Math.max(1950, anioNac + 5, anioActual - 60);

  const maxAnioInicioPermitido = anioActual;

  const obtenerMaxMesInicio = useCallback((anioEval) => {
    const hoy = new Date();
    const anioHoy = hoy.getFullYear();
    const mesHoy = hoy.getMonth() + 1;
    return anioEval >= anioHoy ? mesHoy : 12;
  }, []);

  const obtenerMaxDiaInicio = useCallback((anioEval, mesEval) => {
    const hoy = new Date();
    const anioHoy = hoy.getFullYear();
    const mesHoy = hoy.getMonth() + 1;
    const diaHoy = hoy.getDate();
    const maxCalendario = obtenerMaxDiasMes(anioEval, mesEval);
    if (anioEval >= anioHoy && mesEval >= mesHoy) {
      return Math.min(diaHoy, maxCalendario);
    }
    return maxCalendario;
  }, []);

  const anioInicioSeguro = Math.max(
    minAnioInicioPermitido,
    Math.min(maxAnioInicioPermitido, anioInicio)
  );

  const maxMesInicioActual = obtenerMaxMesInicio(anioInicioSeguro);

  const mesInicioSeguro = Math.max(1, Math.min(maxMesInicioActual, mesInicio));

  const maxDiaInicioActual = obtenerMaxDiaInicio(anioInicioSeguro, mesInicioSeguro);

  const diaInicioSeguro = Math.max(1, Math.min(maxDiaInicioActual, diaInicio));

  const fechaInicioEntrenoEfectiva = useMemo(() => {
    const y = String(anioInicioSeguro).padStart(4, '0');
    const m = String(mesInicioSeguro).padStart(2, '0');
    const d = String(diaInicioSeguro).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, [anioInicioSeguro, mesInicioSeguro, diaInicioSeguro]);

  const esFechaInicioHoy = useMemo(() => {
    const hoy = new Date();
    return (
      anioInicioSeguro === hoy.getFullYear() &&
      mesInicioSeguro === hoy.getMonth() + 1 &&
      diaInicioSeguro === hoy.getDate()
    );
  }, [anioInicioSeguro, mesInicioSeguro, diaInicioSeguro]);

  const resumenTiempoEntreno = useMemo(
    () =>
      calcularTiempoEntrenando(new Date(), fechaInicioEntrenoEfectiva) || {
        anios: 0,
        meses: 0,
        dias: 0,
        mesesTotales: 0,
        texto: 'Recién iniciado',
      },
    [fechaInicioEntrenoEfectiva]
  );

  const nivelExperienciaIA = useMemo(() => {
    const mesesTotales = resumenTiempoEntreno.mesesTotales ?? 0;
    if (mesesTotales < 6) {
      return {
        nivel: 'PRINCIPIANTE · ADAPTACIÓN NEURAL',
        detalle:
          'Gemini IA priorizará técnica, progresión lineal segura y superávit/déficit conservador.',
      };
    }
    if (mesesTotales < 24) {
      return {
        nivel: 'INTERMEDIO · HIPERTROFIA ACTIVA',
        detalle:
          'Gemini IA ajustará el volumen efectivo semanal y mayor precisión de macronutrientes.',
      };
    }
    return {
      nivel: 'AVANZADO · OPTIMIZACIÓN FINA',
      detalle:
        'Gemini IA aplicará criterios estrictos de simetría, densidad muscular y periodización.',
    };
  }, [resumenTiempoEntreno.mesesTotales]);

  const datosObjetivoActivo = useMemo(
    () =>
      CATALOGO_OBJETIVOS.find((item) => item.id === objetivo) || CATALOGO_OBJETIVOS[3],
    [objetivo]
  );

  return { maxDiasMesActual, diaSeguro, fechaNacimientoYYYYMMDD, edadCalculada, imcCalculado, clasificacionImc, minAnioInicioPermitido, maxAnioInicioPermitido, obtenerMaxMesInicio, obtenerMaxDiaInicio, anioInicioSeguro, maxMesInicioActual, mesInicioSeguro, maxDiaInicioActual, diaInicioSeguro, fechaInicioEntrenoEfectiva, esFechaInicioHoy, resumenTiempoEntreno, nivelExperienciaIA, datosObjetivoActivo };
}
