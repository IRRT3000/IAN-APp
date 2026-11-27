/**
 * Gestor de modales para web (Spec 026, RF-4 / CA-7b). Lógica pura con dependencias inyectadas:
 * - obtenerRaiz(): el contenedor de la app (#root), que queda inert + aria-hidden mientras haya modales.
 * - obtenerActivo(): el elemento con foco al abrir, para devolvérselo al cerrar ese mismo modal.
 * Mantiene una pila [{ id, focoPrevio }], así un submodal devuelve el foco a quien lo abrió.
 */
export function crearGestorModales({ obtenerRaiz, obtenerActivo }) {
  let pila = [];
  const oyentes = new Set();

  const notificar = () => oyentes.forEach((fn) => fn());

  const ocultarRaiz = () => {
    const raiz = obtenerRaiz();
    if (!raiz) return;
    raiz.setAttribute('aria-hidden', 'true');
    raiz.inert = true;
  };

  const mostrarRaiz = () => {
    const raiz = obtenerRaiz();
    if (!raiz) return;
    raiz.removeAttribute('aria-hidden');
    raiz.inert = false;
  };

  const abrir = (id) => {
    if (pila.some((e) => e.id === id)) return;
    const activo = obtenerActivo();
    pila = [...pila, { id, focoPrevio: activo || null }];
    if (pila.length === 1) ocultarRaiz();
    notificar();
  };

  const cerrar = (id) => {
    const entrada = pila.find((e) => e.id === id);
    if (!entrada) return;
    pila = pila.filter((e) => e.id !== id);
    if (pila.length === 0) mostrarRaiz();
    const destino = entrada.focoPrevio;
    if (destino && destino.isConnected && typeof destino.focus === 'function') {
      destino.focus({ preventScroll: true });
    }
    notificar();
  };

  const esSuperior = (id) => pila.length > 0 && pila[pila.length - 1].id === id;

  const suscribir = (fn) => {
    oyentes.add(fn);
    return () => oyentes.delete(fn);
  };

  return { abrir, cerrar, esSuperior, suscribir, tamano: () => pila.length };
}
