# Context Capsule — Database Design

**Document ID:** 08  
**Status:** Draft  
**Phase:** 2 — Engineering  
**Depends on:** Documents 02, 06–07, 10–11  
**Purpose:** Define local and optional cloud data models, integrity rules, authorization boundaries, retention, and recovery strategy.

## 1. Data design principles

- Local IndexedDB is authoritative for 1A; the cloud is never a precondition for capsule use.
- Canonical capsule data is versioned JSON validated by Document 10’s schema.
- Store the smallest amount of sensitive data necessary; raw source excerpt is optional and excluded from default cloud sync.
- Cloud rows are owner-scoped and protected by database-enforced row-level security, not only UI filtering.
- Audit/operational data must be non-content metadata; no prompt/transcript logging.

## 2. Data model overview

```text
Browser local (1A)
  Capsule ──< LocalOperation
      └──< LocalRevision / undo metadata
  Settings

Cloud (1B)
  auth.users ──1:1── profiles
       └──1:*── capsules
       └──1:*── capsule_sync_events (non-content)
```

The canonical capsule payload remains a single validated envelope rather than being prematurely decomposed into many relational child tables. This supports versioned portability, atomic synchronization, and an evolving structured format. Searchable display metadata is duplicated in safe indexed columns only where it improves a defined query.

## 3. Local IndexedDB schema

| Store | Key / indexes | Required fields | Purpose |
| --- | --- | --- | --- |
| `capsules` | `id`; indexes `updatedAt`, `titleNormalized`, `source.provider`, `sync.state` | canonical capsule, local revision, sync state, deletedAt? | Primary local library. |
| `operations` | `operationId`; indexes `capsuleId`, `status`, `createdAt` | type, payload hash/reference, retry count, idempotency key | Durable optional sync queue. |
| `drafts` | `draftId`; index `updatedAt` | temporary editor/capture state, expiry | Recover accidental view closure; never cloud-sync. |
| `settings` | key | small preference/consent values | Local user preferences, not capsule data. |
| `diagnostics` | eventId; indexes `createdAt`, `code` | provider/adapter/version/error code only | User-consented local troubleshooting; expiring. |

Local operations use a transaction whenever a capsule and its sync operation/status change together. Deleted capsules retain a temporary tombstone only for undo/sync reconciliation, then are purged on a bounded schedule.

**What database version 1 actually creates (2026-08-04).** The table above is the target schema. Version 1, in `apps/extension/src/storage/database.ts`, creates the `capsules` store and nothing else, with no secondary indexes. The difference is deliberate and is tracked in `CONTEXT.md` under Technical debt rather than left as a silent gap:

| Specified | In version 1 | Reason |
| --- | --- | --- |
| `operations` store | Absent | The optional 1B sync queue. 1B is not open, and `EXECUTION_RULES.md` §2 forbids building it as groundwork |
| `drafts`, `settings` stores | Absent | Arrive with the editor and options UI in Milestone 1b |
| `diagnostics` store | Absent | Only exists once a user has consented to it |
| `updatedAt`, `titleNormalized`, `source.provider` indexes | Absent | §2 above permits indexed metadata "where it improves a defined query". There is no such query: library search and sort are pure functions over summaries in `capsule-core/src/library.ts`, sized against the 500-capsule target in [Document 12 §7](12_testing_strategy.md). Every index costs write time on every save and has to be migrated |
| `sync.state` index and the record's sync state field | Absent | Same reason as `operations` |

An empty store that nothing writes is schema surface to migrate later for no present benefit. Each is added by the milestone that gives it a reader, under a database version bump with an upgrade branch.

The record shape in version 1 is `{ capsule, revision, deletedAt }`, keyed in-line on `capsule.id`. The key is read out of the envelope rather than duplicated into a sibling field, because a duplicated key is a second source of truth that can drift from the capsule it describes.

## 4. Optional cloud schema (1B)

### 4.1 Entities

| Table | Key fields | Rules |
| --- | --- | --- |
| `profiles` | `user_id` FK auth user, `created_at` | Minimal account metadata; no provider chat identity. |
| `capsules` | `id`, `owner_id`, `schema_version`, `payload`, `payload_hash`, `created_at`, `updated_at`, `deleted_at?` | One canonical envelope per owner/capsule; payload size capped; source excerpt excluded unless explicit future policy permits. |
| `capsule_sync_events` | `id`, `owner_id`, `capsule_id`, `operation_id`, `event_type`, `occurred_at` | Non-content audit of sync lifecycle; retention limited. |
| `consents` | `id`, `owner_id`, `kind`, `version`, `granted_at`, `revoked_at` | Sync/analytics/smart-service consent versioning; no content. |

`attachments`, `shares`, `teams`, `memberships`, `payments`, and full-text/vector tables are intentionally absent from V1. Do not create empty schema for speculative features.

### 4.2 Relationships and authorization

