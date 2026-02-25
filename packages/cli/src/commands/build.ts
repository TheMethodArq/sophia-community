import { Command } from "commander";
import chalk from "chalk";
import fs from "node:fs";
import path from "node:path";
import { 
  createBuild, 
  getBuild, 
  updateBuildStatus,
  updateBuildProgress,
  listBuilds,
  getLatestBuild,
  resumeBuild,
  saveBuildCheckpoint,
  checkBuildBudget
} from "../core/build-manager.js";
import { 
  createActionRequest, 
  createEscalation, 
  formatEscalation,
  logInformOnly,
  approveAction 
} from "../core/approval-router.js";
import { 
  recordTokenUsage,
  routeModel,
  createBudgetReport 
} from "../core/token-tracker.js";
import type { BuildConfig, BuildState, BuildStatus, ActionRequest } from "@sophia-code/shared";

export const buildCommand = new Command("build")
  .description("Execute a build plan autonomously")
  .option("-p, --plan <path>", "Path to the implementation plan YAML")
  .option("--resume", "Resume from the last checkpoint")
  .option("--dry-run", "Simulate build without making changes")
  .option("--auto-approve", "Auto-approve all actions (use with caution)")
  .option("--max-tokens <count>", "Maximum token budget for this build", "100000")
  .action(async (options) => {
    try {
      const projectPath = process.cwd();
      
      if (options.resume) {
        await handleResume(projectPath);
      } else {
        await handleNewBuild(projectPath, options);
      }
    } catch (error) {
      console.error(chalk.red("Build failed:"), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

async function handleNewBuild(projectPath: string, options: {
  plan?: string;
  dryRun?: boolean;
  autoApprove?: boolean;
  maxTokens?: string;
}): Promise<void> {
  // Validate plan file
  const planPath = options.plan || path.join(projectPath, "docs", "plans", "IMPLEMENTATION_PLAN.md");
  
  if (!fs.existsSync(planPath)) {
    console.error(chalk.red("Error: Plan file not found:"), planPath);
    console.log(chalk.yellow("Run 'sophia plan' first to create an implementation plan."));
    process.exit(1);
  }

  console.log(chalk.bold.blue("🚀 Starting new build..."));
  console.log(chalk.gray(`Plan: ${planPath}`));
  
  const config: BuildConfig = {
    projectPath,
    planPath,
    options: {
      dryRun: options.dryRun,
      autoApprove: options.autoApprove,
      maxTokenBudget: parseInt(options.maxTokens || "100000", 10),
    },
  };

  const build = createBuild(config);
  console.log(chalk.green(`✓ Build created: ${build.buildId}`));

  await executeBuild(build, config);
}

async function handleResume(projectPath: string): Promise<void> {
  console.log(chalk.bold.blue("🔄 Resuming build..."));
  
  const build = getLatestBuild(projectPath);
  
  if (!build) {
    console.error(chalk.red("Error: No build found for this project."));
    console.log(chalk.yellow("Run 'sophia build' first to start a new build."));
    process.exit(1);
  }

  if (build.status === "completed") {
    console.log(chalk.green("✓ Build already completed."));
    return;
  }

  const resumedBuild = resumeBuild(build.buildId);
  if (!resumedBuild) {
    console.error(chalk.red("Error: Failed to resume build."));
    process.exit(1);
  }

  console.log(chalk.green(`✓ Build resumed: ${resumedBuild.buildId}`));
  console.log(chalk.gray(`Continuing from sprint ${resumedBuild.currentSprint}, task ${resumedBuild.currentTask}`));

  const config: BuildConfig = {
    projectPath,
    planPath: build.planPath || path.join(projectPath, "docs", "plans", "IMPLEMENTATION_PLAN.md"),
    options: {},
  };

  await executeBuild(resumedBuild, config);
}

async function executeBuild(build: BuildState, config: BuildConfig): Promise<void> {
  updateBuildStatus(build.buildId, "running");
  
  const maxTokens = config.options.maxTokenBudget || 100000;
  
  console.log(chalk.bold("\n📋 Build Configuration:"));
  console.log(`  Project: ${config.projectPath}`);
  console.log(`  Plan: ${config.planPath}`);
  console.log(`  Token Budget: ${maxTokens.toLocaleString()} tokens`);
  console.log(`  Dry Run: ${config.options.dryRun ? "Yes" : "No"}`);
  console.log(`  Auto-Approve: ${config.options.autoApprove ? "Yes" : "No"}`);

  // Mock execution loop - in real implementation, this would:
  // 1. Parse the plan
  // 2. Execute tasks sequentially
  // 3. Handle approvals
  // 4. Track progress
  // 5. Create checkpoints
  
  console.log(chalk.bold("\n🔄 Executing build tasks...\n"));

  // Simulate task execution
  for (let sprint = build.currentSprint; sprint < 2; sprint++) {
    console.log(chalk.bold.blue(`\n📦 Sprint ${sprint + 1}`));
    
    for (let task = build.currentTask; task < 3; task++) {
      console.log(chalk.gray(`  Task ${task + 1}: Implementation...`));
      
      // Check budget before each task
      const budgetCheck = checkBuildBudget(build.buildId, maxTokens);
      if (!budgetCheck.canProceed) {
        console.error(chalk.red(`\n❌ ${budgetCheck.message}`));
        updateBuildStatus(build.buildId, "paused", budgetCheck.message);
        return;
      }
      
      if (budgetCheck.message) {
        console.log(chalk.yellow(`⚠️  ${budgetCheck.message}`));
      }

      // Update progress
      updateBuildProgress(build.buildId, sprint, task);
      
      // Simulate work (in real implementation, this would call agent adapter)
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Record simulated token usage
      recordTokenUsage(build.buildId, `${sprint}-${task}`, "sonnet", 1000, 500);
      
      console.log(chalk.green(`  ✓ Task ${task + 1} completed`));
      
      // Create checkpoint after each task
      saveBuildCheckpoint(build.buildId, [], [], []);
    }
    
    build.currentTask = 0; // Reset task counter for next sprint
  }

  // Final budget report
  const budgetReport = createBudgetReport(build.buildId, maxTokens);
  
  console.log(chalk.bold("\n💰 Token Usage Report:"));
  console.log(`  Total Tokens: ${budgetReport.usage.total.toLocaleString()}`);
  console.log(`  Estimated Cost: $${budgetReport.usage.cost.toFixed(4)}`);
  console.log(`  Budget Remaining: ${budgetReport.budget.remaining.toLocaleString()} tokens`);

  updateBuildStatus(build.buildId, "completed");
  console.log(chalk.bold.green("\n✅ Build completed successfully!"));
}

export const buildStatusCommand = new Command("build-status")
  .description("Show status of current or recent builds")
  .option("-l, --last", "Show details of the last build")
  .option("-a, --all", "Show all builds")
  .action(async (options) => {
    const projectPath = process.cwd();
    
    if (options.last) {
      const build = getLatestBuild(projectPath);
      if (!build) {
        console.log(chalk.yellow("No builds found for this project."));
        return;
      }
      displayBuildDetails(build);
    } else if (options.all) {
      const builds = listBuilds(projectPath);
      if (builds.length === 0) {
        console.log(chalk.yellow("No builds found for this project."));
        return;
      }
      
      console.log(chalk.bold("\n📊 Build History:\n"));
      for (const build of builds) {
        const statusColor = getStatusColor(build.status);
        console.log(`  ${statusColor(build.status.padEnd(10))} | ${build.buildId.substring(0, 8)} | ${build.startedAt}`);
      }
    } else {
      const build = getLatestBuild(projectPath);
      if (!build) {
        console.log(chalk.yellow("No builds found for this project."));
        return;
      }
      displayBuildDetails(build);
    }
  });

function displayBuildDetails(build: BuildState): void {
  const statusColor = getStatusColor(build.status);
  
  console.log(chalk.bold("\n📋 Build Details:\n"));
  console.log(`  Build ID:    ${build.buildId}`);
  console.log(`  Status:      ${statusColor(build.status)}`);
  console.log(`  Sprint:      ${build.currentSprint + 1}`);
  console.log(`  Task:        ${build.currentTask + 1}`);
  console.log(`  Started:     ${build.startedAt}`);
  if (build.completedAt) {
    console.log(`  Completed:   ${build.completedAt}`);
  }
  console.log(`  Token Usage: ${build.tokenUsage.total.toLocaleString()} tokens ($${build.tokenUsage.cost.toFixed(4)})`);
  
  if (build.error) {
    console.log(chalk.red(`\n  Error: ${build.error}`));
  }
}

function getStatusColor(status: BuildStatus): (text: string) => string {
  switch (status) {
    case "running":
      return chalk.yellow;
    case "completed":
      return chalk.green;
    case "failed":
      return chalk.red;
    case "paused":
      return chalk.blue;
    default:
      return chalk.gray;
  }
}