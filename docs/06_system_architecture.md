# Context Capsule — System Architecture

**Document ID:** 06  
**Status:** Draft  
**Phase:** 2 — Engineering  
**Depends on:** Documents 01–05  
**Purpose:** Define the system boundaries, component responsibilities, data flows, and non-functional architecture for the Core Transfer MVP and gated optional services.

## 1. Architectural decisions

| Decision | Rationale | Consequence |
| --- | --- | --- |
| Local-first extension is the system of record for 1A | Core works privately/offline and does not depend on backend availability | IndexedDB and extension messaging are mandatory; dashboard is not a dependency. |
| Provider adapters are isolated modules | Provider DOM changes must not destabilize core data/library behavior | Each supported site owns selectors, parsing, and insertion implementation. |
| Canonical capsule is versioned structured data | Export/import and future compatibility need an explicit contract | Document 10 schema validation gates all reads/writes. |
| Optional sync is an additive 1B service | Avoid cloud complexity blocking core launch | Extension queue/repository abstracts sync behind a capability flag. |
| Optional smart drafting is an external boundary | AI summarization has cost, privacy, and availability implications | No model call in 1A; only a consented interface in 1C. |

## 2. System context

```text
User
 ├─ Chrome + Context Capsule extension
 │   ├─ Supported web AI page (ChatGPT / Claude / Gemini)
 │   ├─ Local IndexedDB capsule library
 │   └─ Optional browser-local provider configuration
 ├─ Optional Context Capsule dashboard (1B)
 └─ Optional external summarization provider (1C)

Extension ── optional authenticated sync ── Supabase Auth + Postgres
Dashboard ── optional authenticated sync ── Supabase Auth + Postgres
```

The source/target AI websites are host pages, not backend integrations. The extension reads visible user-approved DOM text and writes only to the native composer through a user-initiated insertion action. It does not call provider private APIs, inspect cookies, or simulate sending.

## 3. Logical component architecture

```text
apps/extension
  Content layer ─ Provider adapter ─ Host DOM
         │ typed messages
  Service worker / application coordinator
   ├─ Capsule repository ─ IndexedDB
   ├─ Schema + codec + prompt composer
   ├─ Import/export and local settings
   └─ Optional sync / smart-draft clients
         │
apps/dashboard (1B) ─ shared schema/client ─ Supabase
```

| Component | Responsibility | Must not do |
| --- | --- | --- |
| Provider adapter | Detect page capability, extract visible turns/meta, locate composer, perform controlled insertion | Store capsules, own business rules, call cloud services |
| Content UI | Render in-page Capsule control and pass user choices | Persist raw content independently or expose extension internals to host page |
| Service worker/coordinator | Validate messages, coordinate capture/edit/insert, manage lifecycle | Depend on a long-lived in-memory state |
| Capsule core | Validate schema, create drafts, compose prompts, codec/import/export, redaction helpers | Know provider DOM selectors |
| Local repository | Transactional local persistence, search/query, undo metadata, sync queue | Make authorization decisions |
| Sync client (1B) | Authenticated replication/conflict handling | Become source of truth for 1A |
| Dashboard (1B) | Authenticated synced-library UI | Access browser-local unsynced capsules |
| Smart-draft client (1C) | Consent-gated proposal generation and result validation | Save, export, insert, or send content autonomously |

## 4. Primary data flows

### 4.1 Capture and local save

```text
User click → content UI → adapter extracts visible turns
  → coordinator validates message / creates review draft
  → user edits and saves → schema validation
  → IndexedDB transaction writes capsule + local metadata
  → UI confirms local save
```

No content leaves the browser in this flow. Temporary capture state remains in extension context/session memory until saved or cancelled; it is discarded on cancellation.

### 4.2 Insert

```text
User chooses capsule/mode → repository reads canonical capsule
  → prompt composer applies token budget and truncation disclosure
  → adapter finds native composer and writes text using site-safe event path
  → UI reports inserted / Copy fallback
```

The adapter returns only result metadata. It must not activate Send or report that the recipient model read/understood the content.

### 4.3 Optional sync (1B)

```text
Local save/edit/delete → append durable operation to local queue
  → authenticated sync client sends canonical payload + version metadata
  → server enforces owner RLS → acknowledgement
  → local state becomes synced or retry/conflict state
```

Remote data never overwrites an unsynced local edit silently. A conflict creates a local copy and requires visible resolution.

### 4.4 Optional smart proposal (1C)

```text
User selects approved turns → consent screen names destination/model
  → selected text sent to approved provider/hosted endpoint
  → response parsed/validated as CapsuleDraft
  → user reviews proposal → local save only after explicit action
```

## 5. State management and consistency

