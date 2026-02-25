import fs from "node:fs";
import path from "node:path";
import { getDb } from "./database.js";
import { randomUUID } from "node:crypto";

export interface DesignSystemViolation {
  file: string;
  line: number;
  type: "component" | "style" | "accessibility" | "responsive" | "state";
  severity: "error" | "warning" | "info";
  message: string;
  rule: string;
  suggestion: string;
}

export interface DesignSystemPolicy {
  name: string;
  framework: "shadcn" | "material" | "ant" | "chakra" | "custom";
  components: {
    allowed: string[];
    forbidden: string[];
    requireDocs: boolean;
  };
  styling: {
    requireTailwind: boolean;
    allowedUnits: string[];
    maxInlineStyles: number;
    requireCssModules: boolean;
  };
  responsive: {
    breakpoints: string[];
    requireMobileFirst: boolean;
    maxBreakpointViolations: number;
  };
  states: {
    requireLoading: boolean;
    requireError: boolean;
    requireEmpty: boolean;
    requireDisabled: boolean;
  };
  accessibility: {
    requireAriaLabels: boolean;
    requireFocusVisible: boolean;
    maxColorContrastViolations: number;
  };
}

/**
 * Design System Policy Enforcer
 * Validates compliance with design system standards
 */
export class DesignSystemPolicyEnforcer {
  private policy: DesignSystemPolicy;

  constructor(policy?: Partial<DesignSystemPolicy>) {
    this.policy = {
      name: policy?.name || "Default",
      framework: policy?.framework || "shadcn",
      components: {
        allowed: policy?.components?.allowed || [],
        forbidden: policy?.components?.forbidden || ["div", "span"],
        requireDocs: policy?.components?.requireDocs ?? true,
      },
      styling: {
        requireTailwind: policy?.styling?.requireTailwind ?? true,
        allowedUnits: policy?.styling?.allowedUnits || ["px", "rem", "em", "%"],
        maxInlineStyles: policy?.styling?.maxInlineStyles || 0,
        requireCssModules: policy?.styling?.requireCssModules ?? false,
      },
      responsive: {
        breakpoints: policy?.responsive?.breakpoints || ["sm", "md", "lg", "xl"],
        requireMobileFirst: policy?.responsive?.requireMobileFirst ?? true,
        maxBreakpointViolations: policy?.responsive?.maxBreakpointViolations || 0,
      },
      states: {
        requireLoading: policy?.states?.requireLoading ?? true,
        requireError: policy?.states?.requireError ?? true,
        requireEmpty: policy?.states?.requireEmpty ?? false,
        requireDisabled: policy?.states?.requireDisabled ?? true,
      },
      accessibility: {
        requireAriaLabels: policy?.accessibility?.requireAriaLabels ?? true,
        requireFocusVisible: policy?.accessibility?.requireFocusVisible ?? true,
        maxColorContrastViolations: policy?.accessibility?.maxColorContrastViolations || 0,
      },
    };
  }

  /**
   * Check a file for design system violations
   */
  async checkFile(filePath: string): Promise<DesignSystemViolation[]> {
    const violations: DesignSystemViolation[] = [];
    const content = fs.readFileSync(filePath, "utf-8");
    const lines = content.split("\n");

    // Check component usage
    violations.push(...this.checkComponentUsage(filePath, lines));

    // Check styling
    violations.push(...this.checkStyling(filePath, lines));

    // Check responsive design
    violations.push(...this.checkResponsive(filePath, lines));

    // Check state handling
    violations.push(...this.checkStates(filePath, lines));

    // Check accessibility
    violations.push(...this.checkAccessibility(filePath, lines));

    return violations;
  }

  /**
   * Check component usage compliance
   */
  private checkComponentUsage(filePath: string, lines: string[]): DesignSystemViolation[] {
    const violations: DesignSystemViolation[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line) continue;

      // Check for forbidden components
      for (const forbidden of this.policy.components.forbidden) {
        const regex = new RegExp(`<${forbidden}[\\s>]`, "i");
        if (regex.test(line)) {
          violations.push({
            file: filePath,
            line: i + 1,
            type: "component",
            severity: "warning",
            message: `Forbidden HTML element <${forbidden}> used`,
            rule: "no-raw-html",
            suggestion: `Use a design system component instead of <${forbidden}>`,
          });
        }
      }

      // Check for inline styles
      if (line.includes("style={") || line.includes('style="')) {
        violations.push({
          file: filePath,
          line: i + 1,
          type: "style",
          severity: "error",
          message: "Inline styles detected",
          rule: "no-inline-styles",
          suggestion: "Use Tailwind CSS classes or CSS modules instead",
        });
      }
    }

