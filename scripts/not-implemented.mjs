/**
 * Placeholder for workspace scripts that Document 18 §4 requires to exist by name,
 * but whose target app does not exist yet.
 *
 * These exit non-zero on purpose. A script that silently succeeds would let CI, a
 * contributor, or a release checklist record "ran the extension build" when nothing
 * was built. Failing loudly with the owning milestone is the honest behaviour.
 */

const MILESTONES = {
  M1: 'Milestone 1 — Local Capsule Engine',
  M2: 'Milestone 2 — First end-to-end provider transfer (ChatGPT)',
  M3: 'Milestone 3 — Cross-provider MVP',
  M4: 'Milestone 4 — Core Transfer MVP release readiness',
  M5: 'Milestone 5 — Optional Sync Dashboard Beta (1B)',
  M6: 'Milestone 6 — Optional Smart Capsule Beta (1C)',
};

const [script, milestone] = process.argv.slice(2);
const label = MILESTONES[milestone] ?? milestone;

console.error(
  [
    ``,
    `  pnpm ${script} is not available yet.`,
    ``,
    `  It is scheduled for ${label}.`,
    `  See docs/20_mvp_roadmap.md for milestone scope and CONTEXT.md for current status.`,
    ``,
    `  Commands that work today: pnpm lint, pnpm typecheck, pnpm test, pnpm build.`,
    ``,
  ].join('\n'),
);

process.exit(1);
