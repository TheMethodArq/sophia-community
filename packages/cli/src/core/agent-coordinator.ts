import type { AgentAdapter, AgentContext, AgentResult, TaskResult } from "@sophia-code/shared";
import { createAgentAdapter } from "./agent-adapter.js";
import { randomUUID } from "node:crypto";
import { getDb } from "./database.js";
import { recordTokenUsage } from "./token-tracker.js";
import { postBulletin } from "./bulletin.js";

/**
 * Agent capability definition
 */
export interface AgentCapability {
  agentType: string;
  supportedTasks: string[];
  maxConcurrentTasks: number;
  averageSpeed: number; // tasks per hour
  costPer1KTokens: number;
  reliability: number; // 0-1
}

/**
 * Task dependency definition
 */
export interface TaskDependency {
  taskId: string;
  dependsOn: string[];
  files: string[];
}

/**
 * Agent assignment
 */
export interface AgentAssignment {
  taskId: string;
  agentType: string;
  agentId: string;
  assignedAt: string;
  estimatedDuration: number;
  priority: number;
}

/**
 * Parallel execution result
 */
export interface ParallelExecutionResult {
  taskId: string;
  agentId: string;
  result: AgentResult;
  startedAt: string;
  completedAt: string;
  tokensUsed: {
    input: number;
    output: number;
    total: number;
  };
}

/**
 * Agent Coordinator
 * Manages multi-agent task routing and parallel execution
 */
export class AgentCoordinator {
  private agents = new Map<string, AgentAdapter>();
  private activeAssignments = new Map<string, AgentAssignment>();
  private capabilities: AgentCapability[] = [];
  private maxParallelAgents = 3;

  /**
   * Register agent capabilities
   */
  registerCapabilities(capabilities: AgentCapability[]): void {
    this.capabilities = capabilities;
  }

  /**
   * Register an agent instance
   */
  registerAgent(agentId: string, adapter: AgentAdapter): void {
    this.agents.set(agentId, adapter);
  }

  /**
   * Build task dependency graph
   */
  buildDependencyGraph(tasks: TaskDependency[]): Map<string, Set<string>> {
    const graph = new Map<string, Set<string>>();

    // Initialize all tasks
    for (const task of tasks) {
      graph.set(task.taskId, new Set());
    }

    // Build dependency edges
    for (const task of tasks) {
      for (const depId of task.dependsOn) {
        const deps = graph.get(task.taskId);
        if (deps) {
          deps.add(depId);
        }
      }
    }

    return graph;
  }

  /**
   * Detect file conflicts between tasks
   */
  detectFileConflicts(tasks: TaskDependency[]): Array<{ taskA: string; taskB: string; files: string[] }> {
    const conflicts: Array<{ taskA: string; taskB: string; files: string[] }> = [];

    for (let i = 0; i < tasks.length; i++) {
      for (let j = i + 1; j < tasks.length; j++) {
        const taskA = tasks[i];
        const taskB = tasks[j];

        if (!taskA || !taskB) continue;

        // Find overlapping files
        const overlapping = taskA.files.filter((f) => taskB.files.includes(f));

        if (overlapping.length > 0) {
          conflicts.push({
            taskA: taskA.taskId,
            taskB: taskB.taskId,
            files: overlapping,
          });
        }
      }
    }

    return conflicts;
  }

  /**
   * Find tasks that can run in parallel
   */
  findParallelizableTasks(
    tasks: TaskDependency[],
    completedTasks: Set<string>
  ): TaskDependency[] {
    const graph = this.buildDependencyGraph(tasks);
    const conflicts = this.detectFileConflicts(tasks);
    const conflictingPairs = new Set<string>();

    // Build set of conflicting task pairs
    for (const conflict of conflicts) {
      conflictingPairs.add(`${conflict.taskA}:${conflict.taskB}`);
      conflictingPairs.add(`${conflict.taskB}:${conflict.taskA}`);
    }

    // Find tasks with no incomplete dependencies and no active conflicts
    const available: TaskDependency[] = [];
    const activeTaskIds = new Set(this.activeAssignments.keys());

    for (const task of tasks) {
      // Skip completed or active tasks
      if (completedTasks.has(task.taskId) || activeTaskIds.has(task.taskId)) {
        continue;
      }

      // Check if all dependencies are completed
      const deps = graph.get(task.taskId) || new Set();
      const allDepsCompleted = Array.from(deps).every((depId) => completedTasks.has(depId));

      if (!allDepsCompleted) {
        continue;
      }

      // Check for file conflicts with active tasks
      let hasConflict = false;
      for (const activeId of activeTaskIds) {
        if (conflictingPairs.has(`${task.taskId}:${activeId}`)) {
          hasConflict = true;
          break;
        }
      }

      if (!hasConflict) {
        available.push(task);
      }
    }

    return available;
  }

