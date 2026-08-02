# Context Capsule — Execution Rules

**Status:** Binding operating procedure.  
**Precedence:** [`CLAUDE.md`](CLAUDE.md) (Document 17) is the contract and wins every conflict. This file is the *procedure* for executing against that contract — the ordered steps, the stop conditions, and the exact commands. If this file and `CLAUDE.md` ever disagree, `CLAUDE.md` is right and this file is the defect.

These rules are specific to Context Capsule: a local-first Chrome MV3 extension that moves a user-reviewed context capsule between ChatGPT, Claude, and Gemini. They are not generic engineering advice.

---

## Rule 0 — The three questions

Before any task, answer these out loud. If you cannot, you are not ready to start.

1. **What is the narrow task?** State it in one sentence, with its acceptance criteria.
2. **Which milestone owns it?** One [Document 20](docs/20_mvp_roadmap.md) milestone at a time.
3. **Does it touch trust?** Permissions, data egress, capsule schema, auto-send, draft preservation, or user consent. If yes, stop and read [§3](#3-stop-conditions).

---

## 1. Session startup

Run in order, every session, before touching code:

| Step | Action |
| --- | --- |
| 1 | Read [`CONTEXT.md`](CONTEXT.md) — current sprint, milestone status, open blockers, verified commands |
| 2 | Read [`CLAUDE.md`](CLAUDE.md) — the binding contract |
| 3 | Read the numbered document that owns the area you are changing ([Document 00](docs/00_documentation_architecture.md) says which) |
| 4 | Read [`OWNER_ACTIONS.md`](OWNER_ACTIONS.md) — is this task blocked on the owner? |
| 5 | `git status` and `git log --oneline -5` — know what is uncommitted and what shipped last |
| 6 | Restate the task, acceptance criteria, and security/privacy impact |

Never start from an assumption about project state. `CONTEXT.md` is the state.

---

## 2. Scope gate

Context Capsule's value is that it is small and trustworthy. Scope creep is the primary failure mode, not slow delivery.

Ask, in this order:

- **Is this 1A?** Local capture, review, library, import, export, insert. That is the only release-blocking work.
- **Is it 1B (sync) or 1C (smart drafting)?** Both are separately gated and **not open**. They may not be started, and may not be smuggled into 1A as "groundwork".
- **Does core functionality still work with no account, no network, no API key, no analytics, and no smart service?** If a change breaks that, it is wrong regardless of how useful it is.

---

## 3. Stop conditions

Stop and ask the product owner. Do not resolve these by assumption, and do not pick the interpretation that makes the task easier.

| Trigger | Why it stops |
| --- | --- |
| New browser permission, host match, or `<all_urls>` | [Document 11](docs/11_security_architecture.md) review required |
| Any new data destination, network call, or telemetry | Privacy contract; needs just-in-time consent design |
| Change to `schemaVersion` or a canonical capsule field | [Document 10](docs/10_capsule_specification.md) migration and compatibility review |
| Adding a provider beyond ChatGPT, Claude, Gemini | Formal scope change |
| Anything on the **Do not change list** in `CONTEXT.md` | Explicitly protected |
| Teams, payments, sharing, integrations, vector search, memory graph, routing, mobile, other browsers | Out of V1 by decision, not by omission |
| Legal, security, retention, pricing, or consent-copy ambiguity | Not an engineering judgement call |
| A numbered document contradicts another | Apply the [Document 00](docs/00_documentation_architecture.md) conflict rule, then record the resolution |

When you stop: present the problem, the options, the impact, and one recommended constrained path. Add it to [`OWNER_ACTIONS.md`](OWNER_ACTIONS.md) if it needs the owner.

---

## 4. Milestone discipline

```text
M0 Foundation → M1 Local Capsule Engine → M2 ChatGPT transfer
 → M3 Claude/Gemini transfer → M4 1A release readiness → Public beta
                                  ├→ M5 optional sync (1B, gated)
                                  └→ M6 optional smart draft (1C, gated)
```

- Finish, verify, document, and commit a milestone before starting the next.
- A later milestone never compensates for an incomplete earlier one. No adapter work (M2) before the local engine (M1) is real.
- `main` stays releasable at every commit.

---

## 5. Implementation rules

### 5.1 Type and boundary rules

- TypeScript strict. No suppressed errors, no broad `any`. Use `unknown` at every untrusted boundary and narrow explicitly.
- Respect the [Document 14 §2](docs/14_project_structure.md) package boundaries. They are enforced by lint and by the split typecheck programs — if a boundary rule fires, the design is wrong, not the rule.
- `capsule-schema` stays platform-neutral: no React, Chrome APIs, Supabase, DOM, or Node built-ins. If you need `TextEncoder`, `URL`, or `crypto`, read them off `globalThis` through a narrow local interface (AD-08). **Never** add `lib.dom` or `@types/node` to the first typecheck program to make an error go away — that silently grants `fetch`, `localStorage`, and `document` to the portable contract.

### 5.2 Provider rules

- Provider DOM selectors and event mechanics live **only** inside adapter modules. Never in UI, core, or storage code.
- A provider failure must degrade to a working local library plus Copy/Export. It must never lose a capsule or break the host page.
- Every adapter needs a fixture. Fixtures use synthetic conversation content only — never real user chats.
- Treat all host DOM as hostile input.

### 5.3 Trust rules — non-negotiable

- Insertion **never** auto-sends.
- Insertion **never** overwrites existing draft text.
- The user reviews what was captured before it is saved. Capsules stay editable.
- Never execute imported content. Imports are data.
- Never store, export, sync, or log API keys, auth tokens, provider cookies, hidden system prompts, or file contents.
- Never label a Quick Capture as an AI-generated summary, and never claim perfect conversation continuity.

### 5.4 State and failure rules

- User data lives in durable local storage. Service-worker memory is never durable state.
- No `TODO` placeholders in a user-reachable path.
- A feature is not built until **loading, empty, error, cancellation, and recovery** states all work.
- Make failures actionable. The preferred recovery paths are Copy, Export, Retry, and Manual capsule — in that order.

---

## 6. Verification

Nothing is "done" until these pass and you have the output.

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm check:docs
```

`pnpm verify` runs all six in sequence. It needs a real `pnpm` on `PATH`; if only Corepack is available, run each gate as `corepack pnpm <script>` and say so when reporting.

Area-specific evidence, in addition:

| Change type | Additional evidence required |
| --- | --- |
| Capsule schema or codec | Round-trip test, version-compatibility test, migration note |
| Provider adapter | Fixture test **and** live smoke on the real site |
| Permissions, consent, or data flow | [Document 11](docs/11_security_architecture.md) checklist and review |
| UI | Screenshot or recording, including the error and empty states |
| Release | [Document 19](docs/19_release_checklist.md) evidence — a green build is not a release |

**Reporting rules.** Report exact results. If a command fails for a pre-existing reason, state that exact limitation. If you could not verify something, say which thing and why. Never write "tests pass" without having run them, and never let a local pass be described as a CI pass.

---

## 7. Documentation and GitHub update rule

**Standing product-owner instruction, 2026-08-02: every change, modification, improvement, or creation updates the documentation and is pushed to GitHub. No exceptions, no batching "until later".**

For any change, before you call it finished:

1. **Owning numbered document** — update it if behaviour, a decision, or a contract changed.
2. **`CONTEXT.md`** — always. Current state, verification evidence, and known limitations.
3. **`README.md`** — update whenever status, commands, supported surface, repository layout, or setup changes. It must describe what is *actually* true, never what is planned.
4. **`OWNER_ACTIONS.md`** — add any new task that needs the owner, and tick off any that got resolved.
5. **[Document 10](docs/10_capsule_specification.md), [11](docs/11_security_architecture.md), and [12](docs/12_testing_strategy.md)** — keep synchronized with any capsule, security, or test-impacting change.
6. **Commit and push.**

Never advertise untested provider compatibility. Never replace evidence with assertion.

---

## 8. Commit and push

- Verify **before** committing, not after.
- Conventional Commits with a meaningful scope: `feat`, `fix`, `docs`, `test`, `refactor`, `chore`.
- One coherent change per commit. Explain breaking or security-sensitive changes in the body.
- **Current push policy:** branch protection is not configured yet, so [Document 15 §7](docs/15_github_workflow.md) bootstrap direct pushes to `main` are permitted. **The moment the owner enables branch protection, this ends** — switch to `feature/<issue>-short-description` branches and pull requests, and record the transition in `CONTEXT.md`.
- Never force-push a shared branch. Never commit secrets, `dist/`, `node_modules/`, or generated artifacts.

---

## 9. Definition of done

All of the following, or it is not done:

- [ ] Approved acceptance criteria met
- [ ] Loading, empty, error, cancellation, and recovery states work
- [ ] All six gates pass, with output
- [ ] Area-specific evidence collected (§6)
- [ ] Security, privacy, and accessibility impact reviewed
- [ ] Numbered docs, `CONTEXT.md`, `README.md`, and `OWNER_ACTIONS.md` accurate
- [ ] Focused conventional commit pushed
- [ ] Anything unverified stated plainly

Code that merely renders is not done. A plan is not done. Generated code is not done.

---

## 10. Quick reference

| Need | Go to |
| --- | --- |
| Current state, blockers, verified commands | [`CONTEXT.md`](CONTEXT.md) |
| Binding contract | [`CLAUDE.md`](CLAUDE.md) |
| What the owner must do | [`OWNER_ACTIONS.md`](OWNER_ACTIONS.md) |
| Which document owns an area | [Document 00](docs/00_documentation_architecture.md) |
| Product scope | [Document 02](docs/02_product_requirements_document.md) |
| Capsule format | [Document 10](docs/10_capsule_specification.md) |
| Security and privacy | [Document 11](docs/11_security_architecture.md) |
| Repository layout and boundaries | [Document 14](docs/14_project_structure.md) |
| Git, CI, review, release | [Document 15](docs/15_github_workflow.md) |
| Milestones | [Document 20](docs/20_mvp_roadmap.md) |
