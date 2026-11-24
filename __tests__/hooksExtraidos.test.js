/**
 * Tests de los hooks extraídos en la Spec 022 (CA-4, enmendado con los nombres reales).
 */
import '../test-utils/setupComponentes';
import { act, renderHook } from '@testing-library/react-native';
import * as storage from '../src/services/storage';
import * as gemini from '../src/services/gemini';
import { useDerivadosOnboarding } from '../src/components/onboarding/useDerivadosOnboarding';
import { useAccionesOnboarding } from '../src/components/onboarding/useAccionesOnboarding';
import { useAccionesCambioFisico } from '../src/components/cambioFisico/useAccionesCambioFisico';

const AHORA = new Date(2026, 10, 23, 10, 0, 0);
const sv = (valor) => ({ value: valor });

/** Dependencias por defecto: cualquier clave no indicada es un jest.fn(). */
const conDefectos = (valores) =>
  new Proxy(valores, {
    get: (obj, clave) => {
      if (!(clave in obj)) obj[clave] = jest.fn();
      return obj[clave];
    },
    has: () => true,
    ownKeys: (obj) => Reflect.ownKeys(obj),
  });

const depsDerivados = (extra = {}) => ({
  anioActual: 2026,
  anioNac: 1996,
  mesNac: 5,
  diaNac: 10,
  anioInicio: 2024,
  mesInicio: 2,
  diaInicio: 1,
  estaturaCm: 175,
  pesoInicialKg: 70,
  objetivo: 'Recomposición',
  escena: 2,
  edadPulseSV: sv(1),
  imcProgressSV: sv(0.45),
  metricaPulseSV: sv(1),
  ...extra,
});

beforeEach(() => {
  jest.useFakeTimers({ now: AHORA, doNotFake: ['nextTick', 'queueMicrotask'] });
});
afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('useDerivadosOnboarding: edad e IMC', () => {
  test.each([
    [175, 70, 22.9, 'RANGO ATLÉTICO BASE · ÓPTIMO'],
    [170, 50, 17.3, 'DENSIDAD LIGERA · PRIORIZAR MASA'],
    [180, 100, 30.9, 'PRIORIDAD RECOMPOSICIÓN METABÓLICA'],
  ])('%i cm y %i kg → IMC %f (%s)', async (estaturaCm, pesoInicialKg, imc, clasificacion) => {
    const { result } = await renderHook(() => useDerivadosOnboarding(depsDerivados({ estaturaCm, pesoInicialKg })));
    expect(result.current.imcCalculado).toBe(imc);
    expect(result.current.clasificacionImc).toBe(clasificacion);
  });

  test.each([
    [1996, 5, 10, 30],
    [2000, 11, 23, 26],
    [2000, 11, 24, 25],
  ])('nacido el %i-%i-%i tiene %i años al 2026-11-23', async (anioNac, mesNac, diaNac, edad) => {
    const { result } = await renderHook(() => useDerivadosOnboarding(depsDerivados({ anioNac, mesNac, diaNac })));
    expect(result.current.edadCalculada).toBe(edad);
  });

  test('el día de nacimiento se acota a los días reales del mes (31 de febrero → 28)', async () => {
    const { result } = await renderHook(() => useDerivadosOnboarding(depsDerivados({ anioNac: 2001, mesNac: 2, diaNac: 31 })));
    expect(result.current.fechaNacimientoYYYYMMDD).toBe('2001-02-28');
  });
});

describe('useAccionesOnboarding: validación por paso', () => {
  const montar = async (deps) => (await renderHook(() => useAccionesOnboarding(conDefectos(deps)))).result;

  test.each([
    ['sexo inválido', { escena: 1, sexo: 'Otro', edadCalculada: 30 }, false, 'Selecciona tu sexo biológico'],
    ['edad menor de 10', { escena: 1, sexo: 'Hombre', edadCalculada: 5 }, false, 'Verifica tu fecha de nacimiento'],
    ['identidad válida', { escena: 1, sexo: 'Mujer', edadCalculada: 30 }, true, ''],
    ['inicio en el futuro', { escena: 3, fechaInicioEntrenoEfectiva: '2027-01-01' }, false, 'no puede ser posterior'],
    ['inicio hoy', { escena: 3, fechaInicioEntrenoEfectiva: '2026-11-23' }, true, ''],
    ['inicio en el pasado', { escena: 3, fechaInicioEntrenoEfectiva: '2024-02-01' }, true, ''],
    ['paso 2 sin reglas', { escena: 2 }, true, ''],
  ])('%s', async (_caso, deps, esperado, mensaje) => {
    const setErrorValidacion = jest.fn();
    const result = await montar({ ...deps, setErrorValidacion });
    let valido;
    await act(async () => {
      valido = result.current.validarPasoActual();
    });
    expect(valido).toBe(esperado);
    const ultimo = setErrorValidacion.mock.calls.at(-1)[0];
    if (mensaje) expect(ultimo).toContain(mensaje);
    else expect(ultimo).toBe('');
  });
});

describe('useAccionesCambioFisico: mismos servicios con los mismos argumentos', () => {
  const PERFIL = { nombre: 'Prueba', objetivo: 'Recomposición' };

  test('borrar un registro llama a eliminarCambioFisico con su id', async () => {
    const eliminar = jest.spyOn(storage, 'eliminarCambioFisico').mockResolvedValue([]);
    const setRegistrosInternos = jest.fn();
    const { result } = await renderHook(() =>
      useAccionesCambioFisico(conDefectos({ setRegistrosInternos, perfilActivo: PERFIL, fotosBase64PorRegistroRef: { current: {} } }))
    );
    await act(async () => {
      await result.current.ejecutarBorradoRegistro('r-7');
    });
    expect(eliminar).toHaveBeenCalledWith('r-7');
    expect(setRegistrosInternos).toHaveBeenCalledWith([]);
  });

  test('comparar llama a Gemini y guarda la comparación con los mismos datos', async () => {
    const comparar = jest.spyOn(gemini, 'compararCambioFisicoConGemini').mockResolvedValue({
      evolucion: 'Mejor definición.',
      recomendacionesOptimizacion: ['Más proteína'],
      modeloUsado: 'gemini-3.5-flash-lite',
    });
    const guardar = jest.spyOn(storage, 'actualizarComparacionCambioFisico').mockResolvedValue(['lista']);
    const actual = { id: 'r-2', fecha: '2026-11-23', hora12h: '8:00 AM', pesoKg: 79 };
    const anterior = { id: 'r-1', fecha: '2026-11-20', hora12h: '7:00 AM', pesoKg: 80 };
    const { result } = await renderHook(() =>
      useAccionesCambioFisico(
        conDefectos({ comparandoId: null, perfilActivo: PERFIL, fotosBase64PorRegistroRef: { current: { 'r-2': ['QUJD'] } } })
      )
    );
    await act(async () => {
      await result.current.manejarComparacionEnUnToque(actual, anterior);
    });
    expect(comparar).toHaveBeenCalledWith({
      registroActual: actual,
      registroAnterior: anterior,
      imagenesActualesBase64: ['QUJD'],
      perfilUsuario: PERFIL,
    });
    expect(guardar).toHaveBeenCalledWith('r-2', {
      idRegistroAnterior: 'r-1',
      fechaAnterior: '2026-11-20 (7:00 AM)',
      pesoAnteriorKg: 80,
      evolucion: 'Mejor definición.',
      recomendacionesOptimizacion: ['Más proteína'],
      modeloUsado: 'gemini-3.5-flash-lite',
    });
  });
});
