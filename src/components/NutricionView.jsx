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
import * as ImagePicker from 'expo-image-picker';
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
} from '../services/haptics';

const TIPOS_COMIDA = ['Desayuno', 'Comida', 'Cena', 'Snack'];
const DURACION_PULSACION_BORRADO_MS = 1000;

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
      setComidasInternas(listaActualizada);
      setAvisoBorradoId(null);

      if (typeof onComidaRegistrada === 'function') {
        await onComidaRegistrada(listaActualizada);
      }
    } catch (error) {
      const mensaje =
        error?.message || 'No se pudo eliminar la comida seleccionada.';
      setMensajeError(mensaje);
      Alert.alert('Error al eliminar', mensaje, [
        { text: 'Entendido', style: 'cancel' },
      ]);
    }
  };

  const solicitarConfirmacionBorrado = (item) => {
    setAvisoBorradoId(null);
    vibrarConfirmacionBorrado();
    Alert.alert(
      '⚠️ Eliminar comida registrada',
      `¿Estás seguro de eliminar "${item.nombre}" (${item.calorias} kcal)?\n\nEsta acción borrará el registro definitivamente y actualizará tus macros del día.`,
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

  const procesarResultadoImagen = async (resultadoPicker) => {
    if (resultadoPicker.canceled || !resultadoPicker.assets?.length) {
      return;
    }

    const asset = resultadoPicker.assets[0];
    if (!asset?.base64) {
      setMensajeError('No se pudo obtener la imagen en formato Base64.');
      return;
    }

    setMensajeError('');
    setAnalizando(true);

    try {
      const analisis = await analizarComidaConGemini(
        asset.base64,
        tipoSeleccionado,
        {
          onProgreso: ({ modelo, indice, total, falloAnterior }) => {
            setTextoProgreso(
              falloAnterior
                ? `${falloAnterior.modelo} falló (${falloAnterior.status}). Probando ${modelo} (${indice}/${total})...`
                : `Consultando ${modelo} (${indice}/${total})...`
            );
          },
        }
      );

      const registroNuevo = {
        fecha: obtenerFechaLocal(),
        tipo: tipoSeleccionado,
        nombre: analisis.nombre,
        calorias: analisis.calorias,
        proteinas: analisis.proteinas,
        carbohidratos: analisis.carbohidratos,
        grasas: analisis.grasas,
        uriFoto: asset.uri || '',
      };

      const listaActualizada = await guardarComida(registroNuevo);
      setComidasInternas(listaActualizada);

      if (typeof onComidaRegistrada === 'function') {
        await onComidaRegistrada(listaActualizada);
      }
    } catch (error) {
      console.warn('Error al analizar o guardar la comida:', error?.message);
      const mensaje =
        error?.message ||
        'No se pudo analizar la foto con Gemini. Verifica tu clave de API.';
      setMensajeError(mensaje);
      Alert.alert('No se pudo analizar la comida', mensaje, [
        { text: 'Entendido', style: 'cancel' },
      ]);
    } finally {
      setAnalizando(false);
      setTextoProgreso('');
    }
  };

  const abrirCamara = async () => {
    try {
      setMensajeError('');
      const permiso = await ImagePicker.requestCameraPermissionsAsync();
      if (!permiso.granted) {
        setMensajeError('Se requiere permiso para acceder a la cámara.');
        return;
      }

      const resultado = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 1,
        base64: true,
      });

      await procesarResultadoImagen(resultado);
    } catch (error) {
      console.error('Error al abrir cámara:', error);
      setMensajeError('No fue posible abrir la cámara del dispositivo.');
    }
  };

  const abrirGaleria = async () => {
    try {
      setMensajeError('');
      const permiso = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permiso.granted) {
        setMensajeError('Se requiere permiso para acceder a la galería.');
        return;
      }

      const resultado = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 1,
        base64: true,
      });

      await procesarResultadoImagen(resultado);
    } catch (error) {
      console.error('Error al abrir galería:', error);
      setMensajeError('No fue posible abrir la galería de imágenes.');
    }
  };

  const renderizarComida = ({ item }) => {
    const mostrandoAviso = avisoBorradoId === item.id;

    return (
      <View style={styles.tarjetaComida}>
        <View style={styles.filaSuperiorComida}>
          {item.uriFoto ? (
            <Image source={{ uri: item.uriFoto }} style={styles.miniaturaFoto} />
          ) : (
            <View style={[styles.miniaturaFoto, styles.miniaturaPlaceholder]}>
              <Text style={styles.textoPlaceholder}>🍽</Text>
            </View>
          )}

          <View style={styles.infoComida}>
            <View style={styles.filaTipoCalorias}>
              <View style={styles.insigniaTipo}>
                <Text style={styles.textoInsigniaTipo}>{item.tipo}</Text>
              </View>
              <Text style={styles.caloriasItem}>{item.calorias} kcal</Text>
            </View>
            <Text style={styles.nombrePlatillo} numberOfLines={2}>
              {item.nombre}
            </Text>
          </View>
        </View>

        <View style={styles.filaMacrosItem}>
          <View style={styles.chipMacro}>
            <Text style={styles.etiquetaChipMacro}>PROT</Text>
            <Text style={styles.valorChipMacro}>{item.proteinas}g</Text>
          </View>
          <View style={styles.chipMacro}>
            <Text style={styles.etiquetaChipMacro}>CARBS</Text>
            <Text style={styles.valorChipMacro}>{item.carbohidratos}g</Text>
          </View>
          <View style={styles.chipMacro}>
            <Text style={styles.etiquetaChipMacro}>GRASAS</Text>
            <Text style={styles.valorChipMacro}>{item.grasas}g</Text>
          </View>

          <TouchableOpacity
            style={styles.botonEliminar}
            activeOpacity={0.7}
            delayLongPress={DURACION_PULSACION_BORRADO_MS}
            onPressIn={vibrarInicioPresionBorrado}
            onPress={() => mostrarAvisoToqueCorto(item.id)}
            onLongPress={() => solicitarConfirmacionBorrado(item)}
          >
            <Text style={styles.iconoEliminar}>🗑</Text>
            <Text style={styles.textoBotonEliminar}>1s</Text>
          </TouchableOpacity>
        </View>

        {mostrandoAviso ? (
          <View style={styles.bannerAvisoBorrado}>
            <Text style={styles.textoAvisoBorrado}>
              ⚠️ Mantén presionado 1 segundo para eliminar esta comida
            </Text>
          </View>
        ) : null}
      </View>
    );
  };

  return (
    <View style={styles.contenedor}>
      <View style={styles.encabezado}>
        <Text style={styles.tituloVista}>Ojo Nutricional IA</Text>
        <Text style={styles.subtituloFecha}>Hoy: {fechaHoy}</Text>
      </View>

      <View style={styles.tarjetaResumenTotales}>
        <View style={styles.bloqueCalorias}>
          <Text style={styles.etiquetaResumen}>CALORÍAS DIARIAS</Text>
          <Text style={styles.valorCaloriasGrandes}>
            {totalesHoy.calorias}{' '}
            <Text style={styles.unidadCalorias}>kcal</Text>
          </Text>
        </View>

        <View style={styles.filaMacrosTotales}>
          <View style={styles.cajaMacroTotal}>
            <Text style={styles.valorMacroTotal}>{totalesHoy.proteinas}g</Text>
            <Text style={styles.etiquetaMacroTotal}>Proteínas</Text>
          </View>
          <View style={styles.cajaMacroTotal}>
            <Text style={styles.valorMacroTotal}>
              {totalesHoy.carbohidratos}g
            </Text>
            <Text style={styles.etiquetaMacroTotal}>Carbohidratos</Text>
          </View>
          <View style={styles.cajaMacroTotal}>
            <Text style={styles.valorMacroTotal}>{totalesHoy.grasas}g</Text>
            <Text style={styles.etiquetaMacroTotal}>Grasas</Text>
          </View>
        </View>
      </View>

      <View style={styles.tarjetaCaptura}>
        <Text style={styles.tituloSeccion}>1. Selecciona el tiempo de comida</Text>
        <View style={styles.filaSelectorTipos}>
          {TIPOS_COMIDA.map((tipo) => {
            const activo = tipo === tipoSeleccionado;
            return (
              <TouchableOpacity
                key={tipo}
                style={[
                  styles.botonTipo,
                  activo ? styles.botonTipoActivo : styles.botonTipoInactivo,
                ]}
                activeOpacity={0.85}
                disabled={analizando}
                onPress={() => setTipoSeleccionado(tipo)}
              >
                <Text
                  style={[
                    styles.textoBotonTipo,
                    activo
                      ? styles.textoBotonTipoActivo
                      : styles.textoBotonTipoInactivo,
                  ]}
                >
                  {tipo}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.tituloSeccion}>
          2. Escanea tu plato con Gemini Vision
        </Text>

        {analizando ? (
          <View style={styles.contenedorCarga}>
            <ActivityIndicator size="large" color="#00E676" />
            <Text style={styles.textoCarga}>Analizando macros...</Text>
            <Text style={styles.subtextoCarga}>
              {textoProgreso ||
                'Inspeccionando ingredientes, porciones y densidad calórica'}
            </Text>
          </View>
        ) : (
          <View style={styles.filaBotonesCaptura}>
            <TouchableOpacity
              style={[styles.botonAccionFoto, styles.botonCamara]}
              activeOpacity={0.85}
              onPress={abrirCamara}
            >
              <Text style={styles.textoBotonCamara}>📷 Tomar Foto</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.botonAccionFoto, styles.botonGaleria]}
              activeOpacity={0.85}
              onPress={abrirGaleria}
            >
              <Text style={styles.textoBotonGaleria}>🖼 Galería</Text>
            </TouchableOpacity>
          </View>
        )}

        {mensajeError ? (
          <Text style={styles.textoError}>{mensajeError}</Text>
        ) : null}
      </View>

      <View style={styles.contenedorLista}>
        <View style={styles.encabezadoLista}>
          <Text style={styles.tituloSeccion}>Comidas Registradas Hoy</Text>
          <Text style={styles.contadorLista}>
            {comidasDeHoy.length} registro(s)
          </Text>
        </View>

        <FlatList
          data={comidasDeHoy}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderizarComida}
          contentContainerStyle={styles.contenidoFlatList}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.estadoVacio}>
              <Text style={styles.textoVacio}>
                Aún no has analizado comidas hoy ({fechaHoy}). Selecciona el
                tipo de comida y captura una foto.
              </Text>
            </View>
          }
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    flex: 1,
  },
  encabezado: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 12,
  },
  tituloVista: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
  },
  subtituloFecha: {
    color: '#00E676',
    fontSize: 13,
    fontWeight: '600',
  },
  tarjetaResumenTotales: {
    backgroundColor: '#1E1E1E',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2E2E2E',
  },
  bloqueCalorias: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 12,
  },
  etiquetaResumen: {
    color: '#9E9E9E',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.7,
  },
  valorCaloriasGrandes: {
    color: '#00E676',
    fontSize: 26,
    fontWeight: '800',
  },
  unidadCalorias: {
    color: '#B0B0B0',
    fontSize: 13,
    fontWeight: '600',
  },
  filaMacrosTotales: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cajaMacroTotal: {
    flex: 1,
    backgroundColor: '#262626',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 6,
    marginHorizontal: 3,
    alignItems: 'center',
  },
  valorMacroTotal: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 2,
  },
  etiquetaMacroTotal: {
    color: '#9E9E9E',
    fontSize: 11,
    fontWeight: '600',
  },
  tarjetaCaptura: {
    backgroundColor: '#1E1E1E',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2E2E2E',
  },
  tituloSeccion: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
  },
  filaSelectorTipos: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  botonTipo: {
    flex: 1,
    paddingVertical: 8,
    marginHorizontal: 3,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  botonTipoActivo: {
    backgroundColor: '#00E676',
    borderColor: '#00E676',
  },
  botonTipoInactivo: {
    backgroundColor: '#2A2A2A',
    borderColor: '#383838',
  },
  textoBotonTipo: {
    fontSize: 12,
    fontWeight: '700',
  },
  textoBotonTipoActivo: {
    color: '#121212',
  },
  textoBotonTipoInactivo: {
    color: '#D0D0D0',
  },
  filaBotonesCaptura: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  botonAccionFoto: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 3,
  },
  botonCamara: {
    backgroundColor: '#00E676',
  },
  botonGaleria: {
    backgroundColor: '#2A2A2A',
    borderWidth: 1,
    borderColor: '#00E676',
  },
  textoBotonCamara: {
    color: '#121212',
    fontSize: 14,
    fontWeight: '800',
  },
  textoBotonGaleria: {
    color: '#00E676',
    fontSize: 14,
    fontWeight: '700',
  },
  contenedorCarga: {
    backgroundColor: '#242424',
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textoCarga: {
    color: '#00E676',
    fontSize: 14,
    fontWeight: '800',
    marginTop: 8,
  },
  subtextoCarga: {
    color: '#9E9E9E',
    fontSize: 11,
    marginTop: 4,
    textAlign: 'center',
  },
  textoError: {
    color: '#FF5252',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 8,
  },
  contenedorLista: {
    flex: 1,
  },
  encabezadoLista: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  contadorLista: {
    color: '#9E9E9E',
    fontSize: 12,
    fontWeight: '600',
  },
  contenidoFlatList: {
    paddingBottom: 12,
  },
  tarjetaComida: {
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#00E676',
  },
  filaSuperiorComida: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  miniaturaFoto: {
    width: 54,
    height: 54,
    borderRadius: 10,
    marginRight: 12,
    backgroundColor: '#2A2A2A',
  },
  miniaturaPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  textoPlaceholder: {
    fontSize: 22,
  },
  infoComida: {
    flex: 1,
  },
  filaTipoCalorias: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  insigniaTipo: {
    backgroundColor: '#2A2A2A',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  textoInsigniaTipo: {
    color: '#00E676',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  caloriasItem: {
    color: '#00E676',
    fontSize: 14,
    fontWeight: '800',
  },
  nombrePlatillo: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  filaMacrosItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chipMacro: {
    flex: 1,
    backgroundColor: '#262626',
    borderRadius: 8,
    paddingVertical: 5,
    marginHorizontal: 3,
    alignItems: 'center',
  },
  etiquetaChipMacro: {
    color: '#8D8D8D',
    fontSize: 9,
    fontWeight: '700',
  },
  valorChipMacro: {
    color: '#E0E0E0',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 1,
  },
  botonEliminar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2C1518',
    borderWidth: 1.5,
    borderColor: '#FF5252',
    borderRadius: 8,
    paddingVertical: 7,
    paddingHorizontal: 10,
    marginLeft: 6,
  },
  iconoEliminar: {
    fontSize: 13,
    marginRight: 4,
  },
  textoBotonEliminar: {
    color: '#FF5252',
    fontSize: 11,
    fontWeight: '800',
  },
  bannerAvisoBorrado: {
    marginTop: 8,
    backgroundColor: '#2C1518',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#FF5252',
  },
  textoAvisoBorrado: {
    color: '#FF8A80',
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
  estadoVacio: {
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginTop: 4,
  },
  textoVacio: {
    color: '#8D8D8D',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
});
