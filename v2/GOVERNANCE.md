# Sophia v2 — Governance Model

## Overview

Governance in Sophia v2 is the mechanism that ensures AI-assisted builds follow enterprise-grade discipline without burdening the user with constant approvals. The system governs by design — the workflow structure itself enforces compliance.

---

## Governance Layers (Carried Forward from v1)

```
Layer 1: Cognexa (System of Thought)
  - Defines the artifact lifecycle
  - Intent → Gate → Contract → Execution → Verification
  - Artifacts are immutable once approved

Layer 2: Sophia (Governance Authority)
  - Enforces gates, evaluates policies
  - Routes approvals (auto, inform, human)
  - Maintains audit trail

Layer 3: Execution (The Labor)
  - Agents execute within governance constraints
  - Cannot bypass gates or skip policies
  - All actions are logged
```

## Gates

Gates are checkpoints that must be satisfied before the workflow can proceed. Each gate has entry criteria (what must be true) and exit criteria (what the gate produces).

### Gate Definitions

| Gate | Trigger | Entry Criteria | Exit Criteria | Approval |
|------|---------|---------------|---------------|----------|
| **Intent Lock** | User says "lock this in" | All requirement categories have minimum coverage | Locked requirements.yaml, scaffold created | Automatic (if criteria met) |
| **Plan Approval** | Planning phase complete | Sprint plan, test plan, token budget generated | User approves plan | Human required |
| **Sprint Completion** | All sprint tasks done | All tests pass, lint clean, type-check clean, reviewer approves | Sprint marked complete, next sprint unlocked | Automatic (if criteria met) |
| **Final Acceptance** | All sprints complete | Full E2E pass, Lighthouse 90+, WCAG AA, security clean | User signs off on deliverable | Human required |
| **Delivery** | User accepts | Cleanup complete, docs synced, memory updated | Project archived | Automatic |

### Gate Evaluation

```typescript
interface Gate {
  id: string;
  name: string;
  phase: Phase;
  entryCriteria: Criterion[];
  exitArtifacts: string[];
  approvalType: 'automatic' | 'human_required';
  onFailure: 'block' | 'warn_and_block' | 'escalate';
}

interface Criterion {
  id: string;
  description: string;
  evaluator: string;      // function that checks this criterion
  severity: 'required' | 'recommended';
  message_on_fail: string;
}
```

Gates are evaluated synchronously. If any `required` criterion fails, the gate blocks. `recommended` criteria generate warnings but don't block.

---

## Policy Engine (v2 Enhancements)

### Policy Categories

| Category | What It Checks | When Evaluated |
|----------|---------------|----------------|
| **Security** | No secrets in code, OWASP compliance, dependency vulnerabilities | Per commit + Sprint Completion gate |
| **Quality** | Code complexity, duplication, naming conventions | Sprint Completion gate |
| **Testing** | Coverage thresholds, test existence per feature | Per task + Sprint Completion gate |
| **Repo Hygiene** | File organization, root cleanliness, gitignore completeness | Sprint Completion + Final Acceptance |
| **UI Standards** | Design system adherence, accessibility, responsiveness | Sprint Completion + Final Acceptance |
| **Token Budget** | Usage within phase/sprint budgets | Continuous (per agent call) |
| **Documentation** | Docs exist for public APIs, README current, changelog updated | Final Acceptance |
| **Accessibility** | WCAG AA compliance, screen reader compatibility, keyboard navigation | Final Acceptance |

### Policy Definition Format

```yaml
# policies/token-budget.yaml
name: token-budget
description: Enforce token usage within defined budgets
severity: warning  # or 'error' for blocking
rules:
  - id: phase-budget
    description: Phase token usage must not exceed budget
    check: token_usage.phase.actual <= token_usage.phase.budget
    on_violation: warn
    escalate_at: token_usage.phase.actual > token_usage.phase.hard_limit

  - id: sprint-budget
    description: Sprint token usage must not exceed budget
    check: token_usage.sprint.actual <= token_usage.sprint.budget
    on_violation: warn
    escalate_at: token_usage.sprint.actual > token_usage.sprint.hard_limit

  - id: model-routing
    description: Tasks must use the designated model tier
    check: agent.model == routing_table[agent.task_type].model
    on_violation: error
```

### Policy Evaluation Timing

Policies are NOT evaluated on every file change (too expensive). They're evaluated at defined checkpoints:

1. **Per agent call**: Token budget policy only
2. **Per task commit**: Security policy (no secrets), test existence
3. **Sprint completion gate**: All policies
4. **Final acceptance gate**: All policies at highest strictness

---

## Approval Router

The approval router is the key innovation for reducing approval fatigue. It classifies every action the system wants to take into one of three categories.

### Classification Logic

