import globals from 'globals';
import tseslint from 'typescript-eslint';
import stylisticJs from '@stylistic/eslint-plugin';

export default [
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.{js,mjs,cjs,ts}'],
  },
  {
    languageOptions: {
      globals: globals.node,
    },
  },
  {
    plugins: {
      '@stylistic/ts': stylisticJs,
    },
    rules: {
      '@stylistic/ts/indent': ['error', 2],
      'no-console': 'error',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-var-requires': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/member-ordering': 'error',
    },
  },
  {
    files: ['test/**/*.{js,mjs,cjs,ts}'],
  },
  {
    languageOptions: {
      globals: globals.node,
    },
  },
  ...tseslint.configs.recommended,
  {
    plugins: {
      '@stylistic/ts': stylisticJs,
    },
    rules: {
      '@stylistic/ts/indent': ['error', 2],
      'no-console': 'error',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-var-requires': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-unused-expression': 'off',
      '@typescript-eslint/member-ordering': 'error',
      'no-unused-expressions': 'off',
    },
  },
];
