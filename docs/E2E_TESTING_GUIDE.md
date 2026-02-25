# 🧪 Sophia Code Live E2E Testing Guide

Interactive testing setup for validating Sophia Code with real-time feedback.

## 🖥️ Setup (30 seconds)

**Screen Layout:**
```
┌─────────────────────┬─────────────────────┐
│                     │                     │
│  Terminal/          │   Browser           │
│  OpenCode           │   (Open WebUI)      │
│                     │                     │
│  Running tests      │   Dashboard         │
│  Watching output    │   http://localhost  │
│                     │   :9473             │
│                     │                     │
└─────────────────────┴─────────────────────┘
```

**Quick Start:**
```bash
# Terminal 1 - Start dashboard
npm run dashboard

# Terminal 2 - Run tests
./scripts/test-live-e2e.sh
```

---

## 📁 Testing Files

| File | Purpose | Usage |
|------|---------|-------|
| `scripts/test-live-e2e.sh` | Full automated E2E suite | `./scripts/test-live-e2e.sh --quick` |
| `scripts/quick-health-check.sh` | 5-second health check | `./scripts/quick-health-check.sh` |
| `docs/LIVE_TESTING_CHECKLIST.md` | Manual testing guide | Follow step-by-step |

---

## 🚀 Quick Test (5 minutes)

```bash
# 1. Health check (10 seconds)
./scripts/quick-health-check.sh

# 2. Basic E2E (3 minutes)
./scripts/test-live-e2e.sh --quick

# 3. Manual verification (2 minutes)
# Open browser to http://localhost:9473
# Click through each sidebar link
```

**Expected Result:** All checks pass ✅

---

## 🔬 Full E2E Test (30 minutes)

```bash
# Complete automated + manual testing
./scripts/test-live-e2e.sh --full
```

This runs:
1. ✅ Automated CLI tests
2. ✅ API endpoint validation
3. ✅ Dashboard navigation tests
4. ✅ Interactive manual checks
5. ✅ Integration tests (GitHub, etc.)

---

## 🎯 Test Scenarios

### Scenario 1: First-Time User
```bash
# Fresh install test
mkdir /tmp/test-sophia && cd /tmp/test-sophia
sophia init
sophia status
sophia dashboard start
```
**Verify:** Dashboard accessible, no errors

### Scenario 2: Active Development
```bash
# Simulate active coding session
sophia session start --agent "opencode" --intent "Testing features"
sophia build --dry-run
sophia policy validate
sophia session end <session-id>
```
**Verify:** Session tracked, build works, policies enforced

### Scenario 3: Issue Escalation
```bash
# Create escalation and verify in dashboard
sophia bulletin --message "Found a bug" --type "escalation" --severity "high"
```
**Verify:** Appears in Bulletin and Escalations pages

### Scenario 4: GitHub Integration
```bash
# Export token first
export GITHUB_TOKEN="ghp_..."

# Create issue from escalation
sophia github create-issue --escalation-id <escalation-id>
```
**Verify:** Issue created in GitHub with correct labels

---

## 📝 Manual Testing Checklist

**Before Release - Run All:**
- [ ] Dashboard loads all pages
- [ ] CLI commands respond correctly
- [ ] Sessions tracked properly
- [ ] Bulletin records activities
- [ ] Memory stores patterns
- [ ] Policies validate successfully
- [ ] GitHub integration works (if configured)

**See:** `docs/LIVE_TESTING_CHECKLIST.md` for detailed steps

---

## 🐛 Troubleshooting

### Dashboard not accessible?
```bash
# Check if running
curl http://localhost:9473/api/overview

# Restart
sophia dashboard restart

# Check logs
sophia dashboard logs
```

### CLI errors?
```bash
# Rebuild
npm run build

# Check installation
which sophia
sophia --version
```

### Tests failing?
```bash
# Reset test environment
rm -rf /tmp/sophia-test-repo-*
sophia clean

# Reset database (careful!)
rm .sophia/sophia.db && sophia init
```

---

## 📊 Test Results Interpretation

### All Green ✅
```
✅ CLI Commands: 5 passed
✅ Dashboard API: 3 passed
✅ Database: 2 passed
✅ Build Status: 2 passed

🎉 All systems operational!
```
**Action:** Ready for use/release

### Warnings ⚠️
```
✅ CLI Commands: 5 passed
⚠️  Dashboard API: 2 passed, 1 skipped
⚠️  GitHub: Integration not configured
```
**Action:** Optional features not available, core works fine

### Failures ❌
```
❌ Dashboard API: 1 failed
❌ Database: 1 failed
```
**Action:** Review errors, fix issues, re-run tests

---

## 🔄 Continuous Testing

**During Development:**
```bash
# Run before each commit
./scripts/quick-health-check.sh
```

**Before PR:**
```bash
# Full validation
./scripts/test-live-e2e.sh --full
```

**Nightly:**
```bash
# Comprehensive regression
./scripts/test-live-e2e.sh --full 2>&1 | tee test-results-$(date +%Y%m%d).log
```

---

## 💡 Pro Tips

1. **Use `--quick` for rapid iteration** - Skips heavy tests
2. **Keep browser open** - Visual feedback helps spot issues
3. **Run health check often** - Catches problems early
4. **Document issues** - Add notes to test checklist
5. **Test integrations separately** - Don't block on optional features

---

## 📞 Need Help?

**Test not working?**
1. Check logs: `sophia dashboard logs`
2. Verify build: `npm run build`
3. Check status: `sophia status`
4. Review checklist: `docs/LIVE_TESTING_CHECKLIST.md`

**Found a bug?**
1. Note the test that failed
2. Capture error messages
3. Check browser console (F12)
4. Report with context

---

**Version:** 1.0  
**Last Updated:** 2026-02-19  
**Test Coverage:** CLI, Dashboard, API, Integrations
