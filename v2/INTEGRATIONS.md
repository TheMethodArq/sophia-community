# Sophia v2 — Integration Specifications

## Overview

Sophia v2 integrates with external systems at defined touchpoints. All integrations are optional — the core workflow functions without them, but degrades gracefully (logging warnings, not errors).

---

## Integration Architecture

```
                        ┌──────────────┐
                        │   Sophia     │
                        │   Core       │
                        └──────┬───────┘
                               │
              ┌────────────────┼────────────────┐
              │                │                │
     ┌────────▼──────┐ ┌──────▼───────┐ ┌──────▼───────┐
     │  Integration  │ │  Integration │ │  Integration │
     │  Adapter      │ │  Adapter     │ │  Adapter     │
     │  Interface    │ │  Interface   │ │  Interface   │
     └────────┬──────┘ └──────┬───────┘ └──────┬───────┘
              │                │                │
     ┌────────▼──────┐ ┌──────▼───────┐ ┌──────▼───────┐
     │  Open WebUI   │ │  Leantime    │ │  Knowledge   │
     │               │ │              │ │  Base        │
     └───────────────┘ └──────────────┘ └──────────────┘
```

All integrations implement a common adapter interface:

```typescript
interface IntegrationAdapter {
  name: string;
  type: 'chat' | 'pm' | 'knowledge' | 'cicd' | 'agent';

  // Lifecycle
  connect(config: IntegrationConfig): Promise<ConnectionResult>;
  disconnect(): Promise<void>;
  healthCheck(): Promise<HealthStatus>;

  // Operations (integration-specific)
  execute(operation: string, params: Record<string, unknown>): Promise<OperationResult>;
}

interface IntegrationConfig {
  baseUrl: string;
  auth: {
    type: 'token' | 'basic' | 'oauth';
    credentials: string;  // Reference to secure storage, never raw secrets
  };
  options: Record<string, unknown>;
}
```

---

## Integration 1: Open WebUI (Chat Interface)

### Purpose
Provides the guided requirements gathering experience in the brainstorm phase.

### Integration Type
Open WebUI Tool/Function — a custom tool that the Sophia intake agent uses within Open WebUI.

### Configuration
```yaml
# .sophia/integrations/openwebui.yaml
type: chat
baseUrl: http://localhost:3000  # or hosted instance
auth:
  type: token
  credentials: env:OPENWEBUI_API_KEY
```

### Operations

| Operation | Trigger | Data Flow |
|-----------|---------|-----------|
| `register_tool` | Sophia CLI install | Registers Sophia intake tool in Open WebUI |
| `start_session` | User initiates brainstorm | Creates tracked session |
| `extract_artifacts` | During conversation | Incrementally extracts structured data from chat |
| `lock_intent` | User says "lock this in" | Triggers artifact finalization and Phase 2 |

### Tool Definition (Open WebUI Format)

```python
class SophiaIntakeTool:
    """
    Sophia Governance - Guided Requirements Gathering

    Guides users through structured requirements gathering for
    governed software projects. Extracts product, technical, testing,
    and architecture requirements through conversation.
    """

    class Valves(BaseModel):
        sophia_cli_path: str = Field(default="sophia", description="Path to Sophia CLI")
        project_base_path: str = Field(default="~/repos", description="Base path for new projects")

    async def intake(self, query: str, __user__: dict) -> str:
        """Process user input during requirements gathering."""
        # Routes to Sophia intake agent
        pass

    async def lock(self, project_name: str, __user__: dict) -> str:
        """Lock requirements and trigger scaffold."""
        # Triggers Phase 2: Lock & Scaffold
        pass

    async def status(self, __user__: dict) -> str:
        """Check current requirements gathering status."""
        pass
```

### Fallback (No Open WebUI)
If Open WebUI is not available, requirements gathering can happen via:
- Sophia CLI: `sophia intake start` (terminal-based guided questions)
- Direct YAML: User writes requirements.yaml manually and runs `sophia lock`

---

## Integration 2: Leantime (Project Management)

### Purpose
Provides kanban board, sprint tracking, and task management visibility.

### Integration Type
REST API calls to Leantime instance.

