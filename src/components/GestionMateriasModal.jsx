import React, { useState } from 'react';
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { TOKENS } from '../theme/tokens';
import { vibrarSeleccionBascula } from '../services/haptics';
import { useSafeInsets } from '../utils/useSafeInsets';

export default function GestionMateriasModal({
  visible = false,
  materias = [],
  conteoPorMateria = {},
  onCerrar,
  onCrearMateria,
  onEditarMateria,
  onBorrarMateria,
}) {
  const insets = useSafeInsets();

  const [modoCrear, setModoCrear] = useState(false);
  const [nombreNueva, setNombreNueva] = useState('');
  const [categoriaNueva, setCategoriaNueva] = useState('Escuela');
  const [errorFormulario, setErrorFormulario] = useState('');

  const [idMateriaEditando, setIdMateriaEditando] = useState(null);
  const [nombreEditando, setNombreEditando] = useState('');
  const [categoriaEditando, setCategoriaEditando] = useState('Escuela');

  const limpiarFormularioCrear = () => {
    setModoCrear(false);
    setNombreNueva('');
    setCategoriaNueva('Escuela');
    setErrorFormulario('');
  };

  const limpiarFormularioEditar = () => {
    setIdMateriaEditando(null);
    setNombreEditando('');
    setCategoriaEditando('Escuela');
    setErrorFormulario('');
  };

  const handleGuardarNueva = async () => {
    setErrorFormulario('');
    try {
      await onCrearMateria({
        nombre: nombreNueva,
        categoria: categoriaNueva,
      });
      vibrarSeleccionBascula();
      limpiarFormularioCrear();
    } catch (err) {
      setErrorFormulario(err.message || 'Error al crear materia.');
    }
  };

  const handleIniciarEditar = (materia) => {
    vibrarSeleccionBascula();
    setIdMateriaEditando(materia.id);
    setNombreEditando(materia.nombre);
    setCategoriaEditando(materia.categoria);
    setErrorFormulario('');
  };

  const handleGuardarEditar = async () => {
    setErrorFormulario('');
    try {
      await onEditarMateria(idMateriaEditando, {
        nombre: nombreEditando,
        categoria: categoriaEditando,
      });
      vibrarSeleccionBascula();
      limpiarFormularioEditar();
    } catch (err) {
      setErrorFormulario(err.message || 'Error al editar materia.');
    }
  };

  const handleBorrar = (materia) => {
    const totalSesiones = conteoPorMateria[materia.id] || 0;
    if (totalSesiones > 0) {
      Alert.alert(
        'No se puede eliminar',
        `La materia "${materia.nombre}" tiene ${totalSesiones} sesión(es) registrada(s). No puedes borrar una materia con historial.`
      );
      return;
    }

    Alert.alert(
      'Eliminar materia',
      `¿Deseas eliminar "${materia.nombre}"? Esta acción no se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await onBorrarMateria(materia.id);
              vibrarSeleccionBascula();
            } catch (err) {
              Alert.alert('Error', err.message || 'No se pudo eliminar la materia.');
            }
          },
        },
      ]
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      statusBarTranslucent
      onRequestClose={onCerrar}
    >
      <View style={[styles.contenedor, { paddingTop: insets.top }]}>
        {/* Cabecera */}
        <View style={styles.cabecera}>
          <TouchableOpacity
            style={styles.botonCerrar}
            onPress={onCerrar}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityRole="button"
            accessibilityLabel="Cerrar modal de gestión de materias"
          >
            <Feather name="x" size={20} color={TOKENS.colors.textSecondary} />
          </TouchableOpacity>

          <View style={styles.bloqueTitulo}>
            <Text style={styles.titulo}>Gestión de Materias</Text>
            <Text style={styles.subtitulo}>{materias.length} materia(s) registradas</Text>
          </View>

          <View style={styles.espaciadorCabecera} />
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 32 }]}
          keyboardShouldPersistTaps="handled"
        >
          {/* Botón para alternar creación */}
          {!modoCrear && !idMateriaEditando ? (
            <TouchableOpacity
              style={styles.botonCrearNueva}
              onPress={() => {
                vibrarSeleccionBascula();
                setModoCrear(true);
              }}
              activeOpacity={0.85}
            >
              <Feather name="plus" size={16} color={TOKENS.colors.textPrimary} style={{ marginRight: 6 }} />
              <Text style={styles.textoBotonCrearNueva}>Crear nueva materia</Text>
            </TouchableOpacity>
          ) : null}

          {/* Formulario de creación */}
          {modoCrear ? (
            <View style={styles.cajaFormulario}>
              <View style={styles.filaHeaderForm}>
                <Text style={styles.etiquetaFormulario}>NUEVA MATERIA</Text>
                <TouchableOpacity onPress={limpiarFormularioCrear} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Feather name="x" size={16} color={TOKENS.colors.textMuted} />
                </TouchableOpacity>
              </View>

              <TextInput
                style={styles.input}
                placeholder="Nombre de la materia (ej. Álgebra)"
                placeholderTextColor={TOKENS.colors.textMuted}
                value={nombreNueva}
                onChangeText={setNombreNueva}
                maxLength={60}
                autoFocus
              />

              <View style={styles.filaSelectorCategoria}>
                <TouchableOpacity
                  style={[
                    styles.pastillaCategoria,
                    categoriaNueva === 'Escuela' && styles.pastillaCategoriaActiva,
                  ]}
                  onPress={() => {
                    vibrarSeleccionBascula();
                    setCategoriaNueva('Escuela');
                  }}
                >
                  <Text
                    style={[
                      styles.textoPastillaCategoria,
                      categoriaNueva === 'Escuela' && styles.textoPastillaCategoriaActiva,
                    ]}
                  >
                    Escuela
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.pastillaCategoria,
                    categoriaNueva === 'Personal' && styles.pastillaCategoriaActiva,
                  ]}
                  onPress={() => {
                    vibrarSeleccionBascula();
                    setCategoriaNueva('Personal');
                  }}
                >
                  <Text
                    style={[
                      styles.textoPastillaCategoria,
                      categoriaNueva === 'Personal' && styles.textoPastillaCategoriaActiva,
                    ]}
                  >
                    Personal
                  </Text>
                </TouchableOpacity>
              </View>

              {errorFormulario ? <Text style={styles.textoError}>{errorFormulario}</Text> : null}

              <TouchableOpacity style={styles.botonGuardarForm} onPress={handleGuardarNueva} activeOpacity={0.85}>
                <Text style={styles.textoBotonGuardarForm}>Guardar materia</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {/* Lista de materias */}
          <View style={styles.bloqueLista}>
            <Text style={styles.etiquetaLista}>MATERIAS EXISTENTES</Text>

            {materias.length === 0 ? (
              <View style={styles.cajaVacia}>
                <Feather name="book-open" size={28} color={TOKENS.colors.textMuted} style={{ marginBottom: 8 }} />
                <Text style={styles.textoVacio}>Aún no has creado materias.</Text>
                <Text style={styles.subtextoVacio}>Crea una para registrar tus sesiones de estudio.</Text>
              </View>
            ) : (
              materias.map((mat) => {
                const enEdicion = idMateriaEditando === mat.id;
                const totalSesiones = conteoPorMateria[mat.id] || 0;

                if (enEdicion) {
                  return (
                    <View key={mat.id} style={styles.cajaFormulario}>
                      <View style={styles.filaHeaderForm}>
                        <Text style={styles.etiquetaFormulario}>EDITAR MATERIA</Text>
                        <TouchableOpacity onPress={limpiarFormularioEditar}>
                          <Feather name="x" size={16} color={TOKENS.colors.textMuted} />
                        </TouchableOpacity>
                      </View>

                      <TextInput
                        style={styles.input}
                        value={nombreEditando}
                        onChangeText={setNombreEditando}
                        maxLength={60}
                        autoFocus
                      />

                      <View style={styles.filaSelectorCategoria}>
                        <TouchableOpacity
                          style={[
                            styles.pastillaCategoria,
                            categoriaEditando === 'Escuela' && styles.pastillaCategoriaActiva,
                          ]}
                          onPress={() => {
                            vibrarSeleccionBascula();
                            setCategoriaEditando('Escuela');
                          }}
                        >
                          <Text
                            style={[
                              styles.textoPastillaCategoria,
                              categoriaEditando === 'Escuela' && styles.textoPastillaCategoriaActiva,
                            ]}
                          >
                            Escuela
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[
                            styles.pastillaCategoria,
                            categoriaEditando === 'Personal' && styles.pastillaCategoriaActiva,
                          ]}
                          onPress={() => {
                            vibrarSeleccionBascula();
                            setCategoriaEditando('Personal');
                          }}
                        >
                          <Text
                            style={[
                              styles.textoPastillaCategoria,
                              categoriaEditando === 'Personal' && styles.textoPastillaCategoriaActiva,
                            ]}
                          >
                            Personal
                          </Text>
                        </TouchableOpacity>
                      </View>

                      {errorFormulario ? <Text style={styles.textoError}>{errorFormulario}</Text> : null}

                      <TouchableOpacity style={styles.botonGuardarForm} onPress={handleGuardarEditar}>
                        <Text style={styles.textoBotonGuardarForm}>Guardar cambios</Text>
                      </TouchableOpacity>
                    </View>
                  );
                }

                return (
                  <View key={mat.id} style={styles.tarjetaMateria}>
                    <View style={styles.infoMateria}>
                      <Text style={styles.nombreMateria} numberOfLines={1}>
                        {mat.nombre}
                      </Text>
                      <View style={styles.filaMetaMateria}>
                        <View style={styles.badgeCategoriaItem}>
                          <Text style={styles.textoBadgeCategoriaItem}>
                            {mat.categoria.toUpperCase()}
                          </Text>
                        </View>
                        <Text style={styles.textoSesionesMateria}>
                          {totalSesiones} sesión{totalSesiones === 1 ? '' : 'es'}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.accionesMateria}>
                      <TouchableOpacity
                        style={styles.botonAccionMateria}
                        onPress={() => handleIniciarEditar(mat)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        accessibilityLabel={`Editar materia ${mat.nombre}`}
                      >
                        <Feather name="edit-2" size={15} color={TOKENS.colors.textSecondary} />
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.botonAccionMateria}
                        onPress={() => handleBorrar(mat)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        accessibilityLabel={`Eliminar materia ${mat.nombre}`}
                      >
                        <Feather
                          name="trash-2"
                          size={15}
                          color={totalSesiones > 0 ? TOKENS.colors.textMuted : TOKENS.colors.danger}
                        />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    flex: 1,
    backgroundColor: TOKENS.colors.canvas,
  },
  cabecera: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: TOKENS.spacing.md,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: TOKENS.colors.borderDefault,
    backgroundColor: TOKENS.colors.surface,
  },
  botonCerrar: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bloqueTitulo: {
    alignItems: 'center',
  },
  titulo: {
    color: TOKENS.colors.textPrimary,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  subtitulo: {
    color: TOKENS.colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  espaciadorCabecera: {
    width: 44,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: TOKENS.spacing.md,
    gap: 16,
  },
  botonCrearNueva: {
    height: 48,
    borderRadius: TOKENS.radii.md,
    backgroundColor: TOKENS.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: TOKENS.colors.borderStrong,
    borderStyle: 'dashed',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textoBotonCrearNueva: {
    color: TOKENS.colors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
  cajaFormulario: {
    backgroundColor: TOKENS.colors.surface,
    borderRadius: TOKENS.radii.md,
    borderWidth: 1,
    borderColor: TOKENS.colors.borderStrong,
    padding: 14,
    gap: 10,
  },
  filaHeaderForm: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  etiquetaFormulario: {
    color: TOKENS.colors.textMuted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  input: {
    height: 48,
    backgroundColor: TOKENS.colors.canvas,
    borderRadius: TOKENS.radii.sm,
    borderWidth: 1,
    borderColor: TOKENS.colors.borderDefault,
    paddingHorizontal: 12,
    color: TOKENS.colors.textPrimary,
    fontSize: 14,
  },
  filaSelectorCategoria: {
    flexDirection: 'row',
    gap: 8,
  },
  pastillaCategoria: {
    flex: 1,
    height: 40,
    borderRadius: TOKENS.radii.sm,
    backgroundColor: TOKENS.colors.canvas,
    borderWidth: 1,
    borderColor: TOKENS.colors.borderDefault,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pastillaCategoriaActiva: {
    backgroundColor: TOKENS.colors.accentWhite,
    borderColor: TOKENS.colors.accentWhite,
  },
  textoPastillaCategoria: {
    color: TOKENS.colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  textoPastillaCategoriaActiva: {
    color: TOKENS.colors.textInverse,
    fontWeight: '800',
  },
  textoError: {
    color: TOKENS.colors.danger,
    fontSize: 11,
    fontWeight: '600',
  },
  botonGuardarForm: {
    height: 44,
    borderRadius: TOKENS.radii.sm,
    backgroundColor: TOKENS.colors.accentWhite,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textoBotonGuardarForm: {
    color: TOKENS.colors.textInverse,
    fontSize: 13,
    fontWeight: '800',
  },
  bloqueLista: {
    gap: 10,
  },
  etiquetaLista: {
    color: TOKENS.colors.textMuted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  cajaVacia: {
    backgroundColor: TOKENS.colors.surface,
    borderRadius: TOKENS.radii.md,
    borderWidth: 1,
    borderColor: TOKENS.colors.borderDefault,
    paddingVertical: 32,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textoVacio: {
    color: TOKENS.colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  subtextoVacio: {
    color: TOKENS.colors.textSecondary,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
  },
  tarjetaMateria: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: TOKENS.colors.surface,
    borderRadius: TOKENS.radii.md,
    borderWidth: 1,
    borderColor: TOKENS.colors.borderDefault,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 52,
  },
  infoMateria: {
    flex: 1,
    marginRight: 12,
  },
  nombreMateria: {
    color: TOKENS.colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  filaMetaMateria: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  badgeCategoriaItem: {
    backgroundColor: TOKENS.colors.surfaceElevated,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: TOKENS.radii.xs,
    borderWidth: 1,
    borderColor: TOKENS.colors.borderSubtle,
  },
  textoBadgeCategoriaItem: {
    color: TOKENS.colors.textSecondary,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  textoSesionesMateria: {
    color: TOKENS.colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },
  accionesMateria: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  botonAccionMateria: {
    width: 44,
    height: 44,
    borderRadius: TOKENS.radii.sm,
    backgroundColor: TOKENS.colors.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
