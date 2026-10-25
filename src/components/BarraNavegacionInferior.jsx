import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function BarraNavegacionInferior({
  vistaActiva,
  onCambiarVista,
  contadorHoy = 0,
  contadorComidasHoy = 0,
  contadorFisicoHoy = 0,
}) {
  const esBienvenida = vistaActiva === 'bienvenida';
  const esTracker = vistaActiva === 'tracker';
  const esNutricion = vistaActiva === 'nutricion';
  const esFisico = vistaActiva === 'fisico';
  const esHeatmap = vistaActiva === 'heatmap';

  return (
    <View style={styles.contenedorBarra}>
      <TouchableOpacity
        style={[styles.botonTab, esBienvenida && styles.botonTabActivo]}
        activeOpacity={0.85}
        onPress={() => onCambiarVista('bienvenida')}
      >
        <View
          style={[
            styles.indicadorSuperior,
            esBienvenida && styles.indicadorSuperiorActivo,
          ]}
        />
        <Text style={[styles.iconoTexto, esBienvenida && styles.textoTabActivo]}>
          ⌂
        </Text>
        <Text
          numberOfLines={1}
          style={[
            styles.etiquetaTab,
            esBienvenida ? styles.textoTabActivo : styles.textoTabInactivo,
          ]}
        >
          Inicio
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.botonTab, esTracker && styles.botonTabActivo]}
        activeOpacity={0.85}
        onPress={() => onCambiarVista('tracker')}
      >
        <View
          style={[
            styles.indicadorSuperior,
            esTracker && styles.indicadorSuperiorActivo,
          ]}
        />
        <View style={styles.filaIconoConInsignia}>
          <Text style={[styles.iconoTexto, esTracker && styles.textoTabActivo]}>
            ⚡
          </Text>
          {contadorHoy > 0 ? (
            <View style={styles.insigniaContador}>
              <Text style={styles.textoInsigniaContador}>{contadorHoy}</Text>
            </View>
          ) : null}
        </View>
        <Text
          numberOfLines={1}
          style={[
            styles.etiquetaTab,
            esTracker ? styles.textoTabActivo : styles.textoTabInactivo,
          ]}
        >
          Entrenos
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.botonTab, esNutricion && styles.botonTabActivo]}
        activeOpacity={0.85}
        onPress={() => onCambiarVista('nutricion')}
      >
        <View
          style={[
            styles.indicadorSuperior,
            esNutricion && styles.indicadorSuperiorActivo,
          ]}
        />
        <View style={styles.filaIconoConInsignia}>
          <Text
            style={[styles.iconoTexto, esNutricion && styles.textoTabActivo]}
          >
            🥗
          </Text>
          {contadorComidasHoy > 0 ? (
            <View style={styles.insigniaContador}>
              <Text style={styles.textoInsigniaContador}>
                {contadorComidasHoy}
              </Text>
            </View>
          ) : null}
        </View>
        <Text
          numberOfLines={1}
          style={[
            styles.etiquetaTab,
            esNutricion ? styles.textoTabActivo : styles.textoTabInactivo,
          ]}
        >
          Nutrición
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.botonTab, esFisico && styles.botonTabActivo]}
        activeOpacity={0.85}
        onPress={() => onCambiarVista('fisico')}
      >
        <View
          style={[
            styles.indicadorSuperior,
            esFisico && styles.indicadorSuperiorActivo,
          ]}
        />
        <View style={styles.filaIconoConInsignia}>
          <Text style={[styles.iconoTexto, esFisico && styles.textoTabActivo]}>
            💪
          </Text>
          {contadorFisicoHoy > 0 ? (
            <View style={styles.insigniaContador}>
              <Text style={styles.textoInsigniaContador}>
                {contadorFisicoHoy}
              </Text>
            </View>
          ) : null}
        </View>
        <Text
          numberOfLines={1}
          style={[
            styles.etiquetaTab,
            esFisico ? styles.textoTabActivo : styles.textoTabInactivo,
          ]}
        >
          Físico
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.botonTab, esHeatmap && styles.botonTabActivo]}
        activeOpacity={0.85}
        onPress={() => onCambiarVista('heatmap')}
      >
        <View
          style={[
            styles.indicadorSuperior,
            esHeatmap && styles.indicadorSuperiorActivo,
          ]}
        />
        <View style={styles.filaIconoConInsignia}>
          <Text
            style={[styles.iconoTexto, esHeatmap && styles.textoTabActivo]}
          >
            🔥
          </Text>
        </View>
        <Text
          numberOfLines={1}
          style={[
            styles.etiquetaTab,
            esHeatmap ? styles.textoTabActivo : styles.textoTabInactivo,
          ]}
        >
          Heatmap
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  contenedorBarra: {
    flexDirection: 'row',
    backgroundColor: '#181818',
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 2,
    marginBottom: 10,
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    justifyContent: 'space-between',
  },
  botonTab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    borderRadius: 10,
    marginHorizontal: 1,
  },
  botonTabActivo: {
    backgroundColor: '#242424',
  },
  indicadorSuperior: {
    width: 20,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'transparent',
    marginBottom: 3,
  },
  indicadorSuperiorActivo: {
    backgroundColor: '#00E676',
  },
  filaIconoConInsignia: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconoTexto: {
    color: '#8D8D8D',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  etiquetaTab: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.1,
  },
  textoTabActivo: {
    color: '#00E676',
  },
  textoTabInactivo: {
    color: '#8D8D8D',
  },
  insigniaContador: {
    backgroundColor: '#00E676',
    borderRadius: 8,
    minWidth: 14,
    height: 14,
    paddingHorizontal: 3,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 3,
  },
  textoInsigniaContador: {
    color: '#121212',
    fontSize: 9,
    fontWeight: '800',
  },
});
