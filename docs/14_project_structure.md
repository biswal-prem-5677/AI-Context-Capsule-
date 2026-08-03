# Context Capsule — Project Structure and Engineering Conventions

**Document ID:** 14  
**Status:** Draft  
**Phase:** 3 — Delivery  
**Depends on:** Documents 06–12  
**Purpose:** Define the repository layout, package boundaries, naming rules, and conventions that keep product logic portable and provider-specific logic contained.

## 1. Repository structure

```text
context-capsule/
├─ apps/
│  ├─ extension/
│  │  ├─ public/                 # icons, manifest source/static assets
│  │  ├─ src/
│  │  │  ├─ background/          # MV3 service-worker coordinator
│  │  │  ├─ content/             # injection bootstrap and host-safe bridge
│  │  │  ├─ popup/               # compact library/entry UI
│  │  │  ├─ pages/               # editor, import, options, optional side panel
│  │  │  ├─ adapters/            # provider modules only
│  │  │  └─ manifest.ts
│  │  └─ tests/
│  └─ dashboard/                 # 1B React dashboard
│     ├─ src/{app,features,components,lib,styles}/
│     └─ tests/
├─ packages/
│  ├─ capsule-schema/            # runtime schema, codecs, version migrations, fixtures
│  ├─ capsule-core/              # composition, prioritization, conflict/redaction helpers
│  ├─ extension-protocol/        # typed messages and capability/result contracts
│  ├─ provider-adapters/         # shared adapter types, provider fixtures/test utilities
│  └─ ui/                        # small shared token/component layer only after need is proven
├─ supabase/
│  ├─ migrations/                # ordered, append-only SQL migrations
│  ├─ functions/                 # 1B/1C BFF functions only
│  └─ tests/                     # RLS/API integration fixtures
├─ docs/
│  ├─ 00_documentation_architecture.md … 25_success_metrics.md
│  └─ assets/                    # diagrams/screenshots with safe synthetic content
├─ .github/
│  ├─ workflows/
│  ├─ ISSUE_TEMPLATE/
│  └─ pull_request_template.md
├─ scripts/                      # repeatable dev/CI/release helpers, no secret logic
├─ e2e/                          # cross-app Playwright journeys/local provider fixtures
├─ .env.example
├─ .gitignore
├─ package.json
├─ pnpm-workspace.yaml
├─ tsconfig.base.json
├─ eslint.config.*
├─ prettier.config.*
├─ README.md
├─ CONTEXT.md
└─ CLAUDE.md
```

## 2. Package boundaries

| Package | May depend on | Must not depend on |
| --- | --- | --- |
| `capsule-schema` | validation/date/serialization utilities | React, Chrome APIs, provider adapters, Supabase |
| `capsule-core` | schema | UI, DOM, Chrome APIs, network client |
| `extension-protocol` | schema/types | host DOM/UI implementation |
| `provider-adapters` | protocol/types, DOM-safe utilities | repository, auth, cloud client, product field logic |
| extension app | core/schema/protocol/adapters/ui | dashboard internals |
| dashboard app | core/schema/ui/API client | Chrome APIs/provider adapters |
| Supabase functions | schema/core only as needed | browser-only/Chrome modules |

No app may redefine the canonical capsule type. No component may use a provider selector outside its adapter module. No remote API response enters state without schema validation.

**Where storage lives.** `capsule-core` owns the `CapsuleRepository` *contract* — the interface, the typed error codes, an in-memory reference implementation for tests, and the shared behavioural test suite (`src/repository-contract.ts`, published on the `./repository-contract` subpath) that every implementation must pass. The IndexedDB implementation is not a package: [Document 07 §6](07_browser_extension_architecture.md) puts it in the extension application layer (`apps/extension/src/storage/`). Keeping the contract in core and the implementation in the app is what lets library, lifecycle, and prompt logic be tested without a browser, and keeps `indexedDB` out of the shared layer — enforced by lint, not by review.

## 3. Naming and coding conventions

