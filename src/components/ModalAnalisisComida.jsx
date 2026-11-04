import React, { useState } from 'react';
import {
  ActivityIndicator,
  Image,
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
import { TOKENS } from '../theme/tokens';
import { useSafeInsets } from '../utils/useSafeInsets';
import { analizarComidaConGemini } from '../services/gemini';
import { sanearValoresComida } from '../utils/validacionComida';

export default function ModalAnalisisComida({
  visible,
  fotoUri,
  fotoBase64,
  tipoComida = 'Comida',
  perfilUsuario = null,
  onCambiarFoto,
  onCerrar,
  onGuardar,
}) {
  const insets = useSafeInsets();
  const [estadoModal, setEstadoModal] = useState('preparacion'); // 'preparacion' | 'analizando' | 'revision'
  const [descripcionUsuario, setDescripcionUsuario] = useState('');
  const [textoProgreso, setTextoProgreso] = useState('');
  const [errorAnalisis, setErrorAnalisis] = useState('');

  // Campos editables del estado de revisión
  const [nombreEditado, setNombreEditado] = useState('');
  const [caloriasEditadas, setCaloriasEditadas] = useState('0');
  const [proteinasEditadas, setProteinasEditadas] = useState('0');
  const [carbohidratosEditados, setCarbohidratosEditados] = useState('0');
  const [grasasEditadas, setGrasasEditadas] = useState('0');
  const [detallesIA, setDetallesIA] = useState('');
  const [guardando, setGuardando] = useState(false);

  const ejecutarAnalisis = async () => {
    try {
      setEstadoModal('analizando');
      setErrorAnalisis('');
      setTextoProgreso('Iniciando análisis multimodal con Gemini Vision...');

      const resultado = await analizarComidaConGemini(fotoBase64, tipoComida, {
        descripcionUsuario,
        perfilUsuario,
        onProgreso: (info) => {
          setTextoProgreso(`Consultando ${info.modelo} (${info.indice}/${info.total})...`);
        },
      });

      const saneado = sanearValoresComida({
        nombre: resultado?.nombre || `${tipoComida} analizado`,
        calorias: resultado?.calorias,
        proteinas: resultado?.proteinas ?? resultado?.macros?.proteinas,
        carbohidratos: resultado?.carbohidratos ?? resultado?.macros?.carbohidratos,
        grasas: resultado?.grasas ?? resultado?.macros?.grasas,
        detalles: resultado?.detalles,
      });

      setNombreEditado(saneado.nombre);
      setCaloriasEditadas(String(saneado.calorias));
      setProteinasEditadas(String(saneado.proteinas));
      setCarbohidratosEditados(String(saneado.carbohidratos));
      setGrasasEditadas(String(saneado.grasas));
      setDetallesIA(saneado.detalles);
      setEstadoModal('revision');
    } catch (error) {
      setErrorAnalisis(
        error?.message || 'No se pudo analizar la foto. Conservamos tus datos para reintentar.'
      );
      setEstadoModal('preparacion'); // Preserva foto y descripción (Defensa 1)
    }
  };

  const handleConfirmarGuardado = async () => {
    if (guardando) return;
    try {
      setGuardando(true);
      const comidaSaneada = sanearValoresComida({
        nombre: nombreEditado,
        nombreDefault: `${tipoComida} analizado`,
        calorias: caloriasEditadas,
        proteinas: proteinasEditadas,
        carbohidratos: carbohidratosEditados,
        grasas: grasasEditadas,
        detalles: detallesIA,
      });

      await onGuardar?.(comidaSaneada);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCerrar}
    >
      <View style={styles.backdrop}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardContainer}
        >
          <View
            style={[
              styles.tarjetaModal,
              {
                paddingTop: Math.max(16, insets.top),
                paddingBottom: Math.max(16, insets.bottom),
              },
            ]}
          >
            {/* Cabecera común fija */}
            <View style={styles.cabecera}>
              <View style={styles.columnaCabecera}>
                <Text style={styles.tituloCabecera}>
                  {estadoModal === 'revision'
                    ? 'Revisión Nutricional'
                    : 'Análisis Contextual'}
                </Text>
                <View style={styles.badgeTipo}>
                  <Text style={styles.textoBadgeTipo}>
                    {tipoComida?.toUpperCase()}
                  </Text>
                </View>
              </View>

              {estadoModal !== 'analizando' ? (
                <TouchableOpacity
                  style={styles.botonCerrar}
                  onPress={onCerrar}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                >
                  <Feather name="x" size={20} color={TOKENS.colors.textSecondary} />
                </TouchableOpacity>
              ) : null}
            </View>

            {/* Cuerpo con ScrollView */}
            <ScrollView
              style={styles.scrollArea}
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {/* ESTADO 1: PREPARACIÓN */}
              {estadoModal === 'preparacion' ? (
                <View style={styles.bloqueEstado}>
                  {fotoUri ? (
                    <View style={styles.contenedorFoto}>
                      <Image source={{ uri: fotoUri }} style={styles.fotoPrevia} />
                      {typeof onCambiarFoto === 'function' ? (
                        <TouchableOpacity
                          style={styles.botonCambiarFoto}
                          onPress={onCambiarFoto}
                          activeOpacity={0.8}
                        >
                          <Feather name="camera" size={14} color={TOKENS.colors.textPrimary} />
                          <Text style={styles.textoCambiarFoto}>Cambiar foto</Text>
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  ) : null}

                  <Text style={styles.etiquetaCampo}>
                    DESCRIPCIÓN Y PORCIONES (OPCIONAL)
                  </Text>
                  <TextInput
                    style={styles.inputMultiline}
                    placeholder="Ej: 200g pechuga a la plancha, 1 taza arroz blanco, 1 cdta aceite de oliva..."
                    placeholderTextColor={TOKENS.colors.textMuted}
                    multiline
                    numberOfLines={3}
                    value={descripcionUsuario}
                    onChangeText={setDescripcionUsuario}
                  />

                  {errorAnalisis ? (
                    <View style={styles.bloqueError}>
                      <Feather
                        name="alert-circle"
                        size={14}
                        color={TOKENS.colors.danger}
                        style={{ marginRight: 6 }}
                      />
                      <Text style={styles.textoError}>{errorAnalisis}</Text>
                    </View>
                  ) : null}
                </View>
              ) : null}

              {/* ESTADO 2: ANALIZANDO */}
              {estadoModal === 'analizando' ? (
                <View style={styles.bloqueAnalizando}>
                  <ActivityIndicator size="large" color={TOKENS.colors.accentWhite} />
                  <Text style={styles.textoAnalizandoTitulo}>
                    Desglosando nutrientes
                  </Text>
                  <Text style={styles.textoAnalizandoProgreso}>{textoProgreso}</Text>
                </View>
              ) : null}

              {/* ESTADO 3: REVISIÓN */}
              {estadoModal === 'revision' ? (
                <View style={styles.bloqueEstado}>
                  <View style={styles.filaMiniaturaNombre}>
                    {fotoUri ? (
                      <Image source={{ uri: fotoUri }} style={styles.fotoMiniatura} />
                    ) : null}
                    <View style={styles.columnaNombrePlato}>
                      <Text style={styles.etiquetaCampo}>NOMBRE DEL PLATO</Text>
                      <TextInput
                        style={styles.inputSimple}
                        value={nombreEditado}
                        onChangeText={setNombreEditado}
                        placeholder="Nombre de la comida"
                        placeholderTextColor={TOKENS.colors.textMuted}
                      />
                    </View>
                  </View>

                  <Text style={[styles.etiquetaCampo, { marginTop: 16 }]}>
                    MACRONUTRIENTES ESTIMADOS (EDITABLES)
                  </Text>

                  <View style={styles.gridMacros}>
                    <View style={styles.cajaMacro}>
                      <Text style={styles.etiquetaMacroInput}>CALORÍAS (KCAL)</Text>
                      <TextInput
                        style={styles.inputMacro}
                        keyboardType="numeric"
                        value={caloriasEditadas}
                        onChangeText={setCaloriasEditadas}
                      />
                    </View>
                    <View style={styles.cajaMacro}>
                      <Text style={styles.etiquetaMacroInput}>PROTEÍNAS (G)</Text>
                      <TextInput
                        style={styles.inputMacro}
                        keyboardType="decimal-pad"
                        value={proteinasEditadas}
                        onChangeText={setProteinasEditadas}
                      />
                    </View>
                    <View style={styles.cajaMacro}>
                      <Text style={styles.etiquetaMacroInput}>CARBOS (G)</Text>
                      <TextInput
                        style={styles.inputMacro}
                        keyboardType="decimal-pad"
                        value={carbohidratosEditados}
                        onChangeText={setCarbohidratosEditados}
                      />
                    </View>
                    <View style={styles.cajaMacro}>
                      <Text style={styles.etiquetaMacroInput}>GRASAS (G)</Text>
                      <TextInput
                        style={styles.inputMacro}
                        keyboardType="decimal-pad"
                        value={grasasEditadas}
                        onChangeText={setGrasasEditadas}
                      />
                    </View>
                  </View>

                  {detallesIA ? (
                    <View style={styles.bloqueDetallesIA}>
                      <View style={styles.filaCabeceraDetalles}>
                        <Feather
                          name="target"
                          size={11}
                          color={TOKENS.colors.textSecondary}
                          style={{ marginRight: 6 }}
                        />
                        <Text style={styles.etiquetaDetalles}>
                          EVALUACIÓN BIOMÉTRICA IA
                        </Text>
                      </View>
                      <Text style={styles.textoDetalles}>{detallesIA}</Text>
                    </View>
                  ) : null}
                </View>
              ) : null}
            </ScrollView>

            {/* Footer Fijo con Acciones Destacadas en Thumb Zone */}
            {estadoModal === 'preparacion' ? (
              <View style={styles.footerAcciones}>
                <TouchableOpacity
                  style={styles.botonPrimarioLleno}
                  onPress={ejecutarAnalisis}
                  activeOpacity={0.85}
                >
                  <Feather
                    name="cpu"
                    size={16}
                    color={TOKENS.colors.textInverse}
                    style={{ marginRight: 8 }}
                  />
                  <Text style={styles.textoBotonPrimario}>Analizar con IA</Text>
                </TouchableOpacity>
              </View>
            ) : null}

            {estadoModal === 'revision' ? (
              <View style={styles.footerAcciones}>
                <View style={styles.thumbZoneAccionesRevision}>
                  <TouchableOpacity
                    style={styles.botonSecundario}
                    onPress={onCerrar}
                    disabled={guardando}
                    activeOpacity={0.8}
                  >
                    <Feather
                      name="trash-2"
                      size={16}
                      color={TOKENS.colors.danger}
                      style={{ marginRight: 6 }}
                    />
                    <Text style={styles.textoBotonSecundario}>Descartar</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.botonPrimario}
                    onPress={handleConfirmarGuardado}
                    disabled={guardando}
                    activeOpacity={0.85}
                  >
                    <Feather
                      name="check"
                      size={16}
                      color={TOKENS.colors.textInverse}
                      style={{ marginRight: 6 }}
                    />
                    <Text style={styles.textoBotonPrimario}>Guardar en mi día</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : null}
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    padding: TOKENS.spacing.md,
  },
  keyboardContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  tarjetaModal: {
    backgroundColor: TOKENS.colors.surface,
    borderColor: TOKENS.colors.borderDefault,
    borderWidth: 1,
    borderRadius: TOKENS.radii.lg,
    maxHeight: '92%',
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: TOKENS.spacing.md,
  },
  scrollArea: {
    flexShrink: 1,
  },
  scrollContent: {
    paddingVertical: TOKENS.spacing.xs,
  },
  cabecera: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: TOKENS.spacing.sm,
  },
  columnaCabecera: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tituloCabecera: {
    ...TOKENS.typography.title,
    fontSize: 16,
    marginRight: TOKENS.spacing.sm,
  },
  badgeTipo: {
    backgroundColor: TOKENS.colors.surfaceElevated,
    borderColor: TOKENS.colors.borderDefault,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: TOKENS.radii.sm,
  },
  textoBadgeTipo: {
    ...TOKENS.typography.labelCategory,
    fontSize: 9,
    color: TOKENS.colors.textPrimary,
  },
  botonCerrar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: TOKENS.colors.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bloqueEstado: {
    width: '100%',
  },
  contenedorFoto: {
    position: 'relative',
    width: '100%',
    height: 135,
    borderRadius: TOKENS.radii.md,
    overflow: 'hidden',
    backgroundColor: TOKENS.colors.surfaceElevated,
    marginBottom: TOKENS.spacing.sm,
  },
  fotoPrevia: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  botonCambiarFoto: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.75)',
    borderColor: TOKENS.colors.borderStrong,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: TOKENS.radii.pill,
    flexDirection: 'row',
    alignItems: 'center',
  },
  textoCambiarFoto: {
    ...TOKENS.typography.subtitle,
    fontSize: 11,
    color: TOKENS.colors.textPrimary,
    marginLeft: 5,
  },
  etiquetaCampo: {
    ...TOKENS.typography.labelCategory,
    fontSize: 10,
    marginBottom: 6,
  },
  inputMultiline: {
    backgroundColor: TOKENS.colors.surfaceElevated,
    borderColor: TOKENS.colors.borderDefault,
    borderWidth: 1,
    borderRadius: TOKENS.radii.md,
    color: TOKENS.colors.textPrimary,
    padding: TOKENS.spacing.sm + 4,
    fontSize: 13,
    textAlignVertical: 'top',
    minHeight: 60,
    marginBottom: TOKENS.spacing.sm,
  },
  inputSimple: {
    backgroundColor: TOKENS.colors.surfaceElevated,
    borderColor: TOKENS.colors.borderDefault,
    borderWidth: 1,
    borderRadius: TOKENS.radii.md,
    color: TOKENS.colors.textPrimary,
    paddingHorizontal: TOKENS.spacing.sm + 4,
    paddingVertical: 8,
    fontSize: 14,
  },
  bloqueAnalizando: {
    paddingVertical: TOKENS.spacing.xxl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textoAnalizandoTitulo: {
    ...TOKENS.typography.title,
    marginTop: TOKENS.spacing.md,
    fontSize: 15,
  },
  textoAnalizandoProgreso: {
    ...TOKENS.typography.subtitle,
    fontSize: 12,
    marginTop: 6,
    textAlign: 'center',
  },
  bloqueError: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: TOKENS.colors.dangerBg,
    borderColor: TOKENS.colors.danger,
    borderWidth: 1,
    borderRadius: TOKENS.radii.sm,
    padding: TOKENS.spacing.sm,
    marginBottom: TOKENS.spacing.md,
  },
  textoError: {
    color: TOKENS.colors.danger,
    fontSize: 12,
    flex: 1,
  },
  filaMiniaturaNombre: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: TOKENS.spacing.sm,
  },
  fotoMiniatura: {
    width: 60,
    height: 60,
    borderRadius: TOKENS.radii.sm,
    marginRight: TOKENS.spacing.sm,
    backgroundColor: TOKENS.colors.surfaceElevated,
  },
  columnaNombrePlato: {
    flex: 1,
  },
  gridMacros: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: TOKENS.spacing.md,
  },
  cajaMacro: {
    width: '48%',
    backgroundColor: TOKENS.colors.surfaceElevated,
    borderColor: TOKENS.colors.borderDefault,
    borderWidth: 1,
    borderRadius: TOKENS.radii.md,
    padding: TOKENS.spacing.sm,
    marginBottom: TOKENS.spacing.sm,
  },
  etiquetaMacroInput: {
    ...TOKENS.typography.labelCategory,
    fontSize: 9,
    marginBottom: 4,
  },
  inputMacro: {
    ...TOKENS.typography.metricValue,
    fontSize: 18,
    color: TOKENS.colors.textPrimary,
    padding: 0,
  },
  bloqueDetallesIA: {
    backgroundColor: TOKENS.colors.surfaceElevated,
    borderColor: TOKENS.colors.borderDefault,
    borderWidth: 1,
    borderRadius: TOKENS.radii.md,
    padding: TOKENS.spacing.sm + 4,
    marginBottom: TOKENS.spacing.md,
  },
  filaCabeceraDetalles: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  etiquetaDetalles: {
    ...TOKENS.typography.labelCategory,
    fontSize: 9,
  },
  textoDetalles: {
    ...TOKENS.typography.subtitle,
    color: TOKENS.colors.textPrimary,
    fontSize: 12,
    lineHeight: 17,
  },
  thumbZoneAcciones: {
    marginTop: TOKENS.spacing.sm,
  },
  thumbZoneAccionesRevision: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: TOKENS.spacing.sm,
  },
  botonPrimario: {
    flex: 1,
    backgroundColor: TOKENS.colors.accentWhite,
    borderRadius: TOKENS.radii.md,
    height: TOKENS.touchTarget.minHeight,
    minHeight: TOKENS.touchTarget.minSize,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    marginLeft: 6,
  },
  textoBotonPrimario: {
    color: TOKENS.colors.textInverse,
    fontWeight: '700',
    fontSize: 14,
  },
  botonSecundario: {
    flex: 0.8,
    backgroundColor: TOKENS.colors.surfaceElevated,
    borderColor: TOKENS.colors.borderDefault,
    borderWidth: 1,
    borderRadius: TOKENS.radii.md,
    height: TOKENS.touchTarget.minHeight,
    minHeight: TOKENS.touchTarget.minSize,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    marginRight: 6,
  },
  textoBotonSecundario: {
    color: TOKENS.colors.danger,
    fontWeight: '600',
    fontSize: 14,
  },
  footerAcciones: {
    paddingTop: TOKENS.spacing.sm,
    marginTop: TOKENS.spacing.xs,
    borderTopWidth: 1,
    borderTopColor: TOKENS.colors.borderDefault,
  },
  botonPrimarioLleno: {
    width: '100%',
    backgroundColor: TOKENS.colors.accentWhite,
    borderRadius: TOKENS.radii.md,
    height: TOKENS.touchTarget.minHeight,
    minHeight: TOKENS.touchTarget.minSize,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
});
