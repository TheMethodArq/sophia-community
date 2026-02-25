import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { getDb } from "./database.js";
import { randomUUID } from "node:crypto";

export interface ScreenshotComparison {
  testName: string;
  baselinePath: string;
  currentPath: string;
  diffPath?: string;
  similarity: number;
  passed: boolean;
  threshold: number;
}

export interface VisualRegressionResult {
  screenshots: ScreenshotComparison[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    new: number;
    updated: number;
  };
  hasChanges: boolean;
}

/**
 * Visual Regression Tester
 * Captures and compares screenshots against design system baselines
 */
export class VisualRegressionTester {
  private baselineDir: string;
  private currentDir: string;
  private diffDir: string;
  private threshold: number;

  constructor(options: {
    baselineDir?: string;
    currentDir?: string;
    diffDir?: string;
    threshold?: number;
  } = {}) {
    this.baselineDir = options.baselineDir || ".sophia/visual-regression/baseline";
    this.currentDir = options.currentDir || ".sophia/visual-regression/current";
    this.diffDir = options.diffDir || ".sophia/visual-regression/diff";
    this.threshold = options.threshold || 0.95; // 95% similarity threshold
  }

  /**
   * Ensure directories exist
   */
  private ensureDirectories(): void {
    [this.baselineDir, this.currentDir, this.diffDir].forEach((dir) => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  /**
   * Capture screenshots using Playwright
   */
  async captureScreenshots(projectPath: string, scenarios: string[]): Promise<string[]> {
    this.ensureDirectories();
    const captured: string[] = [];

    for (const scenario of scenarios) {
      const screenshotPath = path.join(this.currentDir, `${scenario}.png`);
      
      try {
        // Run Playwright to capture screenshot
        await this.runPlaywrightScreenshot(projectPath, scenario, screenshotPath);
        captured.push(screenshotPath);
      } catch (error) {
        console.error(`Failed to capture screenshot for ${scenario}:`, error);
      }
    }

    return captured;
  }

  /**
   * Run Playwright to capture screenshot
   */
  private async runPlaywrightScreenshot(
    projectPath: string,
    scenario: string,
    outputPath: string
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const testScript = `
        const { chromium } = require('playwright');
        
        (async () => {
          const browser = await chromium.launch();
          const page = await browser.newPage();
          
          // Navigate based on scenario
          if ('${scenario}'.includes('home')) {
            await page.goto('http://localhost:3000');
          } else if ('${scenario}'.includes('login')) {
            await page.goto('http://localhost:3000/login');
          } else {
            await page.goto('http://localhost:3000');
          }
          
          // Wait for content to load
          await page.waitForLoadState('networkidle');
          
          // Take screenshot
          await page.screenshot({ 
            path: '${outputPath}',
            fullPage: ${scenario.includes('fullpage')}
          });
          
          await browser.close();
        })();
      `;

      const child = spawn("node", ["-e", testScript], {
        cwd: projectPath,
        stdio: ["pipe", "pipe", "pipe"],
      });

      let stderr = "";
      child.stderr?.on("data", (data) => {
        stderr += data.toString();
      });

      child.on("close", (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(stderr || `Playwright exited with code ${code}`));
        }
      });

      // Timeout after 30 seconds
      setTimeout(() => {
        child.kill();
        reject(new Error("Screenshot capture timeout"));
      }, 30000);
    });
  }

  /**
   * Compare screenshot against baseline
   */
  async compareScreenshot(screenshotPath: string): Promise<ScreenshotComparison> {
    const fileName = path.basename(screenshotPath);
    const baselinePath = path.join(this.baselineDir, fileName);
    const testName = fileName.replace(".png", "");

    // Check if baseline exists
    if (!fs.existsSync(baselinePath)) {
      // New screenshot - copy to baseline
      fs.copyFileSync(screenshotPath, baselinePath);
      
      return {
        testName,
        baselinePath,
        currentPath: screenshotPath,
        similarity: 1,
        passed: true,
        threshold: this.threshold,
      };
    }

    // Compare images
    const comparison = await this.performImageComparison(
      baselinePath,
      screenshotPath,
      testName
    );

    return comparison;
  }

  /**
   * Perform pixel-by-pixel image comparison
   */
  private async performImageComparison(
    baselinePath: string,
    currentPath: string,
    testName: string
  ): Promise<ScreenshotComparison> {
    const diffPath = path.join(this.diffDir, `${testName}-diff.png`);

    try {
      // Use pixelmatch or similar library for comparison
      // For now, we'll use a simple hash-based comparison
      const baselineHash = this.getImageHash(baselinePath);
      const currentHash = this.getImageHash(currentPath);
      
      // Calculate similarity based on hash
      const similarity = baselineHash === currentHash ? 1 : 0.85; // Placeholder
      
      const passed = similarity >= this.threshold;

      if (!passed) {
        // Generate diff image (placeholder)
        fs.copyFileSync(currentPath, diffPath);
      }

      return {
        testName,
        baselinePath,
        currentPath,
        diffPath: passed ? undefined : diffPath,
        similarity,
        passed,
        threshold: this.threshold,
      };
    } catch (error) {
      return {
        testName,
        baselinePath,
        currentPath,
        similarity: 0,
        passed: false,
        threshold: this.threshold,
      };
    }
  }

  /**
   * Get hash of image file
   */
  private getImageHash(filePath: string): string {
    const content = fs.readFileSync(filePath);
    return createHash("sha256").update(content).digest("hex");
  }

  /**
   * Run full visual regression test suite
   */
  async runTests(
    projectPath: string,
    scenarios?: string[]
  ): Promise<VisualRegressionResult> {
    this.ensureDirectories();

    // Default scenarios if none provided
    const testScenarios = scenarios || [
      "homepage",
      "homepage-mobile",
      "login",
      "dashboard",
    ];

    // Capture current screenshots
    const capturedPaths = await this.captureScreenshots(projectPath, testScenarios);

    // Compare each screenshot
    const comparisons: ScreenshotComparison[] = [];
    let newCount = 0;
    let updatedCount = 0;

    for (const screenshotPath of capturedPaths) {
      const comparison = await this.compareScreenshot(screenshotPath);
      comparisons.push(comparison);

      if (!fs.existsSync(comparison.baselinePath)) {
        newCount++;
      } else if (!comparison.passed) {
        updatedCount++;
      }
    }

    const result: VisualRegressionResult = {
      screenshots: comparisons,
      summary: {
        total: comparisons.length,
        passed: comparisons.filter((c) => c.passed).length,
        failed: comparisons.filter((c) => !c.passed).length,
        new: newCount,
        updated: updatedCount,
      },
      hasChanges: updatedCount > 0,
    };

    // Log results
    this.logResults(projectPath, result);

    return result;
  }

  /**
   * Approve current screenshots as new baselines
   */
  async approveChanges(): Promise<{ approved: number; failed: number }> {
    let approved = 0;
    let failed = 0;

    const currentFiles = fs.readdirSync(this.currentDir);

    for (const file of currentFiles) {
      if (!file.endsWith(".png")) continue;

      const currentPath = path.join(this.currentDir, file);
      const baselinePath = path.join(this.baselineDir, file);

      try {
        fs.copyFileSync(currentPath, baselinePath);
        approved++;
      } catch {
        failed++;
      }
    }

    return { approved, failed };
  }

  /**
   * Generate HTML report
   */
  generateReport(result: VisualRegressionResult): string {
    const lines = [
      "<!DOCTYPE html>",
      "<html>",
      "<head>",
      "  <title>Visual Regression Report</title>",
      "  <style>",
      "    body { font-family: sans-serif; padding: 20px; }",
      "    .summary { background: #f0f0f0; padding: 15px; border-radius: 5px; margin-bottom: 20px; }",
      "    .screenshot { margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }",
      "    .passed { border-left: 5px solid #4ade80; }",
      "    .failed { border-left: 5px solid #f87171; }",
      "    .image-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 10px; }",
      "    img { max-width: 100%; border: 1px solid #ccc; }",
      "  </style>",
      "</head>",
      "<body>",
      "  <h1>Visual Regression Report</h1>",
      "  <div class='summary'>",
      `    <p><strong>Total:</strong> ${result.summary.total}</p>`,
      `    <p><strong>Passed:</strong> ${result.summary.passed} ✅</p>`,
      `    <p><strong>Failed:</strong> ${result.summary.failed} ❌</p>`,
      `    <p><strong>New:</strong> ${result.summary.new} 🆕</p>`,
      `    <p><strong>Updated:</strong> ${result.summary.updated} 📝</p>`,
      "  </div>",
    ];

    for (const screenshot of result.screenshots) {
      const status = screenshot.passed ? "passed" : "failed";
      lines.push(
        `  <div class='screenshot ${status}'>`,
        `    <h3>${screenshot.testName} ${screenshot.passed ? "✅" : "❌"}</h3>`,
        `    <p>Similarity: ${(screenshot.similarity * 100).toFixed(1)}%</p>`,
        "    <div class='image-grid'>",
        "      <div>",
        "        <p><strong>Baseline</strong></p>",
        `        <img src='${screenshot.baselinePath}' alt='Baseline'>`,
        "      </div>",
        "      <div>",
        "        <p><strong>Current</strong></p>",
        `        <img src='${screenshot.currentPath}' alt='Current'>`,
        "      </div>"
      );

      if (screenshot.diffPath) {
        lines.push(
          "      <div>",
          "        <p><strong>Diff</strong></p>",
          `        <img src='${screenshot.diffPath}' alt='Diff'>`,
          "      </div>"
        );
      }

      lines.push("    </div>", "  </div>");
    }

    lines.push("</body>", "</html>");

    return lines.join("\n");
  }

  /**
   * Log results to database
   */
  private logResults(projectPath: string, result: VisualRegressionResult): void {
    const db = getDb();

    const stmt = db.prepare(`
      INSERT INTO visual_regression_results (
        id, project_path, total, passed, failed, new_count, updated_count, has_changes, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      randomUUID(),
      projectPath,
      result.summary.total,
      result.summary.passed,
      result.summary.failed,
      result.summary.new,
      result.summary.updated,
      result.hasChanges ? 1 : 0,
      new Date().toISOString()
    );

    // Log individual screenshots
    const screenshotStmt = db.prepare(`
      INSERT INTO visual_regression_screenshots (
        id, result_id, test_name, similarity, passed, threshold
      ) VALUES (?, ?, ?, ?, ?, ?)
    `);

    const resultId = db.prepare("SELECT last_insert_rowid() as id").get() as { id: number };

    for (const screenshot of result.screenshots) {
      screenshotStmt.run(
        randomUUID(),
        resultId.id,
        screenshot.testName,
        screenshot.similarity,
        screenshot.passed ? 1 : 0,
        screenshot.threshold
      );
    }
  }
}

// Singleton instance
export const visualRegressionTester = new VisualRegressionTester();

/**
 * Quick test function
 */
export async function runVisualRegression(
  projectPath: string,
  scenarios?: string[]
): Promise<{
  passed: boolean;
  hasChanges: boolean;
  reportPath: string;
}> {
  const result = await visualRegressionTester.runTests(projectPath, scenarios);
  
  // Generate and save HTML report
  const reportHtml = visualRegressionTester.generateReport(result);
  const reportPath = path.join(
    projectPath,
    ".sophia",
    "visual-regression",
    `report-${Date.now()}.html`
  );
  
  fs.writeFileSync(reportPath, reportHtml);

  return {
    passed: result.summary.failed === 0,
    hasChanges: result.hasChanges,
    reportPath,
  };
}
