import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import {
  obtenerColorGrupo,
  obtenerIconoImplemento,
} from '../constants/catalogoEjercicios';
import { obtenerImagenEjercicio } from '../constants/imagenesEjercicios';
import { TOKENS } from '../theme/tokens';

/**
 * Miniatura decorativa de un ejercicio (Spec 014).
 * Muestra la ilustración de RepDB a sangre (trae su propio fondo; la licencia
 * no permite quitarlo) o, si el ejercicio no tiene imagen, el icono Feather de
 * su implemento sobre un velo del color del grupo muscular.
 */
const MiniaturaEjercicio = ({ id, nombre, grupoMuscular, implemento, tamano = 44 }) => {
  const imagen = obtenerImagenEjercicio({ id, nombre });
  const colorGrupo = obtenerColorGrupo(grupoMuscular);

  return (
    <View
      style={[styles.contenedor, { width: tamano, height: tamano }]}
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
    >
      {imagen != null ? (
        <Image
          source={imagen}
          resizeMode="cover"
          fadeDuration={0}
          style={{ width: tamano, height: tamano }}
        />
      ) : (
        <>
          {/* Velo del grupo muscular: hex #RRGGBB + alfa 1A (~10%) */}
          <View
            style={[StyleSheet.absoluteFillObject, { backgroundColor: `${colorGrupo}1A` }]}
          />
          <Feather
            name={obtenerIconoImplemento(implemento)}
            size={tamano >= 44 ? 20 : 16}
            color={colorGrupo}
          />
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  contenedor: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: TOKENS.radii.sm,
    backgroundColor: TOKENS.colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: TOKENS.colors.borderDefault,
    overflow: 'hidden',
  },
});

export default React.memo(MiniaturaEjercicio);
