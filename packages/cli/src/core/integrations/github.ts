import type {
  IntegrationAdapter,
  IntegrationConfig,
  IntegrationType,
  ConnectionResult,
  HealthStatus,
  OperationResult,
} from "./integration-adapter.js";

/**
 * GitHub Integration Adapter
 * Enables Sophia Code to interact with GitHub repositories for:
 * - Creating issues from escalations
 * - Posting PR comments with governance reports
 * - Creating commit status checks
 * - Syncing change requests with GitHub issues
 */
export class GitHubAdapter implements IntegrationAdapter {
  name = "github";
  type: IntegrationType = "cicd";

  private config?: IntegrationConfig;
  private baseUrl?: string;
  private token?: string;
  private owner?: string;
  private repo?: string;

  /**
   * Connect to GitHub API
   */
  async connect(config: IntegrationConfig): Promise<ConnectionResult> {
    this.config = config;
    this.baseUrl = config.baseUrl.replace(/\/$/, "");

    // Get token from environment
    if (config.auth.type === "token") {
      const envVar = config.auth.credentials.replace("env:", "");
      this.token = process.env[envVar];
    }

    if (!this.token) {
      return {
        success: false,
        error: "GitHub token not found in environment",
      };
    }

    // Parse owner/repo from options
    if (config.options["owner"] && config.options["repo"]) {
      this.owner = config.options["owner"] as string;
      this.repo = config.options["repo"] as string;
    } else if (config.options["repository"]) {
      const parts = (config.options["repository"] as string).split("/");
      if (parts.length === 2) {
        this.owner = parts[0];
        this.repo = parts[1];
      }
    }

    // Test connection
    const health = await this.healthCheck();

    return {
      success: health.connected,
      error: health.error,
      metadata: {
        owner: this.owner,
        repo: this.repo,
        latency: health.latency,
      },
    };
  }

  /**
   * Disconnect from GitHub
   */
  async disconnect(): Promise<void> {
    this.config = undefined;
    this.baseUrl = undefined;
    this.token = undefined;
    this.owner = undefined;
    this.repo = undefined;
  }

