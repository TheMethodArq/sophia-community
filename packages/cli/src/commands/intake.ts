import { Command } from "commander";
import chalk from "chalk";
import readline from "node:readline";
import { intakeAgent, type AppType } from "../core/intake-agent.js";

export const intakeCommand = new Command("intake")
  .description("Interactive requirements gathering via CLI")
  .option("-n, --name <name>", "Project name")
  .option("-t, --type <type>", "App type: web-app, api, cli, mobile, full-stack", "web-app")
  .option("--resume <sessionId>", "Resume an existing intake session")
  .action(async (options) => {
    try {
      const appType = options.type as AppType;
      
      // Validate app type
      const validTypes: AppType[] = ["web-app", "api", "cli", "mobile", "full-stack"];
      if (!validTypes.includes(appType)) {
        console.error(chalk.red(`Error: Invalid app type "${appType}"`));
        console.log(chalk.yellow(`Valid types: ${validTypes.join(", ")}`));
        process.exit(1);
      }

      // Get project name
      let projectName = options.name;
      if (!projectName) {
        projectName = await askQuestion("Project name: ");
      }

      if (!projectName?.trim()) {
        console.error(chalk.red("Error: Project name is required"));
        process.exit(1);
      }

      console.log(chalk.bold.blue("\n🎯 Starting Requirements Intake\n"));
      console.log(chalk.gray(`App Type: ${appType}`));
      console.log(chalk.gray(`Project: ${projectName}\n`));

      // Start intake session
      const session = await intakeAgent.startSession(projectName, appType);

      // Display initial greeting
      const initialTurn = session.turns[session.turns.length - 1];
      if (initialTurn) {
        console.log(chalk.cyan("🤖 Sophia:"));
        console.log(initialTurn.content);
        console.log();
      }

      // Create readline interface
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      // Conversation loop
      let isActive = true;
      
      while (isActive) {
        const userInput = await askQuestionWithRL(rl, chalk.yellow("You: "));

        if (!userInput.trim()) {
          continue;
        }

        // Check for exit commands
        if (["exit", "quit", "bye"].includes(userInput.toLowerCase())) {
          console.log(chalk.gray("\n👋 Intake session ended."));
          intakeAgent.abandonSession(session.id);
          isActive = false;
          break;
        }

        // Process message
        const result = await intakeAgent.processMessage(session.id, userInput);

        // Display response
        console.log(chalk.cyan("\n🤖 Sophia:"));
        console.log(result.response);
        console.log();

        // Check if ready to lock
        if (result.canLock && !result.isComplete) {
          console.log(chalk.green("✅ Requirements look complete!"));
          console.log(chalk.gray("Say 'lock this in' or 'looks good' to finalize.\n"));
        }

        // Handle lock
        if (result.isComplete) {
          const lockResult = await intakeAgent.lockSession(session.id);
          
          if (lockResult.success) {
            console.log(chalk.green("\n✅ Requirements locked successfully!"));
            console.log(chalk.gray(`Saved to: ${lockResult.requirementsPath}`));
            console.log(chalk.bold("\nNext steps:"));
            console.log("  1. Review requirements.yaml");
            console.log("  2. Run 'sophia scaffold' to create the project");
            console.log("  3. Run 'sophia plan' to generate implementation plan\n");
            isActive = false;
          } else {
            console.log(chalk.red(`\n❌ Failed to lock: ${lockResult.error}`));
            console.log(chalk.gray("Continue the conversation to complete requirements.\n"));
          }
        }
      }

      rl.close();
    } catch (error) {
      console.error(
        chalk.red("Intake failed:"),
        error instanceof Error ? error.message : error
      );
      process.exit(1);
    }
  });

/**
 * Ask a question using readline
 */
function askQuestion(prompt: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

/**
 * Ask a question with existing readline interface
 */
function askQuestionWithRL(rl: readline.Interface, prompt: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      resolve(answer);
    });
  });
}

/**
 * Resume an existing intake session
 */
export const intakeResumeCommand = new Command("intake-resume")
  .description("Resume a previous intake session")
  .argument("<sessionId>", "Session ID to resume")
  .action(async (sessionId) => {
    const session = intakeAgent.getSession(sessionId);
    
    if (!session) {
      console.error(chalk.red(`Session ${sessionId} not found`));
      process.exit(1);
    }

    if (session.status !== "active") {
      console.error(chalk.red(`Session is ${session.status}`));
      process.exit(1);
    }

    console.log(chalk.bold.blue("\n🎯 Resuming Intake Session\n"));
    console.log(chalk.gray(`Project: ${session.projectName}`));
    console.log(chalk.gray(`Type: ${session.appType}\n`));

    // Display recent conversation
    const recentTurns = session.turns.slice(-5);
    console.log(chalk.gray("Recent conversation:\n"));
    
    for (const turn of recentTurns) {
      if (turn.role === "user") {
        console.log(chalk.yellow("You: ") + turn.content);
      } else if (turn.role === "assistant") {
        console.log(chalk.cyan("🤖 Sophia: ") + turn.content.slice(0, 100) + "...");
      }
    }
    
    console.log(chalk.gray("\n[Session resumed - continue chatting]\n"));
  });

/**
 * List active intake sessions
 */
export const intakeListCommand = new Command("intake-list")
  .description("List active intake sessions")
  .action(async () => {
    const sessions = intakeAgent.listActiveSessions();
    
    if (sessions.length === 0) {
      console.log(chalk.yellow("No active intake sessions."));
      console.log(chalk.gray("Start one with: sophia intake"));
      return;
    }

    console.log(chalk.bold.blue("\n📋 Active Intake Sessions\n"));
    
    for (const session of sessions) {
      console.log(chalk.bold(session.projectName));
      console.log(chalk.gray(`  ID: ${session.id.slice(0, 8)}...`));
      console.log(chalk.gray(`  Type: ${session.appType}`));
      console.log(chalk.gray(`  Turns: ${session.turns.length}`));
      console.log(chalk.gray(`  Started: ${new Date(session.createdAt).toLocaleString()}`));
      console.log();
    }
  });
