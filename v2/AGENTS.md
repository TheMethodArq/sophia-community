# Sophia v2 — Multi-Agent Coordination Specification

## Overview

Sophia v2 uses multiple specialized agents rather than one monolithic agent. Each agent has a defined role, model assignment, context budget, and interface contract. The orchestrator coordinates them.

---

## Agent Roles

```
┌─────────────────────────────────────────────────────┐
│                   ORCHESTRATOR                       │
│                                                     │
│  Owns: state, context, routing, lifecycle           │
│  Model: None (TypeScript process, not an LLM)       │
│                                                     │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐            │
│  │ PLANNER  │ │ BUILDER  │ │ REVIEWER │            │
│  │ Opus     │ │ Sonnet   │ │ Opus     │            │
│  └──────────┘ └──────────┘ └──────────┘            │
│                                                     │
│  ┌──────────┐ ┌──────────┐ ┌────────────┐          │
│  │ TESTER   │ │ SCAFFOLD │ │ DOCUMENTER │          │
│  │ Sonnet   │ │ Haiku    │ │ Haiku      │          │
│  └──────────┘ └──────────┘ └────────────┘          │
└─────────────────────────────────────────────────────┘
```

### Orchestrator (Not an LLM)

The orchestrator is a TypeScript process — not an LLM call. It manages state, routes tasks, prepares context bundles, and harvests results. This is critical for token efficiency: coordination logic uses zero tokens.

**Responsibilities:**
- Read sprint plan and decompose into executable tasks
- Prepare context bundles for each agent (minimal, task-specific)
- Route tasks to appropriate agent based on type and model routing table
- Track progress (tasks completed, tests passed, tokens consumed)
- Enforce governance (gate checks, policy evaluation, approval routing)
- Handle failures (retry, fallback, escalation)
- Manage file claims (prevent concurrent modification)
- Update external systems (Leantime, dashboard, knowledge base)

### Planner Agent

**Role:** Takes locked requirements and produces the implementation plan.

**Model:** Opus (complex reasoning, multi-step decomposition)

**Input Context:**
```
- requirements.yaml (~2k tokens)
- Tech stack config (~200 tokens)
- Relevant memory entries (~500-1k tokens)
- Planning system prompt (~300 tokens)
Total: ~3-4k tokens
```

**Output:**
- Sprint specifications (scope, goals, acceptance criteria)
- Epic breakdown per sprint
- Task decomposition per epic
- TDD test specifications per task
- Token budget estimate per sprint
- CI/CD pipeline recommendation

**When Used:**
- Phase 3 (Planning) — one-time per project
- Re-planning after a change request

**Token Budget:** 30k tokens total (input + output across all planning calls)

### Builder Agent

**Role:** Writes code. The primary execution agent.

**Model:** Sonnet (good coding ability, lower cost than Opus)

**Input Context (per task):**
```
- Task specification (~200 tokens)
- TDD test specification (~300 tokens)
- Target file(s) to modify (~1-5k tokens)
- Direct dependency summaries (~500 tokens)
- Relevant patterns from memory (~200 tokens)
- Build system prompt (~200 tokens)
Total: ~2-7k tokens per task
```

**Output:**
- Modified/created files
- Test execution results
- Decisions made during implementation

**When Used:**
- Phase 4 (Build) — once per task, many times per sprint

**Token Budget:** ~4-10k tokens per task (input + output)

**Key Constraint:** Builder is STATELESS. It receives a fresh context bundle for each task. No carry-forward between tasks. This is the primary token optimization.

### Reviewer Agent

**Role:** Reviews code quality at sprint boundaries.

**Model:** Opus (quality judgment requires strong reasoning)

**Input Context:**
```
- Sprint specification (~500 tokens)
- All files modified in sprint (~5-15k tokens, chunked if needed)
- Active policies (~500 tokens)
- Review system prompt (~300 tokens)
Total: ~6-16k tokens
```

**Output:**
- Pass/fail per file
- Quality issues with severity and location
- Policy compliance assessment
- Recommendations (optional, not required to action)

**When Used:**
- Phase 4 (Build) — once per sprint at sprint completion gate

**Token Budget:** ~20k tokens per review (input + output)

### Tester Agent

