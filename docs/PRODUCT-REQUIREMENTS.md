# Context Capsule — Product Requirements (V1)

## 1. Product decision

**Problem.** AI users lose time and make mistakes when moving work between chat tools: important objectives, choices, constraints, code references, and next steps must be manually re-explained.

**V1 outcome.** A user can capture the active conversation as a compact, editable capsule and insert that capsule into a new ChatGPT, Claude, or Gemini conversation. The capsule must preserve enough context for the next assistant to continue productively.

**Success statement.** A first-time user can install the extension, create a capsule from a supported chat, import it into a different supported chat, and send it in less than five minutes without reading long documentation.

### 1.1 Target users

1. Individual AI power users who move between chat providers after limits, outages, or model changes.
2. Developers transferring project work between coding and general-purpose AI chats.
3. Researchers and students moving a bounded research thread between providers.

V1 is not a team knowledge base or a conversation backup product.

### 1.2 Product principles

- Complete the small workflow before adding adjacent features.
- Make data handling obvious: show what will leave the page and what will be stored.
- Prefer reviewable structured context over opaque summaries.
- Never silently alter a user’s draft or send a message on their behalf.
- Keep the basic workflow useful without an account or an AI API key.

## 2. Scope

### 2.1 Included in V1

| Area | Requirement |
| --- | --- |
| Browser | Chromium Chrome extension using Manifest V3; package suitable for Chrome Web Store submission. |
| Supported sites | ChatGPT, Claude, and Gemini web apps only. Each uses an isolated site adapter. |
| Create | Extract a user-selected conversation from the open supported site, build an editable capsule, save locally, and optionally sync it. |
| Capsule content | Project/subject, goal, current state, decisions, constraints, completed work, files/references, pending tasks, open questions, prompt/history excerpt, source metadata, and timestamps. |
| Import | Choose a local, dashboard, JSON, Markdown, or pasted capsule; render a context prompt; insert it into the target chat composer without sending it. |
| Export | Copy context prompt, download `.context-capsule.json`, and download a readable `.md`. |
| Library | Extension and dashboard list, search by title, rename, duplicate, delete (with undo), and export capsules. |
| Identity/sync | Anonymous local use; optional Supabase email magic-link or Google sign-in to sync only user-approved capsules. |
| Summarization | Deterministic extraction is always available. Optional AI summarization is opt-in and requires a configured provider/API key or separately approved hosted service. |
| Accessibility | Keyboard reachable controls, visible focus, labeled icons, semantic status messages, and contrast meeting WCAG AA for core screens. |

### 2.2 Explicitly excluded from V1

- Team sharing, permissions, public links, or collaboration.
- Payments, usage billing, referral systems, and subscriptions.
- AI routing, model recommendations, vector search, a knowledge graph, or automatic memory.
- GitHub, Notion, Google Drive, MCP, and file-system integrations.
- Mobile apps, desktop apps, Firefox/Edge packaging, and non-web AI clients.
- Automatic interception of a provider’s “limit reached” UI.
- A promise to reproduce an entire chat or transfer provider-specific tools/attachments.

## 3. Core user journeys

### Journey A — Create and continue elsewhere

1. User opens a supported conversation and clicks the Capsule icon injected near the composer.
2. Extension confirms the detected source and lets the user choose **Quick capsule** or **Smart capsule**.
3. The create view shows the extracted conversation count and the proposed structured capsule. The user can edit every field and exclude sensitive text before saving.
4. User saves locally, optionally signs in/syncs, then selects **Open import** or downloads the capsule.
5. On a supported target AI chat, user clicks Capsule, selects the capsule, chooses *Compact* or *Full*, and clicks **Insert context**.
6. Extension writes the generated context into the composer, preserving any existing draft beneath a divider. It does not click Send.

### Journey B — Import a file received from another device

1. User opens the extension or dashboard and selects **Import capsule**.
2. They drag in a `.context-capsule.json`, `.md`, or paste capsule text.
3. The importer validates format and shows a preview; malformed or untrusted fields are never executed as HTML.
4. User corrects title/fields if needed, saves, and imports it into a supported chat as in Journey A.

### Journey C — Manage library

1. User opens the dashboard or extension library.
2. They see title, source, last updated, sync status, and current task (if provided).
3. They can search, rename, duplicate, delete, export, or open an import flow.
4. Delete is reversible for 10 seconds locally; synced deletion is confirmed before propagation.

## 4. Functional requirements and acceptance criteria

