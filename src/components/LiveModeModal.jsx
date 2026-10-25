import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  BackHandler,
  Modal,
  Platform,
  SafeAreaView,
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
  vibrarEjercicioCompletado,
  vibrarSerieAgregada,
  vibrarSeleccionBascula,
} from '../services/haptics';
import { TOKENS } from '../theme/tokens';

export default function LiveModeModal({
  visible,
  ejercicioActivo,
  draftInicial = null,
  onTerminarEjercicio,
  onDescartarEjercicio,
}) {
  const [series, setSeries] = useState([]);
  const [errorValidacion, setErrorValidacion] = useState('');
  const autoSaveTimerRef = useRef(null);

  useEffect(() => {
    if (!visible || !ejercicioActivo) {
      return;
    }

    if (
      draftInicial &&
      Array.isArray(draftInicial.seriesDetalle) &&
      draftInicial.seriesDetalle.length > 0
    ) {
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
      setErrorValidacion('Debes registrar al menos 1 serie para guardar.');
      return;
    }

    const seriesIncompletas = series.some((s) => {
      const pesoNum = Number(s.peso);
      const repsNum = Number(s.repeticiones);
      return (
        isNaN(pesoNum) ||
        pesoNum < 0 ||
        isNaN(repsNum) ||
        repsNum <= 0 ||
        s.peso === '' ||
        s.repeticiones === ''
      );
    });

    if (seriesIncompletas) {
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
      onRequestClose={confirmarDescarte}
    >
      <SafeAreaView style={styles.contenedorSafeArea}>
        <View style={styles.cabeceraLive}>
          <TouchableOpacity
            style={styles.botonDescartar}
            onPress={confirmarDescarte}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Feather name="x" size={20} color={TOKENS.colors.textSecondary} />
          </TouchableOpacity>

          <View style={styles.badgeLiveMode}>
            <View style={styles.puntoLiveAnimado} />
            <Text style={styles.textoBadgeLiveMode}>LIVE MODE</Text>
          </View>

          <TouchableOpacity
            style={styles.botonTerminar}
            onPress={terminarSesion}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Feather name="check" size={20} color={TOKENS.colors.textInverse} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollContenido}
          contentContainerStyle={styles.scrollInterior}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
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
                size={14}
                color={TOKENS.colors.danger}
                style={{ marginRight: 6 }}
              />
              <Text style={styles.textoError}>{errorValidacion}</Text>
            </View>
          ) : null}

          <View style={styles.tablaSeries}>
            <View style={styles.filaEncabezadoTabla}>
              <Text style={[styles.textoEncabezado, styles.colSerie]}>SERIE</Text>
              <Text style={[styles.textoEncabezado, styles.colInput]}>PESO (KG)</Text>
              <Text style={[styles.textoEncabezado, styles.colInput]}>REPS</Text>
              <View style={styles.colAccion} />
            </View>

            {series.map((item, idx) => (
              <View key={`serie-${idx}`} style={styles.filaSerie}>
                <View style={styles.colSerie}>
                  <View style={styles.circuloSerie}>
                    <Text style={styles.numeroSerie}>{item.serie}</Text>
                  </View>
                </View>

                <View style={styles.colInput}>
                  <TextInput
                    style={styles.inputSerie}
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
                    style={styles.inputSerie}
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
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Feather name="trash-2" size={14} color={TOKENS.colors.textMuted} />
                    </TouchableOpacity>
                  ) : (
                    <View style={styles.botonEliminarFila} />
                  )}
                </View>
              </View>
            ))}
          </View>

          <TouchableOpacity
            style={styles.botonAgregarSerie}
            activeOpacity={0.8}
            onPress={agregarSerie}
          >
            <Feather
              name="plus"
              size={16}
              color={TOKENS.colors.textPrimary}
              style={{ marginRight: 6 }}
            />
            <Text style={styles.textoAgregarSerie}>Agregar Serie</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  contenedorSafeArea: {
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
    padding: 8,
  },
  badgeLiveMode: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: TOKENS.colors.surfaceElevated,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: TOKENS.radii.pill,
    borderWidth: 1,
    borderColor: TOKENS.colors.borderStrong,
  },
  puntoLiveAnimado: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: TOKENS.colors.accentWhite,
    marginRight: 6,
  },
  textoBadgeLiveMode: {
    color: TOKENS.colors.textPrimary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  botonTerminar: {
    backgroundColor: TOKENS.colors.accentWhite,
    borderRadius: TOKENS.radii.pill,
    padding: 8,
  },
  scrollContenido: {
    flex: 1,
  },
  scrollInterior: {
    padding: 16,
    paddingBottom: 60,
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
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: TOKENS.colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: TOKENS.colors.borderStrong,
  },
  numeroSerie: {
    color: TOKENS.colors.textPrimary,
    fontSize: 11,
    fontWeight: '800',
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
    paddingVertical: 8,
  },
  colAccion: {
    width: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botonEliminarFila: {
    padding: 6,
  },
  botonAgregarSerie: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: TOKENS.colors.surfaceElevated,
    borderRadius: TOKENS.radii.md,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: TOKENS.colors.borderDefault,
  },
  textoAgregarSerie: {
    color: TOKENS.colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
});
