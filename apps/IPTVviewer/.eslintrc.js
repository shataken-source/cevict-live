module.exports = {
  root: true,
  extends: '@react-native/eslint-config',
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  rules: {
    'prettier/prettier': 'off',
  },
  settings: {
    'import/resolver': {
      'babel-module': {
        alias: {
          '@': './src',
        },
      },
    },
  },
};
