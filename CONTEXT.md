# Context Capsule — Living Project Memory (Document 16)

## Current sprint

**Sprint:** Milestone 1 — Local Capsule Engine, slice 1a (headless core).  
**Phase:** Milestone 0 closed on 2026-08-03 when the owner confirmed the first `quality`, `docs`, and `security` runs were green on GitHub. M1 is split into 1a (storage, codecs, and prompt composition below the UI line) and 1b (popup, editor, and options UI, planned separately once 1a is real).  
**Current priority:** M1a — capsule Markdown codec, the `capsule-core` package (repository contract, library queries, prompt composer), and the IndexedDB repository in the extension application layer.

## Milestone 1 status — slice 1a

**Scope of 1a:** everything in [Document 20 §3](docs/20_mvp_roadmap.md) that sits below the UI line, fully unit- and integration-tested with no rendering layer.

| Deliverable | State |
| --- | --- |
| Markdown codec in `capsule-schema` (Document 10 §6, both directions) | Done — 24 unit tests; round trip, escaping, alias headings, unknown sections, oversized input |
| `capsule-core` package: repository contract, in-memory reference repository, library search/sort, lifecycle policy, prompt composer | Done — 47 unit tests; boundary rules verified to fire on a DOM or `indexedDB` reference |
| IndexedDB repository in `apps/extension/src/storage` (Document 07 §6, Document 08 §3) | Not started |
| Third typecheck program for the extension app | Not started — will be recorded as AD-13 |

**Deferred to slice 1b:** popup library, capsule editor, options/local-data UI, and the extension bundler decision. `pnpm dev:extension` remains a deliberate non-zero stub until then.

## Milestone 0 status — closed 2026-08-03

| Deliverable | State |
| --- | --- |
| pnpm workspace, strict TypeScript, lint/format/test/build scripts | Done — `pnpm verify` green |
| `capsule-schema` package: types, limits, issues, text, validate, json-codec, version, operations, fixtures | Done — 182 unit tests pass |
| Package-boundary enforcement (Document 14 §2) | Done — typecheck program split plus `no-restricted-globals` backstop |
| `.env.example`, `.gitignore`, editor/format config | Done |
| CI workflows (Document 15 §5) | Done — `quality.yml`, `docs.yml`, `security.yml` green on `main`, confirmed by the owner on 2026-08-03 |
| Issue/PR templates, security policy (Document 15 §2/§4) | Done — 5 issue forms, `config.yml`, `pull_request_template.md`, `.github/SECURITY.md` |
| README reflects real status and commands | Done |
| Branch protection / required checks | **Not started** — requires repository owner ([`OWNER_ACTIONS.md`](OWNER_ACTIONS.md) A2) |
| Issue labels (Document 15 §4) | **Not created** — requires repository owner; templates reference them already |

The [Document 20 §2](docs/20_mvp_roadmap.md) acceptance criteria are met, including "CI green", so M0 is closed and M1 has started. Branch protection and labels are repository-governance settings that remain open owner actions; they do not gate M1 work, but A2 changes the push workflow the moment it lands.

**How "CI green" was evidenced:** the owner checked the Actions tab. I cannot observe CI from this environment — there is no `gh` CLI and the GitHub API returns 404 for the repository — so every future CI claim depends on the owner reporting it. A local `pnpm verify` pass is recorded under Commands below and is never reported as a CI pass.

### CI scope deferred on purpose

Document 15 §5 lists six workflows. Three are implemented now; the rest are deferred to the milestone that creates the thing they would test, because a workflow with nothing to run is a green check that means nothing:

| Workflow | Deferred to | Reason |
| --- | --- | --- |
| `integration.yml` | M1 (IndexedDB), M5 (API/RLS) | No repository, adapter fixtures, or API exist yet |
| `e2e.yml` | M2 | No extension to drive; `pnpm test:e2e` still exits non-zero by design |
| `release.yml` | M4 | No packaged artifact to build, checksum, or publish |

