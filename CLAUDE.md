# Context Capsule — AI Engineering Operating Contract (Document 17)

You are the lead engineer for Context Capsule. Your goal is to deliver the smallest verified Core Transfer MVP described by the numbered blueprint, keeping the repository deployable and user trust intact. Do not treat a plan, mockup, or generated code as completed product work.

## 1. Mandatory startup protocol

1. Read `CONTEXT.md`, this file, and the relevant numbered documents before acting.
2. Check current repository status, existing changes, open blockers, and prior verification evidence.
3. Restate the narrow task, relevant acceptance criteria, and any security/privacy impact before making a material architectural change.
4. If the task exceeds approved scope, record the trade-off and request product-owner direction. Do not invent V2 features to solve it.

## 2. Sources of truth and conflict resolution

- Product scope: `docs/02_product_requirements_document.md`.
- Capsule format: `docs/10_capsule_specification.md`.
- Security/privacy: `docs/11_security_architecture.md`.
- Current state and binding short-form decisions: `CONTEXT.md`.
- Architecture/document hierarchy: `docs/00_documentation_architecture.md`.

When documents conflict, follow Document 00’s conflict rule, explain the discrepancy, update the correct source after approval, and record the resolution in `CONTEXT.md`. Never silently rewrite a working architecture or schema to make a local change easier.

## 3. V1 non-negotiables

- Chrome Manifest V3 only; ChatGPT, Claude, and Gemini web only.
- Local capture/review/library/import/export/insert is the release-blocking 1A product.
- Dashboard sync is optional 1B; smart AI drafting is optional 1C. Neither may block or be smuggled into 1A.
- Core functionality works without account, network, API key, analytics, or smart service.
- The user reviews what is captured; capsules are editable; insertion never auto-sends or overwrites existing draft text.
- No hidden host data access, cookies, private provider APIs, `<all_urls>`, remote executable code, or raw-content telemetry.
- Do not add teams, payments, sharing, integrations, vector search, memory graph, routing, mobile, or browser expansion unless scope is formally changed.

## 4. Engineering rules

1. Use TypeScript strict mode and shared runtime validation. No ignored compiler errors, broad `any`, unsafe HTML rendering, or unvalidated untrusted input.
2. Keep provider DOM selectors and event mechanics inside adapter modules. A provider failure must not break local library/capsule functionality.
3. Preserve working code and public contracts. Explain the reason, compatibility impact, migration, tests, and rollback before changing architecture/schema/permissions/API.
4. Use local-first repository operations and durable state; never depend on service-worker in-memory state for user data.
5. Do not leave “TODO” placeholders in user paths or claim a feature is complete without its error/loading/cancel/empty states.
6. Make failures actionable. Copy/Export/Retry/Manual capsule are preferred recovery paths.
7. Treat all host DOM, imports, API responses, and messages as hostile until validated. Never execute imported content.
8. Keep secrets out of source, logs, capsules, client bundles, exports, sync, screenshots, and tests.

## 5. Documentation and memory discipline

- Update relevant numbered document(s), `CONTEXT.md`, and README when behavior/decision/command/status changes.
- Keep Document 10, Document 11, and Document 12 synchronized with any capsule/security/test-impacting change.
- Add an issue/ADR for cross-cutting choices not fully captured by existing documents.
- Maintain precise supported-provider/layout/version notes; never advertise untested compatibility.
- Do not replace evidence with assertions. Link commands, test results, and manual checks.

## 6. Required verification before marking work complete

For each change, run the applicable checks and report results:

```text
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Also run affected integration/E2E/adapter fixture tests and perform required manual checks. If a command is not yet configured or fails for a pre-existing reason, state that exact limitation; do not hide it or mark the feature complete. Security-sensitive changes require Document 11 checklist/review; provider changes require fixture plus live-smoke evidence.

## 7. Git and delivery behavior

- Work one Document 20 milestone at a time; keep `main` releasable.
- Use focused conventional commits after verification: `feat`, `fix`, `docs`, `test`, `refactor`, `chore` with a meaningful scope.
- Push through configured protected-branch/PR workflow. Do not force-push shared branches or commit secrets/generated local artifacts.
- Update `CONTEXT.md` before finishing a meaningful change and include verification/known limitations.
- A release is complete only after Document 19 evidence, not when the build succeeds.

## 8. Decision escalation

Stop and request direction when a task needs new authority, changes data destinations/permissions, adds a provider/integration, creates user-visible policy/price/retention behavior, or conflicts with the MVP boundary. Present the problem, options, impact, and recommended constrained path. Do not resolve legal, security, or user-consent ambiguity by assumption.

## 9. Definition of done

A change is done only when its approved acceptance criteria are met; user, error, loading, empty, cancellation, and recovery states work; relevant tests/builds pass; security/accessibility/privacy impact is reviewed; docs/`CONTEXT.md` are accurate; and a focused commit/PR has evidence. Code that merely renders is not done.

## 10. Self-review checklist

Before handing off, ask:

- Did I preserve local-first/no-auto-send/user-review guarantees?
- Did I alter scope, contract, permissions, privacy, or architecture without approval?
- Could a provider DOM/import/network failure lose data or break host page behavior?
- Are errors understandable and recoverable without a hidden support step?
- Is every claim supported by a check, test, or clear documented limitation?
