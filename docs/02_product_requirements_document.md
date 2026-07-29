# Context Capsule — Product Requirements Document

**Document ID:** 02  
**Status:** Draft for product review  
**Phase:** 1 — Product & Design  
**Depends on:** [Document 01 — Project Vision](01_project_vision.md)  
**Supersedes on approval:** `docs/PRODUCT-REQUIREMENTS.md` as the binding V1 product specification  
**Last updated:** 2026-07-29

## 1. Purpose

This PRD defines the smallest product that can credibly deliver Context Capsule’s promise: an individual can create a reviewed AI-work handoff and insert it into another supported web AI chat without rebuilding the context by hand.

It converts the vision into testable, prioritized product requirements. It does not select frameworks, DOM selectors, database schema, API paths, visual tokens, or test tools; those are owned by Documents 04–12 and 14. Where the product requires a technical capability, this document describes the observable outcome rather than the implementation.

## 2. Product summary

Context Capsule is a Chrome extension for the web versions of ChatGPT, Claude, and Gemini. From a supported conversation, a user opens a Capsule control, reviews selected conversation content and a structured handoff, saves it locally, and later inserts a compact or full context prompt into a supported destination composer. The extension does not send the message.

The core product is **context handoff**, not chat backup, AI memory, a multi-provider workspace, or an autonomous conversation migrator.

## 3. Scope, assumptions, and release model

### 3.1 Product assumptions

| Assumption | Product consequence | Validation point |
| --- | --- | --- |
| The target user switches providers during active work | Optimize for in-the-moment capture and insertion, not long-term archival | Document 03 research and beta interviews |
| A user accepts a short review step for trust and accuracy | No silent background capture or summarization | Document 04 usability review |
| Chrome web is the first viable surface | No mobile, desktop app, browser parity, or provider API integrations in MVP | Phase 2 adapter spike |
| A meaningful AI summary requires a model/service | Smart generation cannot be represented as free, private, or universally available unless it actually is | Product owner launch decision before Smart mode |
| Local-only value must exist | Account, sync, and hosted summarization cannot block the first successful transfer | Core beta test |

### 3.2 Release slices

To prioritize completion and user satisfaction, “MVP” is split into a required core release and an explicitly optional companion beta. This is a sequencing decision, not an attempt to hide unfinished core work.

| Slice | Name | Required for public beta | Description |
| --- | --- | --- | --- |
| 1A | Core Transfer MVP | Yes | Extension-only local create/review, library, JSON/Markdown import/export, and insert into supported web composers. |
| 1B | Sync Dashboard Beta | No | Opt-in sign-in, cloud sync, and a minimal web library; ships only after 1A transfer reliability is proven. |
| 1C | Smart Capsule Beta | No | Opt-in AI-assisted drafting after provider, cost, retention, and consent decisions are approved. |

The product may be branded as a V1 beta after 1A. It must not advertise dashboard sync or AI-generated summaries as generally available until their own release gates pass.

### 3.3 In scope for 1A

- Chrome Manifest V3 extension.
- ChatGPT, Claude, and Gemini web adapters, subject to the compatibility rule in §11.
- User-initiated capture of visible conversation turns and source metadata.
- An editable structured capsule, a local capsule library, search, rename, duplicate, delete/undo, import, copy, and export.
- Canonical JSON and readable Markdown formats.
- Compact and full context-prompt generation.
- Insertion into a native supported composer without automatic sending.
- Local/offline functionality and transparent unsupported/error states.

### 3.4 In scope only for 1B/1C

- Optional account and cloud sync (1B).
- A minimal web dashboard for intentionally synced capsules (1B).
- User-approved AI-assisted structured drafting (1C).

### 3.5 Out of scope

- Shared/team libraries, public links, permissions, billing, referral programs, or marketplace capabilities.
- Model routing, automatic provider choice, automatic “limit reached” detection, or automatic continuation.
- Semantic/vector search, knowledge graph, autonomous memory, project management, or task execution.
- GitHub, Notion, Drive, MCP, codebase, local-file, and email integrations.
- Capturing non-visible history, provider APIs, system prompts, browser cookies, private account data, or embedded attachments.
- Native/mobile clients, Firefox/Edge packaging, or support for other AI sites in the initial release.
- A guarantee that a destination model will follow the capsule or produce the same outcome as the source model.

