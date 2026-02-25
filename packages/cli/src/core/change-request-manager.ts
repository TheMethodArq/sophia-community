import { getDb } from "./database.js";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export interface ChangeRequest {
  id: string;
  projectPath: string;
  title: string;
  description: string;
  impactLevel: "low" | "medium" | "high";
  requiresReplanning: boolean;
  affectedAreas: string[];
  estimatedTokens: number;
  status: "pending" | "approved" | "rejected" | "implemented";
  requestedBy: string;
  requestedAt: string;
  approvedBy?: string;
  approvedAt?: string;
  rejectionReason?: string;
}

export interface CreateChangeRequestInput {
  title: string;
  description: string;
  impactLevel: string;
  requiresReplanning: boolean;
  affectedAreas: string[];
  estimatedTokens: number;
  requestedBy: string;
}

/**
 * Create a new change request
 */
export function createChangeRequest(
  projectPath: string,
  input: CreateChangeRequestInput
): ChangeRequest {
  const db = getDb();
  const id = randomUUID();

  const changeRequest: ChangeRequest = {
    id,
    projectPath,
    title: input.title,
    description: input.description,
    impactLevel: input.impactLevel as "low" | "medium" | "high",
    requiresReplanning: input.requiresReplanning,
    affectedAreas: input.affectedAreas,
    estimatedTokens: input.estimatedTokens,
    status: "pending",
    requestedBy: input.requestedBy,
    requestedAt: new Date().toISOString(),
  };

  // Save to database
  const stmt = db.prepare(`
    INSERT INTO change_requests (
      id, project_path, title, description, impact_level, 
      requires_replanning, affected_areas, estimated_tokens,
      status, requested_by, requested_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    changeRequest.id,
    changeRequest.projectPath,
    changeRequest.title,
    changeRequest.description,
    changeRequest.impactLevel,
    changeRequest.requiresReplanning ? 1 : 0,
    JSON.stringify(changeRequest.affectedAreas),
    changeRequest.estimatedTokens,
    changeRequest.status,
    changeRequest.requestedBy,
    changeRequest.requestedAt
  );

  return changeRequest;
}

/**
 * List all change requests for a project
 */
export function listChangeRequests(projectPath: string): ChangeRequest[] {
  const db = getDb();

  const rows = db
    .prepare(
      `
      SELECT * FROM change_requests 
      WHERE project_path = ? 
      ORDER BY requested_at DESC
    `
    )
    .all(projectPath) as Array<{
      id: string;
      project_path: string;
      title: string;
      description: string;
      impact_level: string;
      requires_replanning: number;
      affected_areas: string;
      estimated_tokens: number;
      status: string;
      requested_by: string;
      requested_at: string;
      approved_by: string | null;
      approved_at: string | null;
      rejection_reason: string | null;
    }>;

  return rows.map((row) => ({
    id: row.id,
    projectPath: row.project_path,
    title: row.title,
    description: row.description,
    impactLevel: row.impact_level as "low" | "medium" | "high",
    requiresReplanning: row.requires_replanning === 1,
    affectedAreas: JSON.parse(row.affected_areas),
    estimatedTokens: row.estimated_tokens,
    status: row.status as "pending" | "approved" | "rejected" | "implemented",
    requestedBy: row.requested_by,
    requestedAt: row.requested_at,
    approvedBy: row.approved_by || undefined,
    approvedAt: row.approved_at || undefined,
    rejectionReason: row.rejection_reason || undefined,
  }));
}

/**
 * Approve a change request
 */
export function approveChangeRequest(
  projectPath: string,
  id: string,
  approvedBy?: string
): { success: boolean; error?: string; requiresReplanning?: boolean } {
  const db = getDb();

  // Get the change request
  const row = db
    .prepare("SELECT * FROM change_requests WHERE id = ? AND project_path = ?")
    .get(id, projectPath) as {
    id: string;
    requires_replanning: number;
    status: string;
  } | undefined;

  if (!row) {
    return { success: false, error: "Change request not found" };
  }

  if (row.status !== "pending") {
    return { success: false, error: `Change request is already ${row.status}` };
  }

  // Update status
  const stmt = db.prepare(`
    UPDATE change_requests 
    SET status = ?, approved_by = ?, approved_at = ?
    WHERE id = ?
  `);

  stmt.run("approved", approvedBy || "user", new Date().toISOString(), id);

  return {
    success: true,
    requiresReplanning: row.requires_replanning === 1,
  };
}

/**
 * Reject a change request
 */
export function rejectChangeRequest(
  projectPath: string,
  id: string,
  reason?: string
): { success: boolean; error?: string } {
  const db = getDb();

  const row = db.prepare("SELECT status FROM change_requests WHERE id = ?").get(id) as {
    status: string;
  } | undefined;

  if (!row) {
    return { success: false, error: "Change request not found" };
  }

  if (row.status !== "pending") {
    return { success: false, error: `Change request is already ${row.status}` };
  }

  const stmt = db.prepare(`
    UPDATE change_requests 
    SET status = ?, rejection_reason = ?
    WHERE id = ?
  `);

  stmt.run("rejected", reason || null, id);

  return { success: true };
}

/**
 * Mark a change request as implemented
 */
export function markChangeRequestImplemented(
  projectPath: string,
  id: string
): { success: boolean; error?: string } {
  const db = getDb();

  const row = db.prepare("SELECT status FROM change_requests WHERE id = ?").get(id) as {
    status: string;
  } | undefined;

  if (!row) {
    return { success: false, error: "Change request not found" };
  }

  if (row.status !== "approved") {
    return { success: false, error: "Change request must be approved first" };
  }

  const stmt = db.prepare(`
    UPDATE change_requests 
    SET status = ?
    WHERE id = ?
  `);

  stmt.run("implemented", id);

  return { success: true };
}