`security.yml` currently covers dependency advisories and a committed-secret file check. Manifest permission diffing arrives with the extension in M2. GitHub-native secret scanning and push protection are repository settings the owner enables; they are not simulated in CI.

### CI pre-flight — cross-platform checks (2026-08-03)

The local gates run on Windows; CI runs on `ubuntu-latest`. Some failures can only appear on the runner, so each was reproduced locally against the same inputs the workflow uses rather than left for the owner to discover in a red first run:

| Risk | Why local gates cannot catch it | Check performed | Result |
| --- | --- | --- | --- |
| Path case mismatch in a document link | Windows resolves paths case-insensitively; Linux does not, so `docs/00_Documentation_architecture.md` passes here and fails there | Every relative Markdown link target compared against `git ls-files` with exact case | Pass — 252 link instances, 0 mismatches |
| CRLF committed into the index | `core.autocrlf=true` here, and `prettier --check` defaults to `endOfLine: lf` on the runner | Scanned every blob in `HEAD` for `\r` | Pass — 0 files; `.gitattributes` `* text=auto eol=lf` is holding |
| Lockfile drift failing `--frozen-lockfile` | A local install succeeds by updating the lockfile; CI forbids that | `pnpm install --frozen-lockfile --dry-run` | Pass — lockfile up to date, a real install would make no changes |
| A high-severity advisory failing `security.yml` | Depends on the live advisory database, not on repository content | `pnpm audit --audit-level high` | Pass — no known vulnerabilities |
| The committed-secret job's shell pipeline | Only `.env.example` may be tracked; a wrong regex silently passes or wrongly fails | Ran the workflow's exact pipeline locally | Pass — only `.env.example` tracked |

`.nvmrc` is `22.18.0` and `packageManager` is `pnpm@11.18.0`, so `actions/setup-node` and Corepack resolve the versions used locally.

**Outcome:** the first run was green, so none of the reproduced failure modes occurred and the parts that were unverifiable from here — whether workflows were enabled at all, and how the runner handled Corepack, `actions/cache`, `pnpm store path --silent`, and registry access — behaved as intended. This section is retained as the pre-flight procedure to repeat before any future workflow change, not as an open question.

## Completed documentation

- Documents 00–15: architecture of the documentation, product/design, system/extension/data/API/capsule/security/testing, deployment, structure, and GitHub workflow.
- Documents 18–25: installation, release, MVP/future roadmaps, risks, limitations, launch strategy, and success metrics.
- Root `CLAUDE.md`: durable AI-agent operating contract.
- Root `EXECUTION_RULES.md`: ordered execution procedure derived from `CLAUDE.md` — startup sequence, scope stop conditions, verification commands, documentation and push rules. Holds no independent authority; registered in [Document 00](docs/00_documentation_architecture.md).
- Root `OWNER_ACTIONS.md`: single tracked queue of owner-dependent tasks, replacing blockers previously scattered across this file and the numbered documents.
- Existing unnumbered files in `docs/` remain early baseline references and are superseded by numbered documents where stated.

## Confirmed by the product owner

**2026-08-03 — 1A scope and the 1B/1C gates (resolves OWNER_ACTIONS A8):**

- Required release slice: 1A Core Transfer MVP — Chrome MV3 extension; ChatGPT, Claude, Gemini web; local capture/review/library/import/export/insert.
- 1B sync dashboard and 1C AI-assisted drafting stay **closed** until the owner explicitly opens them. They may not delay a local-first public beta, and may not be started as "groundwork" inside 1A.

This is the approved scope Milestone 1 builds against. Changing it requires a new written owner decision, not an engineering judgement.

## Working assumptions — still pending owner confirmation

These were not part of the 2026-08-03 approval and remain assumptions:

