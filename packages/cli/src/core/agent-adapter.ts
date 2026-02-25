import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import type {
  AgentAdapter,
  AgentContext,
  AgentResult,
  FileChange,
  FileClaim,
  TokenUsage,
  TaskResult,
  CheckpointDecision,
} from "@sophia-code/shared";
import { recordTokenUsage } from "./token-tracker.js";
import { OpenCodeAdapter } from "./opencode-adapter.js";
import { postBulletin } from "./bulletin.js";

/**
 * Claude Code adapter implementation
 * Spawns Claude Code CLI as a subprocess to execute tasks
 */
export class ClaudeCodeAdapter implements AgentAdapter {
  name = "claude-code";
  version = "1.0.0";
  supportedAgents = ["claude-code"];

  private context?: AgentContext;
  private currentProcess?: ReturnType<typeof spawn>;
  private filesClaimed: FileClaim[] = [];

  /**
   * Initialize the adapter with context
   */
  async initialize(context: AgentContext): Promise<void> {
    this.context = context;
    
    // Create working directory if it doesn't exist
    if (!fs.existsSync(context.workingDirectory)) {
      fs.mkdirSync(context.workingDirectory, { recursive: true });
    }

    // Write context bundle to file for Claude Code to read
    const contextPath = path.join(context.workingDirectory, ".sophia-context.json");
    fs.writeFileSync(contextPath, JSON.stringify({
      buildId: context.buildId,
      taskId: context.taskId,
      projectPath: context.projectPath,
      constraints: context.constraints,
      policies: context.policies,
      previousResults: context.previousResults,
      sessionInstructions: context.sessionInstructions,
    }, null, 2));
  }

  /**
   * Execute a task using Claude Code
   */
  async execute(task: string, context: AgentContext): Promise<AgentResult> {
    if (!this.context) {
      await this.initialize(context);
    }

    const taskId = context.taskId;
    const buildId = context.buildId;

    // Claim files before execution
    this.claimFiles(context.claims);

    try {
      // Prepare the task prompt
      const taskPrompt = this.prepareTaskPrompt(task, context);
      
      // Spawn Claude Code process
      const result = await this.spawnClaudeCode(taskPrompt, context);
      
      // Harvest results
      const agentResult = await this.harvestResults(result, context);
      
      // Record token usage
      if (agentResult.tokensUsed.total > 0) {
        recordTokenUsage(
          buildId,
          taskId,
          "sonnet", // Default to sonnet for builder agent
          agentResult.tokensUsed.input,
          agentResult.tokensUsed.output
        );
      }

      return agentResult;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      return {
        success: false,
        output: "",
        error: errorMessage,
        tokensUsed: { input: 0, output: 0, total: 0, cost: 0 },
        filesChanged: [],
        decisionsLogged: [],
        warnings: [errorMessage],
      };
    } finally {
      // Release file claims
      this.releaseClaims();
    }
  }

  /**
   * Cleanup after execution
   */
  async cleanup(): Promise<void> {
    // Kill any running process
    if (this.currentProcess) {
      this.currentProcess.kill();
      this.currentProcess = undefined;
    }

    // Release any remaining claims
    this.releaseClaims();

    // Cleanup context file
    if (this.context) {
      const contextPath = path.join(this.context.workingDirectory, ".sophia-context.json");
      if (fs.existsSync(contextPath)) {
        fs.unlinkSync(contextPath);
      }
    }

    this.context = undefined;
  }

  /**
   * Prepare task prompt with context
   */
  private prepareTaskPrompt(task: string, context: AgentContext): string {
    const lines = [
      "# Task",
      task,
      "",
      "# Context",
      `- Build ID: ${context.buildId}`,
      `- Task ID: ${context.taskId}`,
      `- Project: ${context.projectPath}`,
      "",
    ];

    if (context.sessionInstructions) {
      lines.push("# Instructions", context.sessionInstructions, "");
    }

    if (context.previousResults && context.previousResults.length > 0) {
      lines.push("# Previous Results");
      for (const result of context.previousResults.slice(-3)) {
        const status = result.status === "success" ? "✓" : "✗";
        const output = result.output?.substring(0, 100) || "";
        lines.push(`- ${status} ${output}...`);
      }
      lines.push("");
    }

    lines.push(
      "# Constraints",
      `- Max tokens: ${context.constraints.maxTokens}`,
      `- Timeout: ${context.constraints.timeout}s`,
      "",
      "Begin task execution."
    );

    return lines.join("\n");
  }

