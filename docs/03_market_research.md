# Context Capsule — Market Research

**Document ID:** 03  
**Status:** Draft — evidence captured 2026-07-29  
**Phase:** 1 — Product & Design  
**Depends on:** Documents 01–02  
**Purpose:** Validate the positioning hypothesis and identify the narrowest viable differentiation for the MVP.

## 1. Executive conclusion

The market is crowded with tools that retain context **inside** an AI provider, coding environment, or project workspace. It is not crowded with a user-controlled, structured, browser-native handoff that begins on one provider and is ready to insert into another. Context Capsule should not claim to replace Projects, Memories, coding agents, knowledge notebooks, or source control. Its defensible first position is:

> **A portable, reviewable handoff for active AI work when the user changes tools.**

This opportunity is real only if the product is more trustworthy and less work than manually copying a summary. That means local-first storage, visible review, honest source/excerpt disclosure, reliable composer insertion, and no automatic sending are product requirements rather than optional polish.

## 2. Scope, methodology, and limits

Research covered current first-party product documentation for ChatGPT Projects, Claude Projects, Gemini Gems, NotebookLM, Cursor Memories, Lovable, and Replit as of the document date. The review favors official sources because feature availability changes rapidly. It assesses documented workflow fit, not market-share estimates or independent usability testing.

Limitations:

- Provider interfaces, pricing, plan availability, and usage limits change frequently; verify again before public launch.
- This is a product-landscape analysis, not legal advice or a demand study.
- No primary interviews have been completed. Beta interviews and task-based usability tests remain required before claiming product-market fit.

## 3. Landscape map

```text
                    Provider-locked context                     Portable user context
Long-lived work      Projects / Memories / Notebooks             Future opportunity; not V1

Active handoff       Provider chat history                       Context Capsule's V1 focus

Code/project state   Cursor / Lovable / Replit / Git             Repository files, not chat transfer

Reusable instructions Gems / prompt managers / rules             Templates, not current-work status
```

The meaningful gap is at the intersection of **active handoff**, **cross-provider portability**, and **user-reviewable structured state**.

## 4. Competitor and adjacent-tool analysis

| Product/category | Documented strength | Limitation relative to Context Capsule | Implication |
| --- | --- | --- | --- |
| ChatGPT Projects | Keeps chats, files, custom instructions, and project memory together; can be shared and used across ChatGPT devices. | Context remains inside a ChatGPT account/project; file limits and tool availability vary by plan. | Do not compete as a workspace. Offer handoff when leaving it. |
| Claude Projects | Gives chats a project knowledge base and supports shared projects for work plans. | Knowledge/context is scoped to Claude projects, not a neutral transfer artifact. | Make a Claude-to-anywhere handoff clear and inspectable. |
| Gemini Gems | Saves customized instructions for recurring behavior in Gemini. | Reusable role/instructions are not an evolving record of a current project’s decisions and progress. | Distinguish a current-work capsule from a reusable persona/template. |
| NotebookLM | Source-grounded notebooks, citations, source transformations, and broad source formats. | A notebook is a research workspace, independent per notebook, rather than a small cross-chat handoff. | Serve brief/project handoff; do not imitate source-grounded research. |
| Cursor Memories/Rules | Project-scoped context persists across coding sessions; background memories require user approval. | Tied to a coding project/environment and not intended for general web-chat portability. | Borrow the approval/control principle, not the IDE scope. |
| Lovable | Builds applications in projects and offers GitHub synchronization for code ownership/collaboration. | Code portability through Git is different from portable conversational task state. | Explicitly complement source control and AI builders. |
| Replit | Project container with code/data/artifacts; can import repositories/ZIPs and deploy. | Imports applications rather than a compact AI-work handoff; scope is a build environment. | Keep capsule independent of any builder/runtime. |
| Prompt managers (category) | Store and reuse prompt templates; often provide versioning and sharing. | A static prompt does not capture live decisions, completed work, uncertainty, or next actions. | Do not use “prompt manager” as primary category language. |

