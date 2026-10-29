import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
  const [claveGuardada, setClaveGuardada] = useState(null);
  const [mostrarClave, setMostrarClave] = useState(false);
  const [validando, setValidando] = useState(false);
  const [mensajeEstado, setMensajeEstado] = useState(null);

  const cerrandoRef = useRef(false);
  const translateX = useSharedValue(ANCHO_DRAWER);
  const opacityBackdrop = useSharedValue(0);

  const cargarEstadoClave = useCallback(async () => {
    const clave = await cargarApiKeyGemini();
    setClaveGuardada(clave);
    if (clave) {
      setClaveInput(clave);
    } else {
      setClaveInput('');
    }
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

    opacityBackdrop.value = withTiming(0, { duration: 180 });
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
    if (visible) {
      cerrandoRef.current = false;
      setMontado(true);
      cargarEstadoClave();
      translateX.value = ANCHO_DRAWER;
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
        translateX.value = event.translationX;
        const progreso = Math.max(0, 1 - event.translationX / ANCHO_DRAWER);
        opacityBackdrop.value = progreso * 0.72;
      }
    })
    .onEnd((event) => {
      if (event.translationX > ANCHO_DRAWER * 0.25 || event.velocityX > 600) {
        runOnJS(cerrarDrawer)();
      } else {
        translateX.value = withSpring(0, { damping: 20, stiffness: 140 });
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
        setClaveGuardada(claveLimpia);
        setMensajeEstado({
          tipo: 'exito',
          texto: 'Clave validada y guardada con éxito en tu dispositivo.',
        });
        vibrarEjercicioCompletado();
      } else {
        setMensajeEstado({
          tipo: 'error',
          texto: 'Ocurrió un error al persistir la clave en el almacenamiento local.',
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
            await eliminarApiKeyGemini();
            setClaveGuardada(null);
            setClaveInput('');
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

      if (textoPegado && typeof textoPegado === 'string' && textoPegado.trim()) {
        setClaveInput(textoPegado.trim());
        setMensajeEstado({
          tipo: 'info',
          texto: 'Texto pegado desde el portapapeles.',
        });
        vibrarInicioPresionBorrado();
      } else {
        Alert.alert(
          'Portapapeles',
          'El portapapeles está vacío o no contiene texto válido.'
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

  if (!montado) {
    return null;
  }

  const tieneClaveConfigurada = Boolean(claveGuardada && claveGuardada.length > 0);
  const mascaraClave = tieneClaveConfigurada
    ? `${claveGuardada.slice(0, 6)}••••••••${claveGuardada.slice(-4)}`
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

                  {/* Tarjeta de Estado de Conexión */}
                  <View style={styles.tarjetaEstado}>
                    <View style={styles.filaEstadoEncabezado}>
                      <View
                        style={[
                          styles.puntoConexion,
                          tieneClaveConfigurada
                            ? styles.puntoConectado
                            : styles.puntoDesconectado,
                        ]}
                      />
                      <Text style={styles.textoTituloEstado}>
                        {tieneClaveConfigurada ? 'CLAVE CONECTADA' : 'NO CONFIGURADA'}
                      </Text>
                      <View style={styles.badgeByok}>
                        <Text style={styles.textoBadgeByok}>BYOK</Text>
                      </View>
                    </View>

                    <Text style={styles.descripcionEstado}>
                      {tieneClaveConfigurada
                        ? `Tu clave (${mascaraClave}) está activa en el dispositivo. Las funciones de nutrición e IA fotográfica consumen tu cuota privada.`
                        : 'Configura tu Gemini API Key personal para activar el análisis bromatológico por foto y la evaluación de cambio físico.'}
                    </Text>
                  </View>

                  {/* Formulario de Configuración de Clave */}
                  <View style={styles.seccionFormulario}>
                    <Text style={styles.etiquetaCampo}>GEMINI API KEY</Text>

                    <View style={styles.cajaInputClave}>
                      <TextInput
                        style={styles.inputTexto}
                        value={claveInput}
                        onChangeText={(texto) => {
                          setClaveInput(texto);
                          setMensajeEstado(null);
                        }}
                        placeholder="Pega aquí tu clave (AIzaSy...)"
                        placeholderTextColor={TOKENS.colors.textMuted}
                        secureTextEntry={!mostrarClave}
                        autoCapitalize="none"
                        autoCorrect={false}
                        selectTextOnFocus
                      />

                      <TouchableOpacity
                        style={styles.botonIconoInput}
                        activeOpacity={0.7}
                        onPress={() => setMostrarClave((prev) => !prev)}
                        hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
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
                      >
                        <Feather
                          name="clipboard"
                          size={16}
                          color={TOKENS.colors.textSecondary}
                        />
                      </TouchableOpacity>
                    </View>

                    {/* Mensajes de Estado en Vivo */}
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
                        <Feather
                          name={
                            mensajeEstado.tipo === 'exito'
                              ? 'check-circle'
                              : mensajeEstado.tipo === 'error'
                              ? 'alert-circle'
                              : 'info'
                          }
                          size={14}
                          color={
                            mensajeEstado.tipo === 'exito'
                              ? '#00E676'
                              : mensajeEstado.tipo === 'error'
                              ? '#FF5252'
                              : '#8E8E93'
                          }
                          style={{ marginRight: 8, marginTop: 1 }}
                        />
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

                    {/* Botón Principal: Probar y Guardar */}
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
                            size={15}
                            color="#0A0A0A"
                            style={{ marginRight: 8 }}
                          />
                          <Text style={styles.textoBotonGuardar}>
                            Probar y Guardar Clave
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>

                    {/* Botón Secundario: Eliminar Clave */}
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
                      <Feather
                        name="key"
                        size={16}
                        color={TOKENS.colors.textPrimary}
                        style={{ marginRight: 8 }}
                      />
                      <Text style={styles.tituloAiStudio}>¿No tienes una API Key?</Text>
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
                        color="#FFFFFF"
                        style={{ marginLeft: 6 }}
                      />
                    </TouchableOpacity>
                  </View>

                  {/* Aviso de Privacidad y Modelo Local-First */}
                  <View style={styles.bloquePrivacidad}>
                    <Feather
                      name="shield"
                      size={14}
                      color={TOKENS.colors.textMuted}
                      style={{ marginRight: 8, marginTop: 2 }}
                    />
                    <Text style={styles.textoPrivacidad}>
                      Tu clave se almacena de forma 100% local en tu dispositivo con
                      AsyncStorage. Nunca se transmite a servidores de terceros ni se
                      almacena en repositorios públicos.
                    </Text>
                  </View>
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
  puntoConexion: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
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
    minHeight: 48,
  },
  inputTexto: {
    flex: 1,
    color: TOKENS.colors.textPrimary,
    fontSize: 13,
    paddingVertical: 8,
  },
  botonIconoInput: {
    minWidth: 40,
    minHeight: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
  },
  cajaMensaje: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: TOKENS.radii.sm,
    padding: 10,
    marginTop: 10,
    borderWidth: 1,
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
    backgroundColor: 'transparent',
    borderRadius: TOKENS.radii.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 82, 82, 0.3)',
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
    marginBottom: 6,
  },
  tituloAiStudio: {
    fontSize: 13,
    fontWeight: '700',
    color: TOKENS.colors.textPrimary,
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
    height: 42,
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
  bloquePrivacidad: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 4,
  },
  textoPrivacidad: {
    flex: 1,
    fontSize: 10,
    lineHeight: 14,
    color: TOKENS.colors.textMuted,
  },
});
