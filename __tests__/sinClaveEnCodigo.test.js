const fs = require('fs');
const path = require('path');

describe('sinClaveEnCodigo (CA-1, Spec 017)', () => {
  const PATRON_AIZA = /AIza[0-9A-Za-z_-]{35}/;
  const PATRON_AQ = /AQ\.[0-9A-Za-z_-]{40,}/;
  const PATRON_KEY_QUERY = /[?&]key=/;
  const PATRON_ENV_KEY = /EXPO_PUBLIC_GEMINI_API_KEY/;

  const obtenerArchivosCodigo = () => {
    const archivos = [];

    const recorrerDir = (dir) => {
      const entradas = fs.readdirSync(dir, { withFileTypes: true });
      for (const ent of entradas) {
        const full = path.join(dir, ent.name);
        if (ent.isDirectory()) {
          recorrerDir(full);
        } else if (ent.isFile() && /\.(js|jsx)$/.test(ent.name)) {
          archivos.push(full);
        }
      }
    };

    recorrerDir('src');

    if (fs.existsSync('App.js')) {
      archivos.push('App.js');
    }

    if (fs.existsSync('index.js')) {
      archivos.push('index.js');
    }

    return archivos;
  };

  test('ningún archivo de src/, App.js o index.js expone la clave o referencias inseguras', () => {
    const archivos = obtenerArchivosCodigo();
    const infracciones = [];

    for (const archivo of archivos) {
      const contenido = fs.readFileSync(archivo, 'utf8');

      if (PATRON_ENV_KEY.test(contenido)) {
        infracciones.push(`${archivo} contiene referencia a EXPO_PUBLIC_GEMINI_API_KEY`);
      }
      if (PATRON_KEY_QUERY.test(contenido)) {
        infracciones.push(`${archivo} contiene parámetro de consulta ?key= o &key=`);
      }
      if (PATRON_AIZA.test(contenido)) {
        infracciones.push(`${archivo} contiene patrón de clave Google AIza`);
      }
      if (PATRON_AQ.test(contenido)) {
        infracciones.push(`${archivo} contiene patrón de clave Google AQ`);
      }
    }

    expect(infracciones).toEqual([]);
  });
});
