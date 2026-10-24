import { Platform, Vibration } from 'react-native';
import * as Haptics from 'expo-haptics';

/**
 * Emite el primer pulso háptico ligero al iniciar la presión del botón de eliminar (onPressIn).
 * Usa expo-haptics y cae en Vibration.vibrate(30) si el motor háptico no está disponible.
 */
export const vibrarInicioPresionBorrado = async () => {
  if (Platform.OS === 'web') {
    return;
  }

  try {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  } catch {
    try {
      Vibration.vibrate(30);
    } catch {
      // Dispositivo sin vibrador
    }
  }
};

/**
 * Emite el segundo pulso háptico firme al completar 1 segundo de presión (onLongPress).
 * Usa expo-haptics (Warning) y además refuerza con Vibration.vibrate(120) en caso de fallo.
 */
export const vibrarConfirmacionBorrado = async () => {
  if (Platform.OS === 'web') {
    return;
  }

  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  } catch {
    try {
      Vibration.vibrate(120);
    } catch {
      // Dispositivo sin vibrador
    }
  }
};

/**
 * Emite un pulso háptico inmediato al pulsar en un solo toque el botón
 * "🔄 Comparar con registro anterior" (RF-15).
 */
export const vibrarToqueComparacion = async () => {
  if (Platform.OS === 'web') {
    return;
  }

  try {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  } catch {
    try {
      Vibration.vibrate(45);
    } catch {
      // Dispositivo sin vibrador
    }
  }
};

/**
 * Emite un micro-pulso háptico suave al ajustar el peso en la báscula circular moderna
 * o al cambiar la hora/momento del día (RF-9, RF-10).
 */
export const vibrarSeleccionBascula = async () => {
  if (Platform.OS === 'web') {
    return;
  }

  try {
    await Haptics.selectionAsync();
  } catch {
    try {
      Vibration.vibrate(15);
    } catch {
      // Dispositivo sin vibrador
    }
  }
};

export const vibrarAjusteBascula = vibrarSeleccionBascula;

/**
 * Emite un pulso háptico ligero al añadir una nueva serie en Live Mode (RF-10).
 */
export const vibrarSerieAgregada = async () => {
  if (Platform.OS === 'web') {
    return;
  }

  try {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  } catch {
    try {
      Vibration.vibrate(20);
    } catch {
      // Dispositivo sin vibrador
    }
  }
};

/**
 * Emite un pulso háptico de notificación exitosa al concluir y consolidar un ejercicio (RF-15).
 */
export const vibrarEjercicioCompletado = async () => {
  if (Platform.OS === 'web') {
    return;
  }

  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  } catch {
    try {
      Vibration.vibrate([0, 50, 70, 90]);
    } catch {
      // Dispositivo sin vibrador
    }
  }
};

