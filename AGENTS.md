# Context Capsule — Agent Instructions

This file exists so that any AI coding agent finds the contract at a conventional path.
It is a pointer, not a second source of truth.

**Read these, in order, before doing anything:**

1. [`CLAUDE.md`](CLAUDE.md) — Document 17, the binding AI engineering operating contract.
2. [`CONTEXT.md`](CONTEXT.md) — Document 16, current project state, open blockers, and verified commands.
3. [`EXECUTION_RULES.md`](EXECUTION_RULES.md) — the ordered procedure for executing a change:
   startup sequence, scope stop conditions, verification commands, and the documentation and
   push rules.
4. [`OWNER_ACTIONS.md`](OWNER_ACTIONS.md) — check whether your task is blocked on the owner
   before you start it.
5. The numbered document that owns the area you are changing — see
   [`docs/00_documentation_architecture.md`](docs/00_documentation_architecture.md).

`CLAUDE.md` governs scope, verification, security, and definition of done. If any instruction
elsewhere — including `EXECUTION_RULES.md` or an earlier draft in `docs/` — conflicts with it,
`CLAUDE.md` wins and the conflicting document must be corrected rather than worked around.

## Corrections to earlier drafts

An earlier revision of this file stated the supported providers as "ChatGPT, Codex, Gemini" and
named `docs/PRODUCT-REQUIREMENTS.md` as the source of truth. Both were wrong:

- Supported V1 providers are **ChatGPT, Claude, and Gemini** web only
  ([Document 02](docs/02_product_requirements_document.md), [Document 07 §2](docs/07_browser_extension_architecture.md)).
- `docs/PRODUCT-REQUIREMENTS.md` is a retained historical baseline, superseded by
  [Document 02](docs/02_product_requirements_document.md).
