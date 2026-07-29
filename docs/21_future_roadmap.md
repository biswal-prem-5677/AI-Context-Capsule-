# Context Capsule — Future Roadmap

**Document ID:** 21  
**Status:** Deliberately deferred; not a delivery commitment  
**Phase:** 3 — Delivery  
**Depends on:** Documents 02–03, 20, 22–25  
**Purpose:** Preserve valuable ideas without allowing them to expand the MVP or create unearned promises.

## 1. Admission rule

A future item may move into a funded roadmap only after user evidence, technical/security review, a narrow problem statement, success metric, owner, and updated PRD. “Users asked for it” alone is not enough. Nothing here is included in 1A, 1B, or 1C unless explicitly promoted.

## 2. Opportunity themes

| Theme | Candidate capability | User value | Why deferred / gate |
| --- | --- | --- |
| More surfaces | Firefox/Edge, additional AI websites, desktop/native clients | More handoff locations | Adapter/policy/support matrix must not weaken Chrome reliability. |
| Cross-device/team | Team libraries, sharing links, roles, comments, organization controls | Collaborative handoffs | Requires permissions, audit, retention, legal, and abuse design. |
| Knowledge retrieval | Search across capsule contents, semantic retrieval, timeline, memory graph | Discover prior work | Raises indexing/privacy/cost/quality complexity. |
| Integrations | GitHub, Notion, Drive, local project files, MCP | Richer project context | Requires OAuth/scopes/data mapping/third-party support. |
| Template/workflow | Reusable capsule templates, checklists, project rules | Faster repeated work | Validate distinction from prompts/Gems/rules; avoid product confusion. |
| Smarter transfer | Context fit scoring, destination-aware projection, model/router recommendations | Better quality/efficiency | Requires trustworthy evaluation, provider data/cost, user control. |
| Enterprise | SSO, SCIM, DLP, audit, residency, admin controls | Organization adoption | Fundamentally different compliance/operations product. |
| Monetization | Usage plans, hosted smart credits, billing | Sustainable service | Only after value/retention/consent model is validated. |

## 3. Candidate sequencing after MVP

```text
1A evidence → fix adoption/reliability friction
  → evaluate 1B sync demand → evaluate 1C smart draft quality
    → templates or limited extra providers
      → integrations/team/enterprise only with separate product track
```

The default next work after beta is defect/adoption improvement, not expansion. Add a provider only when the adapter model/fallback is proven and the target audience requests it. Add a feature only when it improves a documented job not met by export/import/copy.

## 4. Product boundaries and edge cases

- Team sharing must not expose local-only/private source excerpts by default.
- Search/memory must clearly distinguish exact stored data from AI-inferred summaries.
- Integrations must request least privilege, tolerate revocation, and never silently pull all third-party data.
- Any model router must explain criteria, cost, data destination, and user override; it cannot silently change model/provider.
- Supporting a new site means capture, insertion, unsupported fallback, visual/accessibility checks, and ongoing maintenance—not merely showing an icon.

## 5. Risks, alternatives, and implementation notes

The primary risk is turning Context Capsule into a broad “AI operating system” before validating a narrow transfer loop. Maintain an opportunity backlog rather than roadmap commitments. Alternative: build a team workspace first to chase larger contracts. Rejected until individual handoff value, security operations, and retention practices are proven. Each promoted opportunity requires an updated threat model, data-flow map, release checklist, and metric plan.

## 6. Acceptance criteria and self-review

- Every deferred capability has a clear reason it is outside MVP and a promotion gate.
- No future item conflicts with local-first/user-control positioning without an explicit new product decision.
- Document is used to protect scope, not to market unbuilt capability.

Self-review: all items complement rather than redefine the proven active-handoff purpose.

## 7. References

- [Document 02 — PRD](02_product_requirements_document.md)
- [Document 03 — Market Research](03_market_research.md)
- [Document 20 — MVP Roadmap](20_mvp_roadmap.md)
- [Document 22 — Risk Register](22_risk_register.md)
- [Document 23 — Known Limitations](23_known_limitations.md)
- [Document 25 — Success Metrics](25_success_metrics.md)