### Configuration
```yaml
# .sophia/integrations/leantime.yaml
type: pm
baseUrl: https://your-leantime-instance.com
auth:
  type: token
  credentials: env:LEANTIME_API_KEY
options:
  default_board: kanban
  sync_interval: on_state_change  # not polling
```

### API Operations

| Operation | When | Endpoint | Payload |
|-----------|------|----------|---------|
| Create project | Phase 2 (Lock) | `POST /api/projects` | Project name, description from requirements |
| Create sprint | Phase 3 (Plan) | `POST /api/sprints` | Sprint spec (name, dates, goals) |
| Create tasks | Phase 3 (Plan) | `POST /api/tickets` | Task per epic per sprint |
| Update task status | Phase 4 (Build) | `PUT /api/tickets/{id}` | Status: todo → in_progress → done |
| Add comment | Phase 4 (Build) | `POST /api/tickets/{id}/comments` | Decision context, blocker notes |
| Close project | Phase 6 (Deliver) | `PUT /api/projects/{id}` | Status: complete |

### Status Mapping

| Sophia State | Leantime Status |
|-------------|-----------------|
| Planned (in sprint spec) | To Do |
| Agent working on task | In Progress |
| Task tests passing, pending review | In Review |
| Task committed and verified | Done |
| Blocked / escalated | Blocked |

### Sync Strategy
- **Push-only**: Sophia pushes state changes to Leantime. No polling or pull.
- **Async**: Leantime API calls are fire-and-forget with retry. Build never blocks on PM sync.
- **Idempotent**: Each operation includes a Sophia task ID for deduplication.

### Fallback (No Leantime)
If Leantime is not configured or unavailable:
- Sprint/task tracking happens in `.sophia/` locally
- Dashboard provides equivalent visibility
- No external PM board, but all data is still available

---

## Integration 3: Knowledge Base (ra-h_os)

### Purpose
Centralized documentation storage across all governed projects.

### Integration Type
Git-based sync (push to remote repository).

### Configuration
```yaml
# .sophia/integrations/knowledge-base.yaml
type: knowledge
baseUrl: git@github.com:bradwmorris/ra-h_os.git
auth:
  type: token
  credentials: env:GITHUB_TOKEN
options:
  branch: main
  base_path: projects/{project-name}/
  sync_trigger: gate_completion  # sync at gate boundaries
  doc_template: default          # see SCHEMAS.md for template
```

### Sync Operations

| Operation | When | What's Synced |
|-----------|------|---------------|
| Initial push | Phase 2 (Lock) | Requirements docs, project metadata |
| Plan push | Phase 3 (Plan approved) | Implementation plan, sprint specs |
| Sprint push | Phase 4 (Sprint completion) | Sprint deliverables, decisions log |
| Final push | Phase 6 (Delivery) | Complete documentation set |
| Memory push | Phase 6 (Delivery) | Learnings, patterns, corrections |

### Document Classification

| Classification | Location in Repo | Location in Knowledge Base | Synced? |
|---------------|------------------|---------------------------|---------|
| Public | `docs/` | `projects/{name}/` | Yes |
| Internal | `docs/internal/` | Not synced | No |
| Governance | `.sophia/` | `governance/{name}/` | Metadata only |

### Knowledge Base Structure (per project)
```
ra-h_os/
└── projects/
    └── {project-name}/
        ├── README.md              # Project overview
        ├── requirements/
        │   └── REQUIREMENTS.md    # Locked requirements
        ├── architecture/
        │   └── decisions.md       # Architecture decisions
        ├── plans/
        │   └── IMPLEMENTATION.md  # Implementation plan
        ├── sprints/
        │   ├── sprint01.md        # Sprint summary
        │   └── sprint02.md
        └── learnings/
            └── PATTERNS.md        # What worked, what didn't
```

### Fallback (No Knowledge Base)
If knowledge base is not configured:
- All documentation stays in the project repository
- Memory system still functions locally
- No centralized cross-project documentation

---

## Integration 4: CI/CD (GitHub Actions / Google Cloud Build)

### Purpose
Automated build, test, and quality checks on every commit and at sprint boundaries.

### Integration Type
Generated configuration files committed to the repository.

