/**
 * Caracterización del onboarding ANTES del refactor (Spec 022, plan §1, CA-1).
 * Estos snapshots se tomaron con el código original y NO se regeneran durante el refactor:
 * cualquier diferencia significa que el refactor cambió algo visible.
 */
import '../test-utils/setupComponentes';
import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import * as storage from '../src/services/storage';
import OnboardingBienvenidaModal from '../src/components/OnboardingBienvenidaModal';

const AHORA = new Date(2026, 10, 23, 10, 0, 0);

const avanzarTiempo = async () => {
  await act(async () => {
    await jest.runOnlyPendingTimersAsync();
  });
};

const presionarTexto = async (texto) => {
  await fireEvent.press(screen.getByText(texto));
  await avanzarTiempo();
};

beforeEach(() => {
  jest.useFakeTimers({ now: AHORA, doNotFake: ['nextTick', 'queueMicrotask'] });
  jest.spyOn(Math, 'random').mockReturnValue(0.5);
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('Caracterización OnboardingBienvenidaModal (Spec 022)', () => {
  test('modo alta: recorre las 6 escenas y guarda el mismo perfil', async () => {
    const guardado = jest
      .spyOn(storage, 'guardarPerfilCompletoUsuario')
      .mockImplementation(async (perfil) => ({ ...perfil, id: 'perfil-prueba' }));
    const onPerfilActualizado = jest.fn();

    const { toJSON, unmount } = await render(
      <OnboardingBienvenidaModal visible onPerfilActualizado={onPerfilActualizado} />
    );
    await avanzarTiempo();
    expect(toJSON()).toMatchSnapshot('escena 0 - bienvenida');

    await presionarTexto('Configurar mi Perfil');
    expect(toJSON()).toMatchSnapshot('escena 1 - identidad');

    await presionarTexto('Continuar');
    expect(toJSON()).toMatchSnapshot('escena 2 - antropometria');

    await presionarTexto('Continuar');
    expect(toJSON()).toMatchSnapshot('escena 3 - antiguedad');

    await presionarTexto('Continuar');
    expect(toJSON()).toMatchSnapshot('escena 4 - objetivo');

    await presionarTexto('Guardar y Calibrar IA');
    expect(guardado).toHaveBeenCalledTimes(1);
    expect(guardado.mock.calls[0][0]).toMatchSnapshot('perfil enviado a guardarPerfilCompletoUsuario');
    expect(onPerfilActualizado).toHaveBeenCalledTimes(1);
    expect(toJSON()).toMatchSnapshot('escena 5 - celebracion');

    unmount();
  });

  test('modo edición: arranca en la escena 1 con el perfil existente', async () => {
    const perfilInicial = {
      nombre: 'Prueba',
      sexo: 'Mujer',
      fechaNacimiento: '1995-04-12',
      alturaCm: 165,
      pesoKgBase: 60.5,
      fechaInicioEntreno: '2024-01-15',
      objetivo: 'Definición',
      onboardingCompletado: true,
    };
    const { toJSON, unmount } = await render(
      <OnboardingBienvenidaModal visible modoEdicion perfilInicial={perfilInicial} />
    );
    await avanzarTiempo();
    expect(toJSON()).toMatchSnapshot('edicion - escena 1');
    unmount();
  });
});
