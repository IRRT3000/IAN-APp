/**
 * Anuncios para lector de pantalla (Spec 023, RF-3, CA-3).
 */
import '../test-utils/setupComponentes';
import React from 'react';
import { AccessibilityInfo, Platform } from 'react-native';
import { act, render, screen } from '@testing-library/react-native';
import { anunciar } from '../src/utils/accesibilidad';
import RegionAnuncios from '../src/components/base/RegionAnuncios';

const plataformaOriginal = Platform.OS;
afterEach(() => {
  Platform.OS = plataformaOriginal;
  jest.restoreAllMocks();
  jest.clearAllMocks();
  jest.useRealTimers();
});

describe('anunciar (Spec 023)', () => {
  test('en Android usa announceForAccessibility', () => {
    Platform.OS = 'android';
    const espia = jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => {});
    anunciar('Comida guardada');
    expect(espia).toHaveBeenCalledWith('Comida guardada');
  });

  test('en iOS usa la cola de anuncios si existe', () => {
    Platform.OS = 'ios';
    const conOpciones = jest.fn();
    AccessibilityInfo.announceForAccessibilityWithOptions = conOpciones;
    anunciar('Registro borrado');
    expect(conOpciones).toHaveBeenCalledWith('Registro borrado', { queue: true });
    delete AccessibilityInfo.announceForAccessibilityWithOptions;
  });

  test('ignora mensajes vacíos y nunca lanza', () => {
    Platform.OS = 'android';
    const espia = jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => {
      throw new Error('sin lector');
    });
    expect(() => anunciar('   ')).not.toThrow();
    expect(espia.mock.calls).toEqual([]);
    expect(() => anunciar('hola')).not.toThrow();
  });
});

describe('RegionAnuncios (web)', () => {
  test('muestra el anuncio en un nodo role="status" y lo repite aunque el texto sea igual', async () => {
    Platform.OS = 'web';
    jest.useFakeTimers({ doNotFake: ['nextTick', 'queueMicrotask'] });
    const { unmount } = await render(<RegionAnuncios />);
    await act(async () => {
      anunciar('Comida guardada en tu día');
      await jest.advanceTimersByTimeAsync(60);
    });
    expect(screen.getByText('Comida guardada en tu día')).toBeTruthy();
    await act(async () => {
      anunciar('Comida guardada en tu día');
    });
    expect(screen.queryByText('Comida guardada en tu día')).toBeNull();
    await act(async () => {
      await jest.advanceTimersByTimeAsync(60);
    });
    expect(screen.getByText('Comida guardada en tu día')).toBeTruthy();
    unmount();
  });

  test('en Android no renderiza nada', async () => {
    Platform.OS = 'android';
    const { toJSON, unmount } = await render(<RegionAnuncios />);
    expect(toJSON()).toBeNull();
    unmount();
  });
});
