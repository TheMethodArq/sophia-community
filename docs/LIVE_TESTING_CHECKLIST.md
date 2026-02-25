# Sophia Code v2 - Live Manual Testing Checklist

## 🎯 Quick Start (5 minutes)

**Setup:**
- [ ] Terminal 1: This repo, run `npm run dashboard` 
- [ ] Terminal 2: OpenCode session
- [ ] Browser: Open http://localhost:9473 (Dashboard)

---

## 📋 Test Suite A: Dashboard Navigation (2 min)

### A1. Overview Page
- [ ] Navigate to http://localhost:9473
- [ ] **Verify:** Page loads without errors
- [ ] **Verify:** Sidebar navigation visible
- [ ] **Verify:** System status indicators show

**Expected:** Overview shows session count, recent activity, health score

### A2. Sidebar Links
Click each link and verify page loads:
- [ ] Overview → Shows dashboard overview
- [ ] Bulletin → Shows activity feed  
- [ ] Sessions → Shows session management
- [ ] Health → Shows health dashboard
- [ ] Memory → Shows patterns/corrections
- [ ] Policies → Shows policy viewer
- [ ] Claims → Shows file claims
- [ ] Settings → Shows configuration
- [ ] Builds → Shows build history (if available)
- [ ] Escalations → Shows escalation center
- [ ] Tokens → Shows token usage (if available)

---

## 📋 Test Suite B: CLI Commands (3 min)

Run in Terminal 2 (OpenCode):

### B1. Basic Commands
```bash
# Test version
sophia --version
```
- [ ] **Verify:** Shows version number (e.g., 1.0.0)

```bash
# Test help
sophia --help
```
- [ ] **Verify:** Shows command list including:
  - [ ] init, status, sync
  - [ ] build, policy
  - [ ] memory, session
  - [ ] dashboard, watch
  - [ ] intake, change-request
  - [ ] github (new!)

### B2. Status Command
```bash
sophia status
```
- [ ] **Verify:** Shows project status
- [ ] **Verify:** Shows configuration path
- [ ] **Verify:** Shows detected agents

### B3. Session Commands
```bash
# Start a session
sophia session start --agent "opencode" --intent "Live E2E testing"
```
- [ ] **Verify:** Session created successfully
- [ ] **Verify:** Session ID displayed

```bash
# List sessions
sophia session list
```
- [ ] **Verify:** Shows active sessions including the one just created

**Dashboard Check:**
- [ ] Refresh http://localhost:9473/sessions
- [ ] **Verify:** New session appears in list

```bash
# End the session (replace <id> with actual ID)
sophia session end <session-id>
```
- [ ] **Verify:** Session ended successfully

---

## 📋 Test Suite C: Bulletin System (2 min)

### C1. Activity Logging
```bash
# Create a test bulletin entry
sophia bulletin --message "E2E test activity" --type "test"
```
- [ ] **Verify:** Entry created

**Dashboard Check:**
- [ ] Navigate to Bulletin page
- [ ] **Verify:** Test activity appears in feed
- [ ] **Verify:** Timestamp is correct
- [ ] **Verify:** Type badge shows "test"

---

## 📋 Test Suite D: Memory System (3 min)

### D1. Pattern Recording
```bash
# Add a test pattern
sophia memory add --type "pattern" --title "Test Pattern" --content "Always test after changes"
```
- [ ] **Verify:** Pattern added successfully

**Dashboard Check:**
- [ ] Navigate to Memory page
- [ ] **Verify:** Pattern appears in list
- [ ] **Verify:** Shows correct type and content

### D2. Correction Recording
```bash
# Add a test correction
sophia memory add --type "correction" --title "Test Correction" --content "Fixed indentation"
```
- [ ] **Verify:** Correction added

**Dashboard Check:**
- [ ] Refresh Memory page
- [ ] **Verify:** Correction appears

---

## 📋 Test Suite E: Policy System (2 min)

### E1. Policy Validation
```bash
sophia policy validate
```
- [ ] **Verify:** Validates all policies
- [ ] **Verify:** Reports any errors

**Dashboard Check:**
- [ ] Navigate to Policies page
- [ ] **Verify:** Policy list displayed
- [ ] **Verify:** Each policy shows status

---

## 📋 Test Suite F: Build System (5 min)

### F1. Build Command
```bash
sophia build --dry-run
```
- [ ] **Verify:** Shows what would be built

```bash
sophia build status
```
- [ ] **Verify:** Shows current build status

**Dashboard Check:**
- [ ] Navigate to Builds page
- [ ] **Verify:** Build history (if any builds exist)

---

## 📋 Test Suite G: GitHub Integration (Optional - 3 min)

**Prerequisites:** Set `GITHUB_TOKEN` environment variable

### G1. GitHub Status
```bash
sophia github status
```
- [ ] **Verify:** Shows connection status
- [ ] **Verify:** Shows authenticated user

