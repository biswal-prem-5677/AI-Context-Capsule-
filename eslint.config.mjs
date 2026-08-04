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

  // Document 14 §2: capsule-core may depend on the schema and nothing else. It holds the
  // logic every surface shares, so a DOM, Chrome, or network import here would quietly
  // make that logic un-shareable — and would put storage access back inside core, which
  // Document 07 §6 places in the extension application layer.
  {
    files: ['packages/capsule-core/**/*.ts'],
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
                '**/apps/**',
              ],
              message:
                'capsule-core may depend on capsule-schema only (Document 14 §2). Storage, DOM, and network belong to the app layer.',
            },
          ],
        },
      ],
      'no-restricted-globals': [
        'error',
        {
          name: 'chrome',
          message: 'Chrome APIs may not be used in capsule-core (Document 14 §2).',
        },
        {
          name: 'window',
          message: 'DOM globals may not be used in capsule-core (Document 14 §2).',
        },
        {
          name: 'document',
          message: 'DOM globals may not be used in capsule-core (Document 14 §2).',
        },
        {
          name: 'process',
          message: 'Node built-ins may not be used in capsule-core (Document 14 §2).',
        },
        {
          name: 'Buffer',
          message: 'Node built-ins may not be used in capsule-core (Document 14 §2).',
        },
        {
          name: 'indexedDB',
          message:
            'capsule-core defines the repository contract; the IndexedDB implementation lives in the extension app (Document 07 §6).',
        },
        {
          name: 'localStorage',
          message: 'Storage APIs may not be used in capsule-core (Document 14 §2).',
        },
        {
          name: 'fetch',
          message: 'capsule-core must not perform network access (Document 14 §2).',
        },
      ],
    },
  },

  // Document 14 §2: the extension app may depend on core, schema, protocol, adapters, and
  // ui. It runs in Chrome MV3, which has no Node runtime, so a Node built-in here is not a
  // boundary violation in the abstract — it is code that would fail to load in the browser.
  // tsconfig.typecheck.app.json is the primary gate; these rules keep working regardless of
  // how the type programs are arranged later.
  {
    files: ['apps/extension/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['node:*', 'fs', 'path', 'crypto', '@supabase/*', '**/apps/dashboard/**'],
              message:
                'The extension runs in Chrome MV3: no Node built-ins, no cloud client, no dashboard internals (Document 14 §2).',
            },
          ],
        },
      ],
      'no-restricted-globals': [
        'error',
        {
          name: 'process',
          message: 'Chrome MV3 has no Node runtime (Document 14 §2).',
        },
        {
          name: 'Buffer',
          message: 'Chrome MV3 has no Node runtime (Document 14 §2).',
        },
      ],
    },
  },

  // Document 07 §5 and EXECUTION_RULES §5.2: provider DOM selectors and event mechanics
  // live only inside adapter modules. Storage is the layer a provider failure must never
  // be able to reach — the local library has to keep working when a host page changes —
  // so the host DOM and the provider adapters are both unreachable from here.
  {
    files: ['apps/extension/src/storage/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                'node:*',
                'fs',
                'path',
                'crypto',
                '@supabase/*',
                '**/adapters/**',
                '**/provider-adapters/**',
              ],
              message:
                'Storage must not reach provider adapters: a broken host layout may not break the local library (Document 07 §5).',
            },
          ],
        },
      ],
      'no-restricted-globals': [
        'error',
        {
          name: 'process',
          message: 'Chrome MV3 has no Node runtime (Document 14 §2).',
        },
        {
          name: 'Buffer',
          message: 'Chrome MV3 has no Node runtime (Document 14 §2).',
        },
        {
          name: 'document',
          message:
            'Host DOM access belongs in a provider adapter, not in storage (Document 07 §5).',
        },
        {
          name: 'window',
          message:
            'Host DOM access belongs in a provider adapter, not in storage (Document 07 §5).',
        },
        {
          name: 'fetch',
          message: 'Local storage is offline by definition; 1A performs no network access.',
        },
        {
          name: 'chrome',
          message:
            'The capsule library lives in IndexedDB, not chrome.storage (Document 07 §6). Extension APIs belong in the background and UI layers.',
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
