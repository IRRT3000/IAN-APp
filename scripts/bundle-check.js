const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const {
  leerValoresSecretos,
  escanearDirectorio,
} = require('./escaneoSecretos');

const rootDir = path.resolve(__dirname, '..');
const outputDir = path.join(rootDir, '.bundle-check');

if (fs.existsSync(outputDir)) {
  fs.rmSync(outputDir, { recursive: true, force: true });
}

let exitCode = 1;

try {
  const result = spawnSync(
    'npx',
    ['expo', 'export', '--platform', 'android', '--output-dir', '.bundle-check'],
    {
      stdio: 'inherit',
      shell: true,
      cwd: rootDir,
    }
  );

  exitCode = result.status ?? 1;

  if (exitCode === 0) {
    try {
      const valores = leerValoresSecretos(rootDir);
      const { archivosRevisados, hallazgos } = escanearDirectorio(
        outputDir,
        valores
      );

      if (hallazgos.length > 0) {
        console.error(
          'bundle:check: se encontraron secretos en el bundle exportado:'
        );
        for (const hallazgo of hallazgos) {
          const relArchivo = path.relative(rootDir, hallazgo.archivo);
          console.error(`  - ${relArchivo}: ${hallazgo.motivos.join(', ')}`);
        }
        exitCode = 1;
      } else {
        console.log(
          `bundle:check: escaneo de secretos limpio (${archivosRevisados} archivos, ${valores.length} valores de .env comprobados).`
        );
      }
    } catch (error) {
      console.error('bundle:check: el escaneo de secretos falló:', error.message);
      exitCode = 1;
    }
  }
} finally {
  if (fs.existsSync(outputDir)) {
    fs.rmSync(outputDir, { recursive: true, force: true });
  }
}

process.exit(exitCode);
