import { spawn } from "node:child_process";
import path from "node:path";
import fs from "node:fs";
import type {
  AgentContext,
  AgentResult,
} from "@sophia-code/shared";

// Local type definitions for TDD workflow
interface TestSpec {
  id: string;
  taskId: string;
  testCases: Array<{
    id: string;
    name: string;
    description: string;
    expectedBehavior: string;
    setup?: string;
    teardown?: string;
  }>;
  createdAt: string;
}

interface TestResult {
  testName: string;
  status: "passed" | "failed" | "skipped";
  duration: number;
  suite?: string;
  error?: string;
}

interface TestFailure {
  testName: string;
  error: string;
  stackTrace?: string;
  suite?: string;
}
import { createAgentAdapter, prepareContextBundle } from "./agent-adapter.js";
import { recordTokenUsage } from "./token-tracker.js";

/**
 * TDD Workflow Manager
 * Manages the test-first development process
 */
export class TDDWorkflowManager {
  private maxRetries = 2;

  /**
   * Execute TDD workflow for a task
   * 1. Generate failing test
   * 2. Implement code
   * 3. Verify tests pass
   * 4. Retry on failure
   */
  async executeTDDWorkflow(
    buildId: string,
    taskId: string,
    taskSpec: string,
    projectPath: string,
    options: {
      testFramework?: "vitest" | "jest" | "mocha";
      maxRetries?: number;
    } = {}
  ): Promise<{
    success: boolean;
    testResults: TestResult[];
    attempts: Array<{
      attempt: number;
      phase: "test_generation" | "implementation" | "verification";
      result: AgentResult;
    }>;
    finalOutput: string;
  }> {
    const attempts: Array<{
      attempt: number;
      phase: "test_generation" | "implementation" | "verification";
      result: AgentResult;
    }> = [];

    const maxAttempts = options.maxRetries ?? this.maxRetries;

    for (let attempt = 1; attempt <= maxAttempts + 1; attempt++) {
      // Phase 1: Generate failing test
      const testGenResult = await this.generateTest(
        buildId,
        taskId,
        taskSpec,
        projectPath,
        attempt
      );

      attempts.push({
        attempt,
        phase: "test_generation",
        result: testGenResult,
      });

      if (!testGenResult.success) {
        return {
          success: false,
          testResults: [],
          attempts,
          finalOutput: `Test generation failed: ${testGenResult.error}`,
        };
      }

      // Phase 2: Run test to verify it fails
      const initialTestRun = await this.runTests(projectPath, options.testFramework);
      
      // Check if we have failing tests (expected for TDD)
      const hasFailingTests = initialTestRun.results.some(r => r.status === "failed");
      
      if (!hasFailingTests && attempt === 1) {
        // No failing tests on first attempt - might mean tests already pass
        // This is okay for subsequent tasks
        console.log("  ⚠️  No new failing tests - proceeding with implementation");
      }

      // Phase 3: Implement code to pass tests
      const implementationResult = await this.implementCode(
        buildId,
        taskId,
        taskSpec,
        testGenResult,
        initialTestRun,
        projectPath,
        attempt
      );

      attempts.push({
        attempt,
        phase: "implementation",
        result: implementationResult,
      });

      if (!implementationResult.success) {
        if (attempt < maxAttempts + 1) {
          console.log(`  🔄 Retry ${attempt}/${maxAttempts} - implementation failed`);
          continue;
        }
        return {
          success: false,
          testResults: initialTestRun.results,
          attempts,
          finalOutput: `Implementation failed after ${maxAttempts} attempts: ${implementationResult.error}`,
        };
      }

      // Phase 4: Verify tests pass
      const finalTestRun = await this.runTests(projectPath, options.testFramework);

      attempts.push({
        attempt,
        phase: "verification",
        result: {
          success: finalTestRun.success,
          output: `Tests: ${finalTestRun.passed}/${finalTestRun.total} passed`,
          tokensUsed: { input: 0, output: 0, total: 0, cost: 0 },
          filesChanged: [],
          decisionsLogged: [],
        },
      });

      const allTestsPass = finalTestRun.results.every(r => r.status === "passed");

      if (allTestsPass) {
        return {
          success: true,
          testResults: finalTestRun.results,
          attempts,
          finalOutput: `✓ All ${finalTestRun.total} tests passed`,
        };
      }

      if (attempt < this.maxRetries + 1) {
        console.log(`  🔄 Retry ${attempt}/${maxAttempts} - tests failing`);
        
        // Analyze failures for next attempt
        const failureAnalysis = await this.analyzeTestFailures(
          buildId,
          taskId,
          finalTestRun.failures,
          projectPath
        );

        // Include failure analysis in task spec for retry
        taskSpec += `\n\n## Previous Failure Analysis\n${failureAnalysis.output}`;
      }
    }

    return {
      success: false,
      testResults: [],
      attempts,
      finalOutput: `Failed after ${this.maxRetries + 1} attempts`,
    };
  }