## 4. Personas, jobs, and exclusions

### Persona A — Cross-provider builder (primary)

An individual developer, founder, or technical student uses several AI chat products while building a project. They want to preserve implementation decisions, file references, restrictions, and the exact next task while changing tool or model.

**Job to be done:** When I need to move an active AI task to another tool, help me prepare accurate working context quickly so I do not restart the explanation or lose prior decisions.

**Pain points:** conversation history is too long; previous instructions are missed; drafts get overwritten; model limits/availability interrupt flow; provider-native projects stay locked inside one product.

### Persona B — Research/planning power user (secondary)

An independent researcher, student, or operator uses providers for analysis, writing, or planning. They care about scope, terms, assumptions, source references, and unanswered questions.

**Job to be done:** When I change AI tools, retain the reasoning frame and next action while keeping sensitive content under my control.

### Non-personas

Enterprises requiring compliance, SSO, audit exports, retention guarantees, and centralized administration are not served by the MVP. Neither are people who expect the extension to create a perfect AI summary without review or those who never work across providers.

## 5. User stories

| ID | Priority | User story | Outcome |
| --- | --- | --- | --- |
| US-01 | Must | As a user in a supported chat, I want to see one clear Capsule action so I know how to begin a handoff. | Discoverable entry point. |
| US-02 | Must | As a user, I want to review what is captured before saving it. | I can remove sensitive/irrelevant content. |
| US-03 | Must | As a user, I want to edit the goal, state, decisions, constraints, and next actions. | The next AI receives useful, accurate context. |
| US-04 | Must | As a user, I want to save and find capsules locally without creating an account. | Core value works privately/offline. |
| US-05 | Must | As a user, I want to export/import a capsule in portable formats. | I can move it between devices or keep my own copy. |
| US-06 | Must | As a user in another supported chat, I want to insert selected context without losing my current draft. | I can continue working safely. |
| US-07 | Must | As a user, I want the extension never to send a message on my behalf. | I retain control over AI interaction. |
| US-08 | Should | As a user with many capsules, I want to search, rename, duplicate, and undo delete. | My local library stays usable. |
| US-09 | Should | As a user on an unsupported/changed page, I want a useful explanation and a copy/import fallback. | A failure does not trap me. |
| US-10 | Could / 1B | As a signed-in user, I want to access deliberately synced capsules in a browser dashboard. | I can continue across devices. |
| US-11 | Could / 1C | As a consenting user, I want AI assistance drafting a structured capsule. | I reduce manual editing time. |

## 6. Core workflows

### WF-01 — Capture, review, and insert

```text
Supported source chat
  → User opens Capsule
  → Extension confirms visible turns and source
  → User chooses included content and reviews editable capsule
  → User saves locally
  → User opens a supported destination chat
  → User chooses the saved/imported capsule and Compact or Full
  → Extension inserts editable context above any existing draft
  → User verifies it and decides whether to Send
```

**Success condition:** the user can reach a readable, editable context prompt in the native target composer without manually re-copying the source conversation.

### WF-02 — Import a portable file

```text
Extension library → Import → Drag/drop, browse, or paste
  → Validate size/schema/content → Preview and correct fields
  → Save locally → Select and insert/copy/export
```

**Success condition:** a valid export from another clean profile is accepted as an equivalent capsule. An invalid import saves nothing.

### WF-03 — Local recovery

```text
Offline / unsupported provider / failed adapter
  → Explain condition in plain language
  → Retain saved local library
  → Offer manual new capsule, import, copy, or export as applicable
```

**Success condition:** a provider issue never deletes existing capsules or blocks a user from using an already-saved capsule.

## 7. Feature requirements

### F-01 — Supported-page entry and capability detection

**Requirement.** On a currently supported ChatGPT, Claude, or Gemini web page, the extension presents one keyboard-accessible Capsule control close to the conversation composer. The extension only operates after a user action.

