# Sophia v2 Phase 1 (MVP) — Implementation, Testing & Validation Plan

> **Document Version:** 1.0.0  
> **Created:** 2026-02-19  
> **Governance:** Sophia v2 — Phase 1 (MVP)  
> **Target:** Local machine setup with live testing before Git packaging

---

## Executive Summary

This plan outlines the implementation, testing, and validation strategy for Sophia v2 Phase 1 (MVP). The goal is to establish a functional governed autonomous build system on the local machine, validate it through comprehensive E2E testing, and achieve production-ready status before proceeding to Phase 2 (Integrations).

### Phase 1 Scope
- CLI-driven scaffold, plan, build, and estimate commands
- Autonomous build pipeline with TDD enforcement
- Token management and model routing
- Enhanced governance with approval routing
- Single-agent coordination (Claude Code)
- Integration with existing tools (Open WebUI, n8n, Leantime)

### Current Environment
- **Open WebUI:** Installed and available for chat interface
- **n8n:** Installed for workflow automation
- **Leantime:** Installed for project management
- **auto-code:** Located at `/Users/sesloan/repos/thalamus-labz/auto-code`
- **Sophia v1:** Existing codebase at `/Users/sesloan/repos/thalamus-labz/sophia.code`

---

## Part 1: Implementation Plan

### 1.1 Sprint Breakdown

| Sprint | Duration | Focus | Deliverables |
|--------|----------|-------|--------------|
| **Sprint 0** | Week 1 | Environment Setup & Architecture | Local dev environment, tool integrations, architecture foundation |
| **Sprint 1** | Weeks 2-3 | Core Commands & Scaffold | `sophia scaffold`, `sophia plan`, project structure generation |
| **Sprint 2** | Weeks 4-5 | Build Pipeline & Governance | `sophia build`, approval router, token tracking |
| **Sprint 3** | Weeks 6-7 | Testing & Quality Gates | Test runner integration, policy enforcement, checkpoint recovery |
| **Sprint 4** | Week 8 | Integration & Dashboard | Tool integrations, dashboard enhancements, E2E validation |

### 1.2 Detailed Sprint Plans

#### Sprint 0: Environment Setup & Architecture (Week 1)

**Goals:**
- Establish local development environment for live testing
- Set up integration points with existing tools
- Create architecture foundation for v2 components

**Tasks:**

1. **Environment Configuration (Day 1-2)**
   - [ ] Configure environment variables for integrations
   - [ ] Set up local database for Sophia v2 (SQLite)
   - [ ] Establish project directory structure
   - [ ] Configure git hooks for governance

2. **Integration Setup (Day 2-3)**
   - [ ] Connect to Open WebUI (verify API access)
   - [ ] Configure Leantime API connection
   - [ ] Set up n8n webhook endpoints for Sophia events
   - [ ] Test auto-code repository structure

3. **Architecture Foundation (Day 3-5)**
   - [ ] Implement orchestrator TypeScript process
   - [ ] Create agent adapter interface
   - [ ] Set up context management system
   - [ ] Implement checkpoint persistence

**Exit Criteria:**
- All integrations respond to health checks
- Orchestrator can spawn mock agents
- Database schema created and testable
- Local environment ready for live builds

---

#### Sprint 1: Core Commands & Scaffold (Weeks 2-3)

**Goals:**
- Implement `sophia scaffold` command
- Implement `sophia plan` command
- Generate governed project structures

**Tasks:**

1. **Scaffold Command (Week 2, Days 1-4)**
   - [ ] Parse `requirements.yaml` input
   - [ ] Generate governed folder structure
   - [ ] Initialize Sophia governance (`sophia init`)
   - [ ] Copy requirements documents
   - [ ] Generate README and boilerplate (Haiku)
   - [ ] Create CI/CD configuration based on stack
   - [ ] Add design system selection logic