- Product name: Context Capsule.
- Core data is a user-editable, versioned JSON/Markdown capsule; it is not a complete transcript or guaranteed conversation continuation.
- Extension never sends a chat message automatically and preserves an existing target draft.
- Raw excerpts do not sync by default; optional data egress requires just-in-time consent.

The last two are trust guarantees already binding under `CLAUDE.md` §3 and the Do not change list; owner confirmation would make them explicit rather than newly true.

## Open decisions and blockers

The owner-facing view of this table, plus every repository setting, account, payment, and live-testing task that needs a human, is tracked in [`OWNER_ACTIONS.md`](OWNER_ACTIONS.md). Keep the two in step: an item resolved there is resolved here.

| Decision | Owner | Blocks |
| --- | --- | --- |
| Smart-draft provider, economics, retention, and consent copy — or defer 1C | Product/legal owner | 1C only |
| Whether 1B sync ships in first public beta | Product owner | 1B planning/release |
| Legal entity, privacy policy, support contact, security contact address, Chrome Web Store account | Business owner | Public release |
| Repository license — currently `UNLICENSED`/all rights reserved, stated as such in README | Business owner | Any external contribution or reuse |
| Supabase/Vercel account ownership, regions, backup policy, OAuth details | Technical owner | 1B deployment |

Resolved on 2026-08-03: the 1A scope and the 1B/1C gates were approved (see Confirmed by the product owner above), and the owner confirmed the first CI runs green, closing Milestone 0.

## Next tasks — strict order

1. **M1a, in order:** Markdown codec in `capsule-schema`; the `capsule-core` package; the AD-11 typecheck split; the IndexedDB repository. Each lands as its own verified commit with its documentation.
2. Plan and build M1b — popup library, capsule editor, and options/local-data UI — after 1a has evidence. The extension bundler choice is made there, not before.
3. Configure branch protection, required checks, issue labels, and project tracking per Document 15 — needs the repository owner. Until branch protection exists, bootstrap direct pushes to `main` remain permitted by Document 15 §7.
4. Review Documents 01–05 and confirm the remaining positioning decisions. The 1A **scope** is settled (2026-08-03); what is left here is vision, market positioning, UX, and design-system review, which do not block M1 implementation.
5. Review Documents 06–12 with engineering/security owner; log any accepted changes in this file and the relevant numbered document.
6. Do not start Milestone 2 adapter work before M1 is complete, and do not build dashboard sync or smart drafting before 1A evidence and their explicit gates.

## Current priorities

1. Correctness and finishability of one local provider-to-provider transfer.
2. Privacy, visible review, no auto-send, and graceful provider-failure behavior.
3. Stable capsule contract, tests, and release evidence.
4. Only then: optional sync/dashboard, then optional smart drafting.

## Architecture decisions

