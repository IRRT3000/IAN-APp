/**
 * Accesibilidad estática (Spec 023, plan §1, CA-1/CA-2).
 * Analiza con @babel/parser cada JSXOpeningElement táctil de App.js y src/**\/*.jsx y exige
 * nombre accesible (accessibilityLabel | aria-label) y rol (accessibilityRole | role).
 *
 * PENDIENTES guarda, por archivo, cuántas infracciones se toleran mientras se corrigen.
 * El test falla si un archivo tiene MÁS infracciones (regresión) o MENOS (hay que bajar el número):
 * así el avance es medible y la lista termina vacía.
 */
import fs from 'fs';
import path from 'path';
import { parse } from '@babel/parser';

const RAIZ = '.';
const TACTILES_RN = ['TouchableOpacity', 'Pressable', 'TouchableHighlight', 'TouchableWithoutFeedback'];
const ENVOLTORIOS_TACTILES = ['BotonInteractivo'];
// Envoltorios que ya fijan accessibilityRole por dentro: en sus usos basta el nombre accesible.
const ENVOLTORIOS_CON_ROL = ['BotonInteractivo'];

// Infracciones toleradas por archivo (deuda medida el 2026-11-23). Debe llegar a {}.
const PENDIENTES = {};

// Excepciones justificadas: { archivo, linea, motivo }.
const EXCEPCIONES = [];

const listarJsx = (dir) =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const ruta = path.join(dir, e.name);
    if (e.isDirectory()) return listarJsx(ruta);
    return /.jsx?$/.test(e.name) ? [ruta] : [];
  });

const nombreElemento = (nodo) => {
  if (nodo.type === 'JSXIdentifier') return nodo.name;
  if (nodo.type === 'JSXMemberExpression') return `${nombreElemento(nodo.object)}.${nodo.property.name}`;
  return '';
};

/** Recorre el AST sin dependencias extra. */
const recorrer = (nodo, visitar) => {
  if (!nodo || typeof nodo.type !== 'string') return;
  visitar(nodo);
  for (const clave of Object.keys(nodo)) {
    if (clave === 'loc' || clave === 'start' || clave === 'end') continue;
    const valor = nodo[clave];
    if (Array.isArray(valor)) valor.forEach((v) => recorrer(v, visitar));
    else if (valor && typeof valor.type === 'string') recorrer(valor, visitar);
  }
};

const analizarArchivo = (ruta) => {
  const codigo = fs.readFileSync(ruta, 'utf8');
  const ast = parse(codigo, { sourceType: 'module', plugins: ['jsx'] });

  // Nombres locales de los táctiles: imports (con alias) de react-native / RNGH, envoltorios propios
  // y componentes creados con createAnimatedComponent(Pressable|TouchableOpacity).
  const tactiles = new Set(ENVOLTORIOS_TACTILES);
  recorrer(ast, (n) => {
    if (
      n.type === 'ImportDeclaration' &&
      ['react-native', 'react-native-gesture-handler'].includes(n.source.value)
    ) {
      for (const e of n.specifiers) {
        if (e.type === 'ImportSpecifier' && TACTILES_RN.includes(e.imported.name)) tactiles.add(e.local.name);
      }
    }
    if (
      n.type === 'VariableDeclarator' &&
      n.init?.type === 'CallExpression' &&
      /createAnimatedComponent$/.test(n.init.callee?.property?.name || n.init.callee?.name || '') &&
      TACTILES_RN.includes(n.init.arguments?.[0]?.name)
    ) {
      tactiles.add(n.id.name);
    }
  });

  const infracciones = [];
  recorrer(ast, (n) => {
    if (n.type !== 'JSXOpeningElement') return;
    const nombre = nombreElemento(n.name);
    if (!tactiles.has(nombre)) return;
    const props = new Set(
      n.attributes.filter((a) => a.type === 'JSXAttribute').map((a) => a.name.name)
    );
    const esparce = n.attributes.some((a) => a.type === 'JSXSpreadAttribute');
    const tieneNombre = props.has('accessibilityLabel') || props.has('aria-label');
    const tieneRol = props.has('accessibilityRole') || props.has('role') || ENVOLTORIOS_CON_ROL.includes(nombre);
    if (!(tieneNombre && tieneRol) && !esparce) {
      infracciones.push({ linea: n.loc.start.line, nombre });
    }
    // CA-2: un selector (radio, tab o checkbox) debe exponer su estado.
    const rolAtributo = n.attributes.find((a) => a.type === 'JSXAttribute' && a.name.name === 'accessibilityRole');
    const rol = rolAtributo?.value?.type === 'StringLiteral' ? rolAtributo.value.value : null;
    // En ARIA, radio y checkbox exponen aria-checked; tab expone aria-selected (revisión de código de la Spec 023).
    const estadoPorEnvoltorio = ENVOLTORIOS_CON_ROL.includes(nombre) && props.has('seleccionado');
    if (['radio', 'checkbox'].includes(rol) && !props.has('aria-checked') && !estadoPorEnvoltorio) {
      infracciones.push({ linea: n.loc.start.line, nombre: nombre + ' (radio/checkbox sin aria-checked)' });
    }
    if (rol === 'tab' && !props.has('aria-selected')) {
      infracciones.push({ linea: n.loc.start.line, nombre: nombre + ' (tab sin aria-selected)' });
    }
  });
  return infracciones;
};

describe('Accesibilidad estática de elementos táctiles (Spec 023)', () => {
  const archivos = [path.join(RAIZ, 'App.js'), ...listarJsx(path.join(RAIZ, 'src'))];

  test.each(archivos.map((a) => [a.split(path.sep).join('/').replace(/^\.\//, '')]))(
    '%s: infracciones = PENDIENTES',
    (archivo) => {
      const infracciones = analizarArchivo(archivo).filter(
        (i) => !EXCEPCIONES.some((e) => e.archivo === archivo && e.linea === i.linea)
      );
      const toleradas = PENDIENTES[archivo] ?? 0;
      if (infracciones.length !== toleradas) {
        const detalle = infracciones.map((i) => `  línea ${i.linea}: <${i.nombre}>`).join('\n');
        throw new Error(
          `${archivo}: ${infracciones.length} táctiles sin accessibilityLabel/Role (tolerados: ${toleradas}).\n` +
            `${infracciones.length > toleradas ? 'Regresión: agrega nombre y rol accesibles.' : 'Bien: baja PENDIENTES a ' + infracciones.length + '.'}\n${detalle}`
        );
      }
    }
  );
});

describe('Escala de letra con tope (Spec 023, RF-4)', () => {
  test('ningún archivo importa Text o TextInput directamente de react-native (se usa base/Texto)', () => {
    const archivos = [path.join(RAIZ, 'App.js'), ...listarJsx(path.join(RAIZ, 'src'))].filter(
      (a) => !a.split(path.sep).join('/').includes('src/components/base/')
    );
    const infractores = archivos.filter((archivo) => {
      const ast = parse(fs.readFileSync(archivo, 'utf8'), { sourceType: 'module', plugins: ['jsx'] });
      return ast.program.body.some(
        (n) =>
          n.type === 'ImportDeclaration' &&
          n.source.value === 'react-native' &&
          n.specifiers.some((s) => s.type === 'ImportSpecifier' && ['Text', 'TextInput'].includes(s.imported.name))
      );
    });
    expect(infractores).toEqual([]);
  });
});
