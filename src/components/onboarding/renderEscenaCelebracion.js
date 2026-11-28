/**
 * Render de "renderEscenaCelebracion". ctx se rellena en el componente antes de renderizar.
 * Extraído sin cambios de OnboardingBienvenidaModal.jsx (Spec 022). No editar la lógica aquí sin revisar el componente.
 */
import Animated from 'react-native-reanimated';
import { BotonInteractivo, formatearFechaLegible } from './base';
import { Feather } from '@expo/vector-icons';
import { ScrollView, View } from 'react-native';
import { Text } from '../base/Texto';
import { TOKENS } from '../../theme/tokens';
import { calcularEdadExacta, calcularTiempoEntrenando } from '../../services/storage';
import { styles } from './estilos';

export const crearRenderEscenaCelebracion = (ctx) => (...args) => {
  const { celebCheckAnimStyle, celebCtaAnimStyle, celebHeaderAnimStyle, celebRingAnimStyle, estaturaCm, fechaInicioEntrenoEfectiva, fechaNacimientoYYYYMMDD, handleFinalizarCelebracion, insets, modoEdicion, nombre, objetivo, pItem1Style, pItem2Style, pItem3Style, pItem4Style, pItem5Style, pItem6Style, pasaporteCardBorderStyle, perfilConsolidado, pesoInicialKg, sexo } = ctx;
  const renderEscenaCelebracion = () => {
      const nombreSanitizado = String(nombre || '')
        .replace(/[\r\n]+/g, ' ')
        .trim()
        .slice(0, 40);
      const alturaRedondeada = Math.round(estaturaCm);
      const pesoRedondeado = Number(pesoInicialKg.toFixed(1));
  
      const perfilFinal = perfilConsolidado || {
        nombre: nombreSanitizado,
        sexo,
        fechaNacimiento: fechaNacimientoYYYYMMDD,
        alturaCm: alturaRedondeada,
        estaturaCm: alturaRedondeada,
        pesoKgBase: pesoRedondeado,
        pesoInicialKg: pesoRedondeado,
        fechaInicioEntreno: fechaInicioEntrenoEfectiva,
        objetivo,
      };
  
      const edadFinal =
        calcularEdadExacta(new Date(), perfilFinal.fechaNacimiento)?.anios ?? null;
      const tiempoFinal = calcularTiempoEntrenando(
        new Date(),
        perfilFinal.fechaInicioEntreno
      );
      const estaturaMostrada =
        perfilFinal.alturaCm ?? perfilFinal.estaturaCm ?? estaturaCm;
      const pesoBaseMostrado = Number(
        perfilFinal.pesoKgBase ?? perfilFinal.pesoInicialKg ?? pesoInicialKg
      ).toFixed(1);
  
      return (
        <View style={styles.fullSceneContainer}>
          <ScrollView
            contentContainerStyle={[
              styles.celebrationScrollContent,
              { paddingTop: insets.headerPaddingTop + 16, paddingBottom: 28 },
            ]}
            showsVerticalScrollIndicator={false}
          >
            {/* Doble Anillo Geométrico Concéntrico + Check Central */}
            <View style={styles.celebEmblemContainer}>
              <Animated.View style={[styles.celebOuterRing, celebRingAnimStyle]} />
              <Animated.View style={[styles.celebInnerCircle, celebCheckAnimStyle]}>
                <Feather name="check" size={28} color={TOKENS.colors.textInverse} />
              </Animated.View>
            </View>
  
            <Animated.View style={[styles.celebHeaderBlock, celebHeaderAnimStyle]}>
              <View style={styles.whitePillBadge}>
                <Text style={styles.whitePillBadgeText}>
                  PASAPORTE BIOMÉTRICO OFICIAL
                </Text>
              </View>
              <Text style={styles.celebMainTitle}>PERFIL BIOMÉTRICO CALIBRADO</Text>
              <Text style={styles.celebSubtitle}>
                Tus parámetros dinámicos han quedado vinculados a las estadísticas de
                fuerza, registro corporal y contexto de Gemini IA.
              </Text>
            </Animated.View>
  
            {/* Tarjeta Pasaporte Biométrico con Destello de Borde y 6 Indicadores en Cascada */}
            <Animated.View
              style={[styles.passportCard, pasaporteCardBorderStyle]}
            >
              <View style={styles.passportTopHeader}>
                <View>
                  <Text style={styles.passportSerialLabel}>
                    IXN · PASAPORTE DE ATLETA
                  </Text>
                  <Text style={styles.passportOwnerName}>
                    {perfilFinal.nombre || 'Atleta'}
                  </Text>
                </View>
                <View style={styles.passportStatusBadge}>
                  <Feather name="shield" size={12} color={TOKENS.colors.textPrimary} />
                  <Text style={styles.passportStatusText}>ACTIVO</Text>
                </View>
              </View>
  
              <View style={styles.passportGrid}>
                <Animated.View style={[styles.passportCell, pItem1Style]}>
                  <Text style={styles.passportCellLabel}>IDENTIDAD</Text>
                  <Text style={styles.passportCellValue}>
                    {`${perfilFinal.nombre || 'Atleta'} · ${perfilFinal.sexo}`}
                  </Text>
                </Animated.View>
  
                <Animated.View style={[styles.passportCell, pItem2Style]}>
                  <Text style={styles.passportCellLabel}>EDAD EXACTA</Text>
                  <Text style={styles.passportCellValue}>
                    {`${edadFinal !== null ? edadFinal : '--'} años`}
                  </Text>
                  <Text style={styles.passportCellSub}>
                    {formatearFechaLegible(perfilFinal.fechaNacimiento)}
                  </Text>
                </Animated.View>
  
                <Animated.View style={[styles.passportCell, pItem3Style]}>
                  <Text style={styles.passportCellLabel}>ESTATURA</Text>
                  <Text style={styles.passportCellValue}>
                    {`${estaturaMostrada} cm`}
                  </Text>
                </Animated.View>
  
                <Animated.View style={[styles.passportCell, pItem4Style]}>
                  <Text style={styles.passportCellLabel}>PESO INICIAL BASE</Text>
                  <Text style={styles.passportCellValue}>
                    {`${pesoBaseMostrado} kg`}
                  </Text>
                </Animated.View>
  
                <Animated.View style={[styles.passportCell, pItem5Style]}>
                  <Text style={styles.passportCellLabel}>EXPERIENCIA</Text>
                  <Text style={styles.passportCellValue}>
                    {tiempoFinal?.texto || 'Recién iniciado'}
                  </Text>
                  <Text style={styles.passportCellSub}>
                    {`Desde ${formatearFechaLegible(perfilFinal.fechaInicioEntreno)}`}
                  </Text>
                </Animated.View>
  
                <Animated.View style={[styles.passportCell, pItem6Style]}>
                  <Text style={styles.passportCellLabel}>OBJETIVO IA</Text>
                  <Text style={styles.passportCellValue}>{perfilFinal.objetivo}</Text>
                </Animated.View>
              </View>
  
              <View style={styles.passportFooter}>
                <Feather name="cpu" size={13} color={TOKENS.colors.textSecondary} />
                <Text style={styles.passportFooterText}>
                  GEMINI IA CONTEXT SYNC · PARÁMETROS LISTOS
                </Text>
              </View>
            </Animated.View>
          </ScrollView>
  
          <Animated.View
            style={[
              styles.bottomCtaBar,
              { paddingBottom: Math.max(insets.bottom, 16) },
              celebCtaAnimStyle,
            ]}
          >
            <BotonInteractivo
              accessibilityLabel={
                modoEdicion
                  ? 'Volver con Perfil Actualizado'
                  : 'Entrar a IXN'
              }
              onPress={handleFinalizarCelebracion}
              style={styles.primaryCtaButton}
            >
              <Text style={styles.primaryCtaText}>
                {modoEdicion
                  ? 'Volver con Perfil Actualizado'
                  : 'Entrar a IXN'}
              </Text>
              <Feather name="check" size={18} color={TOKENS.colors.textInverse} />
            </BotonInteractivo>
          </Animated.View>
        </View>
      );
    };
  return renderEscenaCelebracion(...args);
};
