import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  AppState,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
  TouchableOpacity,
} from 'react-native-gesture-handler';
import * as Clipboard from 'expo-clipboard';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import {
  cargarApiKeyGemini,
  eliminarApiKeyGemini,
  guardarApiKeyGemini,
  esFormatoApiKeyValido,
} from '../services/apiKeyStorage';
import {
  PERFIL_USUARIO_BASE,
  calcularEdadExacta,
  calcularTiempoEntrenando,
} from '../services/storage';
import { validarApiKeyGemini } from '../services/gemini';
import {
  vibrarConfirmacionBorrado,
  vibrarEjercicioCompletado,
  vibrarInicioPresionBorrado,
} from '../services/haptics';
import { TOKENS } from '../theme/tokens';
import { useSafeInsets } from '../utils/useSafeInsets';

export default function PanelConfiguracionLateral({
  visible,
  onCerrar,
  perfilUsuario = null,
  onEditarPerfil,
  onAbrirOnboardingPerfil,
  onAbrirEdicionPerfil,
}) {
  const insets = useSafeInsets();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const ANCHO_DRAWER = Math.min(Math.round(windowWidth * 0.85), 380);

  const [montado, setMontado] = useState(visible);
  const [claveInput, setClaveInput] = useState('');
  const [finClaveGuardada, setFinClaveGuardada] = useState(null);
  const textoPegadoRef = useRef(null);
  const [mostrarClave, setMostrarClave] = useState(false);
  const [inputEnfocado, setInputEnfocado] = useState(false);
  const [validando, setValidando] = useState(false);
  const [mensajeEstado, setMensajeEstado] = useState(null);

  const cerrandoRef = useRef(false);
  const translateX = useSharedValue(ANCHO_DRAWER);
  const opacityBackdrop = useSharedValue(0);

  const cargarEstadoClave = useCallback(async () => {
    const clave = await cargarApiKeyGemini();
    setFinClaveGuardada(clave ? clave.slice(-4) : null);
    setClaveInput('');
    setMostrarClave(false);
    textoPegadoRef.current = null;
    setMensajeEstado(null);
  }, []);

  const finalizarCierre = useCallback(() => {
    cerrandoRef.current = false;
    setMontado(false);
    if (typeof onCerrar === 'function') {
      onCerrar();
    }
  }, [onCerrar]);

  const cerrarDrawer = useCallback(() => {
    if (cerrandoRef.current) return;
    cerrandoRef.current = true;

    // eslint-disable-next-line react-hooks/immutability -- spec futura
    opacityBackdrop.value = withTiming(0, { duration: 180 });
    // eslint-disable-next-line react-hooks/immutability -- spec futura
    translateX.value = withSpring(
      ANCHO_DRAWER,
      { damping: 20, stiffness: 160, mass: 0.8 },
      (finished) => {
        if (finished) {
          runOnJS(finalizarCierre)();
        }
      }
    );
  }, [ANCHO_DRAWER, translateX, opacityBackdrop, finalizarCierre]);

  useEffect(() => {
    if (!visible) return;
    const suscripcion = AppState.addEventListener('change', (siguienteEstado) => {
      if (siguienteEstado !== 'active') {
        setMostrarClave(false);
      }
    });
    return () => {
      suscripcion.remove();
    };
  }, [visible]);

  useEffect(() => {
    if (visible) {
      cerrandoRef.current = false;
      // eslint-disable-next-line react-hooks/set-state-in-effect -- spec futura
      setMontado(true);
      cargarEstadoClave();
      // eslint-disable-next-line react-hooks/immutability -- spec futura
      translateX.value = ANCHO_DRAWER;
      // eslint-disable-next-line react-hooks/immutability -- spec futura
      opacityBackdrop.value = 0;
      translateX.value = withSpring(0, {
        damping: 20,
        stiffness: 140,
        mass: 0.8,
      });
      opacityBackdrop.value = withTiming(0.72, { duration: 240 });
    } else if (montado && !cerrandoRef.current) {
      cerrarDrawer();
    }
  }, [visible, montado, cargarEstadoClave, cerrarDrawer, translateX, opacityBackdrop, ANCHO_DRAWER]);

  // Gesto Pan swipe a la derecha en UI Thread
  const gestoSwipe = Gesture.Pan()
    .cancelsTouchesInView(false)
    .activeOffsetX(25)
    .failOffsetY([-15, 15])
    .onUpdate((event) => {
      if (event.translationX > 0) {
        // eslint-disable-next-line react-hooks/immutability -- spec futura
        translateX.value = event.translationX;
        const progreso = Math.max(0, 1 - event.translationX / ANCHO_DRAWER);
        // eslint-disable-next-line react-hooks/immutability -- spec futura
        opacityBackdrop.value = progreso * 0.72;
      }
    })
    // eslint-disable-next-line react-hooks/refs -- spec futura
    .onEnd((event) => {
      if (event.translationX > ANCHO_DRAWER * 0.25 || event.velocityX > 600) {
        runOnJS(cerrarDrawer)();
      } else {
        // eslint-disable-next-line react-hooks/immutability -- spec futura
        translateX.value = withSpring(0, { damping: 20, stiffness: 140 });
        // eslint-disable-next-line react-hooks/immutability -- spec futura
        opacityBackdrop.value = withTiming(0.72, { duration: 150 });
      }
    });

  const estiloAnimadoDrawer = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const estiloAnimadoBackdrop = useAnimatedStyle(() => ({
    opacity: opacityBackdrop.value,
  }));

  const handleProbarYGuardar = async () => {
    const claveLimpia = claveInput.trim();
    if (!claveLimpia) {
      if (finClaveGuardada) {
        setMensajeEstado({
          tipo: 'info',
          texto:
            'Ya tienes una clave guardada. Pega una clave nueva solo si quieres reemplazarla.',
        });
        return;
      }
      setMensajeEstado({
        tipo: 'error',
        texto: 'Por favor ingresa o pega tu Gemini API Key antes de guardar.',
      });
      return;
    }

    setValidando(true);
    setMensajeEstado(null);
    vibrarInicioPresionBorrado();

    const resultado = await validarApiKeyGemini(claveLimpia);
    setValidando(false);

    if (resultado.valida) {
      const guardado = await guardarApiKeyGemini(claveLimpia);
      if (guardado) {
        setFinClaveGuardada(claveLimpia.slice(-4));
        setClaveInput('');
        setMostrarClave(false);
        if (textoPegadoRef.current === claveLimpia) {
          try {
            await Clipboard.setStringAsync('');
          } catch {}
        }
        textoPegadoRef.current = null;
        setMensajeEstado({
          tipo: 'exito',
          texto: 'Clave validada y guardada en el almacenamiento seguro de tu teléfono.',
        });
        vibrarEjercicioCompletado();
      } else {
        setMensajeEstado({
          tipo: 'error',
          texto: 'No se pudo guardar la clave en el almacenamiento seguro del dispositivo.',
        });
      }
    } else {
      setMensajeEstado({
        tipo: 'error',
        texto: resultado.error || 'La clave ingresada no es válida.',
      });
      vibrarConfirmacionBorrado();
    }
  };

  const handleEliminarClave = () => {
    Alert.alert(
      'Eliminar API Key',
      '¿Deseas eliminar tu clave de Gemini de este dispositivo? Las consultas de IA fotográfica requerirán configurarla nuevamente.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            const eliminado = await eliminarApiKeyGemini();
            if (!eliminado) {
              await cargarEstadoClave();
              setMensajeEstado({
                tipo: 'error',
                texto: 'No se pudo eliminar la clave por completo. Intenta de nuevo.',
              });
              return;
            }
            setFinClaveGuardada(null);
            setClaveInput('');
            setMostrarClave(false);
            textoPegadoRef.current = null;
            setMensajeEstado({
              tipo: 'info',
              texto: 'Clave eliminada del dispositivo.',
            });
            vibrarConfirmacionBorrado();
          },
        },
      ]
    );
  };

  const handlePegarPortapapeles = async () => {
    try {
      const textoPegado = await Clipboard.getStringAsync();
      const limpio = typeof textoPegado === 'string' ? textoPegado.trim() : '';

      if (limpio && esFormatoApiKeyValido(limpio)) {
        setClaveInput(limpio);
        textoPegadoRef.current = limpio;
        setMensajeEstado({
          tipo: 'info',
          texto: 'Texto pegado desde el portapapeles.',
        });
        vibrarInicioPresionBorrado();
      } else {
        Alert.alert(
          'Portapapeles',
          'El portapapeles no contiene una clave con formato válido.'
        );
      }
    } catch {
      Alert.alert(
        'Portapapeles',
        'No se pudo acceder al portapapeles en este dispositivo.'
      );
    }
  };

  const handleAbrirGoogleAIStudio = async () => {
    try {
      await Linking.openURL('https://aistudio.google.com/app/apikey');
    } catch {
      Alert.alert(
        'Enlace externo',
        'No se pudo abrir el navegador para acceder a Google AI Studio.'
      );
    }
  };

  // Crédito obligatorio de la licencia free tier de RepDB (Spec 014, CA-10)
  const handleAbrirRepDB = async () => {
    try {
      await Linking.openURL('https://repdb.co');
    } catch {
      Alert.alert('Enlace externo', 'No se pudo abrir el navegador para acceder a RepDB.');
    }
  };

  if (!montado) {
    return null;
  }

  const tieneClaveConfigurada = Boolean(finClaveGuardada);
  const mascaraClave = tieneClaveConfigurada
    ? `••••••••${finClaveGuardada}`
    : '';

  const perfilActivo = perfilUsuario || PERFIL_USUARIO_BASE;
  const nombrePasaporte = String(perfilActivo?.nombre || '').trim() || 'Atleta';
  const sexoPasaporte = perfilActivo?.sexo || PERFIL_USUARIO_BASE.sexo;
  const alturaPasaporte =
    Number(perfilActivo?.alturaCm) || PERFIL_USUARIO_BASE.alturaCm;
  const pesoActualPasaporte = Number(
    perfilActivo?.pesoKgActual ??
      perfilActivo?.pesoKgBase ??
      PERFIL_USUARIO_BASE.pesoKgBase
  ).toFixed(1);
  const objetivoPasaporte =
    perfilActivo?.objetivo || PERFIL_USUARIO_BASE.objetivo;
  const edadPasaporte = calcularEdadExacta(
    new Date(),
    perfilActivo?.fechaNacimiento || PERFIL_USUARIO_BASE.fechaNacimiento
  );
  const tiempoEntrenoPasaporte = calcularTiempoEntrenando(
    new Date(),
    perfilActivo?.fechaInicioEntreno || PERFIL_USUARIO_BASE.fechaInicioEntreno
  );

  const handleRecalibrarPasaporte = () => {
    vibrarInicioPresionBorrado();
    const callbackEdicion =
      onEditarPerfil || onAbrirOnboardingPerfil || onAbrirEdicionPerfil;
    if (typeof callbackEdicion === 'function') {
      callbackEdicion();
    } else {
      cerrarDrawer();
    }
  };

  return (
    <Modal
      visible={montado}
      transparent
      statusBarTranslucent
      animationType="none"
      onRequestClose={cerrarDrawer}
    >
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View style={StyleSheet.absoluteFillObject} pointerEvents="box-none">
          {/* 1. Backdrop Oscuro con Fade */}
          <Animated.View style={[styles.backdrop, estiloAnimadoBackdrop]}>
            <Pressable
              style={StyleSheet.absoluteFillObject}
              onPress={cerrarDrawer}
              accessibilityLabel="Cerrar panel de configuración"
            />
          </Animated.View>

          {/* 2. Drawer Lateral Desplegable con Físicas de Resorte */}
          <GestureDetector gesture={gestoSwipe}>
            <Animated.View
              style={[
                styles.drawerContenedor,
                {
                  width: ANCHO_DRAWER,
                  height: windowHeight,
                  paddingTop: insets.headerPaddingTop,
                },
                estiloAnimadoDrawer,
              ]}
            >
              {/* Cabecera del Panel */}
              <View style={styles.cabeceraDrawer}>
                <View>
                  <Text style={styles.etiquetaCategoria}>AJUSTES DEL SISTEMA</Text>
                  <Text style={styles.tituloDrawer}>Configuración</Text>
                </View>
                <TouchableOpacity
                  style={styles.botonCerrar}
                  activeOpacity={0.7}
                  onPress={cerrarDrawer}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Feather name="x" size={20} color="#FFFFFF" />
                </TouchableOpacity>
              </View>

              <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              >
                <ScrollView
                  style={styles.cuerpoScroll}
                  contentContainerStyle={[
                    styles.cuerpoScrollContenido,
                    { paddingBottom: insets.bottom + 40 },
                  ]}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                >
                  {/* Tarjeta Pasaporte Biométrico (Spec 010) */}
                  <View style={styles.tarjetaPasaporte}>
                    <View style={styles.filaPasaporteHeader}>
                      <View style={styles.iconoPasaporteCirculo}>
                        <Feather
                          name="user"
                          size={14}
                          color={TOKENS.colors.textPrimary}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.etiquetaPasaporteDrawer}>
                          PASAPORTE BIOMÉTRICO
                        </Text>
                        <Text
                          style={styles.nombrePasaporteDrawer}
                          numberOfLines={1}
                        >
                          {nombrePasaporte} · {sexoPasaporte}
                        </Text>
                      </View>
                      <View style={styles.badgeObjetivoPasaporte}>
                        <Text style={styles.textoBadgeObjetivoPasaporte}>
                          {objetivoPasaporte.toUpperCase()}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.gridMetricasPasaporte}>
                      <View style={styles.celdaMetricaPasaporte}>
                        <Text style={styles.valorMetricaPasaporte}>
                          {alturaPasaporte} cm
                        </Text>
                        <Text style={styles.etiquetaMetricaPasaporte}>
                          ESTATURA
                        </Text>
                      </View>
                      <View style={styles.divisorVerticalPasaporte} />
                      <View style={styles.celdaMetricaPasaporte}>
                        <Text style={styles.valorMetricaPasaporte}>
                          {pesoActualPasaporte} kg
                        </Text>
                        <Text style={styles.etiquetaMetricaPasaporte}>
                          PESO
                        </Text>
                      </View>
                      <View style={styles.divisorVerticalPasaporte} />
                      <View style={styles.celdaMetricaPasaporte}>
                        <Text style={styles.valorMetricaPasaporte}>
                          {edadPasaporte.texto}
                        </Text>
                        <Text style={styles.etiquetaMetricaPasaporte}>
                          EDAD
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.subtextoExperienciaPasaporte}>
                      Experiencia entrenando: {tiempoEntrenoPasaporte.texto} (desde{' '}
                      {tiempoEntrenoPasaporte.fechaInicio})
                    </Text>

                    <TouchableOpacity
                      style={styles.botonRecalibrarPasaporte}
                      activeOpacity={0.85}
                      onPress={handleRecalibrarPasaporte}
                    >
                      <Feather
                        name="sliders"
                        size={14}
                        color={TOKENS.colors.textPrimary}
                        style={{ marginRight: 8 }}
                      />
                      <Text style={styles.textoBotonRecalibrarPasaporte}>
                        Re-calibrar Pasaporte Biométrico
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Tarjeta de Estado de Conexión (Halo LED concéntrico + BYOK) */}
                  <View style={styles.tarjetaEstado}>
                    <View style={styles.filaEstadoEncabezado}>
                      <View
                        style={[
                          styles.haloLed,
                          tieneClaveConfigurada
                            ? styles.haloLedConectado
                            : styles.haloLedDesconectado,
                        ]}
                      >
                        <View
                          style={[
                            styles.puntoConexion,
                            tieneClaveConfigurada
                              ? styles.puntoConectado
                              : styles.puntoDesconectado,
                          ]}
                        />
                      </View>
                      <Text style={styles.textoTituloEstado}>
                        {tieneClaveConfigurada ? 'CLAVE CONECTADA' : 'NO CONFIGURADA'}
                      </Text>
                      <View style={styles.badgeByok}>
                        <Text style={styles.textoBadgeByok}>BYOK</Text>
                      </View>
                    </View>

                    {/* Cápsula de Seguridad Keystore */}
                    {tieneClaveConfigurada ? (
                      <View style={styles.capsulaMascaraClave}>
                        <Feather
                          name="lock"
                          size={13}
                          color="#00E676"
                          style={{ marginRight: 6 }}
                        />
                        <Text style={styles.textoMascaraClave}>{mascaraClave}</Text>
                        <View style={styles.microBadgeKeystore}>
                          <Text style={styles.textoMicroBadgeKeystore}>KEYSTORE</Text>
                        </View>
                      </View>
                    ) : null}

                    <Text style={styles.descripcionEstado}>
                      {tieneClaveConfigurada
                        ? 'Tu clave está activa en el almacenamiento seguro del dispositivo. Las funciones de nutrición e IA fotográfica consumen tu cuota privada.'
                        : 'Configura tu Gemini API Key personal para activar el análisis bromatológico por foto y la evaluación de cambio físico.'}
                    </Text>
                  </View>

                  {/* Formulario de Configuración de Clave (Security Input Suite) */}
                  <View style={styles.seccionFormulario}>
                    <Text style={styles.etiquetaCampo}>GEMINI API KEY</Text>

                    <View
                      style={[
                        styles.cajaInputClave,
                        inputEnfocado && styles.cajaInputClaveEnfocada,
                      ]}
                    >
                      <Feather
                        name="key"
                        size={15}
                        color={
                          inputEnfocado
                            ? TOKENS.colors.textPrimary
                            : TOKENS.colors.textMuted
                        }
                        style={styles.iconoPrefijoInput}
                      />

                      <TextInput
                        style={styles.inputTexto}
                        value={claveInput}
                        onChangeText={(texto) => {
                          setClaveInput(texto);
                          setMensajeEstado(null);
                        }}
                        onFocus={() => setInputEnfocado(true)}
                        onBlur={() => setInputEnfocado(false)}
                        placeholder={
                          finClaveGuardada
                            ? 'Pega una clave nueva para reemplazarla'
                            : 'Pega aquí tu clave de Google AI Studio'
                        }
                        placeholderTextColor={TOKENS.colors.textMuted}
                        secureTextEntry={!mostrarClave}
                        autoCapitalize="none"
                        autoCorrect={false}
                        autoComplete="off"
                        importantForAutofill="no"
                        textContentType="none"
                        spellCheck={false}
                        keyboardType={
                          Platform.OS === 'android' && mostrarClave
                            ? 'visible-password'
                            : 'default'
                        }
                        selectTextOnFocus
                      />

                      <View style={styles.grupoBotonesInput}>
                        <TouchableOpacity
                          style={styles.botonIconoInput}
                          activeOpacity={0.7}
                          onPress={() => setMostrarClave((prev) => !prev)}
                          hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                          accessibilityLabel={
                            mostrarClave ? 'Ocultar clave' : 'Mostrar clave'
                          }
                        >
                          <Feather
                            name={mostrarClave ? 'eye-off' : 'eye'}
                            size={16}
                            color={TOKENS.colors.textSecondary}
                          />
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.botonIconoInput}
                          activeOpacity={0.7}
                          onPress={handlePegarPortapapeles}
                          hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                          accessibilityLabel="Pegar clave desde portapapeles"
                        >
                          <Feather
                            name="clipboard"
                            size={16}
                            color={TOKENS.colors.textSecondary}
                          />
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* Mensajes de Estado en Vivo con Micro-insignia */}
                    {mensajeEstado ? (
                      <View
                        style={[
                          styles.cajaMensaje,
                          mensajeEstado.tipo === 'exito'
                            ? styles.mensajeExito
                            : mensajeEstado.tipo === 'error'
                            ? styles.mensajeError
                            : styles.mensajeInfo,
                        ]}
                      >
                        <View
                          style={[
                            styles.iconoMensajeCirculo,
                            mensajeEstado.tipo === 'exito'
                              ? styles.iconoMensajeCirculoExito
                              : mensajeEstado.tipo === 'error'
                              ? styles.iconoMensajeCirculoError
                              : styles.iconoMensajeCirculoInfo,
                          ]}
                        >
                          <Feather
                            name={
                              mensajeEstado.tipo === 'exito'
                                ? 'check'
                                : mensajeEstado.tipo === 'error'
                                ? 'alert-triangle'
                                : 'info'
                            }
                            size={12}
                            color={
                              mensajeEstado.tipo === 'exito'
                                ? '#00E676'
                                : mensajeEstado.tipo === 'error'
                                ? '#FF5252'
                                : '#8E8E93'
                            }
                          />
                        </View>
                        <Text
                          style={[
                            styles.textoMensaje,
                            mensajeEstado.tipo === 'exito'
                              ? styles.textoMensajeExito
                              : mensajeEstado.tipo === 'error'
                              ? styles.textoMensajeError
                              : styles.textoMensajeInfo,
                          ]}
                        >
                          {mensajeEstado.texto}
                        </Text>
                      </View>
                    ) : null}

                    {/* Botón Principal: Probar y Guardar (54pt Hero) */}
                    <TouchableOpacity
                      style={[
                        styles.botonGuardar,
                        validando ? styles.botonGuardarDeshabilitado : null,
                      ]}
                      activeOpacity={0.85}
                      onPress={handleProbarYGuardar}
                      disabled={validando}
                    >
                      {validando ? (
                        <ActivityIndicator size="small" color="#0A0A0A" />
                      ) : (
                        <>
                          <Feather
                            name="check"
                            size={16}
                            color="#0A0A0A"
                            style={{ marginRight: 8 }}
                          />
                          <Text style={styles.textoBotonGuardar}>
                            Probar y Guardar Clave
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>

                    {/* Botón Secundario: Eliminar Clave (48pt Tinte Rojo Sutil) */}
                    {tieneClaveConfigurada ? (
                      <TouchableOpacity
                        style={styles.botonEliminar}
                        activeOpacity={0.8}
                        onPress={handleEliminarClave}
                      >
                        <Feather
                          name="trash-2"
                          size={14}
                          color="#FF5252"
                          style={{ marginRight: 8 }}
                        />
                        <Text style={styles.textoBotonEliminar}>Eliminar Clave</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>

                  {/* Banner Enlace a Google AI Studio */}
                  <View style={styles.tarjetaAiStudio}>
                    <View style={styles.filaAiStudioHeader}>
                      <View style={styles.iconoAiStudioCirculo}>
                        <Feather
                          name="key"
                          size={14}
                          color={TOKENS.colors.textPrimary}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.tituloAiStudio}>¿No tienes una API Key?</Text>
                        <Text style={styles.subtituloAiStudio}>
                          Nivel Gratuito de Google
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.descripcionAiStudio}>
                      Google AI Studio ofrece claves gratuitas para Gemini con cuotas generosas
                      para proyectos personales.
                    </Text>
                    <TouchableOpacity
                      style={styles.botonAiStudio}
                      activeOpacity={0.85}
                      onPress={handleAbrirGoogleAIStudio}
                    >
                      <Text style={styles.textoBotonAiStudio}>
                        Obtener clave gratis en AI Studio
                      </Text>
                      <Feather
                        name="external-link"
                        size={13}
                        color={TOKENS.colors.textPrimary}
                        style={{ marginLeft: 6 }}
                      />
                    </TouchableOpacity>
                  </View>

                  {/* Aviso de Privacidad y Modelo Local-First (Cápsula Blindada de Seguridad) */}
                  <View style={styles.capsulaSeguridad}>
                    <View style={styles.iconoEscudoSeguridad}>
                      <Feather
                        name="shield"
                        size={14}
                        color="#00E676"
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={styles.filaEncabezadoSeguridad}>
                        <Text style={styles.tituloSeguridad}>ALMACENAMIENTO SEGURO LOCAL</Text>
                        <View style={styles.badgeHardware}>
                          <Text style={styles.textoBadgeHardware}>HARDWARE-BACKED</Text>
                        </View>
                      </View>
                      <Text style={styles.textoPrivacidad}>
                        Tu clave se guarda cifrada en el almacenamiento seguro de tu teléfono y no se incluye en copias de seguridad. Solo se envía a Google (Gemini) en cada consulta de IA.
                      </Text>
                    </View>
                  </View>

                  {/* Créditos: ilustraciones de ejercicios (licencia RepDB free tier) */}
                  <TouchableOpacity
                    style={styles.botonCreditos}
                    activeOpacity={0.7}
                    onPress={handleAbrirRepDB}
                    accessibilityRole="link"
                    accessibilityLabel="Ilustraciones: Exercise data by RepDB, repdb.co"
                  >
                    <Feather
                      name="image"
                      size={14}
                      color={TOKENS.colors.textMuted}
                      style={{ marginRight: 8 }}
                    />
                    <Text style={styles.textoCreditos}>
                      Ilustraciones: Exercise data by RepDB (repdb.co)
                    </Text>
                  </TouchableOpacity>
                </ScrollView>
              </KeyboardAvoidingView>
            </Animated.View>
          </GestureDetector>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000000',
    zIndex: 1000,
  },
  drawerContenedor: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    flexDirection: 'column',
    backgroundColor: TOKENS.colors.surface, // Carbón mate #141414
    borderLeftWidth: 1,
    borderLeftColor: TOKENS.colors.borderDefault, // Hairline #262626
    zIndex: 1001,
    paddingHorizontal: 16,
    elevation: 24,
    shadowColor: '#000000',
    shadowOffset: { width: -4, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
  },
  cabeceraDrawer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: TOKENS.colors.borderDefault,
  },
  etiquetaCategoria: {
    fontSize: TOKENS.typography.labelCategory.fontSize,
    fontWeight: TOKENS.typography.labelCategory.fontWeight,
    letterSpacing: TOKENS.typography.labelCategory.letterSpacing,
    color: TOKENS.colors.textSecondary,
    textTransform: 'uppercase',
  },
  tituloDrawer: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.3,
    color: TOKENS.colors.textPrimary,
    marginTop: 2,
  },
  botonCerrar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: TOKENS.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: TOKENS.colors.borderDefault,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cuerpoScroll: {
    flex: 1,
  },
  cuerpoScrollContenido: {
    paddingVertical: 18,
  },
  tarjetaPasaporte: {
    backgroundColor: TOKENS.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: TOKENS.colors.borderDefault,
    borderRadius: TOKENS.radii.md,
    padding: 14,
    marginBottom: 18,
  },
  filaPasaporteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconoPasaporteCirculo: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: TOKENS.colors.surfaceInteractive,
    borderWidth: 1,
    borderColor: TOKENS.colors.borderDefault,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  etiquetaPasaporteDrawer: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.9,
    color: TOKENS.colors.textMuted,
  },
  nombrePasaporteDrawer: {
    fontSize: 14,
    fontWeight: '800',
    color: TOKENS.colors.textPrimary,
    marginTop: 1,
  },
  badgeObjetivoPasaporte: {
    backgroundColor: TOKENS.colors.surfaceInteractive,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: TOKENS.radii.xs,
    borderWidth: 1,
    borderColor: TOKENS.colors.borderDefault,
    marginLeft: 8,
  },
  textoBadgeObjetivoPasaporte: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
    color: TOKENS.colors.textSecondary,
  },
  gridMetricasPasaporte: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: TOKENS.colors.surface,
    borderRadius: TOKENS.radii.sm,
    borderWidth: 1,
    borderColor: TOKENS.colors.borderDefault,
    paddingVertical: 10,
    marginBottom: 10,
  },
  celdaMetricaPasaporte: {
    flex: 1,
    alignItems: 'center',
  },
  divisorVerticalPasaporte: {
    width: 1,
    height: 22,
    backgroundColor: TOKENS.colors.borderDefault,
  },
  valorMetricaPasaporte: {
    fontSize: 13,
    fontWeight: '800',
    color: TOKENS.colors.textPrimary,
  },
  etiquetaMetricaPasaporte: {
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 0.6,
    color: TOKENS.colors.textMuted,
    marginTop: 2,
  },
  subtextoExperienciaPasaporte: {
    fontSize: 11,
    color: TOKENS.colors.textSecondary,
    marginBottom: 12,
  },
  botonRecalibrarPasaporte: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 46,
    backgroundColor: TOKENS.colors.surfaceInteractive,
    borderRadius: TOKENS.radii.md,
    borderWidth: 1,
    borderColor: TOKENS.colors.borderDefault,
  },
  textoBotonRecalibrarPasaporte: {
    color: TOKENS.colors.textPrimary,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  tarjetaEstado: {
    backgroundColor: TOKENS.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: TOKENS.colors.borderDefault,
    borderRadius: TOKENS.radii.md,
    padding: 14,
    marginBottom: 20,
  },
  filaEstadoEncabezado: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  haloLed: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  haloLedConectado: {
    backgroundColor: 'rgba(0, 230, 118, 0.15)',
  },
  haloLedDesconectado: {
    backgroundColor: 'rgba(255, 82, 82, 0.15)',
  },
  puntoConexion: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  puntoConectado: {
    backgroundColor: '#00E676',
  },
  puntoDesconectado: {
    backgroundColor: '#FF5252',
  },
  textoTituloEstado: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: TOKENS.colors.textPrimary,
    flex: 1,
  },
  badgeByok: {
    backgroundColor: TOKENS.colors.surfaceInteractive,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: TOKENS.colors.borderDefault,
  },
  textoBadgeByok: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
    color: TOKENS.colors.textSecondary,
  },
  capsulaMascaraClave: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: TOKENS.colors.surface,
    borderWidth: 1,
    borderColor: TOKENS.colors.borderDefault,
    borderRadius: TOKENS.radii.sm,
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginBottom: 10,
  },
  textoMascaraClave: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 12,
    fontWeight: '700',
    color: TOKENS.colors.textPrimary,
    letterSpacing: 1.2,
    flex: 1,
  },
  microBadgeKeystore: {
    backgroundColor: 'rgba(0, 230, 118, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 118, 0.3)',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  textoMicroBadgeKeystore: {
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.6,
    color: '#00E676',
  },
  descripcionEstado: {
    fontSize: 12,
    lineHeight: 17,
    color: TOKENS.colors.textSecondary,
  },
  seccionFormulario: {
    marginBottom: 22,
  },
  etiquetaCampo: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: TOKENS.colors.textSecondary,
    marginBottom: 8,
  },
  cajaInputClave: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: TOKENS.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: TOKENS.colors.borderDefault,
    borderRadius: TOKENS.radii.md,
    paddingHorizontal: 12,
    minHeight: 50,
  },
  cajaInputClaveEnfocada: {
    borderColor: TOKENS.colors.borderFocus,
    backgroundColor: TOKENS.colors.surfaceInteractive,
  },
  iconoPrefijoInput: {
    marginRight: 8,
  },
  inputTexto: {
    flex: 1,
    color: TOKENS.colors.textPrimary,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 13,
    paddingVertical: 10,
  },
  grupoBotonesInput: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  botonIconoInput: {
    minWidth: 38,
    minHeight: 38,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 2,
  },
  cajaMensaje: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: TOKENS.radii.sm,
    padding: 10,
    marginTop: 10,
    borderWidth: 1,
  },
  iconoMensajeCirculo: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    marginTop: 1,
  },
  iconoMensajeCirculoExito: {
    backgroundColor: 'rgba(0, 230, 118, 0.15)',
  },
  iconoMensajeCirculoError: {
    backgroundColor: 'rgba(255, 82, 82, 0.15)',
  },
  iconoMensajeCirculoInfo: {
    backgroundColor: TOKENS.colors.surfaceInteractive,
  },
  mensajeExito: {
    backgroundColor: 'rgba(0, 230, 118, 0.08)',
    borderColor: 'rgba(0, 230, 118, 0.3)',
  },
  mensajeError: {
    backgroundColor: 'rgba(255, 82, 82, 0.08)',
    borderColor: 'rgba(255, 82, 82, 0.3)',
  },
  mensajeInfo: {
    backgroundColor: TOKENS.colors.surfaceElevated,
    borderColor: TOKENS.colors.borderDefault,
  },
  textoMensaje: {
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
  },
  textoMensajeExito: {
    color: '#00E676',
  },
  textoMensajeError: {
    color: '#FF5252',
  },
  textoMensajeInfo: {
    color: TOKENS.colors.textSecondary,
  },
  botonGuardar: {
    flexDirection: 'row',
    height: 54,
    backgroundColor: TOKENS.colors.textPrimary, // Blanco de alto contraste #FFFFFF
    borderRadius: TOKENS.radii.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 14,
  },
  botonGuardarDeshabilitado: {
    opacity: 0.6,
  },
  textoBotonGuardar: {
    color: '#0A0A0A',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  botonEliminar: {
    flexDirection: 'row',
    height: 48,
    backgroundColor: 'rgba(255, 82, 82, 0.06)',
    borderRadius: TOKENS.radii.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 82, 82, 0.25)',
  },
  textoBotonEliminar: {
    color: '#FF5252',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  tarjetaAiStudio: {
    backgroundColor: TOKENS.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: TOKENS.colors.borderDefault,
    borderRadius: TOKENS.radii.md,
    padding: 14,
    marginBottom: 20,
  },
  filaAiStudioHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  iconoAiStudioCirculo: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: TOKENS.colors.surfaceInteractive,
    borderWidth: 1,
    borderColor: TOKENS.colors.borderDefault,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  tituloAiStudio: {
    fontSize: 13,
    fontWeight: '700',
    color: TOKENS.colors.textPrimary,
  },
  subtituloAiStudio: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
    color: TOKENS.colors.textMuted,
    textTransform: 'uppercase',
    marginTop: 1,
  },
  descripcionAiStudio: {
    fontSize: 11,
    lineHeight: 16,
    color: TOKENS.colors.textSecondary,
    marginBottom: 10,
  },
  botonAiStudio: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    backgroundColor: TOKENS.colors.surfaceInteractive,
    borderRadius: TOKENS.radii.sm,
    borderWidth: 1,
    borderColor: TOKENS.colors.borderDefault,
  },
  textoBotonAiStudio: {
    color: TOKENS.colors.textPrimary,
    fontSize: 12,
    fontWeight: '700',
  },
  capsulaSeguridad: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: TOKENS.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: TOKENS.colors.borderDefault,
    borderRadius: TOKENS.radii.md,
    padding: 12,
    marginBottom: 12,
  },
  iconoEscudoSeguridad: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0, 230, 118, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 118, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    marginTop: 2,
  },
  filaEncabezadoSeguridad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  tituloSeguridad: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: TOKENS.colors.textPrimary,
  },
  badgeHardware: {
    backgroundColor: 'rgba(0, 230, 118, 0.1)',
    borderRadius: 3,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 118, 0.25)',
  },
  textoBadgeHardware: {
    fontSize: 7,
    fontWeight: '800',
    letterSpacing: 0.5,
    color: '#00E676',
  },
  textoPrivacidad: {
    fontSize: 10,
    lineHeight: 14,
    color: TOKENS.colors.textSecondary,
  },
  botonCreditos: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: TOKENS.touchTarget.minSize,
    paddingHorizontal: 4,
    marginTop: 8,
  },
  textoCreditos: {
    flex: 1,
    fontSize: 10,
    lineHeight: 14,
    color: TOKENS.colors.textMuted,
    textDecorationLine: 'underline',
  },
});
