# Sophia v2 — Functional & Non-Functional Requirements

## Functional Requirements

### FR-1: Guided Requirements Gathering

**FR-1.1** The system SHALL provide a guided chat experience that collects:
- Product requirements (what the app does)
- Technical requirements (stack, constraints, integrations)
- Testing requirements (coverage targets, E2E scenarios)
- Architecture requirements (deployment, scaling, data model)
- User personas (frontend and backend/API consumers)
- User journeys (per persona)
- Additional context-specific requirements based on app type

**FR-1.2** The chat agent SHALL ask targeted follow-up questions when requirements are incomplete or ambiguous. Questions are informed by app type (web app, API, CLI, mobile, etc.).

**FR-1.3** The system SHALL support a "lock this in" command that freezes requirements into immutable artifacts.

**FR-1.4** Once locked, requirements SHALL NOT be editable except through a formal change request that creates a new version with an audit trail.

### FR-2: Project Scaffolding

**FR-2.1** Upon intent lock, the system SHALL create a project repository with a governed folder structure (see SCHEMAS.md for scaffold spec).

**FR-2.2** Requirements documents SHALL be copied into the project's `requirements/` folder, properly organized.

**FR-2.3** Sophia governance SHALL be initialized automatically (`sophia init`).

**FR-2.4** The scaffold SHALL include a design system appropriate to the declared tech stack and UI requirements.

**FR-2.5** All scaffolded files SHALL follow the output quality standards defined in UI_STANDARDS.md.

### FR-3: Implementation Planning

**FR-3.1** The planning agent SHALL review requirement documents and produce:
- Sprint breakdown with scope and acceptance criteria per sprint
- Epic decomposition within each sprint
- Task decomposition within each epic
- TDD test specifications written before implementation tasks
- Full E2E test plan covering all personas and journeys
- CI/CD pipeline configuration
- Final acceptance criteria

**FR-3.2** Each sprint SHALL include a token budget estimate.

**FR-3.3** The implementation plan SHALL be presented to the user for approval before execution begins.

**FR-3.4** The plan SHALL be documented in the project repository under `docs/plans/`.

### FR-4: Autonomous Build

**FR-4.1** The build pipeline SHALL execute the approved implementation plan sprint-by-sprint.

**FR-4.2** Each task SHALL follow the cycle: load context → generate tests → implement → verify tests pass → commit → release context.

**FR-4.3** The system SHALL track progress against the sprint plan and report deviations.

**FR-4.4** All decisions made during build SHALL be logged with full context (what was decided, why, what alternatives were considered).

**FR-4.5** File claims SHALL prevent concurrent modification conflicts across agents.

### FR-5: Testing & Acceptance

**FR-5.1** Unit tests SHALL be generated and executed for each task (TDD).

**FR-5.2** Integration tests SHALL run at sprint boundaries.

**FR-5.3** Upon build completion, full E2E tests SHALL execute for each user persona/journey, including all GUI interactions.

**FR-5.4** E2E test runs SHALL be recorded (video/screenshots) and hashed for verification.

**FR-5.5** Acceptance tests SHALL include: Lighthouse scoring (target: 90+), WCAG AA accessibility audit, visual regression checks, security scan.

### FR-6: Knowledge Management

**FR-6.1** The system SHALL maintain a cross-project memory of successes, failures, patterns, and corrections.

**FR-6.2** Memory SHALL be queryable by keywords, tech stack, and project type.

**FR-6.3** Before starting any build, the system SHALL check memory for relevant patterns and known pitfalls.

**FR-6.4** All generated documentation SHALL sync with the external knowledge base (ra-h_os).

**FR-6.5** Documents SHALL be classified as public (committed to repo) or internal (excluded via .gitignore).

### FR-7: Project Management Integration

**FR-7.1** The system SHALL create a Leantime project populated with sprints, epics, and tasks from the implementation plan.

**FR-7.2** The Leantime kanban board SHALL be updated in real-time during build execution.

**FR-7.3** Task status transitions SHALL be: To Do → In Progress → In Review → Done.

