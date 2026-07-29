# Context Capsule — Release Checklist

**Document ID:** 19  
**Status:** Draft  
**Phase:** 3 — Delivery  
**Depends on:** Documents 11–13, 15, 18  
**Purpose:** Provide an evidence-based, repeatable go/no-go gate for Core Transfer MVP and optional beta capabilities.

## 1. Release rule

A release is not ready because it compiles, appears in a demo, or has a Chrome Store ZIP. It is ready only when all applicable checklist items have evidence, release owner approval, known limitations are published, rollback is prepared, and no unresolved release blocker exists.

Release owner records completion evidence (link, command output, test run, screenshot using synthetic data, ticket, or signed approval). “N/A” needs rationale and owner; it is not a shortcut for incomplete work.

## 2. Core 1A product checklist

### Scope and UX

- [ ] Release contains only approved 1A capability; excluded 1B/1C/V2 UI is absent or feature-disabled with no discoverable false promise.
- [ ] Create, review/edit, local save, library search/rename/duplicate/delete-undo, JSON/Markdown export/import, Compact/Full composition, Copy, and Insert work end to end.
- [ ] User can complete first transfer from a clean Chrome profile using only installation guide.
- [ ] Existing target draft is preserved below divider; automated/manual evidence confirms no auto-send path.
- [ ] Every core screen has loading, empty, validation error, cancellation, success, and recovery behavior per Document 04.
- [ ] Accessibility keyboard/screen-reader/contrast/zoom/reduced-motion checks have passed.

### Provider compatibility

- [ ] Current Chrome stable version recorded; load-unpacked and packaged release both tested.
- [ ] ChatGPT capture and insertion manual smoke pass on documented layout/date.
- [ ] Claude capture and insertion manual smoke pass on documented layout/date.
- [ ] Gemini capture and insertion manual smoke pass on documented layout/date.
- [ ] Full 3×3 source→target capture/insert matrix completed or degraded support is explicitly approved, labeled, and has Copy/Export fallback.
- [ ] Adapter capability failure leaves host page usable and no duplicate injection/console-unhandled error observed.
- [ ] Adapter fixture suite passes and provenance/version is current.

### Data integrity and local resilience

- [ ] Capsule schema validation, JSON clean-profile round trip, Markdown export/read/import review, source/excerpt disclosure, truncation behavior, and duplicate import behavior pass.
- [ ] Offline create/edit/search/export/import/insert pass.
- [ ] Service-worker/extension reload does not corrupt saved library or pending editor behavior.
- [ ] IndexedDB quota/error and browser data-loss limitations have tested recovery messages.
- [ ] No attachment transfer or transcript-completeness claim appears in UI/docs.

## 3. Security and privacy checklist

- [ ] Manifest V3, CSP, bundled-code review, permission/host allow-list diff, and no broad/cookie/private API access verified.
- [ ] Content/import/message validation and XSS/security test corpus pass.
- [ ] Secret scan, dependency audit, static security checks, and license review are clear or accepted risks have owner/expiry.
- [ ] No capsule text, raw excerpt, source URL with sensitive query, tokens, cookies, keys, or prompt appears in logs/analytics/crash reports/fixtures.
- [ ] Local storage, export, unsupported layout, and optional-service disclosures are accurate.
- [ ] Chrome Web Store privacy/data-use declarations, privacy policy URL, support contact, and permission rationale are approved.
- [ ] Incident contact, adapter kill-switch/disable procedure, and security-report path exist.

## 4. Quality, CI, and documentation checklist

- [ ] Exact release commit/tag is identified; working tree clean; lockfile committed.
- [ ] `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build` pass on release commit.
- [ ] Required integration/E2E/security/docs workflows pass; flaky tests are not ignored without recorded exception.
- [ ] Release notes state version, supported providers, user-facing changes, data/permission changes, known limitations, and upgrade/rollback notes.
- [ ] README, installation guide, architecture/capsule/security docs, `CONTEXT.md`, `CLAUDE.md`, and known limitations accurately reflect release state.
- [ ] No TODO/placeholder/development-only debug control is exposed in release UI.

## 5. Packaging, store, and rollout checklist

- [ ] Version/package name/icons/screenshots/listing/category/support URL are correct and policy-compliant.
- [ ] Production ZIP checksum/artifact is retained; manifest inspected from ZIP, not only source.
- [ ] Clean-profile install/upgrade/uninstall/reinstall behavior tested; local-data limitation documented.
- [ ] Previous stable extension version and rollback procedure are ready.
- [ ] Store upload/review/rollout owner and staged audience are assigned.
- [ ] Beta feedback channel and support triage SLA/owner are active before inviting users.

## 6. Optional 1B Sync Dashboard gate (additional)

- [ ] 1A reliability/user feedback meets threshold in Document 25 before 1B promotion.
- [ ] Separate staging/prod Supabase/Vercel projects, secrets, redirects, headers, domain ownership, backups/PITR, and restore test documented.
- [ ] Two-user RLS tests prove no cross-user list/read/update/delete access; API rate/size/idempotency/conflict tests pass.
- [ ] Sync consent, source-excerpt policy, conflict copy, queued offline retry, deletion/account export flows, retention, and privacy/legal review are complete.
- [ ] Dashboard sign-in/sign-out/local-only behavior/availability outage/rollback smoke pass.

## 7. Optional 1C Smart Capsule gate (additional)

- [ ] Product/legal owners approve model/provider, pricing/limits, data recipient, retention/disposition, and user-facing consent copy.
- [ ] Input contains only explicitly selected turns; provider/model is visible before request; consent is revocable/versioned.
- [ ] Output schema validation, prompt-injection-safe treatment, rate limits, timeouts, error handling, and Quick Capture fallback pass.
- [ ] No provider key appears in browser client, capsule, export, telemetry, or logs.
- [ ] Support/incident procedures include smart-service outage and data request handling.

## 8. Go/no-go and rollback

**Go:** all applicable boxes evidenced, no P0/P1 open, release owner + product owner + security owner approvals recorded, monitoring/feedback live.

**No-go:** unsupported provider behavior lacks fallback; auto-send/draft overwrite; any unintended content egress/cross-user access; missing privacy/listing/support requirements; untested migration/rollback; failed core smoke or build/security gate.

**Rollback:** halt rollout, disable broken adapter/optional flag where possible, restore prior dashboard deployment, revert/forward-fix migration only with verified plan, release previous stable extension version, communicate truthful status, preserve non-content evidence, and update Document 22/`CONTEXT.md`.

## 9. Self-review and references

This checklist covers product completion, provider compatibility, privacy/security, tests, deployment, documentation, store listing, optional-service gates, and operational readiness. It deliberately blocks public release when a feature merely exists without trustworthy evidence.

References: [11 Security](11_security_architecture.md), [12 Testing](12_testing_strategy.md), [13 Deployment](13_deployment_strategy.md), [15 GitHub Workflow](15_github_workflow.md), [18 Installation](18_installation.md), [20 MVP Roadmap](20_mvp_roadmap.md), [22 Risk Register](22_risk_register.md), [23 Known Limitations](23_known_limitations.md), [25 Success Metrics](25_success_metrics.md).
