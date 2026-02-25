import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  GitHubAdapter,
  createGitHubIntegration,
  createEscalationIssue,
  postGovernanceReport,
  createBuildStatus,
} from "../integrations/github.js";
import type { IntegrationConfig } from "../integrations/integration-adapter.js";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("GitHubAdapter", () => {
  let adapter: GitHubAdapter;
  const mockConfig: IntegrationConfig = {
    baseUrl: "https://api.github.com",
    auth: {
      type: "token",
      credentials: "env:GITHUB_TOKEN",
    },
    options: {
      owner: "test-owner",
      repo: "test-repo",
    },
  };

  beforeEach(() => {
    adapter = new GitHubAdapter();
    mockFetch.mockClear();
    process.env["GITHUB_TOKEN"] = "test-token-12345";
  });

  describe("connect", () => {
    it("should connect successfully with valid token", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ login: "testuser" }),
      });

      const result = await adapter.connect(mockConfig);

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
      expect(result.metadata).toHaveProperty("owner", "test-owner");
      expect(result.metadata).toHaveProperty("repo", "test-repo");
    });

    it("should fail when token is not configured", async () => {
      delete process.env["GITHUB_TOKEN"];
      const result = await adapter.connect(mockConfig);

      expect(result.success).toBe(false);
      expect(result.error).toContain("token not found");
    });

    it("should parse repository from options", async () => {
      const configWithRepo = {
        ...mockConfig,
        options: {
          repository: "another-owner/another-repo",
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ login: "testuser" }),
      });

      const result = await adapter.connect(configWithRepo);

      expect(result.success).toBe(true);
      expect(result.metadata).toHaveProperty("owner", "another-owner");
      expect(result.metadata).toHaveProperty("repo", "another-repo");
    });
  });

  describe("healthCheck", () => {
    it("should return connected status when API is reachable", async () => {
      await adapter.connect(mockConfig);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ login: "testuser" }),
      });

      const health = await adapter.healthCheck();

      expect(health.connected).toBe(true);
      expect(health.version).toBe("testuser");
      expect(health.latency).toBeGreaterThanOrEqual(0);
      expect(health.error).toBeUndefined();
    });

    it("should return disconnected status when API returns error", async () => {
      await adapter.connect(mockConfig);

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: "Unauthorized",
      });

      const health = await adapter.healthCheck();

      expect(health.connected).toBe(false);
      expect(health.error).toContain("401");
    });

    it("should return not configured when not connected", async () => {
      const health = await adapter.healthCheck();

      expect(health.connected).toBe(false);
      expect(health.error).toBe("Not configured");
    });
  });

  describe("createIssue", () => {
    it("should create an issue successfully", async () => {
      await adapter.connect(mockConfig);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: () =>
          Promise.resolve({
            number: 42,
            title: "Test Issue",
            html_url: "https://github.com/test-owner/test-repo/issues/42",
          }),
      });

      const result = await adapter.execute("createIssue", {
        title: "Test Issue",
        body: "Test description",
        labels: ["bug", "sophia"],
      });

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty("issueNumber", 42);
      expect(result.data).toHaveProperty("url");
    });

    it("should fail when repository is not configured", async () => {
      await adapter.connect({
        ...mockConfig,
        options: {},
      });

      const result = await adapter.execute("createIssue", {
        title: "Test Issue",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Repository not configured");
    });

    it("should handle API errors gracefully", async () => {
      await adapter.connect(mockConfig);

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 422,
        statusText: "Unprocessable Entity",
      });

      const result = await adapter.execute("createIssue", {
        title: "Test Issue",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("422");
    });
  });

  describe("createPullRequestComment", () => {
    it("should create a general PR comment", async () => {
      await adapter.connect(mockConfig);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: () =>
          Promise.resolve({
            id: 12345,
            html_url: "https://github.com/test-owner/test-repo/pull/1#issuecomment-12345",
          }),
      });

      const result = await adapter.execute("createPullRequestComment", {
        prNumber: 1,
        body: "Test comment",
      });

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty("commentId", 12345);
    });

    it("should create a review comment on specific file", async () => {
      await adapter.connect(mockConfig);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: () =>
          Promise.resolve({
            id: 12346,
            html_url: "https://github.com/test-owner/test-repo/pull/1/files#r12346",
          }),
      });

      const result = await adapter.execute("createPullRequestComment", {
        prNumber: 1,
        body: "Review comment",
        commitId: "abc123",
        path: "src/index.ts",
        position: 5,
      });

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty("commentId", 12346);
    });
  });

  describe("createCommitStatus", () => {
    it("should create a success status", async () => {
      await adapter.connect(mockConfig);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: () =>
          Promise.resolve({
            id: 1,
            state: "success",
            description: "Build passed",
          }),
      });

      const result = await adapter.execute("createCommitStatus", {
        sha: "abc123def456",
        state: "success",
        description: "Build passed",
        targetUrl: "https://example.com/build/123",
      });

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty("state", "success");
    });

    it("should reject invalid state values", async () => {
      await adapter.connect(mockConfig);

      const result = await adapter.execute("createCommitStatus", {
        sha: "abc123",
        state: "invalid",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid state");
    });

    it.each([
      ["error", "error"],
      ["failure", "failure"],
      ["pending", "pending"],
      ["success", "success"],
    ])("should accept valid state: %s", async (state, expected) => {
      await adapter.connect(mockConfig);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: () => Promise.resolve({ id: 1, state: expected, description: "" }),
      });

      const result = await adapter.execute("createCommitStatus", {
        sha: "abc123",
        state,
        description: "Test",
      });

      expect(result.success).toBe(true);
    });
  });

  describe("createGovernanceReport", () => {
    it("should create a formatted governance report", async () => {
      await adapter.connect(mockConfig);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: () =>
          Promise.resolve({
            id: 12347,
            html_url: "https://github.com/test-owner/test-repo/pull/1#issuecomment-12347",
          }),
      });

      const report = {
        summary: "All checks passed",
        status: "pass" as const,
        checks: [
          { name: "Build", status: "pass" as const, message: "Build successful" },
          { name: "Tests", status: "pass" as const, message: "100% passing" },
        ],
        metrics: {
          tokenUsage: 5000,
          filesChanged: 12,
          testCoverage: 85,
        },
      };

      const result = await adapter.execute("createGovernanceReport", {
        prNumber: 1,
        report,
      });

      expect(result.success).toBe(true);

      // Verify the request body contains formatted report
      const lastCall = mockFetch.mock.lastCall;
      expect(lastCall).toBeDefined();
      const requestBody = JSON.parse(lastCall![1].body);
      expect(requestBody.body).toContain("Sophia Code Governance Report");
      expect(requestBody.body).toContain("✅ PASS");
      expect(requestBody.body).toContain("Build");
      expect(requestBody.body).toContain("Tests");
    });
  });

  describe("labels", () => {
    it("should create a label", async () => {
      await adapter.connect(mockConfig);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: () =>
          Promise.resolve({
            id: 1,
            name: "sophia-escalation",
            color: "FF6B6B",
          }),
      });

      const result = await adapter.execute("createLabel", {
        name: "sophia-escalation",
        color: "#FF6B6B",
        description: "Escalations from Sophia",
      });

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty("name", "sophia-escalation");
    });

    it("should handle existing labels (422 error)", async () => {
      await adapter.connect(mockConfig);

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 422,
      });

      const result = await adapter.execute("createLabel", {
        name: "existing-label",
        color: "FF6B6B",
      });

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty("exists", true);
    });

    it("should add labels to an issue", async () => {
      await adapter.connect(mockConfig);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve([
            { id: 1, name: "sophia-escalation" },
            { id: 2, name: "escalation:high" },
          ]),
      });

      const result = await adapter.execute("addLabels", {
        issueNumber: 42,
        labels: ["sophia-escalation", "escalation:high"],
      });

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty("count", 2);
    });
  });

  describe("createEscalationIssue", () => {
    it("should create an issue from escalation data", async () => {
      // Mock connection check
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ login: "testuser" }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 201,
          json: () => Promise.resolve({ id: 1, name: "sophia-escalation", color: "FF6B6B" }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 201,
          json: () => Promise.resolve({ id: 2, name: "escalation:high", color: "FF9B50" }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 201,
          json: () =>
            Promise.resolve({
              number: 99,
              title: "[Sophia Escalation] Security vulnerability detected",
              html_url: "https://github.com/test/test/issues/99",
            }),
        });

      const escalation = {
        id: "esc-123",
        title: "Security vulnerability detected",
        description: "Found hardcoded secret in config.ts",
        severity: "high" as const,
        agent: "claude-code",
        context: "During security scan",
      };

      const result = await createEscalationIssue(escalation, "test-owner", "test-repo");

      expect(result.success).toBe(true);
      expect(result.issueNumber).toBe(99);
      expect(result.url).toContain("github.com");
    });

    it("should return error when GitHub not configured", async () => {
      delete process.env["GITHUB_TOKEN"];

      const escalation = {
        id: "esc-123",
        title: "Test",
        description: "Test",
        severity: "low" as const,
        agent: "test",
        context: "test",
      };

      const result = await createEscalationIssue(escalation);

      expect(result.success).toBe(false);
      expect(result.error).toContain("not configured");
    });
  });

  describe("postGovernanceReport", () => {
    it("should post governance report to PR", async () => {
      // Mock connection check first, then the PR comment
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ login: "testuser" }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 201,
          json: () => Promise.resolve({ id: 1, html_url: "https://github.com/test/test/pull/1#issuecomment-1" }),
        });

      const report = {
        summary: "All good",
        status: "pass" as const,
        checks: [{ name: "Build", status: "pass" as const, message: "OK" }],
      };

      const result = await postGovernanceReport(1, report, "test-owner", "test-repo");

      expect(result.success).toBe(true);
    });
  });

  describe("createBuildStatus", () => {
    it("should create build status check", async () => {
      // Mock connection check first, then the status creation
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ login: "testuser" }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 201,
          json: () => Promise.resolve({ id: 1, state: "success", description: "Build passed" }),
        });

      const result = await createBuildStatus(
        "abc123",
        "success",
        { description: "Build successful", url: "https://build/123" },
        "test-owner",
        "test-repo"
      );

      expect(result.success).toBe(true);
    });
  });

  describe("createGitHubIntegration", () => {
    it("should create adapter when token is available", () => {
      const adapter = createGitHubIntegration("owner", "repo");
      expect(adapter).toBeInstanceOf(GitHubAdapter);
    });

    it("should return null when token is not available", () => {
      delete process.env["GITHUB_TOKEN"];
      const adapter = createGitHubIntegration();
      expect(adapter).toBeNull();
    });

    it("should use GITHUB_REPOSITORY env var when owner/repo not provided", () => {
      process.env["GITHUB_REPOSITORY"] = "env-owner/env-repo";
      const adapter = createGitHubIntegration();
      expect(adapter).toBeInstanceOf(GitHubAdapter);
    });
  });

  describe("disconnect", () => {
    it("should clear all connection state", async () => {
      await adapter.connect(mockConfig);

      // Verify connected
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ login: "testuser" }),
      });

      let health = await adapter.healthCheck();
      expect(health.connected).toBe(true);

      // Disconnect
      await adapter.disconnect();

      // Verify disconnected
      health = await adapter.healthCheck();
      expect(health.connected).toBe(false);
      expect(health.error).toBe("Not configured");
    });
  });
});