2. **Plan Command (Week 2-3)**
   - [ ] Implement Planner Agent interface (Opus)
   - [ ] Generate sprint specifications
   - [ ] Create epic breakdown
   - [ ] Generate task decomposition
   - [ ] Write TDD test specifications per task
   - [ ] Estimate token budgets per sprint
   - [ ] Present plan for user approval

3. **Plan Artifacts Generation (Week 3)**
   - [ ] Create `docs/plans/IMPLEMENTATION_PLAN.md`
   - [ ] Generate sprint spec documents
   - [ ] Create task lists (machine-readable YAML)
   - [ ] Write E2E test plan
   - [ ] Generate token budget estimates

**Exit Criteria:**
- `sophia scaffold` creates valid governed projects
- `sophia plan` generates actionable sprint plans
- Plans include token budgets and test specifications
- User can approve plans via CLI

---

#### Sprint 2: Build Pipeline & Governance (Weeks 4-5)

**Goals:**
- Implement `sophia build` command
- Build autonomous execution pipeline
- Implement approval router and governance

**Tasks:**

1. **Build Command Foundation (Week 4)**
   - [ ] Implement `sophia build` CLI command
   - [ ] Create checkpoint save/restore mechanism
   - [ ] Implement task execution loop
   - [ ] Add progress tracking and reporting
   - [ ] Create resume functionality (`sophia build --resume`)

2. **Agent Integration (Week 4-5)**
   - [ ] Implement Claude Code adapter
   - [ ] Create context bundle preparation logic
   - [ ] Implement result harvesting
   - [ ] Add file claim management
   - [ ] Create agent lifecycle management (spawn/terminate)

3. **Approval Router (Week 5)**
   - [ ] Implement action classification logic
   - [ ] Create auto-approve rules
   - [ ] Build escalation formatting
   - [ ] Add inform-only logging
   - [ ] Implement human-required escalation UI

4. **Token Management (Week 5)**
   - [ ] Implement token tracking per task
   - [ ] Add budget enforcement
   - [ ] Create model routing table
   - [ ] Generate cost estimates
   - [ ] Build token usage reporting

**Exit Criteria:**
- `sophia build` executes sprint plans autonomously
- Approval router correctly classifies actions
- Token budgets tracked and enforced
- Builds can resume from checkpoints

---

#### Sprint 3: Testing & Quality Gates (Weeks 6-7)

**Goals:**
- Integrate TDD workflow into build pipeline
- Implement quality gates and policy enforcement
- Add test runner integration

**Tasks:**

1. **TDD Integration (Week 6)**
   - [ ] Implement Tester Agent interface
   - [ ] Generate failing tests before implementation
   - [ ] Verify tests pass after implementation
   - [ ] Add test result analysis on failure
   - [ ] Implement retry logic (2 attempts)

2. **Quality Gates (Week 6-7)**
   - [ ] Implement Sprint Completion gate
   - [ ] Add policy evaluation at gates
   - [ ] Create reviewer agent integration (Opus)
   - [ ] Implement code quality checks
   - [ ] Add security policy enforcement

3. **Test Runner (Week 7)**
   - [ ] Integrate Vitest for unit tests
   - [ ] Add integration test execution
   - [ ] Implement test coverage reporting
   - [ ] Create test failure categorization
   - [ ] Add test result logging

4. **Policy Engine Enhancements (Week 7)**
   - [ ] Add token-budget policy
   - [ ] Implement quality policy
   - [ ] Create testing coverage policy
   - [ ] Add repo hygiene checks

**Exit Criteria:**
- All tasks follow TDD workflow
- Quality gates block on policy violations
- Tests run automatically per task and sprint
- Coverage reports generated

---

#### Sprint 4: Integration & Dashboard (Week 8)

**Goals:**
- Integrate with existing tools (Open WebUI, Leantime, n8n)
- Enhance dashboard for build monitoring
- Validate complete E2E workflow

**Tasks:**

