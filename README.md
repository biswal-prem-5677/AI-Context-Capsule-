# Context Capsule

Context Capsule is a Chrome extension and small web dashboard that lets a user move an AI conversation from ChatGPT, Claude, or Gemini without reconstructing the project context by hand.

The V1 promise is deliberately narrow: **generate a reviewed context capsule, then import it into another supported AI chat in one clear action.**

## Project status

**Pre-release. There is no installable extension yet.**

| Area | State |
| --- | --- |
| Numbered documentation blueprint (Documents 00–25) | Complete and review-ready |
| `packages/capsule-schema` — capsule types, validation, codecs, fixtures | Implemented, 182 unit tests passing |
| Workspace, quality gates, CI, contribution templates | In place |
| Chrome extension, provider adapters, local library UI | Not started — Milestones 1–3 |
| Sync dashboard (1B), smart drafting (1C) | Not started, and separately gated |

[`CONTEXT.md`](CONTEXT.md) is the authoritative current state, including open blockers and verified command results. Nothing here is claimed to work without evidence recorded there.

[`OWNER_ACTIONS.md`](OWNER_ACTIONS.md) lists what currently needs a human with account access, spending authority, or a real browser — including the repository settings that Milestone 0 cannot close without.

## V1 boundaries

Included in the release-blocking core: Chrome, ChatGPT, Claude, Gemini, local capsule create/import/export/library, and reviewed composer insertion. Signed-in cloud sync/dashboard and AI drafting are separately gated optional beta capabilities.

Explicitly excluded: payments, teams, integrations, semantic search, model routing, mobile, Firefox/Edge packaging, and automatic cross-provider conversation continuation.

Core functionality is designed to work with no account, network, API key, or analytics. The extension never sends a chat message automatically and never overwrites an existing draft.

## Getting started

Prerequisites:

- Node `22.18.0` (see [`.nvmrc`](.nvmrc); the `engines` field requires `>=22.18.0 <23`)
- pnpm `11.18.0`, provided through Corepack

```bash
corepack enable            # once per machine — puts a real pnpm on PATH
pnpm install --frozen-lockfile
pnpm verify
```

`corepack enable` matters: `pnpm verify` chains `pnpm` internally, so a Corepack shim that only works as `corepack pnpm <script>` is not enough.

Full setup instructions are in [Document 18 — Installation](docs/18_installation.md).

## Commands

These run today:

| Command | What it does |
| --- | --- |
| `pnpm format:check` / `pnpm format` | Check or apply Prettier formatting |
| `pnpm lint` / `pnpm lint:fix` | ESLint, including the Document 14 §2 package-boundary rules |
| `pnpm typecheck` | Two separate type programs — see AD-07 in `CONTEXT.md` |
| `pnpm test` / `pnpm test:watch` | Vitest unit tests |
| `pnpm build` | `tsc -b`, emits `packages/*/dist` |
| `pnpm check:docs` | Offline check that every relative document link resolves |
| `pnpm verify` | All of the above, in order — the gate CI enforces |

These exist by name but exit non-zero on purpose, naming the milestone that will implement them:

| Command | Arrives in |
| --- | --- |
| `pnpm dev:extension`, `pnpm test:e2e` | Milestone 2 |
| `pnpm package:extension` | Milestone 4 |
| `pnpm dev:dashboard` | Milestone 5 |

A script that silently succeeded would let CI or a release checklist record "built the extension" when nothing was built.

## Repository layout

Only the directories that exist today are listed. The full target structure, including the extension and dashboard apps, is in [Document 14 — Project structure](docs/14_project_structure.md).

```text
context-capsule/
├─ packages/
│  └─ capsule-schema/     # portable capsule contract: types, validation, codecs, fixtures
├─ docs/                  # numbered decision records (00–25) plus retained early drafts
├─ scripts/               # repository tooling
├─ .github/               # CI workflows, issue and pull request templates
├─ CONTEXT.md             # Document 16 — current state, decisions, verified commands
├─ CLAUDE.md              # Document 17 — AI engineering operating contract
├─ EXECUTION_RULES.md     # how work is executed against that contract
└─ OWNER_ACTIONS.md       # tasks that need the owner, not an engineer
```

`capsule-schema` is deliberately platform-neutral: no React, Chrome APIs, Supabase, DOM, or Node built-ins, enforced by both the typecheck configuration and lint rules so the extension, dashboard, and any future server function can import it unchanged.

## Contributing

Read [`EXECUTION_RULES.md`](EXECUTION_RULES.md) first — it is the ordered procedure for making a change here: session startup, the scope stop conditions, the verification commands, and the rule that documentation and GitHub are updated with every change. [Document 15 — GitHub workflow](docs/15_github_workflow.md) is the underlying governance: trunk-based development on a protected `main`, short-lived branches, Conventional Commits, and a pull request that carries its verification evidence rather than asserting it.

Every change runs `pnpm verify` before review. Issue templates cover bug reports, feature proposals, adapter regressions, documentation decisions, and release tasks.

For a suspected vulnerability, follow [the security policy](.github/SECURITY.md) — please do not open a public issue.

## Canonical blueprint

The numbered documents are the review-ready source of truth. Documents 16 and 17 intentionally live at repository root as [CONTEXT.md](CONTEXT.md) and [CLAUDE.md](CLAUDE.md).

- Phase 1: [Vision](docs/01_project_vision.md), [PRD](docs/02_product_requirements_document.md), [Market research](docs/03_market_research.md), [UX](docs/04_user_experience.md), [Design system](docs/05_ui_design_system.md)
- Phase 2: [System architecture](docs/06_system_architecture.md), [Extension](docs/07_browser_extension_architecture.md), [Database](docs/08_database_design.md), [APIs](docs/09_api_specification.md), [Capsule format](docs/10_capsule_specification.md), [Security](docs/11_security_architecture.md), [Testing](docs/12_testing_strategy.md)
- Phase 3: [Deployment](docs/13_deployment_strategy.md), [Structure](docs/14_project_structure.md), [GitHub workflow](docs/15_github_workflow.md), [Installation](docs/18_installation.md), [Release checklist](docs/19_release_checklist.md), [MVP roadmap](docs/20_mvp_roadmap.md), [Future roadmap](docs/21_future_roadmap.md), [Risks](docs/22_risk_register.md), [Known limitations](docs/23_known_limitations.md), [Launch](docs/24_launch_strategy.md), [Metrics](docs/25_success_metrics.md)

Start with the [documentation architecture](docs/00_documentation_architecture.md), which explains the numbering and the rule for resolving conflicts between documents.

## Historical baseline drafts

These early unnumbered drafts are retained for history. The numbered blueprint above supersedes them where it covers the same area.

- [Early requirements draft](docs/PRODUCT-REQUIREMENTS.md)
- [Early architecture draft](docs/ARCHITECTURE.md)
- [Early delivery draft](docs/DELIVERY-PLAN.md)

## License

No license has been granted for reuse. Choosing a license is an open business-owner decision recorded in [CONTEXT.md](CONTEXT.md); until it is made, treat this repository as all rights reserved.
