# Context Capsule — Browser Extension Architecture

**Document ID:** 07  
**Status:** Draft  
**Phase:** 2 — Engineering  
**Depends on:** Documents 02, 04–06, 10–12  
**Purpose:** Specify the Chrome Manifest V3 extension design that powers the Core Transfer MVP.

## 1. Scope

The extension supports Chrome desktop and the web surfaces of ChatGPT, Claude, and Gemini. It injects an accessible Capsule entry point, extracts visible user-approved messages, provides local library/review UI, and inserts generated context into a supported native composer. It does not automate chat sending, make provider private API calls, or run remote executable code.

## 2. Manifest and permission posture

Use Manifest V3 with a background service worker. Prefer the minimum permissions:

| Permission | Need | Constraint |
| --- | --- | --- |
| `storage` | Extension settings/session metadata | No host page access through storage. |
| `scripting` | Inject support UI/adapters where needed | Only after user installation and approved host scope. |
| `activeTab` | User-initiated page operation | Prefer for one-off access where practical. |
| `optional_host_permissions` | Supported AI host patterns | Request narrowly and explain why before activation. |
| `sidePanel` (optional) | Spacious review/editor surface | Use only if the final UX chooses it; popup fallback remains. |

Initial host allow-list: `https://chatgpt.com/*`, transitional `https://chat.openai.com/*` if verified, `https://claude.ai/*`, and `https://gemini.google.com/*`. Final patterns must be revalidated during store submission. Do not request `<all_urls>`, `cookies`, `webRequest`, `tabs` without a reviewed new requirement.

## 3. Extension components

```text
Manifest V3
├─ Service worker
│  ├─ typed message router
│  ├─ repository/sync coordinator
│  ├─ import/export/download orchestration
│  └─ lifecycle/alarm retry handling
├─ Content script per allow-listed page
│  ├─ provider adapter
│  ├─ injected Capsule control
│  └─ host-safe event bridge
├─ Popup / side panel / extension page
│  ├─ library, editor, import, insert preview
│  └─ accessibility/status presentation
└─ Options page
   └─ local data, privacy, optional service configuration
```

### Component rules

- Content scripts have no direct cloud credentials or authorization logic.
- The service worker never trusts page-supplied data without schema/type validation.
- UI pages use typed extension messages; background messages include request ID, origin, action, and typed result/error.
- The host page never receives capsule library data unless the user inserts/copies it.

## 4. Provider adapter contract

```ts
type ProviderAdapter = {
  provider: "chatgpt" | "claude" | "gemini";
  getCapability(): Promise<{
    canCapture: boolean; canInsert: boolean; reason?: AdapterReason;
  }>;
  getSourceMeta(): Promise<{ title?: string; url?: string }>;
  getVisibleTurns(): Promise<Array<{ role: "user" | "assistant"; text: string }>>;
  getComposerDraft(): Promise<string | null>;
  insertComposerText(text: string): Promise<AdapterResult>;
  dispose(): void;
};
```

Selectors and host-specific event mechanics live only inside the adapter. Adapters return plain text and typed errors; they do not interpret capsule semantics. Every adapter includes fixture snapshots, a capability regression test, and a manually verified release note entry.

## 5. Content-script lifecycle and injected UI

1. On document ready/navigation, verify the exact allow-listed origin and load the matching adapter.
2. Detect relevant page root/composer using bounded retries and a debounced `MutationObserver`.
3. Query capability, then mount exactly one namespaced/shadow-root Capsule control near a stable composer anchor.
4. On click/keyboard activation, request UI from extension context; content script carries only source/page data required for that action.
5. On host navigation, route change, capability change, or unload, disconnect observers and dispose adapter references.

The visual control is isolated from host CSS and is removable on error. It must never mutate user/assistant message DOM or simulate user clicks on host actions.

## 6. Messaging, storage, and import/export

