# Sophia v2 — System Architecture

## Overview

Sophia v2 extends the three-layer architecture from v1 (Cognexa → Sophia → Execution) into a full orchestration platform with five major subsystems.

```
┌─────────────────────────────────────────────────────────────────────┐
│                        SOPHIA v2 PLATFORM                          │
│                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐  │
│  │  INTAKE      │  │  GOVERNANCE  │  │  ORCHESTRATION           │  │
│  │              │→ │              │→ │                          │  │
│  │  Chat UI     │  │  Gates       │  │  Agent Coordinator       │  │
│  │  Req Gather  │  │  Policies    │  │  Sprint Planner          │  │
│  │  Intent Lock │  │  Approvals   │  │  Build Pipeline          │  │
│  │              │  │  Audit       │  │  Test Runner              │  │
│  └──────────────┘  └──────────────┘  └──────────────────────────┘  │
│                                                                     │
│  ┌──────────────┐  ┌──────────────────────────────────────────────┐ │
│  │  KNOWLEDGE   │  │  DASHBOARD                                  │ │
│  │              │  │                                              │ │
│  │  Memory      │  │  Project Overview   │  Live Build Status    │ │
│  │  Docs Sync   │  │  Escalations        │  Token Usage          │ │
│  │  Cross-Repo  │  │  Health Scores      │  Audit Trail          │ │
│  └──────────────┘  └──────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

## Subsystem 1: Intake

The entry point. Converts unstructured ideas into structured, locked requirements.

### Components

**Chat Interface (Open WebUI Integration)**
- Guided requirements gathering via a custom Open WebUI tool/skill
- Structured prompts for: product requirements, technical requirements, testing requirements, architecture requirements, user personas, user journeys
- Context-aware follow-up questions based on app type
- Token-efficient: uses summarization checkpoints to compress conversation history

**Intent Lock Mechanism**
- Triggered by user command: "lock this in"
- Converts chat artifacts into structured requirement documents
- Produces: `requirements.yaml` (machine-readable) + `REQUIREMENTS.md` (human-readable)
- Once locked, requirements are immutable — changes go through formal change request

**Output Artifacts:**
```
requirements/
├── requirements.yaml          # Machine-readable, schema-validated
├── REQUIREMENTS.md            # Human-readable summary
├── personas/
│   ├── frontend-users.md      # Frontend user personas
│   └── backend-users.md       # Backend/API user personas
├── journeys/
│   └── {persona}-journey.md   # User journey per persona
└── architecture/
    └── decisions.md           # Key architecture decisions from brainstorm
```

## Subsystem 2: Governance

Carries forward from v1 with significant enhancements.

### Components

**Gate Engine**
- Phase gates: Intent Lock → Plan Approval → Sprint Completion → Final Acceptance
- Each gate has defined entry/exit criteria
- Gates are configurable per governance level (community/startup/enterprise)

**Policy Engine (Enhanced)**
- v1 policies (security, quality, testing, repo-hygiene, ui-standards, cost) carry forward
- New policies: token-budget, accessibility, visual-regression, documentation-completeness
- Policies evaluated at gate boundaries, not on every file change
- Policy violations block progression through gates

**Approval Router**
- Classifies pending decisions into: auto-approve, inform-only, human-required
- Auto-approve: routine operations within established framework (file creation, dependency installation for declared stack, test execution, linting fixes)
- Inform-only: decisions logged but not blocking (minor refactors, doc updates)
- Human-required: architecture changes, new dependencies not in stack, security-sensitive changes, scope changes, budget overruns
- Goal: <5% of actions require human intervention

**Audit System**
- Every decision, gate transition, and escalation is logged with full context
- Immutable audit trail (append-only SQLite + git commits)
- Queryable via dashboard and CLI

## Subsystem 3: Orchestration

The build engine. Coordinates agents to execute governed work.

### Components

**Agent Coordinator**
- Routes tasks to appropriate agents based on capability and cost
- Manages agent lifecycle: spawn, context load, execute, harvest result, terminate
- Prevents duplicate work across agents
- Handles agent failures with retry and fallback strategies

**Sprint Planner**
- Takes locked requirements and produces implementation plan
- Generates: sprint specs, epic breakdown, task decomposition
- TDD-first: test specs written before implementation tasks
- Each sprint has defined scope, acceptance criteria, and token budget estimate

**Build Pipeline**
- Executes sprint tasks sequentially within a sprint, sprints sequentially
- For each task: load minimal context → execute → verify → commit → release context
- Tracks progress against sprint plan
- Detects drift from plan and escalates

**Test Runner**
- Executes test suites at sprint boundaries
- Types: unit tests, integration tests, E2E tests (per persona/journey), visual regression, accessibility audit, Lighthouse scoring
- Final acceptance: full E2E test suite across all personas, recorded and hashed

**CI/CD Integrator**
- Configures CI/CD pipeline (GitHub Actions or Google Cloud Build)
- Pipeline runs on every commit: lint, type-check, unit tests, build
- Sprint completion triggers: full test suite, security scan, accessibility audit

### Agent Types and Model Routing

| Agent | Role | Default Model | Fallback |
|-------|------|---------------|----------|
| Planner | Sprint/epic planning, task decomposition | Opus | Sonnet (with review) |
| Builder | Code generation, file modifications | Sonnet | Haiku (simple edits) |
| Reviewer | Code review, quality verification | Opus | Sonnet |
| Tester | Test generation and execution | Sonnet | Haiku (simple tests) |
| Documenter | Documentation generation and sync | Haiku | — |
| Scaffolder | Project setup, template application | Haiku | — (mostly templated) |

## Subsystem 4: Knowledge

Cross-project memory and documentation management.

### Components

**Memory System (Enhanced from v1)**
- Corrections: "This pattern failed because X, do Y instead"
- Patterns: "This approach works well for X type of projects"
- Decisions: "Chose X over Y because Z" with full context
- Cross-repo: memory is global, queryable by keywords, tech stack, project type
- Decay: old patterns lose weight unless reinforced by new evidence

**Documentation Sync**
- Bidirectional sync with external knowledge base (ra-h_os repo)
- App documentation template applied to all projects
- Documents classified as public (in repo) or internal (.gitignore'd)
- Sync triggered at gate boundaries, not continuously

**Context Compression**
- At each phase boundary, raw artifacts are compressed into summaries
- Summaries are the primary context for downstream phases
- Raw artifacts preserved in knowledge base but not loaded into agent context
- Compression ratios tracked and optimized

## Subsystem 5: Dashboard

Real-time visibility into all governed projects.

### Components

**Project Overview**
- All active projects with status (brainstorming, planning, building, testing, complete)
- Health scores per project
- Active escalations requiring human input

**Build Monitor**
- Live status of autonomous builds
- Current sprint, current task, progress percentage
- Token usage (actual vs. budget)
- Agent activity log

**Escalation Center**
- All pending human decisions in one place
- Context provided for each decision (what, why, options, recommendation)
- One-click approve/reject with optional notes

**Audit Explorer**
- Searchable audit trail across all projects
- Filter by project, date, agent, decision type
- Export for compliance reporting

## Data Flow

```
User Chat Input
    │
    ▼
