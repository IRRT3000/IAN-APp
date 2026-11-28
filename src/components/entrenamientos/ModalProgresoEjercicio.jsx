/**
 * Progreso de un ejercicio: récords, gráfica de las últimas sesiones e historial (Spec 030, RF-4).
 */
import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import ModalAccesible from '../ModalAccesible';
import { Text } from '../base/Texto';
import { TOKENS } from '../../theme/tokens';
import { useSafeInsets } from '../../utils/useSafeInsets';
import { etiquetaFecha } from '../../utils/etiquetasFecha';
import {
  estimar1RM,
  formatearKg,
  historialEjercicio,
  recordsEjercicio,
} from '../../utils/progresoEjercicio';

const MAX_SESIONES_GRAFICA = 12;
const ALTURA_GRAFICA = 120;
const MAX_SESIONES_LISTA = 30;

export const METRICAS = [
  { clave: 'mejor1RM', titulo: '1RM', nombre: '1RM estimado' },
  { clave: 'pesoMaximo', titulo: 'Peso máx', nombre: 'Peso máximo' },
  { clave: 'volumen', titulo: 'Volumen', nombre: 'Volumen' },
];

const fechaCorta = (fecha, conAnio) => {
  const [anio, mes, dia] = String(fecha).split('-');
  return conAnio ? `${dia}/${mes}/${String(anio).slice(2)}` : `${dia}/${mes}`;
};

const tieneDatos = (historial, clave) => historial.some((d) => d[clave] > 0);

function FichaRecord({ titulo, record }) {
  const valor = record && record.valor > 0 ? `${formatearKg(record.valor)} kg` : '—';
  const fecha = record && record.valor > 0 ? etiquetaFecha(record.fecha, { conDiaSemana: false }) : '';
  return (
    <View
      style={styles.ficha}
      accessible
      accessibilityLabel={fecha ? `${titulo}: ${valor.replace(' kg', ' kilos')}, el ${fecha}` : `${titulo}: sin datos`}
    >
      <Text style={styles.fichaTitulo}>{titulo}</Text>
      <Text style={styles.fichaValor}>{valor}</Text>
      {fecha ? <Text style={styles.fichaFecha}>{fecha}</Text> : null}
    </View>
  );
}