**Role:** Generates test specifications and analyzes test results.

**Model:** Sonnet (structured output, pattern-following)

**Input Context (test generation):**
```
- Task specification (~200 tokens)
- Function signatures/interfaces to test (~500-1k tokens)
- Existing test patterns (~500 tokens)
- Test system prompt (~200 tokens)
Total: ~1.5-2k tokens
```

**Input Context (failure analysis):**
```
- Test output/error (~500-2k tokens)
- Relevant source code (~1-3k tokens)
- Analysis system prompt (~200 tokens)
Total: ~2-5k tokens
```

**Output:**
- Test code (generation)
- Failure diagnosis + suggested fix (analysis)

**When Used:**
- Phase 4 (Build) — test generation before each coding task; failure analysis on test failures
- Phase 5 (Test) — E2E test result analysis

### Scaffolder Agent

**Role:** Generates boilerplate, config files, and project structure.

**Model:** Haiku (template-based, minimal reasoning needed)

**Input Context:**
```
- Tech stack config (~200 tokens)
- Scaffold template (~500 tokens)
- Scaffold system prompt (~200 tokens)
Total: ~900 tokens
```

**Output:**
- Generated files (package.json, tsconfig, CI config, README, etc.)

**When Used:**
- Phase 2 (Lock & Scaffold) — one-time
- Phase 4 (Build) — when creating new boilerplate files within a sprint

### Documenter Agent

**Role:** Generates and maintains documentation.

**Model:** Haiku (structured writing from specs, low complexity)

**Input Context:**
```
- Source material (code summaries, decisions, test results) (~2-3k tokens)
- Doc template (~300 tokens)
- Documentation system prompt (~200 tokens)
Total: ~2.5-3.5k tokens
```

**Output:**
- Markdown documentation files

**When Used:**
- Phase 3 (Planning) — generate plan documentation
- Phase 5 (Testing) — generate test reports
- Phase 6 (Delivery) — generate final documentation set

---

## Agent Lifecycle

```
                  ORCHESTRATOR
                      │
        1. Prepare    │   2. Spawn
        Context       │   Agent
        Bundle        │
        ┌─────────────┼──────────────┐
        │             │              │
        ▼             ▼              ▼
    [Context]    [Agent Process]  [Task Spec]
        │             │              │
        └─────────────┼──────────────┘
                      │
              3. Agent Executes
                      │
              4. Agent Returns
                 TaskResult
                      │
        ┌─────────────┼──────────────┐
        │             │              │
        ▼             ▼              ▼
    [Harvest]    [Update State]  [Release
     Results      Sprint/Task    Context]
        │          Progress       │
        │             │           │
        └─────────────┼───────────┘
                      │
              5. Next Task or
                 Gate Check
```

### Lifecycle Steps

1. **Prepare Context Bundle**: Orchestrator assembles the minimal context needed for the task. Loads file summaries (not full files) for dependencies. Loads full content only for files being modified.

2. **Spawn Agent**: Orchestrator calls the appropriate agent with the context bundle and task spec. Agent type determined by routing table.

3. **Agent Executes**: Agent performs the task within its context. Agent makes NO external calls — it works only with provided context. If the agent needs information not in context, it returns a `needs_context` result.

4. **Harvest Result**: Orchestrator receives the TaskResult. Updates sprint progress, token tracking, audit log. Commits code changes to git.

5. **Release & Route**: Context is released (no carry-forward). Orchestrator determines next action: next task, gate check, retry, or escalation.

---

## Concurrency Model

### Phase 1 (MVP): Sequential

All tasks execute sequentially through a single agent. Simple, predictable, debuggable.

```
Task 1 → Task 2 → Task 3 → Task 4 → Sprint Gate
```

### Phase 2+: Parallel Within Sprint

Independent tasks within a sprint can execute in parallel across multiple agents. The orchestrator identifies task dependencies and parallelizes where safe.

```
Task 1 ──→ Task 3 ──→ Sprint Gate
Task 2 ──→ Task 4 ──↗
```

### Dependency Detection

Tasks are considered independent if they:
- Modify different files (no file overlap)
- Don't import from each other's modified files
- Don't share database schema changes

The orchestrator builds a task dependency graph from the sprint plan and parallelizes maximally.