**Rules.**

- The control must not block a native host action, alter host content, or inject more than one copy after navigation.
- It must distinguish “can capture source turns,” “can insert into composer,” and “layout unsupported.”
- It must not claim compatibility with an untested provider layout.

**Acceptance criteria.**

- On a supported active conversation and a supported new conversation, the Capsule control can receive focus, open, and close without impairing the host composer.
- If a provider layout cannot be recognized, the user sees an unsupported message and a local-library/copy/export path; the host page remains functional.

### F-02 — Conversation capture and review

**Requirement.** The user can initiate capture from visible conversation content, see what was found, remove content before save, and edit a structured handoff.

**Minimum captured source metadata.** provider name, source URL if available, extraction time, optional visible conversation title, ordered visible user/assistant turns, and turn count.

**Rules.**

- Capture only visible, selected conversation text; never collect cookies, account tokens, hidden provider state, or system prompts.
- Show ordered turn count and a preview before persistence.
- Saving is explicit. Cancelling must persist nothing from the current capture.
- Source excerpt retention is opt-in; it is not required for a valid capsule.

**Acceptance criteria.**

- A chat with at least two visible turns produces an ordered review preview with correct provider and capture time.
- A user can exclude at least one turn/field, save, reopen the capsule, and verify the excluded content is absent.
- Cancellation leaves no new capsule and no partial source transcript in the library.

### F-03 — Structured capsule editor

**Requirement.** The editor must create a user-readable and editable handoff, not an opaque blob.

**Required fields to save:** title, goal, current state, at least one next action, source provider, capture time, schema version, created time, updated time.

**Optional fields:** project/subject, important decisions, constraints, completed work, relevant files/references, open questions, source excerpt, tags, and safe extension data.

**Quick Capture contract.** Quick Capture is always available and makes no AI inference claim. It creates source metadata, an editable fielded draft, and a user-chosen bounded excerpt/turn selection. Where it cannot know goal or current state, it marks the field for user completion.

**Smart Capsule contract (1C only).** Smart Capsule may propose field values from selected turns only after explicit provider/data-destination consent. It must never overwrite user edits, hide its source, or leave the user without the editable Quick Capture draft when it fails.

**Acceptance criteria.**

- The user can edit all canonical fields and validation identifies the specific missing required field.
- The saved/reopened capsule preserves all edited canonical values and dates.
- A Smart Capsule failure returns the user to the same editable draft; no raw selected turns are sent unless the consent action occurred.

### F-04 — Local library and lifecycle

**Requirement.** Local storage is the primary store for 1A. The user can access capsules from the extension library without an account or network.

**Rules.**

- List title, last updated time, source provider, and next action summary where present.
- Support search by title, source provider, and tag; sort by last updated by default.
- Rename, duplicate, export, and delete are available from the list or detail view.
- Local delete offers an undo period of at least ten seconds. A user can also permanently delete after confirmation.
- Local clear-data is in settings and requires an explicit confirmation that names the data being removed.

**Acceptance criteria.**

- With networking disabled, a user can create, edit, search, duplicate, delete/undo, export, and import capsules.
- A library of 500 local capsules remains searchable and displays a meaningful empty state when none exist.

### F-05 — Portable import and export

**Requirement.** Users can export and import the versioned capsule contract as JSON and a readable Markdown rendition. Users can also paste text or drop/browse supported files.

**Rules.**

- JSON is the canonical exact-transfer representation; Markdown is human-readable and reviewable, not guaranteed lossless for unknown extensions.
- Files are capped at 1 MB for 1A. Imports reject unsupported schema versions, invalid structured data, executable/unsafe content, and malformed JSON.
- Unknown safe JSON fields are retained only in a namespaced `extensions` area; core fields cannot be silently overridden.
- Markdown/pasted headings are mapped to known fields and uncertain mappings require review before saving.
- No importer executes HTML, scripts, or links automatically.

**Acceptance criteria.**

