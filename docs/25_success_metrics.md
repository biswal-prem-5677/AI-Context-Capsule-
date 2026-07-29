# Context Capsule — Success Metrics

**Document ID:** 25  
**Status:** Draft — measurement begins only with approved, explicit consent  
**Phase:** 3 — Delivery  
**Depends on:** Documents 02–03, 11, 19, 24  
**Purpose:** Define privacy-preserving measures that show whether Context Capsule completes valuable transfers reliably and satisfies users.

## 1. Measurement principles

- Measure successful user outcomes, not raw activity or model usage.
- No capsule text, source turn, prompt, source URL with sensitive parameters, API key, provider account identity, or typed destination content is an event property.
- Analytics is off by default until privacy notice, consent/revocation flow, endpoint, retention, and security review are approved.
- Early targets are hypotheses for the first beta cohort, not claims of current performance; rebaseline after adequate consented sample and qualitative review.
- Complement every quantitative signal with interviews/support findings; a high click rate can hide broken handoffs.

## 2. North-star metric

**Verified Successful Handoff (VSH):** a consented user completes capture or import, saves/selects a valid capsule, and receives an `inserted` or `copied` result for a supported destination in one session without a terminal error. VSH does not claim the user sent the message or that the destination AI produced a good answer.

Primary weekly view: unique consented users with at least one VSH, segmented only by extension version, provider source/target category, and capability/result code—never content.

## 3. Metric definitions and provisional targets

| Metric | Formula | Initial beta target / decision use |
| --- | --- | --- |
| Activation | users with first VSH within 7 days ÷ consented new installers | ≥35%; if low, inspect permission/onboarding/adapter friction before adding features |
| Capture completion | saved valid capsules ÷ capture starts | ≥75%; below target triggers review UI/source-limit study |
| Insert success | `inserted` + `copied` outcomes ÷ insert attempts | ≥95% overall and no provider <90%; lower blocks expansion |
| Median transfer time | median capture/import start → inserted/copied outcome | ≤5 minutes; inspect long tails qualitatively |
| Repeat task retention | users with VSH in 2 distinct weeks ÷ users eligible for second week | ≥20% initial hypothesis; interpret with task frequency/interviews |
| Engagement quality | median VSH per active consented user/week | Informational only; rising count is not automatically good |
| Satisfaction | mean 1–5 “saved me time” response after second VSH | ≥4.0 with response-count shown; below requires interviews |
| Adapter failure rate | unsupported/error capability results ÷ attempted provider actions | <5% per supported provider; trend by extension/adapter version |
| Crash-free core sessions | sessions without unhandled core error ÷ core sessions | ≥99%; P0/P1 overrides aggregate rate |
| Support burden | support contacts per 100 active beta users, by category | Stable/decreasing; rising adapter/privacy confusion blocks scale |
| Conversion readiness | users who opt in to hear about optional paid/hosted value ÷ surveyed users | Exploratory only; no pricing conclusion in beta |

Targets are release/expansion decision aids, not punitive quotas. Small samples show confidence ranges/counts and cannot justify broad claims.

## 4. Consent-safe event taxonomy

| Event | Allowed properties | Explicitly prohibited |
| --- | --- | --- |
| `extension_installed` | extension version, install channel | browser history, account identity |
| `capture_started/completed/cancelled` | provider, visible-turn count bucket, result code, duration bucket | turns, title, URL, excerpt |
| `capsule_saved` | source provider, field-completeness flags, local/sync mode | title, goal, decisions, text |
| `import_started/completed/rejected` | format, size bucket, validation code | file name/content |
| `insert_started/completed/failed` | target provider, compact/full, token-count bucket, result code/duration | generated prompt, existing draft |
| `export_completed/copy_completed` | format/result | exported content |
| `adapter_error` | provider, adapter/ext version, non-content code | DOM/URL/message text |
| `survey_submitted` | score, optional consented category tags | free text unless separate clearly disclosed feedback system |

Use coarse buckets where exact values create unnecessary fingerprinting. Generate a rotating/pseudonymous analytics identifier only after consent; do not derive it from provider account or capsule content. Retention/deletion schedule is approved with privacy counsel before enablement.

## 5. Dashboards, review cadence, and decisions

```text
Consented aggregate events + support/interviews
 → weekly quality review → provider/onboarding/UX decision
 → documented experiment/fix → release evidence → next cohort review
```

Weekly: VSH, activation, completion, insert/adaptor failures, crashes, support. Per cohort: transfer time and satisfaction. Before expansion: provider-specific reliability and no unresolved P0/P1. Monthly after public beta: task retention, qualitative themes, limitations/roadmap review.

Decision examples:

- Low activation + high permission refusal: simplify permission explanation/onboarding; do not add more host access.
- High capture completion + low insert success on one provider: pause expansion and prioritize that adapter/copy fallback.
- High VSH + low satisfaction: interview users about missing context/trust; do not infer success from technical completion.
- Low repeat rate with high satisfaction: assess whether task frequency is naturally low before declaring failure.

## 6. Privacy, security, and edge cases

- Users can use all 1A functionality with analytics off; no degraded core experience or consent nagging.
- Event transmission failures are ignored/retried only within bounded non-content queue; they never block user flows.
- Delete/revoke consent stops future collection and applies approved deletion/retention process to identifiable analytics data.
- Dashboard access is restricted; aggregate reporting uses least privilege; exports are reviewed for re-identification risk.
- Support/survey free text is a separate data category with visible warning not to include prompts/secrets and a retention policy.

## 7. Alternatives and implementation notes

Counting only installs is rejected because it says nothing about transfer value. Capturing prompts for “better analytics” is rejected because it conflicts with local-first trust and creates excessive data risk. A/B testing consent language or core safety behavior is rejected; experiments may test non-deceptive onboarding/copy only after product/security review.

Implementation notes: instrument through a central typed event wrapper that rejects content-bearing fields, test payloads in CI, maintain event schema/version and consent state, and document data processors/retention in privacy materials.

## 8. Acceptance criteria and self-review

- Metrics include activation, retention, engagement, satisfaction, performance/reliability, crash rate, and conversion readiness.
- Each metric has a denominator/formula, decision use, privacy constraints, and provisional target or explicit exploratory status.
- Event taxonomy prevents collection of capsule/prompt content and core use works without analytics.
- Review cadence links evidence to launch/roadmap decisions.

Self-review: metrics privilege successful user handoffs and trust, not vanity activity or surveillance.

## 9. References

- [Document 02 — PRD](02_product_requirements_document.md)
- [Document 03 — Market Research](03_market_research.md)
- [Document 11 — Security Architecture](11_security_architecture.md)
- [Document 19 — Release Checklist](19_release_checklist.md)
- [Document 24 — Launch Strategy](24_launch_strategy.md)
- [Document 22 — Risk Register](22_risk_register.md)
