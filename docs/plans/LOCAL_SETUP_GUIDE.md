# Sophia v2 Phase 1 — Local Setup Guide

> **Quick start for testing Sophia v2 on your local machine**  
> **Prerequisites:** Open WebUI, n8n, Leantime installed

---

## Current Environment

You already have these tools installed:
- Open WebUI (chat interface)
- n8n (workflow automation)
- Leantime (project management)
- auto-code repo at `/Users/sesloan/repos/thalamus-labz/auto-code`

---

## Step 1: Environment Setup (Day 1)

### 1.1 Create Workspace

```bash
# Create v2 workspace
mkdir -p ~/repos/thalamus-labz/sophia-v2
cd ~/repos/thalamus-labz/sophia-v2

# Initialize git
git init

# Create directory structure
mkdir -p src/{core,agents,integrations,commands,dashboard}
mkdir -p tests/{unit,integration,e2e}
mkdir -p requirements
mkdir -p docs/plans
mkdir -p .sophia
```

### 1.2 Environment Variables

Create `.env.local`:

```bash
# Copy from template
cat > .env.local << 'EOF'
# Sophia v2 Environment
SOPHIA_ENV=development
SOPHIA_LOG_LEVEL=debug
SOPHIA_DB_PATH=.sophia/sophia.db

# Open WebUI (adjust port if different)
OPENWEBUI_BASE_URL=http://localhost:3000
OPENWEBUI_API_KEY=your_openwebui_key_here

# Leantime
LEANTIME_BASE_URL=http://localhost:8080
LEANTIME_API_KEY=your_leantime_key_here

# n8n
N8N_BASE_URL=http://localhost:5678
N8N_WEBHOOK_URL=http://localhost:5678/webhook/sophia-events

# Knowledge Base
KNOWLEDGE_BASE_REPO=git@github.com:bradwmorris/ra-h_os.git
GITHUB_TOKEN=your_github_token_here

# Agent Configuration
PRIMARY_AGENT=claude-code
AGENT_CONFIG_PATH=.sophia/agents.yaml

# Token Budgets
DEFAULT_SPRINT_BUDGET=100000
DEFAULT_PROJECT_BUDGET=500000
EOF
```

### 1.3 Package Setup

```bash
# Initialize npm project
npm init -y

# Install dependencies
npm install commander chalk inquirer yaml zod better-sqlite3 handlebars
npm install -D typescript vitest @types/node

# Initialize TypeScript
npx tsc --init
```

---

## Step 2: Integration Verification (Day 1-2)

### 2.1 Test Open WebUI

```bash
# Check if Open WebUI is running
curl http://localhost:3000/api/version

# Expected: {"version": "x.x.x"}
```

If not running:
```bash
# Start Open WebUI (adjust command based on your setup)
docker start open-webui  # or however you run it
```

### 2.2 Test Leantime

```bash
# Check Leantime API
curl http://localhost:8080/api/health

# Get API key from Leantime UI:
# 1. Login to Leantime
# 2. Go to Profile → API Keys
# 3. Generate new key
# 4. Update .env.local
```

### 2.3 Test n8n

```bash
# Check n8n
curl http://localhost:5678/healthz

# Create webhook workflow:
# 1. Open n8n at http://localhost:5678
# 2. Create new workflow: "Sophia Events"
# 3. Add Webhook node: POST http://localhost:5678/webhook/sophia-events
# 4. Add your notification logic (email, slack, etc.)
# 5. Save and activate
```

---

## Step 3: Database Setup (Day 2)

```bash
# Create SQLite database
mkdir -p .sophia

# Schema will be created by sophia init
# For now, verify SQLite is available
which sqlite3
sqlite3 --version
```

---

## Step 4: Test Build (Day 2-3)

### 4.1 Create Test Requirements

```bash
# Create sample requirements for testing
cat > requirements/test-webapp.yaml << 'EOF'
project:
  name: test-webapp
  description: A simple task management web app for testing Sophia v2
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
    - Create, read, update tasks
    - Task status tracking (todo, in-progress, done)
    - Simple dashboard view

  technical:
    - Server-side rendering for initial load
    - REST API with input validation
    - Database migrations via Prisma

  testing:
    - Unit test coverage target: 80%
    - E2E tests for CRUD operations
    - E2E tests for auth flow

  architecture:
    - Monorepo not required
    - Deploy target: Vercel
    - Environment: development + production

personas:
  - name: Regular User
    type: frontend
    description: Manages personal tasks
    journeys:
      - Sign up and create first task
      - View and update task status
      - Delete completed tasks

quality:
  lighthouse_target: 90
  accessibility: WCAG-AA
  design_system: shadcn
EOF
```

