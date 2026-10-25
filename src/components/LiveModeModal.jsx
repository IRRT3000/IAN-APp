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
import {
  obtenerColorGrupo,
  obtenerIconoImplemento,
} from '../constants/catalogoEjercicios';
import {
  eliminarSesionActivaDraft,
  guardarSesionActivaDraft,
} from '../services/storage';
import {
  vibrarEjercicioCompletado,
  vibrarSerieAgregada,
} from '../services/haptics';

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

  // Inicializar o restaurar series al abrir el modal
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

  // Cancelar timers al desmontar
  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, []);

  // Guardado seguro inmediato en storage
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

  // Guardado diferido (Debounce ~350ms) para inputs de texto (Directriz 3)
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

  // Manejo de confirmación de descarte (Directriz 1)
  const confirmarDescarte = useCallback(() => {
    Alert.alert(
      '¿Descartar ejercicio?',
      'Se perderán las series registradas en esta sesión y no se guardará en tu historial.',
      [
        {
          text: 'Continuar entrenando',
          style: 'cancel',
        },
        {
          text: 'Descartar',
          style: 'destructive',
          onPress: async () => {
            if (autoSaveTimerRef.current) {
              clearTimeout(autoSaveTimerRef.current);
            }
            await eliminarSesionActivaDraft();
            if (typeof onDescartarEjercicio === 'function') {
              onDescartarEjercicio();
            }
          },
        },
      ]
    );
  }, [onDescartarEjercicio]);

  // Intercepción de botón físico Atrás en Android (Directriz 1)
  useEffect(() => {
    if (!visible || Platform.OS === 'web') {
      return;
    }

    const backAction = () => {
      confirmarDescarte();
      return true; // Previene que Android cierre la pantalla
    };

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      backAction
    );

    return () => {
      backHandler.remove();
    };
  }, [visible, confirmarDescarte]);

  // Añadir nueva serie con autorrelleno rápido de la serie previa (RF-10)
  const agregarSerie = () => {
    vibrarSerieAgregada();
    const ultimaSerie = series[series.length - 1];
    const nuevaSerie = {
      serie: series.length + 1,
      peso: ultimaSerie?.peso ?? '',
      repeticiones: ultimaSerie?.repeticiones ?? '',
    };

    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    }
    const nuevasSeries = [...series, nuevaSerie];
    setSeries(nuevasSeries);
    setErrorValidacion('');
    persistirDraftInmediato(nuevasSeries);
  };

  // Eliminar una serie si hay más de 1
  const eliminarSerie = (indice) => {
    if (series.length <= 1) {
      return;
    }

    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    }
    const filtradas = series
      .filter((_, idx) => idx !== indice)
      .map((item, idx) => ({
        ...item,
        serie: idx + 1,
      }));

    setSeries(filtradas);
    setErrorValidacion('');
    persistirDraftInmediato(filtradas);
  };

  // Modificar peso o repeticiones de una serie
  const actualizarCampoSerie = (indice, campo, valor) => {
    // Sanitizar caracteres inválidos (permitir solo números y punto decimal en peso)
    let valorLimpio = valor;
    if (campo === 'peso') {
      valorLimpio = valor.replace(/[^0-9.]/g, '');
      // Evitar más de un punto decimal
      const partes = valorLimpio.split('.');
      if (partes.length > 2) {
        valorLimpio = `${partes[0]}.${partes.slice(1).join('')}`;
      }
    } else if (campo === 'repeticiones') {
      valorLimpio = valor.replace(/[^0-9]/g, '');
    }

    const nuevasSeries = series.map((s, idx) => {
      if (idx !== indice) return s;
      return {
        ...s,
        [campo]: valorLimpio,
      };
    });

    setSeries(nuevasSeries);
    if (errorValidacion) setErrorValidacion('');
    programarAutoSaveDebounce(nuevasSeries);
  };

  // Guardado en pérdida de foco (onBlur)
  const manejarBlurInput = () => {
    persistirDraftInmediato(series);
  };

  // Validación estricta y terminación del ejercicio (RF-14, Directriz 4)
  const manejarTerminarEjercicio = async () => {
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    if (!Array.isArray(series) || series.length === 0) {
      setErrorValidacion('Debes registrar al menos una serie.');
      return;
    }

    const seriesSanitizadas = [];

    for (let i = 0; i < series.length; i++) {
      const s = series[i];
      const pesoStr = String(s.peso ?? '').trim();
      const repsStr = String(s.repeticiones ?? '').trim();

      const pesoNum = Math.max(0, parseFloat(pesoStr) || 0);
      const repsNum = Math.max(0, parseInt(repsStr, 10) || 0);

      if (pesoStr === '' && pesoNum === 0) {
        // Permitir 0 kg si es ejercicio corporal
      }

      if (!Number.isFinite(repsNum) || repsNum <= 0) {
        setErrorValidacion(
          `La Serie ${i + 1} debe tener al menos 1 repetición válida.`
        );
        return;
      }

      seriesSanitizadas.push({
        serie: i + 1,
        peso: pesoNum,
        repeticiones: repsNum,
      });
    }

    setErrorValidacion('');
    await vibrarEjercicioCompletado();

    if (typeof onTerminarEjercicio === 'function') {
      onTerminarEjercicio({
        ejercicio: ejercicioActivo.nombre,
        grupoMuscular: ejercicioActivo.grupoMuscular,
        implemento: ejercicioActivo.implemento,
        seriesDetalle: seriesSanitizadas,
      });
    }
  };

  if (!ejercicioActivo) {
    return null;
  }

  const colorGrupo = obtenerColorGrupo(ejercicioActivo.grupoMuscular);
  const iconoImplemento = obtenerIconoImplemento(ejercicioActivo.implemento);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={confirmarDescarte}
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.contenedor}>
          {/* Encabezado Live Mode */}
          <View style={styles.encabezado}>
            <View style={styles.bloqueTitulo}>
              <View style={styles.filaInsigniaLive}>
                <View style={styles.puntoLive} />
                <Text style={styles.textoLive}>LIVE MODE · EN CURSO</Text>
              </View>
              <Text style={styles.nombreEjercicio}>
                {ejercicioActivo.nombre}
              </Text>
              <View style={styles.filaBadges}>
                <View
                  style={[
                    styles.badgeGrupo,
                    {
                      borderColor: colorGrupo,
                      backgroundColor: `${colorGrupo}22`,
                    },
                  ]}
                >
                  <Text style={[styles.textoBadgeGrupo, { color: colorGrupo }]}>
                    {ejercicioActivo.grupoMuscular}
                  </Text>
                </View>
                <View style={styles.badgeImplemento}>
                  <Text style={styles.iconoImplemento}>{iconoImplemento}</Text>
                  <Text style={styles.textoBadgeImplemento}>
                    {ejercicioActivo.implemento || 'Implemento'}
                  </Text>
                </View>
              </View>
            </View>

            <TouchableOpacity
              style={styles.botonDescartar}
              activeOpacity={0.75}
              onPress={confirmarDescarte}
            >
              <Text style={styles.textoBotonDescartar}>✕ Salir</Text>
            </TouchableOpacity>
          </View>

          {/* Tabla de Series */}
          <ScrollView
            style={styles.areaScroll}
            contentContainerStyle={styles.contenidoScroll}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.cabeceraTabla}>
              <Text style={[styles.textoColumna, styles.colSerie]}>SERIE</Text>
              <Text style={[styles.textoColumna, styles.colInput]}>
                PESO (KG)
              </Text>
              <Text style={[styles.textoColumna, styles.colInput]}>REPS</Text>
              <View style={styles.colAccion} />
            </View>

            {series.map((item, index) => {
              return (
                <View key={String(index)} style={styles.filaSerie}>
                  <View style={styles.bloqueNumeroSerie}>
                    <Text style={styles.textoNumeroSerie}>{item.serie}</Text>
                  </View>

                  <View style={styles.colInput}>
                    <TextInput
                      style={styles.inputSerie}
                      placeholder="0"
                      placeholderTextColor="#666666"
                      keyboardType={
                        Platform.OS === 'ios' ? 'decimal-pad' : 'numeric'
                      }
                      value={String(item.peso ?? '')}
                      onChangeText={(val) =>
                        actualizarCampoSerie(index, 'peso', val)
                      }
                      onBlur={manejarBlurInput}
                      selectTextOnFocus
                    />
                  </View>

                  <View style={styles.colInput}>
                    <TextInput
                      style={styles.inputSerie}
                      placeholder="10"
                      placeholderTextColor="#666666"
                      keyboardType="number-pad"
                      value={String(item.repeticiones ?? '')}
                      onChangeText={(val) =>
                        actualizarCampoSerie(index, 'repeticiones', val)
                      }
                      onBlur={manejarBlurInput}
                      selectTextOnFocus
                    />
                  </View>

                  <View style={styles.colAccion}>
                    {series.length > 1 ? (
                      <TouchableOpacity
                        style={styles.botonQuitarSerie}
                        activeOpacity={0.7}
                        onPress={() => eliminarSerie(index)}
                      >
                        <Text style={styles.textoQuitarSerie}>✕</Text>
                      </TouchableOpacity>
                    ) : (
                      <View style={styles.espaciadorQuitar} />
                    )}
                  </View>
                </View>
              );
            })}

            {/* Botón para añadir serie con autorrelleno */}
            <TouchableOpacity
              style={styles.botonAnadirSerie}
              activeOpacity={0.8}
              onPress={agregarSerie}
            >
              <Text style={styles.iconoAnadirSerie}>＋</Text>
              <Text style={styles.textoAnadirSerie}>
                Añadir Serie (Autorrellena última carga)
              </Text>
            </TouchableOpacity>

            {errorValidacion ? (
              <View style={styles.bannerError}>
                <Text style={styles.textoError}>⚠️ {errorValidacion}</Text>
              </View>
            ) : null}
          </ScrollView>

          {/* Barra inferior fija de acciones */}
          <View style={styles.barraAccionesInferior}>
            <TouchableOpacity
              style={styles.botonDescartarSecundario}
              activeOpacity={0.75}
              onPress={confirmarDescarte}
            >
              <Text style={styles.textoDescartarSecundario}>
                Descartar
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.botonTerminar}
              activeOpacity={0.85}
              onPress={manejarTerminarEjercicio}
            >
              <Text style={styles.textoBotonTerminar}>
                ✓ Terminar Ejercicio
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#121212',
  },
  contenedor: {
    flex: 1,
    backgroundColor: '#121212',
    paddingTop: Platform.OS === 'android' ? 36 : 10,
  },
  encabezado: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#262626',
  },
  bloqueTitulo: {
    flex: 1,
    marginRight: 10,
  },
  filaInsigniaLive: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  puntoLive: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#00E676',
    marginRight: 6,
  },
  textoLive: {
    color: '#00E676',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  nombreEjercicio: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 6,
  },
  filaBadges: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badgeGrupo: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginRight: 6,
  },
  textoBadgeGrupo: {
    fontSize: 11,
    fontWeight: '700',
  },
  badgeImplemento: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1E1E',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: '#333333',
  },
  iconoImplemento: {
    fontSize: 11,
    marginRight: 4,
  },
  textoBadgeImplemento: {
    color: '#B0B0B0',
    fontSize: 11,
    fontWeight: '600',
  },
  botonDescartar: {
    backgroundColor: '#2A181A',
    borderWidth: 1,
    borderColor: '#FF5252',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  textoBotonDescartar: {
    color: '#FF5252',
    fontSize: 12,
    fontWeight: '700',
  },
  areaScroll: {
    flex: 1,
    paddingHorizontal: 16,
  },
  contenidoScroll: {
    paddingTop: 16,
    paddingBottom: 24,
  },
  cabeceraTabla: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 8,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#262626',
  },
  textoColumna: {
    color: '#8D8D8D',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  colSerie: {
    width: 60,
  },
  colInput: {
    flex: 1,
    marginHorizontal: 6,
  },
  colAccion: {
    width: 36,
    alignItems: 'center',
  },
  filaSerie: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 6,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  bloqueNumeroSerie: {
    width: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textoNumeroSerie: {
    color: '#00E676',
    fontSize: 16,
    fontWeight: '800',
  },
  inputSerie: {
    backgroundColor: '#2A2A2A',
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#383838',
  },
  botonQuitarSerie: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#30181A',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FF5252',
  },
  textoQuitarSerie: {
    color: '#FF5252',
    fontSize: 13,
    fontWeight: '800',
  },
  espaciadorQuitar: {
    width: 28,
    height: 28,
  },
  botonAnadirSerie: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E2D24',
    borderWidth: 1.5,
    borderColor: '#00E676',
    borderRadius: 12,
    paddingVertical: 12,
    marginTop: 10,
    marginBottom: 14,
  },
  iconoAnadirSerie: {
    color: '#00E676',
    fontSize: 16,
    fontWeight: '900',
    marginRight: 8,
  },
  textoAnadirSerie: {
    color: '#00E676',
    fontSize: 14,
    fontWeight: '800',
  },
  bannerError: {
    backgroundColor: '#30181A',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#FF5252',
    marginTop: 6,
  },
  textoError: {
    color: '#FF8A80',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  barraAccionesInferior: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#181818',
    borderTopWidth: 1,
    borderTopColor: '#262626',
  },
  botonDescartarSecundario: {
    backgroundColor: '#262626',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textoDescartarSecundario: {
    color: '#B0B0B0',
    fontSize: 14,
    fontWeight: '700',
  },
  botonTerminar: {
    flex: 1,
    backgroundColor: '#00E676',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textoBotonTerminar: {
    color: '#121212',
    fontSize: 16,
    fontWeight: '800',
  },
});
