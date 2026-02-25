import type { 
  ActionRequest, 
  ActionType, 
  ActionClassification,
  Escalation,
  FileChange 
} from "@sophia-code/shared";
import { randomUUID } from "node:crypto";
import { getDb } from "./database.js";
import chalk from "chalk";

// Risk thresholds for auto-approval
const RISK_THRESHOLDS = {
  autoApprove: 0.3,
  informOnly: 0.6,
  humanRequired: 1.0,
};

// Patterns that increase risk score
const HIGH_RISK_PATTERNS = [
  { pattern: /(password|secret|key|token|credential)/i, weight: 0.4 },
  { pattern: /(delete|remove|drop|destroy)/i, weight: 0.3 },
  { pattern: /(exec|spawn|eval|system)/i, weight: 0.5 },
  { pattern: /(chmod|chown|sudo|root)/i, weight: 0.4 },
  { pattern: /(\.env|config\.json|secrets\.)/i, weight: 0.3 },
  { pattern: /(npm install|yarn add|pip install)/i, weight: 0.2 },
];

// File patterns that are sensitive
const SENSITIVE_FILES = [
  /\.env$/,
  /\.env\.local$/,
  /config\/.*\.json$/,
  /secrets?\./,
  /credentials?\./,
  /key\.pem$/,
  /cert\.pem$/,
];

/**
 * Classifies an action based on type and content
 */
export function classifyAction(
  actionType: ActionType,
  details: ActionRequest["details"]
): ActionClassification {
  const riskScore = calculateRiskScore(actionType, details);

  if (riskScore <= RISK_THRESHOLDS.autoApprove) {
    return "auto_approve";
  } else if (riskScore <= RISK_THRESHOLDS.informOnly) {
    return "inform_only";
  } else {
    return "human_required";
  }
}

/**
 * Calculates a risk score for an action (0-1)
 */
function calculateRiskScore(
  actionType: ActionType,
  details: ActionRequest["details"]
): number {
  let score = 0;

  // Base risk by action type
  switch (actionType) {
    case "file_write":
      score += 0.1;
      break;
    case "file_delete":
      score += 0.4;
      break;
    case "dependency_add":
      score += 0.2;
      break;
    case "command_exec":
      score += 0.5;
      break;
    case "git_commit":
      score += 0.1;
      break;
    case "config_change":
      score += 0.3;
      break;
  }

  // Check for sensitive file patterns
  if (details.path) {
    if (SENSITIVE_FILES.some(pattern => pattern.test(details.path!))) {
      score += 0.4;
    }
  }

  // Check for high-risk patterns in content or command
  const contentToCheck = details.content || details.command || "";
  for (const { pattern, weight } of HIGH_RISK_PATTERNS) {
    if (pattern.test(contentToCheck)) {
      score += weight;
    }
  }

  // Cap at 1.0
  return Math.min(score, 1.0);
}

/**
 * Creates an action request and classifies it
 */
export function createActionRequest(
  buildId: string,
  taskId: string,
  actionType: ActionType,
  description: string,
  details: ActionRequest["details"]
): ActionRequest {
  const classification = classifyAction(actionType, details);
  const riskScore = calculateRiskScore(actionType, details);

  const request: ActionRequest = {
    id: randomUUID(),
    buildId,
    taskId,
    actionType,
    description,
    details,
    classification,
    riskScore,
    requestedAt: new Date().toISOString(),
    approved: classification === "auto_approve" ? true : undefined,
    approvedBy: classification === "auto_approve" ? "auto" : undefined,
  };

  // Save to database
  saveActionRequest(request);

  return request;
}

/**
 * Saves an action request to the database
 */