### Configuration
```yaml
# .sophia/integrations/cicd.yaml
type: cicd
provider: github_actions  # or google_cloud_build
options:
  run_on_commit: true
  run_on_sprint_completion: true
  checks:
    - lint
    - typecheck
    - unit_tests
    - build
    - integration_tests     # sprint completion only
    - security_scan         # sprint completion only
    - accessibility_audit   # final acceptance only
    - lighthouse            # final acceptance only
```

### Generated Pipeline (GitHub Actions)

```yaml
# .github/workflows/ci.yaml (generated by Sophia)
name: Sophia Governed CI
on:
  push:
    branches: [main, 'sprint-*']
  pull_request:
    branches: [main]

jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm run test:unit
      - run: npm run build

  # Runs on sprint completion tags
  sprint-validation:
    if: startsWith(github.ref, 'refs/tags/sprint-')
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run test:integration
      - run: npm run security:scan
```

### Fallback (No CI/CD)
If CI/CD is not configured:
- Tests run locally via Sophia CLI
- Quality checks enforced at gate evaluation time
- No automated pipeline, but governance still applies

---

## Integration 5: Coding Agents

### Purpose
The execution layer — agents that actually write code.

### Integration Type
Adapter-based: each agent type has an adapter that translates Sophia orchestration commands into agent-specific operations.

### Configuration
```yaml
# .sophia/integrations/agents.yaml
type: agent
primary: claude-code
fallback: opencode
adapters:
  claude-code:
    config_path: .claude/
    model_routing:
      opus: planning, review
      sonnet: build, test_analysis
      haiku: scaffold, docs
  opencode:
    config_path: .opencode
    # model routing specific to OpenCode
```

### Agent Adapter Interface

```typescript
interface AgentAdapter {
  name: string;

  // Initialize agent for a task
  prepare(task: TaskSpec, context: ContextBundle): Promise<void>;

  // Execute a task and return the result
  execute(task: TaskSpec): Promise<TaskResult>;

  // Get current agent status
  status(): Promise<AgentStatus>;

  // Terminate agent cleanly
  terminate(): Promise<void>;
}

interface TaskSpec {
  id: string;
  type: 'scaffold' | 'code' | 'test' | 'review' | 'document';
  description: string;
  files: FileReference[];        // Files to work with
  testSpec: string | null;       // TDD test specification
  constraints: string[];         // Governance constraints
  maxTokenBudget: number;        // Token limit for this task
  model: 'opus' | 'sonnet' | 'haiku';  // Model to use
}

interface ContextBundle {
  taskSpec: string;              // Current task description
  testSpec: string | null;       // Test specification
  targetFiles: FileContent[];    // Files being modified
  dependencies: FileSummary[];   // Referenced files (summaries only)
  patterns: Pattern[];           // Relevant memory patterns
  constraints: string[];         // Active policies and rules
}

interface TaskResult {
  success: boolean;
  filesModified: string[];
  filesCreated: string[];
  testsRun: number;
  testsPassed: number;
  tokensUsed: { input: number; output: number };
  modelUsed: string;
  errors: string[];
  decisions: Decision[];         // Any decisions made during execution
}
```

### Agent Coordination Rules

1. **One agent per task**: No concurrent modification of the same task.
2. **File claims enforced**: Agent cannot modify files claimed by another agent.
3. **Stateless execution**: Agent receives full context for each task, retains nothing between tasks.
4. **Result harvesting**: Orchestrator collects results, updates state, releases agent.
5. **Failure isolation**: One agent's failure doesn't affect others; orchestrator handles retry/fallback.

---

## Integration Priority

| Integration | Priority | Phase Needed | Effort |
|-------------|----------|-------------|--------|
| Agent Adapters | P0 (Required) | Phase 1 (MVP) | High |
| CI/CD Generation | P0 (Required) | Phase 1 (MVP) | Medium |
| Knowledge Base Sync | P1 (Important) | Phase 2 | Medium |
| Leantime | P1 (Important) | Phase 2 | Medium |
| Open WebUI | P1 (Important) | Phase 2 | High |

Agent adapters and CI/CD are required for the core workflow. Knowledge base, Leantime, and Open WebUI enhance the experience but the system functions without them.