    return violations;
  }

  /**
   * Check styling compliance
   */
  private checkStyling(filePath: string, lines: string[]): DesignSystemViolation[] {
    const violations: DesignSystemViolation[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line) continue;

      // Check for arbitrary values in Tailwind
      if (line.includes("[") && line.includes("]")) {
        const arbitraryMatch = line.match(/className.*\[([^\]]+)\]/);
        if (arbitraryMatch) {
          violations.push({
            file: filePath,
            line: i + 1,
            type: "style",
            severity: "warning",
            message: "Arbitrary Tailwind value detected",
            rule: "no-arbitrary-values",
            suggestion: "Use standard Tailwind scale or add to theme config",
          });
        }
      }

      // Check for !important ( Tailwind arbitrary property with !)
      if (line.includes("!")) {
        violations.push({
          file: filePath,
          line: i + 1,
          type: "style",
          severity: "warning",
          message: "!important detected in styles",
          rule: "no-important",
          suggestion: "Avoid !important; increase specificity instead",
        });
      }
    }

    return violations;
  }

  /**
   * Check responsive design compliance
   */
  private checkResponsive(filePath: string, lines: string[]): DesignSystemViolation[] {
    const violations: DesignSystemViolation[] = [];
    const content = lines.join("\n");

    // Check for media queries that aren't mobile-first
    const mediaQueryRegex = /@media\s*\(\s*(min-width|max-width)/g;
    let match;
    
    while ((match = mediaQueryRegex.exec(content)) !== null) {
      const isMaxWidth = match[1] === "max-width";
      
      if (this.policy.responsive.requireMobileFirst && isMaxWidth) {
        // Find line number
        const linesBefore = content.substring(0, match.index).split("\n");
        const lineNumber = linesBefore.length;

        violations.push({
          file: filePath,
          line: lineNumber,
          type: "responsive",
          severity: "warning",
          message: "max-width media query detected (not mobile-first)",
          rule: "mobile-first",
          suggestion: "Use min-width media queries for mobile-first approach",
        });
      }
    }

    return violations;
  }

  /**
   * Check state handling compliance
   */
  private checkStates(filePath: string, lines: string[]): DesignSystemViolation[] {
    const violations: DesignSystemViolation[] = [];
    const content = lines.join("\n");

    // Check for loading states
    if (this.policy.states.requireLoading) {
      const hasLoadingState = 
        content.includes("loading") || 
        content.includes("isLoading") ||
        content.includes("skeleton");
      
      if (!hasLoadingState && content.includes("useEffect")) {
        violations.push({
          file: filePath,
          line: 1,
          type: "state",
          severity: "info",
          message: "No loading state detected for async operation",
          rule: "require-loading-state",
          suggestion: "Add loading state for better UX during data fetching",
        });
      }
    }

    // Check for error handling
    if (this.policy.states.requireError) {
      const hasErrorState = 
        content.includes("error") || 
        content.includes("Error") ||
        content.includes("catch");
      
      if (!hasErrorState && content.includes("try")) {
        violations.push({
          file: filePath,
          line: 1,
          type: "state",
          severity: "error",
          message: "Missing error state handling",
          rule: "require-error-state",
          suggestion: "Add error boundary or error state for error handling",
        });
      }
    }

    return violations;
  }

  /**
   * Check accessibility compliance
   */
  private checkAccessibility(filePath: string, lines: string[]): DesignSystemViolation[] {
    const violations: DesignSystemViolation[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line) continue;

      // Check for missing aria-labels on interactive elements
      if (this.policy.accessibility.requireAriaLabels) {
        const interactiveRegex = /<(button|a|input|select|textarea)[^\u003e]*>/i;
        const hasAria = /aria-(label|labelledby|describedby)/i.test(line);
        
        if (interactiveRegex.test(line) && !hasAria && !line.includes("aria-hidden")) {
          violations.push({
            file: filePath,
            line: i + 1,
            type: "accessibility",
            severity: "error",
            message: "Interactive element missing accessible label",
            rule: "require-aria-labels",
            suggestion: "Add aria-label or aria-labelledby attribute",
          });
        }
      }

      // Check for images without alt
      if (line.includes("<img") && !line.includes("alt=")) {
        violations.push({
          file: filePath,
          line: i + 1,
          type: "accessibility",
          severity: "error",
          message: "Image missing alt attribute",
          rule: "require-alt-text",
          suggestion: "Add alt attribute for screen readers",
        });
      }

      // Check for onClick without keyboard handler
      if (line.includes("onClick=") && !line.includes("onKeyDown=") && !line.includes("tabIndex=")) {
        violations.push({
          file: filePath,
          line: i + 1,
          type: "accessibility",
          severity: "warning",
          message: "onClick without keyboard accessibility",
          rule: "require-keyboard-access",
          suggestion: "Add onKeyDown handler or use a button element",
        });
      }
    }

    return violations;
  }

  /**
   * Check entire project
   */
  async checkProject(projectPath: string): Promise<{
    violations: DesignSystemViolation[];
    summary: {
      filesChecked: number;
      errorCount: number;
      warningCount: number;
      infoCount: number;
    };
  }> {
    const violations: DesignSystemViolation[] = [];
    let filesChecked = 0;

    // Find all component files
    const componentFiles = this.findComponentFiles(projectPath);

    for (const file of componentFiles) {
      const fileViolations = await this.checkFile(file);
      violations.push(...fileViolations);
      filesChecked++;
    }

    const errorCount = violations.filter((v) => v.severity === "error").length;
    const warningCount = violations.filter((v) => v.severity === "warning").length;
    const infoCount = violations.filter((v) => v.severity === "info").length;

    // Log results
    this.logResults(projectPath, violations);

    return {
      violations,
      summary: {
        filesChecked,
        errorCount,
        warningCount,
        infoCount,
      },
    };
  }

  /**
   * Find component files in project
   */
  private findComponentFiles(projectPath: string): string[] {
    const files: string[] = [];
    const extensions = [".tsx", ".jsx", ".vue", ".svelte"];

    function scanDir(dir: string) {
      const entries = fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory() && !entry.name.startsWith(".") && entry.name !== "node_modules") {
          scanDir(fullPath);
        } else if (entry.isFile() && extensions.some((ext) => entry.name.endsWith(ext))) {
          files.push(fullPath);
        }
      }
    }

    scanDir(projectPath);
    return files;
  }

  /**
   * Log results to database
   */
  private logResults(projectPath: string, violations: DesignSystemViolation[]): void {
    const db = getDb();

    const stmt = db.prepare(`
      INSERT INTO design_system_violations (
        id, project_path, file, line, type, severity, message, rule, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const violation of violations) {
      stmt.run(
        randomUUID(),
        projectPath,
        violation.file,
        violation.line,
        violation.type,
        violation.severity,
        violation.message,
        violation.rule,
        new Date().toISOString()
      );
    }
  }

  /**
   * Generate report
   */
  generateReport(violations: DesignSystemViolation[]): string {
    if (violations.length === 0) {
      return "✅ No design system violations found!";
    }

    const grouped: Record<string, DesignSystemViolation[]> = {};
    for (const v of violations) {
      const sev = v.severity;
      grouped[sev] = grouped[sev] ?? [];
      grouped[sev].push(v);
    }

    const lines = [
      "📋 Design System Report",
      "=".repeat(60),
      "",
      `Total Violations: ${violations.length}`,
      `  Errors: ${grouped["error"]?.length || 0}`,
      `  Warnings: ${grouped["warning"]?.length || 0}`,
      `  Info: ${grouped["info"]?.length || 0}`,
      "",
    ];

    if (grouped["error"]) {
      lines.push("❌ Errors:", ...grouped["error"].map((v) => `  ${v.file}:${v.line} - ${v.message}`), "");
    }

    if (grouped["warning"]) {
      lines.push("⚠️  Warnings:", ...grouped["warning"].map((v) => `  ${v.file}:${v.line} - ${v.message}`), "");
    }

    if (grouped["info"]) {
      lines.push("ℹ️  Info:", ...grouped["info"].map((v) => `  ${v.file}:${v.line} - ${v.message}`), "");
    }

    return lines.join("\n");
  }
}

// Singleton instance
export const designSystemEnforcer = new DesignSystemPolicyEnforcer();

/**
 * Quick check function
 */
export async function checkDesignSystem(projectPath: string): Promise<{
  passed: boolean;
  report: string;
}> {
  const { violations } = await designSystemEnforcer.checkProject(projectPath);
  const errors = violations.filter((v) => v.severity === "error");
  
  return {
    passed: errors.length === 0,
    report: designSystemEnforcer.generateReport(violations),
  };
}
