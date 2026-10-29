const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  { ignores: ['node_modules/', 'dist/', '.bundle-check/', '.expo/', '.agents/', '.claude/', '.github/', 'specs/', 'docs/', 'android/', 'ios/'] },
  {
    files: ['__tests__/**'],
    languageOptions: {
      globals: { describe: 'readonly', test: 'readonly', it: 'readonly', expect: 'readonly', jest: 'readonly', beforeEach: 'readonly', afterEach: 'readonly' },
    },
  },
  {
    files: ['scripts/**', 'eslint.config.js'],
    languageOptions: {
      globals: { require: 'readonly', module: 'writable', process: 'readonly', __dirname: 'readonly' },
    },
  },
]);