[Intake] ──→ requirements.yaml + REQUIREMENTS.md
    │
    ▼
[Governance Gate: Intent Lock] ──→ Audit Entry
    │
    ▼
[Orchestration: Sprint Planner] ──→ Sprint Specs + Test Plans
    │
    ▼
[Governance Gate: Plan Approval] ──→ Audit Entry (human review)
    │
    ▼
[Orchestration: Build Pipeline]
    │   ├── [Scaffolder] ──→ Project structure
    │   ├── [Builder] ──→ Implementation (per task)
    │   ├── [Tester] ──→ Test execution (per task)
    │   └── [Reviewer] ──→ Quality verification (per sprint)
    │
    ▼
[Governance Gate: Sprint Completion] ──→ Audit Entry
    │
    ▼
[Orchestration: Final Acceptance]
    │   ├── Full E2E test suite
    │   ├── Accessibility audit
    │   ├── Lighthouse scoring
    │   ├── Visual regression check
    │   └── Security scan
    │
    ▼
[Governance Gate: Final Acceptance] ──→ Audit Entry (human review)
    │
    ▼
[Knowledge: Sync] ──→ Docs to knowledge base, memory updated
    │
    ▼
[Dashboard: Project Complete]
```

## Technology Stack (v2)

| Component | Technology | Rationale |
|-----------|-----------|-----------|
| CLI | TypeScript + Commander.js | Carries forward from v1 |
| Dashboard | Next.js 15 + React 19 | Carries forward from v1 |
| Database | SQLite (better-sqlite3) | Local-first, zero config |
| Chat Integration | Open WebUI Tool/Function | User's existing chat interface |
| Knowledge Base | Git-backed markdown | Syncs with ra-h_os repo |
| PM Integration | Leantime REST API | User's existing PM tool |
| Agent Framework | TypeScript agent orchestrator | Custom, token-optimized |
| CI/CD | GitHub Actions / Google Cloud Build | User-configurable |
| Testing | Vitest + Playwright | Carries forward from v1 |
| Schema Validation | Zod | Carries forward from v1 |

## Key Architecture Decisions

### Local-First, Not SaaS
Sophia runs locally. All data stays on the developer's machine. External integrations (Leantime, knowledge base) are optional push operations, not dependencies.

### Agent-Agnostic Orchestration
The orchestration layer doesn't assume Claude Code. Agents are abstracted behind an interface. v2 ships with Claude Code and OpenCode adapters. Others can be added.

### Stateless Agents, Stateful Orchestrator
Individual agents are stateless — they receive context, produce output, and terminate. The orchestrator maintains all state: sprint progress, file claims, audit trail, memory. This minimizes token waste from agents maintaining context they don't need.

### Git as the Backbone
Every artifact is committed to git. The audit trail has both SQLite (queryable) and git (immutable) representations. Knowledge base sync is git-to-git. This gives free versioning, diffing, and rollback.