### File Claim Protocol

```typescript
interface FileClaim {
  file: string;
  agent: string;
  task: string;
  claimedAt: string;    // ISO timestamp
  mode: 'exclusive';    // v2 only supports exclusive claims
}
```

1. Before agent execution, orchestrator claims all files the task will modify.
2. If any file is already claimed, the task waits (or is reordered).
3. After agent returns, claims are released.
4. Claims are stored in SQLite and visible in dashboard.

---

## Error Handling

### Retry Strategy

| Error Type | Retries | Strategy |
|-----------|---------|----------|
| Test failure | 2 | Retry with error context added to prompt |
| Type check failure | 1 | Retry with error message in context |
| Lint failure | 1 | Auto-fix attempt (eslint --fix), then retry |
| Agent timeout | 1 | Retry with reduced context (summaries instead of full files) |
| Agent produces invalid output | 1 | Retry with stricter output format instructions |
| Unrecoverable error | 0 | Escalate to human immediately |

### Failure Escalation Format

```yaml
escalation:
  type: build_failure
  task: sprint01-epic02-task03
  description: "Unit test for UserProfile component fails after 3 attempts"
  error: "TypeError: Cannot read property 'name' of undefined at UserProfile.tsx:45"
  attempts:
    - attempt: 1
      approach: "Initial implementation following TDD spec"
      result: "TypeError on line 45"
    - attempt: 2
      approach: "Added null check for user object"
      result: "Test passes but breaks UserList integration"
    - attempt: 3
      approach: "Refactored to use optional chaining"
      result: "Same TypeError, root cause is in data fetching hook"
  recommendation: "The issue appears to be in useUserProfile hook returning undefined during loading state. This may require an architecture decision about loading state handling."
  options:
    - "Add loading state guard in component (quick fix)"
    - "Refactor hook to never return undefined (better pattern)"
    - "Skip this task and address in a later sprint"
  token_cost_so_far: 12400
```

### Checkpoint Recovery

After every successful task commit, the orchestrator saves a checkpoint:

```yaml
# .sophia/checkpoints/latest.yaml
project: my-app
sprint: sprint01
last_completed_task: sprint01-epic02-task02
tasks_remaining: 8
timestamp: 2024-01-15T10:30:00Z
token_usage:
  sprint_budget: 100000
  sprint_used: 34000
```

On crash or `sophia build --resume`, execution picks up from the checkpoint.

---

## System Prompts

Each agent type has a minimal, role-specific system prompt. These are NOT loaded from conversation history — they're predefined templates.

### System Prompt Guidelines

- **Max 500 tokens** per system prompt
- **Role-specific**: Only include instructions relevant to the agent's role
- **No redundancy**: Don't repeat the task spec in the system prompt
- **Governance constraints inline**: Active policies embedded as bullet points, not full policy documents

### Example: Builder System Prompt (~250 tokens)

```
You are a code builder working on a governed software project.

Your task is provided in the task specification. Follow TDD:
1. Write the failing test first (if test spec provided)
2. Implement code to pass the test
3. Refactor if clarity improves without changing behavior

Rules:
- Only modify files listed in the task spec
- Follow the project's existing code patterns and conventions
- Use the declared tech stack only — do not introduce new dependencies
- Handle errors with specific exception types and context messages
- No console.log or debug code in committed code
- All public functions must have TypeScript types

If you need information not provided in your context, return a
needs_context response with what you need. Do not guess.

Output your changes as file modifications with full file content.
```

---

## Agent Communication Protocol

Agents do NOT communicate with each other directly. All communication flows through the orchestrator.

```
Agent A                Orchestrator              Agent B
  │                        │                        │
  │── TaskResult ─────────→│                        │
  │                        │── Update State ───────→│(state DB)
  │                        │── Prepare Context ────→│
  │                        │                        │── TaskResult
  │                        │←───────────────────────│
  │                        │── Update State          │
```

### Inter-Task Data Flow

When Task B depends on Task A's output:
1. Task A completes, orchestrator commits changes to git
2. Orchestrator reads the committed files
3. Orchestrator includes relevant file content in Task B's context bundle
4. Task B executes with Task A's output available as file content

No shared memory, no message passing, no agent-to-agent channels. Git is the communication medium.
