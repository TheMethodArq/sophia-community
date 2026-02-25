import { getDb } from "./database.js";
import type { Checkpoint, CheckpointState, BuildState } from "@sophia-code/shared";
import { randomUUID } from "node:crypto";

/**
 * Creates a new checkpoint for a build
 */
export function createCheckpoint(buildId: string, state: CheckpointState): Checkpoint {
  const db = getDb();
  const checkpoint: Checkpoint = {
    id: randomUUID(),
    buildId,
    state,
    createdAt: new Date().toISOString(),
  };

  const stmt = db.prepare(`
    INSERT INTO checkpoints (id, build_id, sprint_number, task_number, state, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    checkpoint.id,
    checkpoint.buildId,
    state.buildState.currentSprint,
    state.buildState.currentTask,
    JSON.stringify(state),
    checkpoint.createdAt
  );

  return checkpoint;
}

/**
 * Gets the latest checkpoint for a build
 */
export function getLatestCheckpoint(buildId: string): Checkpoint | null {
  const db = getDb();
  
  const row = db.prepare(`
    SELECT * FROM checkpoints 
    WHERE build_id = ? 
    ORDER BY created_at DESC 
    LIMIT 1
  `).get(buildId) as {
    id: string;
    build_id: string;
    sprint_number: number;
    task_number: number;
    state: string;
    created_at: string;
  } | undefined;

  if (!row) return null;

  return {
    id: row.id,
    buildId: row.build_id,
    state: JSON.parse(row.state) as CheckpointState,
    createdAt: row.created_at,
  };
}

/**
 * Gets a specific checkpoint by ID
 */
export function getCheckpoint(checkpointId: string): Checkpoint | null {
  const db = getDb();
  
  const row = db.prepare(`
    SELECT * FROM checkpoints WHERE id = ?
  `).get(checkpointId) as {
    id: string;
    build_id: string;
    sprint_number: number;
    task_number: number;
    state: string;
    created_at: string;
  } | undefined;

  if (!row) return null;

  return {
    id: row.id,
    buildId: row.build_id,
    state: JSON.parse(row.state) as CheckpointState,
    createdAt: row.created_at,
  };
}

/**
 * Lists all checkpoints for a build
 */
export function listCheckpoints(buildId: string): Checkpoint[] {
  const db = getDb();
  
  const rows = db.prepare(`
    SELECT * FROM checkpoints 
    WHERE build_id = ? 
    ORDER BY created_at ASC
  `).all(buildId) as Array<{
    id: string;
    build_id: string;
    sprint_number: number;
    task_number: number;
    state: string;
    created_at: string;
  }>;

  return rows.map(row => ({
    id: row.id,
    buildId: row.build_id,
    state: JSON.parse(row.state) as CheckpointState,
    createdAt: row.created_at,
  }));
}

/**
 * Restores build state from a checkpoint
 */
export function restoreFromCheckpoint(checkpointId: string): BuildState | null {
  const checkpoint = getCheckpoint(checkpointId);
  if (!checkpoint) return null;

  return checkpoint.state.buildState;
}

/**
 * Creates a checkpoint state from current build data
 */
export function createCheckpointState(
  buildState: BuildState,
  taskResults: CheckpointState["taskResults"],
  fileChanges: CheckpointState["fileChanges"],
  decisions: CheckpointState["decisions"],
  pendingActions: CheckpointState["pendingActions"] = []
): CheckpointState {
  return {
    buildState: { ...buildState },
    taskResults: [...taskResults],
    fileChanges: [...fileChanges],
    decisions: [...decisions],
    pendingActions: [...pendingActions],
  };
}

/**
 * Cleans up old checkpoints, keeping only the last N
 */
export function cleanupOldCheckpoints(buildId: string, keepCount: number = 10): number {
  const db = getDb();
  
  const result = db.prepare(`
    DELETE FROM checkpoints
    WHERE id NOT IN (
      SELECT id FROM checkpoints
      WHERE build_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    )
  `).run(buildId, keepCount);

  return result.changes;
}

/**
 * Deletes all checkpoints for a build
 */
export function deleteBuildCheckpoints(buildId: string): number {
  const db = getDb();
  
  const result = db.prepare(`
    DELETE FROM checkpoints WHERE build_id = ?
  `).run(buildId);

  return result.changes;
}