| ID | Decision | Rationale / reference |
| --- | --- | --- |
| AD-01 | Local IndexedDB is 1A source of truth | [06 §1](docs/06_system_architecture.md), [08](docs/08_database_design.md) |
| AD-02 | Provider adapters are isolated | DOM volatility must not affect library/core; [07](docs/07_browser_extension_architecture.md) |
| AD-03 | Canonical JSON + readable Markdown | Portability/review; [10](docs/10_capsule_specification.md) |
| AD-04 | Sync is owner-scoped optional 1B | Completion/privacy; [02 §3.2](docs/02_product_requirements_document.md) |
| AD-05 | Smart draft is opt-in 1C only | Cost/privacy/quality; [02 §7 F-08](docs/02_product_requirements_document.md) |
| AD-06 | Never auto-send/overwrite a draft | Trust and safety; [02 §7 F-06](docs/02_product_requirements_document.md) |
| AD-07 | `pnpm typecheck` runs two separate type programs | Importing `vitest` pulls `@types/node` globals into whatever program contains it, which would grant `process`/`Buffer` to platform-neutral packages. Shipped source checks Node-free; tests/tooling check with `types: ["node"]`. See `tsconfig.typecheck.json`; [14 §2](docs/14_project_structure.md) |
| AD-08 | `capsule-schema` reads WHATWG globals off `globalThis` through narrow local interfaces | `TextEncoder`/`URL`/`crypto` exist in every target runtime but are typed only in `lib.dom`/`@types/node`; loading either would also grant `fetch`, `localStorage`, and `document` to the portable contract package. See `src/text.ts`, `src/operations.ts`; [14 §2](docs/14_project_structure.md) |
| AD-09 | Document link checking is a local offline script, not a third-party link-checker action | `scripts/check-doc-links.mjs` resolves relative links against the filesystem and never requests an external URL. A checker that hits live URLs fails on someone else's outage, and a red build carrying no information about this repository trains reviewers to ignore CI. It also needs no dependency install. Verified in both directions: passes on the current tree, fails on an injected broken link; [15 §5](docs/15_github_workflow.md) |
| AD-10 | CI installs pnpm through Corepack rather than a third-party setup action | `packageManager` in `package.json` already pins pnpm `11.18.0`, so Corepack reproduces the local version with no extra action in the supply chain. `actions/setup-node` runs *before* `corepack enable` so the shim is installed against the Node version the job actually uses; [15 §5](docs/15_github_workflow.md), [14 §6](docs/14_project_structure.md) |
| AD-11 | Markdown codec lives in `capsule-schema`; prompt composition will live in `capsule-core` | Document 10 §11 assigns "Markdown mapping" to the schema package and Document 14 §2 assigns "composition" to core. They do not conflict once the line is drawn by *what the artifact is*: Markdown is a representation of the canonical envelope ([10 §6](docs/10_capsule_specification.md)), so it sits beside `json-codec.ts`; the prompt is explicitly "a projection, not the canonical capsule" ([10 §7](docs/10_capsule_specification.md)) and needs prioritization and budgeting, so it belongs in core. No Document 00 conflict escalation was needed |
| AD-12 | `pnpm build` runs before `pnpm typecheck`, in `verify` and in CI | `tsconfig.typecheck.json` deliberately has no `paths` mapping, so a cross-package import resolves through the real pnpm workspace link to the dependency's *emitted* declarations. `tsc -b` is what emits them. With the old order, `capsule-core` importing `capsule-schema` failed typecheck on a clean tree until something had already built. Build first also means the per-package program (which AD-07 showed can disagree with the root one) is the first thing to fail. CI keeps them as separate named steps either way |

## Important constraints

- Chrome only in 1A; supported web providers are ChatGPT, Claude, and Gemini only.
- Do not request broad host access, cookies, `<all_urls>`, remote executable code, or undeclared tracking.
- Do not store/export/sync API keys, authentication tokens, provider cookies, hidden system prompts, or file contents.
- Do not label a Quick Capture as an AI-generated summary; do not claim perfect continuity.
- Do not add teams, billing, public sharing, integrations, vector search, memory graph, routing, mobile, or cross-browser support to MVP.

## Known risks

- Provider DOM changes can break capture/insertion; adapters, fixtures, live smoke tests, and Copy/Export fallback are mandatory.
- A structured handoff can omit context; review/edit, source disclosure, and truncation notices mitigate but do not eliminate this risk.
- Cloud sync/AI drafting create privacy/legal/security burden; those capabilities remain separately gated.
- User/browser storage can be cleared; local export is the recovery mechanism unless user opted into sync.

## Known bugs

None open. The only code is `capsule-schema` plus repository tooling in `scripts/`; there is no extension, adapter, UI, or deployment yet. Do not interpret green gates as production readiness.

The three CI workflows are green on `main` as reported by the owner on 2026-08-03. I have no way to observe a workflow run from this environment, so CI status in this file is always owner-reported; local gate results are recorded separately under Commands and are never described as CI results.

