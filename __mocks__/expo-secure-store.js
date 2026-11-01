const almacen = new Map();

let fallarEscritura = false;
let fallarLectura = false;
let fallarBorrado = false;

export const WHEN_UNLOCKED = 5;
export const WHEN_UNLOCKED_THIS_DEVICE_ONLY = 6;

export const setItemAsync = async (clave, valor, opciones) => {
  if (fallarEscritura) {
    throw new Error('Fallo simulado al escribir en SecureStore');
  }
  almacen.set(clave, { valor: String(valor), opciones });
};

export const getItemAsync = async (clave) => {
  if (fallarLectura) {
    throw new Error('Fallo simulado al leer en SecureStore');
  }
  const entrada = almacen.get(clave);
  return entrada ? entrada.valor : null;
};

export const deleteItemAsync = async (clave) => {
  if (fallarBorrado) {
    throw new Error('Fallo simulado al borrar en SecureStore');
  }
  almacen.delete(clave);
};

export const isAvailableAsync = async () => true;

export const __reiniciar = () => {
  almacen.clear();
  fallarEscritura = false;
  fallarLectura = false;
  fallarBorrado = false;
};

export const __simularFallos = ({
  escritura = false,
  lectura = false,
  borrado = false,
} = {}) => {
  fallarEscritura = escritura;
  fallarLectura = lectura;
  fallarBorrado = borrado;
};

export const __obtenerEntrada = (clave) => almacen.get(clave);

export default {
  WHEN_UNLOCKED,
  WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  setItemAsync,
  getItemAsync,
  deleteItemAsync,
  isAvailableAsync,
  __reiniciar,
  __simularFallos,
  __obtenerEntrada,
};
