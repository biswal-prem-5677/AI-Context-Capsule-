# Context Capsule — Living Project Memory (Document 16)

## Current sprint

**Sprint:** Documentation blueprint complete — awaiting product-owner review and explicit implementation authorization.  
**Phase:** Product, engineering, and delivery design complete; no production application code or deployment exists.  
**Current priority:** Resolve launch-gating decisions, approve this blueprint, then begin Milestone 0 only.

## Completed documentation

- Documents 00–15: architecture of the documentation, product/design, system/extension/data/API/capsule/security/testing, deployment, structure, and GitHub workflow.
- Documents 18–25: installation, release, MVP/future roadmaps, risks, limitations, launch strategy, and success metrics.
- Root `CLAUDE.md`: durable AI-agent operating contract.
- Existing unnumbered files in `docs/` remain early baseline references and are superseded by numbered documents where stated.

## Approved working assumptions — pending owner confirmation

- Product name: Context Capsule.
- Required release slice: 1A Core Transfer MVP — Chrome MV3 extension; ChatGPT, Claude, Gemini web; local capture/review/library/import/export/insert.
- 1B sync dashboard and 1C AI-assisted drafting are separately gated and cannot delay a local-first public beta.
- Core data is a user-editable, versioned JSON/Markdown capsule; it is not a complete transcript or guaranteed conversation continuation.
- Extension never sends a chat message automatically and preserves an existing target draft.
- Raw excerpts do not sync by default; optional data egress requires just-in-time consent.

## Open decisions and blockers

| Decision | Owner | Blocks |
| --- | --- | --- |
| Approve/refine the 1A scope and 1B/1C gates | Product owner | Implementation start |
| Smart-draft provider, economics, retention, and consent copy — or defer 1C | Product/legal owner | 1C only |
| Whether 1B sync ships in first public beta | Product owner | 1B planning/release |
| Legal entity, privacy policy, support contact, Chrome Web Store account | Business owner | Public release |
| Supabase/Vercel account ownership, regions, backup policy, OAuth details | Technical owner | 1B deployment |

## Next tasks — strict order

1. Review Documents 01–05 and confirm product scope/positioning decisions.
2. Review Documents 06–12 with engineering/security owner; log any accepted changes in this file and relevant numbered document.
3. Configure repository remote, branch protection, ownership, and issue/project tracking per Document 15.
4. Begin Document 20 Milestone 0: scaffold workspace, schema, quality gates, and CI — only after approval.
5. Do not build dashboard sync or smart drafting before 1A evidence and their explicit gates.

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

None. There is no application code yet. Do not interpret this as production readiness.

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

No application workspace exists yet. The intended commands after Milestone 0 are documented in [Document 18](docs/18_installation.md). Record actual verified commands, tool versions, deployment URLs (non-secret), and release tag here once implementation begins.

## Developer notes

- Start every session by reading this file, `CLAUDE.md`, and the relevant numbered documents.
- Update this file at the end of every meaningful implementation, decision, incident, or release change.
- Mark an item completed only with linked test/build/manual evidence; never replace current facts with aspirational status.
- Keep this concise; detailed rationale belongs in numbered documents/issues/ADRs.