### 4.1 ChatGPT Projects

OpenAI describes Projects as workspaces that group chats, uploaded reference material, and custom instructions; project memory keeps work focused inside the project. They are available across ChatGPT plans, but plan-dependent file/tool limits apply, and using Projects requires a ChatGPT account. This is a strong in-provider continuation solution, so Context Capsule must avoid suggesting that a user needs it to organize work inside ChatGPT. Its opportunity starts when a user needs a **portable snapshot** for a different tool. [OpenAI: Projects in ChatGPT](https://help.openai.com/en/articles/10169521-projects-in-chatgpt)

### 4.2 Claude Projects

Claude Projects provide a knowledge base that can include documents, text, code, and files for project chats; team and enterprise plans can share projects. This validates the need for persistent working context but reinforces a provider-bound design. Context Capsule’s handoff should make no claim that it can recreate Claude’s project tools or knowledge-base behavior elsewhere. [Claude Help Center: What are Projects?](https://support.claude.com/en/articles/9517075-what-are-projects)

### 4.3 Gemini Gems and NotebookLM

Gemini Gems save customized instructions for repeated tasks, which is adjacent to reusable prompt/rule management rather than live project status. NotebookLM is a source-grounded research assistant: users add sources, can obtain cited responses, and can transform sources into multiple outputs. Google documents that notebooks are independent, so they are not a universal cross-notebook/context-transfer layer. Context Capsule should complement these tools by creating a short, user-authored handoff—not import every source or reproduce grounded citation workflows. [Google: Gems](https://support.google.com/gemini/answer/15236405?hl=en-GB), [Google: NotebookLM](https://support.google.com/notebooklm/answer/16164461?hl=en), [Google: Create a notebook](https://support.google.com/notebooklm/answer/16206563?hl=en)

### 4.4 Cursor

Cursor’s Memories are automatically generated project-scoped rules from chat; its documentation says background memories require user approval before saving. This is relevant evidence for Context Capsule’s review-before-save principle. Its scope is an IDE project, however, while Context Capsule’s first audience needs to transfer active context among general web chats, including non-code work. [Cursor: Memories](https://docs.cursor.com/en/context/memories)

### 4.5 Lovable and Replit

Lovable positions projects as applications with code that can sync to GitHub; it supports cross-project references. Replit treats a project as a container for code, data, and publishable artifacts and documents imports from GitHub, ZIPs, and other builders. Both validate that users value portability/ownership, but their portability vehicle is source code and repositories—not a reviewed conversational project brief. Context Capsule should integrate with neither in V1; it should preserve a user’s working state alongside these tools. [Lovable: GitHub connection](https://docs.lovable.dev/integrations/github), [Lovable: Cross-project referencing](https://docs.lovable.dev/features/cross-project-referencing), [Replit: Projects & Artifacts](https://docs.replit.com/learn/projects-and-artifacts/projects-and-artifacts), [Replit: Import from a provider](https://docs.replit.com/build/import-from-providers)

## 5. User pain points and evidence-informed hypotheses

| Pain point | Existing tools handle it | Remaining gap / Context Capsule response |
| --- | --- | --- |
| Continue a long task in the same product | Projects, memory, notebooks | No need to intervene; do not compete. |
| Move an active task after quota/model/tool change | Usually manual copy/paste and custom summaries | Capture an inspectable handoff with goal, decisions, constraints, and next actions. |
| Prevent loss of implementation constraints | IDE rules/memory and project instructions | Provide explicit portable constraints and decisions, not hidden memory. |
| Keep sensitive work private | Provider privacy controls vary; cloud products require account choices | Local-first core and explicit outbound-data consent. |
| Transfer code/project ownership | GitHub/repository import | Stay adjacent: capture work context, not source-control history. |
| Reuse a familiar instruction | Gems, prompt managers, rules | Store live state and next actions; future templates are a separate idea. |

## 6. Competitive opportunities and product decisions

### Opportunity A — Neutral structured handoff

Use a versioned, provider-neutral JSON/Markdown format with human-readable sections. This makes the value clear even if a site adapter fails, because the user can export/copy it. The format must be editable and honest about whether it contains an excerpt, a user-authored summary, or an AI proposal.

### Opportunity B — Browser-native final mile

The differentiating interaction is not merely “download a file”; it is selecting a capsule and placing an editable handoff into the destination composer without losing the user’s draft. This must remain optional/fail-safe, because provider DOM surfaces change.

### Opportunity C — Trust and control as UX

Provider memory features are often opaque. Context Capsule can differentiate by exposing what is included and by never auto-sending or silently calling a model. This is especially important for source conversations with code, customer data, or unpublished work.

### Opportunity D — Active work, not complete archive

The product should optimize a transfer that takes minutes, not a total record of every chat. This reduces privacy, token, and reliability burden. Full archival/search, teams, and integrations remain future possibilities, not a launch promise.

## 7. SWOT analysis

| Strengths | Weaknesses |
| --- | --- |
| Provider-neutral format, local-first value, visible review, works alongside existing tools | Browser DOM adapters are brittle; no proprietary model/data moat; accurate handoff still needs user review |
| Opportunities | Threats |
| Cross-provider behavior, growing provider fragmentation, portability expectations, support for both code and non-code work | Native providers may add export/import; Chrome policy changes; rapid UI changes; users may prefer project files or manual templates |

## 8. Risks, alternatives, and implications

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Marketing as “universal AI memory” invites direct competition with better-funded provider suites | Confused positioning and runaway scope | Position as a portable active-work handoff. |
| Native projects reduce switching pain | Lower perceived need | Target users who actively change providers and make export/copy useful on its own. |
| Adapter reliability undermines promise | Negative trust | Support only tested surfaces; keep JSON/Markdown/copy fallback first-class. |
| AI summary quality is inconsistent | Incorrect continuation | Review/edit contract and optional smart draft; never present summary as complete history. |

Alternative positioning: “AI chat backup.” Rejected because it implies transcript completeness, retention obligations, and archive/search features. Alternative positioning: “prompt manager.” Rejected because it hides the distinctive evolving-status/decision handoff. Alternative positioning: “AI operating system.” Deferred because it makes the MVP less credible and more complex.

## 9. Research backlog before and during beta

1. Interview 8–12 people who have switched among at least two AI chat providers in the past month; observe an actual transfer task.
2. Test whether users prefer a required five-field manual review, a short AI proposal, or a selected excerpt for initial capsule creation.
3. Measure source-to-target transfer time against a copy/paste baseline.
4. Re-check the exact provider layouts, account restrictions, and policies immediately before Chrome Web Store submission.
5. Analyze competitor updates quarterly and log any feature that narrows the portability gap in Document 22.

## 10. Acceptance criteria and self-review

- Current official source links support all material feature comparisons in this document.
- The analysis distinguishes verified facts from hypotheses and makes no unverified market-size or pricing claim.
- Positioning is consistent with Documents 01–02: local-first, reviewable, active-work handoff.
- The research produces actionable consequences for scope rather than a feature catalogue.
- Detailed UX, architecture, and launch choices remain in their owning documents.

Self-review: current vendor documentation establishes strong provider-native context and project-management capability, but not a documented neutral cross-provider handoff. The research supports retaining the narrow MVP rather than expanding it.

## 11. References

- [Document 00 — Documentation Architecture](00_documentation_architecture.md)
- [Document 01 — Project Vision](01_project_vision.md)
- [Document 02 — PRD](02_product_requirements_document.md)
- [Document 04 — User Experience](04_user_experience.md)
- [Document 21 — Future Roadmap](21_future_roadmap.md)
- [Document 22 — Risk Register](22_risk_register.md)
