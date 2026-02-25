import type {
  IntegrationAdapter,
  IntegrationConfig,
  IntegrationType,
  ConnectionResult,
  HealthStatus,
  OperationResult,
} from "./integration-adapter.js";

/**
 * n8n Workflow Automation Integration
 * Triggers workflows on build events and escalations
 */
export class N8nAdapter implements IntegrationAdapter {
  name = "n8n";
  type: IntegrationType = "cicd";

  private config?: IntegrationConfig;
  private baseUrl?: string;
  private apiKey?: string;

  /**
   * Connect to n8n API
   */
  async connect(config: IntegrationConfig): Promise<ConnectionResult> {
    this.config = config;
    this.baseUrl = config.baseUrl.replace(/\/$/, "");

    if (config.auth.type === "token") {
      const envVar = config.auth.credentials.replace("env:", "");
      this.apiKey = process.env[envVar];
    }

    if (!this.apiKey) {
      return {
        success: false,
        error: "n8n API key not found in environment",
      };
    }

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
   * Disconnect from n8n
   */
  async disconnect(): Promise<void> {
    this.config = undefined;
    this.baseUrl = undefined;
    this.apiKey = undefined;
  }

  /**
   * Check n8n API health
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
      const response = await fetch(`${this.baseUrl}/api/v1/workflows`, {
        headers: {
          "X-N8N-API-KEY": this.apiKey,
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
   * Execute n8n operations
   */
  async execute(
    operation: string,
    params: Record<string, unknown>
  ): Promise<OperationResult> {
    switch (operation) {
      case "triggerWebhook":
        return this.triggerWebhook(params);
      case "createWorkflow":
        return this.createWorkflow(params);
      case "getWorkflows":
        return this.getWorkflows(params);
      case "activateWorkflow":
        return this.activateWorkflow(params);
      default:
        return {
          success: false,
          error: `Unknown operation: ${operation}`,
        };
    }
  }

  /**
   * Trigger a webhook workflow
   */
  private async triggerWebhook(params: Record<string, unknown>): Promise<OperationResult> {
    const { webhookId, event, data } = params;

    try {
      const response = await fetch(`${this.baseUrl}/webhook/${webhookId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          event,
          timestamp: new Date().toISOString(),
          data,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return {
        success: true,
        data: {
          triggered: true,
          webhookId,
          event,
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
   * Create a new workflow
   */
  private async createWorkflow(params: Record<string, unknown>): Promise<OperationResult> {
    const { name, nodes, connections } = params;

    if (!this.apiKey) {
      return {
        success: false,
        error: "Not authenticated",
      };
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/v1/workflows`, {
        method: "POST",
        headers: {
          "X-N8N-API-KEY": this.apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          nodes,
          connections,
          settings: {
            executionOrder: "v1",
          },
          staticData: null,
          tags: [],
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = (await response.json()) as { id: string };

      return {
        success: true,
        data: {
          workflowId: data.id,
          name,
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
   * Get list of workflows
   */
  private async getWorkflows(params: Record<string, unknown>): Promise<OperationResult> {
    const { active } = params;

    if (!this.apiKey) {
      return {
        success: false,
        error: "Not authenticated",
      };
    }

    try {
      const url = new URL(`${this.baseUrl}/api/v1/workflows`);
      if (active !== undefined) {
        url.searchParams.set("active", String(active));
      }

      const response = await fetch(url.toString(), {
        headers: {
          "X-N8N-API-KEY": this.apiKey,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = (await response.json()) as { data: unknown[] };

      return {
        success: true,
        data: data.data,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Activate a workflow
   */
  private async activateWorkflow(params: Record<string, unknown>): Promise<OperationResult> {
    const { workflowId, active = true } = params;

    if (!this.apiKey) {
      return {
        success: false,
        error: "Not authenticated",
      };
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/v1/workflows/${workflowId}`, {
        method: "PATCH",
        headers: {
          "X-N8N-API-KEY": this.apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ active }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return {
        success: true,
        data: {
          workflowId,
          active,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}

/**
 * Create n8n integration from environment config
 */
export function createN8nIntegration(): N8nAdapter | null {
  const baseUrl = process.env["N8N_URL"];
  const apiKey = process.env["N8N_API_KEY"];

  if (!baseUrl || !apiKey) {
    return null;
  }

  const adapter = new N8nAdapter();

  adapter.connect({
    baseUrl,
    auth: {
      type: "token",
      credentials: "env:N8N_API_KEY",
    },
    options: {},
  }).catch(() => {
    // Connection failed, but adapter is created
  });

  return adapter;
}

/**
 * Trigger build event webhook
 */
export async function triggerBuildEvent(
  event: "build.started" | "build.completed" | "build.failed" | "escalation.created",
  data: Record<string, unknown>
): Promise<{ success: boolean; error?: string }> {
  const adapter = createN8nIntegration();

  if (!adapter) {
    return { success: false, error: "n8n not configured" };
  }

  const webhookIds: Record<string, string> = {
    "build.started": process.env["N8N_WEBHOOK_BUILD_STARTED"] || "build-started",
    "build.completed": process.env["N8N_WEBHOOK_BUILD_COMPLETED"] || "build-completed",
    "build.failed": process.env["N8N_WEBHOOK_BUILD_FAILED"] || "build-failed",
    "escalation.created": process.env["N8N_WEBHOOK_ESCALATION"] || "escalation",
  };

  const webhookId = webhookIds[event];

  if (!webhookId) {
    return { success: false, error: `Unknown event: ${event}` };
  }

  const result = await adapter.execute("triggerWebhook", {
    webhookId,
    event,
    data,
  });

  return {
    success: result.success,
    error: result.error,
  };
}

/**
 * Notification workflow template
 * Pre-configured workflow for Sophia notifications
 */
export const notificationWorkflowTemplate = {
  name: "Sophia Build Notifications",
  nodes: [
    {
      parameters: {
        httpMethod: "POST",
        path: "sophia-build",
        responseMode: "responseNode",
      },
      id: "webhook-node",
      name: "Build Webhook",
      type: "n8n-nodes-base.webhook",
      typeVersion: 1,
      position: [250, 300],
      webhooks: [
        {
          name: "default",
          httpMethod: "POST",
          responseMode: "responseNode",
          path: "sophia-build",
        },
      ],
    },
    {
      parameters: {
        conditions: {
          options: {
            caseSensitive: true,
            leftValue: "",
            typeValidation: "strict",
          },
          conditions: [
            {
              id: "condition-1",
              leftValue: "={{ $json.event }}",
              rightValue: "escalation.created",
              operator: {
                type: "string",
                operation: "equals",
              },
            },
          ],
          combinator: "and",
        },
      },
      id: "if-node",
      name: "Is Escalation?",
      type: "n8n-nodes-base.if",
      typeVersion: 2,
      position: [450, 300],
    },
    {
      parameters: {
        toRecipients: "={{ $env.SOPHIA_NOTIFICATION_EMAIL }}",
        subject: "🚨 Sophia Escalation: {{ $json.data.severity }}",
        text: "Escalation: {{ $json.data.reason }}",
        options: {},
      },
      id: "email-node",
      name: "Send Email",
      type: "n8n-nodes-base.emailSend",
      typeVersion: 2,
      position: [650, 200],
    },
    {
      parameters: {
        channel: "={{ $env.SOPHIA_SLACK_CHANNEL }}",
        text: "Build Event: {{ $json.event }}",
        options: {},
      },
      id: "slack-node",
      name: "Send Slack",
      type: "n8n-nodes-base.slack",
      typeVersion: 2,
      position: [650, 400],
    },
  ],
  connections: {
    "Build Webhook": {
      main: [[{ node: "Is Escalation?", type: "main", index: 0 }]],
    },
    "Is Escalation?": {
      main: [
        [{ node: "Send Email", type: "main", index: 0 }],
        [{ node: "Send Slack", type: "main", index: 0 }],
      ],
    },
  },
  settings: {
    executionOrder: "v1",
  },
  staticData: null,
  tags: ["sophia", "build", "notifications"],
};