  /**
   * Check GitHub API health
   */
  async healthCheck(): Promise<HealthStatus> {
    if (!this.baseUrl || !this.token) {
      return {
        connected: false,
        latency: -1,
        error: "Not configured",
      };
    }

    const startTime = Date.now();

    try {
      const response = await fetch(`${this.baseUrl}/user`, {
        headers: {
          Authorization: `Bearer ${this.token}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
      });

      const latency = Date.now() - startTime;

      if (response.ok) {
        const data = (await response.json()) as { login: string };
        return {
          connected: true,
          latency,
          version: data.login,
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
   * Execute GitHub operations
   */
  async execute(
    operation: string,
    params: Record<string, unknown>
  ): Promise<OperationResult> {
    switch (operation) {
      case "createIssue":
        return this.createIssue(params);
      case "createPullRequestComment":
        return this.createPullRequestComment(params);
      case "createCommitStatus":
        return this.createCommitStatus(params);
      case "updateIssue":
        return this.updateIssue(params);
      case "createLabel":
        return this.createLabel(params);
      case "addLabels":
        return this.addLabels(params);
      case "createGovernanceReport":
        return this.createGovernanceReport(params);
      default:
        return {
          success: false,
          error: `Unknown operation: ${operation}`,
        };
    }
  }

  /**
   * Create a GitHub issue
   */
  private async createIssue(params: Record<string, unknown>): Promise<OperationResult> {
    const { title, body, labels = [], assignees = [] } = params;

    if (!this.owner || !this.repo) {
      return {
        success: false,
        error: "Repository not configured",
      };
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/repos/${this.owner}/${this.repo}/issues`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.token}`,
            Accept: "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title,
            body,
            labels,
            assignees,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = (await response.json()) as {
        number: number;
        html_url: string;
        title: string;
      };

      return {
        success: true,
        data: {
          issueNumber: data.number,
          url: data.html_url,
          title: data.title,
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
   * Update a GitHub issue
   */
  private async updateIssue(params: Record<string, unknown>): Promise<OperationResult> {
    const { issueNumber, state, body, title } = params;

    if (!this.owner || !this.repo) {
      return {
        success: false,
        error: "Repository not configured",
      };
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/repos/${this.owner}/${this.repo}/issues/${issueNumber}`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${this.token}`,
            Accept: "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            state,
            body,
            title,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = (await response.json()) as { number: number; state: string };

      return {
        success: true,
        data: {
          issueNumber: data.number,
          state: data.state,
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
   * Create a pull request comment
   */
  private async createPullRequestComment(
    params: Record<string, unknown>
  ): Promise<OperationResult> {
    const { prNumber, body, commitId, path, position } = params;

    if (!this.owner || !this.repo) {
      return {
        success: false,
        error: "Repository not configured",
      };
    }

    try {
      const requestBody: Record<string, unknown> = { body };

      // If commitId, path, and position are provided, create a review comment
      if (commitId && path && position !== undefined) {
        requestBody["commit_id"] = commitId;
        requestBody["path"] = path;
        requestBody["position"] = position;

        const response = await fetch(
          `${this.baseUrl}/repos/${this.owner}/${this.repo}/pulls/${prNumber}/comments`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${this.token}`,
              Accept: "application/vnd.github+json",
              "X-GitHub-Api-Version": "2022-11-28",
              "Content-Type": "application/json",
            },
            body: JSON.stringify(requestBody),
          }
        );

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = (await response.json()) as { id: number; html_url: string };

        return {
          success: true,
          data: {
            commentId: data.id,
            url: data.html_url,
          },
        };
      } else {
        // Create a general PR comment
        const response = await fetch(
          `${this.baseUrl}/repos/${this.owner}/${this.repo}/issues/${prNumber}/comments`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${this.token}`,
              Accept: "application/vnd.github+json",
              "X-GitHub-Api-Version": "2022-11-28",
              "Content-Type": "application/json",
            },
            body: JSON.stringify(requestBody),
          }
        );

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = (await response.json()) as { id: number; html_url: string };

        return {
          success: true,
          data: {
            commentId: data.id,
            url: data.html_url,
          },
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Create a commit status check
   */
  private async createCommitStatus(params: Record<string, unknown>): Promise<OperationResult> {
    const { sha, state, targetUrl, description, context = "sophia/governance" } = params;

    if (!this.owner || !this.repo) {
      return {
        success: false,
        error: "Repository not configured",
      };
    }

    // Validate state
    const validStates = ["error", "failure", "pending", "success"];
    if (!validStates.includes(state as string)) {
      return {
        success: false,
        error: `Invalid state: ${state}. Must be one of: ${validStates.join(", ")}`,
      };
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/repos/${this.owner}/${this.repo}/statuses/${sha}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.token}`,
            Accept: "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            state,
            target_url: targetUrl,
            description,
            context,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = (await response.json()) as {
        id: number;
        state: string;
        description: string;
      };

      return {
        success: true,
        data: {
          statusId: data.id,
          state: data.state,
          description: data.description,
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
   * Create a GitHub label
   */
  private async createLabel(params: Record<string, unknown>): Promise<OperationResult> {
    const { name, color, description } = params;

    if (!this.owner || !this.repo) {
      return {
        success: false,
        error: "Repository not configured",
      };
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/repos/${this.owner}/${this.repo}/labels`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.token}`,
            Accept: "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name,
            color: (color as string | undefined)?.replace("#", ""),
            description,
          }),
        }
      );

      if (!response.ok) {
        // Label might already exist
        if (response.status === 422) {
          return {
            success: true,
            data: { name, exists: true },
          };
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = (await response.json()) as { id: number; name: string };

      return {
        success: true,
        data: {
          labelId: data.id,
          name: data.name,
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
   * Add labels to an issue
   */
  private async addLabels(params: Record<string, unknown>): Promise<OperationResult> {
    const { issueNumber, labels } = params;

    if (!this.owner || !this.repo) {
      return {
        success: false,
        error: "Repository not configured",
      };
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/repos/${this.owner}/${this.repo}/issues/${issueNumber}/labels`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.token}`,
            Accept: "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            labels: Array.isArray(labels) ? labels : [labels],
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = (await response.json()) as Array<{ id: number; name: string }>;

      return {
        success: true,
        data: {
          labels: data.map((l) => l.name),
          count: data.length,
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
   * Create a comprehensive governance report as a PR comment
   */
  private async createGovernanceReport(
    params: Record<string, unknown>
  ): Promise<OperationResult> {
    const { prNumber, report } = params;

    const reportData = report as {
      summary: string;
      status: "pass" | "fail" | "warning";
      checks: Array<{
        name: string;
        status: "pass" | "fail" | "warning";
        message: string;
      }>;
      metrics?: {
        tokenUsage: number;
        filesChanged: number;
        testCoverage: number;
      };
    };

    const statusEmoji = {
      pass: "✅",
      fail: "❌",
      warning: "⚠️",
    };

    let body = `## 🤖 Sophia Code Governance Report\n\n`;
    body += `**Status:** ${statusEmoji[reportData.status]} ${reportData.status.toUpperCase()}\n\n`;
    body += `### Summary\n${reportData.summary}\n\n`;
    body += `### Checks\n\n`;
    body += "| Check | Status | Message |\n";
    body += "|-------|--------|----------|(\n";

    for (const check of reportData.checks) {
      body += `| ${check.name} | ${statusEmoji[check.status]} | ${check.message} |\n`;
    }

    if (reportData.metrics) {
      body += `\n### Metrics\n`;
      body += `- **Token Usage:** ${reportData.metrics.tokenUsage.toLocaleString()}\n`;
      body += `- **Files Changed:** ${reportData.metrics.filesChanged}\n`;
      body += `- **Test Coverage:** ${reportData.metrics.testCoverage}%\n`;
    }

    body += `\n---\n`;
    body += `*Report generated by Sophia Code* | [Dashboard](http://localhost:9473)`;

    return this.createPullRequestComment({
      prNumber,
      body,
    });
  }
}

/**
 * Create GitHub integration from environment config
 */
export function createGitHubIntegration(
  owner?: string,
  repo?: string
): GitHubAdapter | null {
  const token = process.env["GITHUB_TOKEN"];

  if (!token) {
    return null;
  }

  const adapter = new GitHubAdapter();

  // Try to get owner/repo from git config if not provided
  let finalOwner = owner;
  let finalRepo = repo;

  if (!finalOwner || !finalRepo) {
    const remoteUrl = process.env["GITHUB_REPOSITORY"];
    if (remoteUrl) {
      const parts = remoteUrl.split("/");
      if (parts.length === 2) {
        finalOwner = parts[0];
        finalRepo = parts[1];
      }
    }
  }

  // Initialize connection
  adapter
    .connect({
      baseUrl: "https://api.github.com",
      auth: {
        type: "token",
        credentials: "env:GITHUB_TOKEN",
      },
      options: {
        owner: finalOwner,
        repo: finalRepo,
      },
    })
    .catch(() => {
      // Connection failed, but adapter is created
    });

  return adapter;
}

/**
 * Create a GitHub issue from a Sophia escalation
 */
export async function createEscalationIssue(
  escalation: {
    id: string;
    title: string;
    description: string;
    severity: "low" | "medium" | "high" | "critical";
    agent: string;
    context: string;
  },
  owner?: string,
  repo?: string
): Promise<{ success: boolean; issueNumber?: number; url?: string; error?: string }> {
  const adapter = createGitHubIntegration(owner, repo);

  if (!adapter) {
    return { success: false, error: "GitHub not configured" };
  }

  const severityLabels: Record<string, string> = {
    low: "escalation:low",
    medium: "escalation:medium",
    high: "escalation:high",
    critical: "escalation:critical",
  };

  // Create labels if they don't exist
  await adapter.execute("createLabel", {
    name: "sophia-escalation",
    color: "FF6B6B",
    description: "Escalations from Sophia Code governance system",
  });

  await adapter.execute("createLabel", {
    name: severityLabels[escalation.severity],
    color:
      {
        low: "7BD3EA",
        medium: "FFD93D",
        high: "FF9B50",
        critical: "FF6B6B",
      }[escalation.severity],
    description: `Escalation severity: ${escalation.severity}`,
  });

  const body = `## Escalation Details

**ID:** ${escalation.id}
**Agent:** ${escalation.agent}
**Severity:** ${escalation.severity.toUpperCase()}
**Timestamp:** ${new Date().toISOString()}

### Description
${escalation.description}

### Context
${escalation.context}

---
*This issue was automatically created by Sophia Code governance system*`;

  const result = await adapter.execute("createIssue", {
    title: `[Sophia Escalation] ${escalation.title}`,
    body,
    labels: ["sophia-escalation", severityLabels[escalation.severity]],
  });

  if (result.success && result.data) {
    const data = result.data as { issueNumber: number; url: string };
    return {
      success: true,
      issueNumber: data.issueNumber,
      url: data.url,
    };
  }

  return {
    success: false,
    error: result.error,
  };
}

/**
 * Post a governance report as a PR comment
 */
export async function postGovernanceReport(
  prNumber: number,
  report: {
    summary: string;
    status: "pass" | "fail" | "warning";
    checks: Array<{
      name: string;
      status: "pass" | "fail" | "warning";
      message: string;
    }>;
    metrics?: {
      tokenUsage: number;
      filesChanged: number;
      testCoverage: number;
    };
  },
  owner?: string,
  repo?: string
): Promise<{ success: boolean; error?: string }> {
  const adapter = createGitHubIntegration(owner, repo);

  if (!adapter) {
    return { success: false, error: "GitHub not configured" };
  }

  const result = await adapter.execute("createGovernanceReport", {
    prNumber,
    report,
  });

  return {
    success: result.success,
    error: result.error,
  };
}

/**
 * Create a commit status for build validation
 */
export async function createBuildStatus(
  sha: string,
  buildStatus: "success" | "failure" | "pending" | "error",
  details: {
    description?: string;
    url?: string;
    metrics?: {
      tokenUsage: number;
      testCoverage: number;
    };
  },
  owner?: string,
  repo?: string
): Promise<{ success: boolean; error?: string }> {
  const adapter = createGitHubIntegration(owner, repo);

  if (!adapter) {
    return { success: false, error: "GitHub not configured" };
  }

  const description =
    details.description ||
    `Build ${buildStatus}${details.metrics ? ` | Coverage: ${details.metrics.testCoverage}%` : ""}`;

  const result = await adapter.execute("createCommitStatus", {
    sha,
    state: buildStatus,
    targetUrl: details.url,
    description,
    context: "sophia/build-validation",
  });

  return {
    success: result.success,
    error: result.error,
  };
}
