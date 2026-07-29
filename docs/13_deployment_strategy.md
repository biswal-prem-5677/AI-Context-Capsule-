# Context Capsule — Deployment Strategy

**Document ID:** 13  
**Status:** Draft  
**Phase:** 3 — Delivery  
**Depends on:** Documents 06–12  
**Purpose:** Define repeatable, secure deployment and rollback for the extension, optional dashboard/sync service, and future smart-draft service.

## 1. Deployment principles

- The packaged extension is the Core Transfer MVP deliverable; no backend outage may remove local library/export/import capability.
- Build once per commit and promote the same immutable artifact through environments where possible.
- Staging is mandatory before production for every cloud capability; production migrations/permissions are never first tested against user data.
- Releases are reversible: dashboard can roll back, service flags can disable optional paths, and extension releases use Chrome Web Store rollout/previous stable package strategy.
- Secrets are managed outside source control; deployment logs are content-free.

## 2. Environments and topology

| Environment | Extension | Dashboard | Supabase/API | Purpose |
| --- | --- | --- | --- | --- |
| Local | Load unpacked dev build | Local Vite app | Local/mock or isolated dev project | Development and fixture tests |
| CI | Packaged test build | Production build artifact | Mock/ephemeral integration where possible | Deterministic checks |
| Staging | Signed/internal package | Vercel preview/staging URL | Separate Supabase staging project | Auth/RLS/sync and release validation |
| Production beta | Chrome Web Store beta channel | Vercel production | Separate Supabase production project | Consent-based user beta |

Never point staging/dashboard preview at production database by convenience. Production/staging use distinct OAuth redirect URLs, API URLs, secrets, telemetry keys, and service roles.

## 3. Component deployment workflow

### 3.1 Chrome extension (1A)

```text
Protected main commit/tag
 → CI build/test/security/manifest audit
 → create versioned ZIP + checksum + release notes
 → load-unpacked clean-profile smoke on release candidate
 → upload to Chrome Web Store internal/beta track
 → monitored staged rollout → stable publish
```

The release artifact includes only compiled, reviewed MV3 files. Inspect manifest permissions, host patterns, CSP, icons, and version before upload. The Web Store listing, privacy disclosure, support URL, screenshots, and data-use declarations are version-controlled as release assets where permitted. Use staged rollout; keep the prior known-good package/version and documented rollback steps.

### 3.2 Dashboard (1B)

```text
Protected main commit → CI → Vercel preview → staging smoke
 → approved production deployment → URL/auth/header smoke → monitor/rollback
```

Set production security headers, approved origin allow-list, OAuth redirect URLs, and environment configuration. Preview deployments use staging services and are non-indexed. A bad dashboard deployment can roll back to previous Vercel deployment without altering extension local data.

### 3.3 Supabase/API (1B/1C)

```text
Migration reviewed → apply to staging → RLS/API integration tests
 → backup/checkpoint verified → approved production migration
 → post-migration RLS/smoke/health check
```

Migrations are append-only and reversible/forward-fix documented. Never edit already-applied production migration files. Apply schema changes before clients that require them; retain backward compatibility during extension rollout windows. Edge functions/API are deployed with pinned runtime/dependencies and feature flags default-off for unreleased functionality.

## 4. Configuration and secrets

| Variable category | Examples | Storage rule |
| --- | --- | --- |
| Public build configuration | `VITE_APP_ENV`, public Supabase URL/anon key, dashboard URL | Environment-specific build config; reviewed as public. |
| Server secret | Supabase service role, smart-provider service key, webhook secret | Managed deployment secret store only; never extension/dashboard bundle. |
| OAuth config | Client ID/redirect allow-list | Provider dashboard + deployment config; no client secret in browser. |
| Observability | DSN/endpoint, release ID | Consent/privacy review; no content capture. |

