# Context Capsule — UI Design System

**Document ID:** 05  
**Status:** Draft  
**Phase:** 1 — Product & Design  
**Depends on:** Documents 01–04  
**Purpose:** Define a small, accessible visual system for the extension and dashboard. It prioritizes clarity, host-page coexistence, and maintainability over brand novelty.

## 1. Design intent and scope

Context Capsule should feel calm, precise, and trustworthy beside busy AI chat products. It is a compact productivity tool, not a competing chat interface. The system covers the 1A extension and 1B dashboard using shared foundations; it does not require a bespoke illustration system, marketing site, or a large component library.

Principles: quiet confidence; user control over AI magic; dense but scannable information; strong states over decorative surfaces; accessible color and typography; host-page-safe injected UI.

## 2. Foundations and tokens

Use semantic tokens, not hard-coded component colors. The exact implementation (CSS variables/Tailwind mapping) is owned by Document 14.

### 2.1 Color tokens

| Token | Light | Dark | Use |
| --- | --- | --- | --- |
| `surface.canvas` | `#F8FAFC` | `#0F172A` | Dashboard/page background |
| `surface.base` | `#FFFFFF` | `#111827` | Cards, popovers, dialogs |
| `surface.raised` | `#F1F5F9` | `#1F2937` | Hover/secondary panels |
| `text.primary` | `#0F172A` | `#F8FAFC` | Headings/body |
| `text.secondary` | `#475569` | `#CBD5E1` | Supporting copy |
| `text.muted` | `#64748B` | `#94A3B8` | Metadata/placeholders |
| `border.default` | `#CBD5E1` | `#334155` | Inputs/cards/dividers |
| `action.primary` | `#4F46E5` | `#818CF8` | Main CTA/focus-compatible accent |
| `action.primaryHover` | `#4338CA` | `#A5B4FC` | CTA hover |
| `status.success` | `#15803D` | `#4ADE80` | Confirmed saved/synced status |
| `status.warning` | `#B45309` | `#FBBF24` | Caution/truncation |
| `status.danger` | `#B91C1C` | `#F87171` | Destructive/error |
| `status.info` | `#0369A1` | `#38BDF8` | Informational state |

Never place text directly on status colors without validating contrast. Use status color plus icon/text; a neutral surface with a colored icon is preferred for longer messages.

### 2.2 Typography

Use `Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif` for application UI. Use the browser/system monospace stack for paths, JSON labels, and token counts.

| Role | Size / line height | Weight | Use |
| --- | --- | --- | --- |
| Display | 24 / 32 | 700 | Dashboard page title only |
| H1 | 20 / 28 | 650–700 | Extension panel title |
| H2 | 16 / 24 | 650 | Card/dialog section |
| Body | 14 / 20 | 400 | Default UI text |
| Label | 13 / 18 | 600 | Form/control label |
| Meta | 12 / 16 | 400–500 | Provider/time/token count |
| Code | 12 / 18 | 400 | Paths/format/schema metadata |

Do not use text below 12px. Body content must remain legible at 200% zoom without horizontal scrolling in the dashboard’s main task flows.

### 2.3 Spacing, size, shape, elevation

Base grid: 4px. Use space tokens `4, 8, 12, 16, 20, 24, 32, 40, 48`.

| Token | Value | Use |
| --- | --- | --- |
| `radius.sm` | 6px | Tags, compact fields |
| `radius.md` | 8px | Buttons, inputs, cards |
| `radius.lg` | 12px | Popovers/dialogs |
| `control.height` | 36px / 40px / 44px | Compact/default/touch-priority controls |
| `shadow.popover` | `0 12px 32px rgba(15,23,42,.18)` | Extension popover/dialog |
| `focus.ring` | 2px `action.primary` + 2px offset | Every keyboard focusable control |

Use borders first and shadows sparingly. The injected UI must not visually overpower the host composer.

## 3. Theme rules

- Default to the OS color preference; offer an explicit Light/Dark/System choice in settings when the extension UI is mature.
- Injected controls should inherit neither host typography nor host color variables. Encapsulate styles so provider CSS cannot distort accessible states.
- Keep brand accent to primary actions, selected navigation, focus, and small Capsule identity marks; do not make whole panels purple.
- Dark mode is a complete theme, not inverted light mode. Recheck contrast for borders, disabled states, code blocks, and status messages.

## 4. Component standards

### Buttons

| Variant | Use | Rules |
| --- | --- | --- |
| Primary | One highest-value action per view | Solid primary; text verb; no ambiguous “Continue” |
| Secondary | Adjacent alternative | Base surface + border; never visually hidden |
| Ghost | Low-emphasis/list action | Visible hover/focus background; label or tooltip |
| Destructive | Confirmed delete/clear | Danger color only inside a destructive context |
| Icon | Compact injected control | 36px minimum; accessible name; tooltip on hover/focus |

Buttons have disabled, hover, active, focus, and loading states. Loading preserves the label and adds a small progress indicator; it does not replace text with an unlabeled spinner.

### Inputs and forms

