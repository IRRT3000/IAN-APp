import React, { useMemo, useState } from 'react';
import {
  FlatList,
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
  CATALOGO_EJERCICIOS_BASE,
  COLORES_GRUPOS,
  GRUPOS_MUSCULARES,
  GRUPOS_MUSCULARES_REGISTRO,
  IMPLEMENTOS,
  obtenerColorGrupo,
  obtenerIconoImplemento,
} from '../constants/catalogoEjercicios';
import { guardarEjercicioPersonalizado } from '../services/storage';

export default function CatalogoEjerciciosModal({
  visible,
  onCerrar,
  onSeleccionarEjercicio,
  ejerciciosPersonalizados = [],
  onEjercicioPersonalizadoCreado,
}) {
  const [busqueda, setBusqueda] = useState('');
  const [grupoFiltro, setGrupoFiltro] = useState('Todos');

  // Estado del sub-modal de creación personalizada
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

      if (!coincideGrupo) {
        return false;
      }

      if (!texto) {
        return true;
      }

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

  const renderizarItem = ({ item }) => {
    const colorGrupo = obtenerColorGrupo(item.grupoMuscular);
    const icono = obtenerIconoImplemento(item.implemento);

    return (
      <TouchableOpacity
        style={styles.tarjetaEjercicio}
        activeOpacity={0.7}
        onPress={() => onSeleccionarEjercicio(item)}
      >
        <View style={[styles.barraColor, { backgroundColor: colorGrupo }]} />
        <View style={styles.contenidoTarjeta}>
          <View style={styles.filaSuperiorTarjeta}>
            <View
              style={[
                styles.badgeGrupo,
                { borderColor: colorGrupo, backgroundColor: `${colorGrupo}22` },
              ]}
            >
              <Text style={[styles.textoBadgeGrupo, { color: colorGrupo }]}>
                {item.grupoMuscular}
              </Text>
            </View>

            <View style={styles.badgeImplemento}>
              <Text style={styles.iconoImplemento}>{icono}</Text>
              <Text style={styles.textoBadgeImplemento}>
                {item.implemento || 'Implemento'}
              </Text>
            </View>

            {item.esPersonalizado ? (
              <View style={styles.badgePersonalizado}>
                <Text style={styles.textoBadgePersonalizado}>★ Propio</Text>
              </View>
            ) : null}
          </View>

          <Text style={styles.nombreEjercicio}>{item.nombre}</Text>
        </View>

        <View style={styles.flechaSeleccion}>
          <Text style={styles.textoFlecha}>➔</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onCerrar}
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.contenedorModal}>
          {/* Encabezado */}
          <View style={styles.encabezado}>
            <View>
              <Text style={styles.tituloModal}>Catálogo de Ejercicios</Text>
              <Text style={styles.subtituloModal}>
                Selecciona o crea un ejercicio para tu sesión
              </Text>
            </View>
            <TouchableOpacity
              style={styles.botonCerrar}
              activeOpacity={0.7}
              onPress={onCerrar}
            >
              <Text style={styles.textoBotonCerrar}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Buscador */}
          <View style={styles.contenedorBuscador}>
            <Text style={styles.iconoBuscador}>🔍</Text>
            <TextInput
              style={styles.inputBuscador}
              placeholder="Buscar ejercicio o implemento..."
              placeholderTextColor="#757575"
              value={busqueda}
              onChangeText={setBusqueda}
              autoCapitalize="none"
              clearButtonMode="while-editing"
            />
            {busqueda.length > 0 ? (
              <TouchableOpacity
                onPress={() => setBusqueda('')}
                style={styles.botonLimpiarBusqueda}
              >
                <Text style={styles.textoLimpiarBusqueda}>✕</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          {/* Chips de filtro por grupo muscular */}
          <View style={styles.contenedorFiltros}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.scrollFiltros}
            >
              {GRUPOS_MUSCULARES.map((grupo) => {
                const activo = grupoFiltro === grupo;
                const color =
                  grupo === 'Todos'
                    ? '#00E676'
                    : COLORES_GRUPOS[grupo] || '#00E676';

                return (
                  <TouchableOpacity
                    key={grupo}
                    style={[
                      styles.chipFiltro,
                      activo && {
                        backgroundColor: color,
                        borderColor: color,
                      },
                    ]}
                    activeOpacity={0.75}
                    onPress={() => setGrupoFiltro(grupo)}
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

          {/* Botón para crear personalizado */}
          <TouchableOpacity
            style={styles.botonCrearPersonalizado}
            activeOpacity={0.85}
            onPress={() => {
              setErrorCreacion('');
              setSubModalVisible(true);
            }}
          >
            <Text style={styles.iconoMas}>＋</Text>
            <Text style={styles.textoCrearPersonalizado}>
              Crear ejercicio personalizado
            </Text>
          </TouchableOpacity>

          {/* Lista de ejercicios */}
          <FlatList
            data={listaFiltrada}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderizarItem}
            contentContainerStyle={styles.listaContenido}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              <View style={styles.estadoVacio}>
                <Text style={styles.textoVacioTitulo}>
                  No encontramos "{busqueda}"
                </Text>
                <Text style={styles.textoVacioSub}>
                  Puedes pulsar en "Crear ejercicio personalizado" arriba para
                  agregarlo ahora mismo.
                </Text>
              </View>
            }
          />
        </View>

        {/* Sub-Modal para crear ejercicio personalizado */}
        <Modal
          visible={subModalVisible}
          animationType="fade"
          transparent={true}
          onRequestClose={() => setSubModalVisible(false)}
        >
          <View style={styles.overlaySubModal}>
            <View style={styles.tarjetaSubModal}>
              <Text style={styles.tituloSubModal}>Nuevo Ejercicio Propio</Text>
              <Text style={styles.descripcionSubModal}>
                Se guardará localmente en tu catálogo personal.
              </Text>

              <Text style={styles.etiquetaCampo}>Nombre del ejercicio *</Text>
              <TextInput
                style={styles.inputNombrePersonalizado}
                placeholder="Ej. Press inclinado en máquina convergente"
                placeholderTextColor="#757575"
                value={nuevoNombre}
                onChangeText={(val) => {
                  setNuevoNombre(val);
                  if (errorCreacion) setErrorCreacion('');
                }}
              />

              <Text style={styles.etiquetaCampo}>Grupo muscular</Text>
              <View style={styles.grillaOpciones}>
                {GRUPOS_MUSCULARES_REGISTRO.map((g) => {
                  const sel = nuevoGrupo === g;
                  const color = COLORES_GRUPOS[g] || '#00E676';
                  return (
                    <TouchableOpacity
                      key={g}
                      style={[
                        styles.opcionBoton,
                        sel && { borderColor: color, backgroundColor: `${color}25` },
                      ]}
                      onPress={() => setNuevoGrupo(g)}
                    >
                      <Text
                        style={[
                          styles.textoOpcionBoton,
                          sel && { color: color, fontWeight: '800' },
                        ]}
                      >
                        {g}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.etiquetaCampo}>Implemento / Máquina</Text>
              <View style={styles.grillaOpciones}>
                {IMPLEMENTOS.map((imp) => {
                  const sel = nuevoImplemento === imp;
                  return (
                    <TouchableOpacity
                      key={imp}
                      style={[
                        styles.opcionBoton,
                        sel && styles.opcionBotonSeleccionado,
                      ]}
                      onPress={() => setNuevoImplemento(imp)}
                    >
                      <Text
                        style={[
                          styles.textoOpcionBoton,
                          sel && styles.textoOpcionBotonSeleccionado,
                        ]}
                      >
                        {obtenerIconoImplemento(imp)} {imp}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {errorCreacion ? (
                <Text style={styles.textoErrorSubModal}>{errorCreacion}</Text>
              ) : null}

              <View style={styles.filaBotonesSubModal}>
                <TouchableOpacity
                  style={styles.botonCancelarSubModal}
                  onPress={() => setSubModalVisible(false)}
                >
                  <Text style={styles.textoCancelarSubModal}>Cancelar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.botonGuardarSubModal}
                  onPress={manejarCrearPersonalizado}
                >
                  <Text style={styles.textoGuardarSubModal}>
                    Guardar y Usar
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#121212',
  },
  contenedorModal: {
    flex: 1,
    backgroundColor: '#121212',
    paddingTop: Platform.OS === 'android' ? 36 : 10,
    paddingHorizontal: 16,
  },
  encabezado: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  tituloModal: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
  },
  subtituloModal: {
    color: '#8D8D8D',
    fontSize: 12,
    marginTop: 2,
  },
  botonCerrar: {
    backgroundColor: '#2A2A2A',
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#383838',
  },
  textoBotonCerrar: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  contenedorBuscador: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#2E2E2E',
  },
  iconoBuscador: {
    fontSize: 14,
    marginRight: 8,
  },
  inputBuscador: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 15,
    paddingVertical: 10,
  },
  botonLimpiarBusqueda: {
    padding: 6,
  },
  textoLimpiarBusqueda: {
    color: '#8D8D8D',
    fontSize: 14,
    fontWeight: '700',
  },
  contenedorFiltros: {
    marginBottom: 10,
  },
  scrollFiltros: {
    paddingRight: 10,
  },
  chipFiltro: {
    backgroundColor: '#1E1E1E',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#2E2E2E',
  },
  textoChipFiltro: {
    color: '#B0B0B0',
    fontSize: 12,
    fontWeight: '700',
  },
  textoChipFiltroActivo: {
    color: '#121212',
    fontWeight: '800',
  },
  botonCrearPersonalizado: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E2D24',
    borderWidth: 1.5,
    borderColor: '#00E676',
    borderRadius: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  iconoMas: {
    color: '#00E676',
    fontSize: 16,
    fontWeight: '900',
    marginRight: 6,
  },
  textoCrearPersonalizado: {
    color: '#00E676',
    fontSize: 13,
    fontWeight: '800',
  },
  listaContenido: {
    paddingBottom: 24,
  },
  tarjetaEjercicio: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#2E2E2E',
    overflow: 'hidden',
  },
  barraColor: {
    width: 6,
    alignSelf: 'stretch',
  },
  contenidoTarjeta: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  filaSuperiorTarjeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  badgeGrupo: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginRight: 6,
  },
  textoBadgeGrupo: {
    fontSize: 10,
    fontWeight: '700',
  },
  badgeImplemento: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2A2A2A',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginRight: 6,
  },
  iconoImplemento: {
    fontSize: 10,
    marginRight: 3,
  },
  textoBadgeImplemento: {
    color: '#B0B0B0',
    fontSize: 10,
    fontWeight: '600',
  },
  badgePersonalizado: {
    backgroundColor: '#FFAB0033',
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: '#FFAB00',
  },
  textoBadgePersonalizado: {
    color: '#FFAB00',
    fontSize: 9,
    fontWeight: '800',
  },
  nombreEjercicio: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    marginTop: 2,
  },
  flechaSeleccion: {
    paddingRight: 14,
  },
  textoFlecha: {
    color: '#757575',
    fontSize: 16,
  },
  estadoVacio: {
    backgroundColor: '#1E1E1E',
    borderRadius: 14,
    padding: 24,
    alignItems: 'center',
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#2E2E2E',
  },
  textoVacioTitulo: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 6,
  },
  textoVacioSub: {
    color: '#8D8D8D',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },

  // Sub-modal
  overlaySubModal: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    padding: 16,
  },
  tarjetaSubModal: {
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#383838',
  },
  tituloSubModal: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
  descripcionSubModal: {
    color: '#8D8D8D',
    fontSize: 12,
    marginTop: 2,
    marginBottom: 14,
  },
  etiquetaCampo: {
    color: '#B0B0B0',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
  },
  inputNombrePersonalizado: {
    backgroundColor: '#2A2A2A',
    color: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#383838',
  },
  grillaOpciones: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  opcionBoton: {
    backgroundColor: '#2A2A2A',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginRight: 6,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#383838',
  },
  opcionBotonSeleccionado: {
    backgroundColor: '#223026',
    borderColor: '#00E676',
  },
  textoOpcionBoton: {
    color: '#B0B0B0',
    fontSize: 11,
    fontWeight: '600',
  },
  textoOpcionBotonSeleccionado: {
    color: '#00E676',
    fontWeight: '800',
  },
  textoErrorSubModal: {
    color: '#FF5252',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 10,
  },
  filaBotonesSubModal: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 6,
  },
  botonCancelarSubModal: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginRight: 8,
  },
  textoCancelarSubModal: {
    color: '#B0B0B0',
    fontSize: 13,
    fontWeight: '700',
  },
  botonGuardarSubModal: {
    backgroundColor: '#00E676',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  textoGuardarSubModal: {
    color: '#121212',
    fontSize: 13,
    fontWeight: '800',
  },
});
