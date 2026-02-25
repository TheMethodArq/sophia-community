import { Command } from "commander";
import chalk from "chalk";
import fs from "node:fs";
import path from "node:path";
import YAML from "yaml";
import { createChangeRequest, listChangeRequests, approveChangeRequest, type ChangeRequest } from "../core/change-request-manager.js";

export const changeRequestCommand = new Command("change-request")
  .description("Manage change requests for locked requirements")
  .alias("cr")
  .option("-c, --create", "Create a new change request")
  .option("-l, --list", "List all change requests")
  .option("-a, --approve <id>", "Approve a change request")
  .option("-r, --reject <id>", "Reject a change request")
  .option("-t, --title <title>", "Change request title")
  .option("-d, --description <desc>", "Change request description")
  .option("--impact <level>", "Impact level: low, medium, high", "medium")
  .option("--requires-replan", "Whether this requires re-planning")
  .action(async (options) => {
    try {
      const projectPath = process.cwd();

      if (options.create) {
        await handleCreate(projectPath, options);
      } else if (options.list) {
        await handleList(projectPath);
      } else if (options.approve) {
        await handleApprove(projectPath, options.approve);
      } else if (options.reject) {
        await handleReject(projectPath, options.reject);
      } else {
        console.log(chalk.yellow("Use --create, --list, --approve, or --reject"));
      }
    } catch (error) {
      console.error(
        chalk.red("Change request failed:"),
        error instanceof Error ? error.message : error
      );
      process.exit(1);
    }
  });

async function handleCreate(
  projectPath: string,
  options: {
    title?: string;
    description?: string;
    impact?: string;
    requiresReplan?: boolean;
  }
): Promise<void> {
  console.log(chalk.bold.blue("📝 Creating Change Request...\n"));

  // Validate requirements exist
  const requirementsPath = path.join(projectPath, "requirements.yaml");
  if (!fs.existsSync(requirementsPath)) {
    console.error(chalk.red("Error: requirements.yaml not found"));
    console.log(chalk.yellow("Change requests require locked requirements."));
    process.exit(1);
  }

  // Get title if not provided
  let title = options.title;
  if (!title) {
    console.log(chalk.yellow("Please provide a title with --title"));
    process.exit(1);
  }

  // Get description if not provided
  let description = options.description;
  if (!description) {
    console.log(chalk.yellow("Please provide a description with --description"));
    process.exit(1);
  }

  // Load current requirements for context
  const requirements = YAML.parse(fs.readFileSync(requirementsPath, "utf-8"));

  // Calculate impact analysis
  const impact = analyzeImpact(description, requirements, options.impact || "medium");

  // Create change request
  const changeRequest = createChangeRequest(projectPath, {
    title,
    description,
    impactLevel: options.impact || "medium",
    requiresReplanning: options.requiresReplan || impact.requiresReplanning,
    affectedAreas: impact.affectedAreas,
    estimatedTokens: impact.estimatedTokens,
    requestedBy: "user",
  });

  console.log(chalk.green(`✓ Change request created: ${changeRequest.id}`));
  console.log(chalk.gray(`\nTitle: ${title}`));
  console.log(chalk.gray(`Impact: ${options.impact || "medium"}`));
  console.log(chalk.gray(`Requires Replanning: ${changeRequest.requiresReplanning ? "Yes" : "No"}`));
  
  if (impact.affectedAreas.length > 0) {
    console.log(chalk.gray(`\nAffected Areas:`));
    impact.affectedAreas.forEach((area) => console.log(chalk.gray(`  - ${area}`)));
  }

  console.log(chalk.yellow("\nUse --approve to approve this change request."));
}

