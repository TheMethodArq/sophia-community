# Sophia v2 — Documentation Index

## For Coding Agents

This is the documentation suite for Sophia v2. Read these documents in the order below before starting implementation.

---

## Reading Order

### 1. [VISION.md](./VISION.md)
**Start here.** Understand the problem, target users, and core principles before anything else. This sets the "why" for every design decision that follows.

### 2. [ARCHITECTURE.md](./ARCHITECTURE.md)
System architecture — the five subsystems (Intake, Governance, Orchestration, Knowledge, Dashboard), their components, data flow, and technology stack. This is the "what" at a structural level.

### 3. [REQUIREMENTS.md](./REQUIREMENTS.md)
Formal functional and non-functional requirements. Every feature referenced in other docs traces back to a requirement here. Use requirement IDs (FR-1, NFR-2, etc.) when making implementation decisions.

### 4. [WORKFLOW.md](./WORKFLOW.md)
The complete end-to-end workflow from brainstorm to delivery. Six phases with defined triggers, agents, outputs, failure modes, and token optimization strategies per phase. This is the operational spec.

### 5. [GOVERNANCE.md](./GOVERNANCE.md)
The governance model — gates, policies, approval routing, audit trail, governance levels, and change request protocol. Understand this before implementing any decision-making logic.

### 6. [TOKEN_STRATEGY.md](./TOKEN_STRATEGY.md)
Token optimization is a first-class concern. Model routing table, context management rules, phase boundary compression, token budgets, and cost estimation. Reference this for every agent interaction design.

### 7. [AGENTS.md](./AGENTS.md)
Multi-agent coordination — agent roles, lifecycle, concurrency model, error handling, system prompts, and communication protocol. The orchestrator design is here.

### 8. [INTEGRATIONS.md](./INTEGRATIONS.md)
External system integration specs — Open WebUI, Leantime, Knowledge Base (ra-h_os), CI/CD, and coding agent adapters. Interface contracts and fallback behavior.

### 9. [SCHEMAS.md](./SCHEMAS.md)
Data models, artifact formats, Zod validation schemas, project scaffold templates, and document templates. Reference this when working with any data structure.

### 10. [TESTING.md](./TESTING.md)
Two-level testing strategy: testing the Sophia platform itself, and testing apps built by Sophia. TDD workflow, test pyramid, quality gate tests, and failure handling.

### 11. [UI_STANDARDS.md](./UI_STANDARDS.md)
Output quality enforcement — design system rules, component quality requirements, responsive design, accessibility (WCAG AA), performance targets, and visual consistency. These are the policies that govern the apps Sophia builds.

### 12. [PHASING.md](./PHASING.md)
Phased delivery plan — what ships in each phase, MVP scope, migration from v1, and the value proposition per phase. Read this to understand implementation priority.

---

## Quick Reference

| Question | Document |
|----------|----------|
| What problem does Sophia v2 solve? | VISION.md |
| What are the major subsystems? | ARCHITECTURE.md |
| What features are required? | REQUIREMENTS.md |
| How does the end-to-end workflow work? | WORKFLOW.md |
| How are approvals routed? | GOVERNANCE.md |
| How do we minimize token usage? | TOKEN_STRATEGY.md |
| How do agents coordinate? | AGENTS.md |
| How does Leantime/Open WebUI integrate? | INTEGRATIONS.md |
| What does `requirements.yaml` look like? | SCHEMAS.md |
| How should tests be structured? | TESTING.md |
| What quality must built apps meet? | UI_STANDARDS.md |
| What ships first (MVP)? | PHASING.md |

---

## Implementation Priority (Phase 1 MVP)

If you're building Phase 1, focus on these documents:

1. **SCHEMAS.md** — Implement the `requirements.yaml` schema and validation first
2. **AGENTS.md** — Build the orchestrator and Claude Code agent adapter
3. **TOKEN_STRATEGY.md** — Implement context management and model routing
4. **GOVERNANCE.md** — Implement gates and approval router
5. **WORKFLOW.md** — Wire up the scaffold → plan → build → test pipeline
6. **TESTING.md** — Set up the test infrastructure for Sophia itself
7. **UI_STANDARDS.md** — Implement as policies evaluated at gates

---

## Key Design Decisions

These decisions are made and should not be revisited without explicit discussion:

1. **Orchestrator is TypeScript, not an LLM** — Coordination logic uses zero tokens (AGENTS.md)
2. **Agents are stateless** — Fresh context per task, no carry-forward (AGENTS.md, TOKEN_STRATEGY.md)
3. **Git is the communication backbone** — Agents communicate through committed files (AGENTS.md)
4. **Model routing by task type** — Not all tasks use the same model (TOKEN_STRATEGY.md)
5. **Context compression at phase boundaries** — Downstream phases never see upstream raw data (TOKEN_STRATEGY.md)
6. **Approval routing, not approval blocking** — 90%+ of actions auto-approve (GOVERNANCE.md)
7. **Local-first architecture** — All data stays on the developer's machine (ARCHITECTURE.md)
8. **Integrations are optional** — Core workflow functions without Leantime, Open WebUI, or knowledge base (INTEGRATIONS.md)
9. **Phase 1 is CLI-driven** — No chat-based gathering until Phase 3 (PHASING.md)
10. **Output quality is governance** — UI standards are enforced through policies, not suggestions (UI_STANDARDS.md)

---

## Conventions

- **Requirement references**: Use `FR-1.1`, `NFR-2.3` format when linking to requirements
- **File paths**: Always relative to project root
- **Schema formats**: YAML for human-editable, JSON for machine-generated
- **Validation**: Zod for all runtime schema validation
- **Naming**: kebab-case for files, camelCase for TypeScript, SCREAMING_CASE for constants
- **Token budgets**: Always in raw token count, convert to USD only for user-facing displays
