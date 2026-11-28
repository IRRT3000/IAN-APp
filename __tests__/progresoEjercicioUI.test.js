/**
 * Progreso por ejercicio en la UI (Spec 030, CA-5).
 */
import '../test-utils/setupComponentes';
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import ModalProgresoEjercicio from '../src/components/entrenamientos/ModalProgresoEjercicio';
import EntrenamientosView from '../src/components/EntrenamientosView';
import { obtenerFechaLocal } from '../src/services/storage';

jest.mock('../src/components/CatalogoEjerciciosModal', () => () => null);
jest.mock('../src/components/LiveModeModal', () => () => null);
jest.mock('../src/components/CalculadoraPesoModal', () => () => null);
jest.mock('../src/components/MiniaturaEjercicio', () => () => null);

const reg = (id, ejercicio, fecha, series) => ({
  id,
  ejercicio,
  fecha,
  grupoMuscular: 'Pecho',
  implemento: 'Barra',
  series: series.length,
  repeticiones: series.reduce((a, [, r]) => a + r, 0),
  pesoMaximo: Math.max(...series.map(([p]) => p)),
  seriesDetalle: series.map(([peso, repeticiones], i) => ({ serie: i + 1, peso, repeticiones })),
});

const HISTORIAL = [
  reg('1', 'Press banca', '2026-11-01', [[80, 5]]),
  reg('2', 'Press banca', '2026-11-08', [[85, 5]]),
  reg('3', 'Press banca', '2026-11-15', [[90, 3]]),
];

describe('ModalProgresoEjercicio', () => {
  const montar = (entrenamientos, nombre = 'Press banca') =>
    render(
      <ModalProgresoEjercicio visible nombreEjercicio={nombre} entrenamientos={entrenamientos} onCerrar={jest.fn()} />
    );

  it('muestra los récords con su fecha', async () => {
    await montar(HISTORIAL);
    expect(screen.getByLabelText('Peso máximo: 90 kilos, el 15 de noviembre de 2026')).toBeTruthy();
    expect(screen.getByLabelText('1RM estimado: 99 kilos, el 8 de noviembre de 2026')).toBeTruthy();
    expect(screen.getByLabelText('Mejor volumen: 425 kilos, el 8 de noviembre de 2026')).toBeTruthy();
    expect(screen.getByRole('image').props.accessibilityLabel).toBe(
      '1RM estimado en las últimas 3 sesiones: de 93,5 a 99 kilos'
    );
  });

  it('el selector cambia aria-checked', async () => {
    await montar(HISTORIAL);
    const rm = screen.getByRole('radio', { name: '1RM estimado' });
    const vol = screen.getByRole('radio', { name: 'Volumen' });
    expect(rm).toBeChecked();
    expect(vol).not.toBeChecked();
    await fireEvent.press(vol);
    expect(screen.getByRole('radio', { name: 'Volumen' })).toBeChecked();
    expect(screen.getByRole('radio', { name: '1RM estimado' })).not.toBeChecked();
  });

  it('con una sola sesión pide registrar otro día', async () => {
    await montar([HISTORIAL[0]]);
    expect(screen.getByText('Registra este ejercicio otro día para ver tu progreso.')).toBeTruthy();
    expect(screen.queryByRole('image')).toBeNull();
  });

  it('sin peso elige una métrica con datos o avisa', async () => {
    await montar([reg('a', 'Dominadas', '2026-11-01', [[0, 10]]), reg('b', 'Dominadas', '2026-11-02', [[0, 12]])], 'Dominadas');
    expect(screen.getByText('Sin datos de peso para esta métrica.')).toBeTruthy();
  });

  it('con 12 sesiones solo etiqueta algunas fechas, siempre la última', async () => {
    const doce = Array.from({ length: 12 }, (_, i) =>
      reg(`s${i}`, 'Press banca', `2026-10-${String(i + 1).padStart(2, '0')}`, [[80, 5]])
    );
    await montar(doce);
    expect(screen.getByText('12/10', { includeHiddenElements: true })).toBeTruthy();
    expect(screen.queryByText('11/10', { includeHiddenElements: true })).toBeNull();
    expect(screen.getByText('10/10', { includeHiddenElements: true })).toBeTruthy();
    expect(screen.getByRole('image').props.accessibilityLabel).toBe(
      '1RM estimado en las últimas 12 sesiones: se mantiene en 93,5 kilos'
    );
  });

  it('tolera nombre nulo', async () => {
    await montar(HISTORIAL, null);
    expect(screen.getByText('Aún no hay sesiones de este ejercicio.')).toBeTruthy();
  });
});

describe('EntrenamientosView con récords', () => {
  it('marca solo el récord y abre el progreso', async () => {
    const hoy = obtenerFechaLocal();
    const entrenamientos = [
      reg('h1', 'Press banca', hoy, [[100, 5]]),
      reg('h2', 'Remo', hoy, [[60, 10]]),
      reg('p1', 'Press banca', '2020-01-01', [[80, 5]]),
    ];
    await render(<EntrenamientosView entrenamientos={entrenamientos} diasConActividad={[]} />);
    expect(screen.getAllByLabelText('Nuevo récord personal')).toHaveLength(1);
    await fireEvent.press(screen.getByRole('button', { name: 'Ver progreso de Press banca' }));
    expect(await screen.findByText('PROGRESO')).toBeTruthy();
    expect(screen.getByLabelText('Peso máximo: 100 kilos, el ' + require('../src/utils/etiquetasFecha').etiquetaFecha(hoy, { conDiaSemana: false }))).toBeTruthy();
  });
});
