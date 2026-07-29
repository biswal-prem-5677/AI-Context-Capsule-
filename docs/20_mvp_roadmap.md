# Context Capsule — MVP Roadmap

**Document ID:** 20  
**Status:** Draft — execution begins only after blueprint approval  
**Phase:** 3 — Delivery  
**Depends on:** Documents 02, 06–19  
**Purpose:** Break the Core Transfer MVP into independently completable, testable milestones that preserve a releasable product state.

## 1. Roadmap rules

- Finish a milestone, verify it, document it, and commit it before starting the next.
- A later milestone never compensates for an incomplete earlier one.
- 1A is the only release-blocking roadmap. 1B and 1C begin only after their explicit product/security/release gates.
- Estimates are relative complexity, not dates or promises. Capacity/ownership is set by the implementation team.

```text
M0 Foundation → M1 Local Capsule Engine → M2 ChatGPT transfer
 → M3 Claude/Gemini transfer → M4 1A release readiness → Public beta
                                  ├→ M5 optional sync/dashboard (1B)
                                  └→ M6 optional smart draft (1C)
```

## 2. Milestone 0 — Verified foundation

| Field | Plan |
| --- | --- |
| Objective | Establish a reproducible monorepo, canonical schema package, quality gates, and baseline documentation. |
| Deliverables | pnpm workspaces; strict TypeScript; lint/format/test/build scripts; package boundaries; schema validators/codecs/fixtures; CI; `.env.example`; initial issue/PR templates. |
| Dependencies | Product/architecture approval; repository/remote ownership. |
| Acceptance criteria | Fresh clone follows Document 18; all baseline commands pass; JSON fixture validates/round-trips; no secrets/remote code; CI green. |
| Complexity | Medium. |
| Testing | Unit codec/schema tests; CI install/build; configuration/manifest validation. |
| Commit suggestion | `chore(repo): scaffold workspace and quality gates` then `feat(schema): add capsule v1 contract`. |
| Definition of done | Document 14 structure exists, Document 15 protections/CI configured, `CONTEXT.md` commands/results current. |

## 3. Milestone 1 — Local Capsule Engine

| Field | Plan |
| --- | --- |
| Objective | Make manual/local capsule lifecycle useful without a provider adapter or account. |
| Deliverables | IndexedDB repository; library/search/sort; create/editor; required-field validation; duplicate/rename/delete/undo; JSON/Markdown import/export; compact/full prompt composer; Copy action; options/local data UI. |
| Dependencies | M0. |
| Acceptance criteria | Offline user can create, edit, find, duplicate, delete/undo, export, clean-profile import, and copy a capsule; invalid/unsafe import saves nothing. |
| Complexity | High. |
| Testing | Repository transaction/undo, schema/Markdown/import fuzz cases, prompt budget/truncation, keyboard/accessibility, offline/IndexedDB error E2E. |
| Commit suggestion | `feat(library): add local capsule lifecycle`, `feat(import): support canonical JSON and Markdown`. |
| Definition of done | All PRD F-03–F-05 local criteria pass; no cloud or model dependency; docs/known limits updated. |

## 4. Milestone 2 — First end-to-end provider transfer (ChatGPT)

| Field | Plan |
| --- | --- |
| Objective | Prove one robust capture→review→insert flow on a single supported web provider. |
| Deliverables | MV3 content injection; ChatGPT adapter; source preview/selection; Capsule control; native composer insertion; existing-draft preservation; capability/error/copy fallback. |
| Dependencies | M1; host permission/security review. |
| Acceptance criteria | Clean Chrome profile can capture visible ChatGPT turns, review/save locally, and insert into a new ChatGPT composer without auto-send; unsupported layout fails safely. |
| Complexity | High. |
| Testing | Adapter fixtures, mutation/navigation lifecycle, local fixture E2E, live manual smoke, 200-turn performance, host-page/no-send regression. |
| Commit suggestion | `feat(adapter): add ChatGPT capture and insertion`. |
| Definition of done | Document 07 adapter evidence current; host permission/manifest review passed; Copy fallback proven. |

## 5. Milestone 3 — Cross-provider MVP