Fixed during M0 (2026-08-02): `pnpm build` and `pnpm lint` failed on unresolved `TextEncoder`/`URL` in `capsule-schema`, while `pnpm typecheck` passed on the same code — the root typecheck config saw `node_modules/@types` and the per-package build config did not. Resolved by AD-07 and AD-08. Guarded by a negative check: adding `process.env`/`Buffer` to `capsule-schema` now fails both `pnpm typecheck` and `pnpm lint`.

## Technical debt

None accepted. Any deliberate short-term deviation from a numbered specification requires an issue, owner, expiry/review date, and update here.

## Do not change list

- V1 scope and non-goals without PRD/product-owner approval.
- Capsule canonical fields/schema version without Document 10 migration/compatibility review.
- Browser permissions, host allow-list, CSP, consent/data flow, or RLS without Document 11 security review.
- Provider adapter selectors outside adapter modules.
- Local-first/no-auto-send behavior.
- `main` branch protection/release workflow after configured, except approved emergency procedure.

## Commands

Verified on Node 22.18.0 / pnpm 11.18.0 (Windows 11), 2026-08-03. Each gate was run individually via `corepack pnpm <script>` — see the environment note below — and each exited 0.

| Command | Result |
| --- | --- |
| `pnpm format:check` | Pass — all files match Prettier style, including `.github/**` YAML |
| `pnpm lint` | Pass — 0 problems |
| `pnpm typecheck` | Pass — both type programs (see AD-07) |
| `pnpm test` | Pass — 10 files, 253 tests |
| `pnpm build` | Pass — `tsc -b` emits `packages/capsule-schema/dist` and `packages/capsule-core/dist` |
| `pnpm check:docs` | Pass — 35 Markdown files scanned, 33 relative link targets resolved |
| `pnpm verify` | The six above, sequenced — note `build` now runs before `typecheck` (AD-12). Not run as a single chained command on this machine (see environment note); every constituent gate passed individually |

Not yet available; these exit non-zero on purpose with the owning milestone (`scripts/not-implemented.mjs`): `dev:extension` (M2), `test:e2e` (M2), `package:extension` (M4), `dev:dashboard` (M5).

Environment note: pnpm is provided through Corepack and may not be on `PATH` as a bare `pnpm` binary. `corepack pnpm <script>` works for individual scripts, but `pnpm verify` chains `pnpm` internally and needs a real `pnpm` on `PATH` — run `corepack enable` once. On this Windows machine `corepack enable` fails with `EPERM ... C:\Program Files\nodejs\yarn` because it writes shims next to the Node installation; it needs an elevated shell. This is a local environment setup step, not a repository defect, and it does not affect CI, where the `quality` workflow runs `corepack enable` on a Linux runner before installing.

## Delivery state

Remote: `origin` → `https://github.com/biswal-prem-5677/AI-Context-Capsule-.git`, branch `main`.

Branch protection is not configured yet, so Document 15 §7 bootstrap direct pushes to `main` still apply. This allowance ends the moment the owner enables protection; record that transition here when it happens and move to the PR workflow. The `gh` CLI is not installed in the current environment, so labels and branch protection could not be applied from here — both remain owner actions.

## Developer notes

- Start every session by reading this file, `CLAUDE.md`, [`EXECUTION_RULES.md`](EXECUTION_RULES.md), and the relevant numbered documents. `EXECUTION_RULES.md` is the ordered procedure; `CLAUDE.md` remains the authority.
- Standing product-owner instruction (2026-08-02): every change, modification, improvement, or creation updates the affected documents, `CONTEXT.md`, and `README.md`, and is pushed to GitHub in the same pass. Do not batch documentation for later.
- Update this file at the end of every meaningful implementation, decision, incident, or release change.
- Mark an item completed only with linked test/build/manual evidence; never replace current facts with aspirational status.
- Keep this concise; detailed rationale belongs in numbered documents/issues/ADRs.
