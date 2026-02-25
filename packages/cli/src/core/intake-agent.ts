import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import Handlebars from "handlebars";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATES_DIR = path.join(__dirname, "..", "templates", "intake");

export type AppType = "web-app" | "api" | "cli" | "mobile" | "full-stack";

export interface ConversationTurn {
  id: string;
  role: "system" | "user" | "assistant";
  content: string;
  timestamp: string;
  tokensUsed?: number;
}

export interface IntakeSession {
  id: string;
  appType: AppType;
  projectName: string;
  turns: ConversationTurn[];
  extractedArtifacts: Partial<RequirementsArtifact>;
  status: "active" | "locked" | "abandoned";
  createdAt: string;
  lastActivityAt: string;
}

export interface RequirementsArtifact {
  project: {
    name: string;
    description: string;
    type: AppType;
  };
  tech_stack: {
    framework?: string;
    language: string;
    database?: string;
    orm?: string;
    ui?: string;
    styling?: string;
    testing: string;
    e2e?: string;
  };
  requirements: {
    product: string[];
    technical: string[];
    testing: string[];
    architecture: string[];
  };
  personas: Array<{
    name: string;
    type: string;
    description: string;
    journeys: string[];
  }>;
  quality: {
    lighthouse_target?: number;
    accessibility?: string;
    design_system?: string;
  };
}

/**
 * Intake Agent
 * Manages conversational requirements gathering
 */
export class IntakeAgent {
  private sessions = new Map<string, IntakeSession>();
  private maxTurns = 50;
  private compressionThreshold = 10;

  /**
   * Start a new intake session
   */
  async startSession(projectName: string, appType: AppType): Promise<IntakeSession> {
    const sessionId = randomUUID();
    const template = this.loadTemplate(appType);
    
    const session: IntakeSession = {
      id: sessionId,
      appType,
      projectName,
      turns: [],
      extractedArtifacts: {},
      status: "active",
      createdAt: new Date().toISOString(),
      lastActivityAt: new Date().toISOString(),
    };

    // Add system prompt
    const systemPrompt = template({
      projectName,
      appType,
      currentDate: new Date().toISOString().split("T")[0],
    });

    session.turns.push({
      id: randomUUID(),
      role: "system",
      content: systemPrompt,
      timestamp: new Date().toISOString(),
    });

    // Add initial assistant greeting
    const greeting = this.generateGreeting(appType, projectName);
    session.turns.push({
      id: randomUUID(),
      role: "assistant",
      content: greeting,
      timestamp: new Date().toISOString(),
    });

    this.sessions.set(sessionId, session);
    return session;
  }

  /**
   * Process user message and get response
   */
  async processMessage(sessionId: string, userMessage: string): Promise<{
    response: string;
    session: IntakeSession;
    isComplete: boolean;
    canLock: boolean;
  }> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    if (session.status !== "active") {
      throw new Error(`Session is ${session.status}`);
    }

    // Add user message
    session.turns.push({
      id: randomUUID(),
      role: "user",
      content: userMessage,
      timestamp: new Date().toISOString(),
    });

    // Check for lock trigger
    if (this.detectLockTrigger(userMessage)) {
      const canLock = this.validateCompleteness(session);
      if (canLock) {
        return {
          response: "✅ Requirements are complete and locked! I'll now generate the project scaffolding.",
          session,
          isComplete: true,
          canLock: true,
        };
      }
    }

    // Compress conversation if needed
    if (session.turns.length > this.compressionThreshold) {
      await this.compressConversation(session);
    }

    // Generate assistant response using Claude
    const response = await this.generateResponse(session);

    session.turns.push({
      id: randomUUID(),
      role: "assistant",
      content: response,
      timestamp: new Date().toISOString(),
    });

    session.lastActivityAt = new Date().toISOString();

    // Extract artifacts incrementally
    this.extractArtifacts(session);

    const canLock = this.validateCompleteness(session);