1. **Leantime Integration (Days 1-2)**
   - [ ] Implement Leantime adapter
   - [ ] Create project on scaffold
   - [ ] Sync sprints and tasks
   - [ ] Update task status during build
   - [ ] Add comments for decisions

2. **Open WebUI Integration (Days 2-3)**
   - [ ] Create Sophia tool for Open WebUI
   - [ ] Implement intake agent fallback
   - [ ] Add chat-based requirement gathering
   - [ ] Create "lock this in" trigger

3. **n8n Integration (Days 3-4)**
   - [ ] Configure webhook endpoints
   - [ ] Create workflow triggers for build events
   - [ ] Add notification workflows
   - [ ] Implement escalation routing

4. **Dashboard Enhancements (Days 4-5)**
   - [ ] Add build progress view
   - [ ] Create token usage charts
   - [ ] Implement escalation center
   - [ ] Add audit trail viewer
   - [ ] Create project status overview

5. **E2E Validation (Days 5-7)**
   - [ ] Run complete workflow: scaffold → plan → build → test
   - [ ] Validate all integrations
   - [ ] Test checkpoint recovery
   - [ ] Verify approval routing
   - [ ] Validate token tracking
   - [ ] Test escalation handling

**Exit Criteria:**
- All tool integrations functional
- Dashboard shows real-time build status
- Complete E2E workflow validated
- Ready for Phase 2

---

## Part 2: Testing Strategy

### 2.1 Testing Levels

#### Level 1: Unit Tests (Sophia Platform)

**Framework:** Vitest  
**Coverage Target:** 90% core modules, 80% adapters  
**Location:** Co-located with source (`*.test.ts`)

**Test Areas:**

| Module | Test Focus | Coverage Target |
|--------|------------|-----------------|
| Orchestrator | Task routing, state management, checkpoint save/restore | 95% |
| Context Manager | File summaries, bundle assembly, compression | 90% |
| Approval Router | Classification logic, escalation formatting | 95% |
| Token Tracker | Budget enforcement, model routing, cost calculation | 90% |
| Sprint Planner | Task decomposition, dependency detection | 85% |
| Agent Adapters | Context translation, result parsing | 85% |
| Policy Engine | Gate evaluation, policy checks | 90% |

**Test Fixtures:**
```
packages/cli/__fixtures__/
├── requirements/
│   ├── valid-webapp.yaml
│   ├── valid-api.yaml
│   ├── incomplete.yaml
│   └── contradictory.yaml
├── plans/
│   ├── simple-3sprint.yaml
│   └── complex-8sprint.yaml
└── contexts/
    ├── minimal-context.yaml
    └── full-sprint-context.yaml
```

#### Level 2: Integration Tests

**Framework:** Vitest with test fixtures  
**Coverage:** Full gate evaluation cycles, sprint execution simulation  

**Test Scenarios:**
1. Full gate evaluation (Intent Lock → Plan Approval → Sprint Completion)
2. Sprint execution simulation (plan → task sequence → completion)
3. Agent adapter round-trips with mocked LLM responses
4. Integration adapter connections (mock Leantime API)
5. Checkpoint save and restore

#### Level 3: E2E Tests (Sophia Platform)

**Framework:** Playwright (dashboard) + CLI test harness  
**Strategy:** Mock agent adapters (no real LLM calls for determinism)

**Test Workflows:**
1. **Full Build Workflow**
   - `sophia scaffold --from requirements.yaml`
   - `sophia plan` (approve plan)
   - `sophia build` (execute all sprints)
   - Verify output project structure

2. **Recovery Workflow**
   - Start build
   - Simulate crash mid-sprint
   - `sophia build --resume`
   - Verify continuation from checkpoint

3. **Governance Workflow**
   - Trigger actions requiring approval
   - Verify escalation format
   - Approve via CLI/dashboard
   - Verify continuation