- TypeScript strict mode; `unknown` at untrusted boundaries; no `any` except documented interop isolation.
- Files: `kebab-case.ts` for utilities/features; React components `PascalCase.tsx`; tests `*.test.ts(x)`; E2E `*.spec.ts`.
- Functions/variables camelCase, types/interfaces PascalCase, constants `UPPER_SNAKE_CASE` only for true constants.
- Feature folder ownership: colocate component, hook, state, unit tests, and feature copy when they change together.
- Prefer explicit domain names (`capsule`, `adapter`, `syncOperation`) over generic `data`, `item`, `utils`.
- Use named exports except intentional route/default-module conventions; avoid barrel files that create circular imports.
- Comments explain non-obvious intent/security/provider workaround, not syntax.

## 4. Architecture conventions

- UI dispatches commands through application services; it does not query IndexedDB, call `chrome.*`, or mutate remote data directly.
- Commands return typed `Result`/error codes that UI maps to accessible copy. Do not surface raw provider/HTTP error text.
- Validate at import, message, API, and storage read boundaries. Internal functions can assume validated types only after explicit construction.
- Use dependency injection/interfaces for repository, clock, ID factory, sync client, and smart-draft provider to make core tests deterministic.
- Keep state local to feature unless it must survive UI lifecycle; service-worker memory is never durable state.
- No feature branch may modify `schemaVersion` or permissions without Document 10/11 review and release note.

## 5. Documentation conventions

- Numbered documents are decision records; link using Document ID/title and stable heading.
- `CONTEXT.md` is concise current state, not a changelog; update it after every meaningful decision/change.
- `README.md` is newcomer-facing and reflects actual commands/support status only.
- Add architecture decision record only when a decision is cross-cutting and not adequately captured in existing numbered documents; link it from `CONTEXT.md` and relevant document.
- Do not claim implemented/deployed/tested until evidence exists.

## 6. Dependency and configuration policy

- Prefer browser/platform capabilities and small maintained libraries; every dependency needs an owner/use case.
- Pin lockfile; update dependencies in reviewed batches with tests/security scan.
- No package executes install scripts or loads code from URL without explicit security approval.
- Environment access is centralized in typed config modules. Public variables are explicitly prefixed and documented; server-only variables cannot be imported into browser packages.

## 7. Testing layout and fixtures

- Place pure unit fixtures beside package tests; provider DOM fixtures in `packages/provider-adapters/fixtures/<provider>/<version>/` with provenance/date/sanitization note.
- Use synthetic conversations only; fixture content must not contain live user/customer material.
- Shared E2E helpers go in `e2e/`; tests state the app/extension version and browser channel they expect.
- Snapshot tests are useful for Markdown/prompt output but require human review for semantic changes.

## 8. Risks, alternatives, and implementation notes

A single `src/` directory for all extension/dashboard/core code is rejected because it encourages Chrome APIs and provider selectors to leak into portable logic. A microservice-per-feature layout is rejected because 1A is local-first and has no backend service need. A large shared design system is deferred; start with tokens/primitive components and promote duplication only when justified.

Implementation notes: initialize pnpm workspaces, lint/format/type/test configs, package build boundaries, and import aliases in Milestone 0. Enforce dependency rules with lint/tooling where feasible, not code review alone.

## 9. Acceptance criteria and self-review

- A new engineer can locate every product responsibility and understand allowed dependencies from this document.
- Provider DOM and canonical data logic are physically and conventionally isolated.
- Folder tree supports all 1A and optional 1B/1C requirements without speculative team/attachment modules.
- Naming, docs, config, and fixture rules are testable in review/CI.

Self-review: the structure reinforces local-first architecture and avoids premature monolith/service complexity.

## 10. References

- [Document 06 — System Architecture](06_system_architecture.md)
- [Document 07 — Browser Extension Architecture](07_browser_extension_architecture.md)
- [Document 10 — Capsule Specification](10_capsule_specification.md)
- [Document 12 — Testing Strategy](12_testing_strategy.md)
- [Document 15 — GitHub Workflow](15_github_workflow.md)
- [Document 16 — CONTEXT.md](../CONTEXT.md)
- [Document 17 — CLAUDE.md](../CLAUDE.md)
