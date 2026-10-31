import React, { useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import { TOKENS } from '../theme/tokens';
import { vibrarSeleccionBascula } from '../services/haptics';
import {
  contarSesionesSinAnalizar,
  textoSesionesSinAnalizar,
} from '../utils/resumenEstudio';

const ESTILOS_COMPRENSION = {
  Bien: {
    bg: '#FFFFFF',
    border: '#FFFFFF',
    text: '#0A0A0A',
  },
  'Más o menos': {
    bg: '#3D3D3D',
    border: '#525252',
    text: '#FFFFFF',
  },
  'No tanto': {
    bg: '#242424',
    border: '#333333',
    text: '#B8B8B8',
  },
  Nada: {
    bg: '#181818',
    border: '#262626',
    text: '#7A7A7A',
  },
};

/**
 * Tarjeta de Resumen con IA del Día de Estudio (Spec 016).
 *
 * @param {Object} props
 * @param {boolean} props.esHoy - Indica si el día seleccionado es el día actual.
 * @param {boolean} props.hayDatos - Indica si los datos de estudio ya fueron cargados desde storage.
 * @param {Array} [props.sesionesHoy=[]] - Arreglo con las sesiones registradas en el día de hoy.
 * @param {Object|null} [props.entradaResumen=null] - Entrada con el resumen persistido o null si no existe.
 * @param {boolean} [props.analizando=false] - Indica si el análisis con Gemini está en progreso.
 * @param {Object|null} [props.progreso=null] - Información del modelo y reintentos ({ modelo, indice, total }).
 * @param {Function} props.onAnalizar - Callback para iniciar la petición a Gemini.
 */
export default function ResumenEstudioCard({
  esHoy,
  hayDatos,
  sesionesHoy = [],
  entradaResumen = null,
  analizando = false,
  progreso = null,
  onAnalizar,
}) {
  const [detalleExpandido, setDetalleExpandido] = useState(false);

  // 1. Estado 3: Día pasado sin resumen registrado -> No se muestra nada
  if (!esHoy && !entradaResumen) {
    return null;
  }

  // 2. Estado 1: Hoy sin resumen disponible
  if (esHoy && !entradaResumen) {
    const textoProgreso = progreso?.modelo
      ? progreso.total && progreso.indice
        ? `Analizando con ${progreso.modelo} (${progreso.indice}/${progreso.total})...`
        : `Analizando con ${progreso.modelo}...`
      : 'Analizando...';

    const handlePressAnalizar = () => {
      vibrarSeleccionBascula();
      if (typeof onAnalizar === 'function') {
        onAnalizar();
      }
    };

    return (
      <Animated.View
        entering={FadeIn.duration(200)}
        style={styles.tarjetaContenedor}
      >
        <View style={styles.cabeceraSinResumen}>
          <View style={styles.iconoBadgeContenedor}>
            <Feather name="cpu" size={16} color={TOKENS.colors.textPrimary} />
          </View>
          <View style={styles.bloqueTextosCabecera}>
            <Text style={styles.tituloSinResumen}>
              Resumen de estudio de hoy
            </Text>
            <Text style={styles.subtituloSinResumen}>
              Tienes 1 análisis al día; úsalo al terminar de estudiar.
            </Text>
          </View>
        </View>

        {/* Botón CTA de 54dp */}
        {!hayDatos || sesionesHoy.length === 0 ? (
          <View
            style={[styles.botonCta, styles.botonCtaDeshabilitado]}
            accessible={true}
            accessibilityRole="text"
            accessibilityLabel="Registra al menos una sesión hoy para analizar tu día"
          >
            <Feather
              name="info"
              size={15}
              color={TOKENS.colors.textMuted}
              style={styles.iconoBotonCta}
            />
            <Text
              style={styles.textoBotonDeshabilitado}
              numberOfLines={2}
            >
              Registra al menos una sesión hoy para analizar tu día
            </Text>
          </View>
        ) : analizando ? (
          <View
            style={[styles.botonCta, styles.botonCtaAnalizando]}
            accessible={true}
            accessibilityRole="alert"
            accessibilityLabel={textoProgreso}
          >
            <ActivityIndicator
              size="small"
              color={TOKENS.colors.accentWhite}
              style={styles.iconoBotonCta}
            />
            <Text
              style={styles.textoBotonAnalizando}
              numberOfLines={1}
            >
              {textoProgreso}
            </Text>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.botonCta, styles.botonCtaActivo]}
            activeOpacity={0.88}
            onPress={handlePressAnalizar}
            accessibilityRole="button"
            accessibilityLabel="Analizar mi día de estudio con inteligencia artificial"
          >
            <Feather
              name="cpu"
              size={17}
              color={TOKENS.colors.textInverse}
              style={styles.iconoBotonCta}
            />
            <Text style={styles.textoBotonActivo}>
              Analizar mi día de estudio
            </Text>
          </TouchableOpacity>
        )}
      </Animated.View>
    );
  }

  // 3. Estado 2: Con resumen generado (Hoy o Día Pasado)
  const resultado = entradaResumen.resultado || {};
  const hora12h = entradaResumen.hora12h || '';
  const modeloUsado = entradaResumen.modeloUsado || '';
  const veredicto =
    typeof resultado.veredicto === 'number' && Number.isFinite(resultado.veredicto)
      ? resultado.veredicto
      : 0;

  const minutosTotales = resultado.minutosTotales || 0;
  const materias = Array.isArray(resultado.materias) ? resultado.materias : [];
  const temasPorRepasar = Array.isArray(resultado.temasPorRepasar)
    ? resultado.temasPorRepasar
    : [];
  const temasDominados = Array.isArray(resultado.temasDominados)
    ? resultado.temasDominados
    : [];
  const puntosClave = Array.isArray(resultado.puntosClave)
    ? resultado.puntosClave
    : [];
  const recomendacionesManana = Array.isArray(resultado.recomendacionesManana)
    ? resultado.recomendacionesManana
    : [];
  const resumenSimple = resultado.resumenSimple || '';
  const resumenDetallado = resultado.resumenDetallado || '';

  // RF-7: Nota informativa de desactualización si se agregaron/editaron sesiones hoy
  const sesionesSinAnalizar = esHoy
    ? contarSesionesSinAnalizar({
        sesionesHoy,
        firmas: entradaResumen.firmas || {},
      })
    : 0;
  const textoDesactualizado = esHoy
    ? textoSesionesSinAnalizar(sesionesSinAnalizar)
    : null;

  const handleToggleDetalle = () => {
    vibrarSeleccionBascula();
    setDetalleExpandido((prev) => !prev);
  };

  const porcentajeVeredicto = Math.min(100, Math.max(0, veredicto * 10));

  return (
    <Animated.View
      entering={FadeIn.duration(220)}
      style={styles.tarjetaContenedor}
    >
      {/* Banner Informativo RF-7 si hay modificaciones posteriores al análisis */}
      {textoDesactualizado ? (
        <View style={styles.bannerDesactualizado}>
          <Feather
            name="info"
            size={14}
            color="#D4A343"
            style={styles.iconoBannerDesactualizado}
          />
          <Text style={styles.textoBannerDesactualizado}>
            {textoDesactualizado}
          </Text>
        </View>
      ) : null}

      {/* Bloque Superior: Veredicto y Resumen Simple */}
      <View style={styles.bloqueVeredictoContenedor}>
        <View style={styles.filaVeredictoSuperior}>
          <View style={styles.etiquetaVeredictoBadge}>
            <Feather
              name="award"
              size={11}
              color={TOKENS.colors.textSecondary}
              style={{ marginRight: 5 }}
            />
            <Text style={styles.textoEtiquetaVeredicto}>
              ANÁLISIS PEDAGÓGICO
            </Text>
          </View>
          <View style={styles.displayPuntaje}>
            <Text style={styles.numeroVeredicto}>{veredicto.toFixed(1)}</Text>
            <Text style={styles.escalaVeredicto}> / 10</Text>
          </View>
        </View>

        {/* Barra Visual Proporcional de Veredicto */}
        <View style={styles.rielBarraProgreso}>
          <View
            style={[
              styles.fillBarraProgreso,
              { width: `${porcentajeVeredicto}%` },
            ]}
          />
        </View>

        {/* Resumen Simple Motivacional */}
        {resumenSimple ? (
          <Text style={styles.textoResumenSimple}>{resumenSimple}</Text>
        ) : null}
      </View>

      {/* Métricas: Minutos Totales y Chips por Materia */}
      <View style={styles.seccionMetricas}>
        <View style={styles.chipMetricaTiempo}>
          <Feather
            name="clock"
            size={13}
            color={TOKENS.colors.textPrimary}
            style={styles.iconoChipMetrica}
          />
          <Text style={styles.textoChipMetricaTiempo}>
            {minutosTotales} min de estudio
          </Text>
        </View>

        <View style={styles.envoltorioMateriasChips}>
          {materias.map((mat, idx) => (
            <View
              key={`${mat.materia}-${idx}`}
              style={styles.chipMateria}
            >
              <View
                style={[
                  styles.puntoCategoriaChip,
                  {
                    backgroundColor:
                      mat.categoria === 'Escuela' ? '#FFFFFF' : '#8E8E93',
                  },
                ]}
              />
              <Text style={styles.textoChipMateria} numberOfLines={1}>
                {mat.materia}: {mat.minutos}m
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* Sección: Temas por repasar */}
      {temasPorRepasar.length > 0 ? (
        <View style={styles.seccionBloque}>
          <View style={styles.filaTituloSeccion}>
            <Feather
              name="alert-circle"
              size={13}
              color={TOKENS.colors.textSecondary}
              style={styles.iconoTituloSeccion}
            />
            <Text style={styles.tituloSeccion}>TEMAS POR REPASAR</Text>
          </View>

          {temasPorRepasar.map((item, idx) => {
            const estiloBadge =
              ESTILOS_COMPRENSION[item.comprension] ||
              ESTILOS_COMPRENSION['Más o menos'];
            return (
              <View
                key={`repaso-${idx}`}
                style={styles.tarjetaItemRepaso}
              >
                <View style={styles.cabeceraItemRepaso}>
                  <View style={styles.bloqueTemaMateria}>
                    {item.materia ? (
                      <Text style={styles.materiaItemRepaso} numberOfLines={1}>
                        {item.materia}
                      </Text>
                    ) : null}
                    <Text style={styles.temaItemRepaso} numberOfLines={2}>
                      {item.tema}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.badgeComprension,
                      {
                        backgroundColor: estiloBadge.bg,
                        borderColor: estiloBadge.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.textoBadgeComprension,
                        { color: estiloBadge.text },
                      ]}
                    >
                      {item.comprension}
                    </Text>
                  </View>
                </View>

                {item.sugerencia ? (
                  <View style={styles.bloqueSugerenciaPedagogica}>
                    <Feather
                      name="zap"
                      size={12}
                      color={TOKENS.colors.textSecondary}
                      style={styles.iconoSugerencia}
                    />
                    <Text style={styles.textoSugerencia}>
                      {item.sugerencia}
                    </Text>
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>
      ) : null}

      {/* Sección: Temas dominados */}
      {temasDominados.length > 0 ? (
        <View style={styles.seccionBloque}>
          <View style={styles.filaTituloSeccion}>
            <Feather
              name="check-circle"
              size={13}
              color={TOKENS.colors.textSecondary}
              style={styles.iconoTituloSeccion}
            />
            <Text style={styles.tituloSeccion}>TEMAS DOMINADOS</Text>
          </View>
          <View style={styles.envoltorioChipsDominados}>
            {temasDominados.map((tema, idx) => (
              <View key={`dominado-${idx}`} style={styles.chipDominado}>
                <Feather
                  name="check"
                  size={11}
                  color={TOKENS.colors.textPrimary}
                  style={{ marginRight: 5 }}
                />
                <Text style={styles.textoChipDominado} numberOfLines={1}>
                  {tema}
                </Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {/* Sección: Puntos clave */}
      {puntosClave.length > 0 ? (
        <View style={styles.seccionBloque}>
          <View style={styles.filaTituloSeccion}>
            <Feather
              name="list"
              size={13}
              color={TOKENS.colors.textSecondary}
              style={styles.iconoTituloSeccion}
            />
            <Text style={styles.tituloSeccion}>PUNTOS CLAVE</Text>
          </View>
          {puntosClave.map((pto, idx) => (
            <View key={`punto-${idx}`} style={styles.filaPuntoClave}>
              <View style={styles.puntoViñeta} />
              <Text style={styles.textoPuntoClave}>{pto}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {/* Sección: Recomendaciones para mañana */}
      {recomendacionesManana.length > 0 ? (
        <View style={styles.seccionBloque}>
          <View style={styles.filaTituloSeccion}>
            <Feather
              name="compass"
              size={13}
              color={TOKENS.colors.textSecondary}
              style={styles.iconoTituloSeccion}
            />
            <Text style={styles.tituloSeccion}>
              RECOMENDACIONES PARA MAÑANA
            </Text>
          </View>
          {recomendacionesManana.map((rec, idx) => (
            <View key={`rec-${idx}`} style={styles.filaRecomendacion}>
              <Feather
                name="arrow-right"
                size={12}
                color={TOKENS.colors.textSecondary}
                style={styles.iconoFlechaRec}
              />
              <Text style={styles.textoRecomendacion}>{rec}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {/* Botón Colapsable "Ver análisis detallado" */}
      {resumenDetallado ? (
        <View style={styles.contenedorColapsable}>
          <TouchableOpacity
            style={styles.botonToggleDetalle}
            activeOpacity={0.85}
            onPress={handleToggleDetalle}
            accessibilityRole="button"
            accessibilityLabel={
              detalleExpandido
                ? 'Ocultar análisis detallado'
                : 'Ver análisis detallado'
            }
          >
            <Text style={styles.textoBotonToggleDetalle}>
              {detalleExpandido
                ? 'Ocultar análisis detallado'
                : 'Ver análisis detallado'}
            </Text>
            <Feather
              name={detalleExpandido ? 'chevron-up' : 'chevron-down'}
              size={16}
              color={TOKENS.colors.textSecondary}
            />
          </TouchableOpacity>

          {detalleExpandido ? (
            <Animated.View
              entering={FadeIn.duration(200)}
              style={styles.cajaDetalleExpandido}
            >
              <Text style={styles.textoDetalleExpandido}>
                {resumenDetallado}
              </Text>
            </Animated.View>
          ) : null}
        </View>
      ) : null}

      {/* Pie de Página: Hora de generación y modelo */}
      <View style={styles.pieTarjeta}>
        <View style={styles.filaPie}>
          <Feather
            name="cpu"
            size={11}
            color={TOKENS.colors.textMuted}
            style={styles.iconoPie}
          />
          <Text style={styles.textoPie}>
            {hora12h ? `Generado a las ${hora12h}` : 'Análisis generado'}{' '}
            {modeloUsado ? `· ${modeloUsado}` : ''}
          </Text>
        </View>

        {!esHoy ? (
          <View style={styles.badgeHistorialLectura}>
            <Feather
              name="lock"
              size={10}
              color={TOKENS.colors.textMuted}
              style={{ marginRight: 4 }}
            />
            <Text style={styles.textoBadgeHistorialLectura}>Historial</Text>
          </View>
        ) : null}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  tarjetaContenedor: {
    backgroundColor: TOKENS.colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: TOKENS.colors.borderDefault,
    padding: TOKENS.spacing.md,
    marginTop: TOKENS.spacing.md,
    marginBottom: TOKENS.spacing.lg,
  },

  /* Estado 1: Hoy sin resumen */
  cabeceraSinResumen: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: TOKENS.spacing.md,
  },
  iconoBadgeContenedor: {
    width: 38,
    height: 38,
    borderRadius: TOKENS.radii.sm,
    backgroundColor: TOKENS.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: TOKENS.colors.borderSubtle,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  bloqueTextosCabecera: {
    flex: 1,
  },
  tituloSinResumen: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.2,
    color: TOKENS.colors.textPrimary,
    marginBottom: 2,
  },
  subtituloSinResumen: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
    color: TOKENS.colors.textSecondary,
  },

  /* Botón CTA 54dp */
  botonCta: {
    height: TOKENS.touchTarget.ctaHeight,
    minHeight: TOKENS.touchTarget.ctaHeight,
    borderRadius: TOKENS.radii.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  botonCtaActivo: {
    backgroundColor: TOKENS.colors.accentWhite,
  },
  botonCtaDeshabilitado: {
    backgroundColor: '#181818',
    borderWidth: 1,
    borderColor: TOKENS.colors.borderDefault,
  },
  botonCtaAnalizando: {
    backgroundColor: TOKENS.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: TOKENS.colors.borderStrong,
  },
  iconoBotonCta: {
    marginRight: 9,
  },
  textoBotonActivo: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.2,
    color: TOKENS.colors.textInverse,
  },
  textoBotonDeshabilitado: {
    fontSize: 12,
    fontWeight: '600',
    color: TOKENS.colors.textMuted,
    textAlign: 'center',
    flexShrink: 1,
  },
  textoBotonAnalizando: {
    fontSize: 14,
    fontWeight: '700',
    color: TOKENS.colors.textPrimary,
  },

  /* Banner Informativo RF-7 */
  bannerDesactualizado: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1A12',
    borderWidth: 1,
    borderColor: '#3D3219',
    borderRadius: TOKENS.radii.sm,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginBottom: TOKENS.spacing.md,
  },
  iconoBannerDesactualizado: {
    marginRight: 8,
  },
  textoBannerDesactualizado: {
    fontSize: 12,
    fontWeight: '600',
    color: '#E5C282',
    flex: 1,
    lineHeight: 16,
  },

  /* Bloque Veredicto */
  bloqueVeredictoContenedor: {
    marginBottom: TOKENS.spacing.md,
    paddingBottom: TOKENS.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: TOKENS.colors.borderSubtle,
  },
  filaVeredictoSuperior: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  etiquetaVeredictoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: TOKENS.colors.surfaceElevated,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: TOKENS.radii.xs,
    borderWidth: 1,
    borderColor: TOKENS.colors.borderSubtle,
  },
  textoEtiquetaVeredicto: {
    ...TOKENS.typography.labelCategory,
    color: TOKENS.colors.textSecondary,
    fontSize: 9,
  },
  displayPuntaje: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  numeroVeredicto: {
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: -0.5,
    color: TOKENS.colors.textPrimary,
  },
  escalaVeredicto: {
    fontSize: 13,
    fontWeight: '700',
    color: TOKENS.colors.textSecondary,
  },
  rielBarraProgreso: {
    height: 4,
    borderRadius: 2,
    backgroundColor: TOKENS.colors.surfaceInteractive,
    overflow: 'hidden',
    marginBottom: 12,
  },
  fillBarraProgreso: {
    height: '100%',
    backgroundColor: TOKENS.colors.accentWhite,
    borderRadius: 2,
  },
  textoResumenSimple: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
    color: '#D4D4D4',
  },

  /* Sección Métricas */
  seccionMetricas: {
    marginBottom: TOKENS.spacing.md,
  },
  chipMetricaTiempo: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: TOKENS.colors.surfaceElevated,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: TOKENS.radii.xs,
    borderWidth: 1,
    borderColor: TOKENS.colors.borderSubtle,
    marginBottom: 8,
  },
  iconoChipMetrica: {
    marginRight: 6,
  },
  textoChipMetricaTiempo: {
    fontSize: 12,
    fontWeight: '800',
    color: TOKENS.colors.textPrimary,
  },
  envoltorioMateriasChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chipMateria: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: TOKENS.colors.surfaceInteractive,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: TOKENS.radii.xs,
    borderWidth: 1,
    borderColor: TOKENS.colors.borderSubtle,
  },
  puntoCategoriaChip: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  textoChipMateria: {
    fontSize: 11,
    fontWeight: '600',
    color: TOKENS.colors.textSecondary,
  },

  /* Secciones Modulares */
  seccionBloque: {
    marginTop: TOKENS.spacing.sm,
    paddingTop: TOKENS.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: TOKENS.colors.borderSubtle,
  },
  filaTituloSeccion: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  iconoTituloSeccion: {
    marginRight: 6,
  },
  tituloSeccion: {
    ...TOKENS.typography.labelCategory,
    color: TOKENS.colors.textSecondary,
    fontSize: 10,
  },

  /* Temas por Repasar */
  tarjetaItemRepaso: {
    backgroundColor: '#181818',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: TOKENS.colors.borderSubtle,
    padding: 10,
    marginBottom: 8,
  },
  cabeceraItemRepaso: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  bloqueTemaMateria: {
    flex: 1,
    marginRight: 8,
  },
  materiaItemRepaso: {
    fontSize: 11,
    fontWeight: '700',
    color: TOKENS.colors.textSecondary,
    marginBottom: 2,
  },
  temaItemRepaso: {
    fontSize: 13,
    fontWeight: '700',
    color: TOKENS.colors.textPrimary,
    lineHeight: 17,
  },
  badgeComprension: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: TOKENS.radii.xs,
    borderWidth: 1,
  },
  textoBadgeComprension: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  bloqueSugerenciaPedagogica: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#121212',
    borderRadius: 6,
    borderLeftWidth: 2,
    borderLeftColor: TOKENS.colors.borderStrong,
    padding: 8,
    marginTop: 4,
  },
  iconoSugerencia: {
    marginTop: 2,
    marginRight: 6,
  },
  textoSugerencia: {
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '500',
    color: '#CCCCCC',
    flex: 1,
  },

  /* Temas Dominados */
  envoltorioChipsDominados: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 4,
  },
  chipDominado: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#181818',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: TOKENS.colors.borderSubtle,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  textoChipDominado: {
    fontSize: 11,
    fontWeight: '600',
    color: '#D4D4D4',
  },

  /* Puntos Clave y Recomendaciones */
  filaPuntoClave: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  puntoViñeta: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: TOKENS.colors.textSecondary,
    marginTop: 7,
    marginRight: 8,
  },
  textoPuntoClave: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '500',
    color: '#CCCCCC',
    flex: 1,
  },
  filaRecomendacion: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  iconoFlechaRec: {
    marginTop: 3,
    marginRight: 8,
  },
  textoRecomendacion: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '500',
    color: '#CCCCCC',
    flex: 1,
  },

  /* Desplegable Detalle Expandido (>=44dp) */
  contenedorColapsable: {
    marginTop: TOKENS.spacing.sm,
    paddingTop: TOKENS.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: TOKENS.colors.borderSubtle,
  },
  botonToggleDetalle: {
    minHeight: TOKENS.touchTarget.minSize,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#181818',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: TOKENS.colors.borderSubtle,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  textoBotonToggleDetalle: {
    fontSize: 12,
    fontWeight: '700',
    color: TOKENS.colors.textSecondary,
  },
  cajaDetalleExpandido: {
    backgroundColor: '#121212',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: TOKENS.colors.borderSubtle,
    padding: 12,
    marginTop: 8,
  },
  textoDetalleExpandido: {
    fontSize: 12,
    lineHeight: 19,
    fontWeight: '400',
    color: '#BBBBBB',
  },

  /* Pie de Tarjeta */
  pieTarjeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: TOKENS.spacing.md,
    paddingTop: TOKENS.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: TOKENS.colors.borderSubtle,
  },
  filaPie: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  iconoPie: {
    marginRight: 6,
  },
  textoPie: {
    fontSize: 10,
    fontWeight: '500',
    color: TOKENS.colors.textMuted,
  },
  badgeHistorialLectura: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: TOKENS.colors.surfaceElevated,
    borderRadius: TOKENS.radii.xs,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: TOKENS.colors.borderSubtle,
  },
  textoBadgeHistorialLectura: {
    fontSize: 9,
    fontWeight: '700',
    color: TOKENS.colors.textMuted,
  },
});
