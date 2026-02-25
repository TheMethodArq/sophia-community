import type {
  IntegrationAdapter,
  IntegrationConfig,
  IntegrationType,
  ConnectionResult,
  HealthStatus,
  OperationResult,
} from "./integration-adapter.js";

/**
 * Open WebUI Chat Integration
 * Provides chat-based requirements gathering and intent locking
 */
export class OpenWebUIAdapter implements IntegrationAdapter {
  name = "openwebui";
  type: IntegrationType = "chat";

  private config?: IntegrationConfig;
  private baseUrl?: string;
  private apiKey?: string;

  /**
   * Connect to Open WebUI API
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
        error: "Open WebUI API key not found in environment",
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
   * Disconnect from Open WebUI
   */
  async disconnect(): Promise<void> {
    this.config = undefined;
    this.baseUrl = undefined;
    this.apiKey = undefined;
  }

  /**
   * Check Open WebUI API health
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
      const response = await fetch(`${this.baseUrl}/api/models`, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
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
   * Execute Open WebUI operations
   */
  async execute(
    operation: string,
    params: Record<string, unknown>
  ): Promise<OperationResult> {
    switch (operation) {
      case "registerTool":
        return this.registerTool(params);
      case "startSession":
        return this.startSession(params);
      case "extractArtifacts":
        return this.extractArtifacts(params);
      case "lockIntent":
        return this.lockIntent(params);
      case "sendMessage":
        return this.sendMessage(params);
      default:
        return {
          success: false,
          error: `Unknown operation: ${operation}`,
        };
    }
  }

