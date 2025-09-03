// server/eslint.config.js
import js from '@eslint/js';
import pluginImport from 'eslint-plugin-import';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

export default [
  js.configs.recommended,
  prettier,
  {
    files: ['**/*.js'],
    ignores: ['node_modules/**', 'dist/**', 'coverage/**'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      // ✅ Tell ESLint about Node globals like `process`, `console`, `__dirname`, etc.
      globals: {
        ...globals.node,
      },
    },
    plugins: {
      import: pluginImport,
    },
    rules: {
      // This warning you saw:
      'import/order': ['warn', { 'newlines-between': 'always' }],
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    },
  },
];
