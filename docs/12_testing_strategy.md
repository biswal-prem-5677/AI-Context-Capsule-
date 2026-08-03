# Context Capsule — Testing Strategy

**Document ID:** 12  
**Status:** Draft  
**Phase:** 2 — Engineering  
**Depends on:** Documents 02, 06–11  
**Purpose:** Define the evidence required to prove the MVP is correct, safe, accessible, compatible, and releasable.

## 1. Quality strategy

Testing follows a risk-based pyramid: fast deterministic schema/core tests at the base; adapter, repository, and API integration tests in the middle; a small number of critical end-to-end and manual live-provider tests at the top. Manual testing is necessary because third-party web DOMs change; it is not a substitute for automated regression fixtures.

```text
             Live-provider manual smoke / release exploratory
          End-to-end extension + local fixture browser journeys
       Integration: adapters, IndexedDB, API/RLS, import/export
    Unit: schema, codecs, prompt composition, state, UI components
```

## 2. Test levels and required coverage

| Level | Scope | Required examples |
| --- | --- | --- |
| Unit | Pure functions/components | Capsule schema, timestamp/UUID validation, Markdown mapping, redaction, token-budget projection, conflict rules, UI error states. |
| Integration | Cross-module behavior | IndexedDB transactions/undo, service worker messages, adapter parsing from DOM fixtures, sync retry/idempotency, RLS two-user tests. |
| E2E | User-critical journeys in packaged extension/local fixture pages | Capture-review-save, JSON round-trip, existing-draft preservation, insertion/copy fallback, offline library. |
| Manual live smoke | Current provider UIs and Chrome installation | Each source/target matrix, permissions, visual placement, no auto-send, adapter graceful failure. |
| Non-functional | Performance/accessibility/security/resilience | 200-turn capture, 500-capsule search, keyboard/screen-reader checks, XSS corpus, service-worker restart. |

## 3. Traceability to product requirements

| PRD area | Minimum evidence |
| --- | --- |
| Capture/review | Adapter fixture tests, selected-turn/removal E2E, manual source check per provider. |
| Local library | IndexedDB offline tests, search/undo tests, storage error tests. |
| Import/export | JSON round trip, Markdown review mapping, malformed/oversize/XSS corpus. |
| Insert | Existing draft exact-preservation test, no-send assertion, copy fallback, 3 target manual tests. |
| Optional sync | RLS tests, two-user isolation, queue/idempotency/conflict tests, outage retry. |
| Optional smart draft | Consent test, input-bound test, output-validation test, Quick Capture fallback. |

Every PRD acceptance criterion receives a test ID or a documented manual-check ID before release. The release checklist cannot rely on a generic “tested” statement.

## 4. Provider adapter test matrix

For each provider (ChatGPT, Claude, Gemini), test:

- active conversation with multiple user/assistant turns;
- new/empty conversation;
- lengthy conversation/partial visible history;
- code blocks/tables/Markdown-like text;
- route navigation/new chat within same tab;
- light/dark host themes, 100%/200% zoom, narrow window;
- existing composer draft; insertion text and no send;
- composer unavailable/layout unknown; Copy fallback;
- no duplicate injected control after mutations/navigation.

Run a 3×3 manual source→target smoke matrix at release (source capture in each supported provider; insertion in each supported provider). A provider may be marked degraded only with explicit release-owner approval, user-facing limitation, and fallback verification.

## 5. Security and privacy testing

- Static scans: dependency vulnerabilities, secret scanning, lint/type rules preventing unsafe rendering, manifest/permission diff review.
- Dynamic/import: malformed JSON, invalid schema, oversized/deep input, Markdown/HTML script vectors, malicious links, Unicode/control-character cases.
- Structure forgery through a codec round trip: capsule text that reads as Markdown structure — a heading, a list item, or the empty-list placeholder — must survive export and re-import as text and must not create, replace, or empty a field. Covered by `markdown-codec.test.ts`; extend it whenever a new escaping case is found.
- Authorization: at least two test users; direct API attempts for list/read/update/delete other-user UUID; expired/invalid token; RLS policy regression.
- Consent: no diagnostics/sync/smart input request before explicit consent; revoke stops future optional requests; captured logs contain no content/keys.
- Extension isolation: message origin/sender mismatch, hostile host page DOM, service-worker restart, permission deny/revoke.

