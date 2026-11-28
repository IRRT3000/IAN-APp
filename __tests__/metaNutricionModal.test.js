/**
 * Modal de meta diaria: error que se borra y macros que siguen a las kcal (Spec 029, CA-3 y CA-4).
 */
import '../test-utils/setupComponentes';
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import ModalMetaNutricion from '../src/components/ModalMetaNutricion';

const META = { calorias: 2760, proteinas: 160, carbohidratos: 358, grasas: 77 };

const montar = async (metaActiva = META) => {
  const onGuardar = jest.fn();
  await render(
    <ModalMetaNutricion
      visible
      metaActiva={metaActiva}
      metaAutomatica={META}
      onCerrar={jest.fn()}
      onGuardar={onGuardar}
    />
  );
  const campo = (etiqueta) => screen.getByLabelText(etiqueta);
  return {
    onGuardar,
    kcal: () => campo('Meta de calorías en kilocalorías'),
    prot: () => campo('Meta de proteínas en gramos'),
    carb: () => campo('Meta de carbohidratos en gramos'),
    gras: () => campo('Meta de grasas en gramos'),
  };
};

describe('ModalMetaNutricion', () => {
  it('reescala los macros al cambiar las kcal', async () => {
    const c = await montar();
    await fireEvent.changeText(c.kcal(), '2200');
    expect(c.prot().props.value).toBe('128');
    expect(c.carb().props.value).toBe('285');
    expect(c.gras().props.value).toBe('61');
  });

  it('kcal parciales no acumulan error', async () => {
    const c = await montar();
    for (const t of ['2', '22', '220', '2200']) await fireEvent.changeText(c.kcal(), t);
    expect(c.prot().props.value).toBe('128');
  });

  it('respeta el macro editado a mano y lo usa como nueva base', async () => {
    const c = await montar();
    await fireEvent.changeText(c.prot(), '200');
    await fireEvent.changeText(c.kcal(), '5520');
    expect(c.prot().props.value).toBe('400');
    expect(c.carb().props.value).toBe('716');
  });

  it('macro editado con kcal vacías conserva la base de kcal anterior', async () => {
    const c = await montar();
    await fireEvent.changeText(c.kcal(), '');
    expect(c.prot().props.value).toBe('160');
    await fireEvent.changeText(c.prot(), '100');
    await fireEvent.changeText(c.kcal(), '5520');
    expect(c.prot().props.value).toBe('200');
  });

  it('kcal parciales fuera de rango no pasan a ser la base', async () => {
    const c = await montar();
    await fireEvent.changeText(c.kcal(), '5');
    await fireEvent.changeText(c.prot(), '150');
    await fireEvent.changeText(c.kcal(), '5520');
    expect(c.prot().props.value).toBe('300');
  });

  it('sin meta activa no inventa macros', async () => {
    const c = await montar(null);
    await fireEvent.changeText(c.kcal(), '2000');
    expect(c.prot().props.value).toBe('');
  });

  it('borra el error al editar cualquier campo', async () => {
    const c = await montar();
    await fireEvent.changeText(c.kcal(), '100');
    await fireEvent.press(screen.getByLabelText('Guardar meta propia'));
    expect(screen.getByText(/Las calorías deben estar entre/)).toBeTruthy();
    await fireEvent.changeText(c.gras(), '70');
    expect(screen.queryByText(/Las calorías deben estar entre/)).toBeNull();
  });
});