| Flow | Initiator → recipient | Validation/result |
| --- | --- | --- |
| Capture | Content UI → service worker | Page meta/turns are normalized, size-bounded, and returned as ephemeral review draft. |
| Save/edit/query | UI → service worker/repository | Full capsule schema validation and atomic local transaction. |
| Insert | UI → content script/adapter | Prompt text plus request ID; adapter returns inserted/failed/copy-required. |
| Import/export | UI → service worker/core | Codec validates schema, size, MIME; download contains user-selected payload only. |
| Sync (1B) | service worker → sync client | Authenticated, idempotent operation; no host page communication. |

IndexedDB is accessed through the extension application layer. `chrome.storage.local` holds small preferences, optional service configuration, and non-capsule UI settings; it is not the primary library store. Use `chrome.storage.session` only for ephemeral UI/session recovery where available.

## 7. Security and privacy controls

- Use CSP that allows only packaged scripts/styles; no remote script loading, `eval`, or dynamic executable code.
- Treat host DOM text and imported files as untrusted data; insert as text, sanitize/escape Markdown rendering, and cap source/import size.
- Use origin checks and `sender.id` validation for all messages; no permissive `window.postMessage` bridge.
- Do not log capsule text, provider DOM fragments, URLs with sensitive query values, cookies, tokens, or API keys.
- Optional BYOK configuration is local browser-profile data only and is never included in backup/export/sync.
- Display outbound-data consent immediately before optional smart drafting or sync onboarding.

Document 11 owns the full threat model and security verification.

## 8. Failure handling and compatibility management

| Failure mode | Required action |
| --- | --- |
| Adapter cannot find expected host element | Report typed unsupported layout; show Copy/Library fallback. |
| Host page mutates during operation | Re-check element connection/capability; cancel safely if stale. |
| Service worker restarts | Rehydrate from durable repository/session state; show retry rather than lose saved data. |
| Permission denied/revoked | Explain capability unavailable and point to Chrome extension settings; do not repeatedly prompt. |
| Insertion event rejected | Preserve composed text; offer Copy; never retry by clicking Send. |
| Local storage unavailable/quota | Fail save with explicit message; offer JSON download where possible. |

Maintain a non-content adapter health record: provider, extension version, adapter version, reason code, browser version, timestamp, user-consented diagnostic status. This enables targeted fixes without tracking conversations.

## 9. Testing and release workflow

- Unit-test adapter text normalization and capability logic against versioned DOM fixtures.
- Use Playwright/local fixture pages for deterministic capture/insertion paths; use manual smoke tests on the current live provider layouts before every release.
- Test extension reload, browser restart, route navigation, permission revocation, offline mode, host dark mode, browser zoom, keyboard-only operation, and each error fallback.
- Package exactly the reviewed MV3 build; inspect the generated manifest and permissions before Chrome Web Store upload.

## 10. Alternatives and implementation notes

Alternative: a generic all-site content script. Rejected because it requires broad permissions and creates a fragile, deceptive compatibility claim. Alternative: a browser toolbar-only extension. Rejected because it weakens discoverability at the handoff moment. Alternative: host-page React portal without style isolation. Rejected because provider CSS can break accessibility and reliability.

Implementation notes: use a small shared type package, shadow DOM or equivalent style isolation for injected surfaces, `AbortController`/cleanup for observers, and adapter feature flags that can disable a broken site without disabling local library functionality.

## 11. Acceptance criteria and self-review

- The manifest requests only documented, narrowly justified permissions.
- A broken provider layout fails within the adapter boundary and leaves host/user data intact.
- All user-facing flows operate through typed, validated extension messages.
- No extension path sends an AI message automatically or accesses cookies/private provider APIs.
- Lifecycle, privacy, error recovery, and release verification are specified well enough for implementation and QA.

Self-review: this design implements the PRD’s in-page promise while maintaining MV3 isolation, minimal permissions, and graceful fallback.

## 12. References

- [Document 04 — User Experience](04_user_experience.md)
- [Document 06 — System Architecture](06_system_architecture.md)
- [Document 10 — Capsule Specification](10_capsule_specification.md)
- [Document 11 — Security Architecture](11_security_architecture.md)
- [Document 12 — Testing Strategy](12_testing_strategy.md)
- [Document 13 — Deployment Strategy](13_deployment_strategy.md)