function saveActionRequest(request: ActionRequest): void {
  const db = getDb();
  
  const stmt = db.prepare(`
    INSERT INTO actions (build_id, task_id, action_type, classification, status, created_at, resolved_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    request.buildId,
    request.taskId,
    request.actionType,
    request.classification,
    request.approved ? (request.approvedBy === "auto" ? "auto_approved" : "approved") : "pending",
    request.requestedAt,
    request.approved ? request.requestedAt : null
  );
}

/**
 * Creates an escalation for human-required actions
 */
export function createEscalation(
  action: ActionRequest,
  context: {
    taskDescription: string;
    affectedFiles: string[];
    potentialImpact: string;
  }
): Escalation {
  const severity = action.riskScore > 0.8 ? "critical" : 
                   action.riskScore > 0.6 ? "high" : "medium";

  const escalation: Escalation = {
    id: randomUUID(),
    actionId: action.id,
    buildId: action.buildId,
    reason: `Action requires human approval: ${action.description}`,
    severity,
    context: {
      taskId: action.taskId,
      taskDescription: context.taskDescription,
      affectedFiles: context.affectedFiles,
      potentialImpact: context.potentialImpact,
    },
    escalatedAt: new Date().toISOString(),
  };

  return escalation;
}

/**
 * Formats an escalation for display
 */
export function formatEscalation(escalation: Escalation): string {
  const severityColor = {
    low: chalk.blue,
    medium: chalk.yellow,
    high: chalk.red,
    critical: chalk.bgRed.white,
  };

  const lines = [
    "",
    chalk.bold("=".repeat(60)),
    chalk.bold(severityColor[escalation.severity](` ESCALATION: ${escalation.severity.toUpperCase()} `)),
    chalk.bold("=".repeat(60)),
    "",
    chalk.bold("Reason:"),
    escalation.reason,
    "",
    chalk.bold("Task:"),
    escalation.context.taskDescription,
    "",
    chalk.bold("Affected Files:"),
    ...escalation.context.affectedFiles.map(f => `  • ${f}`),
    "",
    chalk.bold("Potential Impact:"),
    escalation.context.potentialImpact,
    "",
    chalk.bold("-".repeat(60)),
    chalk.bold("Options:"),
    `  [${chalk.green("a")}]pprove - Allow this action to proceed`,
    `  [${chalk.red("r")}]eject  - Deny this action`,
    `  [${chalk.yellow("m")}]odify - Request changes before approval`,
    "",
  ];

  return lines.join("\n");
}

/**
 * Logs an inform-only action
 */
export function logInformOnly(action: ActionRequest): void {
  console.log(chalk.gray(`[INFO] ${action.description}`));
  if (action.details.path) {
    console.log(chalk.gray(`       Path: ${action.details.path}`));
  }
  if (action.details.command) {
    console.log(chalk.gray(`       Command: ${action.details.command}`));
  }
}

/**
 * Gets pending actions for a build
 */
export function getPendingActions(buildId: string): ActionRequest[] {
  const db = getDb();
  
  const rows = db.prepare(`
    SELECT * FROM actions 
    WHERE build_id = ? AND status = 'pending'
    ORDER BY created_at ASC
  `).all(buildId) as Array<{
    id: number;
    build_id: string;
    task_id: string;
    action_type: ActionType;
    classification: ActionClassification;
    status: string;
    created_at: string;
    resolved_at: string | null;
  }>;

  return rows.map(row => ({
    id: String(row.id),
    buildId: row.build_id,
    taskId: row.task_id,
    actionType: row.action_type,
    description: "", // Would need to store this in DB
    details: {},
    classification: row.classification,
    riskScore: 0, // Would need to store this in DB
    requestedAt: row.created_at,
    resolvedAt: row.resolved_at || undefined,
  }));
}

/**
 * Approves an action
 */
export function approveAction(actionId: string, reason?: string): boolean {
  const db = getDb();
  
  const result = db.prepare(`
    UPDATE actions 
    SET status = 'approved', resolved_at = ?
    WHERE id = ? AND status = 'pending'
  `).run(new Date().toISOString(), actionId);

  return result.changes > 0;
}

/**
 * Rejects an action
 */
export function rejectAction(actionId: string): boolean {
  const db = getDb();
  
  const result = db.prepare(`
    UPDATE actions 
    SET status = 'rejected', resolved_at = ?
    WHERE id = ? AND status = 'pending'
  `).run(new Date().toISOString(), actionId);

  return result.changes > 0;
}