```
Action Classification Flow:

1. Is the action within the declared tech stack?
   YES → Likely auto-approve
   NO  → Likely human-required

2. Is the action reversible?
   YES → Lower escalation threshold
   NO  → Higher escalation threshold

3. Is the action security-sensitive?
   YES → Always human-required
   NO  → Continue evaluation

4. Does the action modify architecture?
   YES → Human-required
   NO  → Continue evaluation

5. Does the action exceed budget?
   YES → Human-required
   NO  → Continue evaluation

6. Is the action within the sprint plan scope?
   YES → Auto-approve
   NO  → Escalate (scope drift)
```

### Action Categories

**Auto-Approve (Target: 90%+ of actions)**
- File creation/modification within project scope
- Running declared test frameworks
- Installing dependencies declared in tech stack
- Linting and formatting fixes
- Git commits following naming convention
- Reading files for context
- Running build commands for declared stack

**Inform-Only (Target: 5% of actions)**
- Minor refactors during implementation
- Documentation updates
- Adding development-only dependencies
- Non-functional code changes (comments, formatting)

**Human-Required (Target: <5% of actions)**
- Adding dependencies not in declared stack
- Changing architecture patterns (e.g., switching from REST to GraphQL)
- Modifying security-sensitive code (auth, encryption, secrets)
- Scope changes (implementing features not in requirements)
- Budget overruns (token usage exceeds approved budget)
- Unresolvable test failures (after 3 retry attempts)
- Conflicting requirements discovered during build

### Escalation Format

When a human decision is needed, the system provides:

```markdown
## Decision Required

**What:** Adding `@sendgrid/mail` dependency for email notifications
**Why:** The email notification feature in Sprint 3, Epic 2 requires an email service.
         This dependency was not included in the original tech stack declaration.
**Options:**
  1. **Add SendGrid** — Well-documented, generous free tier, 3 tasks depend on this
  2. **Add Resend** — Simpler API, but less mature
  3. **Use native SMTP** — No new dependency, but more code to maintain
  4. **Skip email feature** — Defer to a future sprint

**Recommendation:** Option 1 (SendGrid) — best documentation, most reliable for production

**Impact:** +1 dependency, ~$0.40 additional token cost for integration code

[Approve 1] [Approve 2] [Approve 3] [Approve 4] [Discuss]
```

---

## Audit Trail

Every governance event is recorded in an append-only audit log.

### Audit Entry Schema

```yaml
entry:
  id: uuid
  timestamp: ISO-8601
  project: string
  phase: brainstorm | lock | plan | build | test | deliver
  sprint: string | null
  type: gate_evaluation | policy_check | approval | decision | escalation | error
  agent: string | null
  action: string
  result: pass | fail | warn | approved | rejected | pending
  context:
    description: string
    artifacts_involved: string[]
    token_cost: number
    model_used: string | null
  human_input: string | null  # if human was involved
```

### Audit Storage

- **Primary**: SQLite database (queryable, fast)
- **Secondary**: Git commits (immutable, versioned)
- **Dashboard**: Real-time view with search and filter

### Retention

- Active projects: all entries retained
- Completed projects: entries retained for 1 year, then summarized
- Summaries: retained indefinitely (patterns, decisions, learnings)

---

## Governance Levels

Configurable per project, inherited from v1 with refinements:

| Level | Target User | Gate Strictness | Policy Enforcement | Approval Threshold |
|-------|-------------|-----------------|-------------------|--------------------|
| **Community** | Hobbyists, learners | Warn only | Recommended | Minimal |
| **Startup** | Solo devs, small teams | Block on required | Required + Recommended | Standard |
| **Enterprise** | Agencies, production apps | Block on all | All policies | Strict |

### Level-Specific Behavior

**Community:**
- Gates warn but don't block
- Policies are advisory
- Token budgets are suggestions
- All actions auto-approve except security-sensitive

**Startup (Default):**
- Gates block on required criteria
- Core policies enforced (security, testing, quality)
- Token budgets enforced with soft limits
- Standard approval routing

**Enterprise:**
- All gates strictly enforced
- All policies enforced at highest strictness
- Token budgets enforced with hard limits
- Additional human review gates (e.g., code review at sprint boundary)
- Compliance artifacts generated (SOC2-adjacent documentation)

---

## Change Request Protocol

Once requirements are locked, changes must go through a formal process:

1. **User requests change**: Describes desired modification
2. **Impact analysis**: System evaluates which sprints, tasks, and tests are affected
3. **New version created**: requirements-v2.yaml with change log
4. **Re-planning**: Affected sprints are re-planned with new estimates
5. **User approves**: Updated plan with cost delta
6. **Execution resumes**: From the first affected sprint

Changes do not modify the original locked requirements. They create a new version with an audit trail linking to the original. This preserves the history of intent evolution.
