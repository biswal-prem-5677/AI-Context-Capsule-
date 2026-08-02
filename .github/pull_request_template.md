<!--
Document 15 §2. Fill in what applies and delete what does not — an honest "N/A" is
better than a checked box with no evidence behind it.
-->

## Problem and goal

<!-- What is wrong or missing today, and what does this change achieve? -->

## Scope and non-goals

<!--
What this PR deliberately does not do. If you found adjacent problems, list them here
and open issues rather than widening the diff.
-->

## Linked issue

<!-- Closes #NNN, or the documented reason there is no issue. -->

## Decision and documentation impact

- [ ] Numbered document(s) updated, or no change was needed
- [ ] `CONTEXT.md` updated with current state, verification, and known limitations
- [ ] README reflects real, evidenced status only

Documents touched:

## Verification evidence

Paste actual command output or link the CI run. Do not assert a gate passed without it.

```text
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm check:docs
```

Manual checks performed:

## Scope guardrails (Document 17 §3)

- [ ] Core capture/review/library/import/export/insert still works with no account,
      network, API key, or smart service
- [ ] Insertion never auto-sends and never overwrites an existing draft
- [ ] Provider DOM selectors stay inside adapter modules; a provider failure cannot
      break the local library
- [ ] No V2 scope added (teams, payments, sharing, integrations, vector search,
      memory graph, routing, mobile, other browsers)

## Privacy, permission, and API impact

<!--
New host permissions, new data destinations, schema or public contract changes, or
anything touching consent. If any of these apply, this PR needs the Document 11 review
path — say so explicitly.
-->

- [ ] No new browser permission, host access, or data egress
- [ ] No secret in source, logs, capsules, exports, tests, or screenshots
- [ ] Untrusted input (host DOM, imports, messages, API responses) is validated

## UI evidence

<!-- Screenshot or recording for any user-visible change, including error and empty states. -->

## Rollback

<!-- How to revert safely. Note any migration or stored-data implication. -->
