import type {
  IntegrationAdapter,
  IntegrationConfig,
  IntegrationType,
  ConnectionResult,
  HealthStatus,
  OperationResult,
} from "./integration-adapter.js";

/**
 * Leantime Project Management Integration
 * Syncs sprints, tasks, and decisions with Leantime
 */
export class LeantimeAdapter implements IntegrationAdapter {
  name = "leantime";
  type: IntegrationType = "pm";

  private config?: IntegrationConfig;
  private baseUrl?: string;
  private apiKey?: string;

  /**
   * Connect to Leantime API
   */
  async connect(config: IntegrationConfig): Promise<ConnectionResult> {
    this.config = config;
    this.baseUrl = config.baseUrl.replace(/\/$/, "");
    
    // Get API key from environment or credentials
    if (config.auth.type === "token") {
      const envVar = config.auth.credentials.replace("env:", "");
      this.apiKey = process.env[envVar];
    }

    if (!this.apiKey) {
      return {
        success: false,
        error: "Leantime API key not found in environment",
      };
    }

    // Test connection
    const health = await this.healthCheck();
    
    return {
      success: health.connected,
      error: health.error,
      metadata: {
        version: health.version,
        latency: health.latency,
      },
    };
  }

  /**
   * Disconnect from Leantime
   */
  async disconnect(): Promise<void> {
    this.config = undefined;
    this.baseUrl = undefined;
    this.apiKey = undefined;
  }