### G2. Create Test Issue
```bash
sophia github create-issue --title "E2E Test Issue" --body "Testing GitHub integration"
```
- [ ] **Verify:** Issue created successfully
- [ ] **Verify:** Issue number and URL displayed

**Browser Check:**
- [ ] Visit the GitHub issue URL
- [ ] **Verify:** Issue exists with correct title
- [ ] **Verify:** Has "sophia-escalation" label

### G3. List Issues
```bash
sophia github issues --limit 5
```
- [ ] **Verify:** Lists open Sophia issues
- [ ] **Verify:** Shows severity labels

---

## 📋 Test Suite H: Intake System (3 min)

### H1. List Intakes
```bash
sophia intake-list
```
- [ ] **Verify:** Shows list of intake sessions (if any)

### H2. Resume Intake
```bash
sophia intake-resume --id <intake-id>
```
- [ ] **Verify:** Resumes intake conversation (if intakes exist)

---

## 📋 Test Suite I: Change Requests (2 min)

### I1. List Change Requests
```bash
sophia change-request list
```
- [ ] **Verify:** Shows change requests (if any)

### I2. View Change Request
```bash
sophia change-request show --id <cr-id>
```
- [ ] **Verify:** Shows change request details (if CRs exist)

---

## 📋 Test Suite J: Integration Testing (5 min)

### J1. End-to-End Flow
**Test the complete workflow:**

1. **Start a session:**
   ```bash
   sophia session start --agent "opencode" --intent "Integration test"
   ```
   - [ ] Session created

2. **Create an escalation:**
   ```bash
   sophia bulletin --message "Test escalation" --type "escalation" --severity "medium"
   ```
   - [ ] Escalation created

3. **Check Dashboard:**
   - [ ] Navigate to Escalations page
   - [ ] Verify escalation appears
   - [ ] Navigate to Sessions page
   - [ ] Verify session shows

4. **Create GitHub issue from escalation** (if GitHub configured):
   ```bash
   sophia github create-issue --escalation-id <escalation-id>
   ```
   - [ ] Issue created

5. **End session:**
   ```bash
   sophia session end <session-id>
   ```
   - [ ] Session ended

---

## 📋 Test Suite K: Error Handling (2 min)

### K1. Invalid Commands
```bash
sophia invalid-command
```
- [ ] **Verify:** Shows helpful error message
- [ ] **Verify:** Suggests similar commands

### K2. Missing Arguments
```bash
sophia session start
```
- [ ] **Verify:** Shows usage information
- [ ] **Verify:** Indicates required arguments

### K3. Unauthorized Access
```bash
# Without GITHUB_TOKEN
unset GITHUB_TOKEN
sophia github status
```
- [ ] **Verify:** Shows "not configured" message
- [ ] **Verify:** Provides setup instructions

---

## 📋 Test Suite L: Performance Checks (2 min)

### L1. Dashboard Load Time
- [ ] Navigate to Overview page
- [ ] **Verify:** Loads within 2 seconds

### L2. API Response Time
```bash
time curl -s http://localhost:9473/api/overview
```
- [ ] **Verify:** Response time < 500ms

### L3. CLI Response Time
```bash
time sophia status
```
- [ ] **Verify:** Completes within 1 second

---

## 🎉 Completion Checklist

**All tests completed?**
- [ ] Test Suite A (Dashboard Navigation)
- [ ] Test Suite B (CLI Commands)
- [ ] Test Suite C (Bulletin System)
- [ ] Test Suite D (Memory System)
- [ ] Test Suite E (Policy System)
- [ ] Test Suite F (Build System)
- [ ] Test Suite G (GitHub Integration) - Optional
- [ ] Test Suite H (Intake System)
- [ ] Test Suite I (Change Requests)
- [ ] Test Suite J (Integration Testing)
- [ ] Test Suite K (Error Handling)
- [ ] Test Suite L (Performance Checks)

**Issues Found:**
- [ ] None - All tests passed!
- [ ] Minor issues documented below
- [ ] Critical issues need immediate attention

**Notes:**
```
[Document any issues, observations, or suggestions here]

Example:
- Build command took 3s (expected <1s)
- Dashboard sometimes shows stale data until refresh
- GitHub integration works perfectly!
```

---

## 🚀 Quick Regression Test (1 minute)

Run this before any release:

```bash
# Quick health check
sophia status && \
sophia session list && \
sophia policy validate && \
echo "✓ All systems operational"
```

**Expected output:** All commands succeed, final message printed.

---

## 📞 Troubleshooting

### Dashboard not loading?
```bash
# Check if running
sophia dashboard status

# Start it
sophia dashboard start

# View logs
sophia dashboard logs
```

### CLI commands failing?
```bash
# Rebuild
npm run build

# Check permissions
ls -la packages/cli/dist/
```

### Database issues?
```bash
# Reset (WARNING: loses data)
rm .sophia/sophia.db
sophia init
```

---

**Last Updated:** 2026-02-19  
**Test Duration:** ~30 minutes (full), ~10 minutes (quick)  
**Success Criteria:** All critical tests pass, no blocking issues
