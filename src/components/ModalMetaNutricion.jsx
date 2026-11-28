/**
 * Meta diaria de kcal y macros: automática desde el perfil o propia (Spec 028, RF-4).
 */
import React, { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import ModalAccesible from './ModalAccesible';
import { Text, TextInput } from './base/Texto';
import { TOKENS } from '../theme/tokens';
import { useSafeInsets } from '../utils/useSafeInsets';
import { LIMITES_META_NUTRICION } from '../services/storage';
import { anunciarError } from '../utils/accesibilidad';
import { reescalarMacros } from '../utils/metaNutricional';
import { estilosFormulario as styles } from './nutricion/estilosFormulario';

const CAMPOS = [
  { clave: 'calorias', titulo: 'CALORÍAS (KCAL)', etiqueta: 'Meta de calorías en kilocalorías' },
  { clave: 'proteinas', titulo: 'PROTEÍNAS (G)', etiqueta: 'Meta de proteínas en gramos' },
  { clave: 'carbohidratos', titulo: 'CARBOS (G)', etiqueta: 'Meta de carbohidratos en gramos' },
  { clave: 'grasas', titulo: 'GRASAS (G)', etiqueta: 'Meta de grasas en gramos' },
];

const aNumero = (texto) => Number(String(texto ?? '').replace(',', '.').trim());

/** Devuelve el mensaje de error o '' si los valores están en rango. */
export function validarMetaEditada(valores) {
  const kcal = aNumero(valores.calorias);
  const { calorias: lk, macro: lm } = LIMITES_META_NUTRICION;
  if (!Number.isFinite(kcal) || kcal < lk.min || kcal > lk.max) {
    return `Las calorías deben estar entre ${lk.min} y ${lk.max}.`;
  }
  const fuera = ['proteinas', 'carbohidratos', 'grasas'].some((k) => {
    const n = aNumero(valores[k]);
    return String(valores[k] ?? '').trim() === '' || !Number.isFinite(n) || n < lm.min || n > lm.max;
  });
  return fuera ? `Cada macro debe estar entre ${lm.min} y ${lm.max} g.` : '';
}

export default function ModalMetaNutricion({
  visible,
  metaActiva,
  metaAutomatica,
  onCerrar,
  onGuardar,
}) {
  const insets = useSafeInsets();
  const [valores, setValores] = useState({
    calorias: String(metaActiva?.calorias ?? ''),
    proteinas: String(metaActiva?.proteinas ?? ''),
    carbohidratos: String(metaActiva?.carbohidratos ?? ''),
    grasas: String(metaActiva?.grasas ?? ''),
  });
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);
  const guardandoRef = useRef(false);
  // Reparto del que parte el reescalado al cambiar las kcal (Spec 029, CA-4).
  const baseRef = useRef({
    calorias: Number(metaActiva?.calorias),
    proteinas: Number(metaActiva?.proteinas),
    carbohidratos: Number(metaActiva?.carbohidratos),
    grasas: Number(metaActiva?.grasas),
  });

  const cambiarCampo = (clave, texto) => {
    setError('');
    const siguiente = { ...valores, [clave]: texto };
    if (clave === 'calorias') {
      const macros = reescalarMacros(baseRef.current, aNumero(texto));
      setValores(
        macros
          ? {
              ...siguiente,
              proteinas: String(macros.proteinas),
              carbohidratos: String(macros.carbohidratos),
              grasas: String(macros.grasas),
            }
          : siguiente
      );
      return;
    }
    // Un macro editado a mano pasa a ser la base. Solo se toman unas kcal en rango
    // para que un valor parcial («5») no deforme el reparto.
    const kcal = aNumero(siguiente.calorias);
    const { min, max } = LIMITES_META_NUTRICION.calorias;
    baseRef.current = {
      calorias: Number.isFinite(kcal) && kcal >= min && kcal <= max ? kcal : baseRef.current.calorias,
      proteinas: aNumero(siguiente.proteinas),
      carbohidratos: aNumero(siguiente.carbohidratos),
      grasas: aNumero(siguiente.grasas),
    };
    setValores(siguiente);
  };

  const ejecutar = async (meta) => {
    if (guardandoRef.current) return;
    guardandoRef.current = true;
    setGuardando(true);
    try {
      await onGuardar?.(meta);
    } finally {
      guardandoRef.current = false;
      setGuardando(false);
    }
  };

  const guardarPropia = () => {
    const mensaje = validarMetaEditada(valores);
    if (mensaje) {
      setError(mensaje);
      anunciarError(mensaje);
      return;
    }
    setError('');
    ejecutar({
      modo: 'manual',
      calorias: Math.round(aNumero(valores.calorias)),
      proteinas: Math.round(aNumero(valores.proteinas)),
      carbohidratos: Math.round(aNumero(valores.carbohidratos)),
      grasas: Math.round(aNumero(valores.grasas)),
    });
  };

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
                Meta diaria
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
              <Text style={styles.textoAyuda}>
                {`Automática según tu perfil: ${metaAutomatica?.calorias ?? 0} kcal · P ${
                  metaAutomatica?.proteinas ?? 0
                } g · C ${metaAutomatica?.carbohidratos ?? 0} g · G ${metaAutomatica?.grasas ?? 0} g. `}
                Estimación orientativa, no es consejo médico.
              </Text>

              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Usar meta automática"
                aria-disabled={guardando || undefined}
                style={styles.enlace}
                onPress={() => ejecutar({ modo: 'auto' })}
                disabled={guardando}
              >
                <Text style={styles.textoEnlace}>Usar meta automática</Text>
              </TouchableOpacity>

              <Text style={styles.etiquetaCampo}>META PROPIA</Text>
              <View style={styles.gridMacros}>
                {CAMPOS.map((campo) => (
                  <View key={campo.clave} style={styles.cajaMacro}>
                    <Text style={styles.etiquetaMacroInput}>{campo.titulo}</Text>
                    <TextInput
                      accessibilityLabel={campo.etiqueta}
                      style={styles.inputMacro}
                      keyboardType="number-pad"
                      value={valores[campo.clave]}
                      onChangeText={(texto) => cambiarCampo(campo.clave, texto)}
                    />
                  </View>
                ))}
              </View>

              {error ? (
                <View style={styles.bloqueError}>
                  <Text style={styles.textoError}>{error}</Text>
                </View>
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
                accessibilityLabel="Guardar meta propia"
                aria-disabled={guardando || undefined}
                aria-busy={guardando || undefined}
                style={[styles.botonPrimario, guardando && styles.botonDeshabilitado]}
                onPress={guardarPropia}
                disabled={guardando}
              >
                <Text style={styles.textoBotonPrimario}>Guardar meta</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </ModalAccesible>
  );
}
