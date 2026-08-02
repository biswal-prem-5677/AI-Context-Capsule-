# Context Capsule — Documentation Architecture

## Purpose

This document is the control plane for the Context Capsule blueprint. It establishes document order, ownership, cross-references, and review gates so that the product can be designed thoroughly without producing duplicate or contradictory specifications.

It is deliberately a documentation plan, not a product or implementation specification. Product decisions belong to the numbered documents below.

## Scope and assumptions

This package describes a launchable, local-first browser-extension MVP for moving structured AI work context between ChatGPT, Claude, and Gemini web experiences. It does not authorize implementation work.

The following baseline materials already exist and remain useful inputs until their numbered replacements are reviewed:

| Existing file | Role during documentation | Canonical replacement |
| --- | --- | --- |
| `docs/PRODUCT-REQUIREMENTS.md` | V1 scope and acceptance-criteria baseline | Document 02 |
| `docs/ARCHITECTURE.md` | Early technical boundary and data-flow baseline | Documents 06–11 |
| `docs/DELIVERY-PLAN.md` | Initial milestone hypothesis | Documents 19–20 and 24 |
| `CONTEXT.md` | Live project memory | Document 16, kept at repository root |
| `CLAUDE.md` | AI-agent operating instructions | Document 17, kept at repository root |

Keeping `CONTEXT.md` and `CLAUDE.md` at the repository root is an intentional structural improvement over placing copies under `docs/`: common AI/dev tools discover those names there. Documents 16 and 17 refer to the root files, avoiding two competing sources of truth.

### Unnumbered root operating files

Two further root files are operational rather than decision records. They are deliberately **not** numbered, because they hold no decision authority: everything in them is derived from a numbered document or from `CONTEXT.md`, and they are the defect if they ever disagree.

| File | Role | Derived from | May not contain |
| --- | --- | --- | --- |
| `AGENTS.md` | Conventional-path pointer for AI coding tools | 16, 17 | Any instruction not already binding elsewhere |
| `EXECUTION_RULES.md` | Ordered procedure for executing work: startup sequence, stop conditions, verification commands, documentation and push rules | 17 primarily; 10–12, 14, 15, 20 | New scope, new authority, or a rule that contradicts Document 17 |
| `OWNER_ACTIONS.md` | Single tracked list of tasks that require the product, business, technical, or repository owner | `CONTEXT.md` open decisions; 15, 19, 20 | Engineering work, or a decision presented as already made |

`OWNER_ACTIONS.md` exists because owner-dependent blockers were previously scattered across the `CONTEXT.md` open-decisions table, the milestone status table, and individual documents, which made it impossible for the owner to see their own queue in one place.

## Design rules for every document

Every numbered document must contain, where relevant: purpose, scope, assumptions, diagrams, workflows, edge cases, risks, alternatives, implementation notes, acceptance criteria, and references. A section may state “not applicable” only with a reason.

Documents must distinguish:

- **Decision** — approved, binding for later documents.
- **Assumption** — needs validation and an owner/date or trigger.
- **Open decision** — blocks a later commitment and must not be silently assumed.
- **Future item** — intentionally out of MVP scope.

No document may introduce a new MVP feature without explicitly updating the PRD, roadmap, risk register, and `CONTEXT.md` after approval.

## Source-of-truth hierarchy

```text
01 Vision → 02 PRD → 04 UX / 05 Design System
                    └→ 03 Market Research validates positioning
02 PRD + 04/05 → 06–11 Engineering specifications
06–11 → 12 Testing + 14 Structure + 15 GitHub workflow
12/14/15 → 13 Deployment + 18 Installation + 19 Release checklist
All approved decisions → 16 CONTEXT.md + 17 CLAUDE.md
02 + 12 + 13 + 19 → 20 MVP roadmap → 24 Launch strategy → 25 Success metrics
All documents → 21 Future roadmap + 22 Risk register + 23 Known limitations
```

When documents conflict, resolve them in this order: approved product decision in Document 02; security/privacy decision in Document 11; technical feasibility decision in Document 06; testable acceptance criterion in Document 12; then the relevant supporting document. Record the resolution in `CONTEXT.md` and Document 22.

## Numbered document register and ordering verification

