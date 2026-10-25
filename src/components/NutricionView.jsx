import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import * as ImagePicker from 'expo-image-picker';
import { Feather } from '@expo/vector-icons';
import { analizarComidaConGemini } from '../services/gemini';
import {
  cargarComidas,
  eliminarComida,
  guardarComida,
  obtenerFechaLocal,
} from '../services/storage';
import {
  vibrarConfirmacionBorrado,
  vibrarInicioPresionBorrado,
  vibrarSeleccionBascula,
} from '../services/haptics';
import { TOKENS } from '../theme/tokens';

const TIPOS_COMIDA = ['Desayuno', 'Comida', 'Cena', 'Snack'];
const DURACION_PULSACION_BORRADO_MS = 1000;

function CapsulaBorradoSeguroNutricion({ onBorrar, onAvisoCorto }) {
  const progreso = useSharedValue(0);
  const timerRef = useRef(null);
  const presionadoLargoRef = useRef(false);

  const handlePressIn = () => {
    presionadoLargoRef.current = false;
    vibrarInicioPresionBorrado();
    progreso.value = withTiming(1, { duration: DURACION_PULSACION_BORRADO_MS });
    timerRef.current = setTimeout(() => {
      presionadoLargoRef.current = true;
      vibrarConfirmacionBorrado();
      onBorrar();
      progreso.value = withTiming(0, { duration: 150 });
    }, DURACION_PULSACION_BORRADO_MS);
  };

  const handlePressOut = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    if (!presionadoLargoRef.current) {
      progreso.value = withTiming(0, { duration: 180 });
      if (typeof onAvisoCorto === 'function') {
        onAvisoCorto();
      }
    }
  };

  const estiloFill = useAnimatedStyle(() => ({
    width: `${progreso.value * 100}%`,
  }));

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={styles.capsulaBorradoContenedor}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      <Animated.View style={[styles.capsulaBorradoFill, estiloFill]} />
      <View style={styles.capsulaBorradoContenido}>
        <Feather name="trash-2" size={12} color={TOKENS.colors.danger} />
        <Text style={styles.capsulaBorradoTexto}>1s</Text>
      </View>
    </TouchableOpacity>
  );
}

