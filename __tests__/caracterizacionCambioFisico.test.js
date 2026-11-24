/**
 * Caracterización de CambioFisicoView ANTES del refactor (Spec 022, plan §1, CA-1).
 * Estos snapshots se tomaron con el código original y NO se regeneran durante el refactor.
 */
import '../test-utils/setupComponentes';
import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import * as ImagePicker from 'expo-image-picker';
import CambioFisicoView from '../src/components/CambioFisicoView';

const AHORA = new Date(2026, 10, 23, 10, 0, 0);

const PERFIL = {
  nombre: 'Prueba',
  sexo: 'Hombre',
  fechaNacimiento: '1996-05-10',
  alturaCm: 178,
  pesoKgBase: 80,
  fechaInicioEntreno: '2024-02-01',
  objetivo: 'Recomposición',
  onboardingCompletado: true,
};

const REGISTROS = [
  {
    id: 'r-2',
    fecha: '2026-11-23',
    hora12h: '8:15 AM',
    momentoDia: 'En ayunas',
    pesoKg: 79.2,
    alturaCm: 178,
    urisFotos: ['file:///cache/a.jpg'],
    cantidadFotos: 1,
    resumenSimple: 'Definición abdominal visible.',
    resumenDetallado: 'Detalle del análisis actual.',
    balanceDelDia: 'Buen balance proteico.',
    veredicto: 8.2,
    puntosClave: ['Hombros más marcados'],
    modeloUsado: 'gemini-3.5-flash-lite',
    comparacionAnterior: null,
  },
  {
    id: 'r-1',
    fecha: '2026-11-23',
    hora12h: '7:00 AM',
    momentoDia: 'En ayunas',
    pesoKg: 80.1,
    alturaCm: 178,
    urisFotos: [],
    cantidadFotos: 1,
    resumenSimple: 'Base atlética.',
    resumenDetallado: 'Detalle del análisis previo.',
    balanceDelDia: '',
    veredicto: 7.4,
    puntosClave: [],
    modeloUsado: 'gemini-3.5-flash-lite',
    comparacionAnterior: null,
  },
];

const avanzarTiempo = async () => {
  await act(async () => {
    await jest.runOnlyPendingTimersAsync();
  });
};

const renderVista = async (props = {}) => {
  const resultado = await render(
    <CambioFisicoView
      cambiosExternos={[]}
      entrenamientosHoy={[]}
      comidasHoy={[]}
      perfilExterno={PERFIL}
      perfilUsuario={PERFIL}
      {...props}
    />
  );
  await avanzarTiempo();
  return resultado;
};

beforeEach(() => {
  jest.useFakeTimers({ now: AHORA, doNotFake: ['nextTick', 'queueMicrotask'] });
  jest.spyOn(Math, 'random').mockReturnValue(0.5);
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('Caracterización CambioFisicoView (Spec 022)', () => {
  test('sin registros', async () => {
    const { toJSON, unmount } = await renderVista();
    expect(toJSON()).toMatchSnapshot();
    unmount();
  });

  test('con 2 registros de hoy', async () => {
    const { toJSON, unmount } = await renderVista({ cambiosExternos: REGISTROS });
    expect(screen.getByText('Definición abdominal visible.')).toBeTruthy();
    expect(toJSON()).toMatchSnapshot();
    unmount();
  });

  test('modal de báscula y hora abierto tras elegir fotos', async () => {
    ImagePicker.launchImageLibraryAsync.mockResolvedValueOnce({
      canceled: false,
      assets: [{ uri: 'file:///cache/nueva.jpg', base64: 'QUJD', width: 100, height: 100 }],
    });
    const { toJSON, unmount } = await renderVista();
    await fireEvent.press(screen.getByText('Galería (1–10)'));
    await avanzarTiempo();
    await fireEvent.press(screen.getByText(/Continuar a Báscula y Hora/));
    await avanzarTiempo();
    expect(screen.getByText('Analizar con Gemini')).toBeTruthy();
    expect(toJSON()).toMatchSnapshot();
    unmount();
  });

  test('día pasado en modo solo lectura', async () => {
    const { toJSON, unmount } = await renderVista({ cambiosExternos: REGISTROS });
    await fireEvent.press(screen.getByText('20'));
    await avanzarTiempo();
    expect(toJSON()).toMatchSnapshot();
    unmount();
  });
});