  /**
   * Select best agent for a task
   */
  selectAgentForTask(taskType: string, availableAgents: string[]): string | null {
    // Filter capabilities by supported task type
    const capableAgents = this.capabilities.filter((cap) =>
      cap.supportedTasks.includes(taskType)
    );

    if (capableAgents.length === 0) {
      return null;
    }

    // Score agents by: reliability, cost, speed
    const scored = capableAgents.map((cap) => {
      const agentId = availableAgents.find((id) => id.startsWith(cap.agentType));
      if (!agentId) return null;

      // Simple scoring: reliability * 0.5 + speed * 0.3 + (1/cost) * 0.2
      const score = cap.reliability * 0.5 + (cap.averageSpeed / 10) * 0.3 + (1 / cap.costPer1KTokens) * 0.2;

      return { agentId, score, cap };
    }).filter(Boolean) as Array<{ agentId: string; score: number; cap: AgentCapability }>;

    // Sort by score descending
    scored.sort((a, b) => b.score - a.score);

    return scored[0]?.agentId || null;
  }

  /**
   * Assign task to agent
   */
  async assignTask(
    buildId: string,
    taskId: string,
    taskSpec: string,
    agentType: string,
    context: AgentContext
  ): Promise<AgentAssignment> {
    const agentId = `${agentType}-${randomUUID().slice(0, 8)}`;

    // Create and initialize agent
    const adapter = createAgentAdapter(agentType);
    await adapter.initialize(context);

    this.registerAgent(agentId, adapter);

    const assignment: AgentAssignment = {
      taskId,
      agentType,
      agentId,
      assignedAt: new Date().toISOString(),
      estimatedDuration: 300, // 5 minutes default
      priority: 1,
    };

    this.activeAssignments.set(taskId, assignment);

    // Log assignment
    postBulletin(buildId, {
      type: "manual",
      message: `Task ${taskId} assigned to ${agentType} agent ${agentId}`,
    });

    return assignment;
  }

  /**
   * Execute task with agent
   */
  async executeTask(
    buildId: string,
    assignment: AgentAssignment,
    taskSpec: string,
    context: AgentContext
  ): Promise<ParallelExecutionResult> {
    const agent = this.agents.get(assignment.agentId);

    if (!agent) {
      throw new Error(`Agent ${assignment.agentId} not found`);
    }

    const startedAt = new Date().toISOString();

    try {
      const result = await agent.execute(taskSpec, context);

      const completedAt = new Date().toISOString();

      // Record token usage
      if (result.tokensUsed.total > 0) {
        recordTokenUsage(
          buildId,
          assignment.taskId,
          this.getModelFromAgentType(assignment.agentType),
          result.tokensUsed.input,
          result.tokensUsed.output
        );
      }

      // Clean up
      this.activeAssignments.delete(assignment.taskId);
      await agent.cleanup();
      this.agents.delete(assignment.agentId);

      return {
        taskId: assignment.taskId,
        agentId: assignment.agentId,
        result,
        startedAt,
        completedAt,
        tokensUsed: {
          input: result.tokensUsed.input,
          output: result.tokensUsed.output,
          total: result.tokensUsed.total,
        },
      };
    } catch (error) {
      // Clean up on error
      this.activeAssignments.delete(assignment.taskId);
      await agent.cleanup();
      this.agents.delete(assignment.agentId);

      throw error;
    }
  }