### 4.2 Run Test Scaffold

```bash
# Build Sophia CLI first
cd ~/repos/thalamus-labz/sophia.code/packages/cli
npm run build

# Create alias for testing
alias sophia='node ~/repos/thalamus-labz/sophia.code/packages/cli/dist/index.js'

# Test scaffold (this will evolve as we build)
sophia scaffold --from ~/repos/thalamus-labz/sophia-v2/requirements/test-webapp.yaml \
  --output ~/repos/thalamus-labz/auto-code/test-webapp
```

---

## Step 5: Development Workflow

### 5.1 Daily Development

```bash
# Terminal 1: Run dashboard
cd ~/repos/thalamus-labz/sophia.code/packages/dashboard
npm run dev

# Terminal 2: CLI in watch mode
cd ~/repos/thalamus-labz/sophia.code/packages/cli
npm run dev

# Terminal 3: Your work directory
cd ~/repos/thalamus-labz/sophia-v2
```

### 5.2 Testing Changes

```bash
# Run unit tests
npm test

# Run specific test
npm test -- src/core/orchestrator.test.ts

# Type check
npm run typecheck

# Lint
npm run lint
```

---

## Step 6: E2E Validation Checklist

Before declaring Phase 1 complete, verify:

### 6.1 Commands Work

```bash
# Each command should work end-to-end
sophia --version
sophia scaffold --help
sophia plan --help
sophia build --help
sophia estimate --help
```

### 6.2 Full Build Flow

```bash
# 1. Scaffold creates valid project
sophia scaffold --from requirements/test-webapp.yaml --output ./test-output

# 2. Plan generates actionable plan
cd test-output
sophia plan
# Review plan in docs/plans/

# 3. Build executes (use --dry-run first)
sophia build --dry-run

# 4. Real build
sophia build

# 5. Monitor progress in dashboard
open http://localhost:9473
```

### 6.3 Integration Check

- [ ] Leantime project created
- [ ] Tasks appear on kanban board
- [ ] Status updates sync
- [ ] Open WebUI tool responds
- [ ] n8n webhooks trigger

### 6.4 Governance Check

- [ ] Gates enforced at boundaries
- [ ] Approval router works
- [ ] Token tracking accurate
- [ ] Audit trail complete
- [ ] Checkpoints save/restore

---

## Troubleshooting

### Issue: Integration Connection Failed

**Solution:**
```bash
# Check if services are running
lsof -i :3000  # Open WebUI
lsof -i :8080  # Leantime
lsof -i :5678  # n8n

# Check .env.local values match your setup
cat .env.local | grep -E "^(OPENWEBUI|LEANTIME|N8N)"
```

### Issue: Permission Denied

**Solution:**
```bash
# Fix permissions
chmod +x ~/repos/thalamus-labz/sophia.code/packages/cli/dist/index.js

# Or use npx
npx ~/repos/thalamus-labz/sophia.code/packages/cli
```

### Issue: Database Locked

**Solution:**
```bash
# Kill any processes using the database
lsof .sophia/sophia.db
kill -9 <pid>

# Or reset database
rm .sophia/sophia.db
sophia init
```

---

## Next Steps

1. **Complete Sprint 0:** Set up environment (this week)
2. **Start Sprint 1:** Implement scaffold and plan commands
3. **Run E2E Tests:** Validate complete workflow
4. **Iterate:** Fix issues, refine implementation
5. **Phase 2 Ready:** When all success criteria met

---

## Resources

- **Full Plan:** `docs/plans/IMPLEMENTATION_PLAN_v2_PHASE1.md`
- **v2 Specifications:** `v2/` directory
- **Sophia v1 Docs:** `docs/` directory
- **Dashboard:** http://localhost:9473 (when running)

---

*Ready to start? Begin with Step 1 and work through each day.*
