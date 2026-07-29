# Context Capsule — Risk Register

**Document ID:** 22  
**Status:** Active register — update on every material change/release  
**Phase:** 3 — Delivery  
**Depends on:** All design documents  
**Purpose:** Make product, technical, security, legal, operational, and UX risks visible with owners, triggers, mitigations, and contingencies.

## 1. Risk process

Score likelihood (L) and impact (I) from 1–5; score = L×I. `15–25` is high and release-owner reviewed; `8–14` is actively managed; `1–7` is monitored. A risk is not closed because it is accepted—closure requires eliminated trigger or completed mitigation evidence. Link implementation issues and record changes in `CONTEXT.md`.

## 2. Active risks

| ID | Category | Risk / trigger | L/I | Owner | Mitigation | Contingency / status |
| --- | --- | --- | --- | --- | --- | --- |
| R-01 | Technical | Provider DOM change breaks capture/insertion | 4/5 | Extension lead | Isolated adapters, fixtures, live smoke, capability detection | Disable adapter/Copy fallback, patch; active |
| R-02 | UX | User mistakes capsule for full conversation migration | 3/4 | Product/UX | Honest copy, source/excerpt status, review | Update onboarding/copy; active |
| R-03 | Quality | Summary omits critical decision/constraint | 4/4 | Product | Required fields, editing, truncation disclosure | Quick/excerpt fallback; active |
| R-04 | Security | Import/host content creates XSS or extension abuse | 3/5 | Security | Schema bounds, escaped render, CSP, fuzz tests | Disable affected parser/release patch; active |
| R-05 | Privacy | Content egress without clear consent | 2/5 | Security/product | Local-first, just-in-time consent, log redaction | Disable service, incident process; active |
| R-06 | Authorization | Sync exposes another user’s capsule | 2/5 | Backend/security | RLS, two-user tests, generic 404 | Disable sync, rotate/review/notify; active |
| R-07 | Scope | Dashboard/AI/team features delay core beta | 4/5 | Product owner | 1A/1B/1C gates, roadmap discipline | Defer/remove non-core work; active |
| R-08 | Store policy | Permissions/data practices rejected by Chrome Web Store | 3/5 | Release/security | Minimum optional permissions, policy review, disclosures | Reduce permissions/revise listing; active |
| R-09 | Storage | Browser clear/reinstall loses local capsules | 3/4 | Product | Honest limitation, export, optional future sync | Recovery guidance; active |
| R-10 | Performance | Long chat freezes tab | 3/4 | Extension lead | Bounds/progress/cancel/performance tests | Reduce selection/manual capture; active |
| R-11 | Business | Native provider feature narrows differentiation | 3/4 | Product | Research cadence, focus portability/review | Narrow audience/positioning; monitor |
| R-12 | Legal | Privacy/retention/transfer obligations unclear for 1B/1C | 3/5 | Legal/business | Counsel review, DPIA assessment, policy | Delay cloud/AI release; active |
| R-13 | Dependency | Vulnerable/malicious dependency or release secret leak | 2/5 | Engineering/security | Lockfile, scans, secret management | Revoke/rotate/patch; active |
| R-14 | Reliability | Service worker lifecycle loses in-flight state | 3/3 | Extension lead | Durable repository/queue, restart tests | Reopen/retry without data loss; active |
| R-15 | Cost | Hosted smart drafts have unbounded spend | 3/4 | Product/ops | 1C approval, rate/budget limits | Disable service/require BYOK decision; deferred |
| R-16 | Support | Users expect support for unsupported sites/browser | 4/3 | Support/product | Clear matrix/limitations/feedback route | Update docs/priority review; active |
| R-17 | Accessibility | Injected control unusable with keyboard/screen reader | 3/4 | UX/QA | Semantic UI, host/zoom tests | Block release/fix; active |
| R-18 | Trust | Provider page detects/dislikes injection behavior | 2/4 | Extension/security | DOM-text only, no private API/automation, minimal UI | Disable adapter/seek compliant alternative; monitor |

## 3. Risk review workflow

```text
New issue/change → identify data/user/provider impact → score/owner
 → mitigation task + test/doc link → review at milestone/release
 → close only with evidence or retain accepted risk with expiry
```

Review all high risks at weekly implementation review and every release candidate. Re-score when a provider changes policy/UI, a cloud/AI capability is proposed, a security incident occurs, or beta data contradicts assumptions.

## 4. Edge cases and escalation

P0 triggers (cross-user access, unintended content egress, key exposure, auto-send, widespread host breakage) bypass normal cadence: halt release/rollout, execute Document 13 rollback/incident process, preserve non-content evidence, and update this register after containment. Legal/privacy questions are escalated to qualified counsel; do not treat this register as compliance approval.

## 5. Alternatives and implementation notes

Ignoring risks until implementation is rejected because data/permission assumptions become expensive to reverse. A quantitative Monte Carlo model is unnecessary for the small MVP; simple transparent scoring plus evidence-based review is sufficient. Add a risk only when it has an owner and actionable response, not as a vague fear.

## 6. Acceptance criteria and self-review

- Risks span technical, business, legal, UX, performance, privacy/security, and operations.
- Every high risk has owner, trigger, mitigation, contingency, and review route.
- Release blockers map to Document 19 and known limitations map to Document 23.

Self-review: register actively protects scope/trust and exposes cloud/AI gating risk rather than burying it.

## 7. References

- [Document 11 — Security Architecture](11_security_architecture.md)
- [Document 12 — Testing Strategy](12_testing_strategy.md)
- [Document 13 — Deployment Strategy](13_deployment_strategy.md)
- [Document 19 — Release Checklist](19_release_checklist.md)
- [Document 20 — MVP Roadmap](20_mvp_roadmap.md)
- [Document 23 — Known Limitations](23_known_limitations.md)
