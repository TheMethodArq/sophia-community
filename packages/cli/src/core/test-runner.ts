import { spawn } from "node:child_process";
import path from "node:path";
import fs from "node:fs";
import type { BuildState } from "@sophia-code/shared";

/**
 * Test runner configuration
 */
export interface TestRunnerConfig {
  framework: "vitest" | "jest" | "mocha" | "playwright";
  testPattern?: string;
  coverage?: boolean;
  coverageThreshold?: number;
  timeout?: number;
  parallel?: boolean;
}

/**
 * Test execution result
 */
export interface TestExecutionResult {
  success: boolean;
  framework: string;
  summary: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    duration: number;
  };
  suites: TestSuiteResult[];
  coverage?: CoverageReport;
  output: string;
  errors?: string[];
}

/**
 * Test suite result
 */
export interface TestSuiteResult {
  name: string;
  file: string;
  duration: number;
  tests: TestCaseResult[];
  passed: boolean;
}

/**
 * Individual test case result
 */
export interface TestCaseResult {
  name: string;
  status: "passed" | "failed" | "skipped" | "todo";
  duration: number;
  error?: string;
  stackTrace?: string;
}

/**
 * Coverage report
 */
export interface CoverageReport {
  lines: { total: number; covered: number; percentage: number };
  functions: { total: number; covered: number; percentage: number };
  branches: { total: number; covered: number; percentage: number };
  statements: { total: number; covered: number; percentage: number };
  overall: number;
}

/**
 * Test failure categorization
 */
export type FailureCategory =
  | "assertion_error"
  | "timeout"
  | "setup_error"
  | "syntax_error"
  | "import_error"
  | "runtime_error"
  | "unknown";

/**
 * Categorized test failure
 */
export interface CategorizedFailure {
  test: TestCaseResult;
  category: FailureCategory;
  severity: "low" | "medium" | "high" | "critical";
  suggestion?: string;
}

/**
 * Test Runner
 * Executes tests and reports results
 */
