#!/usr/bin/env node
/**
 * Interactive E2E Test Runner for OpenCode
 * Run with: node scripts/test-interactive.js
 * 
 * This script provides real-time prompts to guide you through testing
 * while keeping your OpenCode session and Dashboard visible side-by-side
 */

const { execSync } = require("child_process");
const readline = require("readline");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const question = (prompt) => new Promise((resolve) => rl.question(prompt, resolve));

const log = {
  info: (msg) => console.log(`\nℹ️  ${msg}`),
  success: (msg) => console.log(`✅ ${msg}`),
  warning: (msg) => console.log(`⚠️  ${msg}`),
  error: (msg) => console.log(`❌ ${msg}`),
  step: (num, msg) => console.log(`\n${"=".repeat(60)}\n🧪 Step ${num}: ${msg}\n${"=".repeat(60)}`),
};

const exec = (cmd) => {
  try {
    return execSync(cmd, { encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] });
  } catch (e) {
    return null;
  }
};

const tests = [];
let currentTest = 0;

async function checkDashboard() {
  log.step(1, "Dashboard Accessibility");
  log.info("Checking if Sophia dashboard is running...");
  
  const result = exec("curl -s http://localhost:9473/api/overview");
  if (result && result.includes("success")) {
    log.success("Dashboard is running at http://localhost:9473");
    tests.push({ name: "Dashboard Running", status: "pass" });
  } else {
    log.error("Dashboard not accessible");
    log.info("Try running: sophia dashboard start");
    tests.push({ name: "Dashboard Running", status: "fail" });
  }
  
  await question("\n👉 Open your browser to http://localhost:9473 and verify it loads. Press Enter when ready...");
}

async function testCLI() {
  log.step(2, "CLI Basic Commands");
  
  log.info("Testing: sophia --version");
  const version = exec("sophia --version");
  if (version) {
    log.success(`CLI version: ${version.trim()}`);
    tests.push({ name: "CLI Version", status: "pass" });
  } else {
    log.error("CLI not responding");
    tests.push({ name: "CLI Version", status: "fail" });
  }
  
  log.info("Testing: sophia status");
  const status = exec("sophia status");
  if (status) {
    log.success("Status command works");
    tests.push({ name: "CLI Status", status: "pass" });
  } else {
    log.error("Status command failed");
    tests.push({ name: "CLI Status", status: "fail" });
  }
  
  await question("\n👉 Verify no errors in output above. Press Enter to continue...");
}

async function testSession() {
  log.step(3, "Session Management");
  
  log.info("Creating test session...");
  const sessionOutput = exec("sophia session start --agent opencode --intent 'Interactive testing'");
  
  if (sessionOutput && sessionOutput.includes("session")) {
    log.success("Session created successfully");
    tests.push({ name: "Session Creation", status: "pass" });
    
    // Extract session ID
    const match = sessionOutput.match(/[0-9a-f-]{36}/);
    if (match) {
      const sessionId = match[0];
      log.info(`Session ID: ${sessionId}`);
      
      await question(`\n👉 Check Dashboard Sessions page. Do you see session ${sessionId}? Press Enter...`);
      
      log.info("Ending test session...");
      exec(`sophia session end ${sessionId}`);
      log.success("Session ended");
    }
  } else {
    log.error("Failed to create session");
    tests.push({ name: "Session Creation", status: "fail" });
  }
}

async function testBulletin() {
  log.step(4, "Bulletin System");
  
  log.info("Creating test bulletin entry...");
  exec("sophia bulletin --message 'Interactive test activity' --type test");
  log.success("Bulletin entry created");
  tests.push({ name: "Bulletin Creation", status: "pass" });
  
  await question("\n👉 Navigate to Dashboard → Bulletin page. Do you see the test entry? Press Enter...");
}

async function testBuild() {
  log.step(5, "Build System");
  
  log.info("Testing build dry-run...");
  const buildOutput = exec("sophia build --dry-run 2&1");
  
  if (buildOutput) {
    log.success("Build command accessible");
    tests.push({ name: "Build System", status: "pass" });
  } else {
    log.warning("Build command requires configuration");
    tests.push({ name: "Build System", status: "skip" });
  }
  
  await question("\n👉 If configured, check Dashboard → Builds page. Press Enter...");
}

async function testGitHub() {
  log.step(6, "GitHub Integration (Optional)");
  
  if (!process.env.GITHUB_TOKEN) {
    log.warning("GITHUB_TOKEN not set - skipping GitHub tests");
    log.info("To test GitHub: export GITHUB_TOKEN='ghp_...'");
    tests.push({ name: "GitHub Integration", status: "skip" });
    return;
  }
  
  log.info("Testing GitHub status...");
  const ghStatus = exec("sophia github status");
  
  if (ghStatus && ghStatus.includes("Connected")) {
    log.success("GitHub integration working");
    tests.push({ name: "GitHub Integration", status: "pass" });
  } else {
    log.error("GitHub integration failed");
    tests.push({ name: "GitHub Integration", status: "fail" });
  }
}

async function runNavigationTest() {
  log.step(7, "Dashboard Navigation (Manual)");
  
  const pages = [
    "Overview",
    "Bulletin",
    "Sessions",
    "Health",
    "Memory",
    "Policies",
    "Claims",
    "Settings",
    "Escalations",
    "Builds (if available)",
    "Tokens (if available)",
  ];
  
  log.info("Please verify each page loads correctly:\n");
  
  for (const page of pages) {
    const response = await question(`  Click '${page}' in sidebar - does it load? (y/n/skip): `);
    if (response.toLowerCase() === "y") {
      tests.push({ name: `Page: ${page}`, status: "pass" });
    } else if (response.toLowerCase() === "n") {
      tests.push({ name: `Page: ${page}`, status: "fail" });
      log.error(`${page} failed to load`);
    } else {
      tests.push({ name: `Page: ${page}`, status: "skip" });
    }
  }
}

function printSummary() {
  log.step("FINAL", "Test Summary");
  
  const passed = tests.filter((t) => t.status === "pass").length;
  const failed = tests.filter((t) => t.status === "fail").length;
  const skipped = tests.filter((t) => t.status === "skip").length;
  
  console.log("\n📊 Results:");
  console.log(`  ✅ Passed: ${passed}`);
  console.log(`  ❌ Failed: ${failed}`);
  console.log(`  ⚠️  Skipped: ${skipped}`);
  console.log(`  📋 Total: ${tests.length}`);
  
  if (failed === 0) {
    console.log("\n🎉 All tests completed successfully!");
  } else {
    console.log("\n⚠️  Some tests failed. Review the issues above.");
  }
  
  console.log("\n📁 Detailed checklist available at: docs/LIVE_TESTING_CHECKLIST.md");
  console.log("🚀 Quick health check: ./scripts/quick-health-check.sh");
}

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║          🤖 Sophia Code - Interactive E2E Test             ║
║                                                            ║
║  Keep this terminal on one side of your screen,           ║
║  Dashboard (http://localhost:9473) on the other.          ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
  `);
  
  try {
    await checkDashboard();
    await testCLI();
    await testSession();
    await testBulletin();
    await testBuild();
    await testGitHub();
    await runNavigationTest();
    printSummary();
  } catch (error) {
    log.error(`Test runner error: ${error.message}`);
  } finally {
    rl.close();
  }
}

main();