  /**
   * Generate tests for a task specification
   */
  private async generateTest(
    buildId: string,
    taskId: string,
    taskSpec: string,
    projectPath: string,
    attempt: number
  ): Promise<AgentResult> {
    const context = prepareContextBundle(buildId, taskId, projectPath, taskSpec, {
      maxTokens: 4000,
      timeout: 180,
    });

    const prompt = this.buildTestGenerationPrompt(taskSpec, attempt);
    
    const adapter = createAgentAdapter("claude-code");
    await adapter.initialize(context);

    try {
      const result = await adapter.execute(prompt, context);
      
      if (result.tokensUsed.total > 0) {
        recordTokenUsage(buildId, taskId, "haiku", result.tokensUsed.input, result.tokensUsed.output);
      }

      return result;
    } finally {
      await adapter.cleanup();
    }
  }

  /**
   * Build prompt for test generation
   */
  private buildTestGenerationPrompt(taskSpec: string, attempt: number): string {
    const basePrompt = `Generate comprehensive unit tests for the following task.

${taskSpec}

Requirements:
1. Write tests BEFORE implementation (TDD approach)
2. Cover all edge cases and error scenarios
3. Use descriptive test names that explain what is being tested
4. Follow the project's existing test patterns
5. Tests should be runnable with the configured test framework
6. Mock external dependencies appropriately

Output:
- Complete test file(s) with all test cases
- Focus on testing behavior, not implementation details
- Include at least one test for each acceptance criterion
`;

    if (attempt > 1) {
      return basePrompt + `

Note: This is attempt ${attempt}. Previous implementation failed. Focus on:
- More thorough edge case coverage
- Better error scenario testing
- Clearer test assertions
`;
    }

    return basePrompt;
  }

  /**
   * Implement code to pass the generated tests
   */
  private async implementCode(
    buildId: string,
    taskId: string,
    taskSpec: string,
    testResult: AgentResult,
    testRun: TestRunResult,
    projectPath: string,
    attempt: number
  ): Promise<AgentResult> {
    const context = prepareContextBundle(buildId, taskId, projectPath, taskSpec, {
      maxTokens: 8000,
      timeout: 300,
    });

    const prompt = this.buildImplementationPrompt(
      taskSpec,
      testResult.output,
      testRun,
      attempt
    );

    const adapter = createAgentAdapter("claude-code");
    await adapter.initialize(context);

    try {
      const result = await adapter.execute(prompt, context);
      
      if (result.tokensUsed.total > 0) {
        recordTokenUsage(buildId, taskId, "sonnet", result.tokensUsed.input, result.tokensUsed.output);
      }

      return result;
    } finally {
      await adapter.cleanup();
    }
  }

  /**
   * Build prompt for implementation
   */
  private buildImplementationPrompt(
    taskSpec: string,
    testCode: string,
    testRun: TestRunResult,
    attempt: number
  ): string {
    const basePrompt = `Implement code to make the following tests pass.

## Task Specification
${taskSpec}

## Tests to Pass
${testCode}

## Current Test Results
- Total: ${testRun.total}
- Passed: ${testRun.passed}
- Failed: ${testRun.failed}
${testRun.failures.map(f => `- ${f.testName}: ${f.error}`).join("\n")}

Requirements:
1. Implement the MINIMUM code to make tests pass
2. Follow existing code patterns and conventions
3. Handle errors appropriately
4. Add proper TypeScript types
5. No console.log or debug code
6. Keep functions focused and small

Output:
- Complete implementation file(s)
- Only modify what's needed to pass tests
- Ensure all tests pass after implementation
`;

    if (attempt > 1) {
      return basePrompt + `

Note: This is attempt ${attempt}. Previous attempt failed tests. Focus on:
- Carefully reading test expectations
- Fixing specific failing assertions
- Not over-engineering the solution
`;
    }

    return basePrompt;
  }

