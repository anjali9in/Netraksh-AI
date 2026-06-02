module.exports = {
  root: true,
  env: {
    es6: true,
    jest: true,
    node: true,
  },
  extends: ['eslint:recommended', 'plugin:react/recommended', 'plugin:react-hooks/recommended'],
  parserOptions: {
    ecmaFeatures: {
      jsx: true,
    },
    ecmaVersion: 2020,
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint', 'jest', 'react', 'react-hooks', 'react-native'],
  settings: {
    react: {
      version: 'detect',
    },
  },
  ignorePatterns: ['backend/dist/**', 'backend/.aws-sam/**'],
  globals: {
    __DEV__: 'readonly',
  },
  overrides: [
    {
      files: ['*.js'],
      parser: '@babel/eslint-parser',
      parserOptions: {
        requireConfigFile: false,
      },
    },
    {
      files: ['*.ts', '*.tsx'],
      parser: '@typescript-eslint/parser',
      rules: {
        '@typescript-eslint/no-shadow': 'warn',
        '@typescript-eslint/no-unused-vars': [
          'error',
          {
            argsIgnorePattern: '^_',
            destructuredArrayIgnorePattern: '^_',
            ignoreRestSiblings: true,
          },
        ],
        'no-shadow': 'off',
        'no-undef': 'off',
        'no-unused-vars': 'off',
      },
    },
  ],
  rules: {
    curly: 'warn',
    'no-bitwise': 'warn',
    'no-case-declarations': 'off',
    'no-console': 'off',
    'react/prop-types': 'off',
    'react-native/no-inline-styles': 'warn',
  },
};
