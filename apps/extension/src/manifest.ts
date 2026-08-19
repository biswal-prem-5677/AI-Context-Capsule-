/**
 * The Chrome Manifest V3 manifest, as TypeScript (Document 14 §1).
 *
 * It is source rather than a committed `manifest.json` so that typecheck gate 3 covers
 * it. A hand-edited JSON file is exactly the kind of artifact where a stray permission
 * or a mistyped path survives every gate and is only found at install time — and where
 * a reviewer diffing a release has no compiler telling them a key is wrong.
 *
 * `scripts/emit-manifest` in `vite.config.ts` writes this object to `dist/manifest.json`
 * during the build.
 */

/**
 * The subset of the MV3 manifest this extension actually uses.
 *
 * Deliberately narrow and local rather than `@types/chrome`: nothing in Milestone 1b
 * calls a `chrome.*` API, so pulling the whole extension API surface into the type
 * program would make Chrome APIs reachable from every module for the sake of one
 * literal. Widen this when a key is genuinely needed.
 */
interface ManifestV3 {
  readonly manifest_version: 3;
  readonly name: string;
  readonly version: string;
  readonly description: string;
  readonly action: {
    readonly default_popup: string;
    readonly default_title: string;
  };
  /** Chrome permission strings. Empty is a decision — see the note below. */
  readonly permissions: readonly string[];
  readonly content_security_policy: {
    readonly extension_pages: string;
  };
}

/**
 * Kept in step with `apps/extension/package.json` by hand, because Chrome requires a
 * plain dotted numeric version and the packaging step in Milestone 4 is where the two
 * get a mechanical check.
 */
export const EXTENSION_VERSION = '0.1.0';

/**
 * Milestone 1b requests **no permissions and no host access at all.**
 *
 * Document 07 §2 lists `storage`, `scripting`, `activeTab`, and optional host patterns.
 * That list is the ceiling for the finished product, not a floor for this slice. Nothing
 * in 1b touches a host page, and IndexedDB — the only thing the library stores — needs no
 * permission. Declaring a permission before the feature that needs it means shipping a
 * capability nobody has reviewed, and means a user's install prompt describes access the
 * extension does not use.
 *
 * Host access and its Document 11 review arrive with the provider adapters in Milestone 2.
 */
export const manifest: ManifestV3 = {
  manifest_version: 3,
  // Working name. The final Chrome Web Store name is owner action B4 and is still open.
  name: 'Context Capsule',
  version: EXTENSION_VERSION,
  description:
    'Move an AI conversation between ChatGPT, Claude, and Gemini through a reviewed context capsule. Stored on this device.',
  action: {
    default_popup: 'popup.html',
    default_title: 'Context Capsule',
  },
  // No `options_ui` yet: the local-data page lands with the options UI later in
  // Milestone 1b. A manifest key pointing at a file that does not exist is a broken
  // install, and a key pointing at an empty placeholder is a worse one.
  permissions: [],
  content_security_policy: {
    // Packaged scripts only. No remote code, no `eval`, no inline handlers
    // (Document 07 §7, Document 11 §3.1). This is also why the dev workflow is
    // `vite build --watch` and not a dev server — see AD-15 in CONTEXT.md.
    extension_pages: "script-src 'self'; object-src 'self'",
  },
};

/**
 * No `icons` key. The icon set is owner action B4 and does not exist yet; Chrome falls
 * back to its default mark. Committing a placeholder would put an untrue asset in the
 * package and make the missing decision invisible.
 */
