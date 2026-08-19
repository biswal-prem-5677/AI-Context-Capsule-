import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

import { manifest } from './src/manifest.js';

/**
 * Emit `dist/manifest.json` from the typed object in `src/manifest.ts`.
 *
 * Written through Rollup's `emitFile` rather than a copy step so the manifest is part of
 * the build graph: it lands in `dist` on a watch rebuild too, and a build that fails
 * leaves no half-updated manifest behind for someone to load unpacked.
 */
function emitManifest(): Plugin {
  return {
    name: 'context-capsule:emit-manifest',
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'manifest.json',
        source: `${JSON.stringify(manifest, null, 2)}\n`,
      });
    },
  };
}

/**
 * Extension build (AD-15).
 *
 * There is no dev server. The MV3 extension-page CSP is `script-src 'self'`, which
 * forbids both the eval-based HMR client and loading the entry from a `localhost` origin,
 * so a dev server would produce a page that cannot run in the surface it targets.
 * `pnpm dev:extension` is `vite build --watch` against a load-unpacked `dist`, which is
 * the workflow Document 13 §2 already describes.
 */
export default defineConfig({
  root: import.meta.dirname,
  plugins: [react(), emitManifest()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    // Chrome loads these files from disk, never over a network, so a debugger that can
    // show real source costs nothing a user pays for.
    sourcemap: true,
    rollupOptions: {
      // One entry per extension page that exists. The editor and options pages are added
      // here by the commits that build them, so a missing page fails the build rather
      // than shipping an empty document behind a manifest key.
      input: {
        popup: 'popup.html',
      },
    },
  },
});