export default function NutricionView({
  comidasExternas,
  onComidaRegistrada,
}) {
  const [tipoSeleccionado, setTipoSeleccionado] = useState('Desayuno');
  const [comidasInternas, setComidasInternas] = useState([]);
  const [analizando, setAnalizando] = useState(false);
  const [mensajeError, setMensajeError] = useState('');
  const [textoProgreso, setTextoProgreso] = useState('');
  const [avisoBorradoId, setAvisoBorradoId] = useState(null);
  const timerAvisoRef = useRef(null);

  const fechaHoy = obtenerFechaLocal();
  const listaComidas = Array.isArray(comidasExternas)
    ? comidasExternas
    : comidasInternas;

  const sincronizarComidas = useCallback(async () => {
    const guardadas = await cargarComidas();
    setComidasInternas(guardadas);
  }, []);

  useEffect(() => {
    if (!Array.isArray(comidasExternas)) {
      sincronizarComidas();
    }
  }, [comidasExternas, sincronizarComidas]);

  useEffect(() => {
    return () => {
      if (timerAvisoRef.current) {
        clearTimeout(timerAvisoRef.current);
      }
    };
  }, []);

  const comidasDeHoy = useMemo(
    () => listaComidas.filter((item) => item.fecha === fechaHoy),
    [listaComidas, fechaHoy]
  );

  const totalesHoy = useMemo(
    () =>
      comidasDeHoy.reduce(
        (acc, item) => ({
          calorias: acc.calorias + (Number(item.calorias) || 0),
          proteinas:
            Math.round((acc.proteinas + (Number(item.proteinas) || 0)) * 10) /
            10,
          carbohidratos:
            Math.round(
              (acc.carbohidratos + (Number(item.carbohidratos) || 0)) * 10
            ) / 10,
          grasas:
            Math.round((acc.grasas + (Number(item.grasas) || 0)) * 10) / 10,
        }),
        { calorias: 0, proteinas: 0, carbohidratos: 0, grasas: 0 }
      ),
    [comidasDeHoy]
  );

  const mostrarAvisoToqueCorto = (idComida) => {
    setAvisoBorradoId(idComida);
    if (timerAvisoRef.current) {
      clearTimeout(timerAvisoRef.current);
    }
    timerAvisoRef.current = setTimeout(() => {
      setAvisoBorradoId(null);
    }, 2500);
  };

  const ejecutarBorradoComida = async (idComida) => {
    try {
      const listaActualizada = await eliminarComida(idComida);
      setAvisoBorradoId(null);
      if (typeof onComidaRegistrada === 'function') {
        onComidaRegistrada(listaActualizada);
      } else {
        setComidasInternas(listaActualizada);
      }
    } catch (error) {
      Alert.alert(
        'Error al eliminar',
        error?.message || 'No se pudo eliminar la comida.',
        [{ text: 'Entendido', style: 'cancel' }]
      );
    }
  };

  const solicitarConfirmacionBorrado = (item) => {
    setAvisoBorradoId(null);
    Alert.alert(
      'Eliminar registro de comida',
      `¿Deseas eliminar "${item.descripcion || item.tipo}"?\n\nEsta acción borrará el registro de calorías y macros de tu historial.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => ejecutarBorradoComida(item.id),
        },
      ]
    );
  };

  const solicitarPermisoCamara = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    return status === 'granted';
  };

  const procesarFotoSeleccionada = async (uri, base64) => {
    try {
      setAnalizando(true);
      setMensajeError('');
      setTextoProgreso('Analizando nutrientes con Gemini Vision...');

      const resultado = await analizarComidaConGemini(base64);

      setTextoProgreso('Guardando comida...');
      const nuevaComida = {
        tipo: tipoSeleccionado,
        descripcion: resultado.descripcion,
        calorias: resultado.calorias,
        proteinas: resultado.macros.proteinas,
        carbohidratos: resultado.macros.carbohidratos,
        grasas: resultado.macros.grasas,
        detalles: resultado.detalles,
        fotoUri: uri,
      };

      const listaActualizada = await guardarComida(nuevaComida);

      if (typeof onComidaRegistrada === 'function') {
        onComidaRegistrada(listaActualizada);
      } else {
        setComidasInternas(listaActualizada);
      }
    } catch (error) {
      setMensajeError(
        error.message || 'No se pudo analizar la foto. Intenta de nuevo.'
      );
    } finally {
      setAnalizando(false);
      setTextoProgreso('');
    }
  };

  const tomarFoto = async () => {
    const tienePermiso = await solicitarPermisoCamara();
    if (!tienePermiso) {
      Alert.alert(
        'Permiso denegado',
        'Se necesita acceso a la cámara para capturar tus platos.'
      );
      return;
    }

    const resultado = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
      base64: true,
    });

    if (!resultado.canceled && resultado.assets?.[0]) {
      const asset = resultado.assets[0];
      await procesarFotoSeleccionada(asset.uri, asset.base64);
    }
  };

  const seleccionarDeGaleria = async () => {
    const resultado = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
      base64: true,
    });

    if (!resultado.canceled && resultado.assets?.[0]) {
      const asset = resultado.assets[0];
      await procesarFotoSeleccionada(asset.uri, asset.base64);
    }
  };

  return (
    <View style={styles.contenedor}>
      <View style={styles.encabezado}>
        <Text style={styles.titulo}>Nutrición Editorial</Text>
        <Text style={styles.subtitulo}>
          Ojo Nutricional Multimodal con Gemini · Fecha: {fechaHoy}
        </Text>
      </View>

      <View style={styles.tarjetaTotales}>
        <View style={styles.bloqueTotalPrincipal}>
          <Text style={styles.etiquetaTotalPrincipal}>CALORÍAS TOTALES</Text>
          <Text style={styles.valorTotalPrincipal}>{totalesHoy.calorias}</Text>
          <Text style={styles.unidadTotalPrincipal}>kcal consumidas hoy</Text>
        </View>

        <View style={styles.filaMacros}>
          <View style={styles.bloqueMacro}>
            <Text style={styles.etiquetaMacro}>PROTEÍNAS</Text>
            <Text style={styles.valorMacro}>{totalesHoy.proteinas}g</Text>
          </View>
          <View style={styles.divisorMacro} />
          <View style={styles.bloqueMacro}>
            <Text style={styles.etiquetaMacro}>CARBOHIDRATOS</Text>
            <Text style={styles.valorMacro}>{totalesHoy.carbohidratos}g</Text>
          </View>
          <View style={styles.divisorMacro} />
          <View style={styles.bloqueMacro}>
            <Text style={styles.etiquetaMacro}>GRASAS</Text>
            <Text style={styles.valorMacro}>{totalesHoy.grasas}g</Text>
          </View>
        </View>
      </View>

      <View style={styles.seccionTipoComida}>
        <Text style={styles.etiquetaSeccion}>TIPO DE COMIDA A ESCANEAR</Text>
        <View style={styles.filaTiposComida}>
          {TIPOS_COMIDA.map((tipo) => {
            const activo = tipoSeleccionado === tipo;
            return (
              <TouchableOpacity
                key={tipo}
                style={[
                  styles.botonTipoComida,
                  activo && styles.botonTipoComidaActivo,
                ]}
                onPress={() => {
                  vibrarSeleccionBascula();
                  setTipoSeleccionado(tipo);
                }}
              >
                <Text
                  style={[
                    styles.textoTipoComida,
                    activo && styles.textoTipoComidaActivo,
                  ]}
                >
                  {tipo}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View style={styles.seccionAcciones}>
        <TouchableOpacity
          style={[styles.botonCaptura, styles.botonCamara]}
          onPress={tomarFoto}
          disabled={analizando}
          activeOpacity={0.8}
        >
          <Feather
            name="camera"
            size={18}
            color={TOKENS.colors.textInverse}
            style={{ marginRight: 8 }}
          />
          <Text style={styles.textoBotonCamara}>Escanear con Cámara</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.botonCaptura, styles.botonGaleria]}
          onPress={seleccionarDeGaleria}
          disabled={analizando}
          activeOpacity={0.8}
        >
          <Feather
            name="image"
            size={18}
            color={TOKENS.colors.textPrimary}
            style={{ marginRight: 8 }}
          />
          <Text style={styles.textoBotonGaleria}>Galería</Text>
        </TouchableOpacity>
      </View>

      {analizando ? (
        <View style={styles.bloqueCarga}>
          <ActivityIndicator size="small" color={TOKENS.colors.accentWhite} />
          <Text style={styles.textoCarga}>{textoProgreso}</Text>
        </View>
      ) : null}

      {mensajeError ? (
        <View style={styles.bloqueError}>
          <Feather
            name="alert-circle"
            size={14}
            color={TOKENS.colors.danger}
            style={{ marginRight: 6 }}
          />
          <Text style={styles.textoError}>{mensajeError}</Text>
        </View>
      ) : null}

      <View style={styles.seccionHistorial}>
        <Text style={styles.etiquetaSeccion}>
          REGISTROS DE HOY ({comidasDeHoy.length})
        </Text>
      </View>

      <FlatList
        data={comidasDeHoy}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listaContenido}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <View style={styles.tarjetaComida}>
            <View style={styles.cabeceraComida}>
              <View style={styles.badgeTipoComida}>
                <Text style={styles.textoBadgeTipoComida}>
                  {item.tipo?.toUpperCase()}
                </Text>
              </View>
              <CapsulaBorradoSeguroNutricion
                onBorrar={() => solicitarConfirmacionBorrado(item)}
                onAvisoCorto={() => mostrarAvisoToqueCorto(item.id)}
              />
            </View>

            <Text style={styles.descripcionComida}>{item.descripcion}</Text>

            <View style={styles.filaMetricasComida}>
              <View style={styles.bloqueKcalComida}>
                <Text style={styles.valorKcalComida}>{item.calorias} kcal</Text>
              </View>
              <Text style={styles.textoMacrosDesglose}>
                P: {item.proteinas}g · C: {item.carbohidratos}g · G: {item.grasas}g
              </Text>
            </View>

            {avisoBorradoId === item.id ? (
              <View style={styles.bannerAvisoBorrado}>
                <Feather
                  name="alert-circle"
                  size={12}
                  color={TOKENS.colors.danger}
                  style={{ marginRight: 6 }}
                />
                <Text style={styles.textoAvisoBorrado}>
                  Mantén presionado 1 segundo para eliminar esta comida
                </Text>
              </View>
            ) : null}
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.estadoVacio}>
            <Feather
              name="pie-chart"
              size={32}
              color={TOKENS.colors.textMuted}
              style={{ marginBottom: 12 }}
            />
            <Text style={styles.textoVacio}>No hay comidas registradas hoy.</Text>
            <Text style={styles.subtextoVacio}>
              Toma una foto de tu plato para desglosar calorías y macros con IA.
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    flex: 1,
    backgroundColor: TOKENS.colors.canvas,
  },
  encabezado: {
    marginBottom: 14,
  },
  titulo: {
    color: TOKENS.colors.textPrimary,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  subtitulo: {
    color: TOKENS.colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  tarjetaTotales: {
    backgroundColor: TOKENS.colors.surface,
    borderRadius: TOKENS.radii.md,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: TOKENS.colors.borderDefault,
    elevation: 2,
  },
  bloqueTotalPrincipal: {
    alignItems: 'center',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: TOKENS.colors.borderSubtle,
  },
  etiquetaTotalPrincipal: {
    color: TOKENS.colors.textMuted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  valorTotalPrincipal: {
    color: TOKENS.colors.textPrimary,
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginVertical: 2,
  },
  unidadTotalPrincipal: {
    color: TOKENS.colors.textSecondary,
    fontSize: 11,
  },
  filaMacros: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
  },
  bloqueMacro: {
    flex: 1,
    alignItems: 'center',
  },
  divisorMacro: {
    width: 1,
    height: 24,
    backgroundColor: TOKENS.colors.borderSubtle,
  },
  etiquetaMacro: {
    color: TOKENS.colors.textMuted,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  valorMacro: {
    color: TOKENS.colors.textPrimary,
    fontSize: 14,
    fontWeight: '800',
    marginTop: 2,
  },
  seccionTipoComida: {
    marginBottom: 14,
  },
  etiquetaSeccion: {
    color: TOKENS.colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  filaTiposComida: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  botonTipoComida: {
    flex: 1,
    backgroundColor: TOKENS.colors.surfaceElevated,
    borderRadius: TOKENS.radii.sm,
    paddingVertical: 8,
    marginHorizontal: 2,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: TOKENS.colors.borderDefault,
  },
  botonTipoComidaActivo: {
    backgroundColor: TOKENS.colors.accentWhite,
    borderColor: TOKENS.colors.accentWhite,
  },
  textoTipoComida: {
    color: TOKENS.colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  textoTipoComidaActivo: {
    color: TOKENS.colors.textInverse,
    fontWeight: '800',
  },
  seccionAcciones: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  botonCaptura: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: TOKENS.radii.md,
    elevation: 2,
  },
  botonCamara: {
    backgroundColor: TOKENS.colors.accentWhite,
    marginRight: 8,
  },
  textoBotonCamara: {
    color: TOKENS.colors.textInverse,
    fontSize: 13,
    fontWeight: '800',
  },
  botonGaleria: {
    backgroundColor: TOKENS.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: TOKENS.colors.borderDefault,
  },
  textoBotonGaleria: {
    color: TOKENS.colors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
  bloqueCarga: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: TOKENS.colors.surface,
    borderRadius: TOKENS.radii.sm,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: TOKENS.colors.borderDefault,
  },
  textoCarga: {
    color: TOKENS.colors.textPrimary,
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 8,
  },
  bloqueError: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: TOKENS.colors.dangerBg,
    borderRadius: TOKENS.radii.sm,
    padding: 12,
    marginBottom: 14,
  },
  textoError: {
    color: TOKENS.colors.danger,
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  seccionHistorial: {
    marginBottom: 8,
  },
  listaContenido: {
    paddingBottom: 110, // Scroll clearance mandatorio para barra inferior flotante
  },
  tarjetaComida: {
    backgroundColor: TOKENS.colors.surface,
    borderRadius: TOKENS.radii.md,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: TOKENS.colors.borderDefault,
  },
  cabeceraComida: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  badgeTipoComida: {
    backgroundColor: TOKENS.colors.surfaceElevated,
    borderRadius: TOKENS.radii.xs,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: TOKENS.colors.borderStrong,
  },
  textoBadgeTipoComida: {
    color: TOKENS.colors.textSecondary,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  capsulaBorradoContenedor: {
    width: 58,
    height: 28,
    borderRadius: TOKENS.radii.pill,
    backgroundColor: TOKENS.colors.dangerBg,
    borderWidth: 1,
    borderColor: 'rgba(255, 69, 58, 0.4)',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  capsulaBorradoFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    backgroundColor: TOKENS.colors.danger,
    borderRadius: TOKENS.radii.pill,
  },
  capsulaBorradoContenido: {
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 2,
  },
  capsulaBorradoTexto: {
    color: TOKENS.colors.danger,
    fontSize: 11,
    fontWeight: '800',
    marginLeft: 4,
  },
  descripcionComida: {
    color: TOKENS.colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 8,
  },
  filaMetricasComida: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bloqueKcalComida: {
    backgroundColor: TOKENS.colors.surfaceElevated,
    borderRadius: TOKENS.radii.xs,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  valorKcalComida: {
    color: TOKENS.colors.textPrimary,
    fontSize: 12,
    fontWeight: '800',
  },
  textoMacrosDesglose: {
    color: TOKENS.colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  bannerAvisoBorrado: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: TOKENS.colors.dangerBg,
    borderRadius: TOKENS.radii.xs,
    padding: 6,
    marginTop: 8,
  },
  textoAvisoBorrado: {
    color: TOKENS.colors.danger,
    fontSize: 11,
    fontWeight: '600',
    flex: 1,
  },
  estadoVacio: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    backgroundColor: TOKENS.colors.surface,
    borderRadius: TOKENS.radii.md,
    borderWidth: 1,
    borderColor: TOKENS.colors.borderSubtle,
    marginTop: 8,
  },
  textoVacio: {
    color: TOKENS.colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  subtextoVacio: {
    color: TOKENS.colors.textSecondary,
    fontSize: 12,
    marginTop: 4,
  },
});