### FR-1: Supported-site detection and UI

- The content script must activate only on allow-listed ChatGPT, Claude, and Gemini domains.
- It must detect the currently available composer with a site-specific adapter and inject one accessible Capsule control without obscuring native controls.
- If a DOM change makes an adapter unavailable, show “This page layout is not supported yet” with a copy/export alternative; do not break the host site.

**Acceptance:** On each supported site’s current new-chat and active-chat pages, opening and closing Capsule works with a mouse and keyboard and the host composer remains usable.

### FR-2: Conversation extraction

- Extract visible user and assistant turns, ordering, source URL, title when available, and extraction time.
- Display turn count and a preview before processing.
- User can remove individual turns or cancel before saving.
- Raw transcript is not synced by default. It may be included locally only when the user selects “Keep source excerpt.”

**Acceptance:** Given a chat with at least two visible turns, create flow produces a preview with correct chronological order and source metadata. No data is persisted if the user cancels.

### FR-3: Capsule creation and editing

- A capsule must have a user-editable title and `goal`, `currentState`, `nextActions`, and `source` values; other fields are optional arrays/text.
- Quick mode creates a reviewable draft from source metadata and selected turns, retaining a bounded excerpt rather than pretending to infer a summary.
- Smart mode may call only the selected, opt-in configured summarizer; it returns a strict structured draft and must preserve user edits on retry.
- Required-field validation must identify missing values before save.

**Acceptance:** User can change every displayed field, save a valid capsule locally, reopen it, and see the same values. A failed summarization leaves the editable quick draft intact.

### FR-4: Format, export, and import

- Canonical file extension: `.context-capsule.json`; MIME type `application/vnd.context-capsule+json` where supported.
- Markdown export must be human-readable and contain the schema version and source disclaimer.
- JSON importer supports only the published schema version; unknown fields are preserved in `extensions` when safe.
- Markdown/paste importer maps recognized headings, then marks uncertain mappings for user review.
- Limit imported files to 1 MB and reject invalid JSON, unsafe filenames, and unsupported schema versions with actionable errors.

**Acceptance:** A capsule exported to JSON can be imported into a clean browser profile with equivalent canonical fields. Markdown exports display correctly as plain text and re-import with review.

### FR-5: Context prompt generation and insertion

- Generator offers **Compact** (target 2,500 tokens maximum) and **Full** (target 7,000 tokens maximum) modes; show an approximate token/character count before insertion.
- Prompt has a stable directive: treat capsule as user-provided working context, honor constraints and decisions, ask questions where information is missing, and continue from next actions.
- Existing composer text must be preserved after `--- User draft ---`; if no draft exists, insert only the capsule prompt.
- Insert must use the target site’s supported input/event path and never auto-submit.

**Acceptance:** In every supported provider, selecting a capsule inserts visible editable text into the native composer. The Send action remains solely the user’s choice.

### FR-6: Local library and optional sync

- Use IndexedDB as the local source of truth. All create/import/edit/delete operations work offline.
- Dashboard and extension share local data through extension APIs; dashboard sync requires sign-in.
- Sync only canonical capsule data that the user has chosen to sync. Show pending/synced/error state and a retry action.
- Conflict policy: last-write-wins based on `updatedAt`; before overwriting a locally changed capsule, show a conflict copy named “Conflicted copy — <title>”.

**Acceptance:** With no network, a user can create, edit, export, and import a capsule. When a signed-in user returns online, a queued sync completes or reports a retryable error without data loss.

### FR-7: Dashboard and authentication

- Dashboard provides sign-in, library, capsule editor/preview, import/export, and account sign-out only.
- Do not require an account for extension creation/export/import.
- Auth uses Supabase Auth; enforce row-level security so a user can access only their own capsule records and objects.

**Acceptance:** An unauthenticated dashboard visitor is redirected to sign-in. Authenticated User A cannot retrieve User B’s capsules through UI or direct API requests.

## 5. UX requirements

### Extension surfaces

| Surface | Required content/actions |
| --- | --- |
| Injected Capsule popover | Source status, Create capsule, Import/insert capsule, recent capsules, link to library, privacy link. |
| Create review | Title, detected source, included turns/excerpt, structured fields, mode selector, save local, optional sync. |
| Insert view | Search/select capsule, compact/full selector, preview/count, Insert context, Copy instead. |
| Settings | Optional account connection, optional provider configuration, clear local data, version/support information. |

### Dashboard screens

