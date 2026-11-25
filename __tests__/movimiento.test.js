/**
 * Movimiento reducido (Spec 024, RF-1, CA-1/CA-2).
 */
import '../test-utils/setupComponentes';
import fs from 'fs';
import path from 'path';
import React from 'react';
import { AccessibilityInfo } from 'react-native';
import { act, render, renderHook } from '@testing-library/react-native';
import * as Reanimated from 'react-native-reanimated';
import { parse } from '@babel/parser';
import { animarSegun, ConfigMovimientoReducido, usePreferenciaMovimiento, __reiniciarMovimientoParaTests } from '../src/utils/movimiento';
import OnboardingBienvenidaModal from '../src/components/OnboardingBienvenidaModal';

afterEach(() => {
  jest.restoreAllMocks();
  __reiniciarMovimientoParaTests();
});

describe('animarSegun', () => {
  test('con reducir no crea la animación y devuelve el valor final', () => {
    const crear = jest.fn(() => 'animacion');
    expect(animarSegun(true, 1, crear)).toBe(1);
    expect(crear).not.toHaveBeenCalled();
    expect(animarSegun(false, 1, crear)).toBe('animacion');
  });
});

describe('usePreferenciaMovimiento', () => {
  test('lee la preferencia y reacciona a reduceMotionChanged sin reiniciar la app', async () => {
    let oyente = null;
    const remove = jest.fn();
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false);
    const alta = jest.spyOn(AccessibilityInfo, 'addEventListener').mockImplementation((evento, fn) => {
      if (evento === 'reduceMotionChanged') oyente = fn;
      return { remove };
    });
    const uno = await renderHook(() => usePreferenciaMovimiento());
    const dos = await renderHook(() => usePreferenciaMovimiento());
    expect(uno.result.current.reducir).toBe(false);
    // Una sola suscripción compartida (react-native-web guarda los oyentes por función).
    expect(alta).toHaveBeenCalledTimes(1);
    await act(async () => oyente(true));
    expect(uno.result.current.reducir).toBe(true);
    expect(dos.result.current.reducir).toBe(true);
    await act(async () => oyente(false));
    expect(dos.result.current.reducir).toBe(false);
    await uno.unmount();
    await dos.unmount();
    __reiniciarMovimientoParaTests();
    expect(remove).toHaveBeenCalledTimes(1);
  });
});

describe('ConfigMovimientoReducido (cambio en vivo, revisión B2)', () => {
  test('pasa de Never a Always y de vuelta cuando cambia la preferencia', async () => {
    let oyente = null;
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false);
    jest.spyOn(AccessibilityInfo, 'addEventListener').mockImplementation((evento, fn) => {
      if (evento === 'reduceMotionChanged') oyente = fn;
      return { remove: jest.fn() };
    });
    const modos = [];
    jest.spyOn(Reanimated, 'ReducedMotionConfig').mockImplementation(({ mode }) => {
      modos.push(mode);
      return null;
    });
    const { unmount } = await render(<ConfigMovimientoReducido />);
    await act(async () => {});
    expect(modos.at(-1)).toBe(Reanimated.ReduceMotion.Never);
    await act(async () => oyente(true));
    expect(modos.at(-1)).toBe(Reanimated.ReduceMotion.Always);
    await act(async () => oyente(false));
    expect(modos.at(-1)).toBe(Reanimated.ReduceMotion.Never);
    await unmount();
  });
});

describe('onboarding con «reducir movimiento»', () => {
  test('el pulso infinito del anillo (withRepeat) no se inicia', async () => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
    jest.spyOn(AccessibilityInfo, 'addEventListener').mockReturnValue({ remove: jest.fn() });
    jest.spyOn(Reanimated, 'useReducedMotion').mockReturnValue(true);
    const repetir = jest.spyOn(Reanimated, 'withRepeat');
    const { unmount } = await render(<OnboardingBienvenidaModal visible />);
    await act(async () => {});
    expect(repetir).not.toHaveBeenCalled();
    unmount();
  });

  test('sin «reducir movimiento» el pulso sí se inicia (comportamiento original)', async () => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false);
    jest.spyOn(AccessibilityInfo, 'addEventListener').mockReturnValue({ remove: jest.fn() });
    const repetir = jest.spyOn(Reanimated, 'withRepeat');
    const { unmount } = await render(<OnboardingBienvenidaModal visible />);
    await act(async () => {});
    expect(repetir).toHaveBeenCalled();
    unmount();
  });
});

describe('regla estática: todo withRepeat está protegido por «reducir» (CA-2)', () => {
  const listar = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const r = path.join(dir, e.name);
    return e.isDirectory() ? listar(r) : /\.jsx?$/.test(e.name) ? [r] : [];
  });

  test('cada llamada a withRepeat está dentro de un if (!reducir) o (!reducirRef.current)', () => {
    const sinProteger = [];
    let encontrados = 0;
    const CONDICIONES = ['!reducir', '!reducirRef.current'];
    const esWithRepeat = (callee) =>
      (callee.type === 'Identifier' && callee.name === 'withRepeat') ||
      (callee.type === 'MemberExpression' && !callee.computed && callee.property.name === 'withRepeat');
    for (const archivo of listar('src')) {
      const codigo = fs.readFileSync(archivo, 'utf8');
      if (!codigo.includes('withRepeat')) continue;
      const ast = parse(codigo, { sourceType: 'module', plugins: ['jsx'] });
      const pila = [];
      const recorrer = (n) => {
        if (!n || typeof n.type !== 'string') return;
        if (n.type === 'CallExpression' && esWithRepeat(n.callee)) {
          encontrados += 1;
          const protegido = pila.some((p) => CONDICIONES.includes(codigo.slice(p.test.start, p.test.end).replace(/s+/g, '')));
          if (!protegido) sinProteger.push(`${archivo}:${n.loc.start.line}`);
        }
        const esIf = n.type === 'IfStatement';
        if (esIf) {
          recorrer(n.test);
          pila.push(n);
          recorrer(n.consequent);
          pila.pop();
          recorrer(n.alternate);
          return;
        }
        for (const k of Object.keys(n)) {
          if (['loc', 'start', 'end'].includes(k)) continue;
          const v = n[k];
          if (Array.isArray(v)) v.forEach(recorrer);
          else if (v && typeof v.type === 'string') recorrer(v);
        }
      };
      recorrer(ast.program);
    }
    expect(encontrados).toBeGreaterThan(0);
    expect(sinProteger).toEqual([]);
  });
});
