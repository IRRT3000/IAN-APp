/**
 * Sección «Respaldo de datos» (Spec 025, CA-5 y CA-6).
 */
import '../test-utils/setupComponentes';
import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import * as respaldo from '../src/services/respaldo';
import * as alertas from '../src/utils/alertUtils';
import * as haptics from '../src/services/haptics';
import * as sonidos from '../src/services/sonidos';
import SeccionRespaldo, { describirResumen } from '../src/components/SeccionRespaldo';

afterEach(() => {
  jest.restoreAllMocks();
});

const VALIDADO = {
  ok: true,
  datos: {},
  fotos: [],
  creado: '2026-11-24 19:30',
  resumen: { entrenamientos: 3, comidas: 1, cambiosFisicos: 0, sesionesEstudio: 2, fotos: 0 },
};

describe('SeccionRespaldo', () => {
  test('botones y casilla con nombre, rol y estado (CA-6)', async () => {
    await render(<SeccionRespaldo />);
    const casilla = screen.getByRole('checkbox', { name: 'Incluir fotos en el respaldo' });
    expect(casilla).not.toBeChecked();
    expect(screen.getByRole('button', { name: 'Exportar respaldo' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Restaurar respaldo' })).toBeTruthy();
    await fireEvent.press(casilla);
    expect(screen.getByRole('checkbox', { name: 'Incluir fotos en el respaldo' })).toBeChecked();
  });

  test('exportar pasa incluirFotos según la casilla y da feedback de éxito una vez', async () => {
    const exportar = jest.spyOn(respaldo, 'exportarRespaldo').mockResolvedValue({ resumen: {} });
    const exito = jest.spyOn(haptics, 'vibrarExito');
    const sonido = jest.spyOn(sonidos, 'reproducirSonido').mockImplementation(() => {});
    await render(<SeccionRespaldo />);
    await fireEvent.press(screen.getByRole('checkbox', { name: 'Incluir fotos en el respaldo' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Exportar respaldo' }));
    await act(async () => {});
    expect(exportar).toHaveBeenCalledWith({ incluirFotos: true });
    expect(exito).toHaveBeenCalledTimes(1);
    expect(sonido).toHaveBeenCalledWith('exito');
  });

  test('restaurar: confirma con el resumen y recarga los datos después de escribir (CA-5)', async () => {
    const orden = [];
    jest.spyOn(respaldo, 'elegirYLeerRespaldo').mockResolvedValue(VALIDADO);
    jest.spyOn(respaldo, 'restaurarRespaldo').mockImplementation(async () => {
      orden.push('restaurar');
    });
    jest.spyOn(sonidos, 'reproducirSonido').mockImplementation(() => {});
    const alerta = jest.spyOn(alertas, 'mostrarAlerta').mockImplementation(() => {});
    const onDatosRestaurados = jest.fn(async () => {
      orden.push('recargar');
    });
    const onRestauradoInterno = jest.fn(async () => {
      orden.push('interno');
    });
    await render(<SeccionRespaldo onDatosRestaurados={onDatosRestaurados} onRestauradoInterno={onRestauradoInterno} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Restaurar respaldo' }));
    await act(async () => {});
    const [titulo, mensaje, botones] = alerta.mock.calls[0];
    expect(titulo).toBe('Restaurar respaldo');
    expect(mensaje).toContain('2026-11-24 19:30');
    expect(mensaje).toContain('3 entrenamientos, 1 comida');
    expect(mensaje).toContain('Reemplazará los datos actuales');
    expect(onDatosRestaurados).not.toHaveBeenCalled();
    await act(async () => {
      await botones.find((b) => b.text === 'Restaurar').onPress();
    });
    expect(orden).toEqual(['restaurar', 'interno', 'recargar']);
    expect(onDatosRestaurados).toHaveBeenCalledTimes(1);
  });

  test('un respaldo inválido avisa con su error y no restaura nada', async () => {
    jest.spyOn(respaldo, 'elegirYLeerRespaldo').mockResolvedValue({ ok: false, error: 'Este archivo no es un respaldo de esta app.' });
    const restaurar = jest.spyOn(respaldo, 'restaurarRespaldo');
    const error = jest.spyOn(haptics, 'vibrarError');
    jest.spyOn(sonidos, 'reproducirSonido').mockImplementation(() => {});
    const alerta = jest.spyOn(alertas, 'mostrarAlerta').mockImplementation(() => {});
    await render(<SeccionRespaldo onDatosRestaurados={jest.fn()} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Restaurar respaldo' }));
    await act(async () => {});
    expect(alerta).toHaveBeenCalledWith('Respaldo no válido', 'Este archivo no es un respaldo de esta app.');
    expect(error).toHaveBeenCalledTimes(1);
    expect(restaurar).not.toHaveBeenCalled();
  });

  test('cancelar el selector no muestra nada', async () => {
    jest.spyOn(respaldo, 'elegirYLeerRespaldo').mockResolvedValue(null);
    const alerta = jest.spyOn(alertas, 'mostrarAlerta').mockImplementation(() => {});
    await render(<SeccionRespaldo />);
    await fireEvent.press(screen.getByRole('button', { name: 'Restaurar respaldo' }));
    await act(async () => {});
    expect(alerta).not.toHaveBeenCalled();
  });

  test('describirResumen usa singular y plural', () => {
    expect(describirResumen({ entrenamientos: 1, comidas: 0, cambiosFisicos: 2, sesionesEstudio: 1, fotos: 5 })).toBe(
      '1 entrenamiento, 0 comidas, 2 registros físicos, 1 sesión de estudio, 5 fotos'
    );
  });
});
