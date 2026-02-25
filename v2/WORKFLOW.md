# Sophia v2 — Workflow Specification

## End-to-End Workflow

This document defines the complete lifecycle of a Sophia-governed build, from initial idea to production-ready application.

```
┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐
│ BRAINSTM│───→│  LOCK   │───→│  PLAN   │───→│  BUILD  │───→│  TEST   │───→│ DELIVER │
│         │    │         │    │         │    │         │    │         │    │         │
│ Chat UI │    │ Freeze  │    │ Sprints │    │ Execute │    │ Verify  │    │ Cleanup │
│ Gather  │    │ Docs    │    │ Epics   │    │ Per     │    │ Full    │    │ Sync    │
│ Refine  │    │ Scaffold│    │ Tasks   │    │ Sprint  │    │ E2E     │    │ Close   │
└─────────┘    └─────────┘    └─────────┘    └─────────┘    └─────────┘    └─────────┘
     │              │              │              │              │              │
     ▼              ▼              ▼              ▼              ▼              ▼
  [Chat Logs]  [Gate: Lock]  [Gate: Plan]  [Gate: Sprint] [Gate: Accept] [Gate: Close]
  → Artifacts  → Artifacts   → Plan Docs   → Code + Tests → Reports     → Final State
```

---

## Phase 1: Brainstorm

**Trigger:** User starts a chat session with the Sophia intake agent (Open WebUI).

**Agent:** Intake Agent (Sonnet — conversational, lower cost)

### Flow

1. User describes their app idea in natural language.
2. Intake agent asks structured follow-up questions based on detected app type:

| App Type | Additional Questions |
|----------|---------------------|
| Web App | Frontend framework preference? Auth needed? Database? Real-time features? |
| API | REST vs GraphQL? Rate limiting? Versioning strategy? |
| CLI | Target platforms? Interactive or batch? Config management? |
| Mobile | Native or cross-platform? Offline support? Push notifications? |
| Full Stack | All of the above, plus deployment target |

3. Agent guides through each requirement category:
   - **Product requirements**: Features, user flows, business rules
   - **Technical requirements**: Stack, constraints, performance targets
   - **Testing requirements**: Coverage targets, E2E scenarios, edge cases
   - **Architecture requirements**: Deployment, scaling, data model, integrations
   - **User personas**: Who uses the frontend? Who consumes the API?
   - **User journeys**: Step-by-step paths per persona

4. Periodically, the agent summarizes what's been captured and asks for confirmation.

5. When the user says "lock this in" (or equivalent), Phase 2 triggers.

### Token Optimization
- Conversation history is summarized every 10 exchanges
- Previous summaries replace raw history (compression ratio ~5:1)
- Structured data extracted incrementally, not reprocessed at the end
- Intake agent runs on Sonnet, not Opus

### Output Artifacts
```
(stored in chat system, not yet in repo)
├── requirements-draft.yaml    # Structured extraction from conversation
├── personas-draft.md          # User persona descriptions
├── journeys-draft.md          # User journey maps
└── decisions-draft.md         # Architecture decisions made during brainstorm
```

### Failure Modes
- **Incomplete requirements**: Agent refuses to lock until minimum coverage thresholds are met per category
- **Contradictory requirements**: Agent surfaces contradictions and asks user to resolve before lock
- **Scope too large**: Agent recommends splitting into phases and asks user to define MVP scope

---

## Phase 2: Lock & Scaffold

**Trigger:** User says "lock this in"

**Gate:** Intent Lock — validates all requirement categories have minimum coverage

### Flow

1. **Validate completeness**: Check that all required categories have content above minimum threshold.
2. **Generate final artifacts**: Convert drafts to locked versions with schema validation.
3. **Create repository**:
   - Create folder at configured path (e.g., `~/repos/thalamus-labz/auto-code/{project-name}`)
   - Apply scaffold structure (see SCHEMAS.md)
   - Copy requirement documents into `requirements/`
4. **Initialize governance**: Run `sophia init` with detected tech stack.
5. **Create Leantime project**: API call to create project shell (populated in Phase 3).
6. **Sync to knowledge base**: Push initial requirements docs to ra-h_os.