  /**
   * Spawn Claude Code CLI process
   */
  private spawnClaudeCode(prompt: string, context: AgentContext): Promise<{
    output: string;
    exitCode: number;
    tokensUsed: TokenUsage;
  }> {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      const timeout = context.constraints.timeout * 1000;

      // Check if claude CLI is available
      const claudeCommand = process.platform === "win32" ? "claude" : "claude";
      
      // Build the command arguments
      const args = [
        "--print",
        "--no-interactive",
        "--context", path.join(context.workingDirectory, ".sophia-context.json"),
        prompt,
      ];

      const child = spawn(claudeCommand, args, {
        cwd: context.projectPath,
        env: { ...process.env, ...context.environment },
        stdio: ["pipe", "pipe", "pipe"],
      });

      this.currentProcess = child;

      let stdout = "";
      let stderr = "";

      child.stdout?.on("data", (data) => {
        stdout += data.toString();
      });

      child.stderr?.on("data", (data) => {
        stderr += data.toString();
      });

      // Set timeout
      const timeoutId = setTimeout(() => {
        child.kill();
        reject(new Error(`Task timeout after ${timeout}ms`));
      }, timeout);

      child.on("close", (code) => {
        clearTimeout(timeoutId);
        this.currentProcess = undefined;

        // Estimate token usage (Claude Code doesn't expose this directly)
        const tokensUsed = this.estimateTokenUsage(prompt, stdout);

        if (code === 0) {
          resolve({
            output: stdout,
            exitCode: code,
            tokensUsed,
          });
        } else {
          reject(new Error(`Claude Code exited with code ${code}: ${stderr || stdout}`));
        }
      });

      child.on("error", (error) => {
        clearTimeout(timeoutId);
        this.currentProcess = undefined;
        reject(error);
      });
    });
  }

  /**
   * Harvest results from Claude Code output
   */
  private async harvestResults(
    result: { output: string; exitCode: number; tokensUsed: TokenUsage },
    context: AgentContext
  ): Promise<AgentResult> {
    const filesChanged: FileChange[] = [];
    const decisions: CheckpointDecision[] = [];
    const warnings: string[] = [];

    // Parse output for file changes
    const fileChangeRegex = /```\w*\n([\s\S]*?)\n```/g;
    let match;
    while ((match = fileChangeRegex.exec(result.output)) !== null) {
      // Look for file path indicators in the output
      const codeBlock = match[1];
      const matchIndex = match.index;
      
      if (!codeBlock || typeof matchIndex !== 'number') continue;
      
      const precedingText = result.output.substring(Math.max(0, matchIndex - 500), matchIndex);
      const pathMatch = precedingText.match(/(?:file|path|create|modify)["':]?\s*["']?([^\s"']+\.(ts|tsx|js|jsx|json|md))/i);
      
      if (pathMatch && pathMatch[1]) {
        const filePath = pathMatch[1];
        const changeType = precedingText.includes("create") ? "created" : "modified";
        
        // Count lines in code block
        const lines = codeBlock.split("\n");
        const linesAdded = lines.length;
        
        filesChanged.push({
          path: filePath,
          changeType,
          diff: codeBlock,
          linesAdded,
          linesRemoved: 0,
        });
      }
    }

    // Parse for decisions
    const decisionRegex = /decision["']?\s*:?\s*["']?([^\n]+)/gi;
    while ((match = decisionRegex.exec(result.output)) !== null) {
      if (match[1]) {
        decisions.push({
          id: randomUUID(),
          taskId: context.taskId,
          decision: match[1].trim(),
          rationale: "Harvested from agent output",
          madeAt: new Date().toISOString(),
        });
      }
    }

    // Check for warnings
    if (result.output.toLowerCase().includes("warning")) {
      const warningRegex = /warning["']?\s*:?\s*["']?([^\n]+)/gi;
      while ((match = warningRegex.exec(result.output)) !== null) {
        if (match[1]) {
          warnings.push(match[1].trim());
        }
      }
    }

    return {
      success: result.exitCode === 0,
      output: result.output,
      tokensUsed: result.tokensUsed,
      filesChanged,
      decisionsLogged: decisions,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }

  /**
   * Estimate token usage from input/output
   */
  private estimateTokenUsage(input: string, output: string): TokenUsage {
    // Rough estimation: ~4 characters per token
    const inputTokens = Math.ceil(input.length / 4);
    const outputTokens = Math.ceil(output.length / 4);
    const total = inputTokens + outputTokens;
    
    // Cost estimation for Sonnet
    const cost = (inputTokens / 1000) * 0.003 + (outputTokens / 1000) * 0.015;

    return {
      input: inputTokens,
      output: outputTokens,
      total,
      cost: Math.round(cost * 10000) / 10000,
    };
  }

  /**
   * Claim files for exclusive access
   */
  private claimFiles(claims: FileClaim[]): void {
    this.filesClaimed = [...claims];
  }

  /**
   * Release all file claims
   */
  private releaseClaims(): void {
    this.filesClaimed = [];
  }
}

/**
 * Factory function to create the appropriate agent adapter
 */
export function createAgentAdapter(agentType: string): AgentAdapter {
  switch (agentType) {
    case "claude-code":
      return new ClaudeCodeAdapter();
    case "opencode":
      return new OpenCodeAdapter();
    default:
      throw new Error(`Unknown agent type: ${agentType}`);
  }
}

/**
 * Context bundle preparation
 */
export function prepareContextBundle(
  buildId: string,
  taskId: string,
  projectPath: string,
  taskSpec: string,
  options: {
    maxTokens?: number;
    timeout?: number;
    allowedPaths?: string[];
    blockedPaths?: string[];
  } = {}
): AgentContext {
  return {
    buildId,
    taskId,
    projectPath,
    workingDirectory: path.join(projectPath, ".sophia", "work", taskId),
    environment: {
      NODE_ENV: "development",
      SOPHIA_BUILD_ID: buildId,
      SOPHIA_TASK_ID: taskId,
    },
    claims: [],
    policies: [],
    constraints: {
      maxTokens: options.maxTokens || 8000,
      timeout: options.timeout || 300,
      allowedPaths: options.allowedPaths || [projectPath],
      blockedPaths: options.blockedPaths || [".git", "node_modules", ".sophia"],
    },
  };
}

/**
 * Agent lifecycle management
 */
export class AgentLifecycleManager {
  private activeAgents = new Map<string, AgentAdapter>();

  /**
   * Spawn a new agent
   */
  async spawnAgent(
    agentType: string,
    buildId: string,
    taskId: string,
    context: AgentContext
  ): Promise<AgentAdapter> {
    const agentKey = `${buildId}:${taskId}`;
    
    if (this.activeAgents.has(agentKey)) {
      throw new Error(`Agent already active for ${agentKey}`);
    }

    const adapter = createAgentAdapter(agentType);
    await adapter.initialize(context);
    
    this.activeAgents.set(agentKey, adapter);
    
    return adapter;
  }

  /**
   * Terminate an agent
   */
  async terminateAgent(buildId: string, taskId: string): Promise<void> {
    const agentKey = `${buildId}:${taskId}`;
    const agent = this.activeAgents.get(agentKey);
    
    if (agent) {
      await agent.cleanup();
      this.activeAgents.delete(agentKey);
    }
  }

  /**
   * Get active agent
   */
  getAgent(buildId: string, taskId: string): AgentAdapter | undefined {
    return this.activeAgents.get(`${buildId}:${taskId}`);
  }

  /**
   * List all active agents
   */
  listActiveAgents(): Array<{ buildId: string; taskId: string; agentType: string }> {
    const results: Array<{ buildId: string; taskId: string; agentType: string }> = [];
    
    for (const [key, agent] of this.activeAgents) {
      const parts = key.split(":");
      if (parts.length === 2 && parts[0] && parts[1]) {
        results.push({ 
          buildId: parts[0], 
          taskId: parts[1], 
          agentType: agent.name 
        });
      }
    }
    
    return results;
  }

  /**
   * Terminate all agents
   */
  async terminateAll(): Promise<void> {
    for (const [, agent] of this.activeAgents) {
      await agent.cleanup();
    }
    this.activeAgents.clear();
  }
}

// Singleton instance
export const agentLifecycle = new AgentLifecycleManager();