- Labels are always visible above fields; placeholders are examples, never labels.
- Required label uses visible `Required` or `*` with accessible explanation.
- Help text appears below input and errors replace/augment it without layout jump where possible.
- Textareas have a sensible minimum height, character count only where a limit exists, and no auto-resize that makes focus jump.
- Arrays (decisions/constraints/tasks) use a simple labeled row with remove button and add action.

### Cards, lists, and tables

- Capsule cards show title, provider, updated time, current next action, sync state, and a predictable overflow menu.
- Entire cards may open detail, but embedded actions must remain keyboard reachable and not create nested interactive elements.
- Use tables only when scanning aligned data is materially better (dashboard large-list view); otherwise use cards.
- Empty cards explain a next action. Skeleton loading matches final layout but is never used for more than a short loading state without text feedback.

### Feedback and notification

- Inline alert: persistent field/page issue; icon + heading + concise action.
- Toast: temporary confirmation such as Saved, Copied, Deleted/Undo; supports keyboard focus only when it contains a required action.
- Dialog: confirmation, irreversible change, or task requiring focused attention. Escape closes only non-destructive dialogs.
- Progress: determinate when count/progress is known; otherwise labeled indeterminate status.

### Selection controls

- Compact/Full context mode uses radio cards: label, brief effect, estimated tokens, and selected outline—not a hidden toggle.
- Provider filters use checkable chips with text; color alone is insufficient.
- Use switches only for binary settings with immediate meaning, never for a destructive action or consent that needs explanatory text.

### Icons

Use one consistent outline icon family (e.g., Lucide) at 16px or 20px. Core meanings: Capsule, import, export, copy, search, edit, delete, warning, success, offline, sync, external link. Icons reinforce text; tooltips provide labels for icon-only toolbar actions.

## 5. Layout standards

### Extension

- Popover width: 360px default, min 320px, max 420px. Use a full-height internal scroll area for long lists; header/footer remain visible.
- Editor opens as extension page/side panel rather than a cramped popover when fields exceed one screen.
- Maintain 16px page padding, 12px group gaps, 24px between major sections.
- Always account for browser zoom and host page fixed controls; injected button must have a placement fallback.

### Dashboard

- Max content width 1200px; 24px desktop/16px mobile outer padding.
- Library: header, search/filter row, responsive card grid transitioning to one column below 768px.
- Detail/editor: max readable form width 760px; secondary preview may use a 360px column at ≥1024px and stack below otherwise.
- Never use a horizontal-only layout for a required action.

## 6. Motion and interaction feedback

- Standard duration: 120ms hover/focus, 180ms panel transition, 220ms dialog entry; ease-out.
- No looping decorative animation. Progress communicates real work only.
- Respect `prefers-reduced-motion`: remove slide/scale; retain instant opacity/status change.
- Animations must not delay keyboard focus or hide an error/success state.

## 7. Accessibility quality checks

- Contrast: normal text 4.5:1 minimum; large text 3:1; focus indicator 3:1 against adjacent colors.
- Every form field has programmatic name, description, required state, and error association.
- Focus order follows visual/task order; focus returns to invoker after closing a popover/dialog.
- State changes use `aria-live` appropriately but avoid announcing every keystroke.
- Test with keyboard only, Chrome screen reader support, high contrast/forced colors, 200% zoom, and reduced motion.

## 8. Risks, alternatives, and implementation notes

| Risk | Design response |
| --- | --- |
| Host site styling breaks injected interface | Encapsulated styles, semantic tokens, visual regression tests per provider. |
| Over-designed UI competes with host chat | Quiet neutral surfaces and one accent; compact control only. |
| Token count gives false precision | Label as estimate and explain truncation. |
| Dark mode/accessibility neglected | Token-level contrast audit, not component-by-component patches. |

Alternative: copy the visual styles of ChatGPT/Claude/Gemini. Rejected because it creates inconsistency across sites and risks deceptive affiliation. Alternative: a full custom marketing-grade visual identity. Deferred; it does not improve the MVP handoff.

Implementation notes: expose tokens centrally, use semantic component variants, and avoid arbitrary values in screens. Actual package choices, directory names, and CSS build mechanics are owned by Document 14.

## 9. Acceptance criteria and self-review

- A designer/developer can create consistent extension and dashboard screens from the token/component definitions without inventing core states.
- All Document 04 screens map to defined layout and component standards.
- Light/dark and reduced-motion behavior are specified; core accessibility requirements are testable.
- The system remains intentionally small and does not introduce a brand/marketing workstream.

Self-review: colors, typography, spacing, components, themes, icons, interaction standards, accessibility, and implementation boundaries are covered. User flows remain owned by Document 04 and technical rendering by Document 14.

## 10. References

- [Document 02 — PRD](02_product_requirements_document.md)
- [Document 04 — User Experience](04_user_experience.md)
- [Document 07 — Browser Extension Architecture](07_browser_extension_architecture.md)
- [Document 12 — Testing Strategy](12_testing_strategy.md)
- [Document 14 — Project Structure](14_project_structure.md)
