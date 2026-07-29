# Context Capsule — Capsule Specification

**Document ID:** 10  
**Status:** Draft  
**Phase:** 2 — Engineering  
**Depends on:** Documents 02, 06, 08–09, 11  
**Purpose:** Define the portable, versioned Context Capsule format, its JSON and Markdown representations, compatibility, integrity, and privacy rules.

## 1. Design goals and non-goals

A capsule is a user-reviewable structured handoff for active work. It must be portable, readable without the product, safe to import, bounded for AI context use, and clear about uncertainty/source coverage.

It is not a complete chat archive, cryptographic proof of a conversation, a universal prompt format, a file-transfer mechanism, or a guarantee that another AI will recreate the original model’s state.

## 2. Canonical envelope

The canonical representation is JSON with media type `application/vnd.context-capsule+json` and conventional file extension `.context-capsule.json`. Schema version 1 uses `schemaVersion: "1.0"`.

```json
{
  "schemaVersion": "1.0",
  "id": "bd5d4d75-8cab-4f70-91d8-77bb7d3f5a81",
  "title": "VisionX dashboard handoff",
  "subject": "VisionX SaaS dashboard",
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
    "conversationUrl": "https://chatgpt.com/c/…",
    "capturedAt": "2026-07-29T00:00:00.000Z",
    "visibleTurnCount": 18,
    "excerptStatus": "not_included"
  },
  "sourceExcerpt": null,
  "tags": ["coding", "dashboard"],
  "createdAt": "2026-07-29T00:00:00.000Z",
  "updatedAt": "2026-07-29T00:00:00.000Z",
  "extensions": {}
}
```

## 3. Field contract

| Field | Type / required | Rules |
| --- | --- | --- |
| `schemaVersion` | string, required | Semantic major.minor; parser supports 1.x according to compatibility policy. |
| `id` | UUID, required | Stable capsule identity; never provider conversation ID. |
| `title` | string, required | 1–160 visible characters after trim. |
| `subject` | string, optional | Short project/topic context. |
| `goal` | string, required | User-readable desired outcome; 1–2,000 chars. |
| `currentState` | string, required | Accurate current status, including uncertainty; 1–4,000 chars. |
| `decisions`, `constraints`, `completed`, `pendingTasks`, `openQuestions` | string arrays | Each item trimmed/nonempty; bounded counts/lengths. `pendingTasks` requires at least one entry. |
| `files` | array of `{path, note?}` | Reference only; never reads/embeds local file data. Path is display text, not executable path. |
| `source` | object, required | Provider enum/`other`, optional URL, capture time, visible count, excerpt status. |
| `sourceExcerpt` | structured text/turn array or null | Optional, user-selected, bounded, explicitly disclosed. |
| `tags` | string array | Optional local organization; no access-control meaning. |
| `createdAt`, `updatedAt` | RFC3339 UTC strings | `updatedAt >= createdAt`; regenerated on local edit. |
| `extensions` | object | Namespaced unknown safe data only; cannot override canonical fields. |

Provider enum: `chatgpt`, `claude`, `gemini`, `manual`, `imported`, `other`. This identifies capture source, not destination support or provider affiliation.

## 4. Validation and normalization

1. Parse JSON as data, not code; reject duplicate/conflicting top-level canonical keys.
2. Enforce maximum 1 MB import file, 256 KB cloud payload, and bounded per-field/list limits before rendering.
3. Normalize line endings to LF, trim outer whitespace, preserve meaningful internal formatting, and Unicode-normalize to NFC.
4. Reject control characters except standard whitespace; render all values as text/escaped Markdown.
5. Validate UUID/timestamps/provider and source/excerpt consistency.
6. Require `goal`, `currentState`, and one `pendingTask` on save; importer may keep an incomplete review draft but never falsely mark it valid.
7. Preserve unknown safe fields only under `extensions.<reverse-domain-or-vendor-key>`; reject unknown root fields in strict mode or move them to a reviewable extension area in compatibility mode.

## 5. Source excerpt and attachments

### Source excerpt

`source.excerptStatus` is one of `not_included`, `user_selected`, `truncated`, or `manual_summary`. If `sourceExcerpt` exists, status cannot be `not_included`; source must disclose visible turn count and capture time. Excerpts may contain personal/sensitive data, so they are collapsed in UI, excluded from default sync, and clearly marked in exports.

### Attachments

Attachments are **not supported in 1A/1B**. The schema does not define an attachment payload or storage reference. Product UI must not show attachments as transferred. A future major/minor extension may define an `extensions.attachments` namespace only after separate threat model, storage, retention, scanning, and consent design.

## 6. Markdown export and import

Markdown is a readable interchange form with a front matter-like header and stable headings. It is intended for review/copy/paste and best-effort re-import; JSON is the lossless canonical format.

