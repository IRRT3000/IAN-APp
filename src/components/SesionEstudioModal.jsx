import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Keyboard,
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
import {
  vibrarSeleccionBascula,
  vibrarSerieAgregada,
} from '../services/haptics';
import {
  validarSesionEstudio,
  NIVELES_COMPRENSION,
  MINUTOS_RAPIDOS,
  APUNTES_MIN,
  APUNTES_MAX,
  TEMA_MAX,
} from '../utils/validacionEstudio';
import { useSafeInsets } from '../utils/useSafeInsets';

export default function SesionEstudioModal({
  visible = false,
  esEdicion = false,
  sesionInicial = null,
  fechaSeleccionada,
  fechaHoy,
  materias = [],
  onCerrar,
  onGuardar,
  onCrearMateria,
}) {
  const insets = useSafeInsets();

  // Estados del formulario inicializados de forma pura
  const [materiaId, setMateriaId] = useState(
    () => (esEdicion && sesionInicial ? sesionInicial.materiaId || '' : materias[0]?.id || '')
  );
  const [tema, setTema] = useState(
    () => (esEdicion && sesionInicial ? sesionInicial.tema || '' : '')
  );
  const [comprension, setComprension] = useState(
    () => (esEdicion && sesionInicial ? sesionInicial.comprension || 'Bien' : 'Bien')
  );
  const [minutos, setMinutos] = useState(
    () => (esEdicion && sesionInicial ? sesionInicial.minutos || 45 : 45)
  );
  const [minutosManual, setMinutosManual] = useState(() => {
    if (esEdicion && sesionInicial) {
      const min = sesionInicial.minutos || 45;
      return MINUTOS_RAPIDOS.includes(min) ? '' : String(min);
    }
    return '';
  });
  const [apuntes, setApuntes] = useState(
    () => (esEdicion && sesionInicial ? sesionInicial.apuntes || '' : '')
  );
  const [errores, setErrores] = useState({});
  const [guardando, setGuardando] = useState(false);
  const guardandoRef = useRef(false);

  // Creación rápida de materia en línea
  const [mostrandoNuevaMateria, setMostrandoNuevaMateria] = useState(false);
  const [nombreNuevaMateria, setNombreNuevaMateria] = useState('');
  const [categoriaNuevaMateria, setCategoriaNuevaMateria] = useState('Escuela');
  const [errorNuevaMateria, setErrorNuevaMateria] = useState('');

  // Teclado
  const [tecladoVisible, setTecladoVisible] = useState(false);

  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', () =>
      setTecladoVisible(true)
    );
    const hideSub = Keyboard.addListener('keyboardDidHide', () =>
      setTecladoVisible(false)
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const fechaEfectiva = esEdicion && sesionInicial ? sesionInicial.fecha : fechaSeleccionada;

  const handleSeleccionarChipMinutos = (val) => {
    vibrarSeleccionBascula();
    setMinutos(val);
    setMinutosManual('');
    if (errores.minutos) {
      setErrores((prev) => ({ ...prev, minutos: null }));
    }
  };

  const handleCambiarMinutosManual = (texto) => {
    const limpio = texto.replace(/[^0-9]/g, '');
    setMinutosManual(limpio);
    if (limpio) {
      const num = parseInt(limpio, 10);
      setMinutos(num);
    }
    if (errores.minutos) {
      setErrores((prev) => ({ ...prev, minutos: null }));
    }
  };

  const handleSeleccionarComprension = (nivel) => {
    vibrarSeleccionBascula();
    setComprension(nivel);
    if (errores.comprension) {
      setErrores((prev) => ({ ...prev, comprension: null }));
    }
  };

  const handleSeleccionarMateria = (id) => {
    vibrarSeleccionBascula();
    setMateriaId(id);
    if (errores.materiaId) {
      setErrores((prev) => ({ ...prev, materiaId: null }));
    }
  };

  const handleGuardarNuevaMateriaRapida = async () => {
    setErrorNuevaMateria('');
    try {
      const actualizadas = await onCrearMateria({
        nombre: nombreNuevaMateria,
        categoria: categoriaNuevaMateria,
      });
      vibrarSeleccionBascula();
      const creada = actualizadas[actualizadas.length - 1];
      if (creada) {
        setMateriaId(creada.id);
      }
      setMostrandoNuevaMateria(false);
      setNombreNuevaMateria('');
      setCategoriaNuevaMateria('Escuela');
    } catch (err) {
      setErrorNuevaMateria(err.message || 'Error al crear materia.');
    }
  };

  const handleGuardar = async () => {
    if (guardandoRef.current) return;

    const datos = {
      materiaId,
      tema,
      comprension,
      minutos,
      apuntes,
      fecha: fechaEfectiva,
    };

    const validacion = validarSesionEstudio(datos, {
      fechaHoy,
      materiasExistentes: materias,
      esEdicion,
    });

    if (!validacion.valido) {
      setErrores(validacion.errores);
      return;
    }

    guardandoRef.current = true;
    setGuardando(true);
    setErrores({});

    try {
      await onGuardar(validacion.datos);
      vibrarSerieAgregada();
      onCerrar();
    } catch (err) {
      Alert.alert('Error al guardar', err.message || 'No se pudo guardar la sesión de estudio.');
    } finally {
      guardandoRef.current = false;
      setGuardando(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      statusBarTranslucent
      onRequestClose={onCerrar}
    >
      <View style={[styles.contenedorModal, { paddingTop: insets.top }]}>
        {/* Cabecera Ergonómica */}
        <View style={styles.cabeceraModal}>
          <TouchableOpacity
            style={styles.botonCerrar}
            onPress={onCerrar}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityRole="button"
            accessibilityLabel="Cerrar formulario de sesión"
          >
            <Feather name="x" size={20} color={TOKENS.colors.textSecondary} />
          </TouchableOpacity>

          <View style={styles.bloqueTituloModal}>
            <Text style={styles.tituloModal}>
              {esEdicion ? 'Editar Sesión' : 'Nueva Sesión de Estudio'}
            </Text>
            <Text style={styles.subtituloModal}>Fecha: {fechaEfectiva}</Text>
          </View>

          <View style={styles.espaciadorCabecera} />
        </View>

        {/* Formulario con scroll */}
        <ScrollView
          style={styles.scrollFormulario}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: tecladoVisible ? 80 : 160 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* SECCIÓN 1: Materia */}
          <View style={styles.grupoCampo}>
            <View style={styles.filaLabel}>
              <Text style={styles.labelCampo}>MATERIA</Text>
              {errores.materiaId ? (
                <Text style={styles.textoErrorCampo}>{errores.materiaId}</Text>
              ) : null}
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.scrollMaterias}
            >
              {materias.map((mat) => {
                const seleccionada = materiaId === mat.id;
                return (
                  <TouchableOpacity
                    key={mat.id}
                    style={[
                      styles.chipMateria,
                      seleccionada && styles.chipMateriaActivo,
                    ]}
                    onPress={() => handleSeleccionarMateria(mat.id)}
                    activeOpacity={0.75}
                  >
                    <Text
                      style={[
                        styles.textoChipMateria,
                        seleccionada && styles.textoChipMateriaActivo,
                      ]}
                    >
                      {mat.nombre}
                    </Text>
                  </TouchableOpacity>
                );
              })}

              <TouchableOpacity
                style={styles.botonAgregarMateriaChip}
                onPress={() => {
                  vibrarSeleccionBascula();
                  setMostrandoNuevaMateria(!mostrandoNuevaMateria);
                }}
                activeOpacity={0.75}
              >
                <Feather
                  name="plus"
                  size={13}
                  color={TOKENS.colors.textPrimary}
                  style={{ marginRight: 4 }}
                />
                <Text style={styles.textoBotonAgregarMateria}>Nueva materia</Text>
              </TouchableOpacity>
            </ScrollView>

            {/* Formulario en línea de creación de materia */}
            {mostrandoNuevaMateria ? (
              <View style={styles.panelNuevaMateriaEnLinea}>
                <Text style={styles.subtituloNuevaMateria}>CREAR MATERIA RÁPIDA</Text>
                <TextInput
                  style={styles.inputNombreMateria}
                  placeholder="Nombre de la materia (ej. Cálculo)"
                  placeholderTextColor={TOKENS.colors.textMuted}
                  value={nombreNuevaMateria}
                  onChangeText={setNombreNuevaMateria}
                  maxLength={60}
                />

                <View style={styles.filaCategoriaNuevaMateria}>
                  <TouchableOpacity
                    style={[
                      styles.pastillaCategoria,
                      categoriaNuevaMateria === 'Escuela' &&
                        styles.pastillaCategoriaActiva,
                    ]}
                    onPress={() => {
                      vibrarSeleccionBascula();
                      setCategoriaNuevaMateria('Escuela');
                    }}
                  >
                    <Text
                      style={[
                        styles.textoPastillaCategoria,
                        categoriaNuevaMateria === 'Escuela' &&
                          styles.textoPastillaCategoriaActiva,
                      ]}
                    >
                      Escuela
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.pastillaCategoria,
                      categoriaNuevaMateria === 'Personal' &&
                        styles.pastillaCategoriaActiva,
                    ]}
                    onPress={() => {
                      vibrarSeleccionBascula();
                      setCategoriaNuevaMateria('Personal');
                    }}
                  >
                    <Text
                      style={[
                        styles.textoPastillaCategoria,
                        categoriaNuevaMateria === 'Personal' &&
                          styles.textoPastillaCategoriaActiva,
                      ]}
                    >
                      Personal
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.botonConfirmarNuevaMateria}
                    onPress={handleGuardarNuevaMateriaRapida}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Feather
                      name="check"
                      size={16}
                      color={TOKENS.colors.textInverse}
                    />
                  </TouchableOpacity>
                </View>

                {errorNuevaMateria ? (
                  <Text style={styles.textoErrorCampo}>{errorNuevaMateria}</Text>
                ) : null}
              </View>
            ) : null}
          </View>

          {/* SECCIÓN 2: Tema */}
          <View style={styles.grupoCampo}>
            <View style={styles.filaLabel}>
              <Text style={styles.labelCampo}>TEMA EXACTO</Text>
              <Text style={styles.contadorCaracteres}>
                {tema.length}/{TEMA_MAX}
              </Text>
            </View>
            <TextInput
              style={[styles.inputTexto, errores.tema && styles.inputConError]}
              placeholder="¿Qué estudiaste específicamente?"
              placeholderTextColor={TOKENS.colors.textMuted}
              value={tema}
              onChangeText={(t) => {
                setTema(t);
                if (errores.tema) setErrores((prev) => ({ ...prev, tema: null }));
              }}
              maxLength={TEMA_MAX}
            />
            {errores.tema ? (
              <Text style={styles.textoErrorCampo}>{errores.tema}</Text>
            ) : null}
          </View>

          {/* SECCIÓN 3: Comprensión */}
          <View style={styles.grupoCampo}>
            <View style={styles.filaLabel}>
              <Text style={styles.labelCampo}>NIVEL DE COMPRENSIÓN</Text>
              {errores.comprension ? (
                <Text style={styles.textoErrorCampo}>{errores.comprension}</Text>
              ) : null}
            </View>
            <View style={styles.contenedorPastillasComprension}>
              {NIVELES_COMPRENSION.map((niv) => {
                const activo = comprension === niv;
                return (
                  <TouchableOpacity
                    key={niv}
                    style={[
                      styles.opcionComprension,
                      activo && styles.opcionComprensionActiva,
                    ]}
                    onPress={() => handleSeleccionarComprension(niv)}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.textoOpcionComprension,
                        activo && styles.textoOpcionComprensionActiva,
                      ]}
                    >
                      {niv}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* SECCIÓN 4: Tiempo Dedicado (Minutos) */}
          <View style={styles.grupoCampo}>
            <View style={styles.filaLabel}>
              <Text style={styles.labelCampo}>TIEMPO DEDICADO</Text>
              {errores.minutos ? (
                <Text style={styles.textoErrorCampo}>{errores.minutos}</Text>
              ) : null}
            </View>

            <View style={styles.filaChipsMinutos}>
              {MINUTOS_RAPIDOS.map((val) => {
                const activo = Number(minutos) === val && !minutosManual;
                return (
                  <TouchableOpacity
                    key={val}
                    style={[
                      styles.chipMinutos,
                      activo && styles.chipMinutosActivo,
                    ]}
                    onPress={() => handleSeleccionarChipMinutos(val)}
                  >
                    <Text
                      style={[
                        styles.textoChipMinutos,
                        activo && styles.textoChipMinutosActivo,
                      ]}
                    >
                      {val}m
                    </Text>
                  </TouchableOpacity>
                );
              })}

              <View style={styles.contenedorInputMinutosManual}>
                <Feather
                  name="clock"
                  size={12}
                  color={TOKENS.colors.textSecondary}
                  style={{ marginRight: 4 }}
                />
                <TextInput
                  style={styles.inputMinutosManual}
                  placeholder="Otro"
                  placeholderTextColor={TOKENS.colors.textMuted}
                  keyboardType="numeric"
                  value={minutosManual}
                  onChangeText={handleCambiarMinutosManual}
                  maxLength={3}
                />
              </View>
            </View>
          </View>

          {/* SECCIÓN 5: Apuntes */}
          <View style={styles.grupoCampo}>
            <View style={styles.filaLabel}>
              <Text style={styles.labelCampo}>APUNTES Y NOTAS CLAVE</Text>
              <Text style={styles.contadorCaracteres}>
                {apuntes.trim().length}/{APUNTES_MAX}
              </Text>
            </View>
            <TextInput
              style={[
                styles.inputTextArea,
                errores.apuntes && styles.inputConError,
              ]}
              placeholder={`Notas, fórmulas o conceptos (mínimo ${APUNTES_MIN} caracteres)...`}
              placeholderTextColor={TOKENS.colors.textMuted}
              value={apuntes}
              onChangeText={(a) => {
                setApuntes(a);
                if (errores.apuntes)
                  setErrores((prev) => ({ ...prev, apuntes: null }));
              }}
              maxLength={APUNTES_MAX}
              multiline
              textAlignVertical="top"
            />
            {errores.apuntes ? (
              <Text style={styles.textoErrorCampo}>{errores.apuntes}</Text>
            ) : null}
          </View>
        </ScrollView>

        {/* Barra Accesoria de Teclado vs Sticky CTA Guardar (Defensa 9) */}
        {tecladoVisible ? (
          <View style={styles.barraAccesoriaTeclado}>
            <TouchableOpacity
              style={styles.botonDescartarTeclado}
              onPress={() => Keyboard.dismiss()}
              activeOpacity={0.8}
            >
              <Feather
                name="corner-down-left"
                size={15}
                color={TOKENS.colors.textPrimary}
                style={{ marginRight: 6 }}
              />
              <Text style={styles.textoBotonDescartarTeclado}>
                Listo / Ocultar teclado
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View
            style={[
              styles.stickyFooterThumbZone,
              { paddingBottom: insets.bottom + 12 },
            ]}
          >
            <TouchableOpacity
              style={[
                styles.botonPrimarioGuardar,
                guardando && styles.botonDeshabilitado,
              ]}
              onPress={handleGuardar}
              disabled={guardando}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel={
                guardando
                  ? 'Guardando'
                  : esEdicion
                    ? 'Actualizar sesión de estudio'
                    : 'Guardar sesión de estudio'
              }
            >
              <Feather
                name="check"
                size={18}
                color={TOKENS.colors.textInverse}
                style={{ marginRight: 8 }}
              />
              <Text style={styles.textoBotonPrimarioGuardar}>
                {guardando
                  ? 'Guardando...'
                  : esEdicion
                    ? 'Actualizar sesión'
                    : 'Guardar sesión'}
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
  cabeceraModal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
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
  bloqueTituloModal: {
    alignItems: 'center',
  },
  tituloModal: {
    color: TOKENS.colors.textPrimary,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  subtituloModal: {
    color: TOKENS.colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  espaciadorCabecera: {
    width: 44,
  },
  scrollFormulario: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 16,
  },
  grupoCampo: {
    marginBottom: 4,
  },
  filaLabel: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  labelCampo: {
    color: TOKENS.colors.textSecondary,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  contadorCaracteres: {
    color: TOKENS.colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },
  textoErrorCampo: {
    color: TOKENS.colors.danger,
    fontSize: 11,
    fontWeight: '600',
  },
  scrollMaterias: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  chipMateria: {
    height: 44,
    paddingHorizontal: 16,
    borderRadius: TOKENS.radii.md,
    backgroundColor: TOKENS.colors.surface,
    borderWidth: 1,
    borderColor: TOKENS.colors.borderDefault,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  chipMateriaActivo: {
    backgroundColor: TOKENS.colors.accentWhite,
    borderColor: TOKENS.colors.accentWhite,
  },
  textoChipMateria: {
    color: TOKENS.colors.textSecondary,
    fontSize: 13,
    fontWeight: '700',
  },
  textoChipMateriaActivo: {
    color: TOKENS.colors.textInverse,
    fontWeight: '800',
  },
  botonAgregarMateriaChip: {
    flexDirection: 'row',
    height: 44,
    paddingHorizontal: 14,
    borderRadius: TOKENS.radii.md,
    backgroundColor: TOKENS.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: TOKENS.colors.borderStrong,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  textoBotonAgregarMateria: {
    color: TOKENS.colors.textPrimary,
    fontSize: 12,
    fontWeight: '700',
  },
  panelNuevaMateriaEnLinea: {
    backgroundColor: TOKENS.colors.surfaceElevated,
    borderRadius: TOKENS.radii.md,
    padding: 12,
    borderWidth: 1,
    borderColor: TOKENS.colors.borderStrong,
    marginTop: 6,
    gap: 8,
  },
  subtituloNuevaMateria: {
    color: TOKENS.colors.textMuted,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  inputNombreMateria: {
    height: 44,
    backgroundColor: TOKENS.colors.surface,
    borderRadius: TOKENS.radii.sm,
    borderWidth: 1,
    borderColor: TOKENS.colors.borderDefault,
    paddingHorizontal: 12,
    color: TOKENS.colors.textPrimary,
    fontSize: 14,
  },
  filaCategoriaNuevaMateria: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pastillaCategoria: {
    flex: 1,
    height: 40,
    borderRadius: TOKENS.radii.sm,
    backgroundColor: TOKENS.colors.surface,
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
  botonConfirmarNuevaMateria: {
    width: 44,
    height: 40,
    borderRadius: TOKENS.radii.sm,
    backgroundColor: TOKENS.colors.accentWhite,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputTexto: {
    minHeight: 48,
    backgroundColor: TOKENS.colors.surface,
    borderRadius: TOKENS.radii.md,
    borderWidth: 1,
    borderColor: TOKENS.colors.borderDefault,
    paddingHorizontal: 14,
    color: TOKENS.colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  inputConError: {
    borderColor: TOKENS.colors.danger,
  },
  contenedorPastillasComprension: {
    flexDirection: 'row',
    backgroundColor: TOKENS.colors.surfaceElevated,
    borderRadius: TOKENS.radii.md,
    borderWidth: 1,
    borderColor: TOKENS.colors.borderDefault,
    padding: 3,
    gap: 3,
  },
  opcionComprension: {
    flex: 1,
    minHeight: 44,
    borderRadius: TOKENS.radii.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  opcionComprensionActiva: {
    backgroundColor: TOKENS.colors.accentWhite,
  },
  textoOpcionComprension: {
    color: TOKENS.colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
  },
  textoOpcionComprensionActiva: {
    color: TOKENS.colors.textInverse,
    fontWeight: '800',
  },
  filaChipsMinutos: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  chipMinutos: {
    flex: 1,
    height: 44,
    borderRadius: TOKENS.radii.sm,
    backgroundColor: TOKENS.colors.surface,
    borderWidth: 1,
    borderColor: TOKENS.colors.borderDefault,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipMinutosActivo: {
    backgroundColor: TOKENS.colors.accentWhite,
    borderColor: TOKENS.colors.accentWhite,
  },
  textoChipMinutos: {
    color: TOKENS.colors.textSecondary,
    fontSize: 13,
    fontWeight: '700',
  },
  textoChipMinutosActivo: {
    color: TOKENS.colors.textInverse,
    fontWeight: '800',
  },
  contenedorInputMinutosManual: {
    flex: 1.2,
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: TOKENS.colors.surface,
    borderRadius: TOKENS.radii.sm,
    borderWidth: 1,
    borderColor: TOKENS.colors.borderDefault,
    paddingHorizontal: 8,
  },
  inputMinutosManual: {
    flex: 1,
    color: TOKENS.colors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
    padding: 0,
    margin: 0,
  },
  inputTextArea: {
    minHeight: 140,
    maxHeight: 220,
    backgroundColor: TOKENS.colors.surface,
    borderRadius: TOKENS.radii.md,
    borderWidth: 1,
    borderColor: TOKENS.colors.borderDefault,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: TOKENS.colors.textPrimary,
    fontSize: 14,
    lineHeight: 20,
  },
  barraAccesoriaTeclado: {
    backgroundColor: TOKENS.colors.surfaceElevated,
    borderTopWidth: 1,
    borderTopColor: TOKENS.colors.borderDefault,
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignItems: 'flex-end',
  },
  botonDescartarTeclado: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: TOKENS.colors.surfaceInteractive,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: TOKENS.radii.pill,
    borderWidth: 1,
    borderColor: TOKENS.colors.borderStrong,
  },
  textoBotonDescartarTeclado: {
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
  },
  botonPrimarioGuardar: {
    height: TOKENS.touchTarget.ctaHeight,
    borderRadius: TOKENS.radii.md,
    backgroundColor: TOKENS.colors.accentWhite,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  botonDeshabilitado: {
    backgroundColor: TOKENS.colors.accentDisabled,
  },
  textoBotonPrimarioGuardar: {
    color: TOKENS.colors.textInverse,
    fontSize: 15,
    fontWeight: '800',
  },
});
