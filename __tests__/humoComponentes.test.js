import '../test-utils/setupComponentes';
import React from 'react';
import { Text } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { render, screen } from '@testing-library/react-native';

function CajaAnimada() {
  const opacidad = useSharedValue(0);
  opacidad.value = withTiming(1);
  const estilo = useAnimatedStyle(() => ({ opacity: opacidad.value }));
  return (
    <Animated.View style={estilo} testID="caja">
      <Text>animada</Text>
    </Animated.View>
  );
}

describe('Prueba de humo de componentes (Spec 022, plan §1a)', () => {
  test('RNTL 14 renderiza un Text', async () => {
    await render(<Text>hola</Text>);
    expect(screen.getByText('hola')).toBeTruthy();
  });

  test('el simulado de Reanimated renderiza un Animated.View con useAnimatedStyle', async () => {
    await render(<CajaAnimada />);
    expect(screen.getByText('animada')).toBeTruthy();
    expect(screen.toJSON()).toMatchSnapshot();
  });
});
