// ===== Config Types =====

export type ExperienceLevel = "beginner" | "intermediate" | "advanced";
export type GovernanceLevel = "community" | "startup" | "enterprise";
export type ClaimMode = "warn" | "block" | "off";
export type Strictness = "permissive" | "moderate" | "strict";
export type Severity = "green" | "yellow" | "red";
export type SessionStatus = "active" | "idle" | "ended";
export type ClaimType = "soft" | "hard";
export type MemorySeverity = "low" | "medium" | "high";

export interface SophiaConfig {
  sophia: {
    version: string;
    initialized: string;
  };
  project: {
    name: string;
    tech_stack: TechStack;
    detected_at: string;
    conventions?: ConventionsConfig;
  };
  agents: {
    detected: DetectedAgentConfig[];
  };
  user: {
    experience_level: ExperienceLevel;
    governance_level: GovernanceLevel;
  };
  session: {
    auto_detect: boolean;
    stale_timeout_minutes: number;
    claim_mode: ClaimMode;
  };
  policies: {
    enabled: string[];
    strictness: Strictness;
    overrides?: Record<string, PolicyOverride>;
  };
  teaching: {
    enabled: boolean;
    show_explanations: boolean;
    first_time_hints: boolean;
  };
  health: {
    auto_score: boolean;
    score_on_commit: boolean;
  };
}

export interface TechStack {
  language: string;
  framework?: string;
  database?: string;
  orm?: string;
  package_manager: string;
  test_runner?: string;
  ui_framework?: string;
  styling?: string;
  state_management?: string;
}

export interface DetectedAgentConfig {
  name: string;
  config_file: string;
  status: "active" | "detected" | "disabled";
}

export interface PolicyOverride {
  severity?: Severity;
  enabled?: boolean;
}

// ===== Agent Detection =====

export interface DetectedAgent {
  name: string;
  displayName: string;
  configFile: string;
  configExists: boolean;
  existingContent: string | null;
  hasSophiaBlock: boolean;
}

export interface ProjectProfile {
  language: string;
  framework?: string;
  database?: string;
  orm?: string;
  packageManager: string;
  testRunner?: string;
  uiFramework?: string;
  styling?: string;
  stateManagement?: string;
}

export interface ConventionRule {
  id: string;
  category: string;
  description: string;
}

export interface ConventionsConfig {
  rules: ConventionRule[];
}

// ===== Policy Types =====

export interface Policy {
  id: string;
  name: string;
  version: string;
  description?: string;
  rules: PolicyRule[];
}

export interface PolicyRule {
  id: string;
  name: string;
  severity: Severity;
  description: string;
  detection: PolicyDetection;
  teaching?: {
    beginner?: string;
    intermediate?: string;
    advanced?: string;
    topic?: string;
    code_example?: {
      wrong: string;
      right: string;
    };
  };
  fix_suggestion?: string;
  auto_fixable: boolean;
}

export interface PolicyDetection {
  type?: "pattern" | "git-hook" | "heuristic" | "action";
  patterns?: string[];
  file_types?: string[];
  file_patterns?: string[];
  exclude?: string[];
  context_required?: boolean;
  trigger?: string;
  check?: string;
  threshold_kb?: number;
}

export interface PolicyResult {
  ruleId: string;
  policyId: string;
  severity: Severity;
  matched: boolean;
  file?: string;
  line?: number;
  match?: string;
  description: string;
  teaching: string;
  fixSuggestion?: string;
  autoFixable: boolean;
}

// ===== Adapter Types =====

export interface AdapterConfig {
  enabled: boolean;
  format: string;
  target_files: AdapterTargetFile[];
  global_files?: AdapterGlobalFile[];
  injection: {
    marker_start: string;
    marker_end: string;
    position: string;
  };
  template: string;
}

export interface AdapterTargetFile {
  path: string;
  scope: string;
  strategy: "inject_block" | "dedicated_file";
}

export interface AdapterGlobalFile {
  path: string;
  strategy: "read_only";
}

export interface SophiaContext {
  config: SophiaConfig;
  policies: Policy[];
  agents: AgentDefinition[];
  workflows: WorkflowDefinition[];
  sessionInstructions: string;
  patterns?: PatternRef[];
}

export interface InjectResult {
  success: boolean;
  filePath: string;
  blockInjected: string;
  existingContentPreserved: boolean;
  conflictsFound: Conflict[];
  rulesDeduped: string[];
}

export interface Conflict {
  sophiaRule: string;
  existingRule: string;
  file: string;
  resolution: "sophia_wins" | "existing_wins" | "user_decides";
  description: string;
}

