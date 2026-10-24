import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import reactHooks from 'eslint-plugin-react-hooks'
import react from 'eslint-plugin-react'
import globals from 'globals'

export default tseslint.config(
  { ignores: ['dist/**', '.next/**', 'node_modules/**', 'docs/**', 'video/**', 'next-env.d.ts', 'src/styles/css.generated.ts'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx,mjs,mts}'],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'error',
      // The 1.x codebase relies on `any` in a few internal props; tightened in v2.
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
  {
    // I4: every user-visible string in the library UI goes through the translation packs.
    files: ['src/components/**/*.tsx', 'src/views/**/*.tsx', 'src/index.tsx'],
    ignores: ['**/*.test.tsx'],
    plugins: { react },
    rules: {
      'react/jsx-no-literals': ['error', { noStrings: false, allowedStrings: ['-', '–', '+', '(', ')', '/', ':', '·', '…', '‹', '›'] }],
    },
  },
)
