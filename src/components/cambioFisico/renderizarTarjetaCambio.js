/**
 * Render de "renderizarTarjetaCambio". ctx se rellena en el componente antes de renderizar.
 * Extraído sin cambios de CambioFisicoView.jsx (Spec 022). No editar la lógica aquí sin revisar el componente.
 */
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { CapsulaBorradoSeguroFisico } from './base';
import { Feather } from '@expo/vector-icons';
import FotoPersistida from '../FotoPersistida';
import { TOKENS } from '../../theme/tokens';
import { styles } from './estilos';

export const crearRenderizarTarjetaCambio = (ctx) => (...args) => {
  const { analizando, avisoBorradoId, comparandoId, esHoy, listaRegistros, manejarComparacionEnUnToque, mostrarAvisoToqueCorto, solicitarConfirmacionBorrado } = ctx;
  const renderizarTarjetaCambio = ({ item, index }) => {
      const registroAnterior =
        index + 1 < listaRegistros.length ? listaRegistros[index + 1] : null;
      const estaComparandoEste = comparandoId === item.id;
      const mostrandoAviso = avisoBorradoId === item.id;
  
      return (
        <View style={styles.tarjetaRegistro}>
          <View style={styles.filaEncabezadoTarjeta}>
            <View style={styles.columnaFechaHora}>
              <Text style={styles.fechaTarjeta}>
                {item.fecha} · {item.hora12h}
              </Text>
              <View style={styles.filaEtiquetasContexto}>
                <View style={styles.chipContexto}>
                  <Text style={styles.textoChipContexto}>{item.momentoDia}</Text>
                </View>
                <View style={styles.chipContexto}>
                  <Feather
                    name="sliders"
                    size={10}
                    color={TOKENS.colors.textSecondary}
                    style={{ marginRight: 4 }}
                  />
                  <Text style={styles.textoChipContexto}>
                    {Number(item.pesoKg).toFixed(1)} kg
                  </Text>
                </View>
                <View style={styles.chipContexto}>
                  <Feather
                    name="target"
                    size={10}
                    color={TOKENS.colors.textSecondary}
                    style={{ marginRight: 4 }}
                  />
                  <Text style={styles.textoChipContexto}>
                    {item.objetivo || 'Mantenimiento'}
                  </Text>
                </View>
              </View>
            </View>
  
            <View style={styles.circuloVeredicto}>
              <Text style={styles.etiquetaVeredicto}>VEREDICTO</Text>
              <Text style={styles.valorVeredicto}>
                {Number(item.veredicto).toFixed(1)}
                <Text style={styles.escalaVeredicto}>/10</Text>
              </Text>
            </View>
          </View>
  
          {Array.isArray(item.urisFotos) && item.urisFotos.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.tiraFotosRegistro}
            >
              {item.urisFotos.map((uri, idxFoto) =>
                uri ? (
                  <FotoPersistida
                    key={`${item.id}-foto-${idxFoto}`}
                    uri={uri}
                    style={styles.miniaturaTarjeta}
                  />
                ) : null
              )}
            </ScrollView>
          ) : null}
  
          <View style={styles.bloqueResumenSimple}>
            <Text style={styles.etiquetaBloque}>RESUMEN GENERAL</Text>
            <Text style={styles.textoResumenSimple}>{item.resumenSimple}</Text>
          </View>
  
          {item.balanceDelDia ? (
            <View style={styles.bloqueBalanceDia}>
              <View style={styles.filaTituloBalance}>
                <Feather
                  name="activity"
                  size={12}
                  color={TOKENS.colors.textSecondary}
                  style={{ marginRight: 6 }}
                />
                <Text style={styles.etiquetaBalanceDia}>
                  BALANCE DEL DÍA
                </Text>
              </View>
              <Text style={styles.textoBalanceDia}>{item.balanceDelDia}</Text>
            </View>
          ) : null}
  
          {Array.isArray(item.puntosClave) && item.puntosClave.length > 0 ? (
            <View style={styles.filaPuntosClave}>
              {item.puntosClave.map((punto, idxPunto) => (
                <View
                  key={`${item.id}-pt-${idxPunto}`}
                  style={styles.chipPuntoClave}
                >
                  <Text style={styles.textoPuntoClave}>• {punto}</Text>
                </View>
              ))}
            </View>
          ) : null}
  
          {item.comparacionAnterior ? (
            <View style={styles.bloqueComparacionResultado}>
              <Text style={styles.tituloComparacionResultado}>
                COMPARATIVA VS {item.comparacionAnterior.fechaAnterior} (
                {Number(item.comparacionAnterior.pesoAnteriorKg).toFixed(1)} kg)
              </Text>
              <Text style={styles.textoEvolucion}>
                {item.comparacionAnterior.evolucion}
              </Text>
              {Array.isArray(
                item.comparacionAnterior.recomendacionesOptimizacion
              ) &&
                item.comparacionAnterior.recomendacionesOptimizacion.map(
                  (rec, idxRec) => (
                    <Text
                      key={`${item.id}-rec-${idxRec}`}
                      style={styles.itemRecomendacion}
                    >
                      ▸ {rec}
                    </Text>
                  )
                )}
            </View>
          ) : null}
  
          <View style={styles.filaAccionesTarjeta}>
            {registroAnterior ? (
              <TouchableOpacity
                accessibilityRole="button" accessibilityLabel="Comparar con el registro anterior"
                style={[
                  styles.botonComparar,
                  Boolean(comparandoId) && styles.botonDeshabilitado,
                ]}
                activeOpacity={0.85}
                disabled={Boolean(comparandoId) || analizando}
                onPress={() =>
                  manejarComparacionEnUnToque(item, registroAnterior)
                }
              >
                {estaComparandoEste ? (
                  <View style={styles.filaComparando}>
                    <ActivityIndicator size="small" color={TOKENS.colors.textPrimary} />
                    <Text style={styles.textoBotonComparar}>
                      Comparando...
                    </Text>
                  </View>
                ) : (
                  <View style={styles.filaComparando}>
                    <Feather
                      name="refresh-cw"
                      size={13}
                      color={TOKENS.colors.textPrimary}
                      style={{ marginRight: 6 }}
                    />
                    <Text style={styles.textoBotonComparar}>
                      {item.comparacionAnterior
                        ? 'Re-comparar con anterior'
                        : 'Comparar con registro anterior'}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            ) : (
              <View style={styles.insigniaPrimerRegistro}>
                <Text style={styles.textoPrimerRegistro}>
                  Primer registro base
                </Text>
              </View>
            )}
  
            {esHoy ? (
              <CapsulaBorradoSeguroFisico
                onBorrar={() => solicitarConfirmacionBorrado(item)}
                onAvisoCorto={() => mostrarAvisoToqueCorto(item.id)}
              />
            ) : (
              <View style={styles.badgeSoloLecturaItem}>
                <Feather
                  name="lock"
                  size={10}
                  color={TOKENS.colors.textMuted}
                  style={{ marginRight: 4 }}
                />
                <Text style={styles.textoBadgeSoloLecturaItem}>Historial</Text>
              </View>
            )}
          </View>
  
          {mostrandoAviso ? (
            <View style={styles.bannerAvisoBorrado}>
              <Feather
                name="alert-circle"
                size={12}
                color={TOKENS.colors.danger}
                style={{ marginRight: 6 }}
              />
              <Text style={styles.textoAvisoBorrado}>
                Mantén presionado 1 segundo para eliminar este chequeo físico
              </Text>
            </View>
          ) : null}
        </View>
      );
    };
  return renderizarTarjetaCambio(...args);
};
