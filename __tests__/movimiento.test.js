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
import { animarSegun, usePreferenciaMovimiento, __reiniciarMovimientoParaTests } from '../src/utils/movimiento';
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
    jest.spyOn(AccessibilityInfo, 'addEventListener').mockImplementation((evento, fn) => {
      if (evento === 'reduceMotionChanged') oyente = fn;
      return { remove };
    });
    const { result, unmount } = await renderHook(() => usePreferenciaMovimiento());
    expect(result.current.reducir).toBe(false);
    await act(async () => oyente(true));
    expect(result.current.reducir).toBe(true);
    await unmount();
    expect(remove).toHaveBeenCalled();
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

  test('cada llamada a withRepeat está dentro de un if cuya condición menciona reducir', () => {
    const sinProteger = [];
    for (const archivo of listar('src')) {
      const codigo = fs.readFileSync(archivo, 'utf8');
      if (!codigo.includes('withRepeat(')) continue;
      const ast = parse(codigo, { sourceType: 'module', plugins: ['jsx'] });
      const pila = [];
      const recorrer = (n) => {
        if (!n || typeof n.type !== 'string') return;
        if (n.type === 'CallExpression' && n.callee.name === 'withRepeat') {
          const protegido = pila.some((p) => /reducir/i.test(codigo.slice(p.test.start, p.test.end)) && /^!/.test(codigo.slice(p.test.start, p.test.end).trim()));
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
    expect(sinProteger).toEqual([]);
  });
});
