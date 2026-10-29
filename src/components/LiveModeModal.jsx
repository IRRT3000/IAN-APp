import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  BackHandler,
  Keyboard,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import {
  eliminarSesionActivaDraft,
  guardarSesionActivaDraft,
} from '../services/storage';
import {
  vibrarConfirmacionBorrado,
  vibrarEjercicioCompletado,
  vibrarSerieAgregada,
  vibrarSeleccionBascula,
} from '../services/haptics';
import { TOKENS } from '../theme/tokens';
import { useSafeInsets } from '../utils/useSafeInsets';

export default function LiveModeModal({
  visible,
  ejercicioActivo,
  draftInicial = null,
  onTerminarEjercicio,
  onDescartarEjercicio,
}) {
  const insets = useSafeInsets();
  const [series, setSeries] = useState([]);
  const [errorValidacion, setErrorValidacion] = useState('');
  const [seriesInvalidas, setSeriesInvalidas] = useState([]);
  const [tecladoVisible, setTecladoVisible] = useState(false);
  const autoSaveTimerRef = useRef(null);

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => setTecladoVisible(true)
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setTecladoVisible(false)
    );

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  useEffect(() => {
    if (!visible || !ejercicioActivo) {
      return;
    }

    if (
      draftInicial &&
      Array.isArray(draftInicial.seriesDetalle) &&
      draftInicial.seriesDetalle.length > 0
    ) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- spec futura
      setSeries(draftInicial.seriesDetalle.map((s) => ({ ...s })));
    } else {
      setSeries([
        {
          serie: 1,
          peso: '',
          repeticiones: '',
        },
      ]);
    }
    setErrorValidacion('');
    setSeriesInvalidas([]);
  }, [visible, ejercicioActivo, draftInicial]);

  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, []);

  const persistirDraftInmediato = useCallback(
    async (nuevasSeries) => {
      if (!ejercicioActivo) return;
      try {
        await guardarSesionActivaDraft({
          idEjercicio: ejercicioActivo.id,
          ejercicio: ejercicioActivo.nombre,
          grupoMuscular: ejercicioActivo.grupoMuscular,
          implemento: ejercicioActivo.implemento,
          seriesDetalle: nuevasSeries,
          iniciadoEn: draftInicial?.iniciadoEn || Date.now(),
        });
      } catch (err) {
        console.error('Error al persistir borrador inmediato:', err);
      }
    },
    [ejercicioActivo, draftInicial]
  );

  const programarAutoSaveDebounce = useCallback(
    (nuevasSeries) => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
      autoSaveTimerRef.current = setTimeout(() => {
        persistirDraftInmediato(nuevasSeries);
      }, 350);
    },
    [persistirDraftInmediato]
  );

  const agregarSerie = () => {
    vibrarSerieAgregada();
    setSeries((prev) => {
      const ultimaSerie = prev.length > 0 ? prev[prev.length - 1] : null;
      const nuevaSerie = {
        serie: prev.length + 1,
        peso: ultimaSerie ? String(ultimaSerie.peso ?? '') : '',
        repeticiones: ultimaSerie
          ? String(ultimaSerie.repeticiones ?? '')
          : '',
      };
      const actualizadas = [...prev, nuevaSerie];
      persistirDraftInmediato(actualizadas);
      return actualizadas;
    });
    setErrorValidacion('');
    setSeriesInvalidas([]);
  };

  const eliminarSerie = (indice) => {
    vibrarSeleccionBascula();
    setSeries((prev) => {
      if (prev.length <= 1) return prev;
      const filtradas = prev.filter((_, idx) => idx !== indice);
      const renumeradas = filtradas.map((item, idx) => ({
        ...item,
        serie: idx + 1,
      }));
      persistirDraftInmediato(renumeradas);
      return renumeradas;
    });
    setErrorValidacion('');
    setSeriesInvalidas([]);
  };

  const actualizarCampoSerie = (indice, campo, valor) => {
    setSeries((prev) => {
      const actualizadas = prev.map((item, idx) => {
        if (idx !== indice) return item;
        return {
          ...item,
          [campo]: valor.replace(/[^0-9.]/g, ''),
        };
      });
      programarAutoSaveDebounce(actualizadas);
      return actualizadas;
    });
    setErrorValidacion('');
    setSeriesInvalidas((prev) => prev.filter((idx) => idx !== indice));
  };

  const confirmarDescarte = () => {
    Alert.alert(
      'Descartar sesión activa',
      '¿Deseas descartar este ejercicio? Los datos de la sesión actual no se guardarán en tu historial.',
      [
        { text: 'Continuar sesión', style: 'cancel' },
        {
          text: 'Descartar',
          style: 'destructive',
          onPress: async () => {
            try {
              await eliminarSesionActivaDraft();
              if (typeof onDescartarEjercicio === 'function') {
                onDescartarEjercicio();
              }
            } catch (err) {
              console.error('Error al descartar sesión activa:', err);
            }
          },
        },
      ]
    );
  };

  useEffect(() => {
    if (!visible) return;

    const onBackPress = () => {
      confirmarDescarte();
      return true;
    };

    const suscripcion = BackHandler.addEventListener(
      'hardwareBackPress',
      onBackPress
    );

    return () => {
      suscripcion.remove();
    };
  }, [visible]);

  const terminarSesion = () => {
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    if (!series || series.length === 0) {
      vibrarConfirmacionBorrado();
      setErrorValidacion('Debes registrar al menos 1 serie para guardar.');
      return;
    }

    const invalidos = [];
    series.forEach((s, idx) => {
      const pesoNum = Number(s.peso);
      const repsNum = Number(s.repeticiones);
      const invalido =
        isNaN(pesoNum) ||
        pesoNum < 0 ||
        isNaN(repsNum) ||
        repsNum <= 0 ||
        s.peso === '' ||
        s.repeticiones === '';
      if (invalido) {
        invalidos.push(idx);
      }
    });

    if (invalidos.length > 0) {
      setSeriesInvalidas(invalidos);
      vibrarConfirmacionBorrado();
      setErrorValidacion(
        'Todas las series deben tener peso (>= 0 kg) y repeticiones (> 0).'
      );
      return;
    }

    const seriesLimpias = series.map((s) => ({
      serie: s.serie,
      peso: Math.round(Number(s.peso) * 10) / 10,
      repeticiones: Math.round(Number(s.repeticiones)),
    }));

    vibrarEjercicioCompletado();
    if (typeof onTerminarEjercicio === 'function') {
      onTerminarEjercicio({
        ejercicio: ejercicioActivo.nombre,
        grupoMuscular: ejercicioActivo.grupoMuscular,
        implemento: ejercicioActivo.implemento,
        seriesDetalle: seriesLimpias,
      });
    }
  };

  if (!visible || !ejercicioActivo) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      statusBarTranslucent
      onRequestClose={confirmarDescarte}
    >
      <View style={[styles.contenedorModal, { paddingTop: insets.headerPaddingTop }]}>
        {/* Cabecera Ergonómica Despejada */}
        <View style={styles.cabeceraLive}>
          <TouchableOpacity
            style={styles.botonDescartar}
            onPress={confirmarDescarte}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityLabel="Descartar sesión activa"
          >
            <Feather name="x" size={22} color={TOKENS.colors.textSecondary} />
          </TouchableOpacity>

          <View style={styles.badgeLiveMode}>
            <View style={styles.puntoLiveAnimado} />
            <Text style={styles.textoBadgeLiveMode}>LIVE MODE</Text>
          </View>

          {/* Elemento de balance visual para centrar perfectamente el badge */}
          <View style={styles.espacioBalanceCabecera} />
        </View>

        {/* Contenido scrolleable */}
        <ScrollView
          style={styles.scrollContenido}
          contentContainerStyle={[
            styles.scrollInterior,
            { paddingBottom: tecladoVisible ? 80 : 160 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Tarjeta del Ejercicio */}
          <View style={styles.tarjetaEjercicioActivo}>
            <View style={styles.filaBadgesEjercicio}>
              <View style={styles.badgeGrupo}>
                <Text style={styles.textoBadgeGrupo}>
                  {ejercicioActivo.grupoMuscular?.toUpperCase()}
                </Text>
              </View>
              <View style={styles.badgeImplemento}>
                <Text style={styles.textoBadgeImplemento}>
                  {ejercicioActivo.implemento}
                </Text>
              </View>
            </View>
            <Text style={styles.nombreEjercicio}>{ejercicioActivo.nombre}</Text>
          </View>

          {errorValidacion ? (
            <View style={styles.bannerError}>
              <Feather
                name="alert-circle"
                size={16}
                color={TOKENS.colors.danger}
                style={{ marginRight: 8 }}
              />
              <Text style={styles.textoError}>{errorValidacion}</Text>
            </View>
          ) : null}

          {/* Tabla de Series */}
          <View style={styles.tablaSeries}>
            <View style={styles.filaEncabezadoTabla}>
              <Text style={[styles.textoEncabezado, styles.colSerie]}>SERIE</Text>
              <Text style={[styles.textoEncabezado, styles.colInput]}>PESO (KG)</Text>
              <Text style={[styles.textoEncabezado, styles.colInput]}>REPS</Text>
              <View style={styles.colAccion} />
            </View>

            {series.map((item, idx) => {
              const esInvalida = seriesInvalidas.includes(idx);
              return (
                <View key={`serie-${idx}`} style={styles.filaSerie}>
                  <View style={styles.colSerie}>
                    <View
                      style={[
                        styles.circuloSerie,
                        esInvalida ? styles.circuloSerieInvalido : null,
                      ]}
                    >
                      <Text
                        style={[
                          styles.numeroSerie,
                          esInvalida ? styles.numeroSerieInvalido : null,
                        ]}
                      >
                        {item.serie}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.colInput}>
                    <TextInput
                      style={[
                        styles.inputSerie,
                        esInvalida && (!item.peso || Number(item.peso) < 0)
                          ? styles.inputSerieInvalido
                          : null,
                      ]}
                      keyboardType="numeric"
                      placeholder="0"
                      placeholderTextColor={TOKENS.colors.textMuted}
                      value={String(item.peso)}
                      onChangeText={(v) => actualizarCampoSerie(idx, 'peso', v)}
                      selectTextOnFocus
                    />
                  </View>

                  <View style={styles.colInput}>
                    <TextInput
                      style={[
                        styles.inputSerie,
                        esInvalida && (!item.repeticiones || Number(item.repeticiones) <= 0)
                          ? styles.inputSerieInvalido
                          : null,
                      ]}
                      keyboardType="number-pad"
                      placeholder="0"
                      placeholderTextColor={TOKENS.colors.textMuted}
                      value={String(item.repeticiones)}
                      onChangeText={(v) => actualizarCampoSerie(idx, 'repeticiones', v)}
                      selectTextOnFocus
                    />
                  </View>

                  <View style={styles.colAccion}>
                    {series.length > 1 ? (
                      <TouchableOpacity
                        style={styles.botonEliminarFila}
                        onPress={() => eliminarSerie(idx)}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        accessibilityLabel={`Eliminar serie ${item.serie}`}
                      >
                        <Feather name="trash-2" size={16} color={TOKENS.colors.textMuted} />
                      </TouchableOpacity>
                    ) : (
                      <View style={styles.botonEliminarFila} />
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        </ScrollView>

        {/* Barra Accesoria de Teclado (Cuando el teclado está activo) */}
        {tecladoVisible ? (
          <View style={styles.barraAccesoriaTeclado}>
            <TouchableOpacity
              style={styles.botonOcultarTeclado}
              onPress={() => Keyboard.dismiss()}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Feather
                name="corner-down-left"
                size={16}
                color={TOKENS.colors.textPrimary}
                style={{ marginRight: 6 }}
              />
              <Text style={styles.textoOcultarTeclado}>Listo / Ocultar teclado</Text>
            </TouchableOpacity>
          </View>
        ) : (
          /* Barra Inferior Fija en Thumb-Zone (Ergonomía de una mano) */
          <View
            style={[
              styles.stickyFooterThumbZone,
              { paddingBottom: insets.bottom + 12 },
            ]}
          >
            <TouchableOpacity
              style={styles.botonSecundarioAgregar}
              activeOpacity={0.8}
              onPress={agregarSerie}
            >
              <Feather
                name="plus"
                size={18}
                color={TOKENS.colors.textPrimary}
                style={{ marginRight: 6 }}
              />
              <Text style={styles.textoBotonSecundario}>Agregar Serie</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.botonPrimarioTerminar}
              activeOpacity={0.85}
              onPress={terminarSesion}
            >
              <Feather
                name="check"
                size={18}
                color="#0A0A0A"
                style={{ marginRight: 8 }}
              />
              <Text style={styles.textoBotonPrimario}>
                Terminar y Guardar Ejercicio
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  contenedorModal: {
    flex: 1,
    backgroundColor: TOKENS.colors.canvas,
  },
  cabeceraLive: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: TOKENS.colors.borderDefault,
    backgroundColor: TOKENS.colors.surface,
  },
  botonDescartar: {
    minWidth: 40,
    minHeight: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeLiveMode: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: TOKENS.colors.surfaceElevated,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: TOKENS.radii.pill,
    borderWidth: 1,
    borderColor: TOKENS.colors.borderStrong,
  },
  puntoLiveAnimado: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: TOKENS.colors.accentWhite,
    marginRight: 8,
  },
  textoBadgeLiveMode: {
    color: TOKENS.colors.textPrimary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  espacioBalanceCabecera: {
    width: 40,
    height: 40,
  },
  scrollContenido: {
    flex: 1,
  },
  scrollInterior: {
    padding: 16,
  },
  tarjetaEjercicioActivo: {
    backgroundColor: TOKENS.colors.surface,
    borderRadius: TOKENS.radii.md,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: TOKENS.colors.borderDefault,
  },
  filaBadgesEjercicio: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  badgeGrupo: {
    backgroundColor: TOKENS.colors.surfaceElevated,
    borderRadius: TOKENS.radii.xs,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginRight: 8,
    borderWidth: 1,
    borderColor: TOKENS.colors.borderStrong,
  },
  textoBadgeGrupo: {
    color: TOKENS.colors.textSecondary,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  badgeImplemento: {
    backgroundColor: TOKENS.colors.surfaceElevated,
    borderRadius: TOKENS.radii.xs,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: TOKENS.colors.borderSubtle,
  },
  textoBadgeImplemento: {
    color: TOKENS.colors.textSecondary,
    fontSize: 10,
    fontWeight: '600',
  },
  nombreEjercicio: {
    color: TOKENS.colors.textPrimary,
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  bannerError: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: TOKENS.colors.dangerBg,
    borderRadius: TOKENS.radii.sm,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 69, 58, 0.4)',
  },
  textoError: {
    color: TOKENS.colors.danger,
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  tablaSeries: {
    backgroundColor: TOKENS.colors.surface,
    borderRadius: TOKENS.radii.md,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: TOKENS.colors.borderDefault,
  },
  filaEncabezadoTabla: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: TOKENS.colors.borderSubtle,
    marginBottom: 8,
  },
  textoEncabezado: {
    color: TOKENS.colors.textMuted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
    textAlign: 'center',
  },
  filaSerie: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  colSerie: {
    width: 44,
    alignItems: 'center',
  },
  circuloSerie: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: TOKENS.colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: TOKENS.colors.borderStrong,
  },
  circuloSerieInvalido: {
    borderColor: TOKENS.colors.danger,
    backgroundColor: 'rgba(255, 69, 58, 0.15)',
  },
  numeroSerie: {
    color: TOKENS.colors.textPrimary,
    fontSize: 12,
    fontWeight: '800',
  },
  numeroSerieInvalido: {
    color: TOKENS.colors.danger,
  },
  colInput: {
    flex: 1,
    paddingHorizontal: 6,
  },
  inputSerie: {
    backgroundColor: TOKENS.colors.surfaceElevated,
    borderRadius: TOKENS.radii.sm,
    borderWidth: 1,
    borderColor: TOKENS.colors.borderDefault,
    color: TOKENS.colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
    paddingVertical: 10,
    minHeight: 44,
  },
  inputSerieInvalido: {
    borderColor: TOKENS.colors.danger,
    backgroundColor: 'rgba(255, 69, 58, 0.08)',
  },
  colAccion: {
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botonEliminarFila: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  barraAccesoriaTeclado: {
    backgroundColor: TOKENS.colors.surfaceElevated,
    borderTopWidth: 1,
    borderTopColor: TOKENS.colors.borderDefault,
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignItems: 'flex-end',
  },
  botonOcultarTeclado: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: TOKENS.colors.surfaceInteractive,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: TOKENS.radii.pill,
    borderWidth: 1,
    borderColor: TOKENS.colors.borderStrong,
  },
  textoOcultarTeclado: {
    color: TOKENS.colors.textPrimary,
    fontSize: 12,
    fontWeight: '700',
  },
  stickyFooterThumbZone: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: TOKENS.colors.surface,
    borderTopWidth: 1,
    borderTopColor: TOKENS.colors.borderDefault,
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  botonSecundarioAgregar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    backgroundColor: TOKENS.colors.surfaceElevated,
    borderRadius: TOKENS.radii.md,
    borderWidth: 1,
    borderColor: TOKENS.colors.borderStrong,
  },
  textoBotonSecundario: {
    color: TOKENS.colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  botonPrimarioTerminar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 54,
    backgroundColor: '#FFFFFF', // Blanco total de máximo contraste
    borderRadius: TOKENS.radii.md,
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  textoBotonPrimario: {
    color: '#0A0A0A',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
});
