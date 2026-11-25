/**
 * Preferencia de «reducir movimiento» del sistema (Spec 024, RF-1).
 *
 * Reanimated 4 lee la preferencia del sistema UNA sola vez al arrancar. Para que un cambio con la
 * app abierta se aplique al instante:
 * - Este módulo mantiene UNA sola suscripción a `reduceMotionChanged` (react-native-web guarda los
 *   oyentes por función, así que varias suscripciones chocarían) y la comparte con useSyncExternalStore.
 * - <ConfigMovimientoReducido/>, montado en la raíz, traduce la preferencia a <ReducedMotionConfig>,
 *   que Reanimated aplica a todas las animaciones nuevas (cascadas, transiciones, resortes).
 * El valor inicial sale de la lectura de arranque de Reanimated, así no hay destello de movimiento.
 */
import React, { useSyncExternalStore } from 'react';
import { AccessibilityInfo } from 'react-native';
import { ReduceMotion, ReducedMotionConfig, useReducedMotion } from 'react-native-reanimated';

let valorActual = null;
const oyentes = new Set();
let suscripcion = null;

const emitir = (valor) => {
  const nuevo = Boolean(valor);
  if (nuevo === valorActual) return;
  valorActual = nuevo;
  oyentes.forEach((fn) => fn());
};

const iniciarSuscripcion = () => {
  if (suscripcion) return;
  let llegoEvento = false;
  suscripcion = AccessibilityInfo.addEventListener?.('reduceMotionChanged', (valor) => {
    llegoEvento = true;
    emitir(valor);
  }) || { remove: () => {} };
  Promise.resolve(AccessibilityInfo.isReduceMotionEnabled?.())
    .then((valor) => {
      // Si ya llegó un evento, es más nuevo que esta lectura: no se pisa.
      if (!llegoEvento && typeof valor === 'boolean') emitir(valor);
    })
    .catch(() => {});
};

const suscribir = (fn) => {
  oyentes.add(fn);
  iniciarSuscripcion();
  return () => oyentes.delete(fn);
};

/** Hook reactivo: { reducir } se actualiza si el usuario cambia el ajuste con la app abierta. */
export function usePreferenciaMovimiento() {
  // Hasta el primer dato del sistema se usa la lectura de arranque de Reanimated (sin destello).
  const valorArranque = Boolean(useReducedMotion());
  const leer = () => valorActual ?? valorArranque;
  const reducir = useSyncExternalStore(suscribir, leer, leer);
  return { reducir };
}

/**
 * Aplica la preferencia a TODAS las animaciones de Reanimated (Spec 024, revisión B2).
 * Con «reducir» activo fuerza ReduceMotion.Always; si no, Never, para que desactivar el ajuste en
 * vivo también se respete (ReduceMotion.System seguiría con la lectura de arranque).
 * En desarrollo Reanimated avisa en consola «Reduced motion setting is overwritten…» al montarlo:
 * es esperado, no un fallo.
 */
export function ConfigMovimientoReducido() {
  const { reducir } = usePreferenciaMovimiento();
  return <ReducedMotionConfig mode={reducir ? ReduceMotion.Always : ReduceMotion.Never} />;
}

/**
 * Devuelve el valor final si hay que reducir movimiento, o la animación creada por `crearAnimacion`.
 * Recibe una función para no crear la animación cuando no hace falta.
 */
export const animarSegun = (reducir, valorFinal, crearAnimacion) => (reducir ? valorFinal : crearAnimacion());

/** Solo para pruebas. */
export const __reiniciarMovimientoParaTests = () => {
  valorActual = null;
  oyentes.clear();
  suscripcion?.remove?.();
  suscripcion = null;
};
