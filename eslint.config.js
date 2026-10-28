// Configuracion plana de ESLint (ESLint 9+). Las reglas base vienen de eslint-config-expo.
// Se instala con: npm run flow -- setup
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['node_modules/', 'dist/', '.flow-export/', '.agents/', 'workflow/', 'specs/', 'android/', 'ios/'],
  },
]);
