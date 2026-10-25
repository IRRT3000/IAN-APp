import React, { useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
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
  CATALOGO_EJERCICIOS_BASE,
  GRUPOS_MUSCULARES,
  GRUPOS_MUSCULARES_REGISTRO,
  IMPLEMENTOS,
  obtenerColorGrupo,
} from '../constants/catalogoEjercicios';
import { guardarEjercicioPersonalizado } from '../services/storage';
import { vibrarSeleccionBascula } from '../services/haptics';
import { TOKENS } from '../theme/tokens';

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
}) {
  const [busqueda, setBusqueda] = useState('');
  const [grupoFiltro, setGrupoFiltro] = useState('Todos');

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
      onRequestClose={onCerrar}
    >
      <SafeAreaView style={styles.contenedorSafeArea}>
        <View style={styles.cabecera}>
          <TouchableOpacity
            style={styles.botonCerrar}
            onPress={onCerrar}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Feather name="x" size={20} color={TOKENS.colors.textPrimary} />
          </TouchableOpacity>

          <Text style={styles.tituloModal}>Catálogo de Ejercicios</Text>

          <TouchableOpacity
            style={styles.botonCrearRapido}
            onPress={() => setSubModalVisible(true)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Feather name="plus" size={20} color={TOKENS.colors.textPrimary} />
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
            style={styles.inputBusqueda}
            placeholder="Buscar por ejercicio o implemento..."
            placeholderTextColor={TOKENS.colors.textMuted}
            value={busqueda}
            onChangeText={setBusqueda}
            autoCorrect={false}
          />
          {busqueda.length > 0 ? (
            <TouchableOpacity onPress={() => setBusqueda('')}>
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
          contentContainerStyle={styles.listaEjercicios}
          showsVerticalScrollIndicator={false}
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
                <View style={styles.infoEjercicio}>
                  <Text style={styles.nombreEjercicio}>{item.nombre}</Text>
                  <View style={styles.filaSubinfo}>
                    <Text style={styles.grupoMuscular}>
                      {item.grupoMuscular}
                    </Text>
                    <View style={styles.puntoSeparador} />
                    <Feather
                      name={iconoFeather}
                      size={10}
                      color={TOKENS.colors.textSecondary}
                      style={{ marginRight: 4 }}
                    />
                    <Text style={styles.implemento}>{item.implemento}</Text>
                  </View>
                </View>
                <Feather
                  name="chevron-right"
                  size={16}
                  color={TOKENS.colors.textMuted}
                />
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View style={styles.estadoVacio}>
              <Feather
                name="activity"
                size={32}
                color={TOKENS.colors.textMuted}
                style={{ marginBottom: 12 }}
              />
              <Text style={styles.textoVacio}>No se encontraron ejercicios.</Text>
            </View>
          }
        />

        <Modal
          visible={subModalVisible}
          animationType="fade"
          transparent={true}
          onRequestClose={() => setSubModalVisible(false)}
        >
          <View style={styles.overlaySubModal}>
            <View style={styles.cajaSubModal}>
              <View style={styles.cabeceraSubModal}>
                <Text style={styles.tituloSubModal}>Nuevo Ejercicio</Text>
                <TouchableOpacity onPress={() => setSubModalVisible(false)}>
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
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
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
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
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
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  contenedorSafeArea: {
    flex: 1,
    backgroundColor: TOKENS.colors.canvas,
  },
  cabecera: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: TOKENS.colors.borderDefault,
    backgroundColor: TOKENS.colors.surface,
  },
  botonCerrar: {
    padding: 6,
  },
  tituloModal: {
    color: TOKENS.colors.textPrimary,
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  botonCrearRapido: {
    padding: 6,
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
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 6,
    borderWidth: 1,
    borderColor: TOKENS.colors.borderDefault,
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
    paddingBottom: 40,
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
  },
  textoVacio: {
    color: TOKENS.colors.textSecondary,
    fontSize: 14,
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
    borderWidth: 1,
    borderColor: TOKENS.colors.borderStrong,
  },
  cabeceraSubModal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
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
    paddingVertical: 10,
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
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginRight: 6,
    borderWidth: 1,
    borderColor: TOKENS.colors.borderDefault,
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
    borderRadius: TOKENS.radii.sm,
    paddingVertical: 12,
    alignItems: 'center',
  },
  textoBotonConfirmar: {
    color: TOKENS.colors.textInverse,
    fontSize: 14,
    fontWeight: '800',
  },
});
