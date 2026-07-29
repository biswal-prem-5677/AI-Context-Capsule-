# Context Capsule — Technical Architecture (V1)

## Architecture at a glance

```text
Supported AI site
  └─ Content script + provider adapter
       ├─ Extract visible turns / find native composer
       └─ Inject accessible Capsule control
                    │
Chrome extension (MV3)
  ├─ React popup + review/import views
  ├─ Service worker / message routing
  ├─ IndexedDB local capsule repository
  ├─ Capsule schema, prompt generator, import/export
  └─ Optional sync client ──────────────┐
                                           │
Web dashboard (React) ────────────────────┼─ Supabase Auth, Postgres, Storage
                                           │
Optional user-approved summarizer ────────┘
```

## Repository layout

```text
capsule/
  apps/
    extension/        # Manifest V3, content scripts, popup/options UI
    dashboard/        # Vite React dashboard, deployed to Vercel
  packages/
    capsule-schema/   # Zod schema, JSON/Markdown codecs, fixtures
    capsule-core/     # prompt composition, redaction helpers, merge rules
    provider-adapters/ # chatgpt, claude, gemini DOM adapters
    ui/               # small shared design tokens/components only when needed
  supabase/
    migrations/
    functions/        # only if hosted summarization is approved
  docs/
  .github/workflows/
```

Use pnpm workspaces, TypeScript, Vite, React, Tailwind, shadcn/ui primitives, Zod, IndexedDB via Dexie, Vitest, and Playwright. Adopt a component library only after the first extension screen is functional; avoid a broad design-system build.

## Extension design

### Manifest and permissions

- `manifest_version: 3`; background service worker.
- `activeTab`, `storage`, and `scripting` are preferred. Use static host permissions only for the three supported domains when dynamic injection is insufficient.
- Content scripts communicate with the service worker through typed messages; they never communicate directly with Supabase.
- Content scripts must be defensive: mount once, observe relevant DOM changes, clean up on navigation, and namespace all injected elements/styles.

### Provider adapter contract

```ts
type ProviderAdapter = {
  provider: "chatgpt" | "claude" | "gemini";
  canHandle(): boolean;
  getConversationMeta(): Promise<{ title?: string; url: string }>;
  getTurns(): Promise<Array<{ role: "user" | "assistant"; text: string }>>;
  getComposer(): HTMLElement | null;
  insertIntoComposer(text: string): Promise<void>;
};
```

Selectors live only inside the adapter module. Each adapter has DOM fixtures representing a current stable provider layout. An adapter failure emits a non-content diagnostic code and presents a graceful fallback.

### Local persistence

Dexie tables:

| Table | Key fields | Purpose |
| --- | --- | --- |
| `capsules` | `id`, `title`, `updatedAt`, `syncState` | Canonical capsule plus local metadata. |
| `operations` | `id`, `capsuleId`, `type`, `createdAt` | Queued sync operations, never raw transcript unless explicitly enabled. |
| `settings` | `key` | Account metadata, consent, local feature preferences. |

Store optional provider configuration in `chrome.storage.local`, separate from the content repository. Use extension messages for cross-context reads/writes.

## Data and cloud sync

Use Supabase only for opted-in identity and sync.

```sql
create table capsules (
  id uuid primary key,
  owner_id uuid not null references auth.users(id),
  payload jsonb not null,
  updated_at timestamptz not null,
  created_at timestamptz not null default now()
);
alter table capsules enable row level security;
create policy "users manage their own capsules"
  on capsules for all using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);
```

Do not create a storage bucket in V1 unless an approved attachment feature is added. The product does not need file attachments to fulfill its promise.

Sync algorithm:

1. Commit edits locally first.
2. Queue an upsert/delete with `updatedAt` and a device operation ID.
3. On authentication/network availability, synchronize the queue.
4. If remote is newer and local differs, keep a local conflicted copy and surface the choice; never silently discard edits.

## Prompt generation

`composePrompt(capsule, mode, existingDraft)` creates plain text, not HTML.

Required sections in order: handoff directive, goal, current state, decisions, constraints, completed work, relevant files/references, pending tasks, open questions, source note. Append an existing draft after `--- User draft ---`.

Token limits are budgets, not guarantees. Compact mode selects required fields plus the newest/highest-priority entries. Full mode includes all canonical fields within the maximum. If a field is truncated, state this explicitly in the rendered prompt.

## Smart summarization boundary

Quick mode has no network call. It creates a fielded draft and optional bounded source excerpt for user review.

Smart mode is an adapter with this interface:

```ts
type Summarizer = {
  summarize(input: { turns: Turn[]; existingDraft: CapsuleDraft }): Promise<CapsuleDraft>;
};
```

It cannot save, export, or sync. It receives only the turns the user approved. Provider calls require a separate consent toggle and a visible statement of provider/model and data destination. Hosted summarization must go through a server-side endpoint with rate limits and a documented retention policy; it must not expose service keys in the extension.

## Deployment topology

| Component | Deployment |
| --- | --- |
| Dashboard | Vercel production and preview deployments. |
| Auth/database | Supabase project with migrations applied in CI/staging first. |
| Extension | Signed, zipped MV3 bundle uploaded manually to Chrome Web Store until publishing automation is intentionally configured. |
| Documentation | Repository README and `docs/`; support/privacy URLs referenced by store listing. |

Secrets exist only in CI/deployment configuration or approved backend infrastructure. No `.env` file is committed. Supply `.env.example` with variable names and non-sensitive placeholders.

## Threat model essentials

- Imported capsule text is untrusted input: validate with Zod, cap size, and render as text/escaped Markdown.
- Host pages are untrusted: avoid using their JavaScript APIs; extract DOM text only and do not expose extension internals to page scripts.
- Avoid broad host permissions and remote code. MV3 bundle contains all executable code.
- Put content in logs only when the user explicitly exports it; telemetry and crash reports contain identifiers/error codes, never capsule text.
- Test RLS with authenticated requests from two test users before enabling sync.

## Observability and recovery

- Local structured logs: provider, adapter version, error code, and timestamp only.
- Sentry/telemetry is optional and disabled until consent/privacy approval.
- Every sync failure remains retryable and locally exportable.
- Dashboard errors show a recovery action, not a generic silent failure.
