import js from '@eslint/js';
import tseslint from 'typescript-eslint';

/**
 * Flat ESLint config.
 *
 * Beyond ordinary correctness rules, this config mechanically enforces the package
 * boundaries in Document 14 §2. Boundary violations are cheap to introduce and
 * expensive to unwind, so they are a lint failure rather than a review convention.
 */
export default tseslint.config(
  {
    ignores: ['**/dist/**', '**/coverage/**', '**/node_modules/**', 'docs/**'],
  },

  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,

  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': ['error', { fixStyle: 'inline-type-imports' }],
      '@typescript-eslint/switch-exhaustiveness-check': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      'no-console': ['error', { allow: ['warn', 'error'] }],
      'no-restricted-syntax': [
        'error',
        {
          selector: "NewExpression[callee.name='Function']",
          message: 'Dynamic code construction is prohibited (Document 11).',
        },
        {
          selector: "CallExpression[callee.name='eval']",
          message: 'eval is prohibited (Document 11).',
        },
      ],
    },
  },

  // Document 14 §2: capsule-schema is the portable contract. It must stay free of
  // React, Chrome APIs, provider adapters, Supabase, and Node built-ins so that the
  // extension, dashboard, and future server functions can all import it unchanged.
  {
    files: ['packages/capsule-schema/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                'react',
                'react-*',
                '@supabase/*',
                'node:*',
                'fs',
                'path',
                'crypto',
                '**/provider-adapters/**',
              ],
              message:
                'capsule-schema must remain platform-neutral with no runtime dependencies (Document 14 §2).',
            },
          ],
        },
      ],
      'no-restricted-globals': [
        'error',
        {
          name: 'chrome',
          message: 'Chrome APIs may not be used in capsule-schema (Document 14 §2).',
        },
        {
          name: 'window',
          message: 'DOM globals may not be used in capsule-schema (Document 14 §2).',
        },
        {
          name: 'document',
          message: 'DOM globals may not be used in capsule-schema (Document 14 §2).',
        },
        // Backstop for the Node surface. tsconfig.typecheck.json is the primary gate, but
        // it only holds while test files stay in a separate program; this rule keeps
        // working regardless of how the type programs are arranged later.
        {
          name: 'process',
          message: 'Node built-ins may not be used in capsule-schema (Document 14 §2).',
        },
        {
          name: 'Buffer',
          message: 'Node built-ins may not be used in capsule-schema (Document 14 §2).',
        },
        {
          name: 'localStorage',
          message: 'Storage APIs may not be used in capsule-schema (Document 14 §2).',
        },
        {
          name: 'indexedDB',
          message: 'Storage APIs may not be used in capsule-schema (Document 14 §2).',
        },
        {
          name: 'fetch',
          message: 'capsule-schema must not perform network access (Document 14 §2).',
        },
      ],
    },
  },

  {
    files: ['**/*.test.ts'],
    rules: {
      '@typescript-eslint/no-non-null-assertion': 'off',
    },
  },

  {
    files: ['**/*.mjs', '**/*.config.ts'],
    extends: [tseslint.configs.disableTypeChecked],
    rules: {
      'no-console': 'off',
    },
  },

  // Repository tooling runs in Node, unlike everything under packages/ and apps/.
  // Declared explicitly rather than via the `globals` package so that the Node surface
  // stays visible here and cannot quietly widen.
  {
    files: ['**/*.mjs'],
    languageOptions: {
      globals: {
        console: 'readonly',
        process: 'readonly',
        URL: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
      },
    },
  },
);
