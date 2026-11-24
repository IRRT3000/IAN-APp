import React, { useEffect, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { suscribirAnuncios } from '../../utils/accesibilidad';

const DURACION_MS = 5000;

/**
 * Región aria-live para anuncios en web (Spec 023, RF-3). En Android/iOS no renderiza nada:
 * allí `anunciar` usa la API del sistema. Visualmente oculta (no display:none, para que el
 * lector la lea). Un mensaje repetido se vuelve a anunciar porque primero se vacía la región.
 */
export default function RegionAnuncios() {
  const [mensaje, setMensaje] = useState('');

  useEffect(() => {
    if (Platform.OS !== 'web') return undefined;
    let temporizador = null;
    let reaparicion = null;
    const cancelar = suscribirAnuncios((texto) => {
      clearTimeout(temporizador);
      clearTimeout(reaparicion);
      setMensaje('');
      reaparicion = setTimeout(() => setMensaje(texto), 50);
      temporizador = setTimeout(() => setMensaje(''), DURACION_MS);
    });
    return () => {
      cancelar();
      clearTimeout(temporizador);
      clearTimeout(reaparicion);
    };
  }, []);

  if (Platform.OS !== 'web') return null;

  return (
    <View role="status" aria-live="polite" style={styles.oculta}>
      <Text>{mensaje}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  oculta: {
    position: 'absolute',
    width: 1,
    height: 1,
    overflow: 'hidden',
    opacity: 0,
    left: -10000,
    top: 0,
  },
});