4. **Dashboard Workflow**
   - View project list
   - Monitor active build
   - Review token usage
   - Approve escalation

### 2.2 Testing Apps Built by Sophia

Every app built by Sophia must pass:

#### TDD Enforcement
- Failing test generated before implementation
- Implementation passes test
- Refactoring preserves test pass
- All tests pass before commit

#### Test Pyramid
```
        ┌──────────┐
        │   E2E    │  Persona journeys, GUI interactions
       ┌┴──────────┴┐
       │ Integration │  API endpoints, multi-service
      ┌┴────────────┴┐
      │    Unit       │  Functions, components, utilities
      └───────────────┘
```

#### Quality Gates

| Gate | Tests | Blocking |
|------|-------|----------|
| Per Task | Unit tests for modified files | Yes |
| Sprint Completion | All unit + integration tests | Yes |
| Final Acceptance | Unit + integration + E2E + Lighthouse + a11y + security | Yes |

#### E2E Test Requirements

**Coverage:**
- All user personas defined in requirements
- All user journeys per persona
- All GUI interactions (navigation, forms, buttons, modals)
- Error states, loading states, empty states

**Recording:**
- Video recording of all E2E runs
- Screenshots on failure
- SHA-256 hash of recordings stored in audit trail
- Recordings stored in `tests/e2e/recordings/` (gitignored)

**Quality Thresholds:**
- Lighthouse: 90+ (performance, accessibility, best practices, SEO)
- WCAG AA: Zero violations
- Security: Zero OWASP Top 10 issues
- Coverage: 80%+ overall

---

## Part 3: Validation Plan

### 3.1 Pre-Sprint Validation Checklist

Before starting each sprint, validate:

- [ ] Previous sprint exit criteria met
- [ ] All tests passing
- [ ] Code coverage at target
- [ ] No critical security issues
- [ ] Documentation updated
- [ ] Integration health checks pass

### 3.2 Sprint Exit Validation

Each sprint must pass validation before proceeding:

#### Sprint 0 Exit Validation
- [ ] Environment variables configured
- [ ] Database schema created
- [ ] Integration health checks pass
  - [ ] Open WebUI API responds
  - [ ] Leantime API responds
  - [ ] n8n webhooks configured
- [ ] Orchestrator can spawn agents
- [ ] Checkpoints save and restore

#### Sprint 1 Exit Validation
- [ ] `sophia scaffold` creates valid projects
- [ ] Scaffolded projects have correct structure
- [ ] Requirements documents copied correctly
- [ ] `sophia plan` generates sprint specs
- [ ] Plans include token budgets
- [ ] User can approve/reject plans

#### Sprint 2 Exit Validation
- [ ] `sophia build` executes plans
- [ ] Tasks complete sequentially
- [ ] Approval router works correctly
- [ ] Token tracking accurate
- [ ] Checkpoint recovery functional
- [ ] Builds resume from checkpoints

#### Sprint 3 Exit Validation
- [ ] TDD workflow enforced
- [ ] Tests generated before implementation
- [ ] Quality gates block appropriately
- [ ] Policy violations detected
- [ ] Coverage reports generated
- [ ] Reviewer agent functional

#### Sprint 4 Exit Validation
- [ ] Leantime sync works
- [ ] Open WebUI tool functional
- [ ] n8n webhooks trigger
- [ ] Dashboard shows real-time status
- [ ] Escalation center accessible
- [ ] **Full E2E workflow validated**

### 3.3 Full E2E Validation (Sprint 4)

#### E2E Test Scenarios

**Scenario 1: Complete Build Workflow**
```
Input: requirements.yaml (web app)
Steps:
  1. sophia scaffold --from requirements.yaml
  2. sophia plan (review and approve)
  3. sophia build (execute all sprints)
  4. sophia test (final acceptance)

Validation:
  ✓ Project scaffolded with correct structure
  ✓ Plan generated with sprints, epics, tasks
  ✓ All sprints execute successfully
  ✓ Tests pass at each gate
  ✓ Output app meets quality thresholds
  ✓ Audit trail complete
```

