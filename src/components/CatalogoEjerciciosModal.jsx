import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
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
  CATALOGO_EJERCICIOS_BASE,
  GRUPOS_MUSCULARES,
  GRUPOS_MUSCULARES_REGISTRO,
  IMPLEMENTOS,
} from '../constants/catalogoEjercicios';
import { guardarEjercicioPersonalizado } from '../services/storage';
import MiniaturaEjercicio from './MiniaturaEjercicio';
import { vibrarSeleccionBascula } from '../services/haptics';
import { TOKENS } from '../theme/tokens';
import { useSafeInsets } from '../utils/useSafeInsets';

const obtenerIconoImplementoFeather = (implemento) => {
  switch (implemento) {
    case 'Barra':
      return 'activity';
    case 'Mancuerna':
      return 'disc';
    case 'Polea':
      return 'sliders';
    case 'Máquina':
      return 'settings';
    case 'Corporal':
      return 'user';
    default:
      return 'zap';
  }
};

export default function CatalogoEjerciciosModal({
  visible,
  onCerrar,
  onSeleccionarEjercicio,
  ejerciciosPersonalizados = [],
  onEjercicioPersonalizadoCreado,
  entrenamientos = [],
  enfocarBusqueda = false,
}) {
  const insets = useSafeInsets();
  const inputBusquedaRef = useRef(null);
  const [busqueda, setBusqueda] = useState('');
  const [grupoFiltro, setGrupoFiltro] = useState('Todos');

  useEffect(() => {
    if (visible && enfocarBusqueda) {
      const timer = setTimeout(() => {
        inputBusquedaRef.current?.focus();
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [visible, enfocarBusqueda]);

  const [subModalVisible, setSubModalVisible] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [nuevoGrupo, setNuevoGrupo] = useState('Pecho');
  const [nuevoImplemento, setNuevoImplemento] = useState('Barra');
  const [errorCreacion, setErrorCreacion] = useState('');

  const listaCompleta = useMemo(() => {
    return [...ejerciciosPersonalizados, ...CATALOGO_EJERCICIOS_BASE];
  }, [ejerciciosPersonalizados]);

  const listaFiltrada = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();

    return listaCompleta.filter((item) => {
      const coincideGrupo =
        grupoFiltro === 'Todos' || item.grupoMuscular === grupoFiltro;

      if (!coincideGrupo) return false;
      if (!texto) return true;

      const nombreCoincide = item.nombre.toLowerCase().includes(texto);
      const implementoCoincide = (item.implemento || '')
        .toLowerCase()
        .includes(texto);

      return nombreCoincide || implementoCoincide;
    });
  }, [listaCompleta, busqueda, grupoFiltro]);

  const ejerciciosRecientes = useMemo(() => {
    if (!Array.isArray(entrenamientos) || entrenamientos.length === 0) return [];
    const nombresVistos = new Set();
    const recientes = [];

    const ordenados = [...entrenamientos].sort(
      (a, b) => (b.creadoEn || 0) - (a.creadoEn || 0)
    );

    for (let i = 0; i < ordenados.length; i++) {
      const ent = ordenados[i];
      const nombreNorm = String(ent.ejercicio ?? '').trim().toLowerCase();
      if (!nombreNorm || nombresVistos.has(nombreNorm)) continue;
      nombresVistos.add(nombreNorm);

      const coincidencia = listaCompleta.find(
        (item) => String(item.nombre ?? '').trim().toLowerCase() === nombreNorm
      );

      if (coincidencia) {
        recientes.push(coincidencia);
      } else {
        recientes.push({
          id: ent.idEjercicio || `reciente-${recientes.length}`,
          nombre: String(ent.ejercicio ?? '').trim(),
          grupoMuscular: ent.grupoMuscular || 'Pecho',
          implemento: ent.implemento || 'Barra',
        });
      }

      if (recientes.length >= 8) break;
    }
    return recientes;
  }, [entrenamientos, listaCompleta]);

  const recientesFiltrados = useMemo(() => {
    if (busqueda.trim().length > 0) return [];
    if (grupoFiltro === 'Todos') return ejerciciosRecientes;
    return ejerciciosRecientes.filter(
      (item) => item.grupoMuscular === grupoFiltro
    );
  }, [ejerciciosRecientes, busqueda, grupoFiltro]);

  const renderListHeader = () => {
    if (recientesFiltrados.length === 0) {
      return null;
    }

    return (
      <View style={styles.seccionRecientesContenedor}>
        <View style={styles.filaTituloRecientes}>
          <Text style={styles.etiquetaRecientes}>RECIENTES</Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollRecientesContenido}
          keyboardShouldPersistTaps="handled"
        >
          {recientesFiltrados.map((ejercicio) => (
            <TouchableOpacity
              key={`reciente-${ejercicio.id || ejercicio.nombre}`}
              style={styles.miniTarjetaReciente}
              activeOpacity={0.7}
              onPress={() => {
                vibrarSeleccionBascula();
                onSeleccionarEjercicio(ejercicio);
              }}
              accessibilityRole="button"
              accessibilityLabel={`Ejercicio reciente: ${ejercicio.nombre}`}
            >
              <View style={styles.contenedorMiniaturaReciente}>
                <MiniaturaEjercicio
                  id={ejercicio.id}
                  nombre={ejercicio.nombre}
                  grupoMuscular={ejercicio.grupoMuscular}
                  implemento={ejercicio.implemento}
                  tamano={36}
                />
              </View>

              <View style={styles.infoMiniTarjeta}>
                <Text
                  style={styles.textoNombreReciente}
                  numberOfLines={2}
                  ellipsizeMode="tail"
                >
                  {ejercicio.nombre}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  const abrirModalCrear = (nombreSugerido = '') => {
    setNuevoNombre(nombreSugerido || busqueda.trim());
    setErrorCreacion('');
    setSubModalVisible(true);
  };

  const manejarCrearPersonalizado = async () => {
    const nombreLimpio = nuevoNombre.trim();
    if (nombreLimpio.length < 2) {
      setErrorCreacion(
        'El nombre del ejercicio debe tener al menos 2 caracteres.'
      );
      return;
    }

    try {
      setErrorCreacion('');
      const listaActualizada = await guardarEjercicioPersonalizado({
        nombre: nombreLimpio,
        grupoMuscular: nuevoGrupo,
        implemento: nuevoImplemento,
      });

      if (typeof onEjercicioPersonalizadoCreado === 'function') {
        onEjercicioPersonalizadoCreado(listaActualizada);
      }

      const creado = listaActualizada[0];
      setSubModalVisible(false);
      setNuevoNombre('');
      setErrorCreacion('');

      if (creado && typeof onSeleccionarEjercicio === 'function') {
        onSeleccionarEjercicio(creado);
      }
    } catch (err) {
      setErrorCreacion(
        err?.message || 'Error al guardar el ejercicio personalizado.'
      );
    }
  };

  const seleccionarFiltro = (grupo) => {
    vibrarSeleccionBascula();
    setGrupoFiltro(grupo);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      statusBarTranslucent
      onRequestClose={onCerrar}
    >
      <View style={[styles.contenedorModal, { paddingTop: insets.headerPaddingTop }]}>
        <View style={styles.cabecera}>
          <TouchableOpacity
            style={styles.botonCerrar}
            onPress={onCerrar}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityLabel="Cerrar catálogo"
          >
            <Feather name="x" size={20} color={TOKENS.colors.textPrimary} />
          </TouchableOpacity>

          <Text style={styles.tituloModal}>Catálogo de Ejercicios</Text>

          <TouchableOpacity
            style={styles.botonCrearPildora}
            onPress={() => abrirModalCrear()}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityLabel="Crear ejercicio personalizado"
          >
            <Feather name="plus" size={15} color="#0A0A0A" style={{ marginRight: 4 }} />
            <Text style={styles.textoBotonCrearPildora}>Crear</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.barraBusqueda}>
          <Feather
            name="search"
            size={16}
            color={TOKENS.colors.textSecondary}
            style={{ marginRight: 8 }}
          />
          <TextInput
            ref={inputBusquedaRef}
            style={styles.inputBusqueda}
            placeholder="Buscar por ejercicio o implemento..."
            placeholderTextColor={TOKENS.colors.textMuted}
            value={busqueda}
            onChangeText={setBusqueda}
            autoCorrect={false}
          />
          {busqueda.length > 0 ? (
            <TouchableOpacity
              onPress={() => setBusqueda('')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Feather name="x" size={16} color={TOKENS.colors.textMuted} />
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={styles.contenedorFiltros}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.scrollFiltros}
          >
            {GRUPOS_MUSCULARES.map((grupo) => {
              const activo = grupoFiltro === grupo;
              return (
                <TouchableOpacity
                  key={`filtro-${grupo}`}
                  style={[
                    styles.chipFiltro,
                    activo && styles.chipFiltroActivo,
                  ]}
                  onPress={() => seleccionarFiltro(grupo)}
                >
                  <Text
                    style={[
                      styles.textoChipFiltro,
                      activo && styles.textoChipFiltroActivo,
                    ]}
                  >
                    {grupo}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        <FlatList
          data={listaFiltrada}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={[
            styles.listaEjercicios,
            { paddingBottom: insets.bottom + 24 },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={renderListHeader}
          renderItem={({ item }) => {
            const iconoFeather = obtenerIconoImplementoFeather(item.implemento);
            return (
              <TouchableOpacity
                style={styles.tarjetaEjercicio}
                activeOpacity={0.7}
                onPress={() => {
                  vibrarSeleccionBascula();
                  onSeleccionarEjercicio(item);
                }}
              >
                <View style={styles.miniatura}>
                  <MiniaturaEjercicio
                    id={item.id}
                    nombre={item.nombre}
                    grupoMuscular={item.grupoMuscular}
                    implemento={item.implemento}
                    tamano={44}
                  />
                </View>
                <View style={styles.infoEjercicio}>
                  <Text style={styles.nombreEjercicio}>{item.nombre}</Text>
                  <View style={styles.filaSubinfo}>
                    <Text style={styles.grupoMuscular}>
                      {item.grupoMuscular}
                    </Text>
                    <View style={styles.puntoSeparador} />
                    <Feather
                      name={iconoFeather}
                      size={11}
                      color={TOKENS.colors.textSecondary}
                      style={{ marginRight: 4 }}
                    />
                    <Text style={styles.implemento}>{item.implemento}</Text>
                  </View>
                </View>
                <Feather
                  name="chevron-right"
                  size={18}
                  color={TOKENS.colors.textMuted}
                />
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View style={styles.estadoVacio}>
              <Feather
                name="activity"
                size={34}
                color={TOKENS.colors.textMuted}
                style={{ marginBottom: 12 }}
              />
              <Text style={styles.textoVacio}>No se encontraron ejercicios.</Text>
              {busqueda.trim().length > 0 ? (
                <TouchableOpacity
                  style={styles.botonCrearDesdeBusqueda}
                  activeOpacity={0.8}
                  onPress={() => abrirModalCrear(busqueda.trim())}
                >
                  <Feather
                    name="plus-circle"
                    size={16}
                    color="#FFFFFF"
                    style={{ marginRight: 8 }}
                  />
                  <Text style={styles.textoCrearDesdeBusqueda}>
                    Crear &quot;{busqueda.trim()}&quot; como nuevo ejercicio
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>
          }
        />

        <Modal
          visible={subModalVisible}
          animationType="fade"
          transparent={true}
          statusBarTranslucent
          onRequestClose={() => setSubModalVisible(false)}
        >
          <KeyboardAvoidingView
            style={styles.overlaySubModal}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <View style={styles.cajaSubModal}>
              <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                bounces={false}
              >
                <View style={styles.cabeceraSubModal}>
                  <Text style={styles.tituloSubModal}>Nuevo Ejercicio</Text>
                  <TouchableOpacity
                    style={styles.botonCerrarSubModal}
                    onPress={() => setSubModalVisible(false)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Feather name="x" size={18} color={TOKENS.colors.textSecondary} />
                  </TouchableOpacity>
                </View>

                {errorCreacion ? (
                  <Text style={styles.errorSubModal}>{errorCreacion}</Text>
                ) : null}

                <TextInput
                  style={styles.inputNombrePersonalizado}
                  placeholder="Nombre del ejercicio (ej. Hip Thrust)"
                  placeholderTextColor={TOKENS.colors.textMuted}
                  value={nuevoNombre}
                  onChangeText={setNuevoNombre}
                />

                <Text style={styles.etiquetaCampo}>GRUPO MUSCULAR</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
                  {GRUPOS_MUSCULARES_REGISTRO.map((g) => (
                    <TouchableOpacity
                      key={`nuevo-g-${g}`}
                      style={[styles.chipOpcion, nuevoGrupo === g && styles.chipOpcionActivo]}
                      onPress={() => setNuevoGrupo(g)}
                    >
                      <Text style={[styles.textoChipOpcion, nuevoGrupo === g && styles.textoChipOpcionActivo]}>
                        {g}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <Text style={styles.etiquetaCampo}>IMPLEMENTO</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 18 }}>
                  {IMPLEMENTOS.map((imp) => (
                    <TouchableOpacity
                      key={`nuevo-imp-${imp}`}
                      style={[styles.chipOpcion, nuevoImplemento === imp && styles.chipOpcionActivo]}
                      onPress={() => setNuevoImplemento(imp)}
                    >
                      <Text style={[styles.textoChipOpcion, nuevoImplemento === imp && styles.textoChipOpcionActivo]}>
                        {imp}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <TouchableOpacity
                  style={styles.botonConfirmarCreacion}
                  onPress={manejarCrearPersonalizado}
                >
                  <Text style={styles.textoBotonConfirmar}>Crear y Seleccionar</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  contenedorModal: {
    flex: 1,
    backgroundColor: TOKENS.colors.canvas,
  },
  cabecera: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: TOKENS.colors.borderDefault,
    backgroundColor: TOKENS.colors.surface,
  },
  botonCerrar: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tituloModal: {
    color: TOKENS.colors.textPrimary,
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  botonCrearPildora: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    height: 38,
    borderRadius: TOKENS.radii.pill,
  },
  textoBotonCrearPildora: {
    color: '#0A0A0A',
    fontSize: 12,
    fontWeight: '800',
  },
  barraBusqueda: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: TOKENS.colors.surfaceElevated,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    borderRadius: TOKENS.radii.sm,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: TOKENS.colors.borderDefault,
  },
  inputBusqueda: {
    flex: 1,
    color: TOKENS.colors.textPrimary,
    fontSize: 14,
    paddingVertical: 10,
  },
  contenedorFiltros: {
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: TOKENS.colors.borderSubtle,
  },
  scrollFiltros: {
    paddingHorizontal: 16,
  },
  chipFiltro: {
    backgroundColor: TOKENS.colors.surfaceElevated,
    borderRadius: TOKENS.radii.pill,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginRight: 8,
    borderWidth: 1,
    borderColor: TOKENS.colors.borderDefault,
    minHeight: 36,
    justifyContent: 'center',
  },
  chipFiltroActivo: {
    backgroundColor: TOKENS.colors.accentWhite,
    borderColor: TOKENS.colors.accentWhite,
  },
  textoChipFiltro: {
    color: TOKENS.colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  textoChipFiltroActivo: {
    color: TOKENS.colors.textInverse,
    fontWeight: '800',
  },
  listaEjercicios: {
    padding: 16,
  },
  tarjetaEjercicio: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: TOKENS.colors.surface,
    borderRadius: TOKENS.radii.sm,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: TOKENS.colors.borderDefault,
  },
  miniatura: {
    marginRight: TOKENS.spacing.sm + TOKENS.spacing.xs,
  },
  infoEjercicio: {
    flex: 1,
    marginRight: 12,
  },
  nombreEjercicio: {
    color: TOKENS.colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  filaSubinfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  grupoMuscular: {
    color: TOKENS.colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  puntoSeparador: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: TOKENS.colors.textMuted,
    marginHorizontal: 6,
  },
  implemento: {
    color: TOKENS.colors.textSecondary,
    fontSize: 11,
  },
  estadoVacio: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 20,
  },
  textoVacio: {
    color: TOKENS.colors.textSecondary,
    fontSize: 14,
    marginBottom: 16,
  },
  botonCrearDesdeBusqueda: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: TOKENS.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: TOKENS.colors.borderStrong,
    borderRadius: TOKENS.radii.md,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginTop: 6,
  },
  textoCrearDesdeBusqueda: {
    color: TOKENS.colors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
  overlaySubModal: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    padding: 20,
  },
  cajaSubModal: {
    backgroundColor: TOKENS.colors.surface,
    borderRadius: TOKENS.radii.md,
    padding: 18,
    maxHeight: '90%',
    borderWidth: 1,
    borderColor: TOKENS.colors.borderStrong,
  },
  cabeceraSubModal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  botonCerrarSubModal: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tituloSubModal: {
    color: TOKENS.colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  errorSubModal: {
    color: TOKENS.colors.danger,
    fontSize: 12,
    marginBottom: 10,
  },
  inputNombrePersonalizado: {
    backgroundColor: TOKENS.colors.surfaceElevated,
    borderRadius: TOKENS.radii.sm,
    borderWidth: 1,
    borderColor: TOKENS.colors.borderDefault,
    color: TOKENS.colors.textPrimary,
    fontSize: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 14,
  },
  etiquetaCampo: {
    color: TOKENS.colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  chipOpcion: {
    backgroundColor: TOKENS.colors.surfaceElevated,
    borderRadius: TOKENS.radii.sm,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 6,
    borderWidth: 1,
    borderColor: TOKENS.colors.borderDefault,
    minHeight: 36,
    justifyContent: 'center',
  },
  chipOpcionActivo: {
    backgroundColor: TOKENS.colors.accentWhite,
    borderColor: TOKENS.colors.accentWhite,
  },
  textoChipOpcion: {
    color: TOKENS.colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  textoChipOpcionActivo: {
    color: TOKENS.colors.textInverse,
    fontWeight: '800',
  },
  botonConfirmarCreacion: {
    backgroundColor: TOKENS.colors.accentWhite,
    borderRadius: TOKENS.radii.md,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 6,
  },
  textoBotonConfirmar: {
    color: TOKENS.colors.textInverse,
    fontSize: 14,
    fontWeight: '800',
  },
  seccionRecientesContenedor: {
    marginBottom: TOKENS.spacing.md,
    paddingTop: TOKENS.spacing.xs,
  },
  filaTituloRecientes: {
    paddingHorizontal: 2,
    marginBottom: TOKENS.spacing.sm,
  },
  etiquetaRecientes: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: TOKENS.colors.textSecondary,
    textTransform: 'uppercase',
  },
  scrollRecientesContenido: {
    paddingRight: TOKENS.spacing.md,
    gap: TOKENS.spacing.sm,
  },
  miniTarjetaReciente: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 160,
    minHeight: TOKENS.touchTarget.minHeight,
    backgroundColor: TOKENS.colors.surface,
    borderRadius: TOKENS.radii.sm,
    borderWidth: 1,
    borderColor: TOKENS.colors.borderDefault,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  contenedorMiniaturaReciente: {
    width: 36,
    height: 36,
    borderRadius: TOKENS.radii.xs,
    overflow: 'hidden',
  },
  infoMiniTarjeta: {
    flex: 1,
    marginLeft: TOKENS.spacing.sm,
    justifyContent: 'center',
  },
  textoNombreReciente: {
    color: TOKENS.colors.textPrimary,
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 15,
    letterSpacing: -0.1,
  },
});