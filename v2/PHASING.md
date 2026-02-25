# Sophia v2 — Phased Delivery Plan

## Phasing Strategy

Sophia v2 is a large system. Shipping it all at once is unrealistic and risky. Instead, we deliver in phases where each phase is a usable, valuable increment.

### Guiding Principle
Each phase must be independently useful. A user at Phase 1 should get real value, not a half-working system waiting for Phase 3 to be complete.

---

## Phase 1: Governed Autonomous Build (MVP)

**Goal:** A coding agent can autonomously build an app from requirements, governed by Sophia, with token efficiency and proper testing.

**Timeline target:** 6-8 weeks

**Who it serves:** A developer who already has requirements and wants a governed, autonomous build.

### Scope

| Component | What Ships | What Doesn't |
|-----------|-----------|--------------|
| **Scaffold** | CLI command: `sophia scaffold --from requirements.yaml` generates governed project | No chat-based gathering |
| **Planning** | Agent reads requirements, generates sprint plan, presents for approval | No Leantime integration |
| **Build** | Sprint-by-sprint autonomous execution with TDD | No multi-agent coordination (single agent) |
| **Governance** | Gates, policies, audit trail, approval routing | No enterprise governance level |
| **Token Management** | Model routing, context budgets, cost estimation | No real-time dashboard |
| **Testing** | Unit + integration per sprint, E2E on completion | No visual regression |
| **CLI** | Enhanced CLI with new commands: `scaffold`, `plan`, `build`, `estimate` | No Open WebUI integration |
| **Dashboard** | Build progress + token usage views added to existing dashboard | No escalation center |

### Key Deliverables

1. **`sophia scaffold` command**
   - Input: `requirements.yaml` (manually written or provided)
   - Output: Governed project repository with folder structure, governance init, CI/CD config
   - Uses Haiku for README/boilerplate generation

2. **`sophia plan` command**
   - Input: Scaffolded project with requirements
   - Output: Sprint specs, task breakdowns, test plans, token budget estimate
   - Uses Opus for planning
   - Presents plan to user for approval via CLI

3. **`sophia build` command**
   - Input: Approved plan
   - Executes sprint-by-sprint, task-by-task
   - TDD: generates tests first, then implementation
   - Uses Sonnet for coding, Haiku for boilerplate
   - Checkpoint recovery (resume from last committed task)
   - Token tracking per task/sprint

4. **`sophia estimate` command**
   - Input: Requirements or plan
   - Output: Token/cost estimate for the full build
   - No execution, just estimation

5. **Enhanced governance**
   - Approval router (auto/inform/human classification)
   - Token budget policy
   - Gate enforcement for plan approval and sprint completion

6. **Agent adapter for Claude Code**
   - Implements the AgentAdapter interface
   - Context bundle preparation (minimal context per task)
   - Result harvesting and state management

### Requirements Format (Phase 1)

Since there's no chat-based gathering yet, the user writes `requirements.yaml` directly:

```yaml
# requirements.yaml
project:
  name: my-app
  description: A task management web application
  type: web-app

tech_stack:
  framework: nextjs
  language: typescript
  database: postgresql
  orm: prisma
  ui: shadcn
  styling: tailwind
  testing: vitest
  e2e: playwright

requirements:
  product:
    - User authentication with email/password
    - Create, read, update, delete tasks
    - Task assignment to team members
    - Due date tracking with notifications
    - Dashboard with task statistics

  technical:
    - Server-side rendering for initial load
    - REST API with input validation
    - Database migrations via Prisma
    - Rate limiting on API endpoints

  testing:
    - Unit test coverage target: 80%
    - E2E tests for all CRUD operations
    - E2E tests for authentication flow

  architecture:
    - Monorepo not required (single app)
    - Deploy target: Vercel
    - Environment: development + production

personas:
  - name: Team Member
    type: frontend
    description: Creates and manages their own tasks
    journeys:
      - Sign up and create first task
      - View dashboard and filter tasks
      - Mark task as complete

  - name: Team Lead
    type: frontend
    description: Manages team tasks and views reports
    journeys:
      - Assign task to team member
      - View team dashboard and workload
      - Export task report

  - name: API Consumer
    type: backend
    description: External service integrating via REST API
    journeys:
      - Authenticate and receive token
      - CRUD operations on tasks
      - Query tasks with filters and pagination

quality:
  lighthouse_target: 90
  accessibility: WCAG-AA
  design_system: shadcn
```

### What Phase 1 Proves
- Autonomous build with governance is viable
- Token optimization strategy works at real-world scale
- Approval routing reduces human intervention to <5%
- TDD-first approach produces quality code
- Cost estimation is accurate within 20%

---

## Phase 2: Orchestration & Integrations

**Goal:** Connect the build pipeline to external systems and add multi-agent coordination.

**Timeline target:** 4-6 weeks after Phase 1

**Who it serves:** A developer who wants full pipeline visibility and project management integration.

### Scope

