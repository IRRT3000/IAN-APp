/**
 * Utilidades de accesibilidad (Spec 023, RF-3).
 * - En Android/iOS se usa la API de anuncios del sistema (TalkBack/VoiceOver).
 * - En web, react-native-web 0.21 no implementa announceForAccessibility (es una función vacía),
 *   así que el mensaje se publica para <RegionAnuncios/>, una región aria-live="polite".
 * Regla anti-duplicado: se anuncian los ÉXITOS; los errores se muestran en un bloque con
 * accessibilityRole="alert", que el lector ya anuncia solo.
 */
import { AccessibilityInfo, Platform } from 'react-native';

const suscriptores = new Set();

/** Suscribe una función a los anuncios web. Devuelve la función para cancelar. */
export const suscribirAnuncios = (fn) => {
  suscriptores.add(fn);
  return () => suscriptores.delete(fn);
};

/**
 * Anuncia un mensaje al lector de pantalla. Nunca lanza.
 * @param {string} mensaje
 */
export const anunciar = (mensaje) => {
  const texto = String(mensaje || '').trim();
  if (!texto) return;
  try {
    if (Platform.OS === 'web') {
      suscriptores.forEach((fn) => fn(texto));
      return;
    }
    if (Platform.OS === 'ios' && typeof AccessibilityInfo.announceForAccessibilityWithOptions === 'function') {
      AccessibilityInfo.announceForAccessibilityWithOptions(texto, { queue: true });
      return;
    }
    AccessibilityInfo.announceForAccessibility(texto);
  } catch {
    // un anuncio fallido nunca debe interrumpir la app
  }
};
