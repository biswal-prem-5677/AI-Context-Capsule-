# Context Capsule — Delivery Plan

## Working rule

Complete a milestone only after its checks pass, its documentation and `CONTEXT.md` are updated, and its changes are committed. Do not start a later milestone to work around failures in an earlier one.

## Milestone 0 — Foundation

**Deliverable:** a clean monorepo that builds and tests.

- Create pnpm workspace, TypeScript strict configuration, formatting/linting, Vitest, and Playwright setup.
- Add `capsule-schema` with Zod types, validators, and canonical fixtures.
- Add JSON export/import round-trip tests and initial Markdown export tests.
- Configure GitHub Actions for install, lint, typecheck, test, and build.

**Exit criteria:** A fresh clone can install, run all checks, and produce both app builds with documented commands.

## Milestone 1 — Local capsule engine

**Deliverable:** capsules can be created manually, edited, saved locally, listed, exported, and re-imported.

- Implement IndexedDB repository and core prompt generator.
- Build extension popup/library and create/edit/review UI with loading, errors, and empty states.
- Implement JSON, Markdown, and paste import with validation and 1 MB limit.
- Add duplicate, rename, delete/undo, and export actions.

**Exit criteria:** Offline round-trip test succeeds and compact/full prompts meet the product contract.

## Milestone 2 — First supported transfer: ChatGPT

**Deliverable:** one robust end-to-end transfer flow on ChatGPT web.

- Add ChatGPT provider adapter and injected Capsule control.
- Extract visible turns to review; never auto-save or auto-send.
- Insert a selected capsule into native composer while preserving the existing draft.
- Add fixture-based and Playwright tests for adapter parsing and insertion.

**Exit criteria:** In a clean Chrome profile, create from ChatGPT and insert into a fresh ChatGPT chat successfully; unsupported layout degrades safely.

## Milestone 3 — Claude and Gemini adapters

**Deliverable:** the identical reviewed create/import workflow works for Claude and Gemini.

- Implement one isolated adapter at a time with fixtures and manually verified selectors.
- Reuse core flows; do not add provider-specific product features.
- Run cross-provider smoke tests: create in each provider and insert into each of the other two.

**Exit criteria:** 3×3 source-to-target manual smoke matrix passes for the currently tested layouts.

## Milestone 4 — Dashboard and optional sync

**Deliverable:** a signed-in user can view and edit intentionally synced capsules on the web.

- Build dashboard library/detail/import screens.
- Add Supabase Auth, migrations, RLS tests, sync queue, sync status, retry, and conflict-copy behavior.
- Add a local-only onboarding path and make sync optional.

**Exit criteria:** two-user RLS test passes; offline create/edit later syncs without data loss; no transcript is synced by default.

## Milestone 5 — Smart capsule (only after the core works)

**Deliverable:** an opt-in summarization path with transparent privacy controls.

- Finalize provider/hosted service decision, pricing/limits, consent text, and retention policy.
- Implement summarizer interface and fallbacks; preserve edited quick draft if it fails.
- Test structured output validation, refusal/error states, and explicit data destination copy.

**Exit criteria:** User can understand and control what is sent, and all failures return to an editable local draft.

## Milestone 6 — Release readiness

**Deliverable:** a deployable public beta, not merely source code.

- Deploy dashboard to Vercel and Supabase migrations to production.
- Configure production URLs, OAuth redirect URLs, security headers, and environment variables.
- Write privacy policy, support contact, installation guide, known limitations, and Chrome Web Store listing assets.
- Package and manually test extension on a clean Chrome profile.
- Record a short demo: install → capsule → switch provider → insert → send manually.

**Exit criteria:** All product launch gates pass and a non-developer can follow the install guide unaided.

## Required quality gate for every milestone

```text
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Add the relevant end-to-end/manual verification result to `CONTEXT.md`. Use conventional commits, for example `feat(adapter): add ChatGPT conversation extraction`; push only once repository access and branch policy are configured.

## Manual test matrix

| Case | Expected result |
| --- | --- |
| Empty/new supported chat | Capsule control is usable; explains there are no turns to extract. |
| Long source chat | Preview remains responsive or reports extraction limit. |
| Existing target draft | Capsule is inserted above, separated from draft, and draft is unchanged. |
| Invalid JSON import | Clear validation error; no saved malformed capsule. |
| Offline mode | Create/edit/export/import work; sync is clearly queued/unavailable. |
| Provider DOM change | Host site works; Capsule reports adapter mismatch without page errors. |
| Different signed-in users | One user cannot read or modify the other’s synced capsules. |
| Sensitive source content | User can remove it before save/export; no default cloud upload. |
