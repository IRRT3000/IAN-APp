const { Buffer } = require('buffer');
const fs = require('fs');
const path = require('path');

const PATRONES_CLAVE_GOOGLE = [
  { motivo: 'patrón de API key de Google (AIza…)', regex: /AIza[0-9A-Za-z_-]{35}/ },
  { motivo: 'patrón de API key de Google (AQ.…)', regex: /AQ\.[0-9A-Za-z_-]{40,}/ },
];

const PATRON_NOMBRE_SECRETO = /KEY|SECRET|TOKEN|PASSWORD/i;

const ARCHIVOS_ENV = [
  '.env',
  '.env.local',
  '.env.development',
  '.env.development.local',
  '.env.production',
  '.env.production.local',
];

const parsearEnv = (texto) => {
  if (typeof texto !== 'string') return [];
  const sinBom = texto.replace(/^\uFEFF/, '');
  const lineas = sinBom.split(/\r?\n/);
  const resultado = [];

  for (const rawLinea of lineas) {
    let linea = rawLinea.trim();
    if (!linea || linea.startsWith('#')) continue;
    if (linea.startsWith('export ')) {
      linea = linea.slice(7).trim();
    }
    const idxIgual = linea.indexOf('=');
    if (idxIgual <= 0) continue;

    const nombre = linea.slice(0, idxIgual).trim();
    let valor = linea.slice(idxIgual + 1).trim();

    if (valor.startsWith('"')) {
      const cierre = valor.indexOf('"', 1);
      if (cierre !== -1) {
        valor = valor.slice(1, cierre);
      } else {
        valor = valor.slice(1);
      }
    } else if (valor.startsWith("'")) {
      const cierre = valor.indexOf("'", 1);
      if (cierre !== -1) {
        valor = valor.slice(1, cierre);
      } else {
        valor = valor.slice(1);
      }
    } else {
      const idxComentario = valor.indexOf(' #');
      if (idxComentario !== -1) {
        valor = valor.slice(0, idxComentario).trim();
      }
    }

    if (nombre) {
      resultado.push({ nombre, valor });
    }
  }

  return resultado;
};

const leerValoresSecretos = (rootDir, entorno = process.env) => {
  const entradas = [];

  for (const archivo of ARCHIVOS_ENV) {
    const ruta = path.join(rootDir, archivo);
    if (fs.existsSync(ruta)) {
      try {
        const contenido = fs.readFileSync(ruta, 'utf8');
        entradas.push(...parsearEnv(contenido));
      } catch {
        // Ignorar errores de lectura en archivos opcionales
      }
    }
  }

  if (entorno && typeof entorno === 'object') {
    for (const [nombre, valor] of Object.entries(entorno)) {
      if (typeof valor === 'string') {
        entradas.push({ nombre, valor });
      }
    }
  }

  const valoresVistos = new Set();
  const secretos = [];

  for (const { nombre, valor } of entradas) {
    if (
      PATRON_NOMBRE_SECRETO.test(nombre) &&
      typeof valor === 'string' &&
      valor.length >= 8 &&
      !valoresVistos.has(valor)
    ) {
      valoresVistos.add(valor);
      secretos.push({ nombre, valor });
    }
  }

  return secretos;
};

const encontrarSecretos = (contenido, valores = []) => {
  let texto = '';
  if (ArrayBuffer.isView(contenido)) {
    texto = Buffer.from(
      contenido.buffer,
      contenido.byteOffset,
      contenido.byteLength
    ).toString('latin1');
  } else {
    texto = String(contenido || '');
  }

  const motivos = [];

  for (const patron of PATRONES_CLAVE_GOOGLE) {
    if (patron.regex.test(texto)) {
      motivos.push(patron.motivo);
    }
  }

  for (const { nombre, valor } of valores) {
    if (valor && texto.includes(valor)) {
      motivos.push(`valor de ${nombre}`);
    }
  }

  return motivos;
};

const escanearDirectorio = (dir, valores = []) => {
  let archivosRevisados = 0;
  const hallazgos = [];

  const recorrer = (directorioActual) => {
    const entradas = fs.readdirSync(directorioActual, { withFileTypes: true });
    for (const entrada of entradas) {
      const rutaCompleta = path.join(directorioActual, entrada.name);
      if (entrada.isDirectory()) {
        recorrer(rutaCompleta);
      } else if (entrada.isFile()) {
        archivosRevisados += 1;
        const buffer = fs.readFileSync(rutaCompleta);
        const motivos = encontrarSecretos(buffer, valores);
        if (motivos.length > 0) {
          hallazgos.push({ archivo: rutaCompleta, motivos });
        }
      }
    }
  };

  if (fs.existsSync(dir)) {
    recorrer(dir);
  }

  return { archivosRevisados, hallazgos };
};

module.exports = {
  PATRONES_CLAVE_GOOGLE,
  PATRON_NOMBRE_SECRETO,
  ARCHIVOS_ENV,
  parsearEnv,
  leerValoresSecretos,
  encontrarSecretos,
  escanearDirectorio,
};