| ID | Canonical location | Primary purpose | Depends on | Must not duplicate |
| --- | --- | --- | --- | --- |
| 01 | `docs/01_project_vision.md` | Why the product should exist and the V1 boundary | — | Detailed requirements, market claims |
| 02 | `docs/02_product_requirements_document.md` | Binding MVP user/business requirements | 01 | UX layouts, technical design |
| 03 | `docs/03_market_research.md` | Time-stamped evidence for positioning | 01 | Product requirements or feature promises |
| 04 | `docs/04_user_experience.md` | Tasks, flows, states, accessibility, wireframes | 01–02 | Visual token definitions, API behavior |
| 05 | `docs/05_ui_design_system.md` | Visual language and reusable component standards | 04 | User-flow logic |
| 06 | `docs/06_system_architecture.md` | System boundaries, components, data/state flow | 02, 04–05 | Browser lifecycle detail, schema detail |
| 07 | `docs/07_browser_extension_architecture.md` | Manifest V3, adapters, lifecycle, permissions | 02, 06 | Global architecture or database model |
| 08 | `docs/08_database_design.md` | Data model, RLS, indexes, retention, backup | 02, 06, 11 | HTTP contract or capsule payload contract |
| 09 | `docs/09_api_specification.md` | Versioned public/internal service contract | 02, 06, 08, 11 | Database implementation detail |
| 10 | `docs/10_capsule_specification.md` | Canonical capsule contract and codec rules | 02, 06, 11 | Product user stories or API endpoint detail |
| 11 | `docs/11_security_architecture.md` | Threat model, privacy, controls, assurance | 02, 06–10 | Test case catalogue |
| 12 | `docs/12_testing_strategy.md` | Verification plan and quality gates | 02, 06–11 | Release sign-off checklist |
| 13 | `docs/13_deployment_strategy.md` | Environments, releases, observability, rollback | 06, 08–09, 11–12 | Local installation instructions |
| 14 | `docs/14_project_structure.md` | Repository layout and coding conventions | 06–07, 10, 12 | CI rules or branch policy |
| 15 | `docs/15_github_workflow.md` | Git governance, CI, review, release process | 12–14 | Repository folder detail |
| 16 | `CONTEXT.md` | Living, concise state of the project | All approved decisions | Long-form rationale |
| 17 | `CLAUDE.md` | Non-negotiable AI-agent working contract | 02, 06, 11–12, 15–16 | Product/technical specification |
| 18 | `docs/18_installation.md` | Local setup and troubleshooting for contributors/users | 13–15 | Deployment strategy |
| 19 | `docs/19_release_checklist.md` | Evidence-based pre-release gate | 11–13, 15, 18 | Test strategy detail |
| 20 | `docs/20_mvp_roadmap.md` | Small, independently complete MVP milestones | 02, 06–20 as applicable | Future feature strategy |
| 21 | `docs/21_future_roadmap.md` | Explicitly deferred opportunities | 02, 03, 20 | MVP commitments |
| 22 | `docs/22_risk_register.md` | Active risks, owners, triggers, mitigations | All prior documents | Full threat-model or test-plan text |
| 23 | `docs/23_known_limitations.md` | Honest MVP trade-offs and user-facing limitations | 02, 06–12, 20 | Future roadmap rationale |
| 24 | `docs/24_launch_strategy.md` | Beta, feedback loop, flags, iteration operating model | 03, 13, 19–20, 25 | Metric definitions |
| 25 | `docs/25_success_metrics.md` | Definitions, instrumentation, targets, review cadence | 02–03, 11, 24 | Product vision narrative |

### Ordering decision

The requested order is valid with two refinements:

1. Market research follows the initial vision, so it tests the desired position rather than silently dictating it; its evidence can then revise Document 02 before engineering begins.
2. Document 20 is written after delivery constraints are clear, even though it will be used continuously thereafter. This makes each roadmap milestone technically credible and release-verifiable.

The three user-facing phases are therefore:

```text
Phase 1 — Product & Design: 01–05
Review gate: MVP promise, scope, evidence, critical flows, visual system

Phase 2 — Engineering: 06–12, 14–17
Review gate: feasible secure design, complete contracts, testable architecture

Phase 3 — Delivery: 13, 18–25
Review gate: deployable/releasable MVP and measurable launch plan
```

## Cross-reference protocol

- Refer to documents by ID and title, e.g. “Document 10, Capsule Specification, §4.2.”
- Link to a stable heading, never a line number.
- Cite upstream decisions rather than restating them verbatim.
- Downstream documents may constrain implementation, but must not alter product scope; proposed changes go back to Document 02 for approval.
- `CONTEXT.md` records only current decisions, status, commands, and blockers; it links to the full rationale.

## Documentation workflow and review gate

```text
Draft one document
      ↓
Self-review: completeness, overlaps, conflicts, unvalidated assumptions
      ↓
Update cross-reference register and CONTEXT.md
      ↓
User review / approval / correction
      ↓
Mark decision status and begin the next document
```

The package may be drafted as a complete, internally consistent set when the product owner explicitly requests completion. That does not convert drafts into approved decisions: implementation cannot begin until the Phase 1 product/design review is complete, and no deployment/release document is finalized until the relevant engineering decisions are reviewed.

## Risks and alternatives

| Risk | Consequence | Control |
| --- | --- | --- |
| A 25-document package becomes bureaucracy | Slow delivery, stale specs | Keep each document decision-focused; `CONTEXT.md` is the operative summary. |
| Repeating content creates divergence | Implementation ambiguity | Enforce the document boundaries in the register and link upstream. |
| Vendor facts become stale | Incorrect positioning or integration assumptions | Time-stamp Document 03 research and revalidate it before launch. |
| Early technical choices force scope | Unnecessary complexity | Keep product requirements provider-agnostic until Documents 06–11 show feasibility. |

Alternative: combine documents into a single large blueprint. Rejected because review, ownership, and change tracking are materially worse. When the complete package is drafted in one pass, mitigate cross-document risk with explicit source-of-truth hierarchy, self-review, and a phase-based approval gate before implementation.

## Acceptance criteria

- Every required document has one canonical location and a non-overlapping owner/purpose.
- Dependencies create no circular prerequisite before the Phase 1 gate.
- Cross-reference and conflict-resolution rules are clear enough for a senior team to use.
- Root `CONTEXT.md` and `CLAUDE.md` remain the only live sources for project memory and AI-agent decision authority. The unnumbered operating files (`AGENTS.md`, `EXECUTION_RULES.md`, `OWNER_ACTIONS.md`) are procedural or tracking surfaces derived from them and hold no independent authority.
- All 25 numbered documents are present as drafts, with Documents 16 and 17 intentionally represented by root `CONTEXT.md` and `CLAUDE.md`.
- Implementation remains blocked until the Phase 1 gate has product-owner approval and open decisions are resolved.

## References

- [Document 01 — Project Vision](01_project_vision.md)
- [Current project memory](../CONTEXT.md)
- [Existing requirements baseline](PRODUCT-REQUIREMENTS.md)
- [Existing architecture baseline](ARCHITECTURE.md)
- [Existing delivery baseline](DELIVERY-PLAN.md)
