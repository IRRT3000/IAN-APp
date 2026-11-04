import { Alert, Platform } from 'react-native';

/**
 * Utilidad universal de alertas multiplataforma (Mobile & Web).
 * En Android/iOS nativo invoca Alert.alert.
 * En Web (PWA/navegador), donde Alert.alert no ejecuta callbacks de botones,
 * utiliza window.confirm para acciones destructivas/confirmaciones de múltiples opciones
 * y window.alert para mensajes informativos, garantizando que onPress se ejecute siempre.
 *
 * @param {string} titulo
 * @param {string} [mensaje]
 * @param {Array<{ text: string, style?: 'default' | 'cancel' | 'destructive', onPress?: () => void }>} [botones]
 */
export function mostrarAlerta(titulo, mensaje, botones = [{ text: 'OK' }]) {
  const listaBotones = Array.isArray(botones) && botones.length > 0 ? botones : [{ text: 'OK' }];

  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const botonDestructivo = listaBotones.find((b) => b.style === 'destructive');
    const tieneMultiplesOpciones = listaBotones.length > 1;

    // Si tiene opción destructiva o múltiples opciones con callbacks, es una confirmación
    if (botonDestructivo || (tieneMultiplesOpciones && listaBotones.some((b) => typeof b.onPress === 'function'))) {
      const botonAccion = botonDestructivo || listaBotones.find((b) => b.style !== 'cancel' && typeof b.onPress === 'function');
      const botonCancelar = listaBotones.find((b) => b.style === 'cancel');

      const textoCompleto = mensaje ? `${titulo}\n\n${mensaje}` : titulo;
      const confirmado = window.confirm(textoCompleto);
      if (confirmado) {
        if (botonAccion && typeof botonAccion.onPress === 'function') {
          botonAccion.onPress();
        }
      } else if (botonCancelar && typeof botonCancelar.onPress === 'function') {
        botonCancelar.onPress();
      }
      return;
    }

    const textoCompleto = mensaje ? `${titulo}\n\n${mensaje}` : titulo;
    window.alert(textoCompleto);
    const botonOk = listaBotones.find((b) => typeof b.onPress === 'function');
    if (botonOk) {
      botonOk.onPress();
    }
    return;
  }

  Alert.alert(titulo, mensaje, listaBotones);
}