    return {
      response,
      session,
      isComplete: false,
      canLock,
    };
  }

  /**
   * Load intake template for app type
   */
  private loadTemplate(appType: AppType): HandlebarsTemplateDelegate {
    const templateFile = `${appType}-intake.hbs`;
    const templatePath = path.join(TEMPLATES_DIR, templateFile);
    
    // Fallback to generic template if specific one doesn't exist
    const fallbackPath = path.join(TEMPLATES_DIR, "generic-intake.hbs");
    
    const templateSource = fs.existsSync(templatePath)
      ? fs.readFileSync(templatePath, "utf-8")
      : fs.readFileSync(fallbackPath, "utf-8");

    return Handlebars.compile(templateSource);
  }

  /**
   * Generate initial greeting
   */
  private generateGreeting(appType: AppType, projectName: string): string {
    const greetings: Record<AppType, string> = {
      "web-app": `Welcome! I'm here to help you define the requirements for **${projectName}** - your web application.\n\nI'll guide you through questions about:\n• Product features and functionality\n• Technical architecture and stack\n• User personas and journeys\n• Testing and quality requirements\n\nLet's start: What problem does this web app solve for users?`,
      
      api: `Welcome! Let's design the API for **${projectName}**.\n\nWe'll cover:\n• Endpoints and resources\n• Authentication and security\n• Rate limiting and performance\n• Documentation needs\n\nFirst question: What is the primary purpose of this API?`,
      
      cli: `Welcome! Let's plan your CLI tool **${projectName}**.\n\nWe'll discuss:\n• Commands and subcommands\n• Configuration options\n• Output formats\n• Installation and distribution\n\nTo start: What does this CLI tool do?`,
      
      mobile: `Welcome! Let's design your mobile app **${projectName}**.\n\nWe'll explore:\n• Platform (iOS/Android/both)\n• Core features and screens\n• Offline capabilities\n• Native integrations\n\nFirst: What platform(s) are you targeting and what's the main purpose?`,
      
      "full-stack": `Welcome! Let's architect your full-stack application **${projectName}**.\n\nWe'll define:\n• Frontend requirements\n• Backend API design\n• Database schema\n• Deployment strategy\n\nLet's begin: Describe the overall application and its main purpose.`,
    };

    return greetings[appType];
  }

  /**
   * Detect if user wants to lock requirements
   */
  private detectLockTrigger(message: string): boolean {
    const lockPhrases = [
      "lock this in",
      "looks good",
      "let's proceed",
      "ready to build",
      "finalize",
      "requirements are complete",
      "generate the project",
      "start building",
    ];
    
    const lowerMessage = message.toLowerCase();
    return lockPhrases.some((phrase) => lowerMessage.includes(phrase));
  }

  /**
   * Validate if requirements are complete enough to lock
   */
  private validateCompleteness(session: IntakeSession): boolean {
    const artifacts = session.extractedArtifacts;
    
    // Minimum requirements:
    // - Project name and description
    // - At least 3 product requirements
    // - At least 2 technical requirements
    // - Testing approach defined
    
    const hasProject = !!(artifacts.project?.name && artifacts.project?.description);
    const hasProductReqs = (artifacts.requirements?.product?.length || 0) >= 3;
    const hasTechnicalReqs = (artifacts.requirements?.technical?.length || 0) >= 2;
    const hasTesting = (artifacts.requirements?.testing?.length || 0) >= 1;

    return hasProject && hasProductReqs && hasTechnicalReqs && hasTesting;
  }

  /**
   * Extract artifacts from conversation
   */
  private extractArtifacts(session: IntakeSession): void {
    // Simple extraction based on conversation patterns
    // In production, this would use the LLM to parse and structure
    
    const allContent = session.turns
      .filter((t) => t.role === "user" || t.role === "assistant")
      .map((t) => t.content)
      .join("\n");

    // Extract project info
    if (!session.extractedArtifacts.project) {
      const nameMatch = allContent.match(/project\s+(?:name\s+)?is\s+["']?([^"'\n]+)["']?/i);
      if (nameMatch && nameMatch[1]) {
        session.extractedArtifacts.project = {
          name: nameMatch[1],
          description: "",
          type: session.appType,
        };
      }
    }

    // Extract requirements (simple pattern matching)
    if (!session.extractedArtifacts.requirements) {
      session.extractedArtifacts.requirements = {
        product: [],
        technical: [],
        testing: [],
        architecture: [],
      };
    }

    // Look for bullet points that might be requirements
    const bulletMatches = allContent.match(/^[\s]*[-•*][\s]+(.+)$/gm);
    if (bulletMatches) {
      bulletMatches.forEach((bullet) => {
        const content = bullet.replace(/^[\s]*[-•*][\s]+/, "").trim();
        
        // Categorize based on keywords
        if (content.match(/\b(user|feature|screen|page|button|form|login|auth)\b/i)) {
          if (!session.extractedArtifacts.requirements!.product.includes(content)) {
            session.extractedArtifacts.requirements!.product.push(content);
          }
        } else if (content.match(/\b(database|api|server|cache|performance|security)\b/i)) {
          if (!session.extractedArtifacts.requirements!.technical.includes(content)) {
            session.extractedArtifacts.requirements!.technical.push(content);
          }
        } else if (content.match(/\b(test|spec|coverage|cypress|jest|vitest)\b/i)) {
          if (!session.extractedArtifacts.requirements!.testing.includes(content)) {
            session.extractedArtifacts.requirements!.testing.push(content);
          }
        }
      });
    }
  }

  /**
   * Compress conversation to manage token usage
   */
  private async compressConversation(session: IntakeSession): Promise<void> {
    // Keep system prompt and last N turns, summarize the middle
    const systemTurn = session.turns.find((t) => t.role === "system");
    const recentTurns = session.turns.slice(-5);
    
    const middleTurns = session.turns.slice(1, -5);
    
    if (middleTurns.length > 5) {
      // Create summary of middle section
      const summary = await this.summarizeTurns(middleTurns);
      
      session.turns = [
        systemTurn!,
        {
          id: randomUUID(),
          role: "assistant",
          content: `[Previous conversation summarized: ${summary}]`,
          timestamp: new Date().toISOString(),
        },
        ...recentTurns,
      ];
    }
  }

  /**
   * Summarize conversation turns
   */
  private async summarizeTurns(turns: ConversationTurn[]): Promise<string> {
    const content = turns.map((t) => `${t.role}: ${t.content}`).join("\n");
    
    // In production, this would call the LLM to summarize
    // For now, return a simple summary
    return `Discussed ${turns.filter((t) => t.role === "user").length} user requirements and clarifications`;
  }

  /**
   * Generate assistant response using Claude
   */
  private async generateResponse(session: IntakeSession): Promise<string> {
    // Build prompt from conversation history
    const messages = session.turns.map((t) => ({
      role: t.role,
      content: t.content,
    }));

    try {
      // Spawn Claude Code for response generation
      const child = spawn("claude", ["--print", "--no-interactive"], {
        stdio: ["pipe", "pipe", "pipe"],
      });

      let stdout = "";
      let stderr = "";

      child.stdout?.on("data", (data) => {
        stdout += data.toString();
      });

      child.stderr?.on("data", (data) => {
        stderr += data.toString();
      });

      // Send conversation as input
      const input = JSON.stringify({ messages, appType: session.appType });
      child.stdin?.write(input);
      child.stdin?.end();

      return new Promise((resolve, reject) => {
        child.on("close", (code) => {
          if (code === 0) {
            resolve(stdout.trim() || "I understand. Please tell me more about your requirements.");
          } else {
            reject(new Error(stderr || "Failed to generate response"));
          }
        });

        // Timeout after 30 seconds
        setTimeout(() => {
          child.kill();
          resolve("I'm thinking... Could you provide more details about that?");
        }, 30000);
      });
    } catch {
      // Fallback response
      return "Thank you for that information. What else would you like to specify about the project?";
    }
  }

  /**
   * Lock session and generate requirements.yaml
   */
  async lockSession(sessionId: string): Promise<{
    success: boolean;
    requirementsPath?: string;
    error?: string;
  }> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return { success: false, error: "Session not found" };
    }

    if (!this.validateCompleteness(session)) {
      return { success: false, error: "Requirements are not complete enough to lock" };
    }

    session.status = "locked";

    // Generate requirements.yaml
    const yaml = this.generateRequirementsYaml(session);
    
    // Save to file
    const requirementsPath = path.join(process.cwd(), "requirements.yaml");
    fs.writeFileSync(requirementsPath, yaml);

    return {
      success: true,
      requirementsPath,
    };
  }

  /**
   * Generate requirements.yaml from session
   */
  private generateRequirementsYaml(session: IntakeSession): string {
    const artifacts = session.extractedArtifacts as RequirementsArtifact;
    
    const requirements = {
      project: {
        name: artifacts.project?.name || session.projectName,
        description: artifacts.project?.description || "Generated from intake session",
        type: session.appType,
      },
      tech_stack: artifacts.tech_stack || {
        language: "typescript",
        testing: "vitest",
      },
      requirements: artifacts.requirements || {
        product: [],
        technical: [],
        testing: [],
        architecture: [],
      },
      personas: artifacts.personas || [],
      quality: artifacts.quality || {},
    };

    // Convert to YAML
    return `# Generated by Sophia Intake Agent
# Session ID: ${session.id}
# Created: ${session.createdAt}
# Locked: ${new Date().toISOString()}

${JSON.stringify(requirements, null, 2)
  .replace(/"([^"]+)":/g, "$1:")
  .replace(/\[/g, "")
  .replace(/\]/g, "")
  .replace(/"/g, "")
  .replace(/,/g, "")}`;
  }

  /**
   * Get session by ID
   */
  getSession(sessionId: string): IntakeSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * List all active sessions
   */
  listActiveSessions(): IntakeSession[] {
    return Array.from(this.sessions.values()).filter((s) => s.status === "active");
  }

  /**
   * Abandon a session
   */
  abandonSession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.status = "abandoned";
      return true;
    }
    return false;
  }
}

// Singleton instance
export const intakeAgent = new IntakeAgent();
