import { getDb } from "./database.js";
import type { 
  TokenUsage, 
  TaskBudget, 
  ModelType,
  ModelRoutingTable,
  ModelRoutingEntry 
} from "@sophia-code/shared";

// Default model routing table (costs in USD per 1K tokens)
const DEFAULT_ROUTING_TABLE: ModelRoutingTable = {
  entries: [
    {
      taskType: "boilerplate",
      defaultModel: "haiku",
      fallbackModel: "sonnet",
      maxTokens: 4000,
      costPerInputToken: 0.00025,
      costPerOutputToken: 0.00125,
    },
    {
      taskType: "implementation",
      defaultModel: "sonnet",
      fallbackModel: "opus",
      maxTokens: 8000,
      costPerInputToken: 0.003,
      costPerOutputToken: 0.015,
    },
    {
      taskType: "complex_reasoning",
      defaultModel: "opus",
      maxTokens: 16000,
      costPerInputToken: 0.015,
      costPerOutputToken: 0.075,
    },
    {
      taskType: "review",
      defaultModel: "sonnet",
      fallbackModel: "opus",
      maxTokens: 8000,
      costPerInputToken: 0.003,
      costPerOutputToken: 0.015,
    },
    {
      taskType: "testing",
      defaultModel: "haiku",
      fallbackModel: "sonnet",
      maxTokens: 4000,
      costPerInputToken: 0.00025,
      costPerOutputToken: 0.00125,
    },
  ],
  defaultModel: "sonnet",
  budgetLimit: 100000, // Default budget limit per build
};

/**
 * Records token usage for a task
 */
export function recordTokenUsage(
  buildId: string,
  taskId: string | null,
  model: ModelType,
  inputTokens: number,
  outputTokens: number
): TokenUsage {
  const db = getDb();
  
  const routingEntry = DEFAULT_ROUTING_TABLE.entries.find(
    e => e.defaultModel === model || e.fallbackModel === model
  ) || DEFAULT_ROUTING_TABLE.entries[1]; // default to implementation

  const total = inputTokens + outputTokens;
  const cost = routingEntry
    ? (inputTokens / 1000) * routingEntry.costPerInputToken +
      (outputTokens / 1000) * routingEntry.costPerOutputToken
    : 0;

  const usage: TokenUsage = {
    input: inputTokens,
    output: outputTokens,
    total,
    cost: Math.round(cost * 10000) / 10000, // Round to 4 decimal places
  };

  const stmt = db.prepare(`
    INSERT INTO token_usage (build_id, task_id, model, input_tokens, output_tokens, cost, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    buildId,
    taskId,
    model,
    inputTokens,
    outputTokens,
    usage.cost,
    new Date().toISOString()
  );

  return usage;
}

/**
 * Gets total token usage for a build
 */
export function getBuildTokenUsage(buildId: string): TokenUsage {
  const db = getDb();
  
  const row = db.prepare(`
    SELECT 
      COALESCE(SUM(input_tokens), 0) as input,
      COALESCE(SUM(output_tokens), 0) as output,
      COALESCE(SUM(cost), 0) as cost
    FROM token_usage
    WHERE build_id = ?
  `).get(buildId) as { input: number; output: number; cost: number };

  return {
    input: row.input,
    output: row.output,
    total: row.input + row.output,
    cost: row.cost,
  };
}

/**
 * Gets token usage for a specific task
 */
export function getTaskTokenUsage(taskId: string): TokenUsage {
  const db = getDb();
  
  const row = db.prepare(`
    SELECT 
      COALESCE(SUM(input_tokens), 0) as input,
      COALESCE(SUM(output_tokens), 0) as output,
      COALESCE(SUM(cost), 0) as cost
    FROM token_usage
    WHERE task_id = ?
  `).get(taskId) as { input: number; output: number; cost: number };

  return {
    input: row.input,
    output: row.output,
    total: row.input + row.output,
    cost: row.cost,
  };
}

/**
 * Gets the model routing table
 */
export function getModelRoutingTable(): ModelRoutingTable {
  // In future, this could load from config file
  return DEFAULT_ROUTING_TABLE;
}

/**
 * Determines which model to use for a task type
 */
export function routeModel(
  taskType: string, 
  tokenBudget?: number,
  currentUsage?: TokenUsage
): { model: ModelType; maxTokens: number } {
  const table = getModelRoutingTable();
  
  // Check budget if provided
  if (tokenBudget && currentUsage && currentUsage.total >= tokenBudget * 0.8) {
    // Over 80% budget, use cheaper model
    const entry = table.entries.find(e => e.taskType === taskType);
    if (entry?.fallbackModel) {
      return {
        model: entry.fallbackModel,
        maxTokens: entry.maxTokens,
      };
    }
  }

  const entry = table.entries.find(e => e.taskType === taskType);
  
  if (entry) {
    return {
      model: entry.defaultModel,
      maxTokens: entry.maxTokens,
    };
  }

  return {
    model: table.defaultModel,
    maxTokens: 8000,
  };
}

/**
 * Estimates cost for a task
 */
export function estimateTaskCost(
  taskType: string,
  estimatedInputTokens: number,
  estimatedOutputTokens: number
): { estimatedCost: number; model: ModelType } {
  const { model } = routeModel(taskType);
  const table = getModelRoutingTable();
  
  const entry = table.entries.find(e => e.defaultModel === model);
  if (!entry) {
    return { estimatedCost: 0, model };
  }

  const cost = 
    (estimatedInputTokens / 1000) * entry.costPerInputToken +
    (estimatedOutputTokens / 1000) * entry.costPerOutputToken;

  return {
    estimatedCost: Math.round(cost * 10000) / 10000,
    model,
  };
}

/**
 * Checks if token budget has been exceeded
 */
export function checkBudgetExceeded(
  buildId: string,
  budgetLimit: number
): { exceeded: boolean; usage: TokenUsage; remaining: number } {
  const usage = getBuildTokenUsage(buildId);
  const remaining = budgetLimit - usage.total;
  
  return {
    exceeded: usage.total >= budgetLimit,
    usage,
    remaining,
  };
}

/**
 * Creates a budget report for a build
 */
export function createBudgetReport(buildId: string, budgetLimit: number): {
  usage: TokenUsage;
  budget: TaskBudget;
  breakdown: Array<{ model: ModelType; input: number; output: number; cost: number }>;
} {
  const db = getDb();
  const usage = getBuildTokenUsage(buildId);
  
  const breakdown = db.prepare(`
    SELECT 
      model,
      SUM(input_tokens) as input,
      SUM(output_tokens) as output,
      SUM(cost) as cost
    FROM token_usage
    WHERE build_id = ?
    GROUP BY model
  `).all(buildId) as Array<{ model: ModelType; input: number; output: number; cost: number }>;

  const budget: TaskBudget = {
    taskId: buildId,
    estimated: budgetLimit,
    actual: usage.total,
    remaining: budgetLimit - usage.total,
    model: "sonnet",
  };

  return {
    usage,
    budget,
    breakdown,
  };
}