**Scenario 2: Recovery After Crash**
```
Input: Approved plan
Steps:
  1. sophia build (start)
  2. Simulate crash after Sprint 1, Task 3
  3. sophia build --resume

Validation:
  ✓ Build resumes from Sprint 1, Task 4
  ✓ Previous tasks not re-executed
  ✓ State consistent
  ✓ Token usage cumulative
```

**Scenario 3: Escalation Handling**
```
Input: Plan with undeclared dependency
Steps:
  1. sophia build
  2. Builder encounters need for undeclared dependency
  3. System escalates with context
  4. User approves via CLI
  5. Build continues

Validation:
  ✓ Escalation formatted correctly
  ✓ Context includes options and recommendation
  ✓ User can approve/reject
  ✓ Build continues after approval
  ✓ Decision logged in audit trail
```

**Scenario 4: Token Budget Enforcement**
```
Input: Plan with token budget
Steps:
  1. sophia build
  2. Monitor token usage
  3. Exceed sprint budget

Validation:
  ✓ Token usage tracked accurately
  ✓ Warning issued at 80% of budget
  ✓ Escalation at 100% of budget
  ✓ Option to continue or adjust plan
```

**Scenario 5: Integration Sync**
```
Input: Plan with Leantime configured
Steps:
  1. sophia scaffold (creates Leantime project)
  2. sophia plan (creates sprints/tasks)
  3. sophia build (updates task status)

Validation:
  ✓ Leantime project created
  ✓ Sprints created in Leantime
  ✓ Tasks appear on kanban board
  ✓ Status updates sync in real-time
  ✓ Comments added for decisions
```

### 3.4 Quality Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Governance Adoption** | 100% | All builds pass security scan |
| **Time-to-Governed-Build** | <30 min | Idea to scaffolded project |
| **Approval Reduction** | <5% | Actions requiring human intervention |
| **Token Accuracy** | ±20% | Actual vs. estimated |
| **Output Quality** | 90+ | Lighthouse scores |
| **Test Coverage** | 80%+ | Overall coverage |
| **Recovery Success** | 100% | Resume from checkpoint |
| **Integration Uptime** | 99% | Tool integrations available |

### 3.5 Success Criteria for Phase 1

Phase 1 is considered complete when:

1. **Functionality**
   - [ ] All CLI commands functional (`scaffold`, `plan`, `build`, `estimate`)
   - [ ] Autonomous build executes end-to-end
   - [ ] TDD workflow enforced per task
   - [ ] Approval router operational
   - [ ] Token tracking accurate

2. **Quality**
   - [ ] 90%+ unit test coverage (core modules)
   - [ ] 80%+ integration test coverage
   - [ ] All E2E scenarios pass
   - [ ] Lighthouse 90+ on built apps
   - [ ] Zero critical security findings

3. **Integration**
   - [ ] Leantime sync functional
   - [ ] Open WebUI tool available
   - [ ] n8n webhooks operational
   - [ ] Dashboard displays real-time status

4. **Governance**
   - [ ] Gates enforced correctly
   - [ ] Policies evaluated at checkpoints
   - [ ] Audit trail complete
   - [ ] Escalations properly formatted

5. **Performance**
   - [ ] Requirements lock <60 seconds
   - [ ] Sprint planning <5 minutes
   - [ ] Dashboard updates <5 seconds
   - [ ] Token estimates within 20%

---

## Part 4: Local Machine Setup

### 4.1 Prerequisites

Ensure the following are installed and configured:

- [ ] Node.js 18+ and npm 9+
- [ ] Git
- [ ] Docker (for isolated testing)
- [ ] Open WebUI (running on configured port)
- [ ] Leantime (accessible via API)
- [ ] n8n (running with webhook capability)
- [ ] Claude Code (latest version)