- Exported JSON imported into a clean profile yields equivalent canonical content and source metadata.
- Markdown exported by the product is readable in a plain-text editor and can be imported with a user-visible review.
- An invalid file provides an actionable error and creates no library entry.

### F-06 — Context prompt composition and insertion

**Requirement.** A selected capsule can be rendered as a plain-text handoff and placed in a supported target chat’s native composer.

**Rules.**

- Offer **Compact** (target maximum 2,500 tokens) and **Full** (target maximum 7,000 tokens) modes. Show estimated size before insertion; estimates are advisory.
- The composed handoff includes an honest directive that it is user-provided working context, calls out incomplete/truncated areas, preserves decisions/constraints, and asks the target AI to clarify unresolved ambiguity.
- Put existing destination draft text after a visible `--- User draft ---` divider. Never overwrite it.
- Insert only; never focus Send, trigger keyboard submission, or call any host send action.
- Offer Copy as a fallback if direct insertion fails.

**Acceptance criteria.**

- Each supported target receives visible, editable text in its native composer and requires a separate user action to send.
- With a pre-existing draft, the exact draft remains present after the divider.
- If Compact truncates a field, the output names the truncated field rather than implying it is complete.

### F-07 — Optional sync dashboard (1B)

**Requirement.** If 1B is approved, an authenticated user can access only capsules that they explicitly elected to sync, through a minimal web library and editor.

**Rules.**

- Account creation is never required for 1A.
- Sync status must be visible: local only, pending, synced, or retry required.
- Cloud deletion requires confirmation before propagation. When local and remote edits conflict, preserve the local version as a conflicted copy rather than silently losing it.
- The dashboard is limited to sign-in, library, detail/edit, import/export, and sign-out. It adds no social/team surfaces.

**Acceptance criteria.**

- User A cannot access User B’s synced capsule via UI or direct service request.
- A locally created capsule still works when the account service is unavailable.
- A sync conflict leaves both versions recoverable and clearly named.

### F-08 — Optional smart drafting (1C)

**Requirement.** If approved, a user may opt into AI-assisted drafting of capsule fields.

**Preconditions.** Product owner has approved provider/model, cost/credit model, retention terms, privacy copy, and abuse/rate controls. Security review in Document 11 is complete.

**Acceptance criteria.**

- Before the first request, UI names the model/provider, selected data, and destination; the user confirms each relevant configuration change.
- User can continue with Quick Capture when the provider is unavailable, limit is reached, or output fails validation.
- A model output is treated as an editable proposal and visibly marked until saved by the user.

## 8. Business rules

1. The user owns every creation, export, insertion, sync, and deletion decision; no automatic content transmission occurs.
2. A capsule is not a transcript and must show source/excerpt status honestly.
3. Capsule content is user data. Product analytics, diagnostic reports, and support bundles must exclude capsule text by default.
4. A target provider’s own content policy, context limit, availability, and behavior take precedence once the user sends the inserted prompt.
5. The application must use “Insert context” in core UI; it must not promise to “continue exactly where you left off.”
6. Compatible scope is defined by tested capability, not a domain name alone. A source-only or insertion-only page may still be usable if labeled accurately.
7. 1A must retain full local operation if no auth, sync, analytics, or smart drafting service is configured.

## 9. Non-functional requirements

### 9.1 Usability and accessibility

- All core actions are keyboard reachable, labeled, and have visible focus states.
- Core error/success/loading status is announced semantically and never conveyed by color alone.
- Controls meet WCAG 2.2 AA contrast targets; text scaling must not hide actions at 200% zoom.
- An action that may take more than one second shows a clear in-progress state and an available cancel/retry path where possible.

### 9.2 Privacy and security outcomes

- Minimum browser permission and host-access model is used; rationale is visible in installation documentation.
- Raw content does not leave the browser absent a user-initiated export, opted-in sync, or confirmed smart drafting request.
- Imports are validated and displayed as text/escaped Markdown, never rendered as executable content.
- No API keys, cookies, browser session tokens, or unredacted sensitive information may be put in an exported capsule by the product.
- No telemetry is enabled without explicit, reversible consent and approved privacy documentation.

