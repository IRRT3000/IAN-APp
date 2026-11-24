/**
 * Preferencia de «reducir movimiento» del sistema (Spec 024, RF-1).
 *
 * Reanimated 4 ya aplica ReduceMotion.System por defecto a withTiming/withSpring/withRepeat, pero
 * `useReducedMotion()` solo lee la preferencia AL ARRANCAR. Este hook es reactivo: se suscribe a
 * `reduceMotionChanged` (react-native-web lo implementa sobre matchMedia), así que si el usuario
 * cambia el ajuste con la app abierta, el efecto es inmediato.
 * El valor inicial sale de useReducedMotion() (lectura de arranque) o de la última lectura en caché,
 * para que el primer render ya respete la preferencia y no haya un destello de movimiento.
 */
import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

let cacheReducir = null;

export function usePreferenciaMovimiento() {
  const valorArranque = useReducedMotion();
  const [reducir, setReducir] = useState(() => cacheReducir ?? Boolean(valorArranque));

  useEffect(() => {
    let activo = true;
    const actualizar = (valor) => {
      cacheReducir = Boolean(valor);
      if (activo) setReducir(Boolean(valor));
    };
    Promise.resolve(AccessibilityInfo.isReduceMotionEnabled?.())
      .then((valor) => {
        if (typeof valor === 'boolean') actualizar(valor);
      })
      .catch(() => {});
    const suscripcion = AccessibilityInfo.addEventListener?.('reduceMotionChanged', actualizar);
    return () => {
      activo = false;
      suscripcion?.remove?.();
    };
  }, []);

  return { reducir };
}

/**
 * Devuelve el valor final si hay que reducir movimiento, o la animación creada por `crearAnimacion`.
 * Recibe una función para no crear la animación cuando no hace falta.
 */
export const animarSegun = (reducir, valorFinal, crearAnimacion) => (reducir ? valorFinal : crearAnimacion());

/** Solo para pruebas. */
export const __reiniciarMovimientoParaTests = () => {
  cacheReducir = null;
};
