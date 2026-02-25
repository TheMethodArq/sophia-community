import { getDb } from "./database.js";
import type { 
  BuildState, 
  BuildConfig, 
  BuildStatus,
  TaskResult,
  FileChange,
  CheckpointDecision,
  ActionRequest
} from "@sophia-code/shared";
import { randomUUID } from "node:crypto";
import { createCheckpoint, createCheckpointState, getLatestCheckpoint } from "./checkpoint-manager.js";
import { getBuildTokenUsage, checkBudgetExceeded } from "./token-tracker.js";
import { postBulletin } from "./bulletin.js";

/**
 * Creates a new build
 */
export function createBuild(config: BuildConfig): BuildState {
  const db = getDb();
  const buildId = randomUUID();
  
  const buildState: BuildState = {
    buildId,
    status: "pending",
    planPath: config.planPath,
    currentSprint: 0,
    currentTask: 0,
    completedTasks: [],
    failedTasks: [],
    skippedTasks: [],
    tokenUsage: {
      input: 0,
      output: 0,
      total: 0,
      cost: 0,
    },
    startedAt: new Date().toISOString(),
  };

  const stmt = db.prepare(`
    INSERT INTO builds (id, project_path, plan_path, status, current_sprint, current_task, started_at, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    buildId,
    config.projectPath,
    config.planPath,
    buildState.status,
    buildState.currentSprint,
    buildState.currentTask,
    buildState.startedAt,
    buildState.startedAt
  );

  return buildState;
}

/**
 * Gets a build by ID
 */
export function getBuild(buildId: string): BuildState | null {
  const db = getDb();
  
  const row = db.prepare(`
    SELECT * FROM builds WHERE id = ?
  `).get(buildId) as {
    id: string;
    project_path: string;
    plan_path: string;
    status: BuildStatus;
    current_sprint: number;
    current_task: number;
    started_at: string;
    completed_at: string | null;
    error: string | null;
  } | undefined;

  if (!row) return null;

  const tokenUsage = getBuildTokenUsage(buildId);

  return {
    buildId: row.id,
    planPath: row.plan_path,
    status: row.status,
    currentSprint: row.current_sprint,
    currentTask: row.current_task,
    completedTasks: [], // Would need separate query
    failedTasks: [],
    skippedTasks: [],
    tokenUsage,
    startedAt: row.started_at,
    completedAt: row.completed_at || undefined,
    error: row.error || undefined,
  };
}

/**
 * Updates build status
 */
export function updateBuildStatus(buildId: string, status: BuildStatus, error?: string): void {
  const db = getDb();
  
  const updates: string[] = ["status = ?"];
  const values: (string | null)[] = [status];

  if (status === "completed" || status === "failed") {
    updates.push("completed_at = ?");
    values.push(new Date().toISOString());
  }

  if (error) {
    updates.push("error = ?");
    values.push(error);
  }

  values.push(buildId);

  db.prepare(`
    UPDATE builds SET ${updates.join(", ")} WHERE id = ?
  `).run(...values);
}

/**
 * Updates current task progress
 */
export function updateBuildProgress(
  buildId: string, 
  sprint: number, 
  task: number
): void {
  const db = getDb();
  
  db.prepare(`
    UPDATE builds SET current_sprint = ?, current_task = ? WHERE id = ?
  `).run(sprint, task, buildId);
}

/**
 * Lists all builds for a project
 */
export function listBuilds(projectPath: string): BuildState[] {
  const db = getDb();
  
  const rows = db.prepare(`
    SELECT * FROM builds WHERE project_path = ? ORDER BY created_at DESC
  `).all(projectPath) as Array<{
    id: string;
    project_path: string;
    plan_path: string;
    status: BuildStatus;
    current_sprint: number;
    current_task: number;
    started_at: string;
    completed_at: string | null;
  }>;

  return rows.map(row => {
    const tokenUsage = getBuildTokenUsage(row.id);
    
    return {
      buildId: row.id,
      planPath: row.plan_path,
      status: row.status,
      currentSprint: row.current_sprint,
      currentTask: row.current_task,
      completedTasks: [],
      failedTasks: [],
      skippedTasks: [],
      tokenUsage,
      startedAt: row.started_at,
      completedAt: row.completed_at || undefined,
    };
  });
}

/**
 * Gets the latest build for a project
 */
export function getLatestBuild(projectPath: string): BuildState | null {
  const db = getDb();
  
  const row = db.prepare(`
    SELECT * FROM builds WHERE project_path = ? ORDER BY created_at DESC LIMIT 1
  `).get(projectPath) as {
    id: string;
    project_path: string;
    plan_path: string;
    status: BuildStatus;
    current_sprint: number;
    current_task: number;
    started_at: string;
    completed_at: string | null;
  } | undefined;

  if (!row) return null;

  return getBuild(row.id);
}

/**
 * Saves checkpoint state for a build
 */
export function saveBuildCheckpoint(
  buildId: string,
  taskResults: TaskResult[],
  fileChanges: FileChange[],
  decisions: CheckpointDecision[],
  pendingActions: ActionRequest[] = []
): void {
  const build = getBuild(buildId);
  if (!build) return;

  const state = createCheckpointState(
    build,
    taskResults,
    fileChanges,
    decisions,
    pendingActions
  );

  createCheckpoint(buildId, state);
}

/**
 * Resumes a build from the latest checkpoint
 */
export function resumeBuild(buildId: string): BuildState | null {
  const build = getBuild(buildId);
  if (!build) return null;

  const checkpoint = getLatestCheckpoint(buildId);
  if (!checkpoint) return build;

  // Restore state from checkpoint
  const state = checkpoint.state;
  
  updateBuildStatus(buildId, "running");
  
  // Log the resume
  postBulletin(build.buildId, {
    type: "manual",
    message: `Build resumed from checkpoint (sprint ${state.buildState.currentSprint}, task ${state.buildState.currentTask})`,
  });

  return {
    ...build,
    ...state.buildState,
    status: "running",
  };
}

/**
 * Checks if build can proceed based on budget
 */
export function checkBuildBudget(
  buildId: string,
  budgetLimit: number
): { canProceed: boolean; usage: ReturnType<typeof getBuildTokenUsage>; message?: string } {
  const check = checkBudgetExceeded(buildId, budgetLimit);
  
  if (check.exceeded) {
    return {
      canProceed: false,
      usage: check.usage,
      message: `Token budget exceeded: ${check.usage.total} / ${budgetLimit} tokens used`,
    };
  }

  if (check.remaining < budgetLimit * 0.2) {
    return {
      canProceed: true,
      usage: check.usage,
      message: `Warning: Token budget low - ${check.remaining} tokens remaining`,
    };
  }

  return {
    canProceed: true,
    usage: check.usage,
  };
}