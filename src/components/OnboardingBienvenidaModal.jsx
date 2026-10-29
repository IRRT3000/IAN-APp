import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, {
  Easing,
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import {
  OBJETIVOS_PERFIL_VALIDOS,
  PERFIL_USUARIO_BASE,
  SEXOS_PERFIL_VALIDOS,
  calcularEdadExacta,
  calcularFechaInicioDesdeAntiguedad,
  calcularTiempoEntrenando,
  guardarPerfilCompletoUsuario,
  parsearFechaLocalYYYYMMDD,
} from '../services/storage';
import {
  vibrarEjercicioCompletado,
  vibrarInicioPresionBorrado,
  vibrarSeleccionBascula,
  vibrarToqueComparacion,
} from '../services/haptics';
import { TOKENS } from '../theme/tokens';
import { useSafeInsets } from '../utils/useSafeInsets';

// ============================================================================
// CONSTANTES DE RESORTE Y TIMING (UI THREAD - REACT NATIVE REANIMATED)
// ============================================================================
export const SPRING_SCENE = { damping: 24, stiffness: 260, mass: 0.9 };
export const SPRING_SNAPPY = { damping: 18, stiffness: 320, mass: 0.7 };
export const SPRING_ELASTIC = { damping: 12, stiffness: 220, mass: 0.8 };
export const SPRING_PRESS = { damping: 16, stiffness: 380, mass: 0.6 };
export const EASE_OUT_STRONG = Easing.bezier(0.22, 1, 0.36, 1);

const MESES_CORTOS = [
  'ENE',
  'FEB',
  'MAR',
  'ABR',
  'MAY',
  'JUN',
  'JUL',
  'AGO',
  'SEP',
  'OCT',
  'NOV',
  'DIC',
];

const PILARES_HERO = [
  {
    id: 'fuerza',
    icono: 'activity',
    titulo: 'Entreno de Fuerza',
    subtitulo: 'Línea base antropométrica y antigüedad real para calibrar tu volumen y progresión.',
  },
  {
    id: 'nutricion',
    icono: 'zap',
    titulo: 'Nutrición IA',
    subtitulo: 'Ajuste metabólico por edad exacta, sexo biológico, peso base y objetivo activo.',
  },
  {
    id: 'analisis',
    icono: 'eye',
    titulo: 'Análisis Físico IA',
    subtitulo: 'Evaluación contextualizada según tu estatura, etapa física y tiempo entrenando.',
  },
];

const PRESETS_ANTIGUEDAD = [
  { id: 'recien', label: 'Recién empiezo', sub: '0 meses', anios: 0, meses: 0 },
  { id: '6m', label: '6 meses', sub: 'Base inicial', anios: 0, meses: 6 },
  { id: '1a', label: '1 año', sub: 'Intermedio', anios: 1, meses: 0 },
  { id: '2a', label: '2+ años', sub: 'Avanzado', anios: 2, meses: 0 },
];

const CATALOGO_OBJETIVOS = [
  {
    id: 'Volumen',
    icono: 'trending-up',
    tag: 'SUPERÁVIT CONTROLADO',
    subtitulo: 'Priorizar hipertrofia muscular y ganancia de fuerza con superávit calórico limpio.',
    calibracionIA:
      'Gemini IA priorizará densidad proteica, superávit energético sostenible y evaluación de masa magra y simetría muscular.',
  },
  {
    id: 'Definición',
    icono: 'zap',
    tag: 'DÉFICIT PRESERVANDO MASA',
    subtitulo: 'Reducir porcentaje graso manteniendo la masa muscular y el rendimiento en fuerza.',
    calibracionIA:
      'Gemini IA ajustará el análisis nutricional hacia saciedad, control calórico estricto, retención muscular y cortes de definición.',
  },
  {
    id: 'Mantenimiento',
    icono: 'shield',
    tag: 'EQUILIBRIO METABÓLICO',
    subtitulo: 'Sostener composición corporal óptima, energía estable y consolidación atlética.',
    calibracionIA:
      'Gemini IA calibrará un balance normocalórico de alto rendimiento y seguimiento de estabilidad antropométrica.',
  },
  {
    id: 'Recomposición',
    icono: 'sliders',
    tag: 'OPTIMIZACIÓN DUAL',
    subtitulo: 'Disminuir tejido adiposo mientras se construye tejido muscular de forma simultánea.',
    calibracionIA:
      'Gemini IA exigirá alta precisión proteica por kg corporal y evaluará la evolución simultánea de cintura, hombros y tono muscular.',
  },
];

/**
 * Calcula el número máximo de días de un mes específico (1-12),
 * contemplando años bisiestos (ej. febrero 2004, 2008, 2024).
 */
function obtenerMaxDiasMes(anio, mes1a12) {
  return new Date(anio, mes1a12, 0).getDate();
}

/**
 * Formatea una cadena YYYY-MM-DD a DD/MM/AAAA para lectura editorial.
 */
function formatearFechaLegible(fechaYYYYMMDD) {
  const f = parsearFechaLocalYYYYMMDD(fechaYYYYMMDD);
  return f?.legible || '--/--/----';
}

/**
 * Hook animado de entrada con fade + desplazamiento vertical en UI Thread.
 */
function useFadeSlideStyle(sv, distanciaY = 18) {
  return useAnimatedStyle(() => ({
    opacity: sv.value,
    transform: [{ translateY: interpolate(sv.value, [0, 1], [distanciaY, 0]) }],
  }));
}

/**
 * Hook animado para cada barra de progreso segmentada (Pasos 1 a 4).
 */
function useSegmentProgressStyle(sv) {
  return useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      sv.value,
      [0, 1],
      [TOKENS.colors.borderDefault, TOKENS.colors.accentWhite]
    ),
    transform: [{ scaleY: interpolate(sv.value, [0, 1], [1, 1.25]) }],
  }));
}

/**
 * Botón táctil con micro-interacción elástica en UI Thread.
 */
function BotonInteractivo({
  onPress,
  disabled = false,
  style,
  children,
  scaleDown = 0.97,
  accessibilityLabel,
}) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    if (disabled) return;
    scale.value = withSpring(scaleDown, SPRING_PRESS);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, SPRING_PRESS);
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      disabled={disabled}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={onPress}
    >
      <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>
    </Pressable>
  );
}

