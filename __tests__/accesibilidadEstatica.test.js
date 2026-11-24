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

// Infracciones toleradas por archivo (deuda medida el 2026-11-23). Debe llegar a {}.
const PENDIENTES = {
  'src/components/CalculadoraPesoModal.jsx': 6,
  'src/components/CatalogoEjerciciosModal.jsx': 10,
  'src/components/EntrenamientosView.jsx': 3,
  'src/components/EstudioView.jsx': 1,
  'src/components/GestionMateriasModal.jsx': 11,
  'src/components/LiveModeModal.jsx': 6,
  'src/components/MenuBienvenida.jsx': 7,
  'src/components/ModalAnalisisComida.jsx': 5,
  'src/components/NutricionView.jsx': 5,
  'src/components/OnboardingBienvenidaModal.jsx': 1,
  'src/components/PanelConfiguracionLateral.jsx': 8,
  'src/components/SelectorSemanal.jsx': 1,
  'src/components/SesionEstudioModal.jsx': 8,
  'src/components/cambioFisico/base.js': 1,
  'src/components/cambioFisico/renderCabeceraLista.js': 7,
  'src/components/cambioFisico/renderModalBascula.js': 9,
  'src/components/cambioFisico/renderizarTarjetaCambio.js': 1,
  'src/components/heatmap/DaySummaryModal.jsx': 7,
  'src/components/heatmap/HeatmapDayCell.jsx': 1,
  'src/components/heatmap/MapaCalorAnual.jsx': 2,
  'src/components/onboarding/renderCabeceraWizard.js': 2,
  'src/components/onboarding/renderEscenaCelebracion.js': 1,
  'src/components/onboarding/renderEscenaHero.js': 1,
  'src/components/onboarding/renderPaso1Identidad.js': 7,
  'src/components/onboarding/renderPaso2Antropometria.js': 2,
  'src/components/onboarding/renderPaso3Antiguedad.js': 7,
  'src/components/onboarding/renderPaso4Objetivo.js': 1,
};

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
    const tieneRol = props.has('accessibilityRole') || props.has('role');
    if (!(tieneNombre && tieneRol) && !esparce) {
      infracciones.push({ linea: n.loc.start.line, nombre });
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