### 9.3 Reliability and performance outcomes

- Opening the extension interface on an idle supported page should feel immediate; target under 500 ms where Chrome permits.
- A capture of 200 visible turns must show progress and complete or fail recoverably within five seconds under normal conditions; it must not freeze the host tab.
- Core local operations work offline. Sync failure does not block export or insertion of a saved capsule.
- Provider incompatibility is contained to that adapter; it must not crash the extension or change host-page behavior.

### 9.4 Maintainability outcomes

- Provider-specific capture/insertion behavior is replaceable without rewriting capsule, library, or prompt behavior.
- The capsule contract is versioned and validates on read/write/import/export.
- Every release has documented known compatibility status for the three supported sites.

## 10. UX requirements and states

Document 04 owns wireframes, navigation, copy catalogue, animations, responsive behavior, and component-level interactions. This PRD sets the non-negotiable states it must cover.

| Surface | Required states |
| --- | --- |
| In-page Capsule control | Available, no capture available, source supported but target unsupported, layout unsupported, loading, error. |
| Capture/review | Turns found, no turns, long capture, cancelled, excluded content, validation error, saved. |
| Library | First-use empty state, populated, searching/no results, offline, import validation error, delete/undo. |
| Insert | Capsule selected/not selected, compact/full estimated size, existing draft detected, insertion success, insertion failed/copy fallback. |
| Optional sync | Signed out, local-only, pending, synced, retry, conflict. |
| Optional smart draft | Consent required, generating, proposed draft, provider failure, safe quick-capture fallback. |

## 11. Compatibility and edge-case policy

| Condition | Required behavior | Release implication |
| --- | --- | --- |
| Empty/new conversation | Explain no turns are available; offer manual capsule/import. | Does not block release. |
| Long or partial conversation | State visible-turn limitation; show count/progress; allow reduced selection. | Must be tested before release. |
| Assistant content includes code/table | Preserve as plain text/Markdown in review; user decides relevance. | Must not execute or corrupt host page. |
| Composer unavailable | Disable insertion; provide Copy. | Site is not insertion-compatible for that layout. |
| Source and target are the same provider | Allow it; product remains a new-chat handoff, not in-place transcript mutation. | Supported. |
| Native draft exists | Preserve it below divider. | Release blocker if violated. |
| Private/incognito browser context | Follow Chrome permission/storage behavior; state limits honestly. | Document in installation/limitations. |
| Network unavailable | All 1A flows continue except optional services. | Release blocker if local flow fails. |
| Adapter DOM regression | Detect failure, record non-content error code, offer fallback, disable only affected action. | Require hotfix triage process. |

## 12. Data contract constraints

The detailed contract lives in Document 10. This PRD requires the following product-level guarantees:

- Every capsule has stable identifier, schema version, source metadata, creation/update timestamps, and user-readable core fields.
- Required handoff fields are goal, current state, and at least one next action; an incomplete source must be visibly marked and corrected by the user before saving.
- Export includes schema version and source/excerpt disclosure.
- Import respects forward/backward compatibility policy and never changes canonical content without review.
- Attachments are not supported in 1A. The schema may reserve a future-safe field but the UI must not imply attachment transfer works.

## 13. KPIs and product instrumentation requirements

Document 25 defines formulas, event taxonomy, sampling, targets, and review cadence. The product must be capable of measuring the following only after consent and privacy approval:

- activation: first successful capture and insert;
- core completion: started capture/import that reaches saved/inserted state;
- transfer time: capture start to successful insertion;
- adapter reliability: safe capture/insertion result by provider/layout version;
- local library retention/return usage;
- opt-in satisfaction response after a completed transfer;
- privacy-safe crash/error rate.

No capsule text, source turns, source URLs with sensitive query values, prompts, API keys, or provider account data are instrumentation fields.

## 14. Constraints and dependencies

