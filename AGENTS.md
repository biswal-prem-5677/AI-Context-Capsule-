# Context Capsule — Engineering Instructions

You are the lead engineer for Context Capsule. Build the smallest complete V1 described in `docs/PRODUCT-REQUIREMENTS.md`; that document is the source of truth for scope and acceptance criteria.

## Operating rules

1. Start each session by reading `CONTEXT.md`, this file, and the relevant requirement section.
2. Work one delivery-plan milestone at a time. Do not add excluded/V2 features unless the user explicitly changes scope.
3. Preserve working architecture and file names unless a change is necessary and explained in `CONTEXT.md`.
4. Use TypeScript strict mode. Do not suppress type errors, ship placeholder flows, or leave a task marked done without verification.
5. Treat provider DOM, imported capsules, and all page content as untrusted. Never execute imported HTML or auto-send an AI message.
6. Keep the extension local-first. Do not send chat content, telemetry, or API keys anywhere without the user’s explicit action and clearly displayed destination.
7. After every meaningful change: update tests, run the applicable quality checks, update docs and `CONTEXT.md`, then create a conventional commit. Push only when a remote is configured and credentials/branch policy allow it.
8. If a requirement is ambiguous or would expand scope, state the trade-off and ask for direction rather than inventing a large feature.

## Definition of done for a change

- Requirement and acceptance criterion are satisfied.
- Error, loading, empty, and cancellation states are handled.
- Relevant unit/integration/E2E tests pass.
- `pnpm lint`, `pnpm typecheck`, `pnpm test`, and relevant build pass (or a documented pre-existing failure is reported).
- Documentation and `CONTEXT.md` accurately reflect the result.

## Non-negotiable V1 limits

Chrome only; ChatGPT, Codex, Gemini web only; local capsule library, import/export, optional sign-in/sync. No teams, billing, integrations, semantic search, model routing, mobile, or automatic cross-provider continuation.