export default function ModalProgresoEjercicio({ visible, nombreEjercicio, entrenamientos, onCerrar }) {
  const insets = useSafeInsets();
  const historial = useMemo(
    () => (nombreEjercicio ? historialEjercicio(entrenamientos, nombreEjercicio) : []),
    [entrenamientos, nombreEjercicio]
  );
  const records = useMemo(() => recordsEjercicio(historial), [historial]);
  const [metrica, setMetrica] = useState(
    () => (METRICAS.find((m) => tieneDatos(historial, m.clave)) ?? METRICAS[0]).clave
  );

  const ultimas = historial.slice(-MAX_SESIONES_GRAFICA);
  const cruzaAnio = ultimas.length > 0 && ultimas[0].fecha.slice(0, 4) !== ultimas[ultimas.length - 1].fecha.slice(0, 4);
  const maximo = Math.max(0, ...ultimas.map((d) => d[metrica]));
  const datosMetrica = METRICAS.find((m) => m.clave === metrica);
  const valoresConDatos = ultimas.map((d) => d[metrica]).filter((v) => v > 0);
  const primero = valoresConDatos[0];
  const ultimo = valoresConDatos[valoresConDatos.length - 1];
  let resumenGrafica = '';
  if (valoresConDatos.length === 1) {
    resumenGrafica = `${datosMetrica.nombre}: ${formatearKg(primero)} kilos en una sesión`;
  } else if (valoresConDatos.length > 1) {
    resumenGrafica = `${datosMetrica.nombre} en las últimas ${valoresConDatos.length} sesiones: ${
      primero === ultimo
        ? `se mantiene en ${formatearKg(primero)} kilos`
        : `de ${formatearKg(primero)} a ${formatearKg(ultimo)} kilos`
    }`;
  }
  // Con muchas columnas, la fecha solo va en algunas (siempre en la última) para que no se corte.
  const pasoEtiqueta = ultimas.length > 6 ? Math.ceil(ultimas.length / (cruzaAnio ? 4 : 6)) : 1;
  const sesionesLista = [...historial].reverse().slice(0, MAX_SESIONES_LISTA);

  return (
    <ModalAccesible visible={visible} transparent animationType="fade" onRequestClose={onCerrar}>
      <View style={[styles.backdrop, { paddingTop: insets.top + TOKENS.spacing.md }]}>
        <View style={styles.tarjeta}>
          <View style={styles.cabecera}>
            <View style={styles.cabeceraTextos}>
              <Text style={styles.etiquetaCabecera}>PROGRESO</Text>
              <Text style={styles.titulo} accessibilityRole="header" numberOfLines={2}>
                {nombreEjercicio || 'Ejercicio'}
              </Text>
            </View>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Cerrar progreso"
              style={styles.botonCerrar}
              onPress={onCerrar}
            >
              <Feather name="x" size={20} color={TOKENS.colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContenido} showsVerticalScrollIndicator={false}>
            {historial.length === 0 ? (
              <Text style={styles.textoAyuda}>Aún no hay sesiones de este ejercicio.</Text>
            ) : (
              <>
                <View style={styles.filaFichas}>
                  <FichaRecord titulo="Peso máximo" record={records?.pesoMaximo} />
                  <FichaRecord titulo="1RM estimado" record={records?.mejor1RM} />
                  <FichaRecord titulo="Mejor volumen" record={records?.mejorVolumen} />
                </View>

                {historial.length < 2 ? (
                  <Text style={styles.textoAyuda}>Registra este ejercicio otro día para ver tu progreso.</Text>
                ) : (
                  <View style={styles.bloqueGrafica}>
                    <View style={styles.selector} accessibilityRole="radiogroup" accessibilityLabel="Métrica de la gráfica">
                      {METRICAS.map((m) => {
                        const activa = m.clave === metrica;
                        return (
                          <TouchableOpacity
                            key={m.clave}
                            accessibilityRole="radio"
                            accessibilityLabel={m.nombre}
                            aria-checked={activa}
                            style={[styles.opcion, activa && styles.opcionActiva]}
                            onPress={() => setMetrica(m.clave)}
                          >
                            <Text style={[styles.textoOpcion, activa && styles.textoOpcionActiva]}>{m.titulo}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>

                    {maximo > 0 ? (
                      <View style={styles.grafica} accessible accessibilityRole="image" accessibilityLabel={resumenGrafica}>
                        {ultimas.map((dia, indice) => (
                          <View
                            key={dia.fecha}
                            style={styles.columna}
                            aria-hidden
                            accessibilityElementsHidden
                            importantForAccessibility="no-hide-descendants"
                          >
                            <View style={styles.zonaBarra}>
                              <View
                                style={[
                                  styles.barra,
                                  { height: Math.max(4, (dia[metrica] / maximo) * ALTURA_GRAFICA) },
                                ]}
                              />
                            </View>
                            <Text
                              style={[
                                styles.fechaBarra,
                                indice === ultimas.length - 1 && ultimas.length > 1 && styles.fechaBarraFinal,
                                indice === 0 && ultimas.length > 1 && styles.fechaBarraInicial,
                              ]}
                              numberOfLines={1}
                              maxFontSizeMultiplier={TOKENS.escalaTexto.compacta}
                            >
                              {(ultimas.length - 1 - indice) % pasoEtiqueta === 0
                                ? fechaCorta(dia.fecha, cruzaAnio)
                                : ' '}
                            </Text>
                          </View>
                        ))}
                      </View>
                    ) : (
                      <Text style={styles.textoAyuda}>Sin datos de peso para esta métrica.</Text>
                    )}
                  </View>
                )}

                <Text style={styles.etiquetaSeccion}>SESIONES</Text>
                {sesionesLista.map((dia) => {
                  const mejor = dia.mejorSerie;
                  const rm = mejor ? estimar1RM(mejor.peso, mejor.repeticiones) : 0;
                  const textoSerie = mejor ? `${formatearKg(mejor.peso)} kg × ${mejor.repeticiones}` : '—';
                  const fechaLarga = etiquetaFecha(dia.fecha, { conDiaSemana: false });
                  return (
                    <View
                      key={dia.fecha}
                      style={styles.filaSesion}
                      accessible
                      accessibilityLabel={`${fechaLarga}: ${
                        mejor ? `${formatearKg(mejor.peso)} kilos por ${mejor.repeticiones}` : 'sin series'
                      }, 1RM ${rm > 0 ? formatearKg(rm) : 'sin estimar'}`}
                    >
                      <Text style={styles.fechaSesion}>{fechaLarga}</Text>
                      <Text style={styles.serieSesion}>{textoSerie}</Text>
                      <Text style={styles.rmSesion}>{rm > 0 ? `1RM ${formatearKg(rm)}` : '1RM —'}</Text>
                    </View>
                  );
                })}

                {historial.length > MAX_SESIONES_LISTA ? (
                  <Text style={styles.nota}>{`Se muestran las ${MAX_SESIONES_LISTA} sesiones más recientes de ${historial.length}.`}</Text>
                ) : null}

                <Text style={styles.nota}>
                  El 1RM es una estimación (fórmula de Epley) con series de hasta 12 repeticiones.
                </Text>
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </ModalAccesible>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    padding: TOKENS.spacing.md,
  },
  tarjeta: {
    backgroundColor: TOKENS.colors.surface,
    borderColor: TOKENS.colors.borderDefault,
    borderWidth: 1,
    borderRadius: TOKENS.radii.lg,
    flexShrink: 1,
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
    padding: TOKENS.spacing.md,
  },
  cabecera: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: TOKENS.spacing.md,
  },
  cabeceraTextos: { flex: 1, marginRight: TOKENS.spacing.sm },
  etiquetaCabecera: { ...TOKENS.typography.labelCategory },
  titulo: { ...TOKENS.typography.title },
  botonCerrar: {
    width: TOKENS.touchTarget.minSize,
    height: TOKENS.touchTarget.minSize,
    borderRadius: TOKENS.touchTarget.minSize / 2,
    backgroundColor: TOKENS.colors.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scroll: { flexShrink: 1 },
  scrollContenido: { paddingBottom: TOKENS.spacing.xs },
  filaFichas: { flexDirection: 'row', gap: TOKENS.spacing.sm, marginBottom: TOKENS.spacing.md },
  ficha: {
    flex: 1,
    backgroundColor: TOKENS.colors.surfaceElevated,
    borderRadius: TOKENS.radii.md,
    padding: TOKENS.spacing.sm,
  },
  fichaTitulo: { ...TOKENS.typography.metricLabel },
  fichaValor: { ...TOKENS.typography.metricValue, fontSize: 18, marginTop: TOKENS.spacing.xs },
  fichaFecha: { fontSize: 11, color: TOKENS.colors.textMuted, marginTop: 2 },
  bloqueGrafica: { marginBottom: TOKENS.spacing.md },
  selector: { flexDirection: 'row', gap: TOKENS.spacing.sm, marginBottom: TOKENS.spacing.md },
  opcion: {
    flex: 1,
    minHeight: TOKENS.touchTarget.minSize,
    borderRadius: TOKENS.radii.pill,
    borderWidth: 1,
    borderColor: TOKENS.colors.borderDefault,
    justifyContent: 'center',
    alignItems: 'center',
  },
  opcionActiva: { backgroundColor: TOKENS.colors.accentWhite, borderColor: TOKENS.colors.accentWhite },
  textoOpcion: { fontSize: 13, fontWeight: '600', color: TOKENS.colors.textSecondary },
  textoOpcionActiva: { color: TOKENS.colors.textInverse },
  grafica: { flexDirection: 'row', alignItems: 'flex-end', gap: 4 },
  columna: { flex: 1, alignItems: 'center' },
  zonaBarra: { height: ALTURA_GRAFICA, justifyContent: 'flex-end', width: '100%' },
  barra: { width: '100%', borderRadius: TOKENS.radii.xs, backgroundColor: TOKENS.colors.accentWhite },
  fechaBarra: {
    fontSize: 11,
    color: TOKENS.colors.textMuted,
    marginTop: TOKENS.spacing.xs,
    width: 72,
    textAlign: 'center',
  },
  // Las fechas de los extremos crecen hacia dentro para que el ScrollView no las recorte.
  fechaBarraInicial: { alignSelf: 'flex-start', textAlign: 'left' },
  fechaBarraFinal: { alignSelf: 'flex-end', textAlign: 'right' },
  etiquetaSeccion: { ...TOKENS.typography.labelCategory, marginBottom: TOKENS.spacing.sm },
  filaSesion: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: TOKENS.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: TOKENS.colors.borderSubtle,
  },
  fechaSesion: { flex: 1.4, fontSize: 13, color: TOKENS.colors.textSecondary },
  serieSesion: { flex: 1, fontSize: 13, fontWeight: '700', color: TOKENS.colors.textPrimary },
  rmSesion: { flex: 1, fontSize: 13, color: TOKENS.colors.textSecondary, textAlign: 'right' },
  textoAyuda: { fontSize: 13, color: TOKENS.colors.textSecondary, marginBottom: TOKENS.spacing.md },
  nota: { fontSize: 11, color: TOKENS.colors.textMuted, marginTop: TOKENS.spacing.md },
});
