# Context Capsule — GitHub Workflow

**Document ID:** 15  
**Status:** Draft  
**Phase:** 3 — Delivery  
**Depends on:** Documents 12–14  
**Purpose:** Define the contribution, review, CI, and release workflow that keeps the project deployable and traceable.

## 1. Repository and branch strategy

Use protected trunk-based development:

- `main` is always releasable; direct pushes are disabled after bootstrap.
- Short-lived branches use `feature/<issue>-short-description`, `fix/<issue>-short-description`, `docs/<issue>-short-description`, or `chore/<issue>-short-description`.
- `release/*` branches are not used for routine work; use a temporary release branch only for an approved stabilization exception.
- Hotfix branches are `hotfix/<issue>-short-description` from the current production tag and merge back to `main`.

Every change has an issue or documented reason. Avoid long-lived personal branches, force pushes to shared branches, and unreviewed generated artifacts.

## 2. Commit and pull-request conventions

Use Conventional Commits:

```text
feat(extension): add ChatGPT capture adapter
fix(import): reject unsafe markdown links
docs(prd): clarify 1B sync release gate
test(schema): cover incompatible major version
chore(ci): add dependency vulnerability scan
```

Each commit is focused, buildable when practical, and explains breaking/security-sensitive changes in its body. PRs include: problem/goal, scope/non-goals, linked issue, decision/doc impact, screenshots or recording for UI, test evidence, privacy/permission/API impact, rollback notes, and `CONTEXT.md` update confirmation.

## 3. Review rules

| Change type | Required reviewers/evidence |
| --- | --- |
| UI/feature | One code owner; UX evidence for core flow changes |
| Provider adapter | Adapter owner + fixture and live-smoke plan |
| Schema/API/database | Architecture owner + migration/compatibility tests |
| Security/permissions/auth/secrets | Security owner + Document 11 check + threat impact |
| Release/deployment | Release owner + checklist evidence |
| Documentation-only | Owner of affected decision document |

Reviewers verify scope, correctness, errors/edge cases, tests, accessibility, privacy, performance impact, documentation, migration/rollback, and no unrelated refactor. “Looks good” is not enough for high-risk changes; record evidence/decision.

## 4. Issues, labels, and milestones

Issue templates: bug report (content-safe reproduction), feature proposal (problem/value/non-goals), adapter regression, security report guidance, documentation decision, and release task.

Labels:

| Group | Labels |
| --- | --- |
| Type | `type:bug`, `type:feature`, `type:docs`, `type:security`, `type:test`, `type:chore` |
| Area | `area:extension`, `area:adapter`, `area:capsule`, `area:dashboard`, `area:sync`, `area:docs` |
| Priority | `p0`–`p3` |
| State | `needs-triage`, `blocked`, `ready-for-review`, `release-blocker`, `good-first-issue` |

Milestones align to Document 20: Foundation, Local Capsule Engine, ChatGPT Transfer, Cross-Provider Transfer, Sync Dashboard Beta, Smart Draft Beta, Release Readiness. No issue is moved to Done until its acceptance/verification evidence is linked.

## 5. GitHub Actions and required checks

| Workflow | Trigger | Required result |
| --- | --- | --- |
| `quality.yml` | PR/push | install with lockfile, formatting/lint, typecheck, unit tests, build |
| `integration.yml` | PR paths/scheduled | IndexedDB, schema codecs, adapter fixtures, API/RLS test suite where configured |
| `e2e.yml` | PR/release candidate | Critical extension/local-fixture journeys, artifacts/screenshots on failure |
| `security.yml` | PR/scheduled | dependency review/audit, secret scan, static security checks, manifest permission diff |
| `docs.yml` | PR | Markdown links/lint, document-index/cross-reference check |
| `release.yml` | signed tag/manual approval | immutable artifacts, checksums, release notes, deployment candidate; no automatic store promotion initially |

Required main-branch checks: quality, affected integration/E2E, security, docs, and at least one approving review. Branch protection requires up-to-date branch, resolved conversations, no force push, and signed/verified release tags if organizational policy supports it.

## 6. Release process

1. Freeze new feature merge at approved release candidate.
2. Run Document 19 evidence collection and live provider smoke matrix.
3. Create `vX.Y.Z` tag from approved `main` commit; CI builds/version-locks artifacts.
4. Deploy optional cloud/dashboard staging then production under approval; upload extension beta/staged release.
5. Monitor non-content health signals, support reports, and rollback criteria.
6. Publish release notes with supported surfaces, permissions/data changes, known limitations, and rollback status.

## 7. Risks, alternatives, and implementation notes

GitHub “push after every edit” is not a safe policy if it produces unreviewed/broken commits or exposes secrets. Instead, commit each coherent verified change promptly and push through protected-branch PR workflow. Direct commits during initial bootstrap are allowed only until branch protection/remote are configured, then record the transition in `CONTEXT.md`.

GitFlow is rejected because release branches add overhead for a small MVP. Squash merging is preferred for feature PRs to keep `main` readable; preserve detailed commit history for release/security changes when useful. Tool configuration names/commands are finalized during Milestone 0.

## 8. Acceptance criteria and self-review

- A contributor can create, review, test, merge, and release a scoped change without guessing governance rules.
- Core security/schema/adapter/deployment changes have explicit additional review/evidence paths.
- CI blocks quality/security/documentation regressions appropriate to the changed area.
- Commit/push guidance favors a deployable protected main branch rather than indiscriminate automation.

Self-review: workflow matches the local-first MVP and satisfies the requirement for conventional, documented, verifiable delivery.

## 9. References

- [Document 12 — Testing Strategy](12_testing_strategy.md)
- [Document 13 — Deployment Strategy](13_deployment_strategy.md)
- [Document 14 — Project Structure](14_project_structure.md)
- [Document 18 — Installation](18_installation.md)
- [Document 19 — Release Checklist](19_release_checklist.md)
- [Document 20 — MVP Roadmap](20_mvp_roadmap.md)
