import { Alert, Platform } from 'react-native';
import { mostrarAlerta } from '../src/utils/alertUtils';

describe('alertUtils - mostrarAlerta', () => {
  const osOriginal = Platform.OS;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    Platform.OS = osOriginal;
  });

  describe('comportamiento en Móvil Nativo (iOS / Android)', () => {
    beforeEach(() => {
      Platform.OS = 'android';
      jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    });

    test('delega directamente a Alert.alert con todos los parámetros', () => {
      const onPressMock = jest.fn();
      const botones = [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: onPressMock },
      ];

      mostrarAlerta('Título Prueba', 'Mensaje de prueba', botones);

      expect(Alert.alert).toHaveBeenCalledWith(
        'Título Prueba',
        'Mensaje de prueba',
        botones
      );
    });

    test('soporta botones null o undefined asignando default defensivo', () => {
      mostrarAlerta('Aviso', 'Texto informativo', null);
      expect(Alert.alert).toHaveBeenCalledWith(
        'Aviso',
        'Texto informativo',
        [{ text: 'OK' }]
      );
    });
  });

  describe('comportamiento en Web (Platform.OS === web)', () => {
    let confirmOriginal;
    let alertOriginal;

    beforeEach(() => {
      Platform.OS = 'web';
      if (!globalThis.window) {
        globalThis.window = {};
      }
      confirmOriginal = globalThis.window.confirm;
      alertOriginal = globalThis.window.alert;
      globalThis.window.confirm = jest.fn(() => true);
      globalThis.window.alert = jest.fn();
    });

    afterEach(() => {
      globalThis.window.confirm = confirmOriginal;
      globalThis.window.alert = alertOriginal;
    });

    test('ejecuta el callback de acción si el usuario confirma en window.confirm', () => {
      globalThis.window.confirm.mockReturnValue(true);
      const onEliminar = jest.fn();
      const onCancelar = jest.fn();

      mostrarAlerta('Eliminar', '¿Deseas eliminar?', [
        { text: 'Cancelar', style: 'cancel', onPress: onCancelar },
        { text: 'Eliminar', style: 'destructive', onPress: onEliminar },
      ]);

      expect(globalThis.window.confirm).toHaveBeenCalledWith('Eliminar\n\n¿Deseas eliminar?');
      expect(onEliminar).toHaveBeenCalledTimes(1);
      expect(onCancelar).not.toHaveBeenCalled();
    });

    test('ejecuta el callback de cancelar si el usuario cancela en window.confirm', () => {
      globalThis.window.confirm.mockReturnValue(false);
      const onEliminar = jest.fn();
      const onCancelar = jest.fn();

      mostrarAlerta('Eliminar', '¿Deseas eliminar?', [
        { text: 'Cancelar', style: 'cancel', onPress: onCancelar },
        { text: 'Eliminar', style: 'destructive', onPress: onEliminar },
      ]);

      expect(globalThis.window.confirm).toHaveBeenCalledWith('Eliminar\n\n¿Deseas eliminar?');
      expect(onEliminar).not.toHaveBeenCalled();
      expect(onCancelar).toHaveBeenCalledTimes(1);
    });

    test('muestra window.alert para mensajes informativos sin botones destructivos', () => {
      const onOk = jest.fn();

      mostrarAlerta('Éxito', 'Operación completada', [
        { text: 'Aceptar', onPress: onOk },
      ]);

      expect(globalThis.window.alert).toHaveBeenCalledWith('Éxito\n\nOperación completada');
      expect(onOk).toHaveBeenCalledTimes(1);
      expect(globalThis.window.confirm).not.toHaveBeenCalled();
    });
  });
});
