# Context Capsule — Security Architecture

**Document ID:** 11  
**Status:** Draft — requires pre-launch security review and legal counsel  
**Phase:** 2 — Engineering  
**Depends on:** Documents 02, 06–10  
**Purpose:** Define the security/privacy threat model, required controls, validation evidence, and launch conditions for a browser extension handling potentially sensitive AI conversation context.

## 1. Security objectives and scope

Primary objectives: protect user-controlled capsule content; minimize browser/site access; prevent unwanted content egress; preserve local/offline function; enforce cloud owner isolation if sync is launched; and avoid executing untrusted content. The security boundary covers the Chrome extension, local storage, supported host pages, optional dashboard/API/Supabase, CI/CD, and optional smart-draft provider.

This is a product security architecture, not a legal compliance certification. GDPR/UK GDPR applicability, lawful basis, controller/processor roles, international transfers, age policy, contractual terms, and breach obligations require qualified legal review before any public cloud or AI-processing release.

## 2. Assets, trust boundaries, and threat model

| Asset | Sensitivity | Primary protection |
| --- | --- | --- |
| Capsule fields/source excerpts | May include personal, proprietary, or secret work data | Local-first default, consented egress, validation, RLS. |
| Provider host-page content | Untrusted input, potentially sensitive | Read text only after user action; no hidden state/cookies. |
| Browser permissions | High-impact capability | Minimal/optional origin grants and transparent rationale. |
| Auth tokens | Confidential | Extension/dashboard secure storage; never host page or logs. |
| Optional BYOK / service secrets | Highly confidential | Browser-local BYOK only; server secrets only in managed secret store. |
| Synced capsule payload | Confidential user data | TLS, RLS, least privilege, retention/deletion controls. |
| Build/release signing credentials | Critical | CI secret isolation, protected environments, least privilege. |

```text
Untrusted host page ──(selected text only)──> Extension boundary
Extension local data ──(explicit opt-in)──> Authenticated cloud boundary
Cloud capsule draft ──(explicit 1C consent)──> Approved AI provider boundary
Developer/CI ──(reviewed build)──> Chrome Web Store / hosting boundary
```

Threat actors include malicious websites/scripts, malicious or malformed imported capsules, compromised browser profile/device, unauthorized cloud users, compromised credentials/dependencies, accidental developer logging, and abusive clients of optional public endpoints.

## 3. Required controls

### 3.1 Browser extension and content scripts

