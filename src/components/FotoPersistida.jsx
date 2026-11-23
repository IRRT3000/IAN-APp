import React, { useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { TOKENS } from '../theme/tokens';
import { useUriFoto } from '../services/fotosStorage';

/**
 * Pinta una foto guardada con fotosStorage (Spec 020, plan §6).
 * Acepta URIs normales y referencias `foto-doc:` / `foto-local:`.
 * - Mientras una referencia web se resuelve, reserva el mismo espacio para que la tarjeta no salte.
 * - Si la foto ya no existe (caché vaciada, miniatura rotada) muestra un marcador de foto ausente.
 */
export default function FotoPersistida({ uri, style, resizeMode }) {
  const uriResuelta = useUriFoto(uri);
  const [fallida, setFallida] = useState(null);

  if (!uriResuelta || fallida === uriResuelta) {
    return (
      <View
        style={[style, styles.marcador]}
        accessibilityRole="image"
        accessibilityLabel="Foto no disponible"
      >
        <Feather name="image" size={16} color={TOKENS.colors.textMuted} />
      </View>
    );
  }

  return (
    <Image
      source={{ uri: uriResuelta }}
      style={style}
      resizeMode={resizeMode}
      onError={() => setFallida(uriResuelta)}
    />
  );
}

const styles = StyleSheet.create({
  marcador: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: TOKENS.colors.surfaceElevated,
  },
});
