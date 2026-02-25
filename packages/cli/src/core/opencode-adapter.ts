/**
 * OpenCode Agent Adapter
 * Adapts OpenCode CLI for use with Sophia's agent interface
 */

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
  CheckpointDecision,
} from "@sophia-code/shared";

export class OpenCodeAdapter implements AgentAdapter {
  name = "opencode";
  version = "1.0.0";
  supportedAgents = ["opencode"];

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

    // Write context bundle to file for OpenCode to read
    const contextPath = path.join(context.workingDirectory, ".opencode-context.json");
    fs.writeFileSync(
      contextPath,
      JSON.stringify(
        {
          buildId: context.buildId,
          taskId: context.taskId,
          projectPath: context.projectPath,
          constraints: context.constraints,
          policies: context.policies,
          previousResults: context.previousResults,
          sessionInstructions: context.sessionInstructions,
        },
        null,
        2
      )
    );
  }

  /**
   * Execute a task using OpenCode
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

      // Spawn OpenCode process
      const result = await this.spawnOpenCode(taskPrompt, context);

      // Harvest results
      const agentResult = await this.harvestResults(result, context);

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
      const contextPath = path.join(this.context.workingDirectory, ".opencode-context.json");
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
   * Spawn OpenCode CLI process
   */
  private spawnOpenCode(
    prompt: string,
    context: AgentContext
  ): Promise<{
    output: string;
    exitCode: number;
    tokensUsed: TokenUsage;
  }> {
    return new Promise((resolve, reject) => {
      const timeout = context.constraints.timeout * 1000;

      // OpenCode command - assumes opencode is in PATH
      const opencodeCommand = "opencode";

      // Build the command arguments
      const args = [
        "--non-interactive",
        "--context",
        path.join(context.workingDirectory, ".opencode-context.json"),
        prompt,
      ];

      const child = spawn(opencodeCommand, args, {
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

        // Estimate token usage
        const tokensUsed = this.estimateTokenUsage(prompt, stdout);

        if (code === 0) {
          resolve({
            output: stdout,
            exitCode: code,
            tokensUsed,
          });
        } else {
          reject(new Error(`OpenCode exited with code ${code}: ${stderr || stdout}`));
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
   * Harvest results from OpenCode output
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
      const codeBlock = match[1];
      const matchIndex = match.index;

      if (!codeBlock || typeof matchIndex !== "number") continue;

      const precedingText = result.output.substring(Math.max(0, matchIndex - 500), matchIndex);
      const pathMatch = precedingText.match(
        /(?:file|path|create|modify)["':]?\s*["']?([^\s"']+\.(ts|tsx|js|jsx|json|md))/i
      );

      if (pathMatch && pathMatch[1]) {
        const filePath = pathMatch[1];
        const changeType = precedingText.includes("create") ? "created" : "modified";

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
    const inputTokens = Math.ceil(input.length / 4);
    const outputTokens = Math.ceil(output.length / 4);
    const total = inputTokens + outputTokens;

    // Cost estimation (similar to Sonnet for now)
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
 * Register OpenCode adapter in agent factory
 */
export function registerOpenCodeAdapter(): void {
  // This would be called during initialization to register the adapter
  // The actual registration happens in agent-adapter.ts factory
}
