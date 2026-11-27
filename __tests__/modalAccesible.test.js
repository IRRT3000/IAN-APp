import { crearGestorModales } from '../src/utils/gestorModales';

const crearRaiz = () => {
  const atributos = {};
  return {
    inert: false,
    setAttribute: (k, v) => { atributos[k] = v; },
    removeAttribute: (k) => { delete atributos[k]; },
    getAttribute: (k) => atributos[k] ?? null,
  };
};

const crearBoton = (nombre) => ({ nombre, isConnected: true, focus: jest.fn() });

describe('crearGestorModales (Spec 026, CA-7b)', () => {
  test('abrir oculta la raíz y cerrar la restaura y devuelve el foco', () => {
    const raiz = crearRaiz();
    const boton = crearBoton('abrir');
    let activo = boton;
    const g = crearGestorModales({ obtenerRaiz: () => raiz, obtenerActivo: () => activo });

    g.abrir('a');
    expect(raiz.inert).toBe(true);
    expect(raiz.getAttribute('aria-hidden')).toBe('true');
    expect(g.esSuperior('a')).toBe(true);

    activo = null;
    g.cerrar('a');
    expect(raiz.inert).toBe(false);
    expect(raiz.getAttribute('aria-hidden')).toBeNull();
    expect(boton.focus).toHaveBeenCalledTimes(1);
    expect(g.tamano()).toBe(0);
  });

  test('submodal: la raíz sigue oculta y el foco vuelve a quien abrió cada modal', () => {
    const raiz = crearRaiz();
    const abrirCatalogo = crearBoton('catalogo');
    const crear = crearBoton('crear');
    let activo = abrirCatalogo;
    const g = crearGestorModales({ obtenerRaiz: () => raiz, obtenerActivo: () => activo });

    g.abrir('catalogo');
    activo = crear;
    g.abrir('nuevo');
    expect(g.esSuperior('nuevo')).toBe(true);
    expect(g.esSuperior('catalogo')).toBe(false);

    g.cerrar('nuevo');
    expect(raiz.inert).toBe(true);
    expect(crear.focus).toHaveBeenCalledTimes(1);
    expect(g.esSuperior('catalogo')).toBe(true);

    g.cerrar('catalogo');
    expect(raiz.inert).toBe(false);
    expect(abrirCatalogo.focus).toHaveBeenCalledTimes(1);
  });

  test('es idempotente: abrir dos veces o cerrar algo desconocido no desbalancea', () => {
    const raiz = crearRaiz();
    const g = crearGestorModales({ obtenerRaiz: () => raiz, obtenerActivo: () => null });
    g.abrir('a');
    g.abrir('a');
    g.cerrar('x');
    expect(g.tamano()).toBe(1);
    g.cerrar('a');
    g.cerrar('a');
    expect(g.tamano()).toBe(0);
    expect(raiz.inert).toBe(false);
  });

  test('cerrar uno que no es el superior conserva el orden', () => {
    const raiz = crearRaiz();
    const g = crearGestorModales({ obtenerRaiz: () => raiz, obtenerActivo: () => null });
    g.abrir('a');
    g.abrir('b');
    g.cerrar('a');
    expect(g.esSuperior('b')).toBe(true);
    expect(raiz.inert).toBe(true);
  });

  test('no devuelve el foco a un elemento desconectado', () => {
    const raiz = crearRaiz();
    const boton = { isConnected: false, focus: jest.fn() };
    const g = crearGestorModales({ obtenerRaiz: () => raiz, obtenerActivo: () => boton });
    g.abrir('a');
    g.cerrar('a');
    expect(boton.focus).not.toHaveBeenCalled();
  });

  test('sin raíz (nativo o SSR) no falla', () => {
    const g = crearGestorModales({ obtenerRaiz: () => null, obtenerActivo: () => null });
    expect(() => {
      g.abrir('a');
      g.cerrar('a');
    }).not.toThrow();
  });

  test('notifica a los suscriptores y permite cancelar', () => {
    const g = crearGestorModales({ obtenerRaiz: () => null, obtenerActivo: () => null });
    const fn = jest.fn();
    const cancelar = g.suscribir(fn);
    g.abrir('a');
    expect(fn).toHaveBeenCalledTimes(1);
    cancelar();
    g.cerrar('a');
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
