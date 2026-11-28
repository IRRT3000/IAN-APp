/**
 * Nutrición sin IA en la vista (Spec 028, CA-1, CA-4 y CA-7).
 */
import '../test-utils/setupComponentes';
import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import * as gemini from '../src/services/gemini';
import * as sonidos from '../src/services/sonidos';
import NutricionView from '../src/components/NutricionView';
import {
  STORAGE_KEY_COMIDAS,
  STORAGE_KEY_META_NUTRICION,
  cargarComidas,
  obtenerFechaLocal,
} from '../src/services/storage';

const PERFIL = {
  sexo: 'Hombre',
  pesoKgActual: 80,
  alturaCm: 180,
  fechaNacimiento: '1996-01-01',
  objetivo: 'Mantenimiento',
};

let espiaGemini;
beforeEach(async () => {
  await AsyncStorage.clear();
  espiaGemini = jest.spyOn(gemini, 'analizarComidaConGemini');
  jest.spyOn(sonidos, 'reproducirSonido').mockImplementation(() => {});
  await AsyncStorage.setItem(
    STORAGE_KEY_META_NUTRICION,
    JSON.stringify({ modo: 'manual', calorias: 2000, proteinas: 150, carbohidratos: 200, grasas: 60 })
  );
});
afterEach(() => {
  jest.restoreAllMocks();
});

const sembrarComidaDeHoy = () =>
  AsyncStorage.setItem(
    STORAGE_KEY_COMIDAS,
    JSON.stringify([
      {
        id: 'c1',
        fecha: obtenerFechaLocal(),
        tipo: 'Comida',
        nombre: 'Pollo',
        calorias: 500,
        proteinas: 40,
        carbohidratos: 30,
        grasas: 10,
        uriFoto: '',
      },
    ])
  );

describe('NutricionView sin IA', () => {
  test('registro manual sin foto ni API key (CA-1)', async () => {
    await render(<NutricionView perfilUsuario={PERFIL} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Registrar comida a mano, sin foto' }));

    const guardar = await screen.findByRole('button', { name: 'Guardar en mi día' });
    expect(guardar).toBeDisabled();

    await fireEvent.changeText(screen.getByLabelText('Nombre del plato, obligatorio'), 'Avena');
    await fireEvent.changeText(screen.getByLabelText('Calorías en kilocalorías'), '350');
    await fireEvent.changeText(screen.getByLabelText('Proteínas en gramos'), '12,5');
    const chipsSnack = screen.getAllByRole('radio', { name: 'Tipo de comida: Snack' });
    await fireEvent.press(chipsSnack[chipsSnack.length - 1]);
    await fireEvent.press(screen.getByRole('button', { name: 'Guardar en mi día' }));

    await waitFor(async () => expect((await cargarComidas()).length).toBe(1));
    const [comida] = await cargarComidas();
    expect(comida).toMatchObject({ nombre: 'Avena', calorias: 350, proteinas: 12.5, tipo: 'Snack', uriFoto: '' });
    expect(await screen.findByText('Avena')).toBeTruthy();
    expect(espiaGemini).not.toHaveBeenCalled();
  });

  test('tocar una comida de hoy abre la edición prellenada y guarda sin Gemini (CA-4)', async () => {
    await sembrarComidaDeHoy();
    await render(<NutricionView perfilUsuario={PERFIL} />);
    await fireEvent.press(await screen.findByRole('button', { name: 'Editar Pollo' }));

    const nombre = await screen.findByLabelText('Nombre del plato, obligatorio');
    expect(nombre.props.value).toBe('Pollo');
    expect(screen.getByLabelText('Calorías en kilocalorías').props.value).toBe('500');
    await fireEvent.changeText(screen.getByLabelText('Calorías en kilocalorías'), '620');
    await fireEvent.press(screen.getByRole('button', { name: 'Guardar cambios' }));

    await waitFor(async () => expect((await cargarComidas())[0].calorias).toBe(620));
    expect((await cargarComidas())[0].id).toBe('c1');
    expect(espiaGemini).not.toHaveBeenCalled();
  });

  test('el borrado no queda dentro del botón de edición', async () => {
    await sembrarComidaDeHoy();
    await render(<NutricionView perfilUsuario={PERFIL} />);
    const editar = await screen.findByRole('button', { name: 'Editar Pollo' });
    expect(() =>
      // within del botón de edición no debe encontrar la cápsula de borrado
      require('@testing-library/react-native').within(editar).getByLabelText('Borrar comida')
    ).toThrow();
    expect(screen.getByLabelText('Borrar comida')).toBeTruthy();
  });

  test('barra de progreso y textos de meta (CA-7)', async () => {
    await sembrarComidaDeHoy();
    await render(<NutricionView perfilUsuario={PERFIL} />);
    const barra = await screen.findByRole('progressbar', {
      name: 'Calorías: 500 de 2000 kilocalorías',
    });
    expect(barra.props['aria-valuemax']).toBe(2000);
    expect(screen.getByText('500 / 2000 kcal')).toBeTruthy();
    expect(screen.getByText('40 / 150 g')).toBeTruthy();
  });

  test('pasarse de la meta muestra el exceso', async () => {
    await AsyncStorage.setItem(
      STORAGE_KEY_META_NUTRICION,
      JSON.stringify({ modo: 'manual', calorias: 800, proteinas: 10, carbohidratos: 10, grasas: 10 })
    );
    await AsyncStorage.setItem(
      STORAGE_KEY_COMIDAS,
      JSON.stringify([{ id: 'c1', fecha: obtenerFechaLocal(), tipo: 'Cena', nombre: 'Pizza', calorias: 1000, uriFoto: '' }])
    );
    await render(<NutricionView perfilUsuario={PERFIL} />);
    expect(await screen.findByText('+200 kcal sobre la meta')).toBeTruthy();
    expect(screen.getByRole('progressbar', { name: 'Calorías: 1000 de 800 kilocalorías, 200 sobre la meta' })).toBeTruthy();
  });

  test('editar meta fuera de rango muestra error y no guarda', async () => {
    await render(<NutricionView perfilUsuario={PERFIL} />);
    await fireEvent.press(await screen.findByRole('button', { name: 'Editar meta diaria' }));
    await fireEvent.changeText(await screen.findByLabelText('Meta de calorías en kilocalorías'), '100');
    await fireEvent.press(screen.getByRole('button', { name: 'Guardar meta propia' }));
    expect(await screen.findByText('Las calorías deben estar entre 800 y 8000.')).toBeTruthy();
    expect(JSON.parse(await AsyncStorage.getItem(STORAGE_KEY_META_NUTRICION)).calorias).toBe(2000);
  });

  test('volver a la meta automática', async () => {
    await render(<NutricionView perfilUsuario={PERFIL} />);
    await fireEvent.press(await screen.findByRole('button', { name: 'Editar meta diaria' }));
    await fireEvent.press(await screen.findByRole('button', { name: 'Usar meta automática' }));
    await waitFor(async () =>
      expect(JSON.parse(await AsyncStorage.getItem(STORAGE_KEY_META_NUTRICION))).toEqual({ modo: 'auto' })
    );
    expect(await screen.findByText(/Meta automática según tu perfil/)).toBeTruthy();
  });
});
