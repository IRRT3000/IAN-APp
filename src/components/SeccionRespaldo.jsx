/**
 * Sección «Respaldo de datos» de Configuración (Spec 025).
 * Exporta todos los datos a un archivo y los restaura desde uno, con confirmación y feedback.
 */
import React, { useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Text } from './base/Texto';
import { TOKENS } from '../theme/tokens';
import { mostrarAlerta } from '../utils/alertUtils';
import { anunciar } from '../utils/accesibilidad';
import { vibrarError, vibrarExito, vibrarSeleccionBascula } from '../services/haptics';
import { reproducirSonido } from '../services/sonidos';
import { elegirYLeerRespaldo, exportarRespaldo, restaurarRespaldo } from '../services/respaldo';

const plural = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`;

export const describirResumen = (resumen = {}) =>
  [
    plural(resumen.entrenamientos || 0, 'entrenamiento', 'entrenamientos'),
    plural(resumen.comidas || 0, 'comida', 'comidas'),
    plural(resumen.cambiosFisicos || 0, 'registro físico', 'registros físicos'),
    plural(resumen.sesionesEstudio || 0, 'sesión de estudio', 'sesiones de estudio'),
    plural(resumen.fotos || 0, 'foto', 'fotos'),
  ].join(', ');

const avisarError = (titulo, mensaje) => {
  vibrarError();
  reproducirSonido('error');
  mostrarAlerta(titulo, mensaje);
};

/**
 * @param {{ onDatosRestaurados?: () => Promise<void> | void, onRestauradoInterno?: () => Promise<void> | void }} props
 *   onDatosRestaurados: recarga los datos de la app (App.js → sincronizarDatos).
 *   onRestauradoInterno: deja que el panel relea su propio estado (preferencias de sonido).
 */
export default function SeccionRespaldo({ onDatosRestaurados, onRestauradoInterno }) {
  const [incluirFotos, setIncluirFotos] = useState(false);
  const [ocupado, setOcupado] = useState(null); // 'exportar' | 'restaurar' | null
  const enCursoRef = useRef(false);

  const empezar = (tipo) => {
    if (enCursoRef.current) return false;
    enCursoRef.current = true;
    setOcupado(tipo);
    return true;
  };
  const terminar = () => {
    enCursoRef.current = false;
    setOcupado(null);
  };

  const exportar = async () => {
    if (!empezar('exportar')) return;
    try {
      const { fotosOmitidas = 0 } = (await exportarRespaldo({ incluirFotos })) || {};
      vibrarExito();
      reproducirSonido('exito');
      anunciar('Respaldo creado');
      if (fotosOmitidas > 0) {
        mostrarAlerta(
          'Respaldo creado',
          `${plural(fotosOmitidas, 'foto no cupo', 'fotos no cupieron')} en el respaldo por su tamaño. Todos tus registros sí se guardaron.`
        );
      }
    } catch (error) {
      avisarError('No se pudo crear el respaldo', error?.message || 'Intenta de nuevo.');
    } finally {
      terminar();
    }
  };

  const aplicar = async (validado) => {
    if (!empezar('restaurar')) return;
    try {
      await restaurarRespaldo(validado);
    } catch (error) {
      avisarError('No se pudo restaurar', error?.message || 'Tus datos siguen como estaban.');
      terminar();
      return;
    }
    // Los datos YA están escritos: si recargar la pantalla falla, no es un fallo de restauración.
    let recargado = true;
    try {
      if (typeof onRestauradoInterno === 'function') await onRestauradoInterno();
      if (typeof onDatosRestaurados === 'function') await onDatosRestaurados();
    } catch {
      recargado = false;
    }
    vibrarExito();
    reproducirSonido('exito');
    anunciar('Respaldo restaurado');
    mostrarAlerta(
      'Respaldo restaurado',
      recargado
        ? 'Tus datos se restauraron correctamente.'
        : 'Tus datos se restauraron. Cierra y vuelve a abrir la app para verlos.'
    );
    terminar();
  };

  const restaurar = async () => {
    if (!empezar('restaurar')) return;
    let validado;
    try {
      validado = await elegirYLeerRespaldo();
    } catch (error) {
      terminar();
      avisarError('No se pudo leer el archivo', error?.message || 'Intenta con otro archivo.');
      return;
    }
    terminar();
    if (validado === null) return; // canceló el selector
    if (!validado.ok) {
      avisarError('Respaldo no válido', validado.error);
      return;
    }
    const fecha = validado.creado ? `Respaldo del ${validado.creado}` : 'Respaldo';
    mostrarAlerta(
      'Restaurar respaldo',
      `${fecha}: ${describirResumen(validado.resumen)}.\n\nReemplazará los datos actuales de este dispositivo. Tu API key no cambia.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Restaurar', style: 'destructive', onPress: () => aplicar(validado) },
      ]
    );
  };

  const alternarFotos = () => {
    vibrarSeleccionBascula();
    setIncluirFotos((v) => !v);
  };

  return (
    <View style={styles.tarjeta}>
      <View style={styles.encabezado}>
        <Feather name="archive" size={16} color={TOKENS.colors.textSecondary} />
        <View style={styles.textos}>
          <Text style={styles.titulo}>Respaldo de datos</Text>
          <Text style={styles.descripcion}>
            Guarda una copia de tus datos o restáurala en otro dispositivo. Tu API key no se incluye.
          </Text>
        </View>
      </View>

      <TouchableOpacity
        accessibilityRole="checkbox"
        accessibilityLabel="Incluir fotos en el respaldo"
        accessibilityHint="El archivo será más grande"
        aria-checked={incluirFotos}
        style={styles.filaCasilla}
        activeOpacity={0.85}
        onPress={alternarFotos}
      >
        <View style={[styles.casilla, incluirFotos && styles.casillaMarcada]}>
          {incluirFotos ? <Feather name="check" size={14} color={TOKENS.colors.canvas} /> : null}
        </View>
        <Text style={styles.textoCasilla}>Incluir fotos (archivo más grande)</Text>
      </TouchableOpacity>

      <View style={styles.filaBotones}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Exportar respaldo"
          aria-busy={ocupado === 'exportar'}
          aria-disabled={ocupado !== null}
          disabled={ocupado !== null}
          style={[styles.boton, styles.botonPrimario, ocupado !== null && styles.botonInactivo]}
          activeOpacity={0.85}
          onPress={exportar}
        >
          {ocupado === 'exportar' ? (
            <ActivityIndicator size="small" color={TOKENS.colors.canvas} />
          ) : (
            <Feather name="download" size={14} color={TOKENS.colors.canvas} />
          )}
          <Text style={[styles.textoBoton, styles.textoBotonPrimario]}>Exportar</Text>
        </TouchableOpacity>

        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Restaurar respaldo"
          accessibilityHint="Reemplaza los datos actuales por los del archivo"
          aria-busy={ocupado === 'restaurar'}
          aria-disabled={ocupado !== null}
          disabled={ocupado !== null}
          style={[styles.boton, styles.botonSecundario, ocupado !== null && styles.botonInactivo]}
          activeOpacity={0.85}
          onPress={restaurar}
        >
          {ocupado === 'restaurar' ? (
            <ActivityIndicator size="small" color={TOKENS.colors.textPrimary} />
          ) : (
            <Feather name="upload" size={14} color={TOKENS.colors.textPrimary} />
          )}
          <Text style={styles.textoBoton}>Restaurar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tarjeta: {
    backgroundColor: TOKENS.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: TOKENS.colors.borderDefault,
    borderRadius: TOKENS.radii.md,
    padding: 14,
    marginBottom: 20,
    gap: 12,
  },
  encabezado: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  textos: {
    flex: 1,
  },
  titulo: {
    color: TOKENS.colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  descripcion: {
    color: TOKENS.colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  filaCasilla: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 44,
  },
  casilla: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: TOKENS.colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  casillaMarcada: {
    backgroundColor: TOKENS.colors.textPrimary,
    borderColor: TOKENS.colors.textPrimary,
  },
  textoCasilla: {
    color: TOKENS.colors.textSecondary,
    fontSize: 13,
  },
  filaBotones: {
    flexDirection: 'row',
    gap: 10,
  },
  boton: {
    flex: 1,
    minHeight: 44,
    borderRadius: TOKENS.radii.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  botonPrimario: {
    backgroundColor: TOKENS.colors.textPrimary,
  },
  botonSecundario: {
    borderWidth: 1,
    borderColor: TOKENS.colors.borderStrong,
  },
  botonInactivo: {
    opacity: 0.6,
  },
  textoBoton: {
    color: TOKENS.colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  textoBotonPrimario: {
    color: TOKENS.colors.canvas,
  },
});
