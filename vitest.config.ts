import { defineConfig } from 'vitest/config';

/**
 * `environment: 'node'` stays the default because most of this repository is portable
 * logic that must not need a DOM to be tested — giving every file a jsdom window would
 * hide an accidental `document` reference in `capsule-schema` or `capsule-core` behind a
 * passing test. The extension's component tests opt in individually with a
 * `@vitest-environment jsdom` docblock, which keeps the exception visible in the file
 * that needs it.
 */
export default defineConfig({
  test: {
    include: ['packages/*/src/**/*.test.ts', 'apps/*/src/**/*.test.{ts,tsx}'],
    environment: 'node',
    restoreMocks: true,
    coverage: {
      provider: 'v8',
      include: ['packages/*/src/**/*.ts'],
      exclude: ['**/*.test.ts', '**/fixtures/**', '**/index.ts'],
    },
  },
});
