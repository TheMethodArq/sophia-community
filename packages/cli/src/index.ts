#!/usr/bin/env node

// Respect NO_COLOR convention (https://no-color.org/)
if (process.env["NO_COLOR"] !== undefined) {
  // chalk automatically respects NO_COLOR, but ensure consistency
  process.env["FORCE_COLOR"] = "0";
}

import { Command } from "commander";
import { SOPHIA_VERSION } from "@sophia-code/shared";
import { initCommand } from "./commands/init.js";
import { statusCommand } from "./commands/status.js";
import { syncCommand } from "./commands/sync.js";
import { policyCommand } from "./commands/policy.js";
import { explainCommand } from "./commands/explain.js";
import { memoryCommand } from "./commands/memory.js";
import { sessionCommand } from "./commands/session.js";
import { claimCommand } from "./commands/claim.js";
import { bulletinCommand } from "./commands/bulletin.js";
import { verifyCommand } from "./commands/verify.js";
import { cleanCommand } from "./commands/clean.js";
import { dashboardCommand } from "./commands/dashboard.js";
import { watchCommand } from "./commands/watch.js";
import { updateCommand } from "./commands/update.js";
import { buildCommand, buildStatusCommand } from "./commands/build.js";
import { changeRequestCommand } from "./commands/change-request.js";
import { intakeCommand, intakeListCommand, intakeResumeCommand } from "./commands/intake.js";
import { githubCommand } from "./commands/github.js";
import { enforceVersion } from "./core/version-manager.js";

const program = new Command();

program
  .name("sophia")
  .description("CLI-first governance tool for AI-assisted development")
  .version(SOPHIA_VERSION, "-V, --version", "output the version number")
  .hook("preAction", async (thisCommand) => {
    // Skip version enforcement for certain commands
    const skipCommands = ["update", "init", "--version", "-V"];
    const invokedCommand = thisCommand.args[0];

    if (invokedCommand && skipCommands.includes(invokedCommand)) {
      return;
    }

    // Skip if SOPHIA_SKIP_VERSION_CHECK is set
    if (process.env["SOPHIA_SKIP_VERSION_CHECK"]) {
      return;
    }

    // Enforce version policy (may exit if locked)
    await enforceVersion();
  });

program.addCommand(initCommand);
program.addCommand(statusCommand);
program.addCommand(syncCommand);
program.addCommand(policyCommand);
program.addCommand(explainCommand);
program.addCommand(memoryCommand);
program.addCommand(sessionCommand);
program.addCommand(claimCommand);
program.addCommand(bulletinCommand);
program.addCommand(verifyCommand);
program.addCommand(cleanCommand);
program.addCommand(dashboardCommand);
program.addCommand(watchCommand);
program.addCommand(updateCommand);
program.addCommand(buildCommand);
program.addCommand(buildStatusCommand);
program.addCommand(changeRequestCommand);
program.addCommand(intakeCommand);
program.addCommand(intakeListCommand);
program.addCommand(intakeResumeCommand);
program.addCommand(githubCommand);

program.parse();
