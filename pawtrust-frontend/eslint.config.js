import js from '@eslint/js';
import globals from 'globals';
import react from 'eslint-plugin-react';
import hooks from 'eslint-plugin-react-hooks';
export default [{ ignores: ['dist/**'] }, js.configs.recommended, {
  files: ['**/*.{js,jsx}'], languageOptions: { globals: globals.browser, parserOptions: { ecmaFeatures: { jsx: true } } },
  plugins: { react, 'react-hooks': hooks }, settings: { react: { version: 'detect' } },
  rules: { 'react/jsx-uses-vars': 'error', ...hooks.configs.recommended.rules }
}];