### 4.2 Environment Configuration

Create `.env.local` in the project root:

```bash
# Sophia v2 Environment Configuration
SOPHIA_ENV=development
SOPHIA_LOG_LEVEL=debug

# Database
SOPHIA_DB_PATH=.sophia/sophia.db

# Open WebUI Integration
OPENWEBUI_BASE_URL=http://localhost:3000
OPENWEBUI_API_KEY=your_api_key_here

# Leantime Integration
LEANTIME_BASE_URL=https://your-leantime-instance.com
LEANTIME_API_KEY=your_api_key_here

# n8n Integration
N8N_BASE_URL=http://localhost:5678
N8N_WEBHOOK_URL=http://localhost:5678/webhook/sophia

# Knowledge Base (ra-h_os)
KNOWLEDGE_BASE_REPO=git@github.com:bradwmorris/ra-h_os.git
GITHUB_TOKEN=your_github_token_here

# Agent Configuration
PRIMARY_AGENT=claude-code
AGENT_CONFIG_PATH=.sophia/agents.yaml

# Token Budgets (Phase 1 defaults)
DEFAULT_SPRINT_BUDGET=100000
DEFAULT_PROJECT_BUDGET=500000
```

### 4.3 Directory Structure

```
sophia.code/                    # v1 codebase (existing)
├── packages/
│   ├── cli/                   # CLI tool
│   ├── shared/                # Shared types/schemas
│   └── dashboard/             # Next.js dashboard
├── v2/                        # v2 specifications (this directory)
└── docs/
    └── plans/                 # This plan document

sophia-v2/                     # v2 implementation workspace
├── src/
│   ├── core/                  # Orchestrator, governance, context
│   ├── agents/                # Agent adapters
│   ├── integrations/          # Tool integrations
│   ├── commands/              # CLI commands
│   └── dashboard/             # Dashboard enhancements
├── tests/
│   ├── unit/                  # Unit tests
│   ├── integration/           # Integration tests
│   └── e2e/                   # E2E tests
├── requirements/              # Test requirements
└── docs/plans/               # Implementation plans
```

### 4.4 Development Workflow

1. **Start Development Environment**
   ```bash
   # Terminal 1: Dashboard
   cd packages/dashboard && npm run dev
   
   # Terminal 2: CLI (watch mode)
   cd packages/cli && npm run dev
   
   # Terminal 3: Test runner
   npm run test:watch
   ```

2. **Test Changes**
   ```bash
   # Run unit tests
   npm test
   
   # Run specific test
   npm test -- src/core/orchestrator.test.ts
   
   # Run integration tests
   npm run test:integration
   
   # Run E2E tests
   npm run test:e2e
   ```

3. **Validate Build**
   ```bash
   # Type check
   npm run typecheck
   
   # Lint
   npm run lint
   
   # Build all packages
   npm run build
   ```

---

## Part 5: Risk Management

### 5.1 Identified Risks

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| **Token costs exceed budget** | High | Medium | Implement strict budgets; use Haiku for boilerplate; parallelize only when safe |
| **Agent produces invalid code** | High | Medium | TDD enforcement; reviewer agent at sprint boundaries; retry logic |
| **Integration failures** | Medium | Medium | Graceful degradation; fallback to local-only mode; comprehensive mocking |
| **Context window overflow** | Medium | Low | Context compression; file summaries; task-specific bundles |
| **Approval fatigue** | Medium | Low | Smart classification; target <5% human intervention |
| **Checkpoint corruption** | High | Low | Atomic writes; validation on restore; backup checkpoints |

### 5.2 Contingency Plans

**If token costs exceed estimates:**
1. Switch more tasks to Haiku (templated work)
2. Reduce context window sizes
3. Compress conversation history more aggressively
4. Escalate to user for budget increase or scope reduction

