# Context Capsule — User Experience Design

**Document ID:** 04  
**Status:** Draft  
**Phase:** 1 — Product & Design  
**Depends on:** Documents 01–03  
**Purpose:** Define the usable end-to-end experience for Core Transfer MVP (1A), including flows, information architecture, states, accessibility, and interaction rules.

## 1. Experience principles

1. **One obvious next action.** The user should see “Create capsule,” “Insert context,” or “Import capsule,” never a vague collection of AI options.
2. **Review before movement.** Captured content is previewed before save; inserted content is visible and editable before send.
3. **Local-first reassurance.** State storage and destination at the point of action: “Saved on this device,” “Copy only,” or “Will sync.”
4. **Graceful recovery.** Adapter, network, and validation errors offer a practical alternative, usually Copy, Export, Import, Retry, or Manual capsule.
5. **Do not fake continuity.** Use “Insert context” and “Handoff”; never imply that model memory, tools, or original files moved automatically.

## 2. Scope and information architecture

### 2.1 1A navigation

```text
In-page Capsule control
├── Create capsule
│   ├── Source review
│   ├── Capsule editor
│   └── Save confirmation → Insert now / Library / Export
├── Insert context
│   ├── Select capsule
│   ├── Compact / Full preview
│   └── Insert / Copy fallback
└── Library
    ├── Search / filter / sort
    ├── Capsule detail/editor
    └── Import / Export / Settings
```

Settings includes local storage status, clear local data, keyboard shortcuts, optional account connection (disabled/hidden until 1B), optional smart drafting configuration (disabled/hidden until 1C), version, and support/report adapter issue.

### 2.2 1B dashboard navigation

```text
Sign in → Library → Capsule detail/edit → Import / export
                  └→ Account / sign out
```

The dashboard deliberately has no team, billing, or complex settings navigation in 1B.

## 3. Primary flow specifications

### Flow A — First successful handoff

| Step | User action | System response | Success feedback |
| --- | --- | --- | --- |
| 1 | Opens a supported source chat | Capsule icon is visible near composer | Tooltip: “Save this chat’s working context.” |
| 2 | Chooses Create capsule | Shows capture progress and detected turn count | “Review what will be included.” |
| 3 | Removes irrelevant/sensitive content; completes fields | Validates fields without losing edits | Inline field guidance, not modal errors |
| 4 | Saves locally | Saves capsule and confirms location | “Saved on this device.” |
| 5 | Opens target chat and chooses Insert context | Shows library and current draft warning if relevant | Selected capsule title and size estimate |
| 6 | Chooses Compact/Full and Insert | Places editable handoff in native composer | “Context inserted. Review, then send when ready.” |

### Flow B — Import received capsule

| Step | User action | System response | Failure recovery |
| --- | --- | --- | --- |
| 1 | Opens Library → Import | Shows Drop, Browse, Paste tabs | Cancel returns to unchanged library |
| 2 | Supplies file/text | Validates schema/size and parses safely | Specific error; no draft saved |
| 3 | Reviews mapped fields | Marks uncertain Markdown mappings | Edit fields or discard |
| 4 | Saves locally | Adds capsule to library | Open to insert, copy, or export |

### Flow C — Adapter failure

| Condition | Message | Available actions |
| --- | --- | --- |
| Cannot find a conversation | “No visible messages were found on this page.” | Manual capsule, Library, Close |
| Cannot find composer | “This layout cannot accept direct insertion right now.” | Copy context, Export, Report issue |
| Provider layout changed | “Capsule is not compatible with this page layout yet.” | Library, Copy, Report issue |
| Capture exceeds limit | “This conversation is too large to capture at once.” | Select recent turns, manual capsule, cancel |

## 4. Low-fidelity wireframes

### 4.1 In-page popover

```text
┌──────────────────────────────────────┐
│ ◉ Context Capsule                 ×  │
│ ChatGPT conversation detected        │
│                                      │
│ [ Create capsule ]                   │
│                                      │
│ Insert into this chat                │
│ [ Search saved capsules…        ]    │
│ Recent: VisionX dashboard handoff ›  │
│                                      │
│ Library                         ↗     │
└──────────────────────────────────────┘
```

### 4.2 Capture review and editor

```text
← Back        Create context capsule
ChatGPT · 18 visible turns · Captured now

Source review [18 included]  [Edit selection]

Title*        [ VisionX dashboard handoff          ]
Goal*         [ Finish dashboard authentication…   ]
Current state*[ API complete; UI auth pending…     ]
Next action*  [ Build authenticated dashboard…     ]
Decisions     [ + Add decision ]
Constraints   [ + Add constraint ]
Source excerpt [ ] Keep selected text locally

[ Cancel ]                         [ Save locally ]
```

### 4.3 Library

```text
Context Capsule                  [ Import ] [ New ]
[ Search title, provider, tag…                         ]
All  ·  ChatGPT  ·  Claude  ·  Gemini       Sort: Updated

VisionX dashboard handoff        ChatGPT · 2m ago  ⋯
Build research outline           Gemini  · Yesterday ⋯

No capsules yet?
Create one from a supported chat, or import a capsule file.
```

### 4.4 Insert context

```text
← Back                 Insert context
[ Search saved capsules…                              ]
✓ VisionX dashboard handoff

Context amount   (•) Compact ~1,280 tokens  ( ) Full ~3,400
Existing draft found. It will be kept below a divider.

Preview
You are receiving user-provided working context…

[ Copy instead ]                    [ Insert context ]
```

### 4.5 Import