export class TestRunner {
  /**
   * Run tests based on configuration
   */
  async runTests(
    projectPath: string,
    config: TestRunnerConfig = { framework: "vitest" }
  ): Promise<TestExecutionResult> {
    const startTime = Date.now();

    // Detect framework if not specified
    if (!config.framework) {
      config.framework = this.detectTestFramework(projectPath);
    }

    try {
      switch (config.framework) {
        case "vitest":
          return await this.runVitest(projectPath, config);
        case "jest":
          return await this.runJest(projectPath, config);
        case "mocha":
          return await this.runMocha(projectPath, config);
        case "playwright":
          return await this.runPlaywright(projectPath, config);
        default:
          throw new Error(`Unsupported test framework: ${config.framework}`);
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      return {
        success: false,
        framework: config.framework,
        summary: {
          total: 0,
          passed: 0,
          failed: 0,
          skipped: 0,
          duration,
        },
        suites: [],
        output: "",
        errors: [error instanceof Error ? error.message : String(error)],
      };
    }
  }

  /**
   * Run Vitest tests
   */
  private async runVitest(
    projectPath: string,
    config: TestRunnerConfig
  ): Promise<TestExecutionResult> {
    const args = ["vitest", "run"];

    if (config.testPattern) {
      args.push(config.testPattern);
    }

    if (config.coverage) {
      args.push("--coverage");
    }

    args.push("--reporter=json");

    return this.executeTestCommand(projectPath, "npx", args, "vitest");
  }

  /**
   * Run Jest tests
   */
  private async runJest(
    projectPath: string,
    config: TestRunnerConfig
  ): Promise<TestExecutionResult> {
    const args = ["jest"];

    if (config.testPattern) {
      args.push(config.testPattern);
    }

    if (config.coverage) {
      args.push("--coverage");
    }

    args.push("--json");

    return this.executeTestCommand(projectPath, "npx", args, "jest");
  }

  /**
   * Run Mocha tests
   */
  private async runMocha(
    projectPath: string,
    config: TestRunnerConfig
  ): Promise<TestExecutionResult> {
    const args = ["mocha"];

    if (config.testPattern) {
      args.push(config.testPattern);
    }

    args.push("--reporter=json");

    return this.executeTestCommand(projectPath, "npx", args, "mocha");
  }

  /**
   * Run Playwright E2E tests
   */
  private async runPlaywright(
    projectPath: string,
    config: TestRunnerConfig
  ): Promise<TestExecutionResult> {
    const args = ["playwright", "test"];

    if (config.testPattern) {
      args.push(config.testPattern);
    }

    // Playwright doesn't have a direct JSON reporter, parse from output
    return this.executeTestCommand(projectPath, "npx", args, "playwright");
  }

  /**
   * Execute test command and parse results
   */
  private async executeTestCommand(
    projectPath: string,
    command: string,
    args: string[],
    framework: string
  ): Promise<TestExecutionResult> {
    const startTime = Date.now();

    return new Promise((resolve) => {
      const child = spawn(command, args, {
        cwd: projectPath,
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

      child.on("close", (code) => {
        const duration = Date.now() - startTime;
        const result = this.parseTestResults(stdout, stderr, framework, duration);
        resolve(result);
      });

      child.on("error", (error) => {
        const duration = Date.now() - startTime;
        resolve({
          success: false,
          framework,
          summary: {
            total: 0,
            passed: 0,
            failed: 0,
            skipped: 0,
            duration,
          },
          suites: [],
          output: stderr || stdout,
          errors: [error.message],
        });
      });
    });
  }

  /**
   * Parse test results from output
   */
  private parseTestResults(
    stdout: string,
    stderr: string,
    framework: string,
    duration: number
  ): TestExecutionResult {
    try {
      // Try to find and parse JSON output
      const jsonMatch = stdout.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const data = JSON.parse(jsonMatch[0]);

        if (framework === "vitest" || framework === "jest") {
          return this.parseVitestJestResults(data, duration, stdout);
        }
      }
    } catch {
      // JSON parsing failed
    }

    // Fallback to text parsing
    return this.parseTextResults(stdout, stderr, duration, framework);
  }

  /**
   * Parse Vitest/Jest JSON results
   */
  private parseVitestJestResults(
    data: any,
    duration: number,
    output: string
  ): TestExecutionResult {
    const suites: TestSuiteResult[] = [];
    let totalPassed = 0;
    let totalFailed = 0;
    let totalSkipped = 0;

    if (data.testResults) {
      for (const suiteData of data.testResults) {
        const tests: TestCaseResult[] = [];
        let suitePassed = true;

        for (const testData of suiteData.assertionResults || []) {
          const status = testData.status === "passed"
            ? "passed"
            : testData.status === "pending"
            ? "skipped"
            : "failed";

          const test: TestCaseResult = {
            name: testData.title || testData.fullName,
            status,
            duration: testData.duration || 0,
            error: testData.failureMessages?.[0],
            stackTrace: testData.failureMessages?.join("\n"),
          };

          tests.push(test);

          if (status === "passed") totalPassed++;
          else if (status === "failed") {
            totalFailed++;
            suitePassed = false;
          } else totalSkipped++;
        }

        suites.push({
          name: suiteData.name,
          file: suiteData.name,
          duration: suiteData.endTime - suiteData.startTime || 0,
          tests,
          passed: suitePassed,
        });
      }
    }

    // Parse coverage if available
    const coverage = data.coverage ? this.parseCoverage(data.coverage) : undefined;

    return {
      success: totalFailed === 0,
      framework: data.success !== undefined ? "vitest" : "jest",
      summary: {
        total: totalPassed + totalFailed + totalSkipped,
        passed: totalPassed,
        failed: totalFailed,
        skipped: totalSkipped,
        duration,
      },
      suites,
      coverage,
      output,
    };
  }

  /**
   * Parse coverage data
   */
  private parseCoverage(data: any): CoverageReport {
    const lines = data.lines || { total: 0, covered: 0 };
    const functions = data.functions || { total: 0, covered: 0 };
    const branches = data.branches || { total: 0, covered: 0 };
    const statements = data.statements || { total: 0, covered: 0 };

    return {
      lines: {
        total: lines.total,
        covered: lines.covered,
        percentage: lines.total ? Math.round((lines.covered / lines.total) * 100) : 0,
      },
      functions: {
        total: functions.total,
        covered: functions.covered,
        percentage: functions.total ? Math.round((functions.covered / functions.total) * 100) : 0,
      },
      branches: {
        total: branches.total,
        covered: branches.covered,
        percentage: branches.total ? Math.round((branches.covered / branches.total) * 100) : 0,
      },
      statements: {
        total: statements.total,
        covered: statements.covered,
        percentage: statements.total ? Math.round((statements.covered / statements.total) * 100) : 0,
      },
      overall: data.overall || Math.round(
        ((lines.covered + functions.covered + branches.covered + statements.covered) /
          (lines.total + functions.total + branches.total + statements.total)) * 100
      ) || 0,
    };
  }

  /**
   * Parse text-based test results
   */
  private parseTextResults(
    stdout: string,
    stderr: string,
    duration: number,
    framework: string
  ): TestExecutionResult {
    // Extract counts from text output
    const passedMatch = stdout.match(/(\d+)\s+(?:passing|passed)/i);
    const failedMatch = stdout.match(/(\d+)\s+(?:failing|failed)/i);
    const skippedMatch = stdout.match(/(\d+)\s+(?:pending|skipped|todo)/i);

    const passed = parseInt(passedMatch?.[1] || "0");
    const failed = parseInt(failedMatch?.[1] || "0");
    const skipped = parseInt(skippedMatch?.[1] || "0");

    return {
      success: failed === 0,
      framework,
      summary: {
        total: passed + failed + skipped,
        passed,
        failed,
        skipped,
        duration,
      },
      suites: [],
      output: stdout,
      errors: stderr ? [stderr] : undefined,
    };
  }

  /**
   * Detect test framework from project
   */
  detectTestFramework(projectPath: string): "vitest" | "jest" | "mocha" {
    const packageJsonPath = path.join(projectPath, "package.json");

    if (fs.existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
      const deps = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies,
      };

      if (deps.vitest) return "vitest";
      if (deps.jest) return "jest";
      if (deps.mocha) return "mocha";
    }

    // Check for config files
    if (fs.existsSync(path.join(projectPath, "vitest.config.ts"))) return "vitest";
    if (fs.existsSync(path.join(projectPath, "jest.config.js"))) return "jest";
    if (fs.existsSync(path.join(projectPath, ".mocharc.json"))) return "mocha";

    // Default to vitest
    return "vitest";
  }

  /**
   * Categorize test failures
   */
  categorizeFailures(result: TestExecutionResult): CategorizedFailure[] {
    const failures: CategorizedFailure[] = [];

    for (const suite of result.suites) {
      for (const test of suite.tests) {
        if (test.status === "failed") {
          const category = this.classifyFailure(test);
          failures.push({
            test,
            category,
            severity: this.determineSeverity(category, test),
            suggestion: this.generateSuggestion(category, test),
          });
        }
      }
    }

    return failures;
  }

  /**
   * Classify a test failure
   */
  private classifyFailure(test: TestCaseResult): FailureCategory {
    const error = test.error?.toLowerCase() || "";
    const stack = test.stackTrace?.toLowerCase() || "";

    if (error.includes("assertion") || error.includes("expected")) {
      return "assertion_error";
    }
    if (error.includes("timeout") || stack.includes("timeout")) {
      return "timeout";
    }
    if (error.includes("cannot find module") || error.includes("import")) {
      return "import_error";
    }
    if (error.includes("syntax") || error.includes("unexpected token")) {
      return "syntax_error";
    }
    if (error.includes("beforeeach") || error.includes("aftereach") || error.includes("setup")) {
      return "setup_error";
    }
    if (error.includes("undefined") || error.includes("null") || error.includes("cannot read")) {
      return "runtime_error";
    }

    return "unknown";
  }

  /**
   * Determine severity of a failure
   */
  private determineSeverity(category: FailureCategory, test: TestCaseResult): "low" | "medium" | "high" | "critical" {
    switch (category) {
      case "assertion_error":
        return "medium";
      case "syntax_error":
        return "critical";
      case "import_error":
        return "high";
      case "timeout":
        return "medium";
      case "setup_error":
        return "high";
      case "runtime_error":
        return test.error?.includes("undefined") ? "medium" : "high";
      default:
        return "medium";
    }
  }

  /**
   * Generate suggestion for fixing failure
   */
  private generateSuggestion(category: FailureCategory, test: TestCaseResult): string {
    switch (category) {
      case "assertion_error":
        return "Review the test assertion and expected value";
      case "syntax_error":
        return "Fix the syntax error in the test or implementation";
      case "import_error":
        return "Check that all imported modules exist and paths are correct";
      case "timeout":
        return "Increase timeout or optimize the test/implementation";
      case "setup_error":
        return "Fix the test setup/teardown code";
      case "runtime_error":
        return "Check for null/undefined values and add proper error handling";
      default:
        return "Review the test failure details for more information";
    }
  }

  /**
   * Generate test report
   */
  generateReport(result: TestExecutionResult): string {
    const lines = [
      `# Test Report - ${result.framework}`,
      "",
      `## Summary`,
      `- Total: ${result.summary.total}`,
      `- Passed: ${result.summary.passed} ✅`,
      `- Failed: ${result.summary.failed} ❌`,
      `- Skipped: ${result.summary.skipped} ⚠️`,
      `- Duration: ${(result.summary.duration / 1000).toFixed(2)}s`,
      ``,
    ];

    if (result.coverage) {
      lines.push(
        `## Coverage`,
        `- Lines: ${result.coverage.lines.percentage}%`,
        `- Functions: ${result.coverage.functions.percentage}%`,
        `- Branches: ${result.coverage.branches.percentage}%`,
        `- Statements: ${result.coverage.statements.percentage}%`,
        `- Overall: ${result.coverage.overall}%`,
        ``
      );
    }

    if (result.suites.length > 0) {
      lines.push(`## Test Suites`);
      for (const suite of result.suites) {
        const status = suite.passed ? "✅" : "❌";
        lines.push(`${status} ${suite.name} (${suite.tests.length} tests)`);
      }
      lines.push("");
    }

    // Categorize failures
    if (result.summary.failed > 0) {
      const categorized = this.categorizeFailures(result);
      lines.push(`## Failures by Category`);

      const byCategory = categorized.reduce((acc, f) => {
        acc[f.category] = acc[f.category] || [];
        acc[f.category].push(f);
        return acc;
      }, {} as Record<FailureCategory, CategorizedFailure[]>);

      for (const [category, failures] of Object.entries(byCategory)) {
        lines.push(`\n### ${category.replace(/_/g, " ").toUpperCase()}`);
        for (const f of failures) {
          lines.push(`- ${f.test.name}`);
          if (f.suggestion) {
            lines.push(`  Suggestion: ${f.suggestion}`);
          }
        }
      }
    }

    return lines.join("\n");
  }
}

// Singleton instance
export const testRunner = new TestRunner();

/**
 * Run tests for a build
 */
export async function runBuildTests(
  projectPath: string,
  buildState: BuildState,
  options: {
    coverage?: boolean;
    pattern?: string;
  } = {}
): Promise<TestExecutionResult> {
  const config: TestRunnerConfig = {
    framework: testRunner.detectTestFramework(projectPath),
    coverage: options.coverage,
    testPattern: options.pattern,
  };

  return testRunner.runTests(projectPath, config);
}