### Repository Scaffold
```
{project-name}/
├── .sophia/
│   └── config.yaml
├── .github/
│   └── workflows/
│       └── ci.yaml              # Generated based on stack
├── requirements/
│   ├── requirements.yaml        # Machine-readable, locked
│   ├── REQUIREMENTS.md          # Human-readable summary
│   ├── personas/
│   │   ├── frontend-users.md
│   │   └── backend-users.md
│   ├── journeys/
│   │   └── {persona}-journey.md
│   └── architecture/
│       └── decisions.md
├── docs/
│   ├── plans/                   # Sprint plans (populated in Phase 3)
│   └── internal/                # .gitignore'd internal docs
├── src/                         # Source code (structure varies by stack)
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── .gitignore
├── README.md                    # Generated project overview
└── {stack-specific configs}     # package.json, tsconfig.json, etc.
```

### Token Optimization
- Scaffolding is template-based — minimal LLM usage (Haiku for README generation)
- Requirement artifacts are already structured from Phase 1
- No re-processing of conversation history

### Failure Modes
- **Incomplete requirements at lock**: Gate rejects, user prompted to fill gaps
- **Repository already exists**: Prompt user — merge, overwrite, or new name
- **Leantime API failure**: Log warning, continue without PM integration (non-blocking)
- **Knowledge base sync failure**: Log warning, continue (non-blocking)

---

## Phase 3: Plan

**Trigger:** Successful scaffold creation

**Agent:** Planner Agent (Opus — complex reasoning required)

### Flow

1. **Load context**: Requirements docs + tech stack config + memory check for similar projects.
2. **Generate implementation plan**:
   - Break requirements into sprints (each sprint is a deployable increment)
   - Break sprints into epics (each epic is a coherent feature)
   - Break epics into tasks (each task is a single unit of work)
   - For each task, define TDD test specification first
3. **Generate test plan**:
   - Unit test coverage targets per sprint
   - Integration test scenarios per sprint
   - E2E test plan: full persona journey coverage for final acceptance
4. **Configure CI/CD**:
   - Generate pipeline config (GitHub Actions or Google Cloud Build)
   - Define pipeline stages: lint → type-check → unit test → build → integration test
5. **Estimate token budget**:
   - Per-sprint estimate based on task count and complexity
   - Total project estimate
   - Display to user for approval
6. **Populate Leantime**:
   - Create sprints, epics, tasks in Leantime via API
   - Set up kanban board structure

### Output Artifacts
```
docs/plans/
├── IMPLEMENTATION_PLAN.md       # Full plan overview
├── sprint01/
│   ├── SPRINT_SPEC.md           # Scope, goals, acceptance criteria
│   ├── tasks.yaml               # Machine-readable task list
│   └── test-spec.md             # TDD test specifications
├── sprint02/
│   └── ...
├── e2e-test-plan.md             # Full E2E test plan
├── ci-cd-plan.md                # CI/CD configuration rationale
└── token-budget.yaml            # Token estimates per phase/sprint
```

### Token Optimization
- Planner loads ONLY: requirements.yaml, tech stack config, relevant memory entries
- Raw brainstorm conversation is NOT loaded
- Plan is generated in structured passes (sprints → epics → tasks) to keep per-call context small
- Opus used only for this phase; output artifacts are compact for downstream consumption

### Gate: Plan Approval
- Plan presented to user via dashboard or CLI
- User reviews sprint breakdown, scope, and token budget estimate
- User approves, requests changes, or rejects
- Approved plan is immutable — changes require a new planning cycle

### Failure Modes
- **Requirements too vague for planning**: Planner flags specific gaps, escalates to user
- **Scope exceeds reasonable sprint count**: Planner recommends MVP cut, user decides
- **Memory conflicts**: Planner surfaces conflicting patterns, user picks approach
- **Token budget exceeds user threshold**: Planner suggests scope reduction

---

## Phase 4: Build

**Trigger:** User approves implementation plan

**Agents:** Builder (Sonnet), Reviewer (Opus), Scaffolder (Haiku)

### Flow (Per Sprint)

1. **Load sprint context**: Sprint spec + task list + test specs + relevant source files only.
2. **For each task in order**:
   a. Load task-specific context (target files, test spec, relevant imports)
   b. Write failing test (TDD red)
   c. Implement code to pass test (TDD green)
   d. Refactor if needed (TDD refactor)
   e. Verify: tests pass, lint clean, type-check clean
   f. Commit with structured message: `[sprint-XX][epic-YY] task description`
   g. Release task context from agent memory
3. **Sprint completion**:
   a. Run full sprint test suite (unit + integration)
   b. Reviewer agent evaluates code quality, consistency, governance compliance
   c. Update Leantime board (tasks → Done)
   d. Update dashboard status
4. **Gate: Sprint Completion** — all tests pass, reviewer approves, policies satisfied.