  /**
   * Run tests and collect results
   */
  private async runTests(
    projectPath: string,
    testFramework?: "vitest" | "jest" | "mocha"
  ): Promise<TestRunResult> {
    const framework = testFramework ?? this.detectTestFramework(projectPath);
    
    return new Promise((resolve) => {
      let command: string;
      let args: string[];

      switch (framework) {
        case "vitest":
          command = "npx";
          args = ["vitest", "run", "--reporter=json"];
          break;
        case "jest":
          command = "npx";
          args = ["jest", "--json"];
          break;
        case "mocha":
          command = "npx";
          args = ["mocha", "--reporter=json"];
          break;
        default:
          // Fallback to vitest
          command = "npx";
          args = ["vitest", "run", "--reporter=json"];
      }

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
        const result = this.parseTestOutput(stdout, stderr, framework);
        resolve(result);
      });

      child.on("error", () => {
        resolve({
          success: false,
          total: 0,
          passed: 0,
          failed: 0,
          results: [],
          failures: [],
          output: stderr || stdout,
        });
      });
    });
  }

  /**
   * Detect test framework from project files
   */
  private detectTestFramework(projectPath: string): "vitest" | "jest" | "mocha" {
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
   * Parse test output into structured results
   */
  private parseTestOutput(
    stdout: string,
    stderr: string,
    framework: string
  ): TestRunResult {
    try {
      // Try to parse JSON output
      const jsonMatch = stdout.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const data = JSON.parse(jsonMatch[0]);
        
        if (framework === "vitest" || framework === "jest") {
          const results: TestResult[] = [];
          const failures: TestFailure[] = [];

          // Parse test results based on framework format
          if (data.testResults) {
            for (const suite of data.testResults) {
              for (const test of suite.assertionResults || []) {
                const result: TestResult = {
                  testName: test.title || test.fullName,
                  status: test.status === "passed" ? "passed" : "failed",
                  duration: test.duration || 0,
                  suite: suite.name,
                };
                results.push(result);

                if (test.status === "failed") {
                  failures.push({
                    testName: test.title || test.fullName,
                    error: test.failureMessages?.[0] || "Test failed",
                    stackTrace: test.failureMessages?.join("\n"),
                    suite: suite.name,
                  });
                }
              }
            }
          }

          return {
            success: data.success || failures.length === 0,
            total: results.length,
            passed: results.filter(r => r.status === "passed").length,
            failed: failures.length,
            results,
            failures,
            output: stdout,
          };
        }
      }
    } catch {
      // JSON parsing failed, return basic result
    }

    // Fallback: parse text output
    const passedMatch = stdout.match(/(\d+)\s+passing/);
    const failedMatch = stdout.match(/(\d+)\s+failing/);

    return {
      success: !failedMatch || parseInt(failedMatch[1] ?? "0") === 0,
      total: parseInt(passedMatch?.[1] ?? "0") + parseInt(failedMatch?.[1] ?? "0"),
      passed: parseInt(passedMatch?.[1] ?? "0"),
      failed: parseInt(failedMatch?.[1] ?? "0"),
      results: [],
      failures: [],
      output: stdout,
    };
  }

  /**
   * Analyze test failures to provide feedback for retry
   */
  private async analyzeTestFailures(
    buildId: string,
    taskId: string,
    failures: TestFailure[],
    projectPath: string
  ): Promise<AgentResult> {
    const context = prepareContextBundle(buildId, taskId, projectPath, "", {
      maxTokens: 4000,
      timeout: 120,
    });

    const failureDetails = failures
      .map((f) => `- ${f.testName}: ${f.error}`)
      .join("\n");

    const prompt = `Analyze these test failures and provide specific guidance on what went wrong.

## Failed Tests
${failureDetails}

## Analysis Required
1. What is the root cause of each failure?
2. What specific changes are needed to fix them?
3. Are there patterns in the failures that suggest a common issue?

Provide a concise analysis focusing on actionable fixes.`;

    const adapter = createAgentAdapter("claude-code");
    await adapter.initialize(context);

    try {
      return await adapter.execute(prompt, context);
    } finally {
      await adapter.cleanup();
    }
  }
}

/**
 * Test run result interface
 */
interface TestRunResult {
  success: boolean;
  total: number;
  passed: number;
  failed: number;
  results: TestResult[];
  failures: TestFailure[];
  output: string;
}

  /**
   * Generate test specification from task description
   */
export function generateTestSpec(
  taskId: string,
  taskDescription: string,
  acceptanceCriteria: string[]
): TestSpec {
  return {
    id: `${taskId}-tests`,
    taskId,
    testCases: acceptanceCriteria.map((criteria, index) => ({
      id: `${taskId}-test-${index + 1}`,
      name: `Should ${criteria.toLowerCase()}`,
      description: criteria,
      expectedBehavior: criteria,
      setup: "",
      teardown: "",
    })),
    createdAt: new Date().toISOString(),
  };
}

/**
 * Check if code follows TDD principles
 */
export function validateTDDCompliance(
  filesChanged: Array<{ path: string; changeType: string }>,
  testResults: TestResult[]
): {
  compliant: boolean;
  issues: string[];
}
 {
  const issues: string[] = [];

  // Check if tests were written
  const testFiles = filesChanged.filter((f) =>
    f.path.includes(".test.") || f.path.includes(".spec.")
  );

  if (testFiles.length === 0) {
    issues.push("No test files were created or modified");
  }

  // Check if implementation files were changed
  const implementationFiles = filesChanged.filter(
    (f) =>
      !f.path.includes(".test.") &&
      !f.path.includes(".spec.") &&
      (f.path.endsWith(".ts") || f.path.endsWith(".js"))
  );

  if (implementationFiles.length === 0) {
    issues.push("No implementation files were changed");
  }

  // Check if tests pass
  const allTestsPass = testResults.every((r) => r.status === "passed");
  if (!allTestsPass) {
    issues.push("Not all tests are passing");
  }

  return {
    compliant: issues.length === 0,
    issues,
  };
}

// Singleton instance
export const tddManager = new TDDWorkflowManager();