| Component | What Ships |
|-----------|-----------|
| **Leantime Integration** | Create project, sync sprints/tasks, live kanban updates |
| **Knowledge Base Sync** | Push docs to ra-h_os at gate boundaries |
| **Multi-Agent Coordination** | Parallel agents for independent tasks within a sprint |
| **Dashboard Enhancements** | Escalation center, token usage charts, audit explorer |
| **Agent Adapters** | OpenCode adapter (second agent support) |
| **Change Requests** | Formal process for modifying locked requirements |

### Key Deliverables

1. **Leantime adapter** implementing the IntegrationAdapter interface
2. **Knowledge base sync** via git operations
3. **Agent coordinator** that routes tasks to available agents with proper file claim management
4. **Enhanced dashboard** with escalation center and real-time token charts
5. **`sophia change-request` command** for formal requirement modifications
6. **OpenCode agent adapter** as second supported agent

---

## Phase 3: Intelligent Intake

**Goal:** Chat-based requirements gathering that guides non-technical users through structured brainstorming.

**Timeline target:** 4-6 weeks after Phase 2

**Who it serves:** Vibe coders who don't know how to write `requirements.yaml` and need guided discovery.

### Scope

| Component | What Ships |
|-----------|-----------|
| **Open WebUI Tool** | Custom Sophia intake tool for guided requirements gathering |
| **Intake Agent** | Conversational agent that asks the right questions based on app type |
| **Intent Lock** | "Lock this in" trigger that converts conversation to structured artifacts |
| **Conversation Compression** | Summarization checkpoints to keep token usage manageable |
| **Completeness Validation** | Minimum coverage thresholds per requirement category |

### Key Deliverables

1. **Open WebUI Sophia tool** (Python, registered in Open WebUI)
2. **Intake agent** prompt templates (per app type: web, API, CLI, mobile, full-stack)
3. **Artifact extraction** pipeline (chat → structured YAML)
4. **Lock command** that bridges chat system to scaffold command
5. **CLI fallback**: `sophia intake` for terminal-based guided gathering

---

## Phase 4: Quality & Compliance

**Goal:** Enterprise-grade output quality enforcement and compliance documentation.

**Timeline target:** 4-6 weeks after Phase 3

**Who it serves:** Agencies, consultancies, and teams building production apps for clients.

### Scope

| Component | What Ships |
|-----------|-----------|
| **Visual Regression Testing** | Screenshot comparison against design system baseline |
| **Enterprise Governance Level** | Full compliance mode with additional review gates |
| **Design System Enforcement** | Policy that checks for ad-hoc styling, missing states, accessibility violations |
| **Compliance Artifacts** | Auto-generated documentation for SOC2-adjacent compliance |
| **Cross-Project Memory** | Enhanced memory system with decay, reinforcement, and conflict resolution |
| **E2E Recording & Hashing** | Full persona journey recordings with integrity verification |

### Key Deliverables

1. **Visual regression policy** using Playwright screenshots
2. **Enterprise governance configuration** with additional gates
3. **Design system policy** that evaluates component usage, responsive breakpoints, state coverage
4. **Compliance document generator** (Haiku-based, templated)
5. **Memory decay algorithm** — old patterns lose weight unless reinforced
6. **E2E video recording** with SHA-256 hash for verification

---

## Phase Summary

```
Phase 1 (MVP)                    Phase 2                     Phase 3                   Phase 4
─────────────                    ───────                     ───────                   ───────
CLI-driven scaffold              Leantime integration        Open WebUI tool           Visual regression
Sprint planning                  Knowledge base sync         Chat-based intake         Enterprise governance
Autonomous build                 Multi-agent coordination    Intent lock mechanism     Design system enforcement
Token management                 Dashboard enhancements      Conversation compression  Compliance artifacts
Basic governance                 Change requests             Completeness validation   Cross-project memory
Single agent (Claude Code)       OpenCode adapter                                      E2E recording + hashing

Value: "Build governed apps"     Value: "Full visibility"    Value: "Anyone can use"   Value: "Enterprise ready"
```

---

## Migration from v1

### What Carries Forward
- Three-layer architecture (Cognexa → Sophia → Execution)
- CLI framework (Commander.js)
- Dashboard (Next.js)
- SQLite database schema (extended, not replaced)
- Policy engine (enhanced, not rewritten)
- Memory system (enhanced, not rewritten)
- Agent detection and adapter system (extended)
- All existing governance content (policies, agents, workflows)

### What Changes
- New commands: `scaffold`, `plan`, `build`, `estimate`, `intake`, `change-request`
- Agent adapter interface formalized (v1 was injection-only, v2 is bidirectional)
- Context management system (new — file summaries, context bundles, compression)
- Token tracking (new — budgets, routing, monitoring)
- Approval router (new — replaces v1's all-or-nothing escalation)

### Breaking Changes
- `.sophia/config.yaml` schema extended (backward compatible — new fields are optional)
- Database schema extended (migration script provided)
- CLI commands reorganized (old commands still work, new commands added)

### Migration Path
```bash
# Existing v1 projects
sophia update           # Updates CLI to v2
sophia migrate          # Migrates .sophia/ config and database
# Existing commands continue to work
# New commands available immediately
```
