/**
 * Tamaño mínimo de texto (Spec 026, CA-3).
 * Falla si una propiedad fontSize tiene un literal menor a 11, o una expresión condicional/lógica
 * con alguna rama literal menor a 11. Exención: la línea o la anterior lleva "a11y-ok: sin texto"
 * (solo para estilos que no se aplican a texto). Las expresiones no literales se revisan a mano.
 */
import fs from 'fs';
import path from 'path';
import { parse } from '@babel/parser';

const MINIMO = 11;
const EXENCION = 'a11y-ok: sin texto';

const listar = (dir) =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const ruta = path.join(dir, e.name);
    if (e.isDirectory()) return listar(ruta);
    return /\.jsx?$/.test(e.name) ? [ruta] : [];
  });

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

const literales = (expr) => {
  if (!expr) return [];
  if (expr.type === 'NumericLiteral') return [expr.value];
  if (expr.type === 'ConditionalExpression') return [...literales(expr.consequent), ...literales(expr.alternate)];
  if (expr.type === 'LogicalExpression') return [...literales(expr.left), ...literales(expr.right)];
  return [];
};

const analizar = (ruta) => {
  const codigo = fs.readFileSync(ruta, 'utf8');
  const lineas = codigo.split(/\r?\n/);
  const ast = parse(codigo, { sourceType: 'module', plugins: ['jsx'] });
  const infracciones = [];
  recorrer(ast, (n) => {
    if (n.type !== 'ObjectProperty' || n.computed) return;
    const clave = n.key.type === 'Identifier' ? n.key.name : n.key.value;
    if (clave !== 'fontSize') return;
    const pequenos = literales(n.value).filter((v) => v < MINIMO);
    if (!pequenos.length) return;
    const linea = n.loc.start.line;
    if ((lineas[linea - 1] || '').includes(EXENCION) || (lineas[linea - 2] || '').includes(EXENCION)) return;
    infracciones.push(`línea ${linea}: fontSize ${pequenos.join('/')}`);
  });
  return infracciones;
};

describe('Tamaño mínimo de texto (Spec 026, CA-3)', () => {
  const archivos = listar(path.join('.', 'src'));
  test.each(archivos.map((a) => [a.split(path.sep).join('/')]))('%s: sin fontSize < 11', (archivo) => {
    expect(analizar(archivo)).toEqual([]);
  });
});
