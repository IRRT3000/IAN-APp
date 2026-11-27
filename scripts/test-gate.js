/**
 * Puerta de pruebas (Spec 020, RF-3).
 * Ejecuta Jest y falla si no corrió ninguna suite, si Jest no produjo resultados
 * o si alguna prueba falló. Evita que `npm test` pase en verde sin probar nada.
 * Los argumentos extra se reenvían a Jest (p. ej. `npm test -- --testPathPattern x`).
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const carpetaTemporal = fs.mkdtempSync(path.join(os.tmpdir(), 'jest-gate-'));
const archivoResultado = path.join(carpetaTemporal, 'resultado.json');

let codigoSalida = 1;

try {
  const ejecucion = spawnSync(
    process.execPath,
    [
      require.resolve('jest/bin/jest'),
      '--ci',
      '--json',
      `--outputFile=${archivoResultado}`,
      ...process.argv.slice(2),
    ],
    { stdio: 'inherit', cwd: path.resolve(__dirname, '..') }
  );

  if (ejecucion.status !== 0) {
    codigoSalida = ejecucion.status ?? 1;
  } else if (!fs.existsSync(archivoResultado)) {
    console.error('test-gate: Jest no produjo resultados.');
    codigoSalida = 1;
  } else {
    let resultado = null;
    try {
      resultado = JSON.parse(fs.readFileSync(archivoResultado, 'utf8'));
    } catch {
      resultado = null;
    }

    if (!resultado) {
      console.error('test-gate: Jest no produjo resultados legibles.');
      codigoSalida = 1;
    } else if (!(resultado.numTotalTestSuites >= 1)) {
      console.error(
        'test-gate: no se ejecutó ninguna suite de pruebas. Revisa testPathIgnorePatterns.'
      );
      codigoSalida = 1;
    } else if (resultado.success !== true) {
      console.error('test-gate: hay pruebas fallidas.');
      codigoSalida = 1;
    } else {
      console.log(
        `test-gate: ${resultado.numTotalTestSuites} suites y ${resultado.numTotalTests} pruebas en verde.`
      );
      codigoSalida = 0;
    }
  }
} finally {
  fs.rmSync(carpetaTemporal, { recursive: true, force: true });
}

process.exit(codigoSalida);
