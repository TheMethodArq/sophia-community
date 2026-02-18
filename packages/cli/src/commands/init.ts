import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import { select } from "@inquirer/prompts";
import path from "node:path";
import fs from "node:fs";
import { AGENT_SIGNATURES } from "@sophia-code/shared";
import type { ExperienceLevel, GovernanceLevel } from "@sophia-code/shared";
import { initDb } from "../core/database.js";
import { generateDefaultConfig, writeConfig, configExists } from "../core/config.js";
import { detectAgents, createAgentFiles, toAgentConfigs } from "../core/agent-detector.js";
import { detectProject } from "../core/project-detector.js";
import { copyDefaultContent, ensureSophiaDirs } from "../core/content-manager.js";
import { installGitHooks } from "../core/git-hooks.js";
import { seedMemory } from "../core/memory-seeds.js";
import { syncAgent, buildSophiaContext } from "../core/adapter-engine.js";


export const initCommand = new Command("init")
  .description("Initialize Sophia governance in this project")
  .option("-y, --yes", "Skip interactive prompts, use defaults")
  .option("--level <level>", "Experience level (beginner, intermediate, advanced)")
  .option("--governance <level>", "Governance level (community, startup, enterprise)")
  .option("--agents <names>", "Comma-separated agent names to create (claude-code,opencode,cursor,copilot)")
  .option("--no-git-hooks", "Skip git hook installation")
  .option("--no-sync", "Skip auto-sync after init")
  .action(async (options: {
    yes?: boolean;
    level?: string;
    governance?: string;
    agents?: string;
    gitHooks?: boolean;
    sync?: boolean;
  }) => {
    const projectRoot = process.cwd();

    if (configExists(projectRoot)) {
      console.log(chalk.yellow("Sophia is already initialized in this project."));
      console.log("  Run " + chalk.cyan("sophia sync") + " to update agent configs.");
      return;
    }

    // Detect project info
    const spinner = ora("Detecting project...").start();
    const profile = detectProject(projectRoot);
    let agents = detectAgents(projectRoot);
    const detectedParts = [profile.framework ?? profile.language];
    if (profile.orm) detectedParts.push(profile.orm);
    if (profile.testRunner) detectedParts.push(profile.testRunner);
    if (profile.uiFramework) detectedParts.push(profile.uiFramework);
    if (profile.styling) detectedParts.push(profile.styling);
    if (profile.stateManagement) detectedParts.push(profile.stateManagement);
    spinner.succeed(`Detected: ${detectedParts.join(" + ")}`);

    // Create agent config files if none detected
    if (agents.length === 0) {
      const agentSpinner = ora("Creating agent config files...").start();

      let agentNames: string[] | undefined;
      if (options.agents) {
        // Explicit list from --agents flag
        agentNames = options.agents.split(",").map((s) => s.trim());
      } else if (options.yes) {
        // Non-interactive: create all common agents
        agentNames = AGENT_SIGNATURES.map((s) => s.name);
      } else {
        // Interactive: ask which agents to create
        agentSpinner.stop();
        const agentChoices = AGENT_SIGNATURES.map((s) => ({
          value: s.name,
          name: `${s.displayName} (${s.configFiles[0]})`,
        }));
        // Use simple prompts — select one at a time
        console.log(chalk.cyan("\nNo agent config files found. Which agents will you use?"));
        console.log(chalk.dim("(sophia will create the config files for you)\n"));
        agentNames = [];
        for (const choice of agentChoices) {
          const answer = await select<"yes" | "no">({
            message: `Create ${choice.name}?`,
            choices: [
              { value: "yes", name: "Yes" },
              { value: "no", name: "No" },
            ],
          });
          if (answer === "yes") {
            agentNames.push(choice.value);
          }
        }
        if (agentNames.length === 0) {
          // Default to all if none selected
          agentNames = AGENT_SIGNATURES.map((s) => s.name);
        }
        agentSpinner.start("Creating agent config files...");
      }

      const created = createAgentFiles(projectRoot, agentNames);
      agents = [...agents, ...created];
      agentSpinner.succeed(
        `Created agent configs: ${created.map((a) => a.displayName).join(", ")}`,
      );
    } else {
      console.log(
        chalk.green("Detected agents: ") +
        agents.map((a) => a.displayName).join(", "),
      );
    }

    // Get project name
    let projectName = path.basename(projectRoot);
    const pkgPath = path.join(projectRoot, "package.json");
    if (fs.existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8")) as { name?: string };
        if (pkg.name) projectName = pkg.name;
      } catch {
        // use directory name
      }
    }

    // Resolve experience level
    let experienceLevel: ExperienceLevel = "beginner";
    let governanceLevel: GovernanceLevel = "community";

    if (options.level) {
      const valid = ["beginner", "intermediate", "advanced"] as const;
      if (valid.includes(options.level as ExperienceLevel)) {
        experienceLevel = options.level as ExperienceLevel;
      }
    }

    if (options.governance) {
      const valid = ["community", "startup", "enterprise"] as const;
      if (valid.includes(options.governance as GovernanceLevel)) {
        governanceLevel = options.governance as GovernanceLevel;
      }
    }

    // Interactive prompts only when no flags provided
    if (!options.yes && !options.level) {
      experienceLevel = await select<ExperienceLevel>({
        message: "Your experience level with enterprise development patterns?",
        choices: [
          { value: "beginner", name: "Beginner — Full explanations and teaching" },
          { value: "intermediate", name: "Intermediate — Concise guidance" },
          { value: "advanced", name: "Advanced — Minimal, just governance" },
        ],
      });
    }

    if (!options.yes && !options.governance) {
      governanceLevel = await select<GovernanceLevel>({
        message: "Governance level for this project?",
        choices: [
          { value: "community", name: "Community — Learning-focused, permissive" },
          { value: "startup", name: "Startup — Balanced governance" },
          { value: "enterprise", name: "Enterprise — Strict compliance" },
        ],
      });
    }

    // Create .sophia/ directory structure
    const setupSpinner = ora("Creating .sophia/ directory...").start();
    ensureSophiaDirs(projectRoot);
    setupSpinner.succeed("Created .sophia/ directory");

    // Generate config
    const configSpinner = ora("Generating configuration...").start();
    const config = generateDefaultConfig(
      projectName,
      profile,
      toAgentConfigs(agents),
      governanceLevel,
    );
    config.user.experience_level = experienceLevel;
    writeConfig(projectRoot, config);
    configSpinner.succeed("Configuration written");

    // Copy default content
    const contentSpinner = ora("Installing default policies and content...").start();
    copyDefaultContent(projectRoot);
    contentSpinner.succeed("Default policies and content installed");

    // Initialize database
    const dbSpinner = ora("Creating memory database...").start();
    initDb(projectRoot);
    dbSpinner.succeed("Memory database created");

    // Seed memory based on tech stack
    const seedSpinner = ora("Seeding memory...").start();
    const seedCount = seedMemory(projectRoot, profile);
    seedSpinner.succeed(`Memory seeded with ${seedCount} entries`);

    // Install git hooks
    if (options.gitHooks !== false) {
      const gitDir = path.join(projectRoot, ".git");
      if (fs.existsSync(gitDir)) {
        const hookSpinner = ora("Installing git hooks...").start();
        installGitHooks(projectRoot);
        hookSpinner.succeed("Git hooks installed");
      } else {
        console.log(chalk.dim("  No .git directory found, skipping hooks"));
      }
    }

    // Auto-sync: inject governance into agent config files
    if (options.sync !== false && agents.length > 0) {
      const syncSpinner = ora("Syncing governance into agent configs...").start();
      const context = buildSophiaContext(projectRoot);
      // Re-detect to pick up the newly created files
      const freshAgents = detectAgents(projectRoot);
      let synced = 0;
      for (const agent of freshAgents) {
        const result = syncAgent(projectRoot, agent, context);
        if (result.success) synced++;
      }
      syncSpinner.succeed(`Governance synced to ${synced} agent config${synced === 1 ? "" : "s"}`);
    }

    // Obsidian integration
    const obsSpinner = ora("Setting up Obsidian integration...").start();
    try {
      const vaultPath = process.env.OBSIDIAN_VAULT_PATH ||
        path.join(process.env.HOME || "~", "Documents", "Obsidian Vault");

      if (fs.existsSync(path.join(vaultPath, ".obsidian"))) {
        // Create evidence directory
        const evidenceDir = path.join(process.env.HOME || "~", ".auto-claude", "evidence");
        fs.mkdirSync(evidenceDir, { recursive: true });

        obsSpinner.succeed("Obsidian integration ready");
        console.log(chalk.dim(`  Vault: ${vaultPath}`));
      } else {
        obsSpinner.warn("Obsidian vault not found (set OBSIDIAN_VAULT_PATH to configure)");
      }
    } catch {
      obsSpinner.warn("Obsidian setup skipped");
    }

    console.log();
    console.log(chalk.green.bold("Sophia initialized!"));
    console.log();
    console.log("Next steps:");
    console.log(`  ${chalk.cyan("sophia status")}     — View project status`);
    console.log(`  ${chalk.cyan("sophia sync")}       — Re-sync governance after config changes`);
    console.log(`  ${chalk.cyan("sophia dashboard")}  — Open web dashboard`);
  });