```markdown
# Context Capsule: VisionX dashboard handoff

Schema Version: 1.0
Source: ChatGPT; captured 2026-07-29T00:00:00.000Z
Source Excerpt: Not included

## Goal
Finish the dashboard authentication flow.

## Current State
API and database are complete; UI auth is pending.

## Important Decisions
- Use React, TypeScript, Supabase, and FastAPI.

## Constraints
- Do not change routing.

## Completed
- Login API

## Files and References
- `src/pages/Dashboard.tsx` — Current work area

## Pending Tasks
- Build authenticated dashboard UI

## Open Questions
- None recorded.
```

Markdown importer recognizes the stable headings and list conventions case-insensitively. Missing/ambiguous headings become a review warning; raw HTML is treated as text, never executed. Unknown sections are offered as note/extension candidates rather than silently discarded.

## 7. Context prompt projection

`Capsule → prompt` is a projection, not the canonical capsule. It begins with a fixed handoff directive, then goal, state, decisions, constraints, completed work, files/references, pending tasks, and open questions. Source/excerpt disclosure is included when relevant.

Compact mode uses required fields and highest-priority/newest list entries within target budget (2,500 estimated tokens). Full mode uses all canonical fields within 7,000 estimated tokens. If projection excludes material data, it names omitted section/count. Existing destination draft is appended after `--- User draft ---` by the insertion feature, never written back into the capsule.

## 8. Versioning, compatibility, and migration

- Patch/minor additions that preserve all existing meaning are compatible within major version where parsers ignore/preserve known-safe extension data.
- Removal/renaming/semantic change of a required canonical field requires a new major version.
- Exporter emits the newest approved schema only after migration; importer supports N and N-1 major versions for a documented period.
- Unknown future major versions are not imported as valid capsules. Offer raw download/view and clear version error.
- Migration is transactional locally; retain original export/backup opportunity before destructive transformation.

## 9. Compression and integrity

Do not compress 1A JSON/Markdown files: readability, inspectability, and small size outweigh bandwidth. If future transport compression is added, use standard HTTP transport encoding or an explicitly labeled `.capsule.gz`, never hidden compressed JSON.

Integrity measures:

- Schema validation and field bounds on every ingress/egress.
- Optional SHA-256 payload hash for sync idempotency/corruption detection, stored as metadata—not as a signature of truth.
- Download/import round-trip tests.
- No claim of cryptographic provenance: capsules are user-editable documents. Digital signatures are future-only and require key/identity design.

## 10. Privacy and security requirements

- Never include API keys, cookies, browser/session tokens, hidden system prompts, or local file contents.
- URL query fragments that may contain sensitive values are redacted by default before export; source URL is optional.
- Render imported content through escaped Markdown/text, defend against resource exhaustion, and disallow executable URI/HTML behavior.
- Smart-draft metadata must record only approved provider/model/disposition information, never secret credentials.

## 11. Edge cases, alternatives, and implementation notes

| Case | Required behavior |
| --- | --- |
| Empty current state from manual capture | Keep draft invalid and explain required completion. |
| Provider has no stable title/URL | Use `manual`/provider source with missing value; do not invent it. |
| Duplicate IDs from import | Offer duplicate/new local identity; do not overwrite a different local capsule. |
| `sourceExcerpt` too large | Require user selection/truncation and mark `truncated`. |
| Rich source formatting | Preserve readable text/code blocks where safe; no embedded interactive content. |

Alternative: YAML as canonical format. Rejected because implicit types/edge cases make safe parsing less predictable for general users. Alternative: proprietary binary capsule. Rejected because it undermines portability/review. Alternative: transcript-only capsule. Rejected because it omits structured decisions and fails token efficiency.

Implementation notes: use a single schema package to generate TypeScript types, runtime validators, JSON codecs, Markdown mapping, fixtures, and tests. All apps must import it; no duplicate shape definitions.

## 12. Acceptance criteria and self-review

- A valid JSON export round-trips through clean-profile import with equivalent canonical data.
- Markdown is human-readable, honest about excerpt status, and imports through a review path.
- Incomplete/manual content cannot masquerade as a valid handoff.
- Versioning, size, safe rendering, extensions, source disclosure, and unsupported attachments are explicit.

Self-review: the contract supports bounded trustworthy transfer without pretending to preserve an entire provider conversation.

## 13. References

- [Document 02 — PRD](02_product_requirements_document.md)
- [Document 08 — Database Design](08_database_design.md)
- [Document 09 — API Specification](09_api_specification.md)
- [Document 11 — Security Architecture](11_security_architecture.md)
- [Document 12 — Testing Strategy](12_testing_strategy.md)
- [Document 23 — Known Limitations](23_known_limitations.md)