| State | Location | Durability | Rule |
| --- | --- | --- | --- |
| Host capability / DOM references | Content script | Ephemeral | Recompute after navigation/mutation; never persist DOM references. |
| Open capture/editor draft | Extension UI/session | Temporary | Preserve while view is open; discard on explicit cancel. |
| Canonical capsule | IndexedDB | Durable local | Validate on every write/read/import. |
| Library indexes / deletion undo | IndexedDB | Durable local | Derive listing from canonical data; expire undo safely. |
| Sync operation/status | IndexedDB | Durable local | Queue is idempotent and survives service-worker suspension. |
| Auth session | Chrome storage/session + Supabase client | Managed | Do not expose token to host page. |
| Smart provider key (if BYOK approved) | `chrome.storage.local` | Browser-profile local | Never persist in capsule, IndexedDB export, or cloud DB. |

Use immutable capsule revisions in application logic: create a new `updatedAt`/revision on every saved change, then persist atomically. A small derived index may accelerate search but is never the only representation of user data.

## 6. Authentication, authorization, and storage

1A has no account/auth dependency. In 1B, Supabase Auth identifies the user; Postgres row-level security authorizes all capsule rows by owner ID. The dashboard and extension use the same authenticated user, but only intentionally synced capsules reach cloud storage. The backend never receives browser cookie/session material from AI providers.

Storage layers:

- **Extension local:** IndexedDB canonical capsule data; browser-local settings and optional BYOK configuration.
- **Cloud 1B:** owner-scoped canonical capsule payload, minimal sync metadata, and non-content audit/security records.
- **No attachment storage in 1A/1B:** attachment tables/buckets are not created until an approved attachment feature has its own privacy/security design.

## 7. Offline, caching, performance, and scalability

### Offline

All 1A creation, editing, searching, import/export, copy, and target insertion work offline. Optional services display a local-only state and queue/retry behavior, never a blocking global error.

### Caching

- Cache no raw host content beyond a user’s explicit local saved capsule/excerpt choice.
- Cache static extension assets inside the packaged extension.
- Dashboard caches only authenticated metadata/content as permitted by browser policy; it must clear on sign-out.
- Do not cache smart-draft raw requests/responses outside the user’s saved draft.

### Performance budgets

- In-page control visible/openable in under 500ms on an idle supported page.
- Library query/search 500 local items in under 200ms on a typical laptop.
- Capture 200 visible turns in under five seconds or show a recoverable limit.
- Avoid whole-document mutation work; adapter observers inspect bounded relevant nodes and debounce changes.

### Scale posture

1A scales with the user’s local browser and has no central traffic bottleneck. 1B begins with a simple owner-scoped Postgres workload; rate limits, payload size bounds, and pagination protect it. Multi-user collaboration, global search, attachments, and high-volume analytics are not assumed by this architecture.

## 8. Failure handling and edge cases

| Failure | Architecture behavior |
| --- | --- |
| Service worker suspended | Durable local state and message correlation allow UI to rehydrate; do not rely on memory. |
| Adapter cannot parse page | Return typed unsupported result; core offers local library/copy/export. |
| Composer insertion fails | Preserve generated text in UI; allow Copy; record non-content diagnostic code. |
| IndexedDB quota/error | Stop save safely, explain local storage failure, allow immediate JSON download if possible. |
| Sync timeout/conflict | Retain local data/operation; retry with backoff; create conflicted copy rather than overwrite. |
| Schema mismatch | Reject/hold import/sync item with version message; never coerce unsafe data silently. |
| Smart provider failure | Preserve Quick Capture draft; do not delete user selection or claim summary succeeded. |

## 9. Alternatives and trade-offs

- **Backend-first SaaS:** rejected for 1A because account/network becomes a critical path and privacy burden increases.
- **One monolithic content script:** rejected because provider changes would threaten every product function.
- **Browser page-to-page direct messaging:** rejected because host pages are untrusted and extension isolation is needed.
- **Full transcript storage/sync:** rejected because it conflicts with bounded, reviewable handoff and increases retention risk.
- **Native provider APIs:** rejected for initial product because permissions/availability differ and the workflow should work from web-visible user content.

## 10. Implementation notes

Use TypeScript across extension, dashboard, and shared packages; validate all external/untrusted data at boundaries; use a message protocol with discriminated event types; use a worker-safe repository abstraction; and keep adapter packages independently testable with DOM fixtures. Specific library/version selection belongs to Document 14 after technical evaluation.

## 11. Acceptance criteria and self-review

- Every PRD feature maps to one responsible component and has a no-network 1A path where required.
- User content does not cross a trust boundary without a named user action.
- Adapter failure cannot corrupt the library or host page.
- Optional sync/smart features are additive, feature-gated, and not hidden dependencies.
- Data, API, capsule, security, and testing details are delegated to Documents 08–12.

Self-review: the architecture is small enough for a launchable MVP, contains explicit state and failure behavior, and preserves all product trust boundaries.

## 12. References

- [Document 02 — PRD](02_product_requirements_document.md)
- [Document 04 — User Experience](04_user_experience.md)
- [Document 07 — Browser Extension Architecture](07_browser_extension_architecture.md)
- [Document 08 — Database Design](08_database_design.md)
- [Document 09 — API Specification](09_api_specification.md)
- [Document 10 — Capsule Specification](10_capsule_specification.md)
- [Document 11 — Security Architecture](11_security_architecture.md)
- [Document 12 — Testing Strategy](12_testing_strategy.md)
