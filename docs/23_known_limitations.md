# Context Capsule — Known Limitations

**Document ID:** 23  
**Status:** Active, user-facing release document  
**Phase:** 3 — Delivery  
**Depends on:** Documents 02, 06–12, 20–22  
**Purpose:** State MVP trade-offs honestly so users, support, and release owners do not confuse a helpful handoff with full AI conversation portability.

## 1. Core limitation statement

Context Capsule prepares an editable context handoff; it does not transfer an AI model’s hidden state, provider tools, account settings, attachments, memory, or guaranteed reasoning outcome. The receiving AI may need clarification, may have a smaller context window, and may behave differently even with the same information.

## 2. 1A user-visible limitations

| Limitation | User impact | Product wording/workaround | Future gate |
| --- | --- | --- | --- |
| Chrome desktop only | No Firefox/Edge/mobile/native support | “Chrome web extension beta”; use JSON/Markdown outside Chrome | Demand + adapter/browser strategy |
| Three tested web providers only | Other sites may show no control/unsupported state | Copy/Export/Import remains available | New adapter lifecycle/support evidence |
| Provider DOM can change | Capture/insert may temporarily fail | Explain unsupported layout; Copy/Export fallback | Fixture/live validation and patch |
| Visible turns only | Hidden/virtualized/older chat history may not be captured | Show visible count; user selects/reviews | Provider-safe capture research |
| No perfect summary by default | User may need to complete fields | Quick Capture is an editable draft, not an AI summary | 1C approved consent/service |
| Target context limits vary | Full capsule can be too large | Compact mode, size estimate, truncation disclosure, Copy full text | Better fit evaluation after evidence |
| No automatic send | User takes final send action | Deliberate safety control | Not planned to remove |
| Existing target draft preserved | Inserted capsule may need user editing/reordering | Clear divider and editable composer | Not a defect |
| Local browser storage | Browser/profile clear or reinstall can remove local capsules | Export frequently; optional sync only if later enabled | 1B demand/security gate |
| No attachment/file transfer | File references may be text only | Do not assume a destination can access files | Separate attachment/integration design |
| No team/shared workspace | Cannot share capsule library/links | Export file/text manually | Future team product track |
| No full-text/vector memory | Limited library search; no semantic recall | Title/provider/tag search and clear naming | Validated retrieval need |

## 3. Optional-service limitations

### Sync dashboard (1B)

If released, sync is optional and limited to user-approved canonical capsule data. It cannot recover local capsules that were never synced, nor can it guarantee immediate cross-device visibility during offline/outage/conflict states. Sync conflict resolution preserves copies; it does not merge semantic decisions automatically.

### Smart Capsule (1C)

If released, AI drafting is a proposal, may be inaccurate/incomplete, has provider availability/usage limits, and sends only explicitly selected input to the disclosed provider. It is never a substitute for user review and never required for core handoff.

## 4. Support and communication workflow

```text
User sees limitation/error → explain scope in UI
 → offer Copy/Export/Manual/Retry path → link known limitations/support
 → triage provider/version/non-content diagnostic → update support matrix or ship patch
```

Store listing, onboarding, release notes, settings, and support replies must use the same language. Do not downgrade an active limitation to a “known issue” without owner/mitigation in Document 22. Do not tell a user to grant unnecessary permissions or upload private chat data to reproduce an issue.

## 5. Risks and alternatives

The greatest trust risk is hiding limitations behind “continue anywhere” marketing. The product must lead with supported surfaces and control boundaries. Alternative: wait until every platform works perfectly. Rejected because no browser-injection product can promise that; bounded support plus honest fallback is safer. Alternative: add every requested provider to reduce complaints. Rejected because shallow support increases failure rate and weakens trust.

## 6. Implementation notes and acceptance criteria

- UI must expose relevant limitation at the moment it matters: visible count during capture, target estimate during insert, unsupported layout on failure, local-only status in library.
- Release notes have a maintained provider/browser compatibility table with test date/version.
- Every active limitation maps to a workaround, risk record, or future gate; none is disguised as a feature.
- Support scripts and QA test cases verify wording/action remains accurate.

Self-review: limitations include MVP scope, trade-offs, error recovery, optional-service boundaries, and future improvement gates. They are consistent with the PRD’s honest “Insert context” promise.

## 7. References

- [Document 02 — PRD](02_product_requirements_document.md)
- [Document 07 — Browser Extension Architecture](07_browser_extension_architecture.md)
- [Document 10 — Capsule Specification](10_capsule_specification.md)
- [Document 19 — Release Checklist](19_release_checklist.md)
- [Document 21 — Future Roadmap](21_future_roadmap.md)
- [Document 22 — Risk Register](22_risk_register.md)
