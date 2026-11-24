/**
 * Estado del formulario, valores animados, efectos de entrada y transición entre escenas.
 * Extraído sin cambios de OnboardingBienvenidaModal.jsx (Spec 022). No editar la lógica aquí sin revisar el componente.
 */
import { EASE_OUT_STRONG, SPRING_ELASTIC, SPRING_SCENE, SPRING_SNAPPY, obtenerMaxDiasMes } from './base';
import { Keyboard } from 'react-native';
import { OBJETIVOS_PERFIL_VALIDOS, PERFIL_USUARIO_BASE, SEXOS_PERFIL_VALIDOS, parsearFechaLocalYYYYMMDD } from '../../services/storage';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSafeInsets } from '../../utils/useSafeInsets';
import { cancelAnimation, useSharedValue, withDelay, withRepeat, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import { usePreferenciaMovimiento } from '../../utils/movimiento';

export function useEstadoOnboarding({ modoEdicion, perfilInicial, visible }) {
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

  const [anioInicio, setAnioInicio] = useState(2025);

  const [mesInicio, setMesInicio] = useState(11);

  const [diaInicio, setDiaInicio] = useState(1);

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
    // eslint-disable-next-line react-hooks/set-state-in-effect -- spec futura
    setGuardando(false);
    setErrorValidacion('');
    setPerfilConsolidado(null);

    const base = perfilInicial || PERFIL_USUARIO_BASE;

    setNombre(typeof base.nombre === 'string' ? base.nombre : '');
    setSexo(SEXOS_PERFIL_VALIDOS.includes(base.sexo) ? base.sexo : 'Hombre');

    const fechaNacParsed = parsearFechaLocalYYYYMMDD(base.fechaNacimiento);
    let yNacResuelto = Math.max(minAnioPermitido, Math.min(maxAnioPermitido, 2000));
    if (fechaNacParsed) {
      const y = Math.max(
        minAnioPermitido,
        Math.min(maxAnioPermitido, fechaNacParsed.anio)
      );
      const m = fechaNacParsed.mes;
      const maxD = obtenerMaxDiasMes(y, m);
      const d = Math.min(fechaNacParsed.dia, maxD);
      yNacResuelto = y;
      setAnioNac(y);
      setMesNac(m);
      setDiaNac(d);
    } else {
      setAnioNac(yNacResuelto);
      setMesNac(1);
      setDiaNac(1);
    }

    const est = Number(base.alturaCm ?? base.estaturaCm);
    setEstaturaCm(Number.isFinite(est) && est >= 120 && est <= 230 ? Math.round(est) : 175);

    const peso = Number(base.pesoKgBase ?? base.pesoKgActual ?? base.pesoInicialKg);
    setPesoInicialKg(
      Number.isFinite(peso) && peso >= 30 && peso <= 250 ? Number(peso.toFixed(1)) : 75.0
    );

    const hoyLocal = new Date();
    const anioHoy = hoyLocal.getFullYear();
    const mesHoy = hoyLocal.getMonth() + 1;
    const diaHoy = hoyLocal.getDate();

    const minAnioIni = Math.max(1950, yNacResuelto + 5, anioHoy - 60);
    const fechaIniParsed = parsearFechaLocalYYYYMMDD(
      base.fechaInicioEntreno,
      PERFIL_USUARIO_BASE.fechaInicioEntreno
    );
    const yIni = Math.max(
      minAnioIni,
      Math.min(anioHoy, fechaIniParsed?.anio || anioHoy)
    );
    const maxMIni = yIni >= anioHoy ? mesHoy : 12;
    const mIni = Math.max(1, Math.min(maxMIni, fechaIniParsed?.mes || 1));
    const maxCalendarioIni = obtenerMaxDiasMes(yIni, mIni);
    const maxDIni =
      yIni >= anioHoy && mIni >= mesHoy
        ? Math.min(diaHoy, maxCalendarioIni)
        : maxCalendarioIni;
    const dIni = Math.max(1, Math.min(maxDIni, fechaIniParsed?.dia || 1));

    setAnioInicio(yIni);
    setMesInicio(mIni);
    setDiaInicio(dIni);

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
    // eslint-disable-next-line react-hooks/immutability -- spec futura
    bloque1SV.value = 0;
    // eslint-disable-next-line react-hooks/immutability -- spec futura
    bloque2SV.value = 0;
    // eslint-disable-next-line react-hooks/immutability -- spec futura
    bloque3SV.value = 0;

    bloque1SV.value = withDelay(40, withSpring(1, SPRING_SCENE));
    bloque2SV.value = withDelay(110, withSpring(1, SPRING_SCENE));
    bloque3SV.value = withDelay(180, withSpring(1, SPRING_SCENE));
  }, [bloque1SV, bloque2SV, bloque3SV]);

  // Spec 024 (RF-1): el pulso infinito del anillo no se inicia con «reducir movimiento» y se cancela si se activa.
  const { reducir } = usePreferenciaMovimiento();
  const reducirRef = useRef(reducir);
  useEffect(() => {
    reducirRef.current = reducir;
    if (reducir) {
      cancelAnimation(heroRingPulse);
      heroRingPulse.value = 1;
    }
  }, [reducir, heroRingPulse]);

  useEffect(() => {
    if (!visible) return;

    if (escena === 0) {
      // eslint-disable-next-line react-hooks/immutability -- valor animado de Reanimated (se modifica por diseño)
      heroRingPulse.value = 1;
      if (!reducirRef.current) {
        heroRingPulse.value = withRepeat(
          withSequence(
            withTiming(1.06, { duration: 1600, easing: EASE_OUT_STRONG }),
            withTiming(1, { duration: 1600, easing: EASE_OUT_STRONG })
          ),
          -1,
          true
        );
      }

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

      // eslint-disable-next-line react-hooks/immutability -- spec futura
      sceneTranslateX.value = direccion * 28;
      // eslint-disable-next-line react-hooks/immutability -- spec futura
      sceneScale.value = 0.985;
      // eslint-disable-next-line react-hooks/immutability -- spec futura
      sceneOpacity.value = 0.15;

      setEscena(nuevaEscena);

      sceneTranslateX.value = withSpring(0, SPRING_SCENE);
      sceneScale.value = withSpring(1, SPRING_SCENE);
      sceneOpacity.value = withTiming(1, { duration: 220, easing: EASE_OUT_STRONG });
    },
    [sceneTranslateX, sceneScale, sceneOpacity]
  );

  return { insets, anioActual, minAnioPermitido, maxAnioPermitido, escena, setEscena, nombre, setNombre, focoNombre, setFocoNombre, sexo, setSexo, anioNac, setAnioNac, mesNac, setMesNac, diaNac, setDiaNac, estaturaCm, setEstaturaCm, pesoInicialKg, setPesoInicialKg, anioInicio, setAnioInicio, mesInicio, setMesInicio, diaInicio, setDiaInicio, objetivo, setObjetivo, errorValidacion, setErrorValidacion, guardando, setGuardando, perfilConsolidado, setPerfilConsolidado, guardandoRef, heroRingPulse, heroBadgeSV, heroTitleSV, heroPilar1SV, heroPilar2SV, heroPilar3SV, heroCtaSV, sceneTranslateX, sceneScale, sceneOpacity, bloque1SV, bloque2SV, bloque3SV, prog1SV, prog2SV, prog3SV, prog4SV, edadPulseSV, bioBannerSV, imcProgressSV, metricaPulseSV, timelinePulseSV, objetivoBannerSV, celebCheckScale, celebRingScale, celebHeaderSV, celebFlashBorder, pasaporteItem1, pasaporteItem2, pasaporteItem3, pasaporteItem4, pasaporteItem5, pasaporteItem6, celebCtaSV, dispararCascadaBloques, transicionarAEscena };
}