Maintain `.env.example` with names, scope, safe examples, and descriptions—not values. CI checks prevent committed `.env`, keys, or generated extension signing credentials. Rotate a secret on suspected exposure and record the action in security incident evidence.

## 5. Versioning and compatibility

- Use semantic versioning: extension/dashboard package release `MAJOR.MINOR.PATCH`; capsule schema version follows Document 10 policy and is independent.
- Tag release commits `vX.Y.Z`; generate release notes from conventional commits plus manual compatibility/privacy changes.
- Extension client sends version to optional API; server supports current and previous minor release during staged rollout unless security requires forced upgrade.
- Adapter compatibility is versioned separately in diagnostics/release notes. A provider site change may require a patch release or feature-flag disable.

## 6. Rollback and incident playbooks

| Incident | Immediate action | Recovery |
| --- | --- | --- |
| Broken dashboard | Roll back Vercel deployment | Verify auth/library smoke; publish status. |
| Cloud/RLS regression | Disable sync flag, revoke affected endpoint if needed | Restore approved migration/forward fix, run isolation tests, notify as required. |
| Broken provider adapter | Disable adapter/feature flag or release previous extension | Keep local library/copy/export available; ship patch with fixture/live validation. |
| Secret exposure | Revoke/rotate secret, disable affected integration | Audit access, deploy replacement, incident process. |
| Smart provider outage | Disable Smart Capsule | Quick Capture remains available; no data replay. |

Do not use destructive database rollback without verified backup, migration review, and release-owner approval. Public incident communication never includes user capsule content.

## 7. Monitoring, logging, and analytics

Operational monitoring covers dashboard availability, API error/rate-limit health, authentication callback failures, migration status, extension release adoption, and non-content adapter failure codes. Alerts are actionable, rate-limited, and owned.

Logs must redact tokens, authorization headers, capsule payloads, selected turns, source URLs with sensitive query values, and API keys. Analytics is opt-in and limited to Document 25’s approved event schema. Enable error monitoring only after data processing/privacy review; configure sampling and scrubbing defensively.

## 8. Backup, resilience, and disaster recovery

- Verify managed Supabase backup/PITR capability, region, retention, restore ownership, and recovery-time/recovery-point objectives before 1B production launch.
- Test a non-production restore at least once before broad beta; record result in release evidence.
- Extension users retain local export route independent of cloud recovery.
- Document domain/DNS ownership, Vercel project ownership, Chrome developer account ownership, and break-glass access with at least two authorized maintainers where appropriate.

## 9. Risks, alternatives, and implementation notes

Manual “deploy from laptop” is rejected for cloud services because it weakens auditability/repeatability. Fully automated Chrome Store production publish is deferred until account policy, review behavior, and rollback process are proven; an approved release owner may manually promote the verified artifact initially. A single Supabase project for staging/production is rejected due to authorization/data risk.

Implementation notes: create deployment runbooks, a release environment protection rule, immutable artifact retention, health check endpoint/route for optional services, and feature-flag ownership. Specific CLI commands are documented in Document 18 once project scaffolding exists.

## 10. Acceptance criteria and self-review

- Each deployable component has isolated environments, artifact/version path, smoke checks, owner, rollback, and observable health.
- Core local extension functionality remains available during all optional-service outages.
- Migration/RLS, secrets, permissions, release artifact, and data handling have explicit deployment gates.
- Staging/prod separation and backup/restore verification block 1B/1C release.

Self-review: deployment is constrained to actual MVP components and does not assume unnecessary infrastructure.

## 11. References

- [Document 07 — Browser Extension Architecture](07_browser_extension_architecture.md)
- [Document 08 — Database Design](08_database_design.md)
- [Document 11 — Security Architecture](11_security_architecture.md)
- [Document 12 — Testing Strategy](12_testing_strategy.md)
- [Document 15 — GitHub Workflow](15_github_workflow.md)
- [Document 18 — Installation](18_installation.md)
- [Document 19 — Release Checklist](19_release_checklist.md)
