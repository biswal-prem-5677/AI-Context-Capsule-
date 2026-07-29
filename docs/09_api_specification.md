# Context Capsule — API Specification

**Document ID:** 09  
**Status:** Draft  
**Phase:** 2 — Engineering  
**Depends on:** Documents 06, 08, 10–11  
**Purpose:** Define the public service contract for optional 1B sync and 1C smart drafting. Core Transfer MVP (1A) has no network API requirement.

## 1. API scope and principles

The extension’s local repository is the 1A interface; there is no server API to create, read, or insert a local capsule. The APIs in this document are disabled until the respective feature gate is approved:

| API group | Slice | Purpose |
| --- | --- | --- |
| Sync | 1B | Owner-authorized replication of explicitly synced canonical capsules. |
| Account/data rights | 1B | Current-user metadata and account-data deletion request. |
| Smart draft | 1C | Consent-gated structured draft proposal only. |
| Diagnostics | Optional post-consent | Non-content health/report events. |

Base URL: `https://api.<approved-domain>/v1`. JSON request/response only, UTF-8, HTTPS only. API implementations may use Supabase Edge Functions/BFF infrastructure, but client code must rely on this contract rather than direct database access.

## 2. Shared conventions

### Authentication and authorization

- 1B/1C endpoints require `Authorization: Bearer <Supabase access token>` unless noted.
- The authenticated subject is the only authorized owner. Client-supplied owner IDs are ignored/rejected.
- Tokens, provider API keys, raw host cookies, and source DOM metadata beyond canonical payload are never accepted.

### Request headers

| Header | Required | Meaning |
| --- | --- | --- |
| `Authorization` | Authenticated endpoints | Bearer access token |
| `Content-Type` | JSON body | `application/json` |
| `Idempotency-Key` | Mutation/sync push | UUID generated per logical operation |
| `X-Client-Version` | Recommended | Extension/dashboard version for compatibility support |
| `X-Request-Id` | Optional | Client correlation ID; server returns one if absent |

### Envelope and error format

```json
{ "data": {}, "meta": { "requestId": "uuid" } }
```

```json
{
  "error": {
    "code": "CAPSULE_SCHEMA_UNSUPPORTED",
    "message": "Capsule schema version 2.0 is not supported.",
    "details": [{ "path": "schemaVersion", "reason": "unsupported" }],
    "requestId": "uuid"
  }
}
```

Standard status codes: `400` validation, `401` missing/invalid auth, `403` owner/consent forbidden, `404` no owner-visible resource, `409` revision/idempotency conflict, `413` payload too large, `422` semantic validation, `429` rate limit, `500` unexpected server error, `503` temporarily unavailable. Errors must not echo capsule content.

### Versioning and limits

- API major version is path-based (`/v1`). Breaking changes require `/v2` and a documented migration window.
- Canonical payload is limited to 1 MB on import and 256 KB per cloud sync operation unless revised by Document 10/13 approval.
- Default list limit is 50, maximum 100. Cursor pagination is opaque.
- Rate limits are per authenticated user and endpoint; response includes `Retry-After` for `429`.

## 3. Sync endpoints (1B)

### `GET /v1/capsules`

Returns a paginated owner-scoped list of synced capsules or lightweight list metadata.

Query: `cursor?`, `limit?` (1–100), `updatedSince?` RFC3339, `includePayload?` default `false`.

**200 example**

```json
{
  "data": {
    "items": [{
      "id": "bd5d4d75-8cab-4f70-91d8-77bb7d3f5a81",
      "title": "VisionX dashboard handoff",
      "sourceProvider": "chatgpt",
      "schemaVersion": "1.0",
      "revision": 7,
      "updatedAt": "2026-07-29T15:10:00Z"
    }],
    "nextCursor": null
  },
  "meta": { "requestId": "…" }
}
```

### `GET /v1/capsules/{capsuleId}`

Returns one canonical owner-visible synced capsule. `404` is returned for nonexistent and other-user IDs alike.

### `PUT /v1/capsules/{capsuleId}`

Creates or replaces one explicitly synced capsule. The URL UUID must equal `capsule.id`; request includes `baseRevision` (null on first create) and canonical `capsule` envelope. Server validates schema, owner, payload size, and revision.

**Request example**

```json
{
  "baseRevision": 6,
  "capsule": { "schemaVersion": "1.0", "id": "bd5d4d75-8cab-4f70-91d8-77bb7d3f5a81", "title": "VisionX dashboard handoff" }
}
```

**200/201 response:** canonical server envelope with `revision`, timestamps, and payload hash. `409 REVISION_CONFLICT` includes only current revision/updated time, never another user’s data.