### Token Optimization
- Builder agent is STATELESS — receives only the context needed for the current task
- Context per task: task spec (~200 tokens) + test spec (~300 tokens) + target files (~1-5k tokens) + relevant imports (~500 tokens)
- Total context per task: typically 2-7k tokens (vs. loading entire project: 50-200k tokens)
- After each task, context is released — no carry-forward between tasks
- Builder runs on Sonnet; Reviewer on Opus but only at sprint boundaries (not per task)
- Scaffolder (Haiku) handles boilerplate file creation

### Leantime Sync
- Task status updated on state transitions: To Do → In Progress → In Review → Done
- Sprint burndown updates automatically
- Blocking issues surfaced immediately

### Failure Modes
- **Test won't pass after 3 attempts**: Escalate to user with context (what failed, what was tried)
- **Agent generates code that doesn't type-check**: Auto-fix attempt, then escalate
- **Context window overflow**: Break task into smaller sub-tasks, re-plan
- **Drift from plan**: If a task requires changes not in the plan, pause and surface deviation
- **Build crash/interruption**: Resume from last committed task (checkpoint recovery)

---

## Phase 5: Test & Accept

**Trigger:** All sprints complete

**Agents:** Tester (Sonnet), Reviewer (Opus)

### Flow

1. **Full E2E test suite execution**:
   - Run each user persona's complete journey
   - Capture video/screenshots of all GUI interactions
   - Hash recordings for verification
2. **Quality gates**:
   - Lighthouse audit: performance, accessibility, best practices, SEO (target: 90+ all categories)
   - WCAG AA accessibility check
   - Visual regression: compare against design system baseline
   - Security scan: OWASP Top 10 check
3. **Generate test report**: Pass/fail per test, coverage metrics, quality scores.
4. **Gate: Final Acceptance** — presented to user for sign-off.

### Token Optimization
- Test execution is mostly tool-based (Playwright, Lighthouse CLI), not LLM-intensive
- LLM used only for: test result interpretation, report generation, failure analysis
- Haiku sufficient for report generation

### Failure Modes
- **E2E test failures**: Categorize (visual, functional, accessibility), attempt auto-fix for minor issues, escalate significant failures
- **Lighthouse scores below threshold**: Identify specific issues, attempt optimization, escalate if structural
- **Security findings**: Block acceptance, report findings, escalate all security issues to user

---

## Phase 6: Deliver & Close

**Trigger:** User accepts final test results

### Flow

1. **Repository cleanup**:
   - Remove unused dependencies
   - Clean root directory (only app files/folders)
   - Verify .gitignore completeness
   - Final lint and format pass
2. **Documentation finalization**:
   - Generate final README.md
   - Ensure all docs are in correct folders
   - Classify documents as public/internal
3. **Knowledge base sync**:
   - Push final documentation to ra-h_os
   - Update memory with project learnings (patterns, decisions, corrections)
4. **Leantime close**:
   - Mark all tasks as complete
   - Archive project
5. **Dashboard update**: Project status → Complete

### Token Optimization
- Cleanup is mostly tool-based (npm prune, eslint --fix), minimal LLM usage
- Documentation generation uses Haiku
- Memory updates are structured writes, not conversational

---

## Feedback Loops

### Within a Sprint (Build Phase)
```
Task Fails → Auto-retry (2x) → Escalate to User → User Decision → Resume or Re-plan
```

### Between Sprints
```
Sprint Review → Patterns Recorded → Next Sprint Benefits from Learnings
```

### Cross-Project
```
Project Complete → Memory Updated → Next Project Checks Memory → Avoids Past Mistakes
```

### Requirement Change
```
User Requests Change → Change Request Created → Impact Analysis → Re-plan Affected Sprints → User Approves → Resume
```
Changes do NOT modify locked requirements. A new version is created with an audit trail linking to the original.

---

## Command Reference

| Phase | User Command | System Response |
|-------|-------------|-----------------|
| Brainstorm | (natural chat) | Guided questions, periodic summaries |
| Lock | "lock this in" | Validate, scaffold, initialize governance |
| Plan | (automatic after lock) | Generate plan, present for approval |
| Plan | "approve the plan" | Begin build |
| Build | (autonomous) | Execute sprint-by-sprint |
| Build | "what's the status?" | Current sprint, task, progress, token usage |
| Build | "pause" | Checkpoint and halt build |
| Build | "resume" | Continue from last checkpoint |
| Test | (automatic after build) | Run full test suite, present results |
| Accept | "looks good" / "ship it" | Cleanup, sync, close |
| Any | "change request: {description}" | Create formal CR, assess impact |
