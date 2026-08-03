# Context Capsule — Owner Actions

Everything here needs **you**, not an engineer or an AI agent. Each item is something that requires an account you own, an authority only you hold, a payment, a legal decision, or a human sitting in front of a real browser.

**How to use this file:** work top-down — Section A blocks current progress. Tick a box, and tell me which item you completed; I will verify what is verifiable, update `CONTEXT.md`, and remove the blocker. If an item turns out to be wrong or unnecessary, say so and I will delete it rather than leave it rotting here.

**Last reviewed:** 2026-08-03  
**Sources:** `CONTEXT.md` open decisions, [Document 15](docs/15_github_workflow.md), [Document 19](docs/19_release_checklist.md), [Document 20](docs/20_mvp_roadmap.md).

---

## A. Blocking right now

Milestone 0 closed on 2026-08-03 when you confirmed CI green (A1, now under Resolved). **Nothing in this section blocks Milestone 1** — M1a is underway. What remains here still matters for repository governance and for the M0 definition of done in [Document 15](docs/15_github_workflow.md), and A2 changes how I push.

### A2. Enable branch protection on `main`

- [ ] Settings → Branches → add a rule for `main`:
  - [ ] Require a pull request before merging
  - [ ] Require status checks to pass: `quality`, `docs`, `security`
  - [ ] Require branches to be up to date before merging
  - [ ] Require conversation resolution before merging
  - [ ] Block force pushes
- **Why you:** repository admin permission.
- **Effect:** ends the [Document 15 §7](docs/15_github_workflow.md) bootstrap allowance. From that moment I stop pushing to `main` directly and switch to branches and pull requests. **Tell me when you have done this** so I change behaviour and record the transition.
- **Blocks:** M0 definition of done.

### A3. Create the issue labels

- [ ] Type: `type:bug`, `type:feature`, `type:docs`, `type:security`, `type:test`, `type:chore`
- [ ] Area: `area:extension`, `area:adapter`, `area:capsule`, `area:dashboard`, `area:sync`, `area:docs`
- [ ] Priority: `p0`, `p1`, `p2`, `p3`
- [ ] State: `needs-triage`, `blocked`, `ready-for-review`, `release-blocker`, `good-first-issue`
- **Why you:** no `gh` CLI available in my environment to create them.
- **Consequence if skipped:** the issue templates already reference these labels; missing ones are silently dropped, so new issues arrive untriaged.

### A4. Enable private vulnerability reporting

- [ ] Settings → Security → Advanced Security → enable **Private vulnerability reporting**.
- **Why it matters:** `.github/SECURITY.md` tells reporters to use this channel. If it is off, that instruction is broken and someone may disclose a real vulnerability in a public issue instead.

### A5. Enable secret scanning and push protection

- [ ] Settings → Security → enable **Secret scanning** and **Push protection**.
- **Why you:** repository setting. CI has only a coarse committed-file check; this is the real control.

### A6. Decide repository visibility

- [ ] Public or private?
- **Why it matters:** it changes what is available for free — dependency graph, secret scanning, and private vulnerability reporting behave differently. It also determines whether the blueprint is publicly readable, which is a positioning decision, not a technical one.

### A7. Create GitHub milestones matching Document 20

- [ ] Foundation, Local Capsule Engine, ChatGPT Transfer, Cross-Provider Transfer, Sync Dashboard Beta, Smart Draft Beta, Release Readiness.
- **Why it matters:** [Document 15 §4](docs/15_github_workflow.md) tracks acceptance evidence per milestone.

### A9. Run `corepack enable` in an elevated shell *(local machine only)*

- [ ] Open PowerShell or Terminal **as Administrator**, then run `corepack enable`.
- **Why:** it writes shims next to the Node install in `C:\Program Files\nodejs`, which fails with `EPERM` from a normal shell. Without it, `pnpm verify` cannot chain and each gate must be run as `corepack pnpm <script>`.
- **Not a repository defect** — this is your machine only, and CI is unaffected.

---

## B. Needed for Milestones 1–3

### B1. Review Documents 01–05 and confirm product scope and positioning

- [ ] Vision, PRD, market research, UX, design system.
- **Blocks:** the Phase 1 review gate in [Document 00](docs/00_documentation_architecture.md).

### B2. Review Documents 06–12 with an engineering and security owner

