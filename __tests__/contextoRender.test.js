/**
 * Integridad del patrón ctxRender (Spec 022, sugerencia de la revisión de código).
 * Cada función de render lee sus variables de `ctx`; si alguien agrega una variable al render y
 * olvida pasarla en `Object.assign(ctxRender, {...})`, quedaría `undefined` sin aviso.
 */
import fs from 'fs';
import path from 'path';
import { parse } from '@babel/parser';

const CASOS = [
  { orquestador: 'src/components/OnboardingBienvenidaModal.jsx', carpeta: 'src/components/onboarding' },
  { orquestador: 'src/components/CambioFisicoView.jsx', carpeta: 'src/components/cambioFisico' },
];

const recorrer = (n, f) => {
  if (!n || typeof n.type !== 'string') return;
  f(n);
  for (const k of Object.keys(n)) {
    if (['loc', 'start', 'end'].includes(k)) continue;
    const v = n[k];
    if (Array.isArray(v)) v.forEach((x) => recorrer(x, f));
    else if (v && typeof v.type === 'string') recorrer(v, f);
  }
};
const ast = (archivo) => parse(fs.readFileSync(archivo, 'utf8'), { sourceType: 'module', plugins: ['jsx'] });

describe.each(CASOS)('ctxRender de $orquestador', ({ orquestador, carpeta }) => {
  const clavesCtx = new Set();
  recorrer(ast(orquestador), (n) => {
    if (n.type === 'CallExpression' && n.callee.property?.name === 'assign' && n.arguments[0]?.name === 'ctxRender') {
      n.arguments[1].properties.forEach((p) => clavesCtx.add(p.key.name));
    }
  });

  const renders = fs.readdirSync(carpeta).filter((f) => /^render.*\.js$/.test(f));

  test('hay funciones de render y un Object.assign de ctxRender', () => {
    expect(renders.length).toBeGreaterThan(0);
    expect(clavesCtx.size).toBeGreaterThan(0);
  });

  test.each(renders)('%s recibe por ctx todo lo que desestructura', (archivoRender) => {
    const usadas = [];
    recorrer(ast(path.join(carpeta, archivoRender)), (n) => {
      if (n.type === 'VariableDeclarator' && n.init?.type === 'Identifier' && n.init.name === 'ctx' && n.id.type === 'ObjectPattern') {
        n.id.properties.forEach((p) => usadas.push(p.key.name));
      }
    });
    expect(usadas.length).toBeGreaterThan(0);
    expect(usadas.filter((u) => !clavesCtx.has(u))).toEqual([]);
  });
});