  /**
   * Execute tasks in parallel where possible
   */
  async executeParallel(
    buildId: string,
    tasks: TaskDependency[],
    taskSpecs: Map<string, string>,
    contextBuilder: (taskId: string) => AgentContext,
    options: {
      maxParallel?: number;
      agentPreferences?: Map<string, string>;
    } = {}
  ): Promise<ParallelExecutionResult[]> {
    const maxParallel = options.maxParallel || this.maxParallelAgents;
    const completedTasks = new Set<string>();
    const results: ParallelExecutionResult[] = [];

    while (completedTasks.size < tasks.length) {
      // Find tasks ready to run
      const available = this.findParallelizableTasks(tasks, completedTasks);

      if (available.length === 0 && this.activeAssignments.size === 0) {
        // Deadlock or all done
        break;
      }

      // Determine how many new tasks we can start
      const slotsAvailable = maxParallel - this.activeAssignments.size;
      const toStart = available.slice(0, slotsAvailable);

      // Start new tasks
      const startPromises = toStart.map(async (task) => {
        const taskSpec = taskSpecs.get(task.taskId);
        if (!taskSpec) {
          throw new Error(`No spec found for task ${task.taskId}`);
        }

        // Determine agent type
        const agentType =
          options.agentPreferences?.get(task.taskId) || this.inferAgentType(task.taskId);

        const context = contextBuilder(task.taskId);

        // Assign and execute
        const assignment = await this.assignTask(
          buildId,
          task.taskId,
          taskSpec,
          agentType,
          context
        );

        return this.executeTask(buildId, assignment, taskSpec, context);
      });

      // Wait for at least one task to complete
      const completed = await Promise.race([
        Promise.all(startPromises),
        this.waitForAnyCompletion(),
      ]);

      // Process completed tasks
      if (Array.isArray(completed)) {
        // All started tasks completed
        for (const result of completed) {
          results.push(result);
          completedTasks.add(result.taskId);
        }
      } else {
        // One task completed
        results.push(completed);
        completedTasks.add(completed.taskId);
      }
    }

    return results;
  }

  /**
   * Wait for any active task to complete
   */
  private async waitForAnyCompletion(): Promise<ParallelExecutionResult> {
    // This is a placeholder - in real implementation would use event emitters
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({} as ParallelExecutionResult);
      }, 1000);
    });
  }

  /**
   * Infer agent type from task ID
   */
  private inferAgentType(taskId: string): string {
    // Simple heuristic based on task name
    if (taskId.includes("test") || taskId.includes("spec")) {
      return "claude-code"; // Use Claude for tests
    }
    if (taskId.includes("docs") || taskId.includes("readme")) {
      return "claude-code"; // Use Claude for docs
    }
    return "claude-code"; // Default
  }

  /**
   * Get model type from agent type
   */
  private getModelFromAgentType(agentType: string): "haiku" | "sonnet" | "opus" {
    switch (agentType) {
      case "claude-code":
        return "sonnet";
      case "opencode":
        return "sonnet";
      default:
        return "sonnet";
    }
  }

  /**
   * Get active assignments
   */
  getActiveAssignments(): AgentAssignment[] {
    return Array.from(this.activeAssignments.values());
  }

  /**
   * Get agent statistics
   */
  getStats(): {
    registeredAgents: number;
    activeAssignments: number;
    capabilities: number;
  } {
    return {
      registeredAgents: this.agents.size,
      activeAssignments: this.activeAssignments.size,
      capabilities: this.capabilities.length,
    };
  }

  /**
   * Reset coordinator state
   */
  async reset(): Promise<void> {
    // Clean up all agents
    for (const [agentId, agent] of this.agents) {
      await agent.cleanup();
    }

    this.agents.clear();
    this.activeAssignments.clear();
  }
}

// Singleton instance
export const agentCoordinator = new AgentCoordinator();

/**
 * Default agent capabilities
 */
export const defaultCapabilities: AgentCapability[] = [
  {
    agentType: "claude-code",
    supportedTasks: ["implementation", "testing", "documentation", "review"],
    maxConcurrentTasks: 2,
    averageSpeed: 6, // 6 tasks per hour
    costPer1KTokens: 0.015,
    reliability: 0.95,
  },
  {
    agentType: "opencode",
    supportedTasks: ["implementation", "testing", "refactoring"],
    maxConcurrentTasks: 3,
    averageSpeed: 8, // 8 tasks per hour
    costPer1KTokens: 0.012,
    reliability: 0.9,
  },
];

/**
 * Initialize coordinator with default capabilities
 */
export function initializeCoordinator(): void {
  agentCoordinator.registerCapabilities(defaultCapabilities);
}
