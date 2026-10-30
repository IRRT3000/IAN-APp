import React, { useMemo, useState } from 'react';
import {
  Keyboard,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import {
  MODOS_CONVERSION,
  convertirPeso,
  normalizarInputPeso,
} from '../utils/conversionPeso';
import { vibrarSeleccionBascula } from '../services/haptics';
import { TOKENS } from '../theme/tokens';
import { useSafeInsets } from '../utils/useSafeInsets';

/**
 * Modal Flotante Superior de Conversión de Peso (Spec 013).
 * Interfaz Matte Luxury OLED posicionada en la zona superior de la pantalla
 * para garantizar que el teclado numérico jamás oculte el resultado en tiempo real.
 * 
 * Reglas de diseño del proyecto:
 * - Cero emojis: iconografía exclusiva con Feather (`repeat`, `check`, `x`).
 * - Tokens Dark Luxury OLED (#0A0A0A, #141414, #1C1C1E, #262626, #FFFFFF, #8E8E93).
 * - Touch targets >= 44x44pt.
 * - Despliegue superior seguro sobre insets para evitar solapamiento con teclado.
 */
export default function CalculadoraPesoModal({
  visible = false,
  onCerrar,
  onAplicar,
  modoInicial = MODOS_CONVERSION.LBS_A_KG,
  valorInicial = '',
}) {
  const insets = useSafeInsets();
  const [modo, setModo] = useState(modoInicial);
  const [inputPeso, setInputPeso] = useState(valorInicial ? String(valorInicial) : '');

  const resultado = useMemo(() => {
    return convertirPeso({ valor: inputPeso, modo });
  }, [inputPeso, modo]);

  if (!visible) {
    return null;
  }

  const alternarModo = (nuevoModo) => {
    if (modo !== nuevoModo) {
      vibrarSeleccionBascula();
      setModo(nuevoModo);
    }
  };

  const manejarCambioTexto = (texto) => {
    const normalizado = normalizarInputPeso(texto);
    setInputPeso(normalizado);
  };

  const manejarAccionPrincipal = () => {
    vibrarSeleccionBascula();
    if (typeof onAplicar === 'function' && resultado.esValido) {
      onAplicar(resultado.valorConvertido, resultado.unidadDestino);
    }
    if (typeof onCerrar === 'function') {
      onCerrar();
    }
  };

  const esLbsAKg = modo === MODOS_CONVERSION.LBS_A_KG;

  return (
    <Modal
      visible={visible}
      transparent={true}
      statusBarTranslucent
      animationType="fade"
      onRequestClose={onCerrar}
    >
      <TouchableWithoutFeedback onPress={onCerrar}>
        <View
          style={[
            styles.backdropOverlay,
            { paddingTop: Math.max(insets.top, 24) + 12 },
          ]}
        >
          {/* Tarjeta flotante superior para evitar el teclado */}
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.tarjetaFlotante}>
              {/* Cabecera del Panel */}
              <View style={styles.cabecera}>
                <View style={styles.bloqueTitulo}>
                  <Text style={styles.tituloModal}>Conversión de Peso</Text>
                  <Text style={styles.subtituloModal}>Báscula en tiempo real</Text>
                </View>

                <TouchableOpacity
                  style={styles.botonCerrar}
                  onPress={onCerrar}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  accessibilityLabel="Cerrar calculadora de peso"
                >
                  <Feather name="x" size={20} color={TOKENS.colors.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* Selector Pastilla Unificada [ Lbs ➔ Kg | Kg ➔ Lbs ] */}
              <View style={styles.contenedorPastilla}>
                <TouchableOpacity
                  style={[
                    styles.opcionPastilla,
                    esLbsAKg && styles.opcionPastillaActiva,
                  ]}
                  onPress={() => alternarModo(MODOS_CONVERSION.LBS_A_KG)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.textoPastilla,
                      esLbsAKg && styles.textoPastillaActivo,
                    ]}
                  >
                    Lbs ➔ Kg
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.opcionPastilla,
                    !esLbsAKg && styles.opcionPastillaActiva,
                  ]}
                  onPress={() => alternarModo(MODOS_CONVERSION.KG_A_LBS)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.textoPastilla,
                      !esLbsAKg && styles.textoPastillaActivo,
                    ]}
                  >
                    Kg ➔ Lbs
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Hero Input Numérico */}
              <View style={styles.tarjetaInput}>
                <Text style={styles.etiquetaCampo}>
                  {esLbsAKg ? 'PESO EN LIBRAS (LBS)' : 'PESO EN KILOGRAMOS (KG)'}
                </Text>
                <View style={styles.filaHeroInput}>
                  <TextInput
                    style={styles.heroInput}
                    value={inputPeso}
                    onChangeText={manejarCambioTexto}
                    keyboardType="decimal-pad"
                    placeholder="0.0"
                    placeholderTextColor={TOKENS.colors.textMuted}
                    autoFocus={true}
                    maxLength={7}
                    selectTextOnFocus
                  />
                  <Text style={styles.unidadHeroInput}>
                    {esLbsAKg ? 'lbs' : 'kg'}
                  </Text>
                </View>
              </View>

              {/* Visor de Resultado Reactivo Inmediato */}
              <View style={styles.tarjetaResultado}>
                <View style={styles.filaResultadoCabecera}>
                  <Text style={styles.etiquetaResultado}>RESULTADO CONVERTIDO</Text>
                  <Feather
                    name="repeat"
                    size={13}
                    color={TOKENS.colors.textSecondary}
                  />
                </View>

                <View style={styles.filaValorResultado}>
                  <Text
                    style={[
                      styles.valorResultado,
                      !resultado.esValido && styles.valorResultadoInvalido,
                    ]}
                  >
                    {resultado.esValido ? resultado.valorConvertido : '0.0'}
                  </Text>
                  <Text style={styles.unidadResultado}>
                    {esLbsAKg ? 'kg' : 'lbs'}
                  </Text>
                </View>

                <Text style={styles.textoFormula}>
                  {esLbsAKg
                    ? '1 lb = 0.4536 kg · Redondeo a 1 decimal'
                    : '1 kg = 2.2046 lbs · Redondeo a 1 decimal'}
                </Text>
              </View>

              {/* Botón CTA Listo / Aplicar */}
              <TouchableOpacity
                style={styles.botonAccionPrincipal}
                onPress={manejarAccionPrincipal}
                activeOpacity={0.85}
              >
                <Feather
                  name="check"
                  size={18}
                  color={TOKENS.colors.textInverse}
                  style={{ marginRight: 8 }}
                />
                <Text style={styles.textoBotonAccionPrincipal}>
                  {typeof onAplicar === 'function' ? 'Aplicar valor' : 'Listo'}
                </Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdropOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.78)',
    justifyContent: 'flex-start',
    paddingHorizontal: 16,
  },
  tarjetaFlotante: {
    backgroundColor: TOKENS.colors.surface,
    borderRadius: TOKENS.radii.lg,
    borderWidth: 1,
    borderColor: TOKENS.colors.borderDefault,
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 18,
    elevation: 24,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
  },
  cabecera: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  bloqueTitulo: {
    flex: 1,
  },
  tituloModal: {
    color: TOKENS.colors.textPrimary,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  subtituloModal: {
    color: TOKENS.colors.textSecondary,
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  botonCerrar: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contenedorPastilla: {
    flexDirection: 'row',
    backgroundColor: TOKENS.colors.surfaceElevated,
    borderRadius: TOKENS.radii.md,
    borderWidth: 1,
    borderColor: TOKENS.colors.borderDefault,
    padding: 4,
    marginBottom: 12,
  },
  opcionPastilla: {
    flex: 1,
    minHeight: 44,
    borderRadius: TOKENS.radii.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  opcionPastillaActiva: {
    backgroundColor: TOKENS.colors.accentWhite,
  },
  textoPastilla: {
    color: TOKENS.colors.textSecondary,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  textoPastillaActivo: {
    color: TOKENS.colors.textInverse,
    fontWeight: '800',
  },
  tarjetaInput: {
    backgroundColor: TOKENS.colors.surfaceElevated,
    borderRadius: TOKENS.radii.md,
    borderWidth: 1,
    borderColor: TOKENS.colors.borderDefault,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 10,
  },
  etiquetaCampo: {
    color: TOKENS.colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  filaHeroInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroInput: {
    flex: 1,
    color: TOKENS.colors.textPrimary,
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.5,
    padding: 0,
    margin: 0,
  },
  unidadHeroInput: {
    color: TOKENS.colors.textSecondary,
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
  },
  tarjetaResultado: {
    backgroundColor: TOKENS.colors.canvas,
    borderRadius: TOKENS.radii.md,
    borderWidth: 1,
    borderColor: TOKENS.colors.borderStrong,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
  },
  filaResultadoCabecera: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  etiquetaResultado: {
    color: TOKENS.colors.textSecondary,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  filaValorResultado: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 2,
  },
  valorResultado: {
    color: TOKENS.colors.textPrimary,
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: -0.6,
  },
  valorResultadoInvalido: {
    color: TOKENS.colors.textMuted,
  },
  unidadResultado: {
    color: TOKENS.colors.textSecondary,
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 8,
  },
  textoFormula: {
    color: TOKENS.colors.textMuted,
    fontSize: 11,
    fontWeight: '500',
  },
  botonAccionPrincipal: {
    backgroundColor: TOKENS.colors.accentWhite,
    borderRadius: TOKENS.radii.md,
    height: 48,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  textoBotonAccionPrincipal: {
    color: TOKENS.colors.textInverse,
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
});