export interface DedupMapping {
  group: string;
  sophia_rule: string;
  patterns: string[];
}

export interface PatternRef {
  name: string;
  file: string;
}

// ===== Agent Definitions =====

export interface AgentDefinition {
  name: string;
  type: string;
  description: string;
  version: string;
  instructions: string;
  guardrails?: {
    output?: {
      required_sections?: string[];
    };
    quality_gates?: string[];
  };
  handoffs?: Record<string, {
    condition: string;
    deliverables?: string[];
    priority?: string;
  }>;
}

// ===== Workflow Definitions =====

export interface WorkflowDefinition {
  name: string;
  description: string;
  steps: WorkflowStep[];
}

export interface WorkflowStep {
  name: string;
  agent?: string;
  description: string;
  outputs?: string[];
}

// ===== Session Types =====

export interface Session {
  id: string;
  agent: string;
  pid?: number;
  intent?: string;
  status: SessionStatus;
  started_at: string;
  last_activity_at: string;
  ended_at?: string;
}

export interface Claim {
  id: number;
  session_id: string;
  pattern: string;
  claim_type: ClaimType;
  created_at: string;
  released_at?: string;
}

export interface ClaimStatus {
  filePath: string;
  claimed: boolean;
  claimedBy?: {
    sessionId: string;
    agent: string;
    intent?: string;
    claimType: ClaimType;
  };
}

export interface SessionBrief {
  activeSessions: {
    id: string;
    agent: string;
    intent?: string;
    claimedZones: string[];
  }[];
  recentBulletin: BulletinEntry[];
  recentDecisions: Decision[];
  conflicts: string[];
  safeZones: string[];
}

// ===== Bulletin Types =====

export type BulletinType =
  | "file_change"
  | "schema_change"
  | "new_file"
  | "decision"
  | "conflict"
  | "commit"
  | "session_start"
  | "session_end"
  | "manual";

export interface BulletinEntry {
  id: number;
  session_id?: string;
  agent?: string;
  entry_type: BulletinType;
  message: string;
  files?: string[];
  warning?: string;
  created_at: string;
}

// ===== Memory Types =====

export interface Correction {
  id: number;
  date: string;
  project?: string;
  pattern: string;
  reason: string;
  correction: string;
  file_types?: string[];
  keywords: string[];
  severity: MemorySeverity;
  times_applied: number;
  created_at: string;
}

export interface Pattern {
  id: number;
  date: string;
  project?: string;
  description: string;
  context?: string;
  implementation: string;
  file_types?: string[];
  keywords: string[];
  effectiveness: MemorySeverity;
  times_used: number;
  created_at: string;
}

export interface Decision {
  id: number;
  session_id?: string;
  decision: string;
  rationale?: string;
  alternatives?: string[];
  files_affected?: string[];
  created_at: string;
}

export interface MemoryStats {
  totalCorrections: number;
  totalPatterns: number;
  totalDecisions: number;
  mostCommonMistakes: { pattern: string; count: number }[];
  mostUsedPatterns: { description: string; count: number }[];
}

// ===== Health Types =====

export interface HealthReport {
  project: string;
  timestamp: string;
  overall_score: number;
  grade: string;
  categories: Record<string, HealthCategory>;
  trends?: {
    previous_score?: number;
    direction: "improving" | "declining" | "stable";
    streak_days?: number;
  };
}

export interface HealthCategory {
  score: number;
  issues?: number;
  critical?: number;
  coverage_percent?: number;
  lint_errors?: number;
  type_errors?: number;
  missing_docs?: number;
  unused_deps?: number;
  dead_files?: number;
}

// ===== Teaching Types =====

export interface TeachingMoment {
  severity: Severity;
  headline: string;
  explanation: string;
  codeExample?: {
    wrong: string;
    right: string;
  };
  fixSuggestion: string;
  learnMore?: string;
  ruleReference: string;
}

export interface ExplainContent {
  topic: string;
  title: string;
  content: string;
  relatedPolicies: string[];
  relatedPatterns: string[];
}

// ===== Encounter Tracking =====

export interface Encounter {
  rule_id: string;
  first_seen_at: string;
  times_seen: number;
  last_seen_at: string;
}

// ===== Build Pipeline Types (Sprint 2) =====

export type BuildStatus = "pending" | "running" | "paused" | "completed" | "failed";

