/**
 * Text y TextInput con tope de escala de letra (Spec 023, RF-4).
 *
 * La app respeta el tamaño de letra que el usuario elige en su teléfono, con un tope de
 * TOKENS.escalaTexto.max (1.4×) para que el diseño no se rompa. React 19 ignora defaultProps en
 * componentes función, así que el tope se aplica con estos envoltorios. Se exportan con los MISMOS
 * nombres que react-native para que los archivos solo cambien su import, no su JSX.
 * Un componente puede pasar su propio maxFontSizeMultiplier (p. ej. TOKENS.escalaTexto.compacta).
 * En React 19 `ref` llega como prop y se reenvía con el resto.
 */
import React from 'react';
import { Text as TextNativo, TextInput as TextInputNativo } from 'react-native';
import { TOKENS } from '../../theme/tokens';

export function Text(props) {
  return <TextNativo {...props} maxFontSizeMultiplier={props.maxFontSizeMultiplier ?? TOKENS.escalaTexto.max} />;
}

export function TextInput(props) {
  return <TextInputNativo {...props} maxFontSizeMultiplier={props.maxFontSizeMultiplier ?? TOKENS.escalaTexto.max} />;
}
