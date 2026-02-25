# E2E Test Plan — Sophia v2 Phase 1 Validation

> **Comprehensive E2E testing before Phase 2 commencement**  
> **Status:** Template — Fill in results as tests execute

---

## Test Overview

| Attribute | Value |
|-----------|-------|
| **Test Phase** | Phase 1 (MVP) Exit Validation |
| **Test Type** | End-to-End Integration |
| **Environment** | Local Development Machine |
| **Tools** | Open WebUI, n8n, Leantime, Claude Code |
| **Target Date** | End of Sprint 4 |

---

## Test Scenarios

### Scenario 1: Complete Build Workflow

**Objective:** Validate the full workflow from requirements to deployed app

**Prerequisites:**
- [ ] Sophia v2 CLI built and installed
- [ ] All integrations configured
- [ ] Test requirements.yaml prepared

**Steps:**

| Step | Action | Expected Result | Status | Notes |
|------|--------|-----------------|--------|-------|
| 1.1 | Run `sophia scaffold --from requirements.yaml` | Project created with correct structure | ⬜ | |
| 1.2 | Verify directory structure | All folders exist (src/, tests/, docs/, etc.) | ⬜ | |
| 1.3 | Check requirements copied | requirements/ folder populated | ⬜ | |
| 1.4 | Verify governance initialized | .sophia/config.yaml exists | ⬜ | |
| 1.5 | Run `sophia plan` | Plan generated in docs/plans/ | ⬜ | |
| 1.6 | Review sprint specs | Sprint docs created with tasks | ⬜ | |
| 1.7 | Approve plan | User can approve via CLI | ⬜ | |
| 1.8 | Run `sophia build` | Build starts and executes | ⬜ | |
| 1.9 | Monitor progress | Dashboard shows real-time status | ⬜ | |
| 1.10 | Verify sprint completion | All sprints complete successfully | ⬜ | |
| 1.11 | Check output app | App builds and runs locally | ⬜ | |
| 1.12 | Verify quality gates | All gates passed | ⬜ | |

**Pass Criteria:**
- All steps complete without errors
- Output app functional
- Audit trail complete

---

### Scenario 2: Checkpoint Recovery

**Objective:** Validate build can resume after interruption

**Prerequisites:**
- [ ] Approved plan exists
- [ ] Build started at least once

**Steps:**

| Step | Action | Expected Result | Status | Notes |
|------|--------|-----------------|--------|-------|
| 2.1 | Start build | Build begins, tasks executing | ⬜ | |
| 2.2 | Note checkpoint | Record last completed task | ⬜ | |
| 2.3 | Interrupt build | Kill process mid-execution | ⬜ | |
| 2.4 | Check checkpoint file | .sophia/checkpoints/latest.yaml exists | ⬜ | |
| 2.5 | Run `sophia build --resume` | Build resumes from checkpoint | ⬜ | |
| 2.6 | Verify no duplicate work | Previously completed tasks skipped | ⬜ | |
| 2.7 | Complete build | Build finishes successfully | ⬜ | |

**Pass Criteria:**
- Resume continues from correct task
- No tasks executed twice
- State consistent

---

### Scenario 3: Approval Router

**Objective:** Validate action classification and escalation

**Prerequisites:**
- [ ] Build in progress
- [ ] Test scenario requiring approval prepared

**Steps:**

| Step | Action | Expected Result | Status | Notes |
|------|--------|-----------------|--------|-------|
| 3.1 | Trigger auto-approve action | Action executes without prompt | ⬜ | |
| 3.2 | Check audit log | Auto-approve logged | ⬜ | |
| 3.3 | Trigger inform-only action | Action executes, logged only | ⬜ | |
| 3.4 | Check inform log | Inform entry in audit | ⬜ | |
| 3.5 | Trigger human-required action | Escalation surfaced | ⬜ | |
| 3.6 | Review escalation format | Context, options, recommendation shown | ⬜ | |
| 3.7 | Approve via CLI | Build continues | ⬜ | |
| 3.8 | Check audit trail | Decision logged with context | ⬜ | |
| 3.9 | Reject escalation | Build pauses appropriately | ⬜ | |

**Pass Criteria:**
- Auto-approve: >90% of actions
- Human-required: <5% of actions
- Escalations include full context

---

### Scenario 4: Token Budget Management

**Objective:** Validate token tracking and budget enforcement

**Prerequisites:**
- [ ] Plan with token budget created

**Steps:**

| Step | Action | Expected Result | Status | Notes |
|------|--------|-----------------|--------|-------|
| 4.1 | Check token estimate | Budget shown in plan | ⬜ | |
| 4.2 | Start build | Token tracking begins | ⬜ | |
| 4.3 | Monitor usage | Dashboard shows actual vs budget | ⬜ | |
| 4.4 | Verify per-task tracking | Each task shows token cost | ⬜ | |
| 4.5 | Exceed 80% budget | Warning issued | ⬜ | |
| 4.6 | Exceed 100% budget | Escalation triggered | ⬜ | |
| 4.7 | Approve budget increase | Build continues | ⬜ | |
| 4.8 | Verify final usage | Total within ±20% of estimate | ⬜ | |

**Pass Criteria:**
- Tracking accurate
- Warnings at 80%
- Escalation at 100%
- Final cost within 20% of estimate

---

### Scenario 5: Integration Sync

**Objective:** Validate tool integrations work correctly

