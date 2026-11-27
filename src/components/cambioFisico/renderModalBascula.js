/**
 * Render de "renderModalBascula". ctx se rellena en el componente antes de renderizar.
 * Extraído sin cambios de CambioFisicoView.jsx (Spec 022). No editar la lógica aquí sin revisar el componente.
 */
import { Feather } from '@expo/vector-icons';
import { MOMENTOS_DIA, PASOS_BASCULA } from './base';
import { ScrollView, TouchableOpacity, View } from 'react-native';
import ModalAccesible from '../ModalAccesible';
import { Text } from '../base/Texto';
import { TOKENS } from '../../theme/tokens';
import { styles } from './estilos';
import { vibrarSeleccionBascula } from '../../services/haptics';

export const crearRenderModalBascula = (ctx) => (...args) => {
  const { ajustarHora12, ajustarMinutos12, ajustarPesoBascula, alternarPeriodo12, analizando, confirmarYAnalizarCambioFisico, fotosSeleccionadas, hora12, minutos12, modalVisible, momentoDia, periodo12, pesoSeleccionadoKg, setModalVisible, setMomentoDia, textoDiferenciaBase } = ctx;
  const renderModalBascula = () => (
        <ModalAccesible
          visible={modalVisible}
          transparent
          statusBarTranslucent
          animationType="fade"
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.fondoModal}>
            <View style={styles.contenedorModal}>
              <ScrollView style={{ maxHeight: '85%' }} contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false} bounces={false}>
              <Text style={styles.tituloModal}>
                Contexto del Chequeo ({fotosSeleccionadas.length} foto
                {fotosSeleccionadas.length === 1 ? '' : 's'})
              </Text>
              <Text style={styles.subtituloModal}>
                Ajusta tu peso en la báscula circular y la hora de la toma
              </Text>
  
              {/* Báscula Moderna Circular Monocroma */}
              <View style={styles.contenedorBasculaExterior}>
                <View style={styles.anilloBasculaExterno}>
                  <View style={styles.circuloCentralBascula}>
                    <Text style={styles.etiquetaInteriorBascula}>
                      BÁSCULA DIGITAL
                    </Text>
                    <View style={styles.filaValorPesoCircular}>
                      <Text style={styles.valorPesoCircular}>
                        {pesoSeleccionadoKg.toFixed(1)}
                      </Text>
                      <Text style={styles.unidadPesoCircular}>kg</Text>
                    </View>
                    <Text style={styles.textoDiferenciaBascula}>
                      {textoDiferenciaBase}
                    </Text>
                  </View>
                </View>
  
                <View style={styles.filaBotonesPeso}>
                  {PASOS_BASCULA.map((paso) => {
                    const etiqueta = paso > 0 ? `+${paso}` : `${paso}`;
                    return (
                      <TouchableOpacity
                        accessibilityRole="button" accessibilityLabel={`Ajustar peso ${etiqueta} kilogramos`}
                        key={etiqueta}
                        style={styles.botonPasoPeso}
                        hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                        activeOpacity={0.8}
                        onPress={() => ajustarPesoBascula(paso)}
                      >
                        <Text style={styles.textoBotonPasoPeso}>{etiqueta}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
  
              {/* Selector de Hora 12h */}
              <View style={styles.bloqueSelectorHora}>
                <Text style={styles.etiquetaSeccionModal}>
                  HORA DE LA TOMA (FORMATO 12 HORAS)
                </Text>
  
                <View style={styles.filaReloj12h}>
                  <View style={styles.columnaControlTiempo}>
                    <TouchableOpacity
                      accessibilityRole="button" accessibilityLabel="Aumentar hora"
                      style={styles.botonFlechaTiempo} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      onPress={() => ajustarHora12(1)}
                    >
                      <Feather name="chevron-up" size={16} color={TOKENS.colors.textPrimary} />
                    </TouchableOpacity>
                    <Text style={styles.valorTiempoDigital}>
                      {String(hora12).padStart(2, '0')}
                    </Text>
                    <TouchableOpacity
                      accessibilityRole="button" accessibilityLabel="Disminuir hora"
                      style={styles.botonFlechaTiempo} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      onPress={() => ajustarHora12(-1)}
                    >
                      <Feather name="chevron-down" size={16} color={TOKENS.colors.textPrimary} />
                    </TouchableOpacity>
                  </View>
  
                  <Text style={styles.dosPuntosReloj}>:</Text>
  
                  <View style={styles.columnaControlTiempo}>
                    <TouchableOpacity
                      accessibilityRole="button" accessibilityLabel="Sumar 5 minutos"
                      style={styles.botonFlechaTiempo} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      onPress={() => ajustarMinutos12(5)}
                    >
                      <Text style={styles.textoFlechaTiempo}>+5m</Text>
                    </TouchableOpacity>
                    <Text style={styles.valorTiempoDigital}>
                      {String(minutos12).padStart(2, '0')}
                    </Text>
                    <TouchableOpacity
                      accessibilityRole="button" accessibilityLabel="Restar 5 minutos"
                      style={styles.botonFlechaTiempo} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      onPress={() => ajustarMinutos12(-5)}
                    >
                      <Text style={styles.textoFlechaTiempo}>-5m</Text>
                    </TouchableOpacity>
                  </View>
  
                  <View style={styles.columnaAmPm}>
                    {['AM', 'PM'].map((p) => {
                      const activo = periodo12 === p;
                      return (
                        <TouchableOpacity
                          accessibilityRole="radio" accessibilityLabel={p} aria-checked={activo}
                          key={p}
                          style={[
                            styles.botonAmPm,
                            activo
                              ? styles.botonAmPmActivo
                              : styles.botonAmPmInactivo,
                          ]}
                          onPress={() => alternarPeriodo12(p)}
                        >
                          <Text
                            style={[
                              styles.textoAmPm,
                              activo
                                ? styles.textoAmPmActivo
                                : styles.textoAmPmInactivo,
                            ]}
                          >
                            {p}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
  
                <View style={styles.filaMomentosDia}>
                  {MOMENTOS_DIA.map((m) => {
                    const activo = momentoDia === m;
                    return (
                      <TouchableOpacity
                        accessibilityRole="radio" accessibilityLabel={`Momento del día: ${m}`} aria-checked={activo}
                        key={m}
                        style={[
                          styles.chipMomentoModal,
                          activo
                            ? styles.chipMomentoActivo
                            : styles.chipMomentoInactivo,
                        ]}
                        onPress={() => {
                          vibrarSeleccionBascula();
                          setMomentoDia(m);
                        }}
                      >
                        <Text
                          style={[
                            styles.textoChipMomento,
                            activo
                              ? styles.textoChipMomentoActivo
                              : styles.textoChipMomentoInactivo,
                          ]}
                        >
                          {m}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
  
              <View style={styles.filaBotonesModal}>
                <TouchableOpacity
                  accessibilityRole="button" accessibilityLabel="Cancelar"
                  style={styles.botonCancelarModal}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={styles.textoCancelarModal}>Cancelar</Text>
                </TouchableOpacity>
  
                <TouchableOpacity
                  accessibilityRole="button" accessibilityLabel="Analizar con Gemini" aria-busy={analizando || undefined}
                  style={[
                    styles.botonConfirmarModal,
                    analizando && styles.botonDeshabilitado,
                  ]}
                  disabled={analizando}
                  onPress={confirmarYAnalizarCambioFisico}
                >
                  <Text style={styles.textoConfirmarModal}>
                    Analizar con Gemini
                  </Text>
                </TouchableOpacity>
              </View>
              </ScrollView>
            </View>
          </View>
        </ModalAccesible>
    );
  return renderModalBascula(...args);
};