- Manifest V3 only; all executable code is packaged and reviewed. Chrome documents that MV3 removes remotely hosted code, and extension page CSP should permit only the minimum required packaged resources. [Chrome: Manifest V3](https://developer.chrome.com/docs/extensions/develop/migrate/what-is-mv3), [Chrome: CSP](https://developer.chrome.com/docs/extensions/reference/manifest/content-security-policy)
- Request only narrowly scoped permissions/origins; use optional permissions/host access where a feature is not essential and explain the purpose during the user gesture. Chrome recommends minimizing access and notes `activeTab`/optional permissions as privacy-preserving alternatives in many cases. [Chrome: Protect user privacy](https://developer.chrome.com/docs/extensions/develop/security-privacy/user-privacy), [Chrome: Permissions API](https://developer.chrome.com/docs/extensions/reference/api/permissions)
- Isolate injected UI styles; do not trust host DOM attributes/HTML or page JavaScript. Validate every message origin, sender, action, and payload schema.
- Never access cookies, authenticated provider APIs, browser history, passwords, or arbitrary tabs. Do not request broad `<all_urls>` or “future-proof” permissions.
- Clean up observers/listeners on route change; adapter failure must remove/hide injected UI instead of throwing into the host page.

### 3.2 Input/output and XSS defenses

- Treat captured DOM text, Markdown, JSON imports, API responses, URLs, filenames, and extension messages as untrusted input.
- Parse with strict runtime schemas, size/depth/list bounds, safe Unicode normalization, and explicit MIME/extension checks.
- Render with escaped text/sanitized Markdown; never use raw HTML injection, arbitrary link protocols, eval, dynamic import of remote code, or unsafe templating.
- Generate plain-text composer payloads; never evaluate capsule content as script or instructions to the extension.
- Fuzz malformed import/parser boundaries and test stored XSS in library, dashboard, toasts, previews, and logs.

### 3.3 Authentication and authorization (1B)

- Use Supabase Auth only through approved libraries/redirect configuration; verify token audience/expiry server-side.
- Enforce owner-based RLS on every user data table, with integration tests using two distinct accounts and direct API attempts.
- Use opaque UUIDs, generic 404 for inaccessible resources, server-side revision checks, and idempotency keys.
- Protect dashboard routes on server/client appropriately; sign-out clears auth state but communicates the separate status of local browser data.
- Service-role credentials exist only in server-side managed secrets and are never exposed to extension/dashboard bundles.

### 3.4 Secrets and cryptography

- Use TLS for every network connection; pin no custom cryptography in V1.
- Rely on managed encryption at rest for cloud data; document provider configuration and access roles.
- Do not log, export, sync, or put API keys/tokens in capsules. Optional BYOK stays in `chrome.storage.local` and is excluded from all export/telemetry paths.
- Rotate cloud/CI/service keys on suspected disclosure; revoke compromised sessions and investigate access logs.

### 3.5 Rate limiting, abuse, and availability

- Limit authenticated sync by payload, operation count, user/IP budget, and idempotency key; limit diagnostics to non-content, consented events.
- Smart draft has per-user/provider budgets, input caps, concurrency limits, timeout, and abuse monitoring without prompt content retention.
- Reject oversized/deeply nested input before expensive parsing; bounded retries with jitter protect browser and API resources.
- Maintain a kill switch/feature flag to disable a broken provider adapter or optional service without disabling local export/library.

## 4. Privacy and data handling

### 4.1 Data categories and default handling

| Category | Default location | Leaves device when |
| --- | --- | --- |
| Structured capsule fields | Local IndexedDB | User exports, opts into sync, or confirms smart request input. |
| Source excerpt | Not retained unless user selects it | User exports; cloud sync only under an approved separate policy. |
| Provider/page metadata | Ephemeral/local source field | User saves/exports/syncs selected canonical metadata. |
| Auth/session data | Auth client/managed service | Normal auth operations only. |
| Diagnostics | Disabled by default | User explicitly consents; only non-content metadata sent. |

Consent must be granular: sync, diagnostics, and smart drafting are independent. Consent copy identifies categories, recipient, purpose, retention/disposition, and revocation path. No dark patterns, bundled consent, or “agree to keep using local capsule” requirement.

### 4.2 Data-protection considerations

For EU/UK-facing cloud processing, design documentation and launch materials must account for purpose limitation, data minimization, storage limitation, transparency, and privacy/data protection by design/default. The European Commission describes collecting only data necessary for a stated purpose and retaining it no longer than necessary; UK ICO guidance similarly emphasizes embedding data protection through the lifecycle. [European Commission: GDPR principles](https://commission.europa.eu/law/law-topic/data-protection/information-business-and-organisations/principles-gdpr_en), [ICO: Data protection by design/default](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/accountability-and-governance/guide-to-accountability-and-governance/data-protection-by-design-and-by-default/)

Before 1B/1C public launch, obtain counsel-reviewed answers for: controller/processor roles; lawful basis/consent mechanics; privacy notice; data-subject access/export/deletion; retention schedule; subprocessor/transfers; security incident response; children/age policy; and DPIA trigger assessment. Local-only 1A still needs an accurate Chrome Web Store privacy disclosure and clear local-data behavior.

## 5. Threat-to-control matrix

| Threat | Example | Required control / evidence |
| --- | --- | --- |
| Host-page injection | Malicious page manipulates DOM/message to exfiltrate library | Isolated content UI, origin/sender validation, typed messages, no library exposure. |
| Stored/reflected XSS | Imported Markdown includes script/link payload | Escape/sanitize all rendering; XSS tests/fuzz corpus. |
| Excessive permission | Broad host/cookie access enables unintended collection | Minimal manifest review; optional-host UX; store listing justification. |
| Broken authorization | User A reads User B capsule | RLS policies + two-user integration tests + generic 404. |
| Secret leakage | Key in logs/export/client bundle | Secret scanning, structured redacted logs, CI review, no key in schema. |
| Cloud/LLM egress surprise | User did not know selected turns were sent | Just-in-time consent and recipient/model display; audit consent version. |
| Adapter regression | Host DOM change causes page failure | Adapter isolation, capability check, kill switch, Copy fallback. |
| Resource exhaustion | Huge/deep JSON import or long DOM chat | 1MB/import limits, bounded parsing, cancellation, performance tests. |
| Supply-chain compromise | Malicious dependency/release | Lockfiles, dependency review/scanning, protected CI/release credentials. |

## 6. Security operations and incident response

- Maintain severity definitions, an on-call/support contact, release owner, and non-content diagnostic capability before public beta.
- Critical issue examples: cross-user data access, unintended content egress, secret exposure, stored XSS, malicious extension update. Disable affected adapter/service, rotate credentials, preserve minimal evidence, notify affected users/regulators as required by counsel, and publish remediation status.
- Run dependency vulnerability scanning, secret scanning, SAST, manifest/permission review, and manual abuse-case testing in CI/release process.
- Review access/consent/retention configuration on every cloud-provider change and at least quarterly after launch.

## 7. Alternatives and implementation notes

Client-side end-to-end encryption is not a V1 assumption: it would require recovery/key-sharing/support decisions and may constrain sync/search. It can be evaluated after local-first MVP usage validates sync demand. A server-side proxy for every capture is rejected because it violates local-first privacy. A generic remote-code configuration system is rejected by MV3 and security goals.

Implementation notes: create a security checklist in CI, maintain a dependency lockfile, use no raw `innerHTML`, centralize redaction/logging, and treat security review as a release gate rather than documentation-only work.

## 8. Acceptance criteria and self-review

- Threat model covers host pages, imports, extension permissions, local data, cloud auth, optional AI processing, CI, and availability.
- Required controls are testable and assigned to release evidence.
- Local-only/default data handling and optional egress are explicit.
- Legal/privacy obligations are framed as counsel-reviewed prelaunch work, not unsupported compliance claims.
- Chrome/GDPR guidance is linked to authoritative sources.

Self-review: controls support the product’s trust promise without pretending that local browser storage or cloud platforms eliminate all risk.

## 9. References

- [Document 07 — Browser Extension Architecture](07_browser_extension_architecture.md)
- [Document 08 — Database Design](08_database_design.md)
- [Document 09 — API Specification](09_api_specification.md)
- [Document 10 — Capsule Specification](10_capsule_specification.md)
- [Document 12 — Testing Strategy](12_testing_strategy.md)
- [Document 13 — Deployment Strategy](13_deployment_strategy.md)
- [Document 19 — Release Checklist](19_release_checklist.md)
