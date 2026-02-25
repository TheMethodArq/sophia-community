# Sophia v2 — Token Optimization Strategy

## Principle

Token usage is a first-class resource, managed like memory in systems programming. Every context load, agent call, and artifact pass is budgeted, tracked, and optimized.

---

## Model Routing

Not every task requires the most capable (and expensive) model. Sophia routes tasks to the cheapest model that can handle them reliably.

### Routing Table

| Task | Model | Rationale | Est. Tokens/Call |
|------|-------|-----------|------------------|
| **Requirements gathering** | Sonnet | Conversational, structured extraction | 2-4k in, 500-1k out |
| **Conversation summarization** | Haiku | Compression, not reasoning | 3-5k in, 500 out |
| **Scaffold generation** | Haiku | Template-based, minimal reasoning | 1-2k in, 1-3k out |
| **README generation** | Haiku | Structured writing from specs | 2-3k in, 1-2k out |
| **Sprint planning** | Opus | Complex decomposition, judgment | 5-10k in, 3-5k out |
| **Task planning** | Sonnet | Structured breakdown within defined sprint | 3-5k in, 1-2k out |
| **Test spec generation** | Sonnet | Structured, follows patterns | 2-4k in, 1-2k out |
| **Code generation (build)** | Sonnet | Primary coding work | 3-8k in, 1-5k out |
| **Simple edits/boilerplate** | Haiku | Config files, imports, repetitive code | 1-3k in, 500-2k out |
| **Code review** | Opus | Quality judgment, pattern recognition | 5-10k in, 1-2k out |
| **Test result analysis** | Sonnet | Interpret failures, suggest fixes | 2-5k in, 1-2k out |
| **Report generation** | Haiku | Structured output from data | 2-4k in, 1-3k out |
| **Documentation generation** | Haiku | Structured writing | 2-3k in, 1-3k out |
| **Memory queries** | Haiku | Keyword matching, retrieval | 1-2k in, 500 out |
| **Escalation context** | Sonnet | Summarize decision context for human | 3-5k in, 500-1k out |

### Cost Estimates (Approximate)

Based on Claude API pricing (subject to change):

| Model | Input (per 1M tokens) | Output (per 1M tokens) |
|-------|----------------------|------------------------|
| Opus | $15.00 | $75.00 |
| Sonnet | $3.00 | $15.00 |
| Haiku | $0.25 | $1.25 |

### Example Project Cost Estimate

A typical small-medium web app (5 sprints, 25 tasks):

| Phase | Model | Calls | Avg Tokens | Est. Cost |
|-------|-------|-------|------------|-----------|
| Brainstorm | Sonnet | ~15 | 4k in / 800 out | $0.36 |
| Summarization | Haiku | ~5 | 4k in / 500 out | $0.01 |
| Scaffold | Haiku | ~3 | 2k in / 2k out | $0.01 |
| Planning | Opus | ~3 | 8k in / 4k out | $1.26 |
| Task planning | Sonnet | ~5 | 4k in / 1.5k out | $0.17 |
| Build (coding) | Sonnet | ~50 | 6k in / 3k out | $3.15 |
| Build (boilerplate) | Haiku | ~20 | 2k in / 1k out | $0.04 |
| Code review | Opus | ~5 | 8k in / 1.5k out | $1.16 |
| Test analysis | Sonnet | ~10 | 3k in / 1k out | $0.24 |
| Reports/docs | Haiku | ~10 | 3k in / 2k out | $0.03 |
| **TOTAL** | | **~126 calls** | | **~$6.43** |

This is a rough baseline. Complex apps will scale linearly with task count. The system SHALL provide a project-specific estimate before build begins.

---

## Context Management

### The Core Problem

LLMs charge for every token in context. Loading a 100-file project into context for every task wastes money. The strategy: load minimal context per task, release it immediately after.

### Context Budget Per Task Type

| Task Type | Max Context Budget | What's Loaded |
|-----------|-------------------|---------------|
| Code generation | 8k tokens input | Task spec + test spec + target file(s) + direct imports |
| Code review | 12k tokens input | Sprint spec + all sprint files (chunked if needed) |
| Test generation | 5k tokens input | Task spec + target function signatures + existing test patterns |
| Planning | 15k tokens input | Requirements doc + tech stack + memory entries |
| Documentation | 5k tokens input | Source code summaries + project metadata |

### Context Loading Rules

1. **Never load the entire project.** Always load only what the current task needs.
2. **Prefer summaries over raw files.** If a file is needed for reference but not modification, load its summary (function signatures, exports, types) instead of the full file.
3. **Release immediately after use.** Each agent call is stateless. Context is not carried between tasks.
4. **Pre-compute file summaries.** At scaffold time and after each sprint, generate file summaries (signatures, exports, types) for use as lightweight context.

### File Summary Format

Generated and cached per file, updated on modification:

```yaml
# .sophia/summaries/src/components/UserProfile.tsx.yaml
path: src/components/UserProfile.tsx
type: react-component
exports:
  - name: UserProfile
    type: component
    props: { userId: string, onEdit: () => void }
  - name: useUserProfile
    type: hook
    params: { userId: string }
    returns: { user: User | null, loading: boolean, error: Error | null }
imports:
  - from: "@/types"
    names: [User]
  - from: "@/api/users"
    names: [fetchUser]
lines: 87
last_modified: 2024-01-15T10:30:00Z
```

This summary is ~150 tokens vs. the full file at ~800+ tokens. For reference-only context loading, use the summary.

---

## Phase Boundary Compression

At each phase transition, raw artifacts are compressed into summaries for downstream consumption.

### Compression Points

| Transition | Input | Compressed Output | Ratio |
|------------|-------|-------------------|-------|
| Brainstorm → Lock | Chat history (10-50k tokens) | requirements.yaml (~2k tokens) | 5-25x |
| Lock → Plan | Requirements + scaffold | Plan context (~3k tokens) | 2-3x |
| Plan → Build (per sprint) | Full plan (~5k tokens) | Sprint spec (~1k tokens) | 5x |
| Build → Test | All sprint artifacts | Test context (~2k tokens) | varies |
| Test → Deliver | Test results + project state | Delivery checklist (~500 tokens) | varies |

### Rule: Downstream Phases Never See Upstream Raw Data

The planner never sees chat history — it sees `requirements.yaml`.
The builder never sees the full plan — it sees the current sprint spec.
The tester never sees build decisions — it sees the test plan and the code.

---

## Token Budgets

### Per-Phase Budgets (Default, Configurable)

| Phase | Budget | Hard Limit | Enforcement |
|-------|--------|------------|-------------|
| Brainstorm | 50k tokens | 100k | Warn at budget, force summarization at limit |
| Planning | 30k tokens | 50k | Warn at budget, escalate at limit |
| Build (per sprint) | 100k tokens | 200k | Warn at budget, pause at limit |
| Testing | 30k tokens | 50k | Warn at budget, escalate at limit |
| Delivery | 10k tokens | 20k | Warn at budget |

### Budget Tracking

```yaml
# .sophia/token-usage.yaml (updated in real-time)
project: my-app
budget:
  total_estimated: 450000
  total_actual: 312000
  phases:
    brainstorm:
      budget: 50000
      actual: 38000
      status: complete
    planning:
      budget: 30000
      actual: 22000
      status: complete
    build:
      sprints:
        sprint01:
          budget: 100000
          actual: 78000
          status: complete
        sprint02:
          budget: 100000
          actual: 45000
          status: in_progress
    testing:
      budget: 30000
      actual: 0
      status: pending
    delivery:
      budget: 10000
      actual: 0
      status: pending
```

### Budget Overrun Protocol

1. **At 80% of phase budget**: Log warning, visible in dashboard
2. **At 100% of phase budget**: Pause, notify user, request approval to continue
3. **At hard limit**: Force pause, require explicit user authorization with updated estimate
4. **User can**: approve continuation, reduce scope, or abort

---

## Dry Run / Cost Estimation

Before any phase begins execution, the system provides a cost estimate.

### Pre-Build Estimate

```
Project: my-app
Stack: Next.js + TypeScript + Prisma + PostgreSQL

Estimated Build:
  Sprints: 5
  Tasks: 28

Token Estimate:
  Planning:    ~30,000 tokens ($1.50)
  Build:       ~350,000 tokens ($4.20)
  Testing:     ~25,000 tokens ($0.30)
  Delivery:    ~8,000 tokens ($0.10)
  ─────────────────────────────────
  Total:       ~413,000 tokens ($6.10)

  Buffer (20%): $1.22
  Estimated Total: $7.32

Proceed? [yes/no/reduce scope]
```

---

## Anti-Patterns to Avoid

### 1. Full Project Context Loading
**Wrong:** Load all source files into context for every task.
**Right:** Load only the files the current task modifies + direct dependencies.

### 2. Conversation History Accumulation
**Wrong:** Keep full chat history through entire brainstorm phase.
**Right:** Summarize every 10 exchanges, discard raw history.

### 3. Re-reading Requirements in Every Agent Call
**Wrong:** Include full requirements.yaml in every build task context.
**Right:** Include only the relevant task spec (which references requirements).

### 4. Using Opus for Everything
**Wrong:** Route all tasks to the most capable model.
**Right:** Use the cheapest model that can handle the task reliably.

### 5. Generating Then Re-parsing
**Wrong:** Generate a document, then call another agent to parse it.
**Right:** Generate in structured format (YAML) from the start — no second pass needed.

### 6. Verbose Agent Instructions
**Wrong:** 2000-token system prompt for every agent call.
**Right:** Role-specific, minimal system prompts cached and reused. 200-500 tokens max.

---

## Monitoring & Reporting

### Real-Time (Dashboard)
- Token usage per project (actual vs. budget)
- Token usage per agent per call
- Cost accumulation graph over build timeline
- Model routing distribution (what % of calls go to each model)

### Post-Build Report
- Total tokens consumed by phase
- Cost breakdown by model
- Efficiency metrics: tokens per task, tokens per line of code produced
- Comparison against initial estimate
- Recommendations for future optimization
