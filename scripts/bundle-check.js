const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const outputDir = path.join(rootDir, '.bundle-check');

if (fs.existsSync(outputDir)) {
  fs.rmSync(outputDir, { recursive: true, force: true });
}

let exitCode = 1;

try {
  const result = spawnSync('npx', ['expo', 'export', '--platform', 'android', '--output-dir', '.bundle-check'], {
    stdio: 'inherit',
    shell: true,
    cwd: rootDir,
  });

  exitCode = result.status ?? 1;
} finally {
  if (fs.existsSync(outputDir)) {
    fs.rmSync(outputDir, { recursive: true, force: true });
  }
}

process.exit(exitCode);