**Prerequisites:**
- [ ] Open WebUI running
- [ ] Leantime accessible
- [ ] n8n running with webhooks

**Steps:**

| Step | Action | Expected Result | Status | Notes |
|------|--------|-----------------|--------|-------|
| 5.1 | Run scaffold | Leantime project created | ⬜ | |
| 5.2 | Verify Leantime project | Project visible in Leantime UI | ⬜ | |
| 5.3 | Run plan | Sprints created in Leantime | ⬜ | |
| 5.4 | Verify sprints | Sprint dates correct | ⬜ | |
| 5.5 | Check tasks | Tasks appear on kanban | ⬜ | |
| 5.6 | Start build | Task status: In Progress | ⬜ | |
| 5.7 | Complete task | Task status: Done | ⬜ | |
| 5.8 | Check n8n webhook | Webhook triggered on events | ⬜ | |
| 5.9 | Verify notifications | n8n workflow executed | ⬜ | |
| 5.10 | Test Open WebUI tool | Tool responds to commands | ⬜ | |

**Pass Criteria:**
- All integrations sync correctly
- Real-time updates functional
- Webhooks trigger appropriately

---

### Scenario 6: TDD Workflow Enforcement

**Objective:** Validate Test-Driven Development is enforced

**Prerequisites:**
- [ ] Build in progress
- [ ] Task with test spec

**Steps:**

| Step | Action | Expected Result | Status | Notes |
|------|--------|-----------------|--------|-------|
| 6.1 | Review task spec | TDD test specification exists | ⬜ | |
| 6.2 | Start task | Test generation begins first | ⬜ | |
| 6.3 | Verify failing test | Test created, fails initially | ⬜ | |
| 6.4 | Implementation | Code written to pass test | ⬜ | |
| 6.5 | Run tests | Tests pass | ⬜ | |
| 6.6 | Verify commit | Code committed with tests | ⬜ | |
| 6.7 | Test failure scenario | Introduce bug, test fails | ⬜ | |
| 6.8 | Retry logic | 2 retries attempted | ⬜ | |
| 6.9 | Escalation | Unresolved failure escalates | ⬜ | |

**Pass Criteria:**
- Tests written before implementation
- All tests pass before commit
- Retry logic functional
- Failures escalate appropriately

---

### Scenario 7: Quality Gates

**Objective:** Validate gates block progression appropriately

**Prerequisites:**
- [ ] Build with multiple sprints

**Steps:**

| Step | Action | Expected Result | Status | Notes |
|------|--------|-----------------|--------|-------|
| 7.1 | Complete sprint tasks | All tasks done | ⬜ | |
| 7.2 | Run tests | All tests pass | ⬜ | |
| 7.3 | Review quality checks | Reviewer agent runs | ⬜ | |
| 7.4 | Verify gate pass | Sprint gate opens | ⬜ | |
| 7.5 | Introduce failure | Break a test | ⬜ | |
| 7.6 | Attempt gate | Gate blocks | ⬜ | |
| 7.7 | Fix failure | Restore passing tests | ⬜ | |
| 7.8 | Retry gate | Gate opens | ⬜ | |

**Pass Criteria:**
- Gates block on failures
- Clear error messages
- Retry mechanism works

---

### Scenario 8: Governance Audit Trail

**Objective:** Validate complete audit trail

**Prerequisites:**
- [ ] Build completed

**Steps:**

| Step | Action | Expected Result | Status | Notes |
|------|--------|-----------------|--------|-------|
| 8.1 | Check database | SQLite database has entries | ⬜ | |
| 8.2 | Query audit log | Can view all events | ⬜ | |
| 8.3 | Verify gate entries | All gates logged | ⬜ | |
| 8.4 | Check decisions | Decisions with context | ⬜ | |
| 8.5 | Verify token costs | Costs logged per action | ⬜ | |
| 8.6 | Check git commits | Commit messages structured | ⬜ | |
| 8.7 | Dashboard audit view | Can view in dashboard | ⬜ | |
| 8.8 | Export audit | Can export for reporting | ⬜ | |

**Pass Criteria:**
- All events logged
- Queryable via CLI and dashboard
- Git commits structured

---

## Test Results Summary

### Overall Status

| Scenario | Status | Blockers | Notes |
|----------|--------|----------|-------|
| 1: Complete Build | ⬜ | | |
| 2: Checkpoint Recovery | ⬜ | | |
| 3: Approval Router | ⬜ | | |
| 4: Token Budget | ⬜ | | |
| 5: Integration Sync | ⬜ | | |
| 6: TDD Workflow | ⬜ | | |
| 7: Quality Gates | ⬜ | | |
| 8: Audit Trail | ⬜ | | |

**Overall Result:** ⬜ PASS / ⬜ FAIL

### Critical Issues

| Issue | Severity | Impact | Status |
|-------|----------|--------|--------|
| | | | |

### Recommendations

1. 
2. 
3. 

---

## Sign-off

**Test Execution:**
- Executed By:
- Date:
- Duration:

**Approval:**

| Role | Name | Signature | Date |
|------|------|-----------|------|
| QA Lead | | | |
| Tech Lead | | | |
| Product Owner | | | |

---

**Ready for Phase 2:** ⬜ YES / ⬜ NO

If NO, list remaining blockers:
1. 
2. 
3. 

---

*This test plan must be completed before Phase 2 begins.*