| Field | Plan |
| --- | --- |
| Objective | Extend the proven core to Claude and Gemini without duplicating product logic. |
| Deliverables | Separate Claude/Gemini adapters and fixtures; provider capability display; release compatibility notes; full 3×3 source-to-target manual test matrix. |
| Dependencies | M2 complete and stable. |
| Acceptance criteria | Each provider can capture/inject on current documented layout; any degraded pair is explicit with usable Copy/Export fallback; no adapter shares selectors/business logic improperly. |
| Complexity | High. |
| Testing | Per-adapter unit/fixture tests, 3×3 live smoke, zoom/dark/new-chat/draft/error checks, regression automation. |
| Commit suggestion | `feat(adapter): add Claude transfer`, `feat(adapter): add Gemini transfer`. |
| Definition of done | PRD F-01/F-02/F-06 and Document 12 provider matrix have evidence for all supported providers. |

## 6. Milestone 4 — Core Transfer MVP release readiness (1A)

| Field | Plan |
| --- | --- |
| Objective | Turn the functional extension into an installable, supportable, privacy-honest public beta. |
| Deliverables | Packaged extension; install/support/privacy docs; Web Store listing assets; accessibility/security/performance evidence; release notes; staged rollout and rollback procedure; consent-free or approved diagnostics posture. |
| Dependencies | M0–M3; publishing identity/account. |
| Acceptance criteria | Every applicable Document 19 1A box evidenced; non-developer clean-profile installation/task test succeeds; no P0/P1 open. |
| Complexity | High. |
| Testing | Full CI, security scans, clean install/upgrade/uninstall, live smoke matrix, accessibility, beta feedback route, rollback drill. |
| Commit suggestion | `chore(release): prepare v0.1.0 core transfer beta`. |
| Definition of done | Published/staged beta release with documented support/monitoring; `CONTEXT.md` records version/status/known limits. |

## 7. Milestone 5 — Optional Sync Dashboard Beta (1B)

| Field | Plan |
| --- | --- |
| Objective | Offer deliberate cross-device capsule access without weakening local-first behavior. |
| Deliverables | Supabase Auth/RLS/migrations; sync queue/conflicts; Vercel dashboard; account/data controls; staging/prod runbooks. |
| Dependencies | 1A reliability evidence; approved privacy/legal/account/deployment decisions. |
| Acceptance criteria | Two-user isolation, offline queue/retry, conflict-copy, sign-out/local-data clarity, backup/restore and release gate pass. |
| Complexity | Very high. |
| Testing | API/RLS, migration, sync idempotency/conflict, outage, dashboard auth/accessibility, staging restore. |
| Commit suggestion | `feat(sync): add opt-in owner-scoped capsule sync`. |
| Definition of done | Document 19 1B gate passes; feature ships behind controlled beta flag/eligibility. |

## 8. Milestone 6 — Optional Smart Capsule Beta (1C)

| Field | Plan |
| --- | --- |
| Objective | Reduce drafting effort with a transparent, safe AI proposal path. |
| Deliverables | Approved model/service, consent UX, bounded request/proposal validator, rate controls, privacy docs, Quick Capture fallback, support/incident process. |
| Dependencies | 1A success; approved provider economics/retention/legal/security decisions. |
| Acceptance criteria | Explicit consent/data destination, validated editable output, no key exposure, failed request retains draft, Document 19 1C gate pass. |
| Complexity | Very high. |
| Testing | Consent/revocation, input/output security, abuse/rate, outage/fallback, data handling review. |
| Commit suggestion | `feat(smart-draft): add consented capsule proposals`. |
| Definition of done | Limited beta with monitoring, support, and no dependency for non-consenting users. |

## 9. Sequencing risks and alternatives

The biggest roadmap risk is starting optional sync/AI drafting before local handoff reliability. The mitigation is strict M4 1A release evidence. Alternative: ship only one provider first. This is acceptable only as an explicitly labeled private alpha; public 1A promise remains the three-provider scope in Document 02. Alternative: build dashboard before adapters. Rejected because it does not validate the core transfer behavior.

## 10. Acceptance criteria and self-review

- Each milestone has objective, deliverables, dependencies, acceptance, complexity, testing, commit, and done criteria.
- The roadmap preserves deployable milestones and 1A/1B/1C gates.
- It contains no date/effort promise disguised as a schedule.

Self-review: milestones are smallest meaningful release units and directly trace to the PRD/release checklist.

## 11. References

- [Document 02 — PRD](02_product_requirements_document.md)
- [Document 12 — Testing Strategy](12_testing_strategy.md)
- [Document 19 — Release Checklist](19_release_checklist.md)
- [Document 21 — Future Roadmap](21_future_roadmap.md)
- [Document 22 — Risk Register](22_risk_register.md)