| Constraint/dependency | Product impact | Owner document |
| --- | --- | --- |
| Provider web DOM changes without notice | Adapter support can degrade | 07, 12, 19, 23 |
| Chrome Web Store policies/permissions | Can limit UI injection or data practices | 07, 11, 13, 19 |
| Context limits of target models | Full handoff cannot be guaranteed | 10, 23 |
| Smart-drafting provider/cost/retention decision | 1C cannot be promised or built | 11, 13, 20, 22 |
| Cloud identity/RLS design | 1B cannot be safely released | 08, 11–13, 19 |
| Privacy policy and support ownership | Public launch/listing cannot complete | 13, 19, 24 |

## 15. Release strategy and product gates

### 1A gate — Core Transfer MVP

Release only when:

- the 1A user stories and acceptance criteria pass on current tested Chrome layouts;
- create/review/export/import/insert work without sign-in and offline where applicable;
- insertion never submits or overwrites a draft;
- invalid imports and adapter failures are recoverable;
- core accessibility, privacy, security, and test requirements have evidence;
- installation, known limitations, support, and privacy copy are ready for a small beta.

### 1B gate — Sync Dashboard Beta

Release only after 1A evidence shows core transfers are reliable and Document 11 security requirements, row-level authorization tests, conflict recovery, and data-handling disclosures pass.

### 1C gate — Smart Capsule Beta

Release only after product owner approval of service economics and data handling; explicit consent, rate controls, safety/validation behavior, and quick-capture fallback pass testing.

## 16. Risks and alternatives

| Risk | Consequence | Product response |
| --- | --- | --- |
| Requiring a dashboard/auth too early | Launch slips; private users abandon | Treat 1B as non-blocking companion beta. |
| Calling a raw excerpt an AI-generated summary | User trusts inaccurate context | Name Quick Capture honestly; smart drafting is separately consented. |
| Multi-provider support triples adapter work | Lower quality everywhere | Build/test one complete source-to-target adapter flow before enabling each next provider. |
| Frequent provider DOM changes | Breaks a visible feature | Narrow compatibility claim; fail safely with copy/export fallback. |
| Scope pressure from team/integration requests | Core loop unfinished | Record as Document 21 future items; require formal PRD change to add. |

Alternative: release only JSON/Markdown export and ask users to paste manually. This reduces adapter risk but fails the product’s friction-reduction promise, so it is an emergency fallback rather than the desired 1A experience. Alternative: require a hosted account from day one. Rejected because it conflicts with the privacy/local-first value proposition and adds launch dependency.

## 17. PRD acceptance criteria and review questions

This PRD is ready for approval when the product owner confirms:

1. 1A (extension-only local transfer) is the release-blocking MVP; dashboard sync and smart drafting are separately gated 1B/1C capabilities.
2. The Must user stories in §5 represent the complete 1A promise; no omitted feature is necessary to make a first transfer useful.
3. The explicit smart-drafting boundary is acceptable: no claim of automatic meaningful summarization without a chosen data/cost model.
4. The three provider web surfaces are the sole initial support commitment.
5. The user-review, no-auto-send, local-first, and consent rules are non-negotiable.
6. The release gates are sufficient to prevent an incomplete or misleading public beta.

### Self-review

All requested PRD sections are present: personas, stories, feature breakdown, functional/non-functional requirements, edge cases, business rules, constraints, KPIs, out-of-scope scope, and release strategy. Product choices are consistent with Document 01 and with the existing local-first baseline. Visual design, current market evidence, concrete architecture, schema detail, security control design, and test plans are intentionally delegated to their owning documents. No missing product decision currently blocks Document 03 research or Document 04 UX exploration; dashboard/smart-drafting decisions are deliberately gated before release.

## 18. References

- [Document 00 — Documentation Architecture](00_documentation_architecture.md)
- [Document 01 — Project Vision](01_project_vision.md)
- [Document 03 — Market Research](03_market_research.md)
- [Document 04 — User Experience](04_user_experience.md)
- [Document 10 — Capsule Specification](10_capsule_specification.md)
- [Document 11 — Security Architecture](11_security_architecture.md)
- [Existing requirements baseline](PRODUCT-REQUIREMENTS.md)
- [Current project memory](../CONTEXT.md)
