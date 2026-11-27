/**
 * Anuncios para lector de pantalla (Spec 023, RF-3, CA-3).
 */
import '../test-utils/setupComponentes';
import React from 'react';
import { AccessibilityInfo, Platform } from 'react-native';
import { act, render, screen } from '@testing-library/react-native';
import { anunciar } from '../src/utils/accesibilidad';
import RegionAnuncios from '../src/components/base/RegionAnuncios';
import { CapsulaBorradoSeguroFisico } from '../src/components/cambioFisico/base';

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

describe('Acción accesible de borrado (Spec 023, RF-1)', () => {
  test('la acción "borrar" del lector de pantalla abre el borrado sin pulsación sostenida', async () => {
    const { fireEvent } = require('@testing-library/react-native');
    const onBorrar = jest.fn();
    const { unmount } = await render(<CapsulaBorradoSeguroFisico onBorrar={onBorrar} onAvisoCorto={jest.fn()} />);
    const boton = screen.getByLabelText('Borrar registro');
    await fireEvent(boton, 'accessibilityAction', { nativeEvent: { actionName: 'borrar' } });
    expect(onBorrar).toHaveBeenCalledTimes(1);
    await fireEvent(boton, 'accessibilityAction', { nativeEvent: { actionName: 'activate' } });
    expect(onBorrar).toHaveBeenCalledTimes(1);
    unmount();
  });
});

describe('ModalAnalisisComida: éxito y error se comunican una sola vez (CA-3)', () => {
  const React2 = require('react');
  const { fireEvent } = require('@testing-library/react-native');
  const accesibilidad = require('../src/utils/accesibilidad');
  const gemini = require('../src/services/gemini');
  const ModalAnalisisComida = require('../src/components/ModalAnalisisComida').default;

  const renderModal = () =>
    render(
      React2.createElement(ModalAnalisisComida, {
        visible: true,
        fotoUri: 'file:///cache/a.jpg',
        fotoBase64: 'QUJD',
        tipoComida: 'Snack',
        perfilUsuario: {},
        onCerrar: jest.fn(),
        onGuardar: jest.fn(),
        onCambiarFoto: jest.fn(),
      })
    );

  test('éxito: anuncia una vez el resultado', async () => {
    Platform.OS = 'android';
    jest.spyOn(gemini, 'analizarComidaConGemini').mockResolvedValue({ nombre: 'Manzana', calorias: 95, proteinas: 0.5, carbohidratos: 25, grasas: 0.3, detalles: '' });
    const anuncio = jest.spyOn(accesibilidad, 'anunciar');
    const { unmount } = await renderModal();
    await fireEvent.press(screen.getByLabelText('Analizar con IA'));
    await act(async () => {});
    expect(anuncio).toHaveBeenCalledTimes(1);
    expect(anuncio.mock.calls[0][0]).toContain('Análisis listo: Manzana, 95 kilocalorías');
    unmount();
  });

  test('error: muestra el bloque alert y lo anuncia en nativo, sin anunciar éxito', async () => {
    Platform.OS = 'android';
    jest.spyOn(gemini, 'analizarComidaConGemini').mockRejectedValue(new Error('Gemini está saturado en este momento.'));
    const lector = jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => {});
    const { unmount } = await renderModal();
    await fireEvent.press(screen.getByLabelText('Analizar con IA'));
    await act(async () => {});
    expect(screen.getByRole('alert')).toBeTruthy();
    expect(screen.getByText('Gemini está saturado en este momento.')).toBeTruthy();
    expect(lector).toHaveBeenCalledWith('Gemini está saturado en este momento.');
    expect(lector.mock.calls.some(([m]) => String(m).startsWith('Análisis listo'))).toBe(false);
    unmount();
  });
});