- [ ] System architecture, extension, database, API, capsule spec, security, testing.
- **Note:** if you are the only owner, say so and I will treat your approval as final rather than waiting for a second reviewer who does not exist.

### B3. Live provider smoke testing

- [ ] Be available to run the 3×3 source-to-target matrix on real ChatGPT, Claude, and Gemini accounts.
- **Why you:** this genuinely cannot be automated or faked. Fixtures prove the parser; only a human on the real site proves the adapter. Required for M2 and M3 acceptance.

### B4. Extension identity

- [ ] Final extension name as it appears in Chrome.
- [ ] Icon set (16, 32, 48, 128 px).
- **Blocks:** M2 manifest, M4 packaging.

---

## C. Needed before any public release

### C1. Legal entity

- [ ] Who publishes this — an individual or a registered entity?

### C2. Privacy policy

- [ ] Approved text and a public URL to host it.
- **Required by:** the Chrome Web Store, and by the privacy claims the product makes.

### C3. Support contact

- [ ] A monitored address or channel for user reports.

### C4. Security contact

- [ ] A dedicated address for vulnerability reports.
- **Current state:** `.github/SECURITY.md` says explicitly that no such address exists yet. Replace that note once you have one.

### C5. Chrome Web Store developer account

- [ ] Register (one-time fee) and complete publisher verification.
- **Why you:** payment and identity verification.

### C6. Store listing assets

- [ ] Listing description, screenshots, promotional images, category, and the permission justification text Google requires.

### C7. Repository license

- [ ] Choose one, or confirm all-rights-reserved.
- **Current state:** `package.json` says `UNLICENSED` and the README says all rights reserved. No one can legally contribute or reuse until you decide.

### C8. Diagnostics posture

- [ ] Confirm: ship with **no** analytics and no telemetry.
- **Default if you say nothing:** none. That is the privacy-safe default and matches the current documents.

---

## D. Optional 1B / 1C gates — closed until you open them

Nothing here is needed for the 1A beta. Do not let these delay it.

### D1. Sync (1B)

- [ ] Decide whether sync ships in the first public beta.
- [ ] Supabase account or organisation, region, and backup policy.
- [ ] Vercel account and project for the dashboard.
- [ ] OAuth provider setup and redirect URLs.

### D2. Smart drafting (1C)

- [ ] Model provider and cost ceiling.
- [ ] Data retention terms and the consent copy users will actually see.
- [ ] Or: formally defer 1C so it stops appearing in planning.
- **Note:** this one has legal and privacy exposure. It needs a real decision, not a default.

---

## E. Ongoing

- [ ] Approve any scope change in writing before I build it. If I ask, it is because [`EXECUTION_RULES.md §3`](EXECUTION_RULES.md) says I must stop.
- [ ] Re-run live provider smoke tests after a provider visibly changes its UI. Provider DOM drift is the project's top known risk.
- [ ] Review batched dependency updates when I raise them.

---

## Resolved

Move items here with a date when they are done, rather than deleting them — a resolved blocker is useful history.

### A1. Confirm the first CI runs are green — resolved 2026-08-03

- [x] The `quality`, `docs`, and `security` workflows are green on `main`.
- **Confirmed by the owner from the Actions tab.** I could not verify this myself: no `gh` CLI in my environment, and the GitHub API returns 404 for the repository from here.
- **Effect:** the last Milestone 0 acceptance criterion — "CI green" in [Document 20 §2](docs/20_mvp_roadmap.md) — is met. M0 is closed and Milestone 1 has started.
- **Standing limitation:** I still cannot observe CI. Every future run is green only when you say it is, or when the `gh` CLI becomes available here. A local `pnpm verify` pass is not a CI pass and will never be reported as one.

### A8. Approve the 1A scope and the 1B/1C gates — resolved 2026-08-03

- [x] 1A is Chrome MV3; ChatGPT, Claude, and Gemini web; local capture, review, library, import, export, and insert.
- [x] 1B sync and 1C smart drafting stay closed until the owner explicitly opens them.
- **Approved as documented**, with no changes requested. Recorded under "Confirmed by the product owner" in [`CONTEXT.md`](CONTEXT.md).
- **Effect:** Milestone 1 is no longer blocked on scope. Changing this scope now needs a new written owner decision, not an engineering judgement.
