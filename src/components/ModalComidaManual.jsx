/**
 * Formulario para registrar una comida a mano o editar una de hoy (Spec 028, RF-1 y RF-2).
 * No usa foto ni Gemini.
 */
import React, { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import ModalAccesible from './ModalAccesible';
import { Text, TextInput } from './base/Texto';
import { TOKENS } from '../theme/tokens';
import { useSafeInsets } from '../utils/useSafeInsets';
import { LIMITE_NOMBRE_COMIDA, sanearValoresComida } from '../utils/validacionComida';
import { estilosFormulario as styles } from './nutricion/estilosFormulario';

export const TIPOS_COMIDA = ['Desayuno', 'Comida', 'Cena', 'Snack'];

const aTexto = (v) => (v === undefined || v === null || Number(v) === 0 ? '' : String(v));

const CAMPOS_NUMERICOS = [
  { clave: 'calorias', titulo: 'CALORÍAS (KCAL)', etiqueta: 'Calorías en kilocalorías', teclado: 'number-pad' },
  { clave: 'proteinas', titulo: 'PROTEÍNAS (G)', etiqueta: 'Proteínas en gramos', teclado: 'decimal-pad' },
  { clave: 'carbohidratos', titulo: 'CARBOS (G)', etiqueta: 'Carbohidratos en gramos', teclado: 'decimal-pad' },
  { clave: 'grasas', titulo: 'GRASAS (G)', etiqueta: 'Grasas en gramos', teclado: 'decimal-pad' },
];

export default function ModalComidaManual({
  visible,
  comidaInicial = null,
  tipoInicial = 'Desayuno',
  onCerrar,
  onGuardar,
}) {
  const insets = useSafeInsets();
  const esEdicion = Boolean(comidaInicial);
  const [nombre, setNombre] = useState(
    String(comidaInicial?.nombre || comidaInicial?.descripcion || '')
  );
  const [tipo, setTipo] = useState(
    TIPOS_COMIDA.includes(comidaInicial?.tipo) ? comidaInicial.tipo : tipoInicial
  );
  const [valores, setValores] = useState({
    calorias: aTexto(comidaInicial?.calorias),
    proteinas: aTexto(comidaInicial?.proteinas ?? comidaInicial?.macros?.proteinas),
    carbohidratos: aTexto(comidaInicial?.carbohidratos ?? comidaInicial?.macros?.carbohidratos),
    grasas: aTexto(comidaInicial?.grasas ?? comidaInicial?.macros?.grasas),
  });
  const [guardando, setGuardando] = useState(false);
  const guardandoRef = useRef(false);

  const nombreValido = nombre.trim().length > 0;
  const deshabilitado = !nombreValido || guardando;

  const cambiarValor = (clave, texto) => setValores((prev) => ({ ...prev, [clave]: texto }));

  const guardar = async () => {
    if (deshabilitado || guardandoRef.current) return;
    guardandoRef.current = true;
    setGuardando(true);
    try {
      const saneado = sanearValoresComida({ nombre: nombre.trim(), ...valores });
      await onGuardar?.(
        {
          nombre: saneado.nombre,
          calorias: saneado.calorias,
          proteinas: saneado.proteinas,
          carbohidratos: saneado.carbohidratos,
          grasas: saneado.grasas,
        },
        tipo
      );
    } finally {
      guardandoRef.current = false;
      setGuardando(false);
    }
  };

  const titulo = esEdicion ? 'Editar comida' : 'Registrar comida';

  return (
    <ModalAccesible visible={visible} transparent animationType="fade" onRequestClose={onCerrar}>
      {/* Spec 029: el inset inferior no se usa; en Android edge-to-edge puede incluir el teclado. */}
      <View style={[styles.backdrop, { paddingTop: insets.top + TOKENS.spacing.md }]}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardContainer}
        >
          <View
            style={styles.tarjetaModal}
          >
            <View style={styles.cabecera}>
              <Text style={styles.tituloCabecera} accessibilityRole="header">
                {titulo}
              </Text>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Cerrar sin guardar"
                style={styles.botonCerrar}
                onPress={onCerrar}
              >
                <Feather name="x" size={20} color={TOKENS.colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.scrollArea}
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.etiquetaCampo}>NOMBRE DEL PLATO</Text>
              <TextInput
                accessibilityLabel="Nombre del plato, obligatorio"
                style={styles.inputSimple}
                value={nombre}
                onChangeText={setNombre}
                maxLength={LIMITE_NOMBRE_COMIDA}
                placeholder="Ej. Pollo con arroz"
                placeholderTextColor={TOKENS.colors.textMuted}
              />

              <Text style={styles.etiquetaCampo}>TIPO DE COMIDA</Text>
              <View style={styles.filaChips} accessibilityRole="radiogroup">
                {TIPOS_COMIDA.map((t) => {
                  const activo = tipo === t;
                  return (
                    <TouchableOpacity
                      key={t}
                      accessibilityRole="radio"
                      accessibilityLabel={`Tipo de comida: ${t}`}
                      aria-checked={activo}
                      style={[styles.chip, activo && styles.chipActivo]}
                      onPress={() => setTipo(t)}
                    >
                      <Text style={[styles.textoChip, activo && styles.textoChipActivo]}>{t}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.etiquetaCampo}>CALORÍAS Y MACROS (OPCIONALES)</Text>
              <View style={styles.gridMacros}>
                {CAMPOS_NUMERICOS.map((campo) => (
                  <View key={campo.clave} style={styles.cajaMacro}>
                    <Text style={styles.etiquetaMacroInput}>{campo.titulo}</Text>
                    <TextInput
                      accessibilityLabel={campo.etiqueta}
                      style={styles.inputMacro}
                      keyboardType={campo.teclado}
                      value={valores[campo.clave]}
                      onChangeText={(texto) => cambiarValor(campo.clave, texto)}
                      placeholder="0"
                      placeholderTextColor={TOKENS.colors.textMuted}
                    />
                  </View>
                ))}
              </View>
              {!nombreValido ? (
                <Text style={styles.textoAyuda}>Escribe el nombre del plato para poder guardar.</Text>
              ) : null}
            </ScrollView>

            <View style={styles.footerAcciones}>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Cancelar"
                style={styles.botonSecundario}
                onPress={onCerrar}
              >
                <Text style={styles.textoBotonSecundario}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={esEdicion ? 'Guardar cambios' : 'Guardar en mi día'}
                aria-disabled={deshabilitado || undefined}
                aria-busy={guardando || undefined}
                style={[styles.botonPrimario, deshabilitado && styles.botonDeshabilitado]}
                onPress={guardar}
                disabled={deshabilitado}
              >
                <Feather
                  name="check"
                  size={16}
                  color={TOKENS.colors.textInverse}
                  style={{ marginRight: 6 }}
                />
                <Text style={styles.textoBotonPrimario}>
                  {esEdicion ? 'Guardar cambios' : 'Guardar'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </ModalAccesible>
  );
}