async function handleList(projectPath: string): Promise<void> {
  console.log(chalk.bold.blue("📋 Change Requests\n"));

  const requests = listChangeRequests(projectPath);

  if (requests.length === 0) {
    console.log(chalk.yellow("No change requests found."));
    return;
  }

  // Group by status
  const grouped: Record<string, ChangeRequest[]> = {
    pending: [],
    approved: [],
    rejected: [],
    implemented: [],
  };
  
  for (const cr of requests) {
    const statusKey = cr.status as string;
    grouped[statusKey] = grouped[statusKey] ?? [];
    grouped[statusKey]!.push(cr);
  }

  // Display pending first
  if ((grouped["pending"]?.length ?? 0) > 0) {
    console.log(chalk.bold("Pending:\n"));
    grouped["pending"]!.forEach((cr: ChangeRequest) => displayChangeRequest(cr));
  }

  if ((grouped["approved"]?.length ?? 0) > 0) {
    console.log(chalk.bold("\nApproved:\n"));
    grouped["approved"]!.forEach((cr: ChangeRequest) => displayChangeRequest(cr));
  }

  if ((grouped["rejected"]?.length ?? 0) > 0) {
    console.log(chalk.bold("\nRejected:\n"));
    grouped["rejected"]!.forEach((cr: ChangeRequest) => displayChangeRequest(cr));
  }
}

async function handleApprove(projectPath: string, id: string): Promise<void> {
  console.log(chalk.bold.blue(`✓ Approving Change Request ${id.slice(0, 8)}...\n`));

  const result = approveChangeRequest(projectPath, id);

  if (result.success) {
    console.log(chalk.green("Change request approved!"));
    
    if (result.requiresReplanning) {
      console.log(chalk.yellow("\n⚠️  This change requires re-planning."));
      console.log(chalk.gray("Run 'sophia plan' to regenerate the implementation plan."));
    }
  } else {
    console.error(chalk.red(`Error: ${result.error}`));
    process.exit(1);
  }
}

async function handleReject(projectPath: string, id: string): Promise<void> {
  console.log(chalk.bold.blue(`✗ Rejecting Change Request ${id.slice(0, 8)}...\n`));

  // Implementation would update status to rejected
  console.log(chalk.yellow("Not yet implemented"));
}

function displayChangeRequest(cr: ChangeRequest): void {
  const getStatusColor = (status: ChangeRequest["status"]) => {
    switch (status) {
      case "pending": return chalk.yellow;
      case "approved": return chalk.green;
      case "rejected": return chalk.red;
      case "implemented": return chalk.gray;
      default: return chalk.white;
    }
  };

  console.log(`${getStatusColor(cr.status)(`[${cr.status.toUpperCase()}]`)} ${cr.title}`);
  console.log(chalk.gray(`  ID: ${cr.id.slice(0, 8)}...`));
  console.log(chalk.gray(`  Impact: ${cr.impactLevel} | Replan: ${cr.requiresReplanning ? "Yes" : "No"}`));
  
  if (cr.affectedAreas.length > 0) {
    console.log(chalk.gray(`  Areas: ${cr.affectedAreas.join(", ")}`));
  }
  
  console.log();
}

function analyzeImpact(
  description: string,
  requirements: Record<string, unknown>,
  impactLevel: string
): {
  requiresReplanning: boolean;
  affectedAreas: string[];
  estimatedTokens: number;
} {
  const affectedAreas: string[] = [];
  let requiresReplanning = impactLevel === "high";
  let estimatedTokens = 5000;

  // Simple keyword-based analysis
  const desc = description.toLowerCase();

  // Check for architecture changes
  if (
    desc.includes("architecture") ||
    desc.includes("database") ||
    desc.includes("api")
  ) {
    affectedAreas.push("architecture");
    requiresReplanning = true;
    estimatedTokens += 10000;
  }

  // Check for tech stack changes
  if (
    desc.includes("framework") ||
    desc.includes("library") ||
    desc.includes("dependency")
  ) {
    affectedAreas.push("tech_stack");
    requiresReplanning = true;
    estimatedTokens += 8000;
  }

  // Check for product changes
  if (
    desc.includes("feature") ||
    desc.includes("functionality") ||
    desc.includes("user")
  ) {
    affectedAreas.push("product");
    estimatedTokens += 5000;
  }

  // Check for testing changes
  if (desc.includes("test") || desc.includes("coverage")) {
    affectedAreas.push("testing");
    estimatedTokens += 3000;
  }

  return {
    requiresReplanning,
    affectedAreas: affectedAreas.length > 0 ? affectedAreas : ["general"],
    estimatedTokens,
  };
}
