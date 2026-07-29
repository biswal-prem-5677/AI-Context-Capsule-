# Context Capsule — Launch Strategy

**Document ID:** 24  
**Status:** Draft — public launch requires Document 19 approval  
**Phase:** 3 — Delivery  
**Depends on:** Documents 03, 13, 19–20, 22–23, 25  
**Purpose:** Define a small, learning-oriented launch that validates the core handoff loop before growth, monetization, or platform expansion.

## 1. Launch objective and positioning

The first launch is a controlled Chrome beta for people who actively switch between ChatGPT, Claude, and Gemini while doing multi-step work. The message is:

> **Move your working AI context—not your whole chat—between supported AI tools with a reviewable handoff.**

Do not market the product as universal memory, full chat migration, guaranteed continuation, an AI operating system, or a replacement for provider Projects/Notebooks/source control. Document 03’s research supports this narrow position.

## 2. Audience and beta recruitment

### Primary beta cohort

- Individual developers, founders, technical students, researchers, and creators who report switching between at least two supported providers monthly.
- Participants willing to install a Chrome beta and give consented, content-free feedback; no requirement to share prompts or private conversations.
- Begin with a small cohort (roughly 20–50 invited testers), then expand only when reliability/support capacity meets Document 25 thresholds.

### Recruitment channels

- Founder/technical-user network and targeted one-to-one outreach.
- Communities where cross-provider workflows are discussed, following community rules and without spam.
- A simple landing/waitlist only after privacy/support/installation material is accurate.
- Short task-based beta interviews, not broad paid acquisition, in first learning cycle.

## 3. Launch phases

```text
Internal alpha → invited beta → measured expansion → public Chrome beta
       │              │                │                    │
   fixtures/staff   20–50 users      fix reliability       listing/feedback loop
```

| Phase | Entry condition | Activities | Exit condition |
| --- | --- | --- | --- |
| Internal alpha | Milestone 3 complete | Clean-profile installs, provider smoke, security/accessibility testing | Document 19 1A evidence complete except external beta feedback |
| Invited beta | 1A release candidate | Onboard small cohort, observe core task, collect consented events/interviews | No P0/P1; target core completion/reliability trend stable |
| Measured expansion | Invited beta evidence | Increase cohort gradually; prioritize defects/clarity | Support/release process handles volume; metrics meet provisional gate |
| Public Chrome beta | Owner approvals/listing ready | Publish staged store release, transparent limits, support/feedback | Continue only if quality/satisfaction remain healthy |

## 4. Onboarding and activation

The activation journey is install → grant only needed site access → open supported source chat → create/review a capsule → insert into target chat. Onboarding must fit one short screen plus contextual guidance; do not force account creation, tutorial video, analytics consent, or AI key setup.

Provide:

- One-sentence promise and supported-site list before install.
- Permission rationale at the browser/user gesture point.
- A synthetic example capsule or safe interactive walkthrough, never a demand to paste private work.
- Clear “Saved on this device” confirmation and manual Copy/Export fallback.
- Installation/troubleshooting/support links that match actual release behavior.

## 5. Feedback collection and support

| Mechanism | Question/data | Privacy rule | Cadence/owner |
| --- | --- | --- | --- |
| Post-transfer one-question survey | “Did this handoff save you time?” 1–5 + optional text | No prompt/capsule capture; optional | After second completed transfer |
| Beta interview | Workflow, friction, trust, missing context | Participant controls screen/content; notes redacted | 5 per cohort cycle |
| Support form | Version/provider/error code/repro steps | Warn not to submit private chat text/keys | Triage owner daily beta |
| Opt-in analytics | Document 25 event taxonomy | Content-free, consented, revocable | Aggregate weekly |
| Store reviews | Public feedback | Do not ask users to disclose sensitive context | Weekly response/triage |

Issue handling follows severity in Document 12. Provider adapter failures receive rapid triage because they directly affect activation/trust.

## 6. Feature flags and rollout controls

| Flag/control | Default | Owner | Rollback action |
| --- | --- | --- | --- |
| Provider adapter enablement | Per tested provider | Extension lead | Disable broken adapter; retain library/copy/export |
| Diagnostics | Off | Product/security | Stop event transmission |
| Sync dashboard (1B) | Off | Product/backend | Disable sync entry/API, preserve local state |
| Smart draft (1C) | Off | Product/security | Disable requests, retain Quick Capture |
| Store rollout percentage | Small beta | Release owner | Halt/revert to prior stable version |

Feature flags must not hide a required privacy notice or alter data egress after consent. Flag state/version is included in non-content diagnostics/release evidence.

## 7. Launch metrics and iteration loop

Use Document 25’s consented metric definitions. First-cycle priorities: first successful insertion, failure/recovery rate per provider, transfer time, user-reported time saved, and repeat transfer behavior. Do not optimize vanity installs, page views, or daily active users at the expense of a niche but valuable task.

```text
Evidence → weekly product/engineering review → choose one highest-impact friction
 → ship verified fix → update limits/docs → observe next cohort
```

Prioritize: P0/P1 privacy/reliability; permission/onboarding confusion; missing-context causes; target-draft/insertion errors; then library polish. Do not respond to early feedback by adding teams, routing, or integrations without evidence and PRD update.

## 8. Risks, alternatives, and implementation notes

Broad launch before adapter reliability is rejected: failure at the core moment damages trust more than a smaller beta slows growth. A waitlist without a working support path is rejected. A paid launch is deferred until value, hosted-service costs, and consent model are understood. Prepare a simple landing page only after its claims, privacy policy, supported matrix, and installation experience are approved.

Implementation notes: establish named owner for release/support/security, issue labels/milestones, a beta feedback repository/project, feature-flag configuration, opt-in event pipeline, and a launch status page/message template before invitations.

## 9. Acceptance criteria and self-review

- Audience, promise, onboarding, feedback, support, flags, rollout, and iteration steps are concrete and aligned with beta risk.
- Public expansion is gated by quality/satisfaction evidence, not marketing calendar.
- Launch plan avoids unbuilt feature claims and consent-free data collection.

Self-review: strategy favors learning and user satisfaction before scale, consistent with the MVP philosophy.

## 10. References

- [Document 03 — Market Research](03_market_research.md)
- [Document 13 — Deployment Strategy](13_deployment_strategy.md)
- [Document 19 — Release Checklist](19_release_checklist.md)
- [Document 20 — MVP Roadmap](20_mvp_roadmap.md)
- [Document 22 — Risk Register](22_risk_register.md)
- [Document 23 — Known Limitations](23_known_limitations.md)
- [Document 25 — Success Metrics](25_success_metrics.md)