### FR-8: Dashboard

**FR-8.1** The dashboard SHALL display all governed projects with current status.

**FR-8.2** Active builds SHALL show real-time progress: current sprint, current task, percentage complete.

**FR-8.3** Token usage SHALL be displayed per project with actual vs. budgeted comparison.

**FR-8.4** All pending escalations SHALL be surfaced in an escalation center with decision context.

**FR-8.5** The audit trail SHALL be searchable and filterable.

### FR-9: Repository Maintenance

**FR-9.1** All documents SHALL be organized in relevant folders/sub-folders (e.g., sprint docs in `docs/plans/sprintXX/`).

**FR-9.2** The final sprint SHALL include a full repository cleanup task.

**FR-9.3** The project root SHALL contain only app-related files/folders.

**FR-9.4** Unused dependencies SHALL be removed as part of cleanup.

**FR-9.5** The .gitignore SHALL be maintained to exclude internal/governance documents from the public repository.

### FR-10: Approval Management

**FR-10.1** The system SHALL classify actions into: auto-approve, inform-only, human-required.

**FR-10.2** Auto-approve SHALL cover: routine operations within the declared stack and framework (file CRUD, running declared tools, linting fixes, dependency installation for declared stack).

**FR-10.3** Human-required SHALL cover: architecture changes, undeclared dependencies, security-sensitive changes, scope changes, budget overruns.

**FR-10.4** Escalations SHALL include: what decision is needed, why it can't be auto-resolved, available options with pros/cons, system recommendation.

**FR-10.5** Target: <5% of build actions require human intervention.

---

## Non-Functional Requirements

### NFR-1: Token Efficiency

**NFR-1.1** Every agent interaction SHALL use the minimum context required for the task.

**NFR-1.2** Context SHALL be compressed at phase boundaries (brainstorm → plan → build → test).

**NFR-1.3** Model routing SHALL match task complexity to model capability (see TOKEN_STRATEGY.md).

**NFR-1.4** Token budgets SHALL be defined per phase and per sprint.

**NFR-1.5** The system SHALL provide cost estimates before execution and track actual vs. estimated usage.

**NFR-1.6** Token usage across all agents SHALL be logged and queryable.

### NFR-2: Output Quality

**NFR-2.1** All built apps SHALL achieve Lighthouse performance score >= 90.

**NFR-2.2** All built apps SHALL pass WCAG AA accessibility compliance.

**NFR-2.3** All built apps SHALL use a consistent design system with no ad-hoc styling.

**NFR-2.4** All built apps SHALL include proper error states, loading states, and empty states for every view.

**NFR-2.5** All built apps SHALL be responsive across desktop, tablet, and mobile breakpoints.

### NFR-3: Reliability

**NFR-3.1** Agent failures SHALL be recoverable — the orchestrator SHALL retry failed tasks with fresh context up to 2 times before escalating.

**NFR-3.2** Build progress SHALL be checkpointed — a crashed build SHALL resume from the last successful task, not restart.

**NFR-3.3** No data loss — all artifacts, decisions, and audit entries SHALL survive system crashes.

### NFR-4: Performance

**NFR-4.1** Requirements lock SHALL produce artifacts within 60 seconds.

**NFR-4.2** Sprint planning SHALL complete within 5 minutes for a standard project.

**NFR-4.3** Dashboard SHALL update build status within 5 seconds of state change.

### NFR-5: Security

**NFR-5.1** No secrets, API keys, or credentials SHALL be committed to repositories.

**NFR-5.2** External integrations (Leantime, knowledge base) SHALL use token-based auth stored outside the project.

**NFR-5.3** Built apps SHALL pass OWASP Top 10 security checks.

### NFR-6: Extensibility

**NFR-6.1** Agent adapters SHALL be pluggable — adding a new agent type requires implementing a defined interface, not modifying core code.

**NFR-6.2** Policy definitions SHALL be declarative (YAML) and user-extensible.

**NFR-6.3** Integration points (PM tools, knowledge bases) SHALL be abstracted behind interfaces.