export default function OnboardingBienvenidaModal({
  visible = false,
  modoEdicion = false,
  perfilInicial = null,
  onPerfilActualizado,
  onCompletado,
  onCerrar,
}) {
  const insets = useSafeInsets();

  const anioActual = useMemo(() => new Date().getFullYear(), []);
  const minAnioPermitido = anioActual - 90;
  const maxAnioPermitido = anioActual - 10;

  // Escena actual:
  // 0 = Apertura Hero (solo si !modoEdicion)
  // 1 = Identidad y Biología
  // 2 = Antropometría Base
  // 3 = Tiempo Entrenando
  // 4 = Objetivo Físico
  // 5 = Celebración Pasaporte Biométrico
  const [escena, setEscena] = useState(modoEdicion ? 1 : 0);

  // Estados del formulario biométrico
  const [nombre, setNombre] = useState('');
  const [focoNombre, setFocoNombre] = useState(false);
  const [sexo, setSexo] = useState('Hombre');

  const [anioNac, setAnioNac] = useState(2000);
  const [mesNac, setMesNac] = useState(1);
  const [diaNac, setDiaNac] = useState(1);

  const [estaturaCm, setEstaturaCm] = useState(175);
  const [pesoInicialKg, setPesoInicialKg] = useState(75.0);

  const [aniosEntreno, setAniosEntreno] = useState(0);
  const [mesesEntreno, setMesesEntreno] = useState(6);
  const [antiguedadModificada, setAntiguedadModificada] = useState(false);

  const [objetivo, setObjetivo] = useState('Recomposición');

  const [errorValidacion, setErrorValidacion] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [perfilConsolidado, setPerfilConsolidado] = useState(null);

  // Defensa 8: candado síncrono contra doble toque al guardar
  const guardandoRef = useRef(false);

  // ==========================================================================
  // VALORES COMPARTIDOS REANIMATED (UI THREAD)
  // ==========================================================================
  // Escena 0: Emblema con pulso continuo y cascada de entrada
  const heroRingPulse = useSharedValue(1);
  const heroBadgeSV = useSharedValue(0);
  const heroTitleSV = useSharedValue(0);
  const heroPilar1SV = useSharedValue(0);
  const heroPilar2SV = useSharedValue(0);
  const heroPilar3SV = useSharedValue(0);
  const heroCtaSV = useSharedValue(0);

  // Transición de escena completa y cascada de 3 bloques internos (Pasos 1-4)
  const sceneTranslateX = useSharedValue(0);
  const sceneScale = useSharedValue(1);
  const sceneOpacity = useSharedValue(1);

  const bloque1SV = useSharedValue(1);
  const bloque2SV = useSharedValue(1);
  const bloque3SV = useSharedValue(1);

  // Barras de progreso segmentadas (Pasos 1 a 4)
  const prog1SV = useSharedValue(1);
  const prog2SV = useSharedValue(0);
  const prog3SV = useSharedValue(0);
  const prog4SV = useSharedValue(0);

  // Paso 1: Pulso reactivo de Edad Viva y despliegue de tarjeta biológica
  const edadPulseSV = useSharedValue(1);
  const bioBannerSV = useSharedValue(1);

  // Paso 2: Barra viva de proporción IMC y pulso de métricas
  const imcProgressSV = useSharedValue(0.45);
  const metricaPulseSV = useSharedValue(1);

  // Paso 3: Pulso de línea de tiempo viva
  const timelinePulseSV = useSharedValue(1);

  // Paso 4: Confirmación de calibración Gemini IA
  const objetivoBannerSV = useSharedValue(1);

  // Escena 5: Celebración Pasaporte Biométrico
  const celebCheckScale = useSharedValue(0);
  const celebRingScale = useSharedValue(0.6);
  const celebHeaderSV = useSharedValue(0);
  const celebFlashBorder = useSharedValue(0);
  const pasaporteItem1 = useSharedValue(0);
  const pasaporteItem2 = useSharedValue(0);
  const pasaporteItem3 = useSharedValue(0);
  const pasaporteItem4 = useSharedValue(0);
  const pasaporteItem5 = useSharedValue(0);
  const pasaporteItem6 = useSharedValue(0);
  const celebCtaSV = useSharedValue(0);

  // ==========================================================================
  // INICIALIZACIÓN DEL ESTADO AL ABRIR EL MODAL
  // ==========================================================================
  useEffect(() => {
    if (!visible) return;

    guardandoRef.current = false;
    setGuardando(false);
    setErrorValidacion('');
    setPerfilConsolidado(null);

    const base = perfilInicial || PERFIL_USUARIO_BASE;

    setNombre(typeof base.nombre === 'string' ? base.nombre : '');
    setSexo(SEXOS_PERFIL_VALIDOS.includes(base.sexo) ? base.sexo : 'Hombre');

    const fechaNacParsed = parsearFechaLocalYYYYMMDD(base.fechaNacimiento);
    if (fechaNacParsed) {
      const y = Math.max(
        minAnioPermitido,
        Math.min(maxAnioPermitido, fechaNacParsed.anio)
      );
      const m = fechaNacParsed.mes;
      const maxD = obtenerMaxDiasMes(y, m);
      const d = Math.min(fechaNacParsed.dia, maxD);
      setAnioNac(y);
      setMesNac(m);
      setDiaNac(d);
    } else {
      const defaultY = Math.max(minAnioPermitido, Math.min(maxAnioPermitido, 2000));
      setAnioNac(defaultY);
      setMesNac(1);
      setDiaNac(1);
    }

    const est = Number(base.alturaCm ?? base.estaturaCm);
    setEstaturaCm(Number.isFinite(est) && est >= 120 && est <= 230 ? Math.round(est) : 175);

    const peso = Number(base.pesoKgBase ?? base.pesoKgActual ?? base.pesoInicialKg);
    setPesoInicialKg(
      Number.isFinite(peso) && peso >= 30 && peso <= 250 ? Number(peso.toFixed(1)) : 75.0
    );

    const tiempo = calcularTiempoEntrenando(new Date(), base.fechaInicioEntreno);
    if (tiempo) {
      setAniosEntreno(Math.max(0, Math.min(30, tiempo.anios)));
      setMesesEntreno(Math.max(0, Math.min(11, tiempo.meses)));
    } else {
      setAniosEntreno(0);
      setMesesEntreno(6);
    }
    setAntiguedadModificada(false);

    setObjetivo(
      OBJETIVOS_PERFIL_VALIDOS.includes(base.objetivo) ? base.objetivo : 'Recomposición'
    );

    const escenaInicial = modoEdicion ? 1 : 0;
    setEscena(escenaInicial);
  }, [visible, modoEdicion, perfilInicial, minAnioPermitido, maxAnioPermitido]);

  // ==========================================================================
  // COREOGRAFÍA DE ANIMACIONES POR ESCENA
  // ==========================================================================
  const dispararCascadaBloques = useCallback(() => {
    bloque1SV.value = 0;
    bloque2SV.value = 0;
    bloque3SV.value = 0;

    bloque1SV.value = withDelay(40, withSpring(1, SPRING_SCENE));
    bloque2SV.value = withDelay(110, withSpring(1, SPRING_SCENE));
    bloque3SV.value = withDelay(180, withSpring(1, SPRING_SCENE));
  }, [bloque1SV, bloque2SV, bloque3SV]);

  useEffect(() => {
    if (!visible) return;

    if (escena === 0) {
      heroRingPulse.value = 1;
      heroRingPulse.value = withRepeat(
        withSequence(
          withTiming(1.06, { duration: 1600, easing: EASE_OUT_STRONG }),
          withTiming(1, { duration: 1600, easing: EASE_OUT_STRONG })
        ),
        -1,
        true
      );

      heroBadgeSV.value = 0;
      heroTitleSV.value = 0;
      heroPilar1SV.value = 0;
      heroPilar2SV.value = 0;
      heroPilar3SV.value = 0;
      heroCtaSV.value = 0;

      heroBadgeSV.value = withDelay(60, withSpring(1, SPRING_SCENE));
      heroTitleSV.value = withDelay(130, withSpring(1, SPRING_SCENE));
      heroPilar1SV.value = withDelay(210, withSpring(1, SPRING_SCENE));
      heroPilar2SV.value = withDelay(280, withSpring(1, SPRING_SCENE));
      heroPilar3SV.value = withDelay(350, withSpring(1, SPRING_SCENE));
      heroCtaSV.value = withDelay(420, withSpring(1, SPRING_SCENE));
    }

    if (escena >= 1 && escena <= 4) {
      prog1SV.value = withSpring(escena >= 1 ? 1 : 0, SPRING_SNAPPY);
      prog2SV.value = withSpring(escena >= 2 ? 1 : 0, SPRING_SNAPPY);
      prog3SV.value = withSpring(escena >= 3 ? 1 : 0, SPRING_SNAPPY);
      prog4SV.value = withSpring(escena >= 4 ? 1 : 0, SPRING_SNAPPY);
      dispararCascadaBloques();
    }

    if (escena === 5) {
      celebCheckScale.value = 0;
      celebRingScale.value = 0.6;
      celebHeaderSV.value = 0;
      celebFlashBorder.value = 1;
      pasaporteItem1.value = 0;
      pasaporteItem2.value = 0;
      pasaporteItem3.value = 0;
      pasaporteItem4.value = 0;
      pasaporteItem5.value = 0;
      pasaporteItem6.value = 0;
      celebCtaSV.value = 0;

      celebRingScale.value = withSpring(1, SPRING_ELASTIC);
      celebCheckScale.value = withDelay(90, withSpring(1, SPRING_ELASTIC));
      celebHeaderSV.value = withDelay(150, withSpring(1, SPRING_SCENE));
      celebFlashBorder.value = withDelay(
        220,
        withSequence(
          withTiming(1, { duration: 180 }),
          withTiming(0.22, { duration: 750, easing: EASE_OUT_STRONG })
        )
      );

      pasaporteItem1.value = withDelay(220, withSpring(1, SPRING_SNAPPY));
      pasaporteItem2.value = withDelay(280, withSpring(1, SPRING_SNAPPY));
      pasaporteItem3.value = withDelay(340, withSpring(1, SPRING_SNAPPY));
      pasaporteItem4.value = withDelay(400, withSpring(1, SPRING_SNAPPY));
      pasaporteItem5.value = withDelay(460, withSpring(1, SPRING_SNAPPY));
      pasaporteItem6.value = withDelay(520, withSpring(1, SPRING_SNAPPY));
      celebCtaSV.value = withDelay(590, withSpring(1, SPRING_SCENE));
    }
  }, [
    visible,
    escena,
    heroRingPulse,
    heroBadgeSV,
    heroTitleSV,
    heroPilar1SV,
    heroPilar2SV,
    heroPilar3SV,
    heroCtaSV,
    prog1SV,
    prog2SV,
    prog3SV,
    prog4SV,
    dispararCascadaBloques,
    celebCheckScale,
    celebRingScale,
    celebHeaderSV,
    celebFlashBorder,
    pasaporteItem1,
    pasaporteItem2,
    pasaporteItem3,
    pasaporteItem4,
    pasaporteItem5,
    pasaporteItem6,
    celebCtaSV,
  ]);

  const transicionarAEscena = useCallback(
    (nuevaEscena, direccion = 1) => {
      // Defensa 10: Ocultar teclado inmediatamente al cambiar de paso
      Keyboard.dismiss();
      setErrorValidacion('');

      sceneTranslateX.value = direccion * 28;
      sceneScale.value = 0.985;
      sceneOpacity.value = 0.15;

      setEscena(nuevaEscena);

      sceneTranslateX.value = withSpring(0, SPRING_SCENE);
      sceneScale.value = withSpring(1, SPRING_SCENE);
      sceneOpacity.value = withTiming(1, { duration: 220, easing: EASE_OUT_STRONG });
    },
    [sceneTranslateX, sceneScale, sceneOpacity]
  );

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
    imcProgressSV.value = withSpring(norm, SPRING_SNAPPY);
    metricaPulseSV.value = withSequence(
      withTiming(1.03, { duration: 90 }),
      withSpring(1, SPRING_SNAPPY)
    );
  }, [imcCalculado, estaturaCm, pesoInicialKg, escena, imcProgressSV, metricaPulseSV]);

  // Defensa 3: Fecha de inicio de entreno respetando modoEdicion si no se tocó la antigüedad
  const fechaInicioEntrenoEfectiva = useMemo(() => {
    if (
      modoEdicion &&
      !antiguedadModificada &&
      perfilInicial?.fechaInicioEntreno &&
      parsearFechaLocalYYYYMMDD(perfilInicial.fechaInicioEntreno)
    ) {
      return perfilInicial.fechaInicioEntreno;
    }
    return calcularFechaInicioDesdeAntiguedad({
      anios: aniosEntreno,
      meses: mesesEntreno,
    });
  }, [modoEdicion, antiguedadModificada, perfilInicial, aniosEntreno, mesesEntreno]);

  const resumenTiempoEntreno = useMemo(
    () =>
      calcularTiempoEntrenando(new Date(), fechaInicioEntrenoEfectiva) || {
        anios: aniosEntreno,
        meses: mesesEntreno,
        dias: 0,
        mesesTotales: aniosEntreno * 12 + mesesEntreno,
        texto: 'Recién iniciado',
      },
    [fechaInicioEntrenoEfectiva, aniosEntreno, mesesEntreno]
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

  const aplicarPresetAntiguedad = (preset) => {
    vibrarToqueComparacion();
    setAntiguedadModificada(true);
    setAniosEntreno(preset.anios);
    setMesesEntreno(preset.meses);
    timelinePulseSV.value = withSequence(
      withTiming(1.03, { duration: 100 }),
      withSpring(1, SPRING_SNAPPY)
    );
  };

  const ajustarAniosEntreno = (delta) => {
    vibrarSeleccionBascula();
    setAntiguedadModificada(true);
    setAniosEntreno((prev) => Math.max(0, Math.min(30, prev + delta)));
    timelinePulseSV.value = withSequence(
      withTiming(1.03, { duration: 90 }),
      withSpring(1, SPRING_SNAPPY)
    );
  };

  const ajustarMesesEntreno = (delta) => {
    vibrarSeleccionBascula();
    setAntiguedadModificada(true);
    setMesesEntreno((prev) => {
      let sig = prev + delta;
      if (sig > 11) sig = 0;
      if (sig < 0) sig = 11;
      return sig;
    });
    timelinePulseSV.value = withSequence(
      withTiming(1.03, { duration: 90 }),
      withSpring(1, SPRING_SNAPPY)
    );
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

  // ==========================================================================
  // ESTILOS ANIMADOS (UI THREAD)
  // ==========================================================================
  const heroRingOuterStyle = useAnimatedStyle(() => ({
    transform: [{ scale: heroRingPulse.value }],
    opacity: interpolate(heroRingPulse.value, [1, 1.06], [0.55, 1]),
  }));

  const heroRingMidStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(heroRingPulse.value, [1, 1.06], [1, 1.03]) }],
  }));

  const heroBadgeAnimStyle = useFadeSlideStyle(heroBadgeSV, 14);
  const heroTitleAnimStyle = useFadeSlideStyle(heroTitleSV, 18);
  const heroPilar1AnimStyle = useFadeSlideStyle(heroPilar1SV, 20);
  const heroPilar2AnimStyle = useFadeSlideStyle(heroPilar2SV, 20);
  const heroPilar3AnimStyle = useFadeSlideStyle(heroPilar3SV, 20);
  const heroCtaAnimStyle = useFadeSlideStyle(heroCtaSV, 22);

  const sceneContainerAnimStyle = useAnimatedStyle(() => ({
    opacity: sceneOpacity.value,
    transform: [
      { translateX: sceneTranslateX.value },
      { scale: sceneScale.value },
    ],
  }));

  const bloque1AnimStyle = useFadeSlideStyle(bloque1SV, 16);
  const bloque2AnimStyle = useFadeSlideStyle(bloque2SV, 18);
  const bloque3AnimStyle = useFadeSlideStyle(bloque3SV, 20);

  const seg1Style = useSegmentProgressStyle(prog1SV);
  const seg2Style = useSegmentProgressStyle(prog2SV);
  const seg3Style = useSegmentProgressStyle(prog3SV);
  const seg4Style = useSegmentProgressStyle(prog4SV);

  const edadBadgeAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: edadPulseSV.value }],
  }));

  const bioBannerAnimStyle = useAnimatedStyle(() => ({
    opacity: bioBannerSV.value,
    transform: [{ scale: interpolate(bioBannerSV.value, [0.88, 1], [0.97, 1]) }],
  }));

  const imcFillAnimStyle = useAnimatedStyle(() => ({
    width: `${Math.round(imcProgressSV.value * 100)}%`,
  }));

  const metricaCardAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: metricaPulseSV.value }],
  }));

  const timelineAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: timelinePulseSV.value }],
  }));

  const objetivoBannerAnimStyle = useAnimatedStyle(() => ({
    opacity: objetivoBannerSV.value,
    transform: [{ scale: interpolate(objetivoBannerSV.value, [0.9, 1], [0.97, 1]) }],
  }));

  // Estilos animados de la Escena 5 (Pasaporte Biométrico)
  const celebRingAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: celebRingScale.value }],
    opacity: interpolate(celebRingScale.value, [0.6, 1], [0, 1]),
  }));

  const celebCheckAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: celebCheckScale.value }],
  }));

  const celebHeaderAnimStyle = useFadeSlideStyle(celebHeaderSV, 16);

  const pasaporteCardBorderStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(
      celebFlashBorder.value,
      [0.22, 1],
      [TOKENS.colors.borderStrong, TOKENS.colors.accentWhite]
    ),
  }));

  const pItem1Style = useFadeSlideStyle(pasaporteItem1, 14);
  const pItem2Style = useFadeSlideStyle(pasaporteItem2, 14);
  const pItem3Style = useFadeSlideStyle(pasaporteItem3, 14);
  const pItem4Style = useFadeSlideStyle(pasaporteItem4, 14);
  const pItem5Style = useFadeSlideStyle(pasaporteItem5, 14);
  const pItem6Style = useFadeSlideStyle(pasaporteItem6, 14);
  const celebCtaAnimStyle = useFadeSlideStyle(celebCtaSV, 20);

  // ==========================================================================
  // RENDERIZADO DE ESCENAS
  // ==========================================================================
  const renderEscenaHero = () => (
    <View style={styles.fullSceneContainer}>
      <ScrollView
        contentContainerStyle={[
          styles.heroScrollContent,
          { paddingTop: insets.headerPaddingTop + 12, paddingBottom: 24 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Emblema Geométrico Concéntrico de 3 Anillos */}
        <View style={styles.heroEmblemWrapper}>
          <Animated.View style={[styles.heroRingOuter, heroRingOuterStyle]} />
          <Animated.View style={[styles.heroRingMiddle, heroRingMidStyle]} />
          <View style={styles.heroRingInner}>
            <Feather name="cpu" size={24} color={TOKENS.colors.textPrimary} />
          </View>
        </View>

        <Animated.View style={[styles.badgeWrapCenter, heroBadgeAnimStyle]}>
          <View style={styles.whitePillBadge}>
            <Text style={styles.whitePillBadgeText}>CALIBRACIÓN BIOMÉTRICA IA</Text>
          </View>
        </Animated.View>

        <Animated.View style={[styles.heroTitleBlock, heroTitleAnimStyle]}>
          <Text style={styles.heroMainTitle}>Precisión Biométrica Personalizada</Text>
          <Text style={styles.heroMainSubtitle}>
            Configura tu arquitectura física base en 4 pasos. Estos parámetros alimentan
            en tiempo real tus entrenamientos, cálculos metabólicos y los modelos de
            Gemini IA.
          </Text>
        </Animated.View>

        <View style={styles.heroPilaresList}>
          {[heroPilar1AnimStyle, heroPilar2AnimStyle, heroPilar3AnimStyle].map(
            (animStyle, idx) => {
              const pilar = PILARES_HERO[idx];
              return (
                <Animated.View key={pilar.id} style={[styles.heroPilarCard, animStyle]}>
                  <View style={styles.heroPilarIconBox}>
                    <Feather
                      name={pilar.icono}
                      size={18}
                      color={TOKENS.colors.textPrimary}
                    />
                  </View>
                  <View style={styles.heroPilarTextCol}>
                    <Text style={styles.heroPilarTitle}>{pilar.titulo}</Text>
                    <Text style={styles.heroPilarSub}>{pilar.subtitulo}</Text>
                  </View>
                </Animated.View>
              );
            }
          )}
        </View>
      </ScrollView>

      {/* Barra Inferior Thumb-Zone */}
      <Animated.View
        style={[
          styles.bottomCtaBar,
          { paddingBottom: Math.max(insets.bottom, 16) },
          heroCtaAnimStyle,
        ]}
      >
        <BotonInteractivo
          accessibilityLabel="Configurar mi Perfil"
          onPress={handleAvanzarPaso}
          style={styles.primaryCtaButton}
        >
          <Text style={styles.primaryCtaText}>Configurar mi Perfil</Text>
          <Feather name="arrow-right" size={18} color={TOKENS.colors.textInverse} />
        </BotonInteractivo>
      </Animated.View>
    </View>
  );

  const renderCabeceraWizard = () => {
    const mostrarBotonAtras = !modoEdicion || escena > 1;
    return (
      <View style={[styles.wizardHeader, { paddingTop: insets.headerPaddingTop }]}>
        <View style={styles.wizardTopRow}>
          {mostrarBotonAtras ? (
            <BotonInteractivo
              accessibilityLabel="Atrás"
              onPress={handleRetrocederPaso}
              scaleDown={0.92}
              style={styles.headerIconBtn}
            >
              <Feather name="chevron-left" size={20} color={TOKENS.colors.textPrimary} />
            </BotonInteractivo>
          ) : (
            <View style={styles.headerIconSpacer} />
          )}

          <View style={styles.wizardStepCounterBox}>
            <Text style={styles.wizardStepCategory}>
              {modoEdicion ? 'EDICIÓN BIOMÉTRICA' : 'CALIBRACIÓN INICIAL'}
            </Text>
            <Text style={styles.wizardStepCounterText}>
              {`PASO 0${escena} / 04`}
            </Text>
          </View>

          {modoEdicion && onCerrar ? (
            <BotonInteractivo
              accessibilityLabel="Cerrar"
              onPress={() => {
                vibrarInicioPresionBorrado();
                Keyboard.dismiss();
                onCerrar();
              }}
              scaleDown={0.92}
              style={styles.headerIconBtn}
            >
              <Feather name="x" size={18} color={TOKENS.colors.textPrimary} />
            </BotonInteractivo>
          ) : (
            <View style={styles.headerIconSpacer} />
          )}
        </View>

        {/* 4 Segmentos de Progreso Animados */}
        <View style={styles.progressSegmentsRow}>
          <Animated.View style={[styles.progressSegment, seg1Style]} />
          <Animated.View style={[styles.progressSegment, seg2Style]} />
          <Animated.View style={[styles.progressSegment, seg3Style]} />
          <Animated.View style={[styles.progressSegment, seg4Style]} />
        </View>
      </View>
    );
  };

  const renderPaso1Identidad = () => (
    <View style={styles.stepBlocksContainer}>
      {/* Bloque 1: Encabezado + Nombre */}
      <Animated.View style={[styles.stepBlock, bloque1AnimStyle]}>
        <Text style={styles.stepKicker}>PASO 01 · IDENTIDAD Y BIOLOGÍA</Text>
        <Text style={styles.stepTitle}>¿Quién entrena hoy?</Text>
        <Text style={styles.stepSubtitle}>
          Tu identidad, sexo biológico y edad exacta determinan tu tasa metabólica basal.
        </Text>

        <View style={styles.inputSectionCard}>
          <View style={styles.inputHeaderRow}>
            <Text style={styles.fieldLabel}>NOMBRE O ALIAS (OPCIONAL)</Text>
            <Text style={styles.charCountText}>
              {`${String(nombre || '').replace(/[\r\n]+/g, ' ').trim().length}/40`}
            </Text>
          </View>

          <View
            style={[
              styles.textInputWrapper,
              focoNombre && styles.textInputWrapperFocused,
            ]}
          >
            <Feather
              name="user"
              size={16}
              color={
                focoNombre ? TOKENS.colors.textPrimary : TOKENS.colors.textSecondary
              }
            />
            <TextInput
              value={nombre}
              onChangeText={(txt) => {
                setNombre(String(txt || '').replace(/[\r\n]+/g, ' ').slice(0, 40));
                if (errorValidacion) setErrorValidacion('');
              }}
              onFocus={() => setFocoNombre(true)}
              onBlur={() => setFocoNombre(false)}
              placeholder="Ej. Alex, Ian, Atleta..."
              placeholderTextColor={TOKENS.colors.textMuted}
              maxLength={40}
              returnKeyType="done"
              onSubmitEditing={() => Keyboard.dismiss()}
              style={styles.textInputField}
            />
            {nombre.length > 0 && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Limpiar nombre"
                onPress={() => {
                  vibrarSeleccionBascula();
                  setNombre('');
                }}
                hitSlop={10}
                style={styles.clearInputBtn}
              >
                <Feather name="x-circle" size={16} color={TOKENS.colors.textSecondary} />
              </Pressable>
            )}
          </View>
        </View>
      </Animated.View>

      {/* Bloque 2: Selector de Sexo Biológico */}
      <Animated.View style={[styles.stepBlock, bloque2AnimStyle]}>
        <Text style={styles.fieldLabel}>SEXO BIOLÓGICO</Text>
        <View style={styles.sexCardsRow}>
          {SEXOS_PERFIL_VALIDOS.map((opcionSexo) => {
            const activo = sexo === opcionSexo;
            return (
              <View key={opcionSexo} style={styles.sexCardFlex}>
                <BotonInteractivo
                  accessibilityLabel={`Seleccionar ${opcionSexo}`}
                  onPress={() => seleccionarSexo(opcionSexo)}
                  style={[styles.sexCard, activo && styles.sexCardActive]}
                >
                  <View style={styles.sexCardTopRow}>
                    <View
                      style={[
                        styles.sexCardIconCircle,
                        activo && styles.sexCardIconCircleActive,
                      ]}
                    >
                      <Feather
                        name={opcionSexo === 'Hombre' ? 'shield' : 'award'}
                        size={16}
                        color={
                          activo
                            ? TOKENS.colors.textPrimary
                            : TOKENS.colors.textSecondary
                        }
                      />
                    </View>
                    {activo && (
                      <Feather
                        name="check-circle"
                        size={16}
                        color={TOKENS.colors.textInverse}
                      />
                    )}
                  </View>
                  <Text style={[styles.sexCardTitle, activo && styles.sexCardTitleActive]}>
                    {opcionSexo}
                  </Text>
                  <Text style={[styles.sexCardMeta, activo && styles.sexCardMetaActive]}>
                    {opcionSexo === 'Hombre'
                      ? 'Coeficiente basal masculino'
                      : 'Coeficiente basal femenino'}
                  </Text>
                </BotonInteractivo>
              </View>
            );
          })}
        </View>

        <Animated.View style={[styles.bioCalibrationBanner, bioBannerAnimStyle]}>
          <Feather name="sliders" size={14} color={TOKENS.colors.textPrimary} />
          <View style={styles.bioCalibrationTextCol}>
            <Text style={styles.bioCalibrationTag}>
              BIOLOGÍA CALIBRADA · PARÁMETROS METABÓLICOS ACTIVOS
            </Text>
            <Text style={styles.bioCalibrationDesc}>
              {sexo === 'Hombre'
                ? 'Ajuste hormonal y de masa magra de referencia para estimación calórica masculina.'
                : 'Ajuste metabólico y de distribución corporal de referencia para estimación femenina.'}
            </Text>
          </View>
        </Animated.View>
      </Animated.View>

      {/* Bloque 3: Fecha de Nacimiento y Panel de Edad Viva */}
      <Animated.View style={[styles.stepBlock, bloque3AnimStyle]}>
        <View style={styles.sectionHeaderSpread}>
          <Text style={styles.fieldLabel}>FECHA DE NACIMIENTO</Text>
          <Text style={styles.fieldSubtleHint}>
            {formatearFechaLegible(fechaNacimientoYYYYMMDD)}
          </Text>
        </View>

        <View style={styles.dateSpinnersGrid}>
          {/* Columna Día */}
          <View style={styles.dateSpinnerColumn}>
            <Text style={styles.spinnerColLabel}>DÍA</Text>
            <BotonInteractivo
              accessibilityLabel="Aumentar día"
              onPress={() => ajustarDiaNacimiento(1)}
              scaleDown={0.93}
              style={styles.spinnerTouchBtn}
            >
              <Feather name="plus" size={18} color={TOKENS.colors.textPrimary} />
            </BotonInteractivo>
            <View style={styles.spinnerValueBox}>
              <Text style={styles.spinnerValueText}>
                {String(diaSeguro).padStart(2, '0')}
              </Text>
            </View>
            <BotonInteractivo
              accessibilityLabel="Disminuir día"
              onPress={() => ajustarDiaNacimiento(-1)}
              scaleDown={0.93}
              style={styles.spinnerTouchBtn}
            >
              <Feather name="minus" size={18} color={TOKENS.colors.textPrimary} />
            </BotonInteractivo>
          </View>

          {/* Columna Mes */}
          <View style={styles.dateSpinnerColumn}>
            <Text style={styles.spinnerColLabel}>MES</Text>
            <BotonInteractivo
              accessibilityLabel="Aumentar mes"
              onPress={() => ajustarMesNacimiento(1)}
              scaleDown={0.93}
              style={styles.spinnerTouchBtn}
            >
              <Feather name="plus" size={18} color={TOKENS.colors.textPrimary} />
            </BotonInteractivo>
            <View style={styles.spinnerValueBox}>
              <Text style={styles.spinnerValueText}>
                {MESES_CORTOS[mesNac - 1] || 'ENE'}
              </Text>
              <Text style={styles.spinnerSubNumber}>
                {String(mesNac).padStart(2, '0')}
              </Text>
            </View>
            <BotonInteractivo
              accessibilityLabel="Disminuir mes"
              onPress={() => ajustarMesNacimiento(-1)}
              scaleDown={0.93}
              style={styles.spinnerTouchBtn}
            >
              <Feather name="minus" size={18} color={TOKENS.colors.textPrimary} />
            </BotonInteractivo>
          </View>

          {/* Columna Año */}
          <View style={styles.dateSpinnerColumn}>
            <Text style={styles.spinnerColLabel}>AÑO</Text>
            <BotonInteractivo
              accessibilityLabel="Aumentar año"
              onPress={() => ajustarAnioNacimiento(1)}
              scaleDown={0.93}
              style={styles.spinnerTouchBtn}
            >
              <Feather name="plus" size={18} color={TOKENS.colors.textPrimary} />
            </BotonInteractivo>
            <View style={styles.spinnerValueBox}>
              <Text style={styles.spinnerValueText}>{String(anioNac)}</Text>
            </View>
            <BotonInteractivo
              accessibilityLabel="Disminuir año"
              onPress={() => ajustarAnioNacimiento(-1)}
              scaleDown={0.93}
              style={styles.spinnerTouchBtn}
            >
              <Feather name="minus" size={18} color={TOKENS.colors.textPrimary} />
            </BotonInteractivo>
          </View>
        </View>

        {/* Panel de Edad en Vivo */}
        <Animated.View style={[styles.liveAgePanel, edadBadgeAnimStyle]}>
          <View style={styles.liveAgeLeft}>
            <Text style={styles.liveAgeLabel}>EDAD BIOLÓGICA EN VIVO</Text>
            <Text style={styles.liveAgeSub}>
              Se actualiza automáticamente cada cumpleaños
            </Text>
          </View>
          <View style={styles.liveAgeBadge}>
            <Text style={styles.liveAgeValueText}>
              {`${edadCalculada !== null ? edadCalculada : '--'} AÑOS`}
            </Text>
          </View>
        </Animated.View>
      </Animated.View>
    </View>
  );

  const renderPaso2Antropometria = () => (
    <View style={styles.stepBlocksContainer}>
      {/* Bloque 1: Estatura */}
      <Animated.View style={[styles.stepBlock, bloque1AnimStyle]}>
        <Text style={styles.stepKicker}>PASO 02 · ANTROPOMETRÍA BASE</Text>
        <Text style={styles.stepTitle}>Estatura y Peso de Partida</Text>
        <Text style={styles.stepSubtitle}>
          Establece el punto cero de tu historial corporal para medir tu progreso real.
        </Text>

        <View style={styles.instrumentCard}>
          <View style={styles.instrumentTopRow}>
            <View>
              <Text style={styles.fieldLabel}>ESTATURA TOTAL</Text>
              <Text style={styles.instrumentRangeHint}>Rango: 120 – 230 cm</Text>
            </View>
            <View style={styles.instrumentReadoutRow}>
              <Text style={styles.instrumentBigValue}>{estaturaCm}</Text>
              <Text style={styles.instrumentUnitText}>CM</Text>
            </View>
          </View>

          <View style={styles.steppersRow}>
            {[
              { label: '-5', delta: -5 },
              { label: '-1', delta: -1 },
              { label: '+1', delta: 1 },
              { label: '+5', delta: 5 },
            ].map((btn) => (
              <View key={btn.label} style={styles.stepperBtnFlex}>
                <BotonInteractivo
                  accessibilityLabel={`Ajustar estatura ${btn.label} cm`}
                  onPress={() => ajustarEstatura(btn.delta)}
                  scaleDown={0.94}
                  style={styles.stepperPillBtn}
                >
                  <Text style={styles.stepperPillBtnText}>{btn.label}</Text>
                </BotonInteractivo>
              </View>
            ))}
          </View>
        </View>
      </Animated.View>

      {/* Bloque 2: Peso Inicial */}
      <Animated.View style={[styles.stepBlock, bloque2AnimStyle]}>
        <View style={styles.instrumentCard}>
          <View style={styles.instrumentTopRow}>
            <View>
              <Text style={styles.fieldLabel}>PESO INICIAL BASE</Text>
              <Text style={styles.instrumentRangeHint}>Rango: 30.0 – 250.0 kg</Text>
            </View>
            <View style={styles.instrumentReadoutRow}>
              <Text style={styles.instrumentBigValue}>
                {pesoInicialKg.toFixed(1)}
              </Text>
              <Text style={styles.instrumentUnitText}>KG</Text>
            </View>
          </View>

          <View style={styles.steppersRow}>
            {[
              { label: '-1.0', delta: -1.0 },
              { label: '-0.5', delta: -0.5 },
              { label: '-0.1', delta: -0.1 },
              { label: '+0.1', delta: 0.1 },
              { label: '+0.5', delta: 0.5 },
              { label: '+1.0', delta: 1.0 },
            ].map((btn) => (
              <View key={btn.label} style={styles.stepperBtnFlex}>
                <BotonInteractivo
                  accessibilityLabel={`Ajustar peso ${btn.label} kg`}
                  onPress={() => ajustarPesoInicial(btn.delta)}
                  scaleDown={0.94}
                  style={styles.stepperPillBtnCompact}
                >
                  <Text style={styles.stepperPillBtnTextCompact}>{btn.label}</Text>
                </BotonInteractivo>
              </View>
            ))}
          </View>
        </View>
      </Animated.View>

      {/* Bloque 3: Panel Antropométrico Vivo */}
      <Animated.View
        style={[styles.stepBlock, bloque3AnimStyle, metricaCardAnimStyle]}
      >
        <View style={styles.anthropometryLiveCard}>
          <View style={styles.anthroMetricsRow}>
            <View style={styles.anthroMetricCol}>
              <Text style={styles.anthroMetricLabel}>ESTATURA</Text>
              <Text style={styles.anthroMetricVal}>{`${estaturaCm} cm`}</Text>
            </View>
            <View style={styles.anthroDivider} />
            <View style={styles.anthroMetricCol}>
              <Text style={styles.anthroMetricLabel}>PESO BASE</Text>
              <Text style={styles.anthroMetricVal}>
                {`${pesoInicialKg.toFixed(1)} kg`}
              </Text>
            </View>
            <View style={styles.anthroDivider} />
            <View style={styles.anthroMetricCol}>
              <Text style={styles.anthroMetricLabel}>IMC REF.</Text>
              <Text style={styles.anthroMetricVal}>{imcCalculado.toFixed(1)}</Text>
            </View>
          </View>

          <View style={styles.imcBarTrack}>
            <Animated.View style={[styles.imcBarFill, imcFillAnimStyle]} />
          </View>

          <View style={styles.imcFooterRow}>
            <Text style={styles.imcClassificationText}>{clasificacionImc}</Text>
            <Text style={styles.imcNoteText}>CALIBRACIÓN IA</Text>
          </View>
        </View>
      </Animated.View>
    </View>
  );

  const renderPaso3Antiguedad = () => (
    <View style={styles.stepBlocksContainer}>
      {/* Bloque 1: Presets rápidos */}
      <Animated.View style={[styles.stepBlock, bloque1AnimStyle]}>
        <Text style={styles.stepKicker}>PASO 03 · TIEMPO ENTRENANDO</Text>
        <Text style={styles.stepTitle}>Experiencia bajo la barra</Text>
        <Text style={styles.stepSubtitle}>
          Tu antigüedad se guarda como fecha de inicio para que tu experiencia crezca mes
          a mes sin quedar congelada.
        </Text>

        <Text style={styles.fieldLabel}>SELECCIÓN RÁPIDA</Text>
        <View style={styles.presetsGrid}>
          {PRESETS_ANTIGUEDAD.map((preset) => {
            const activo =
              aniosEntreno === preset.anios && mesesEntreno === preset.meses;
            return (
              <View key={preset.id} style={styles.presetCell}>
                <BotonInteractivo
                  accessibilityLabel={preset.label}
                  onPress={() => aplicarPresetAntiguedad(preset)}
                  style={[styles.presetCard, activo && styles.presetCardActive]}
                >
                  <Text
                    style={[styles.presetCardTitle, activo && styles.presetCardTitleActive]}
                  >
                    {preset.label}
                  </Text>
                  <Text
                    style={[styles.presetCardSub, activo && styles.presetCardSubActive]}
                  >
                    {preset.sub}
                  </Text>
                </BotonInteractivo>
              </View>
            );
          })}
        </View>
      </Animated.View>

      {/* Bloque 2: Contadores de Años y Meses */}
      <Animated.View style={[styles.stepBlock, bloque2AnimStyle]}>
        <Text style={styles.fieldLabel}>AJUSTE PRECISO DE ANTIGÜEDAD</Text>
        <View style={styles.dualCountersRow}>
          {/* Contador Años */}
          <View style={styles.counterCard}>
            <Text style={styles.spinnerColLabel}>AÑOS (0–30)</Text>
            <View style={styles.counterControlRow}>
              <BotonInteractivo
                accessibilityLabel="Menos 1 año de entreno"
                onPress={() => ajustarAniosEntreno(-1)}
                scaleDown={0.92}
                style={styles.counterSquareBtn}
              >
                <Feather name="minus" size={18} color={TOKENS.colors.textPrimary} />
              </BotonInteractivo>
              <Text style={styles.counterBigNumber}>
                {String(aniosEntreno).padStart(2, '0')}
              </Text>
              <BotonInteractivo
                accessibilityLabel="Más 1 año de entreno"
                onPress={() => ajustarAniosEntreno(1)}
                scaleDown={0.92}
                style={styles.counterSquareBtn}
              >
                <Feather name="plus" size={18} color={TOKENS.colors.textPrimary} />
              </BotonInteractivo>
            </View>
          </View>

          {/* Contador Meses */}
          <View style={styles.counterCard}>
            <Text style={styles.spinnerColLabel}>MESES (0–11)</Text>
            <View style={styles.counterControlRow}>
              <BotonInteractivo
                accessibilityLabel="Menos 1 mes de entreno"
                onPress={() => ajustarMesesEntreno(-1)}
                scaleDown={0.92}
                style={styles.counterSquareBtn}
              >
                <Feather name="minus" size={18} color={TOKENS.colors.textPrimary} />
              </BotonInteractivo>
              <Text style={styles.counterBigNumber}>
                {String(mesesEntreno).padStart(2, '0')}
              </Text>
              <BotonInteractivo
                accessibilityLabel="Más 1 mes de entreno"
                onPress={() => ajustarMesesEntreno(1)}
                scaleDown={0.92}
                style={styles.counterSquareBtn}
              >
                <Feather name="plus" size={18} color={TOKENS.colors.textPrimary} />
              </BotonInteractivo>
            </View>
          </View>
        </View>
      </Animated.View>

      {/* Bloque 3: Tarjeta de Línea de Tiempo Viva */}
      <Animated.View
        style={[styles.stepBlock, bloque3AnimStyle, timelineAnimStyle]}
      >
        <View style={styles.timelineLiveCard}>
          <View style={styles.timelineHeaderRow}>
            <View style={styles.timelineBadgePill}>
              <Feather name="clock" size={12} color={TOKENS.colors.textInverse} />
              <Text style={styles.timelineBadgePillText}>
                {`ENTRENANDO DESDE: ${formatearFechaLegible(fechaInicioEntrenoEfectiva)}`}
              </Text>
            </View>
            <Text style={styles.timelineElapsedLabel}>
              {resumenTiempoEntreno.texto}
            </Text>
          </View>

          <Text style={styles.timelineLevelTitle}>{nivelExperienciaIA.nivel}</Text>
          <Text style={styles.timelineLevelDesc}>{nivelExperienciaIA.detalle}</Text>
        </View>
      </Animated.View>
    </View>
  );

  const renderPaso4Objetivo = () => (
    <View style={styles.stepBlocksContainer}>
      {/* Bloque 1: Encabezado */}
      <Animated.View style={[styles.stepBlock, bloque1AnimStyle]}>
        <Text style={styles.stepKicker}>PASO 04 · OBJETIVO FÍSICO PRINCIPAL</Text>
        <Text style={styles.stepTitle}>Dirección Estratégica</Text>
        <Text style={styles.stepSubtitle}>
          Selecciona tu meta actual. Puedes recalibrarla desde Estadísticas cuando
          cambies de etapa física.
        </Text>
      </Animated.View>

      {/* Bloque 2: 4 Tarjetas Editoriales Interactivas */}
      <Animated.View style={[styles.stepBlock, bloque2AnimStyle]}>
        <View style={styles.objectivesStack}>
          {CATALOGO_OBJETIVOS.map((item) => {
            const activo = objetivo === item.id;
            return (
              <BotonInteractivo
                key={item.id}
                accessibilityLabel={`Objetivo ${item.id}`}
                onPress={() => seleccionarObjetivo(item.id)}
                style={[styles.objectiveCard, activo && styles.objectiveCardActive]}
              >
                <View style={styles.objectiveTopRow}>
                  <View style={styles.objectiveTitleGroup}>
                    <View
                      style={[
                        styles.objectiveIconBox,
                        activo && styles.objectiveIconBoxActive,
                      ]}
                    >
                      <Feather
                        name={item.icono}
                        size={16}
                        color={
                          activo
                            ? TOKENS.colors.textPrimary
                            : TOKENS.colors.textSecondary
                        }
                      />
                    </View>
                    <View>
                      <Text
                        style={[
                          styles.objectiveTagText,
                          activo && styles.objectiveTagTextActive,
                        ]}
                      >
                        {item.tag}
                      </Text>
                      <Text
                        style={[
                          styles.objectiveTitleText,
                          activo && styles.objectiveTitleTextActive,
                        ]}
                      >
                        {item.id}
                      </Text>
                    </View>
                  </View>

                  <View
                    style={[
                      styles.objectiveRadioOuter,
                      activo && styles.objectiveRadioOuterActive,
                    ]}
                  >
                    {activo && (
                      <Feather
                        name="check"
                        size={13}
                        color={TOKENS.colors.textPrimary}
                      />
                    )}
                  </View>
                </View>

                <Text
                  style={[
                    styles.objectiveSubText,
                    activo && styles.objectiveSubTextActive,
                  ]}
                >
                  {item.subtitulo}
                </Text>
              </BotonInteractivo>
            );
          })}
        </View>
      </Animated.View>

      {/* Bloque 3: Confirmación de Calibración Gemini IA */}
      <Animated.View
        style={[styles.stepBlock, bloque3AnimStyle, objetivoBannerAnimStyle]}
      >
        <View style={styles.geminiCalibrationBox}>
          <View style={styles.geminiCalibrationHeader}>
            <Feather name="cpu" size={14} color={TOKENS.colors.textPrimary} />
            <Text style={styles.geminiCalibrationTitle}>
              {`CALIBRACIÓN GEMINI IA ACTIVA · ${datosObjetivoActivo.id.toUpperCase()}`}
            </Text>
          </View>
          <Text style={styles.geminiCalibrationBody}>
            {datosObjetivoActivo.calibracionIA}
          </Text>
        </View>
      </Animated.View>
    </View>
  );

  const renderEscenaCelebracion = () => {
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
    };

    const edadFinal =
      calcularEdadExacta(new Date(), perfilFinal.fechaNacimiento)?.anios ?? null;
    const tiempoFinal = calcularTiempoEntrenando(
      new Date(),
      perfilFinal.fechaInicioEntreno
    );
    const estaturaMostrada =
      perfilFinal.alturaCm ?? perfilFinal.estaturaCm ?? estaturaCm;
    const pesoBaseMostrado = Number(
      perfilFinal.pesoKgBase ?? perfilFinal.pesoInicialKg ?? pesoInicialKg
    ).toFixed(1);

    return (
      <View style={styles.fullSceneContainer}>
        <ScrollView
          contentContainerStyle={[
            styles.celebrationScrollContent,
            { paddingTop: insets.headerPaddingTop + 16, paddingBottom: 28 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* Doble Anillo Geométrico Concéntrico + Check Central */}
          <View style={styles.celebEmblemContainer}>
            <Animated.View style={[styles.celebOuterRing, celebRingAnimStyle]} />
            <Animated.View style={[styles.celebInnerCircle, celebCheckAnimStyle]}>
              <Feather name="check" size={28} color={TOKENS.colors.textInverse} />
            </Animated.View>
          </View>

          <Animated.View style={[styles.celebHeaderBlock, celebHeaderAnimStyle]}>
            <View style={styles.whitePillBadge}>
              <Text style={styles.whitePillBadgeText}>
                PASAPORTE BIOMÉTRICO OFICIAL
              </Text>
            </View>
            <Text style={styles.celebMainTitle}>PERFIL BIOMÉTRICO CALIBRADO</Text>
            <Text style={styles.celebSubtitle}>
              Tus parámetros dinámicos han quedado vinculados a las estadísticas de
              fuerza, registro corporal y contexto de Gemini IA.
            </Text>
          </Animated.View>

          {/* Tarjeta Pasaporte Biométrico con Destello de Borde y 6 Indicadores en Cascada */}
          <Animated.View
            style={[styles.passportCard, pasaporteCardBorderStyle]}
          >
            <View style={styles.passportTopHeader}>
              <View>
                <Text style={styles.passportSerialLabel}>
                  FITNESS TRACKER · MATTE LUXURY ID
                </Text>
                <Text style={styles.passportOwnerName}>
                  {perfilFinal.nombre || 'Atleta'}
                </Text>
              </View>
              <View style={styles.passportStatusBadge}>
                <Feather name="shield" size={12} color={TOKENS.colors.textPrimary} />
                <Text style={styles.passportStatusText}>ACTIVO</Text>
              </View>
            </View>

            <View style={styles.passportGrid}>
              <Animated.View style={[styles.passportCell, pItem1Style]}>
                <Text style={styles.passportCellLabel}>IDENTIDAD</Text>
                <Text style={styles.passportCellValue}>
                  {`${perfilFinal.nombre || 'Atleta'} · ${perfilFinal.sexo}`}
                </Text>
              </Animated.View>

              <Animated.View style={[styles.passportCell, pItem2Style]}>
                <Text style={styles.passportCellLabel}>EDAD EXACTA</Text>
                <Text style={styles.passportCellValue}>
                  {`${edadFinal !== null ? edadFinal : '--'} años`}
                </Text>
                <Text style={styles.passportCellSub}>
                  {formatearFechaLegible(perfilFinal.fechaNacimiento)}
                </Text>
              </Animated.View>

              <Animated.View style={[styles.passportCell, pItem3Style]}>
                <Text style={styles.passportCellLabel}>ESTATURA</Text>
                <Text style={styles.passportCellValue}>
                  {`${estaturaMostrada} cm`}
                </Text>
              </Animated.View>

              <Animated.View style={[styles.passportCell, pItem4Style]}>
                <Text style={styles.passportCellLabel}>PESO INICIAL BASE</Text>
                <Text style={styles.passportCellValue}>
                  {`${pesoBaseMostrado} kg`}
                </Text>
              </Animated.View>

              <Animated.View style={[styles.passportCell, pItem5Style]}>
                <Text style={styles.passportCellLabel}>EXPERIENCIA</Text>
                <Text style={styles.passportCellValue}>
                  {tiempoFinal?.texto || 'Recién iniciado'}
                </Text>
                <Text style={styles.passportCellSub}>
                  {`Desde ${formatearFechaLegible(perfilFinal.fechaInicioEntreno)}`}
                </Text>
              </Animated.View>

              <Animated.View style={[styles.passportCell, pItem6Style]}>
                <Text style={styles.passportCellLabel}>OBJETIVO IA</Text>
                <Text style={styles.passportCellValue}>{perfilFinal.objetivo}</Text>
              </Animated.View>
            </View>

            <View style={styles.passportFooter}>
              <Feather name="cpu" size={13} color={TOKENS.colors.textSecondary} />
              <Text style={styles.passportFooterText}>
                GEMINI IA CONTEXT SYNC · PARÁMETROS LISTOS
              </Text>
            </View>
          </Animated.View>
        </ScrollView>

        <Animated.View
          style={[
            styles.bottomCtaBar,
            { paddingBottom: Math.max(insets.bottom, 16) },
            celebCtaAnimStyle,
          ]}
        >
          <BotonInteractivo
            accessibilityLabel={
              modoEdicion
                ? 'Volver con Perfil Actualizado'
                : 'Entrar a Fitness Tracker'
            }
            onPress={handleFinalizarCelebracion}
            style={styles.primaryCtaButton}
          >
            <Text style={styles.primaryCtaText}>
              {modoEdicion
                ? 'Volver con Perfil Actualizado'
                : 'Entrar a Fitness Tracker'}
            </Text>
            <Feather name="check" size={18} color={TOKENS.colors.textInverse} />
          </BotonInteractivo>
        </Animated.View>
      </View>
    );
  };

  const etiquetaCtaWizard = () => {
    if (escena < 4) return 'Continuar';
    if (guardando) return 'Calibrando Perfil...';
    return modoEdicion ? 'Guardar Cambios' : 'Guardar y Calibrar IA';
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={false}
      statusBarTranslucent
      onRequestClose={() => {
        if (escena === 5) {
          handleFinalizarCelebracion();
          return;
        }
        if (escena >= 2 && escena <= 4) {
          handleRetrocederPaso();
          return;
        }
        if (escena === 1) {
          handleRetrocederPaso();
          return;
        }
        if (modoEdicion && onCerrar) {
          Keyboard.dismiss();
          onCerrar();
        }
      }}
    >
      <View style={styles.modalCanvas}>
        {escena === 0 && renderEscenaHero()}

        {escena >= 1 && escena <= 4 && (
          <KeyboardAvoidingView
            style={styles.fullSceneContainer}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            {renderCabeceraWizard()}

            <ScrollView
              contentContainerStyle={styles.wizardScrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <Animated.View style={sceneContainerAnimStyle}>
                {escena === 1 && renderPaso1Identidad()}
                {escena === 2 && renderPaso2Antropometria()}
                {escena === 3 && renderPaso3Antiguedad()}
                {escena === 4 && renderPaso4Objetivo()}
              </Animated.View>
            </ScrollView>

            {/* Barra Inferior Fija Thumb-Zone (54dp) */}
            <View
              style={[
                styles.bottomCtaBar,
                { paddingBottom: Math.max(insets.bottom, 16) },
              ]}
            >
              {Boolean(errorValidacion) && (
                <View style={styles.errorBannerRow}>
                  <Feather name="alert-circle" size={14} color={TOKENS.colors.danger} />
                  <Text style={styles.errorBannerText}>{errorValidacion}</Text>
                </View>
              )}

              <BotonInteractivo
                accessibilityLabel={etiquetaCtaWizard()}
                disabled={guardando}
                onPress={handleAvanzarPaso}
                style={[
                  styles.primaryCtaButton,
                  guardando && styles.primaryCtaButtonDisabled,
                ]}
              >
                <Text style={styles.primaryCtaText}>{etiquetaCtaWizard()}</Text>
                <Feather
                  name={escena === 4 ? 'cpu' : 'arrow-right'}
                  size={18}
                  color={TOKENS.colors.textInverse}
                />
              </BotonInteractivo>
            </View>
          </KeyboardAvoidingView>
        )}

        {escena === 5 && renderEscenaCelebracion()}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalCanvas: {
    flex: 1,
    backgroundColor: TOKENS.colors.canvas,
  },
  fullSceneContainer: {
    flex: 1,
    backgroundColor: TOKENS.colors.canvas,
  },

  // ==========================================================================
  // ESCENA 0: HERO DE BIENVENIDA
  // ==========================================================================
  heroScrollContent: {
    paddingHorizontal: 22,
  },
  heroEmblemWrapper: {
    width: 112,
    height: 112,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
    marginBottom: 20,
  },
  heroRingOuter: {
    position: 'absolute',
    width: 108,
    height: 108,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: TOKENS.colors.borderStrong,
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  heroRingMiddle: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: TOKENS.colors.borderDefault,
    backgroundColor: TOKENS.colors.surface,
  },
  heroRingInner: {
    width: 54,
    height: 54,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: TOKENS.colors.accentWhite,
    backgroundColor: TOKENS.colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeWrapCenter: {
    alignItems: 'center',
    marginBottom: 14,
  },
  whitePillBadge: {
    backgroundColor: TOKENS.colors.badgeBg,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: TOKENS.radii.pill,
  },
  whitePillBadgeText: {
    color: TOKENS.colors.badgeText,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.3,
  },
  heroTitleBlock: {
    alignItems: 'center',
    marginBottom: 26,
  },
  heroMainTitle: {
    color: TOKENS.colors.textPrimary,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.6,
    textAlign: 'center',
    marginBottom: 10,
  },
  heroMainSubtitle: {
    color: TOKENS.colors.textSecondary,
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    paddingHorizontal: 6,
  },
  heroPilaresList: {
    gap: 12,
  },
  heroPilarCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: TOKENS.colors.surface,
    borderWidth: 1,
    borderColor: TOKENS.colors.borderDefault,
    borderRadius: TOKENS.radii.md,
    padding: 16,
    gap: 14,
  },
  heroPilarIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: TOKENS.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: TOKENS.colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroPilarTextCol: {
    flex: 1,
  },
  heroPilarTitle: {
    color: TOKENS.colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 3,
  },
  heroPilarSub: {
    color: TOKENS.colors.textSecondary,
    fontSize: 12.5,
    lineHeight: 18,
  },

  // ==========================================================================
  // CABECERA DEL WIZARD (PASOS 1 A 4)
  // ==========================================================================
  wizardHeader: {
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: TOKENS.colors.borderSubtle,
    backgroundColor: TOKENS.colors.canvas,
  },
  wizardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  headerIconBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: TOKENS.colors.surface,
    borderWidth: 1,
    borderColor: TOKENS.colors.borderDefault,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerIconSpacer: {
    width: 44,
    height: 44,
  },
  wizardStepCounterBox: {
    alignItems: 'center',
  },
  wizardStepCategory: {
    color: TOKENS.colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginBottom: 2,
  },
  wizardStepCounterText: {
    color: TOKENS.colors.textPrimary,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1.4,
    fontVariant: ['tabular-nums'],
  },
  progressSegmentsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  progressSegment: {
    flex: 1,
    height: 4,
    borderRadius: 999,
  },

  // ==========================================================================
  // CUERPO DE PASOS DEL WIZARD
  // ==========================================================================
  wizardScrollContent: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 32,
  },
  stepBlocksContainer: {
    gap: 18,
  },
  stepBlock: {
    gap: 10,
  },
  stepKicker: {
    color: TOKENS.colors.textSecondary,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.3,
    textTransform: 'uppercase',
  },
  stepTitle: {
    color: TOKENS.colors.textPrimary,
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  stepSubtitle: {
    color: TOKENS.colors.textSecondary,
    fontSize: 13.5,
    lineHeight: 19.5,
    marginBottom: 4,
  },
  fieldLabel: {
    color: TOKENS.colors.textSecondary,
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  fieldSubtleHint: {
    color: TOKENS.colors.textPrimary,
    fontSize: 12,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  sectionHeaderSpread: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  // PASO 1: Input Nombre + Sexo + Fecha
  inputSectionCard: {
    backgroundColor: TOKENS.colors.surface,
    borderWidth: 1,
    borderColor: TOKENS.colors.borderDefault,
    borderRadius: TOKENS.radii.md,
    padding: 14,
    gap: 10,
  },
  inputHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  charCountText: {
    color: TOKENS.colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  textInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: TOKENS.colors.canvas,
    borderWidth: 1,
    borderColor: TOKENS.colors.borderDefault,
    borderRadius: 12,
    paddingHorizontal: 14,
    minHeight: 50,
    gap: 10,
  },
  textInputWrapperFocused: {
    borderColor: TOKENS.colors.borderFocus,
  },
  textInputField: {
    flex: 1,
    color: TOKENS.colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
    paddingVertical: 10,
  },
  clearInputBtn: {
    padding: 4,
  },
  sexCardsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  sexCardFlex: {
    flex: 1,
  },
  sexCard: {
    backgroundColor: TOKENS.colors.surface,
    borderWidth: 1,
    borderColor: TOKENS.colors.borderDefault,
    borderRadius: TOKENS.radii.md,
    padding: 15,
    minHeight: 108,
    justifyContent: 'space-between',
  },
  sexCardActive: {
    backgroundColor: TOKENS.colors.accentWhite,
    borderColor: TOKENS.colors.accentWhite,
  },
  sexCardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sexCardIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: TOKENS.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: TOKENS.colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sexCardIconCircleActive: {
    backgroundColor: TOKENS.colors.canvas,
    borderColor: TOKENS.colors.canvas,
  },
  sexCardTitle: {
    color: TOKENS.colors.textPrimary,
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 2,
  },
  sexCardTitleActive: {
    color: TOKENS.colors.textInverse,
  },
  sexCardMeta: {
    color: TOKENS.colors.textSecondary,
    fontSize: 11.5,
    fontWeight: '500',
  },
  sexCardMetaActive: {
    color: '#2C2C2C',
    fontWeight: '600',
  },
  bioCalibrationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: TOKENS.colors.surface,
    borderWidth: 1,
    borderColor: TOKENS.colors.borderStrong,
    borderRadius: 12,
    padding: 12,
    gap: 10,
  },
  bioCalibrationTextCol: {
    flex: 1,
  },
  bioCalibrationTag: {
    color: TOKENS.colors.textPrimary,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.9,
    marginBottom: 2,
  },
  bioCalibrationDesc: {
    color: TOKENS.colors.textSecondary,
    fontSize: 12,
    lineHeight: 16.5,
  },
  dateSpinnersGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  dateSpinnerColumn: {
    flex: 1,
    backgroundColor: TOKENS.colors.surface,
    borderWidth: 1,
    borderColor: TOKENS.colors.borderDefault,
    borderRadius: TOKENS.radii.md,
    padding: 10,
    alignItems: 'center',
    gap: 8,
  },
  spinnerColLabel: {
    color: TOKENS.colors.textSecondary,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.1,
  },
  spinnerTouchBtn: {
    width: '100%',
    minHeight: 44,
    borderRadius: 10,
    backgroundColor: TOKENS.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: TOKENS.colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spinnerValueBox: {
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spinnerValueText: {
    color: TOKENS.colors.textPrimary,
    fontSize: 20,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  spinnerSubNumber: {
    color: TOKENS.colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  liveAgePanel: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: TOKENS.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: TOKENS.colors.borderStrong,
    borderRadius: TOKENS.radii.md,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  liveAgeLeft: {
    flex: 1,
    paddingRight: 10,
  },
  liveAgeLabel: {
    color: TOKENS.colors.textPrimary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 2,
  },
  liveAgeSub: {
    color: TOKENS.colors.textSecondary,
    fontSize: 11.5,
  },
  liveAgeBadge: {
    backgroundColor: TOKENS.colors.accentWhite,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  liveAgeValueText: {
    color: TOKENS.colors.textInverse,
    fontSize: 15,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },

  // PASO 2: Antropometría
  instrumentCard: {
    backgroundColor: TOKENS.colors.surface,
    borderWidth: 1,
    borderColor: TOKENS.colors.borderDefault,
    borderRadius: TOKENS.radii.md,
    padding: 16,
    gap: 14,
  },
  instrumentTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  instrumentRangeHint: {
    color: TOKENS.colors.textMuted,
    fontSize: 11.5,
    marginTop: 2,
  },
  instrumentReadoutRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 5,
  },
  instrumentBigValue: {
    color: TOKENS.colors.textPrimary,
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: -0.8,
    fontVariant: ['tabular-nums'],
  },
  instrumentUnitText: {
    color: TOKENS.colors.textSecondary,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
  },
  steppersRow: {
    flexDirection: 'row',
    gap: 8,
  },
  stepperBtnFlex: {
    flex: 1,
  },
  stepperPillBtn: {
    minHeight: 46,
    borderRadius: 10,
    backgroundColor: TOKENS.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: TOKENS.colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperPillBtnCompact: {
    minHeight: 46,
    borderRadius: 10,
    backgroundColor: TOKENS.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: TOKENS.colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperPillBtnText: {
    color: TOKENS.colors.textPrimary,
    fontSize: 14,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  stepperPillBtnTextCompact: {
    color: TOKENS.colors.textPrimary,
    fontSize: 12.5,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  anthropometryLiveCard: {
    backgroundColor: TOKENS.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: TOKENS.colors.borderStrong,
    borderRadius: TOKENS.radii.md,
    padding: 16,
    gap: 14,
  },
  anthroMetricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  anthroMetricCol: {
    flex: 1,
    alignItems: 'center',
  },
  anthroDivider: {
    width: 1,
    height: 30,
    backgroundColor: TOKENS.colors.borderStrong,
  },
  anthroMetricLabel: {
    color: TOKENS.colors.textSecondary,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 4,
  },
  anthroMetricVal: {
    color: TOKENS.colors.textPrimary,
    fontSize: 17,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  imcBarTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: TOKENS.colors.canvas,
    borderWidth: 1,
    borderColor: TOKENS.colors.borderDefault,
    overflow: 'hidden',
  },
  imcBarFill: {
    height: '100%',
    backgroundColor: TOKENS.colors.accentWhite,
    borderRadius: 999,
  },
  imcFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  imcClassificationText: {
    color: TOKENS.colors.textPrimary,
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.7,
  },
  imcNoteText: {
    color: TOKENS.colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },

  // PASO 3: Antigüedad Entrenando
  presetsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  presetCell: {
    width: '48%',
    flexGrow: 1,
  },
  presetCard: {
    backgroundColor: TOKENS.colors.surface,
    borderWidth: 1,
    borderColor: TOKENS.colors.borderDefault,
    borderRadius: 12,
    paddingVertical: 13,
    paddingHorizontal: 14,
    minHeight: 62,
    justifyContent: 'center',
  },
  presetCardActive: {
    backgroundColor: TOKENS.colors.accentWhite,
    borderColor: TOKENS.colors.accentWhite,
  },
  presetCardTitle: {
    color: TOKENS.colors.textPrimary,
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 2,
  },
  presetCardTitleActive: {
    color: TOKENS.colors.textInverse,
  },
  presetCardSub: {
    color: TOKENS.colors.textSecondary,
    fontSize: 11.5,
  },
  presetCardSubActive: {
    color: '#2C2C2C',
    fontWeight: '600',
  },
  dualCountersRow: {
    flexDirection: 'row',
    gap: 12,
  },
  counterCard: {
    flex: 1,
    backgroundColor: TOKENS.colors.surface,
    borderWidth: 1,
    borderColor: TOKENS.colors.borderDefault,
    borderRadius: TOKENS.radii.md,
    padding: 14,
    alignItems: 'center',
    gap: 12,
  },
  counterControlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  counterSquareBtn: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: TOKENS.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: TOKENS.colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterBigNumber: {
    color: TOKENS.colors.textPrimary,
    fontSize: 24,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  timelineLiveCard: {
    backgroundColor: TOKENS.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: TOKENS.colors.borderStrong,
    borderRadius: TOKENS.radii.md,
    padding: 16,
    gap: 8,
  },
  timelineHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
  },
  timelineBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: TOKENS.colors.accentWhite,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    gap: 6,
  },
  timelineBadgePillText: {
    color: TOKENS.colors.textInverse,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.7,
    fontVariant: ['tabular-nums'],
  },
  timelineElapsedLabel: {
    color: TOKENS.colors.textPrimary,
    fontSize: 12,
    fontWeight: '800',
  },
  timelineLevelTitle: {
    color: TOKENS.colors.textPrimary,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginTop: 4,
  },
  timelineLevelDesc: {
    color: TOKENS.colors.textSecondary,
    fontSize: 12.5,
    lineHeight: 18,
  },

  // PASO 4: Objetivo Físico
  objectivesStack: {
    gap: 10,
  },
  objectiveCard: {
    backgroundColor: TOKENS.colors.surface,
    borderWidth: 1,
    borderColor: TOKENS.colors.borderDefault,
    borderRadius: TOKENS.radii.md,
    padding: 15,
    gap: 8,
  },
  objectiveCardActive: {
    backgroundColor: TOKENS.colors.accentWhite,
    borderColor: TOKENS.colors.accentWhite,
  },
  objectiveTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  objectiveTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  objectiveIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: TOKENS.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: TOKENS.colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  objectiveIconBoxActive: {
    backgroundColor: TOKENS.colors.canvas,
    borderColor: TOKENS.colors.canvas,
  },
  objectiveTagText: {
    color: TOKENS.colors.textMuted,
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 1,
  },
  objectiveTagTextActive: {
    color: '#444444',
  },
  objectiveTitleText: {
    color: TOKENS.colors.textPrimary,
    fontSize: 17,
    fontWeight: '800',
  },
  objectiveTitleTextActive: {
    color: TOKENS.colors.textInverse,
  },
  objectiveRadioOuter: {
    width: 24,
    height: 24,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: TOKENS.colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  objectiveRadioOuterActive: {
    backgroundColor: TOKENS.colors.canvas,
    borderColor: TOKENS.colors.canvas,
  },
  objectiveSubText: {
    color: TOKENS.colors.textSecondary,
    fontSize: 12.5,
    lineHeight: 18,
  },
  objectiveSubTextActive: {
    color: '#222222',
    fontWeight: '500',
  },
  geminiCalibrationBox: {
    backgroundColor: TOKENS.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: TOKENS.colors.borderStrong,
    borderRadius: TOKENS.radii.md,
    padding: 15,
    gap: 6,
  },
  geminiCalibrationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  geminiCalibrationTitle: {
    color: TOKENS.colors.textPrimary,
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.9,
  },
  geminiCalibrationBody: {
    color: TOKENS.colors.textSecondary,
    fontSize: 12.5,
    lineHeight: 18,
  },

  // ==========================================================================
  // ESCENA 5: CELEBRACIÓN PASAPORTE BIOMÉTRICO
  // ==========================================================================
  celebrationScrollContent: {
    paddingHorizontal: 20,
  },
  celebEmblemContainer: {
    width: 96,
    height: 96,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  celebOuterRing: {
    position: 'absolute',
    width: 92,
    height: 92,
    borderRadius: 9999,
    borderWidth: 1.5,
    borderColor: TOKENS.colors.accentWhite,
    backgroundColor: TOKENS.colors.surface,
  },
  celebInnerCircle: {
    width: 62,
    height: 62,
    borderRadius: 9999,
    backgroundColor: TOKENS.colors.accentWhite,
    alignItems: 'center',
    justifyContent: 'center',
  },
  celebHeaderBlock: {
    alignItems: 'center',
    gap: 10,
    marginBottom: 22,
  },
  celebMainTitle: {
    color: TOKENS.colors.textPrimary,
    fontSize: 23,
    fontWeight: '900',
    letterSpacing: -0.4,
    textAlign: 'center',
  },
  celebSubtitle: {
    color: TOKENS.colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  passportCard: {
    backgroundColor: TOKENS.colors.surface,
    borderWidth: 1.5,
    borderColor: TOKENS.colors.borderStrong,
    borderRadius: TOKENS.radii.lg,
    padding: 18,
    gap: 16,
  },
  passportTopHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: TOKENS.colors.borderDefault,
  },
  passportSerialLabel: {
    color: TOKENS.colors.textMuted,
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 3,
  },
  passportOwnerName: {
    color: TOKENS.colors.textPrimary,
    fontSize: 20,
    fontWeight: '800',
  },
  passportStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: TOKENS.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: TOKENS.colors.borderStrong,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  passportStatusText: {
    color: TOKENS.colors.textPrimary,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  passportGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  passportCell: {
    width: '47%',
    flexGrow: 1,
    backgroundColor: TOKENS.colors.canvas,
    borderWidth: 1,
    borderColor: TOKENS.colors.borderDefault,
    borderRadius: 12,
    padding: 12,
    gap: 3,
  },
  passportCellLabel: {
    color: TOKENS.colors.textSecondary,
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 1,
  },
  passportCellValue: {
    color: TOKENS.colors.textPrimary,
    fontSize: 14.5,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  passportCellSub: {
    color: TOKENS.colors.textMuted,
    fontSize: 11,
    fontVariant: ['tabular-nums'],
  },
  passportFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: TOKENS.colors.borderDefault,
  },
  passportFooterText: {
    color: TOKENS.colors.textSecondary,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.1,
  },

  // ==========================================================================
  // BARRA INFERIOR THUMB-ZONE (54DP)
  // ==========================================================================
  bottomCtaBar: {
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: TOKENS.colors.canvas,
    borderTopWidth: 1,
    borderTopColor: TOKENS.colors.borderSubtle,
    gap: 10,
  },
  errorBannerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: TOKENS.colors.dangerBg,
    borderWidth: 1,
    borderColor: TOKENS.colors.danger,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  errorBannerText: {
    flex: 1,
    color: TOKENS.colors.textPrimary,
    fontSize: 12,
    fontWeight: '600',
  },
  primaryCtaButton: {
    height: TOKENS.touchTarget.ctaHeight,
    borderRadius: TOKENS.radii.md,
    backgroundColor: TOKENS.colors.accentWhite,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  primaryCtaButtonDisabled: {
    opacity: 0.6,
  },
  primaryCtaText: {
    color: TOKENS.colors.textInverse,
    fontSize: 15.5,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
});