### `DELETE /v1/capsules/{capsuleId}`

Requires `If-Match` revision header and `Idempotency-Key`. Server records an owner-scoped tombstone/operation according to Document 08 retention rules. `204` on success; `409` if revision conflict. This endpoint is called only after explicit user confirmation.

### `POST /v1/sync/push`

Batch transport for queued local operations. Maximum 25 operations/256 KB. Each operation is independently validated; a malformed item does not discard valid independent operations.

**Request shape**

```json
{
  "operations": [{
    "operationId": "uuid",
    "type": "upsert",
    "capsuleId": "uuid",
    "baseRevision": 6,
    "capsule": { "schemaVersion": "1.0", "id": "uuid", "title": "…" }
  }]
}
```

**Response:** one result per operation: `applied`, `duplicate`, `conflict`, or `rejected`, including safe machine-readable codes and new revision where applicable. The client preserves a conflicted local copy before applying a remote winner.

### `GET /v1/sync/pull`

Query: `cursor?`, `limit?`, `changedSince?`. Returns owner-scoped upserts and deletions since sync checkpoint plus new opaque cursor. This endpoint is the recovery path after a device reinstalls or misses a batch; never use a global feed.

## 4. Account and data-rights endpoints (1B)

### `GET /v1/me`

Returns user ID, creation time, sync consent version/status, and supported server capabilities. It does not return provider-account linkage or capsule counts unless product UX explicitly needs them.

### `POST /v1/me/export-request`

Creates an authenticated data export request. For early beta, it may return a `NOT_ENABLED` response and point to in-product JSON export; public sync release requires a working, documented data-export path.

### `DELETE /v1/me`

Begins account/data deletion after reauthentication/confirmation requirements set by auth provider. Response contains a request ID and outcome/status, never a promise that browser-local data is removed. The dashboard explains that local data must be cleared separately.

## 5. Smart-draft endpoint (1C)

### `POST /v1/capsule-drafts`

Creates a temporary, non-persisted capsule draft proposal. Preconditions: explicit smart-draft consent at current policy version and an approved provider/model configuration.

**Request**

```json
{
  "consentVersion": "2026-07-29",
  "provider": "approved-hosted-model",
  "selectedTurns": [{ "role": "user", "text": "…" }],
  "existingDraft": { "title": "…", "goal": "" }
}
```

**Response:** validated `CapsuleDraft`, `modelDescriptor`, `inputDisposition` (e.g. “not retained” only when contractually true), and warnings. The response is never automatically saved, synced, or inserted. `422` covers output that cannot meet schema; the client returns to Quick Capture.

## 6. Diagnostics endpoint (optional)

### `POST /v1/diagnostics`

Available only after diagnostic consent. Accepts extension version, browser major version, provider, adapter version, non-content error code, timestamp, and redacted request correlation ID. Reject all unknown content fields. Rate limit: 20/day/user. No raw conversations, URLs, prompts, or DOM fragments.

## 7. Security, edge cases, and alternatives

| Concern | API response/control |
| --- | --- |
| Token expired | `401`; client refreshes through auth flow, never retries mutation with an unknown token. |
| Duplicate network retry | `Idempotency-Key` returns prior logical result. |
| Oversized/excerpt-heavy capsule | `413`; UI identifies cloud limit and preserves local export. |
| Cross-user ID probe | `404` generic; no existence disclosure. |
| Cloud outage | `503`/network error; local queue remains retryable. |
| Smart service unavailable | `503 SMART_DRAFT_UNAVAILABLE`; quick draft remains unchanged. |

Alternative: let clients use direct database REST APIs. Rejected because stable authorization, revision, size, and idempotency behavior need one controlled boundary. Alternative: real-time websocket sync. Deferred; queued pull/push is simpler, works offline, and is sufficient for a single-user library.

## 8. Acceptance criteria and self-review

- 1A has no server API dependency.
- All optional endpoints have authentication, owner authorization, validation, size/rate limits, typed error behavior, and examples.
- Sync supports retries/conflicts without data loss and has no endpoint for arbitrary user data access.
- Smart drafting is proposal-only and consent-gated.

Self-review: endpoint design aligns with local-first data model and avoids creating a general-purpose backend before it is needed.

## 9. References

- [Document 06 — System Architecture](06_system_architecture.md)
- [Document 08 — Database Design](08_database_design.md)
- [Document 10 — Capsule Specification](10_capsule_specification.md)
- [Document 11 — Security Architecture](11_security_architecture.md)
- [Document 13 — Deployment Strategy](13_deployment_strategy.md)
