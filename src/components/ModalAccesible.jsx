import React, { useEffect, useId, useState } from 'react';
import { Modal, Platform } from 'react-native';
import RegionAnuncios from './base/RegionAnuncios';
import { crearGestorModales } from '../utils/gestorModales';

/**
 * <Modal> con aislamiento del fondo para lectores de pantalla en web (Spec 026, RF-4).
 * En iOS/Android (y en Jest) devuelve el <Modal> de react-native sin cambios: el modal nativo ya
 * aísla su ventana y `anunciar` usa la API del sistema.
 * En web: #root queda inert + aria-hidden mientras haya modales; el foco va al título del modal
 * (o al diálogo si no tiene) y vuelve al control que lo abrió; el modal superior monta su propia
 * región de anuncios, porque la de App.js queda dentro del #root inerte.
 *
 * El foco inicial se mueve en `onShow`: react-native-web solo activa la trampa de foco
 * (ModalFocusTrap) del modal nuevo al terminar su animación; si se enfocara antes, la trampa del
 * modal de debajo (p. ej. el catálogo bajo "Nuevo ejercicio") recuperaría el foco.
 */
const esWeb = Platform.OS === 'web';

const gestor = crearGestorModales({
  obtenerRaiz: () => (typeof document !== 'undefined' ? document.getElementById('root') : null),
  obtenerActivo: () => (typeof document !== 'undefined' ? document.activeElement : null),
});

const enfocarDialogo = () => {
  if (typeof document === 'undefined') return;
  const dialogos = document.querySelectorAll('[aria-modal="true"]');
  const dialogo = dialogos[dialogos.length - 1];
  if (!dialogo) return;
  const destino = dialogo.querySelector('[role="heading"]') || dialogo;
  if (!destino.hasAttribute('tabindex')) destino.setAttribute('tabindex', '-1');
  destino.focus({ preventScroll: true });
};

function ModalAccesibleWeb({ visible, children, onShow, ...props }) {
  const id = useId();
  const [esSuperior, setEsSuperior] = useState(false);

  useEffect(() => {
    if (!visible) return undefined;
    const actualizar = () => setEsSuperior(gestor.esSuperior(id));
    const cancelar = gestor.suscribir(actualizar);
    gestor.abrir(id);
    return () => {
      cancelar();
      setEsSuperior(false);
      gestor.cerrar(id);
    };
  }, [visible, id]);

  const alMostrar = (...args) => {
    enfocarDialogo();
    if (typeof onShow === 'function') onShow(...args);
  };

  return (
    <Modal visible={visible} onShow={alMostrar} {...props}>
      {children}
      {visible && esSuperior ? <RegionAnuncios /> : null}
    </Modal>
  );
}

export default function ModalAccesible(props) {
  if (!esWeb) return <Modal {...props} />;
  return <ModalAccesibleWeb {...props} />;
}
