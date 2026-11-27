const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  { ignores: ['node_modules/', 'dist/', '.bundle-check/', '.bench/', '.expo/', '.agents/', '.claude/', '.github/', 'specs/', 'docs/', 'android/', 'ios/'] },
  {
    files: ['__tests__/**', 'test-utils/**'],
    languageOptions: {
      globals: { describe: 'readonly', test: 'readonly', it: 'readonly', expect: 'readonly', jest: 'readonly', beforeEach: 'readonly', afterEach: 'readonly', beforeAll: 'readonly', afterAll: 'readonly', global: 'readonly' },
    },
  },
  {
    files: ['scripts/**', 'eslint.config.js'],
    languageOptions: {
      globals: { require: 'readonly', module: 'writable', process: 'readonly', __dirname: 'readonly', Buffer: 'readonly' },
    },
  },
]);
