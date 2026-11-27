/**
 * Estilos del componente, combinados en el orden original (Spec 022).
 */
import { StyleSheet } from 'react-native';
import { estilosParte1 } from './estilosParte1';
import { estilosParte2 } from './estilosParte2';
import { estilosParte3 } from './estilosParte3';

export const styles = StyleSheet.create({
  ...estilosParte1,
  ...estilosParte2,
  ...estilosParte3,
});
