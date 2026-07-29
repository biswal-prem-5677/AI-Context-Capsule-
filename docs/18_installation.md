# Context Capsule — Installation and Local Setup

**Document ID:** 18  
**Status:** Implementation-ready procedure; commands become executable in Milestone 0  
**Phase:** 3 — Delivery  
**Depends on:** Documents 13–15  
**Purpose:** Define a reproducible local setup, extension loading procedure, optional service configuration, troubleshooting, and contributor verification path.

## 1. Scope and prerequisites

This document describes the target repository after Document 20 Milestone 0 scaffolding. It does not claim that an empty blueprint repository is already runnable.

Required workstation:

- Current supported Google Chrome desktop with Developer mode access.
- Node.js active LTS version recorded in `.nvmrc`/`package.json` engines at scaffold time.
- Corepack-enabled pnpm version pinned through `packageManager` field.
- Git, a GitHub account for contribution, and access to repository remote.
- Optional 1B: Supabase project and Vercel project access.
- Optional 1C: approved smart-draft provider credentials; never put personal provider key in shared `.env` or source.

## 2. First-time local setup

```powershell
git clone <approved-repository-url> context-capsule
Set-Location context-capsule
corepack enable
pnpm install --frozen-lockfile
Copy-Item .env.example .env.local
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

The repository README must replace `<approved-repository-url>` with the actual remote once created. If lockfile is absent, setup is incomplete; create/pin it during Milestone 0 rather than using unbounded installs.

## 3. Environment configuration

Only create variables required by the enabled feature slice.

| Variable | Scope | Required | Rule |
| --- | --- | --- | --- |
| `VITE_APP_ENV` | extension/dashboard build | Yes after scaffold | `local`, `staging`, or `production`; no secret. |
| `VITE_SUPABASE_URL` | dashboard/extension 1B | 1B only | Public endpoint for selected environment. |
| `VITE_SUPABASE_ANON_KEY` | dashboard/extension 1B | 1B only | Public auth client key; RLS remains mandatory. |
| `SUPABASE_SERVICE_ROLE_KEY` | server/function only | 1B server operations only | Never expose to browser bundle. |
| `SMART_DRAFT_PROVIDER_API_KEY` | server/function only | 1C only | Never extension/dashboard/commit/export. |
| `VITE_DIAGNOSTICS_ENDPOINT` | client | only after consent/approval | Must point to non-content endpoint. |

`.env.example` contains names, comments, and harmless values only. `.env.local`, production secrets, Chrome publishing credentials, and auth provider secrets stay out of Git. Use separate local/staging/production values.

## 4. Development commands

Milestone 0 must define these exact workspace scripts and keep them documented:

```text
pnpm dev:extension        # watch/build load-unpacked extension
pnpm dev:dashboard        # optional dashboard local server
pnpm lint                 # all workspaces
pnpm typecheck            # all workspaces
pnpm test                 # unit/integration suite
pnpm test:e2e             # local fixture extension journeys
pnpm build                # production artifacts
pnpm package:extension    # versioned MV3 ZIP
```

Before any feature work, run baseline checks. During work, run affected tests; before PR/release, run all required checks in Document 12. Do not substitute a development server visual check for a packaged-extension test.

## 5. Load the extension locally

1. Run `pnpm dev:extension` or the verified build command.
2. Open `chrome://extensions` in Chrome.
3. Enable **Developer mode**.
4. Select **Load unpacked** and choose the generated extension build directory containing `manifest.json`.
5. Pin Context Capsule in the Chrome toolbar if needed.
6. Open a supported web provider, verify the Capsule control, and check the extension’s Service Worker/Errors panel.
7. After code changes, use the extension reload button and refresh the provider tab; service workers/content scripts do not always hot-reload safely.

Use a separate Chrome profile/test account with synthetic conversations for development. Never use customer/private chats as a fixture.

## 6. Optional local sync/dashboard setup (1B)

1. Create/select a dedicated local or staging Supabase project; never use production for development.
2. Configure auth providers and localhost/staging redirect URLs.
3. Apply ordered migrations to the selected non-production environment.
4. Run RLS integration tests with two disposable accounts.
5. Set public client configuration in dashboard/extension environment and server-only secret in function environment.
6. Start dashboard with `pnpm dev:dashboard`; verify sign-in, local-only fallback, sync queue, conflict behavior, and sign-out.

Actual Supabase CLI/project commands are recorded after platform/account selection; do not improvise production migrations from a local shell.

## 7. Troubleshooting

| Symptom | Check / recovery |
| --- | --- |
| Capsule control absent | Verify extension enabled, correct Chrome profile, host permission granted, supported domain/layout, then reload extension/tab. |
| “Unsupported layout” | Use Library/Copy/Export; capture non-content diagnostic if consented; do not scrape with DevTools workaround in product code. |
| Build/package missing manifest | Run full build; inspect configured output root; do not load source directory without generated manifest. |
| Data appears missing | Check local browser profile and library search; browser-data clear/reinstall can remove local data; import prior JSON or sign in only if sync was enabled. |
| Sync fails | Confirm environment URL/auth redirect/RLS test user; retain local data and retry—never delete/recreate as first response. |
| Smart draft unavailable | Continue with Quick Capture; verify explicit consent/provider configuration only in approved 1C environment. |
| Type/build failure | Run documented Node/pnpm versions, clean only generated build/cache directories, then rerun exact failing command; preserve user data/config. |

## 8. Security and contributor rules

- Read `CONTEXT.md`, `CLAUDE.md`, and Documents 10–12 before working on capsule, permission, API, or security paths.
- Do not paste secrets into issues, screenshots, logs, or assistant chats.
- Use synthetic fixtures and test users. Report suspected security issue through the designated private channel rather than public issue content.
- Confirm extension permissions and output manifest after every manifest/build configuration change.

## 9. Acceptance criteria and self-review

- A new engineer can set up exact tool prerequisites, install dependencies, build/test, load an unpacked extension, and verify a synthetic local handoff.
- Optional cloud setup cannot accidentally target production and includes RLS validation.
- Environment categories, secret handling, failure recovery, and limitations are explicit.

Self-review: this is a reproducible implementation target and clearly distinguishes current blueprint state from runnable project state.

## 10. References

- [Document 12 — Testing Strategy](12_testing_strategy.md)
- [Document 13 — Deployment Strategy](13_deployment_strategy.md)
- [Document 14 — Project Structure](14_project_structure.md)
- [Document 15 — GitHub Workflow](15_github_workflow.md)
- [Document 19 — Release Checklist](19_release_checklist.md)
- [Current project memory](../CONTEXT.md)