```text
auth.users (1) ─── (1) profiles
auth.users (1) ─── (*) capsules
auth.users (1) ─── (*) capsule_sync_events
auth.users (1) ─── (*) consents
```

Every cloud table that contains user-specific data has an `owner_id` or user key. RLS policies require `auth.uid() = owner_id` for select/insert/update/delete. Service-role credentials are server-only and are not embedded in dashboard or extension code. Any future administrative support access needs a separate, approved, auditable design; it is not assumed.

### 4.3 Indexes and constraints

- `capsules(owner_id, updated_at desc)` supports library list/sync pull.
- `capsules(owner_id, id)` unique primary ownership lookup.
- `capsules(owner_id, payload_hash)` supports idempotence/duplicate diagnosis without content indexing.
- `capsule_sync_events(owner_id, occurred_at desc)` supports user-visible sync history if later approved.
- Check schema version format, timestamp order, payload JSON object, and payload byte-size limit.
- Update timestamp is server-validated; client timestamps remain part of conflict metadata rather than trusted authorization data.

## 5. Versioning, conflicts, and deletion

Each canonical capsule has `schemaVersion`, stable UUID, `createdAt`, `updatedAt`, and a monotonic application revision/ETag. Sync operation includes its base revision and idempotency ID.

Conflict policy: if remote is newer and local canonical content differs from the local operation’s base revision, preserve the local edit as `Conflicted copy — <title>` with source metadata indicating the conflict. Present both for explicit user review. Last-write-wins is acceptable only after this preservation step.

Local delete: soft delete for ten-second undo, then permanent local purge. Cloud delete: explicit confirmation, server tombstone/operation until all known sync acknowledgements or a bounded retention window, then purge. The exact retention duration must be approved with privacy policy before 1B.

## 6. Backups, recovery, and retention

- Local recovery is user-controlled JSON/Markdown export. The product must not promise browser-profile recovery after browser data is cleared.
- Supabase managed backups/PITR configuration, region, recovery objectives, and retention are recorded in Document 13 before 1B launch.
- Cloud data export and account deletion paths must be specified before public sync release.
- Drafts expire automatically after 24 hours or on explicit discard. Non-content diagnostics expire after 30 days locally unless support export is chosen.
- Raw source excerpts are retained only when the user chose them; default sync policy excludes them.

## 7. Data flow and edge cases

| Case | Data behavior |
| --- | --- |
| Invalid imported JSON | No write to `capsules`; parse result remains ephemeral. |
| Browser storage quota | Abort transaction; preserve prior data; offer export/retry. |
| Reinstall/browser clear | Local data may be lost; synced data remains only if user had opted in. |
| Same capsule imported twice | New local copy or explicit duplicate detection; never silently overwrite existing edited capsule. |
| Sync retry after timeout | Reuse idempotency key; server applies once. |
| Account sign-out | Clear auth/session cache; retain local-only data and mark prior synced data according to approved UX. |
| Schema migration | Create backup/export opportunity, migrate transactionally, leave unreadable records untouched with recovery message. |
| Stored record fails validation on read | Never returned as a capsule and never rewritten with a guess. Excluded from the library list so one bad record cannot break the whole library, reported by `get` as `corrupt_record`, listed for recovery by `listUnreadable`, repairable by saving over it (the revision count continues rather than restarting), and removable by `purge`. The scheduled purge never touches one: a deletion timestamp that cannot be read is an undo window that cannot be evaluated. |

## 8. Security, alternatives, and implementation notes

Encrypt data in transit through managed TLS and rely on platform encryption at rest; application-layer encryption is not assumed because it changes search/recovery/support requirements and needs a separate key-management design. Do not mistake encryption at rest for permission design: RLS and minimal data collection remain mandatory.

Alternative: normalize decisions/tasks/files into relational tables. Rejected initially because the canonical unit is a portable capsule envelope and cross-version codec simplicity matters more than analytical queries. Alternative: sync raw transcripts by default. Rejected for privacy and product-scope reasons. Alternative: use browser sync storage as the library database. Rejected for capacity, query, and portability limitations.

## 9. Acceptance criteria and self-review

- 1A data survives extension service-worker lifecycle and works offline without cloud tables.
- Cloud design enforces owner isolation at database level and supports idempotent sync/conflict preservation.
- Data categories, retention, backups, deletion, and source-excerpt policy are explicit.
- No speculative team/attachment/search tables introduce hidden scope.
- Schema detail remains aligned with Document 10 and security controls with Document 11.

Self-review: the design favors portable canonical data, local durability, and narrow optional cloud responsibilities without losing a clear path to recovery.

## 10. References

- [Document 06 — System Architecture](06_system_architecture.md)
- [Document 09 — API Specification](09_api_specification.md)
- [Document 10 — Capsule Specification](10_capsule_specification.md)
- [Document 11 — Security Architecture](11_security_architecture.md)
- [Document 13 — Deployment Strategy](13_deployment_strategy.md)
- [Document 19 — Release Checklist](19_release_checklist.md)
