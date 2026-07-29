# Context Capsule

Context Capsule is a Chrome extension and small web dashboard that lets a user move an AI conversation from ChatGPT, Claude, or Gemini without reconstructing the project context by hand.

The V1 promise is deliberately narrow: **generate a reviewed context capsule, then import it into another supported AI chat in one clear action.**

This repository currently contains the complete, implementation-ready documentation blueprint. It is deliberately organized for review before any application code is written; start with the [documentation architecture](docs/00_documentation_architecture.md), [project vision](docs/01_project_vision.md), and [canonical PRD](docs/02_product_requirements_document.md).

## V1 boundaries

Included in the release-blocking core: Chrome, ChatGPT, Claude, Gemini, local capsule create/import/export/library, and reviewed composer insertion. Signed-in cloud sync/dashboard and AI drafting are separately gated optional beta capabilities.

Explicitly excluded: payments, teams, integrations, semantic search, model routing, mobile, Firefox/Edge packaging, and automatic cross-provider conversation continuation.

## Historical baseline drafts

These early unnumbered drafts are retained for history. The numbered blueprint below supersedes them where it covers the same area.

- [Early requirements draft](docs/PRODUCT-REQUIREMENTS.md)
- [Early architecture draft](docs/ARCHITECTURE.md)
- [Early delivery draft](docs/DELIVERY-PLAN.md)

## Canonical blueprint

The numbered documents are the review-ready source of truth. Documents 16 and 17 intentionally live at repository root as [CONTEXT.md](CONTEXT.md) and [CLAUDE.md](CLAUDE.md).

- Phase 1: [Vision](docs/01_project_vision.md), [PRD](docs/02_product_requirements_document.md), [Market research](docs/03_market_research.md), [UX](docs/04_user_experience.md), [Design system](docs/05_ui_design_system.md)
- Phase 2: [System architecture](docs/06_system_architecture.md), [Extension](docs/07_browser_extension_architecture.md), [Database](docs/08_database_design.md), [APIs](docs/09_api_specification.md), [Capsule format](docs/10_capsule_specification.md), [Security](docs/11_security_architecture.md), [Testing](docs/12_testing_strategy.md)
- Phase 3: [Deployment](docs/13_deployment_strategy.md), [Structure](docs/14_project_structure.md), [GitHub workflow](docs/15_github_workflow.md), [Installation](docs/18_installation.md), [Release checklist](docs/19_release_checklist.md), [MVP roadmap](docs/20_mvp_roadmap.md), [Future roadmap](docs/21_future_roadmap.md), [Risks](docs/22_risk_register.md), [Known limitations](docs/23_known_limitations.md), [Launch](docs/24_launch_strategy.md), [Metrics](docs/25_success_metrics.md)