| Screen | Required content/actions |
| --- | --- |
| Sign-in | Google and email magic-link sign-in; transparent privacy statement. |
| Capsule library | Search, sort by last updated, capsule cards/list, sync status, new/import actions. |
| Capsule detail | Read/edit canonical fields, context preview, duplicate, delete, JSON/Markdown export. |
| Import | Drop zone, browse, paste tab, validation result, editable preview, save. |

### Interaction standards

- Every asynchronous action has immediate feedback and a clear success/error outcome.
- Destructive actions require confirmation except undoable local delete.
- Never hide core actions behind an unlabeled icon-only control.
- UI copy must say “Insert context” rather than “Continue conversation,” because exact continuation cannot be guaranteed across providers.
- Empty states explain the next action in one sentence.

## 6. Capsule contract

Canonical V1 JSON shape:

```json
{
  "schemaVersion": "1.0",
  "id": "uuid",
  "title": "VisionX dashboard handoff",
  "goal": "Finish the dashboard authentication flow.",
  "currentState": "API and database are complete; UI auth is pending.",
  "decisions": ["Use React, TypeScript, Supabase, and FastAPI."],
  "constraints": ["Do not change routing.", "Use free-tier services."],
  "completed": ["Login API", "Database schema"],
  "files": [{ "path": "src/pages/Dashboard.tsx", "note": "Current work area" }],
  "pendingTasks": ["Build authenticated dashboard UI"],
  "openQuestions": [],
  "source": {
    "provider": "chatgpt",
    "conversationUrl": "https://…",
    "capturedAt": "2026-07-29T00:00:00.000Z"
  },
  "sourceExcerpt": null,
  "createdAt": "2026-07-29T00:00:00.000Z",
  "updatedAt": "2026-07-29T00:00:00.000Z",
  "extensions": {}
}
```

Never place API keys, authentication cookies, browser session data, or unredacted sensitive text in a capsule. Before save/export, display this reminder beside the source excerpt setting.

## 7. Non-functional requirements

### Privacy and security

- Request the minimum Chrome permissions and host permissions only for supported sites.
- No conversation content may leave the browser without a user-initiated operation and visible destination.
- Store optional provider API keys in `chrome.storage.local`, never in Supabase or an application database; clearly warn that browser-profile access is required to use them.
- Sanitize imported content and render it as text/Markdown with no raw HTML execution.
- Log operational events without conversation text, capsule content, URLs with sensitive query values, or API keys.

### Reliability and performance

- Extension popover opens within 500 ms on an idle supported tab.
- Library can list 500 local capsules with search returning in under 200 ms on a typical laptop.
- A 200-turn visible conversation must either create a preview in 5 seconds or report a recoverable extraction limit; it must never freeze the page.
- Treat provider DOM adapters as feature-flagged modules and include fixture-based regression tests for each.

### Quality

- TypeScript strict mode; no ignored compiler errors.
- Unit tests for schema validation, Markdown mapping, prompt generation, merge/conflict policy, and each adapter parser.
- Playwright end-to-end tests with local fixtures for create, export/import round trip, composer insertion, and offline local save.
- Lint, typecheck, tests, and production builds must pass before a release or merge to main.

### Analytics (privacy-preserving)

Collect only opt-in aggregate events: extension installed, create started/completed, import started/completed, insertion completed, export completed, and adapter failure code. Do not collect prompt or capsule text. Analytics is disabled by default until a privacy policy and consent copy are approved.

## 8. Success metrics and launch gates

Measure post-launch only after consent implementation:

- Activation: percentage of installers who create and insert one capsule within 24 hours.
- Completion: percentage of started create/import flows that finish without error.
- Time to first successful transfer: median under five minutes.
- Reliability: supported-site adapter success above 95% for tested layouts.
- Satisfaction: in-product one-question survey after the second transfer; target 4/5 or higher.

V1 launch is blocked until all acceptance criteria above pass, critical privacy/security findings are resolved, supported-site smoke tests pass on current Chrome, user documentation is complete, and the extension package has been manually tested in a clean Chrome profile.

## 9. Product decisions that require an explicit follow-up before launch

1. Which smart-summarization model/provider will be offered, if any? The free core must not imply free AI summarization.
2. Will sync ship in the first public build or as a marked beta? Local-only mode can launch independently.
3. What legal entity, privacy policy, support contact, and Chrome Web Store developer account will publish the product?

Until those are decided, implementation can complete all local-first V1 functionality and use disabled/behind-feature-flag integration points for cloud features.