```text
Import capsule
[ Drop file ]  [ Browse ]  [ Paste text ]
JSON (.context-capsule.json) or Markdown · max 1 MB

After parse:
✓ Valid Context Capsule v1.0
Title: [ … ]
2 fields need review: source, next action
[ Discard ]                         [ Save locally ]
```

## 5. Interaction and content rules

### 5.1 Create and edit

- Autosave an unsaved editor draft in memory for the open session; ask before discarding on close. Do not create a library entry until Save.
- Required-field errors appear after an attempted save, focus the first invalid field, and use meaningful text such as “Add the next action the receiving AI should help with.”
- Long lists use “Add decision,” “Add constraint,” and removable chips/rows; deletion has undo while editing.
- Source excerpts are collapsed by default and clearly state whether they remain local, export with the file, or may be sent by an optional future feature.

### 5.2 Insert

- The primary button says “Insert context,” not “Continue.”
- Compact is preselected; Full is never selected silently when it may overwhelm the destination.
- If the estimate exceeds the selected budget, show what will be omitted and offer copy/full export. Do not block the user from intentionally copying full text.
- After insertion, close the popover and leave keyboard focus in the native composer. The extension does not show a fake “sent” success.

### 5.3 Delete and destructive actions

- Local delete shows a bottom notification: “Capsule deleted. Undo” for 10 seconds.
- “Clear all local capsules” requires a confirmation dialog with the number of capsules and cannot be undone.
- Synced deletion (1B) states that the deletion will affect synced devices and requires confirmation.

### 5.4 Microcopy style

Use short, factual language. Prefer “Saved on this device” over “Your capsule is safely stored.” Prefer “Couldn’t find the message box” over “Something went wrong.” Do not use hype, anthropomorphic claims, or claims of perfect transfer.

## 6. Keyboard support

| Shortcut | Scope | Action |
| --- | --- | --- |
| `Alt+Shift+C` | Supported page, if not claimed by host | Open/close Capsule control |
| `Enter` | Focused primary action | Activate; never sends host chat from extension UI |
| `Esc` | Popover/dialog | Close; warn on unsaved editor changes |
| `/` | Library when focus is not in a field | Focus search |
| `Ctrl/Cmd+K` | Library | Open command/search entry (optional only if no host conflict) |
| `Ctrl/Cmd+Enter` | Never bound by extension | Reserved for host behavior; no interception |

Shortcuts must be discoverable in Settings and must not override typing, browser, or host-chat shortcuts. The extension must continue to work without any shortcut.

## 7. Accessibility and responsive behavior

- Meet WCAG 2.2 AA for contrast, focus, names/roles/states, error identification, and target size for core controls.
- Use native form semantics, logical heading order, focus trapping only in true modals, and live regions for asynchronous status.
- Icons always have an accessible label or adjacent visible text. Do not rely on color for sync/validation status.
- Extension popovers are usable from 320 CSS pixels wide; use a full-height panel rather than clipped popover on narrow windows.
- Dashboard uses a single-column layout below 768px; card actions remain explicit and touch targets remain at least 44×44 CSS pixels.
- Respect reduced-motion preference; motion is limited to fast opacity/position transitions and never carries essential meaning.

## 8. Loading, empty, success, and failure states

| State | Required content |
| --- | --- |
| Loading capture | Progress wording, turn count if known, cancel action after one second |
| Loading import | File name, validation progress, cancel |
| Empty library | One sentence explaining Create/Import and both visible CTAs |
| Empty search | Query shown, clear-search action, no invented suggestions |
| Save success | Capsule title and storage location; next actions Insert, Library, Export |
| Copy success | “Copied context to clipboard.” Include manual select fallback if clipboard denied |
| Validation failure | Field/file-specific reason and path to correct it |
| Adapter failure | What capability failed, host remains unaffected, Copy/Library/Report fallback |
| Offline optional service | Local use remains visible; sync/smart control shows unavailable/retry |

## 9. Risks, alternatives, and implementation notes

| Risk | UX control |
| --- | --- |
| Review screen feels like extra work | Keep initial required fields small; use source selection and clear empty guidance. |
| User assumes all chat data moved | Show source/excerpt state and handoff scope near save/insert. |
| Provider UI clashes with injected button | Use a compact, relocatable control and adapter-specific placement tests. |
| Insertion fails silently | Keep preview and provide Copy before/after failure. |

Alternative: a modal wizard that forces every capsule field. Rejected because it turns a quick transfer into form completion. Alternative: generate and insert silently. Rejected because it violates trust and privacy requirements. Technical components, event handling, and provider DOM placement are specified in Document 07.

## 10. Acceptance criteria and self-review

- Every PRD 1A flow has a defined entry point, success state, error state, recovery action, and accessible keyboard path.
- Wireframes cover create, review, library, import, insertion, and adapter failure.
- The experience preserves user drafts and requires user send confirmation.
- Local-only use is clear and an account is not presented as mandatory.
- Visual tokens/components are delegated to Document 05; technical behavior to Documents 06–12.

Self-review: the design avoids dashboard/smart-drafting scope creep, names limitations honestly, and translates the PRD into testable interaction states.

## 11. References

- [Document 01 — Project Vision](01_project_vision.md)
- [Document 02 — PRD](02_product_requirements_document.md)
- [Document 03 — Market Research](03_market_research.md)
- [Document 05 — UI Design System](05_ui_design_system.md)
- [Document 07 — Browser Extension Architecture](07_browser_extension_architecture.md)
- [Document 12 — Testing Strategy](12_testing_strategy.md)
- [Document 23 — Known Limitations](23_known_limitations.md)
