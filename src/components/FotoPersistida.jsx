import React from 'react';
import { Image, View } from 'react-native';
import { useUriFoto } from '../services/fotosStorage';

/**
 * Pinta una foto guardada con fotosStorage (Spec 020, plan §6).
 * Acepta URIs normales y referencias `foto-doc:` / `foto-local:`. Mientras una referencia web se
 * resuelve, reserva el mismo espacio con un View del mismo estilo para que la tarjeta no salte.
 */
export default function FotoPersistida({ uri, style, resizeMode }) {
  const uriResuelta = useUriFoto(uri);

  if (!uriResuelta) {
    return <View style={style} />;
  }

  return <Image source={{ uri: uriResuelta }} style={style} resizeMode={resizeMode} />;
}