Critical security findings block release until remediated and retested. See Document 11 for threat/control mapping.

## 6. Accessibility and UX testing

- Keyboard-only task completion for create, review/edit, import, library, insert, delete/undo, and settings.
- Screen-reader checks for names/roles, error association, live status, focus restoration, and dynamic content.
- Contrast and visual checks in light/dark themes; 200% zoom; reduced motion; 320px equivalent width.
- Five task-based usability sessions before broad beta: capture and transfer an active task, import a file, recover from an adapter error, and delete/undo. Record observed confusion and completion time without capturing conversation content.

## 7. Performance, resilience, and regression tests

| Scenario | Target / expected behavior |
| --- | --- |
| 200 visible turns | Capture preview ≤5s or bounded recoverable limit; host tab remains responsive. |
| 500 local capsules | Search/list response <200ms typical laptop. |
| Service worker restart | Saved data/queued operations recover; UI offers retry/reopen. |
| Offline | All 1A flows work; optional features clearly unavailable/queued. |
| IndexedDB quota/error | No partial/corrupt save; export/recovery message. |
| Adapter fixture update | A selector/parser change runs all provider fixture tests before merge. |

Use representative synthetic fixtures only; never commit real user conversations or keys to repository/test systems.

## 8. Environments and test data

| Environment | Purpose | Data rules |
| --- | --- | --- |
| Local | Fast development and package load-unpacked checks | Synthetic fixtures/test accounts only. |
| CI | Deterministic lint/type/unit/integration/build | No production secrets; mocked services. |
| Staging (1B/1C) | Auth/RLS/sync/service integration | Isolated Supabase project and disposable test accounts. |
| Production beta | Manual smoke, consented observability | No test data masquerading as user data; least privilege. |

## 9. Quality gates

### Per pull request

```text
format/lint → typecheck → unit tests → affected integration tests → production build
```

### Per release candidate

```text
All CI checks → adapter fixtures → security scans → packaged-extension install
→ manual 3×3 smoke → accessibility spot check → release checklist evidence
```

Failures are triaged as blocker, release-critical, or deferred only with documented owner/risk in Document 22. Flaky tests are defects; quarantine requires a ticket, rationale, and time-bound repair.

## 10. Defect handling and reporting

Defects record title, environment/build, provider/layout (if applicable), reproducible synthetic steps, expected/actual behavior, severity, owner, regression-test status, and content-safe diagnostics. Never attach live user conversation data without explicit support consent and secure handling process.

Severity:

- **P0:** cross-user access, unintended content egress, auto-send, extension/host breakage across supported provider.
- **P1:** core capture/import/insert data loss or reliable failure on one supported provider.
- **P2:** recoverable function/accessibility/visual issue with workaround.
- **P3:** minor polish/documentation issue.

## 11. Alternatives, implementation notes, and acceptance criteria

Manual-only provider testing is rejected because DOM changes need regression protection. Fully mocked provider tests are also insufficient because live pages can differ; retain both fixtures and live smoke. Cross-browser testing is exploratory only in 1A because Chrome is the sole supported browser; test Edge/Firefox only to avoid accidental claims, not as release support.

Implementation notes: choose a unit runner, browser automation framework, accessibility checker, and CI report format in Document 14/15; store fixture provenance/version without prohibited host content.

This strategy is accepted when every core PRD criterion has traceable automated/manual evidence, security/privacy checks have owners, 3×3 provider smoke is executable, and release gates prevent a passing build from being mistaken for a ready beta.

## 12. References

- [Document 02 — PRD](02_product_requirements_document.md)
- [Document 07 — Browser Extension Architecture](07_browser_extension_architecture.md)
- [Document 10 — Capsule Specification](10_capsule_specification.md)
- [Document 11 — Security Architecture](11_security_architecture.md)
- [Document 13 — Deployment Strategy](13_deployment_strategy.md)
- [Document 19 — Release Checklist](19_release_checklist.md)
- [Document 22 — Risk Register](22_risk_register.md)