export interface BuildConfig {
  projectPath: string;
  planPath: string;
  options: {
    dryRun?: boolean;
    autoApprove?: boolean;
    maxTokenBudget?: number;
    modelPreference?: ModelType;
    checkpointInterval?: number;
  };
}

export interface BuildState {
  buildId: string;
  status: BuildStatus;
  planPath: string;
  currentSprint: number;
  currentTask: number;
  completedTasks: string[];
  failedTasks: string[];
  skippedTasks: string[];
  tokenUsage: TokenUsage;
  startedAt: string;
  lastCheckpointAt?: string;
  completedAt?: string;
  error?: string;
}

// ===== Checkpoint Types (Sprint 2) =====

export interface Checkpoint {
  id: string;
  buildId: string;
  state: CheckpointState;
  createdAt: string;
}

export interface CheckpointState {
  buildState: BuildState;
  taskResults: TaskResult[];
  fileChanges: FileChange[];
  decisions: CheckpointDecision[];
  pendingActions: ActionRequest[];
}

export interface TaskResult {
  taskId: string;
  status: "success" | "failed" | "skipped";
  output?: string;
  error?: string;
  tokensUsed: TokenUsage;
  duration: number;
  completedAt: string;
}

export interface FileChange {
  path: string;
  changeType: "created" | "modified" | "deleted";
  diff?: string;
  linesAdded: number;
  linesRemoved: number;
}

export interface CheckpointDecision {
  id: string;
  taskId: string;
  decision: string;
  rationale: string;
  madeAt: string;
}

// ===== Token Management Types (Sprint 2) =====

export type ModelType = "haiku" | "sonnet" | "opus";

export interface TokenUsage {
  input: number;
  output: number;
  total: number;
  cost: number;
}

export interface TaskBudget {
  taskId: string;
  estimated: number;
  actual: number;
  remaining: number;
  model: ModelType;
}

export interface ModelRoutingEntry {
  taskType: string;
  defaultModel: ModelType;
  fallbackModel?: ModelType | null;
  maxTokens: number;
  costPerInputToken: number;
  costPerOutputToken: number;
}

export interface ModelRoutingTable {
  entries: ModelRoutingEntry[];
  defaultModel: ModelType;
  budgetLimit: number;
}

// ===== Approval Router Types (Sprint 2) =====

export type ActionType =
  | "file_write"
  | "file_delete"
  | "dependency_add"
  | "command_exec"
  | "git_commit"
  | "config_change";

export type ActionClassification =
  | "auto_approve"
  | "inform_only"
  | "human_required";

export interface ActionRequest {
  id: string;
  buildId: string;
  taskId: string;
  actionType: ActionType;
  description: string;
  details: {
    path?: string;
    content?: string;
    command?: string;
    dependency?: string;
    version?: string;
  };
  classification: ActionClassification;
  riskScore: number;
  requestedAt: string;
  resolvedAt?: string;
  approved?: boolean;
  approvedBy?: "auto" | "human";
  reason?: string;
}

export interface Escalation {
  id: string;
  actionId: string;
  buildId: string;
  reason: string;
  severity: "low" | "medium" | "high" | "critical";
  context: {
    taskId: string;
    taskDescription: string;
    affectedFiles: string[];
    potentialImpact: string;
  };
  escalatedAt: string;
  resolvedAt?: string;
  resolution?: "approved" | "rejected" | "modified";
  humanResponse?: string;
}

// ===== Agent Adapter Types (Sprint 2) =====

export interface AgentAdapter {
  name: string;
  version: string;
  supportedAgents: string[];
  initialize: (context: AgentContext) => Promise<void>;
  execute: (task: string, context: AgentContext) => Promise<AgentResult>;
  cleanup: () => Promise<void>;
}

export interface AgentContext {
  buildId: string;
  taskId: string;
  projectPath: string;
  workingDirectory: string;
  environment: Record<string, string>;
  claims: FileClaim[];
  policies: Policy[];
  constraints: {
    maxTokens: number;
    timeout: number;
    allowedPaths: string[];
    blockedPaths: string[];
  };
  previousResults?: TaskResult[];
  sessionInstructions?: string;
}

export interface AgentResult {
  success: boolean;
  output: string;
  error?: string;
  tokensUsed: TokenUsage;
  filesChanged: FileChange[];
  decisionsLogged: CheckpointDecision[];
  warnings?: string[];
  suggestions?: string[];
}

export interface FileClaim {
  path: string;
  claimType: ClaimType;
  claimedBy: string;
  buildId: string;
  taskId: string;
  claimedAt: string;
  releasedAt?: string;
}
