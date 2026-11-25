/**
 * Feedback de resultado (Spec 024, RF-4/RF-5, CA-3 y CA-8): háptico y sonido correctos por flujo.
 */
import '../test-utils/setupComponentes';
import React from 'react';
import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import * as haptics from '../src/services/haptics';
import * as sonidos from '../src/services/sonidos';
import * as gemini from '../src/services/gemini';
import ModalAnalisisComida from '../src/components/ModalAnalisisComida';

const plataformaOriginal = Platform.OS;
afterEach(() => {
  Platform.OS = plataformaOriginal;
  jest.restoreAllMocks();
  jest.clearAllMocks();
});

describe('haptics de resultado', () => {
  test('en web no llaman a expo-haptics', async () => {
    Platform.OS = 'web';
    await haptics.vibrarExito();
    await haptics.vibrarError();
    await haptics.vibrarAviso();
    expect(Haptics.notificationAsync).not.toHaveBeenCalled();
  });

  test('en nativo usan el tipo de notificación correcto', async () => {
    Platform.OS = 'android';
    await haptics.vibrarExito();
    await haptics.vibrarError();
    await haptics.vibrarAviso();
    expect(Haptics.notificationAsync.mock.calls.map(([t]) => t)).toEqual([
      Haptics.NotificationFeedbackType.Success,
      Haptics.NotificationFeedbackType.Error,
      Haptics.NotificationFeedbackType.Warning,
    ]);
  });
});

describe('ModalAnalisisComida: háptico y sonido por resultado', () => {
  const renderModal = () =>
    render(
      <ModalAnalisisComida
        visible
        fotoUri="file:///cache/a.jpg"
        fotoBase64="QUJD"
        tipoComida="Snack"
        perfilUsuario={{}}
        onCerrar={jest.fn()}
        onGuardar={jest.fn()}
        onCambiarFoto={jest.fn()}
      />
    );

  test('éxito: vibrarExito y sonido «exito» una sola vez, sin error', async () => {
    Platform.OS = 'android';
    jest.spyOn(gemini, 'analizarComidaConGemini').mockResolvedValue({ nombre: 'Manzana', calorias: 95, proteinas: 0.5, carbohidratos: 25, grasas: 0.3, detalles: '' });
    const exito = jest.spyOn(haptics, 'vibrarExito');
    const error = jest.spyOn(haptics, 'vibrarError');
    const sonido = jest.spyOn(sonidos, 'reproducirSonido').mockImplementation(() => {});
    const { unmount } = await renderModal();
    await fireEvent.press(screen.getByLabelText('Analizar con IA'));
    await act(async () => {});
    expect(exito).toHaveBeenCalledTimes(1);
    expect(error).not.toHaveBeenCalled();
    expect(sonido.mock.calls.filter(([n]) => n === 'exito')).toHaveLength(1);
    expect(sonido).not.toHaveBeenCalledWith('error');
    await unmount();
  });

  test('error: vibrarError y sonido «error», sin éxito', async () => {
    Platform.OS = 'android';
    jest.spyOn(gemini, 'analizarComidaConGemini').mockRejectedValue(new Error('Gemini está saturado en este momento.'));
    const exito = jest.spyOn(haptics, 'vibrarExito');
    const error = jest.spyOn(haptics, 'vibrarError');
    const sonido = jest.spyOn(sonidos, 'reproducirSonido').mockImplementation(() => {});
    const { unmount } = await renderModal();
    await fireEvent.press(screen.getByLabelText('Analizar con IA'));
    await act(async () => {});
    expect(error).toHaveBeenCalledTimes(1);
    expect(exito).not.toHaveBeenCalled();
    expect(sonido).toHaveBeenCalledWith('error');
    expect(sonido).not.toHaveBeenCalledWith('exito');
    await unmount();
  });
});