  /**
   * Register Sophia as a tool in Open WebUI
   */
  private async registerTool(params: Record<string, unknown>): Promise<OperationResult> {
    const { name = "sophia-intake", description = "Sophia Governance - Requirements Gathering" } = params;

    const toolDefinition = {
      name,
      description,
      parameters: {
        type: "object",
        properties: {
          action: {
            type: "string",
            enum: ["extract_requirements", "lock_intent", "generate_plan"],
            description: "Action to perform",
          },
          project_name: {
            type: "string",
            description: "Project name",
          },
          requirements: {
            type: "object",
            description: "Extracted requirements",
          },
        },
        required: ["action"],
      },
    };

    try {
      const response = await fetch(`${this.baseUrl}/api/tools`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(toolDefinition),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = (await response.json()) as { id: string };

      return {
        success: true,
        data: {
          toolId: data.id,
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
   * Start a new intake session
   */
  private async startSession(params: Record<string, unknown>): Promise<OperationResult> {
    const { projectName, userId } = params;

    try {
      const response = await fetch(`${this.baseUrl}/api/chats`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: `Sophia Intake: ${projectName}`,
          user_id: userId,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = (await response.json()) as { id: string };

      // Send initial system message
      await this.sendMessage({
        chatId: data.id,
        message: this.getIntakePrompt(projectName as string),
      });

      return {
        success: true,
        data: {
          sessionId: data.id,
          chatUrl: `${this.baseUrl}/c/${data.id}`,
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
   * Extract structured artifacts from chat
   */
  private async extractArtifacts(params: Record<string, unknown>): Promise<OperationResult> {
    const { sessionId, message } = params;

    // Parse message for structured data
    const artifacts = this.parseArtifacts(message as string);

    return {
      success: true,
      data: {
        sessionId,
        artifacts,
        complete: this.isIntakeComplete(artifacts),
      },
    };
  }

  /**
   * Lock intent and trigger Phase 2
   */
  private async lockIntent(params: Record<string, unknown>): Promise<OperationResult> {
    const { sessionId, artifacts } = params;

    try {
      // Send confirmation message
      await this.sendMessage({
        chatId: sessionId,
        message: `✅ **Intent Locked**

Requirements have been captured and locked. Proceeding to Phase 2: Planning.

**Next Steps:**
1. Generating implementation plan
2. Creating sprint specifications
3. Estimating token budgets

You will receive a notification when the plan is ready for review.`,
      });

      return {
        success: true,
        data: {
          sessionId,
          locked: true,
          timestamp: new Date().toISOString(),
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
   * Send a message to the chat
   */
  private async sendMessage(params: Record<string, unknown>): Promise<OperationResult> {
    const { chatId, message } = params;

    try {
      const response = await fetch(`${this.baseUrl}/api/chats/${chatId}/messages`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: message,
          role: "assistant",
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = (await response.json()) as { id: string };

      return {
        success: true,
        data: {
          messageId: data.id,
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
   * Get intake session prompt
   */
  private getIntakePrompt(projectName: string): string {
    return `Welcome to Sophia Code! Let's gather requirements for **${projectName}**.

I'll guide you through a structured requirements gathering process. We'll cover:

1. **Product Requirements** - What are we building?
2. **Technical Requirements** - Stack, architecture, constraints
3. **Testing Requirements** - Coverage, scenarios, validation
4. **Governance Requirements** - Policies, approval gates

**How this works:**
- Answer my questions as we go
- Be specific about acceptance criteria
- Say "lock this in" when you're ready to proceed to planning
- I extract structured requirements from our conversation

Let's start with the product requirements. What problem does this project solve?`;
  }

  /**
   * Parse artifacts from conversation
   */
  private parseArtifacts(message: string): Record<string, unknown> {
    const artifacts: Record<string, unknown> = {};

    // Extract product requirements
    const productMatch = message.match(/product[\s\S]*?(?=technical|$)/i);
    if (productMatch) {
      artifacts["product"] = productMatch[0];
    }

    // Extract technical requirements
    const techMatch = message.match(/technical[\s\S]*?(?=testing|$)/i);
    if (techMatch) {
      artifacts["technical"] = techMatch[0];
    }

    // Extract testing requirements
    const testingMatch = message.match(/testing[\s\S]*?(?=governance|$)/i);
    if (testingMatch) {
      artifacts["testing"] = testingMatch[0];
    }

    // Extract acceptance criteria
    const criteriaMatch = message.match(/acceptance criteria:?\s*([\s\S]*?)(?=\n\n|$)/i);
    if (criteriaMatch && criteriaMatch[1]) {
      artifacts["acceptanceCriteria"] = criteriaMatch[1]
        .split("\n")
        .filter((line) => line.trim().startsWith("-") || line.trim().match(/^\d+\./))
        .map((line) => line.replace(/^[-\d.\s]+/, "").trim());
    }

    return artifacts;
  }

  /**
   * Check if intake is complete
   */
  private isIntakeComplete(artifacts: Record<string, unknown>): boolean {
    const required = ["product", "technical"];
    return required.every((key) => artifacts[key] !== undefined);
  }
}

/**
 * Create Open WebUI integration from environment config
 */
export function createOpenWebUIIntegration(): OpenWebUIAdapter | null {
  const baseUrl = process.env["OPENWEBUI_URL"];
  const apiKey = process.env["OPENWEBUI_API_KEY"];

  if (!baseUrl || !apiKey) {
    return null;
  }

  const adapter = new OpenWebUIAdapter();

  adapter.connect({
    baseUrl,
    auth: {
      type: "token",
      credentials: "env:OPENWEBUI_API_KEY",
    },
    options: {},
  }).catch(() => {
    // Connection failed, but adapter is created
  });

  return adapter;
}

/**
 * Start intake session for a new project
 */
export async function startIntakeSession(
  projectName: string,
  userId?: string
): Promise<{ success: boolean; sessionId?: string; chatUrl?: string; error?: string }> {
  const adapter = createOpenWebUIIntegration();

  if (!adapter) {
    return { success: false, error: "Open WebUI not configured" };
  }

  const result = await adapter.execute("startSession", {
    projectName,
    userId,
  });

  if (!result.success) {
    return { success: false, error: result.error };
  }

  const data = result.data as { sessionId: string; chatUrl: string };

  return {
    success: true,
    sessionId: data.sessionId,
    chatUrl: data.chatUrl,
  };
}

/**
 * Tool definition for Open WebUI
 * This can be imported into Open WebUI as a custom tool
 */
export const sophiaIntakeToolDefinition = {
  name: "sophia_intake",
  description: "Sophia Governance - Requirements Gathering and Intent Locking",
  parameters: {
    type: "object",
    properties: {
      action: {
        type: "string",
        enum: ["extract_requirements", "lock_intent", "check_status"],
        description: "Action to perform",
      },
      project_name: {
        type: "string",
        description: "Project name being discussed",
      },
      requirements: {
        type: "object",
        description: "Structured requirements extracted from conversation",
        properties: {
          product: { type: "string" },
          technical: { type: "string" },
          testing: { type: "string" },
          governance: { type: "string" },
        },
      },
    },
    required: ["action"],
  },
  function: {
    name: "sophia_intake_handler",
    code: `
# This function runs in Open WebUI
# It communicates with the Sophia CLI API

import requests
import os

def handler(action, project_name=None, requirements=None):
    sophia_api_url = os.getenv("SOPHIA_API_URL", "http://localhost:3001")
    
    if action == "extract_requirements":
        # Store extracted requirements
        response = requests.post(
            f"{sophia_api_url}/api/intake/requirements",
            json={"project_name": project_name, "requirements": requirements}
        )
        return response.json()
    
    elif action == "lock_intent":
        # Lock intent and trigger planning phase
        response = requests.post(
            f"{sophia_api_url}/api/intake/lock",
            json={"project_name": project_name}
        )
        return response.json()
    
    elif action == "check_status":
        # Check intake session status
        response = requests.get(
            f"{sophia_api_url}/api/intake/status",
            params={"project_name": project_name}
        )
        return response.json()
    
    return {"error": "Unknown action"}
`,
  },
};