**If agent produces consistently poor code:**
1. Increase test coverage requirements
2. Add more detailed constraints to task specs
3. Use Opus for complex tasks instead of Sonnet
4. Record patterns in memory to prevent repetition

**If integrations fail:**
1. Fall back to local-only mode
2. Queue sync operations for retry
3. Log warnings but don't block builds
4. Provide manual sync commands

---

## Part 6: Documentation & Handoff

### 6.1 Documentation Requirements

Each sprint must produce:

- [ ] Updated README with new commands/features
- [ ] Architecture Decision Records (ADRs) for significant choices
- [ ] API documentation for new interfaces
- [ ] Test documentation (what's tested, how to run)
- [ ] User guide updates

### 6.2 Phase 1 Completion Deliverables

- [ ] Functional v2 CLI with all Phase 1 commands
- [ ] Working integrations with Open WebUI, Leantime, n8n
- [ ] Enhanced dashboard with real-time monitoring
- [ ] Complete test suite (unit, integration, E2E)
- [ ] Documentation set (user guide, API docs, ADRs)
- [ ] Migration guide from v1 to v2
- [ ] Performance benchmarks
- [ ] Security audit report

### 6.3 Phase 2 Readiness Criteria

Before starting Phase 2 (Integrations), ensure:

- [ ] Phase 1 E2E validation complete
- [ ] All success criteria met
- [ ] Documentation complete
- [ ] Code reviewed and approved
- [ ] Performance benchmarks acceptable
- [ ] No critical or high-severity bugs open
- [ ] Team trained on v2 workflow
- [ ] Rollback plan documented

---

## Appendix A: Test Requirements Template

For each feature, create test requirements:

```yaml
feature: scaffold-command
version: 1.0.0

unit_tests:
  - name: parse-requirements-yaml
    description: Parses valid requirements.yaml correctly
    mocks: [fs, path]
    assertions:
      - returns structured requirements object
      - validates against schema
      - throws on invalid YAML

  - name: generate-folder-structure
    description: Creates correct folder structure for web-app type
    mocks: [fs]
    assertions:
      - creates all required directories
      - creates src/ with correct subdirectories
      - creates tests/ directories

integration_tests:
  - name: scaffold-end-to-end
    description: Full scaffold with real file system
    setup:
      - create temp directory
      - copy test requirements.yaml
    assertions:
      - all files created
      - governance initialized
      - can run sophia status

e2e_tests:
  - name: cli-scaffold-command
    description: Run scaffold via CLI
    steps:
      - execute: sophia scaffold --from requirements.yaml --output ./test-project
      - verify: directory structure matches expected
      - verify: can run npm install
      - verify: can run sophia status
    cleanup:
      - remove test-project directory
```

---

## Appendix B: Glossary

| Term | Definition |
|------|------------|
| **Agent** | An AI model (Opus, Sonnet, Haiku) performing a specific role |
| **Context Bundle** | Minimal context provided to an agent for a task |
| **E2E Test** | End-to-end test covering complete user journeys |
| **Gate** | Checkpoint that must be satisfied to proceed |
| **Intake** | Phase 1: Requirements gathering via chat |
| **Intent Lock** | Freezing requirements into immutable artifacts |
| **Orchestrator** | TypeScript process managing agents and state |
| **Policy** | Rule evaluated at checkpoints |
| **Sprint** | Time-boxed set of tasks with defined scope |
| **TDD** | Test-Driven Development |
| **Token Budget** | Estimated/maximum tokens for a phase/sprint |

---

## Sign-off

**Plan Approval Required Before Sprint 0 Start:**

- [ ] Architecture Review
- [ ] Security Review
- [ ] Resource Allocation
- [ ] Timeline Commitment

**Approved By:**

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Product Owner | | | |
| Tech Lead | | | |
| Security Lead | | | |
| Stakeholder | | | |

---

*This plan follows Sophia v2 governance. All changes require formal change request.*