  /**
   * Check Leantime API health
   */
  async healthCheck(): Promise<HealthStatus> {
    if (!this.baseUrl || !this.apiKey) {
      return {
        connected: false,
        latency: -1,
        error: "Not configured",
      };
    }

    const startTime = Date.now();

    try {
      const response = await fetch(`${this.baseUrl}/api/users`, {
        headers: {
          "Authorization": `Bearer ${this.apiKey}`,
          "Accept": "application/json",
        },
      });

      const latency = Date.now() - startTime;

      if (response.ok) {
        return {
          connected: true,
          latency,
        };
      }

      return {
        connected: false,
        latency,
        error: `HTTP ${response.status}: ${response.statusText}`,
      };
    } catch (error) {
      return {
        connected: false,
        latency: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Execute Leantime operations
   */
  async execute(
    operation: string,
    params: Record<string, unknown>
  ): Promise<OperationResult> {
    switch (operation) {
      case "createProject":
        return this.createProject(params);
      case "createSprint":
        return this.createSprint(params);
      case "createTask":
        return this.createTask(params);
      case "updateTask":
        return this.updateTask(params);
      case "addComment":
        return this.addComment(params);
      case "syncBuildStatus":
        return this.syncBuildStatus(params);
      default:
        return {
          success: false,
          error: `Unknown operation: ${operation}`,
        };
    }
  }

  /**
   * Create a new project in Leantime
   */
  private async createProject(params: Record<string, unknown>): Promise<OperationResult> {
    const { name, description, clientId } = params;

    try {
      const response = await fetch(`${this.baseUrl}/api/projects`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          details: description,
          clientId: clientId || 1,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = (await response.json()) as { id: string | number; name: string };
      
      return {
        success: true,
        data: {
          projectId: String(data.id),
          name: data.name,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Create a sprint (milestone) in Leantime
   */
  private async createSprint(params: Record<string, unknown>): Promise<OperationResult> {
    const { projectId, name, startDate, endDate, description } = params;

    try {
      const response = await fetch(`${this.baseUrl}/api/milestones`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          projectId,
          headline: name,
          editFrom: startDate,
          editTo: endDate,
          description,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = (await response.json()) as { id: string | number; headline: string };

      return {
        success: true,
        data: {
          sprintId: String(data.id),
          name: data.headline,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Create a task (ticket) in Leantime
   */
  private async createTask(params: Record<string, unknown>): Promise<OperationResult> {
    const { 
      projectId, 
      sprintId, 
      title, 
      description, 
      type = "task",
      priority = "medium",
      status = "0", // New
    } = params;

    try {
      const response = await fetch(`${this.baseUrl}/api/tickets`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          projectId,
          milestoneid: sprintId,
          headline: title,
          description,
          type,
          priority,
          status,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = (await response.json()) as { id: string | number; headline: string };

      return {
        success: true,
        data: {
          taskId: String(data.id),
          title: data.headline,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Update a task in Leantime
   */
  private async updateTask(params: Record<string, unknown>): Promise<OperationResult> {
    const { taskId, status, description, progress } = params;

    try {
      const response = await fetch(`${this.baseUrl}/api/tickets/${taskId}`, {
        method: "PATCH",
        headers: {
          "Authorization": `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status,
          description,
          progress,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return {
        success: true,
        data: { taskId, updated: true },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Add a comment to a task
   */
  private async addComment(params: Record<string, unknown>): Promise<OperationResult> {
    const { taskId, comment, userId } = params;

    try {
      const response = await fetch(`${this.baseUrl}/api/comments`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          module: "ticket",
          moduleId: taskId,
          text: comment,
          userId,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const commentData = (await response.json()) as { id: string | number };
      return {
        success: true,
        data: { commentId: String(commentData.id) },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Sync build status with Leantime tasks
   */
  private async syncBuildStatus(params: Record<string, unknown>): Promise<OperationResult> {
    const { taskId, buildStatus, buildUrl, tokenUsage } = params;

    const statusMap: Record<string, string> = {
      pending: "0", // New
      running: "2", // In Progress
      completed: "1", // Done
      failed: "4", // Blocked
      paused: "3", // On Hold
    };

    const comment = this.formatBuildComment(buildStatus as string, tokenUsage as Record<string, number>);

    // Update task status
    const updateResult = await this.updateTask({
      taskId,
      status: statusMap[buildStatus as string] || "0",
    });

    if (!updateResult.success) {
      return updateResult;
    }

    // Add status comment
    return this.addComment({
      taskId,
      comment,
    });
  }

  /**
   * Format build status as comment
   */
  private formatBuildComment(status: string, tokenUsage?: Record<string, number>): string {
    let comment = `**Build Status: ${status.toUpperCase()}**\n\n`;

    if (tokenUsage) {
      comment += `Token Usage: ${tokenUsage["total"]?.toLocaleString() || 0} tokens\n`;
      comment += `Cost: $${(tokenUsage["cost"] || 0).toFixed(4)}\n`;
    }

    comment += `\n_Updated by Sophia Code_`;

    return comment;
  }
}

/**
 * Create Leantime integration from environment config
 */
export function createLeantimeIntegration(): LeantimeAdapter | null {
  const baseUrl = process.env["LEANTIME_URL"];
  const apiKey = process.env["LEANTIME_API_KEY"];

  if (!baseUrl || !apiKey) {
    return null;
  }

  const adapter = new LeantimeAdapter();
  
  // Initialize connection
  adapter.connect({
    baseUrl,
    auth: {
      type: "token",
      credentials: "env:LEANTIME_API_KEY",
    },
    options: {},
  }).catch(() => {
    // Connection failed, but adapter is created
  });

  return adapter;
}

/**
 * Sync a build with Leantime project
 */
export async function syncBuildWithLeantime(
  projectId: string,
  sprintId: string,
  taskId: string,
  buildState: {
    status: string;
    tokenUsage: { total: number; cost: number };
    completedTasks: string[];
    failedTasks: string[];
  }
): Promise<{ success: boolean; error?: string }> {
  const adapter = createLeantimeIntegration();
  
  if (!adapter) {
    return { success: false, error: "Leantime not configured" };
  }

  const result = await adapter.execute("syncBuildStatus", {
    taskId,
    buildStatus: buildState.status,
    tokenUsage: buildState.tokenUsage,
  });

  // Add comment about completed/failed tasks
  if (buildState.completedTasks.length > 0) {
    await adapter.execute("addComment", {
      taskId,
      comment: `✅ Completed tasks:\n${buildState.completedTasks.map(t => `- ${t}`).join("\n")}`,
    });
  }

  if (buildState.failedTasks.length > 0) {
    await adapter.execute("addComment", {
      taskId,
      comment: `❌ Failed tasks:\n${buildState.failedTasks.map(t => `- ${t}`).join("\n")}`,
    });
  }

  return {
    success: result.success,
    error: result.error,
  };
}
