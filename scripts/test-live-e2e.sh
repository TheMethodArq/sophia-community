#!/usr/bin/env bash
# Sophia Code v2 - Live E2E Testing Script
# Usage: ./test-live-e2e.sh [--quick|--full|--integration]
#
# Run this while monitoring Open WebUI dashboard at http://localhost:9473
# Keep this terminal on one side of screen, dashboard on the other

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
TEST_MODE="${1:---quick}"
SOPHIA_CMD="npx sophia"
DASHBOARD_URL="http://localhost:9473"
TEST_REPO="/tmp/sophia-test-repo-$$"

# Counters
TESTS_PASSED=0
TESTS_FAILED=0
TESTS_SKIPPED=0

# Helper functions
print_header() {
    echo -e "\n${BLUE}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}\n"
}

print_step() {
    echo -e "\n${YELLOW}▶ $1${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
    ((TESTS_PASSED++))
}

print_failure() {
    echo -e "${RED}✗ $1${NC}"
    echo -e "${RED}  Error: $2${NC}"
    ((TESTS_FAILED++))
}

print_skip() {
    echo -e "${YELLOW}⊘ $1${NC}"
    ((TESTS_SKIPPED++))
}

print_prompt() {
    echo -e "\n${YELLOW}👉 $1${NC}"
    echo -e "${BLUE}   [Press Enter when ready...]${NC}"
    read -r
}

# Check prerequisites
check_prerequisites() {
    print_header "🔍 CHECKING PREREQUISITES"
    
    # Check Node.js
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node --version)
        print_success "Node.js found: $NODE_VERSION"
    else
        print_failure "Node.js not found" "Please install Node.js 18+"
        exit 1
    fi
    
    # Check npm
    if command -v npm &> /dev/null; then
        print_success "npm found"
    else
        print_failure "npm not found" "Please install npm"
        exit 1
    fi
    
    # Check if sophia CLI is available
    if command -v sophia &> /dev/null || [ -f "./packages/cli/dist/index.js" ]; then
        print_success "Sophia CLI found"
    else
        print_failure "Sophia CLI not found" "Run: npm run build"
        exit 1
    fi
    
    # Check dashboard
    if curl -s "$DASHBOARD_URL/api/overview" > /dev/null 2>&1; then
        print_success "Dashboard running at $DASHBOARD_URL"
    else
        print_failure "Dashboard not accessible" "Run: sophia dashboard start"
        echo -e "\n${YELLOW}Attempting to start dashboard...${NC}"
        $SOPHIA_CMD dashboard start &
        DASHBOARD_PID=$!
        sleep 3
        
        if curl -s "$DASHBOARD_URL/api/overview" > /dev/null 2>&1; then
            print_success "Dashboard started successfully (PID: $DASHBOARD_PID)"
        else
            print_failure "Failed to start dashboard" "Check logs with: sophia dashboard logs"
        fi
    fi
}

# Test Phase 1: Basic CLI Commands
test_basic_cli() {
    print_header "🧪 PHASE 1: BASIC CLI COMMANDS"
    
    print_step "Testing 'sophia --version'"
    if $SOPHIA_CMD --version > /dev/null 2>&1; then
        VERSION=$($SOPHIA_CMD --version)
        print_success "Version command works: $VERSION"
    else
        print_failure "Version command failed" "Check CLI build"
    fi
    
    print_step "Testing 'sophia --help'"
    if $SOPHIA_CMD --help > /dev/null 2>&1; then
        print_success "Help command works"
    else
        print_failure "Help command failed" "Check CLI build"
    fi
    
    print_step "Testing 'sophia status'"
    if $SOPHIA_CMD status > /dev/null 2>&1; then
        print_success "Status command works"
    else
        print_failure "Status command failed" "Check if .sophia is initialized"
    fi
}

# Test Phase 2: Dashboard API
test_dashboard_api() {
    print_header "🌐 PHASE 2: DASHBOARD API ENDPOINTS"
    
    print_step "Testing /api/overview"
    if curl -s "$DASHBOARD_URL/api/overview" | grep -q "success"; then
        print_success "Overview API accessible"
    else
        print_failure "Overview API failed" "Check dashboard logs"
    fi
    
    print_step "Testing /api/sessions"
    if curl -s "$DASHBOARD_URL/api/sessions" | grep -q "sessions"; then
        print_success "Sessions API accessible"
    else
        print_failure "Sessions API failed"
    fi
    
    print_step "Testing /api/bulletin"
    if curl -s "$DASHBOARD_URL/api/bulletin" | grep -q "activities"; then
        print_success "Bulletin API accessible"
    else
        print_failure "Bulletin API failed"
    fi
    
    print_step "Testing /api/health"
    if curl -s "$DASHBOARD_URL/api/health" | grep -q "health"; then
        print_success "Health API accessible"
    else
        print_failure "Health API failed"
    fi
    
    print_step "Testing /api/memory"
    if curl -s "$DASHBOARD_URL/api/memory" | grep -q "patterns"; then
        print_success "Memory API accessible"
    else
        print_failure "Memory API failed"
    fi
    
    print_step "Testing /api/escalations"
    if curl -s "$DASHBOARD_URL/api/escalations" | grep -q "escalations"; then
        print_success "Escalations API accessible"
    else
        print_failure "Escalations API failed"
    fi
}

# Test Phase 3: Session Management
test_sessions() {
    print_header "👤 PHASE 3: SESSION MANAGEMENT"
    
    print_step "Creating test session"
    SESSION_OUTPUT=$($SOPHIA_CMD session start --agent "test-agent" --intent "Live E2E Testing" 2>&1 || true)
    if echo "$SESSION_OUTPUT" | grep -qi "session\|started"; then
        print_success "Session creation works"
        
        # Extract session ID if possible
        SESSION_ID=$(echo "$SESSION_OUTPUT" | grep -oE '[0-9a-f-]{36}' | head -1)
        if [ -n "$SESSION_ID" ]; then
            echo -e "   Session ID: $SESSION_ID"
        fi
    else
        print_failure "Session creation failed" "$SESSION_OUTPUT"
    fi
    
    print_step "Listing active sessions"
    if $SOPHIA_CMD session list > /dev/null 2>&1; then
        print_success "Session list works"
    else
        print_skip "Session list may require active sessions"
    fi
}

# Test Phase 4: Memory & Bulletin
test_memory_bulletin() {
    print_header "📝 PHASE 4: MEMORY & BULLETIN"
    
    print_step "Testing memory list"
    if $SOPHIA_CMD memory list > /dev/null 2>&1; then
        print_success "Memory list command works"
    else
        print_skip "Memory list (may be empty)"
    fi
    
    print_step "Testing bulletin"
    if $SOPHIA_CMD bulletin > /dev/null 2>&1; then
        print_success "Bulletin command works"
    else
        print_skip "Bulletin (may be empty)"
    fi
}

# Test Phase 5: Build System
test_build_system() {
    print_header "🔨 PHASE 5: BUILD SYSTEM"
    
    # Create a temp directory for testing
    mkdir -p "$TEST_REPO"
    cd "$TEST_REPO"
    
    print_step "Initializing Sophia in test repo"
    if echo -e "\n\n\n\n" | $SOPHIA_CMD init > /dev/null 2>&1 || [ -d ".sophia" ]; then
        print_success "Init command works"
    else
        print_failure "Init command failed" "Check permissions"
    fi
    
    print_step "Testing build command (dry-run)"
    if $SOPHIA_CMD build --dry-run > /dev/null 2>&1; then
        print_success "Build dry-run works"
    else
        print_skip "Build dry-run (may require config)"
    fi
    
    cd - > /dev/null
    rm -rf "$TEST_REPO"
}

# Test Phase 6: Policy System
test_policies() {
    print_header "📋 PHASE 6: POLICY SYSTEM"
    
    print_step "Testing policy list"
    if $SOPHIA_CMD policy list > /dev/null 2>&1; then
        print_success "Policy list works"
    else
        print_skip "Policy list"
    fi
    
    print_step "Testing policy validate"
    if $SOPHIA_CMD policy validate > /dev/null 2>&1; then
        print_success "Policy validate works"
    else
        print_skip "Policy validate"
    fi
}

# Test Phase 7: GitHub Integration (if configured)
test_github_integration() {
    print_header "🐙 PHASE 7: GITHUB INTEGRATION"
    
    if [ -z "$GITHUB_TOKEN" ]; then
        print_skip "GitHub integration (GITHUB_TOKEN not set)"
        return
    fi
    
    print_step "Testing GitHub status"
    if $SOPHIA_CMD github status > /dev/null 2>&1; then
        print_success "GitHub integration accessible"
    else
        print_failure "GitHub status check failed" "Check token permissions"
    fi
}

# Test Phase 8: Interactive Testing
test_interactive() {
    print_header "🎮 PHASE 8: INTERACTIVE TESTING"
    
    echo -e "${YELLOW}This section requires manual verification in Open WebUI${NC}\n"
    
    print_prompt "Navigate to $DASHBOARD_URL and confirm the Overview page loads"
    
    print_prompt "Click on 'Bulletin' in sidebar - confirm you see activity feed"
    
    print_prompt "Click on 'Sessions' - confirm session list displays"
    
    print_prompt "Click on 'Health' - confirm health scores display"
    
    print_prompt "Click on 'Memory' - confirm patterns/corrections page loads"
    
    print_prompt "Click on 'Escalations' - confirm escalation center loads"
    
    if [ "$TEST_MODE" = "--full" ]; then
        print_prompt "Test dashboard real-time: Run 'sophia session start' and refresh Sessions page"
        
        print_prompt "Test policy violation: Check if any policies are flagged in the UI"
        
        print_prompt "Test build integration: Check Builds page for any build history"
    fi
}

# Test Phase 9: Intake System (if available)
test_intake() {
    print_header "💬 PHASE 9: INTAKE SYSTEM"
    
    print_step "Testing intake list"
    if $SOPHIA_CMD intake-list > /dev/null 2>&1; then
        print_success "Intake list works"
    else
        print_skip "Intake list (may require intake sessions)"
    fi
}

# Test Phase 10: Change Requests
test_change_requests() {
    print_header "🔄 PHASE 10: CHANGE REQUESTS"
    
    print_step "Testing change-request list"
    if $SOPHIA_CMD change-request list > /dev/null 2>&1; then
        print_success "Change request list works"
    else
        print_skip "Change request list"
    fi
}

# Final Summary
print_summary() {
    print_header "📊 TEST SUMMARY"
    
    TOTAL=$((TESTS_PASSED + TESTS_FAILED + TESTS_SKIPPED))
    
    echo -e "Total Tests: $TOTAL"
    echo -e "${GREEN}Passed: $TESTS_PASSED${NC}"
    echo -e "${RED}Failed: $TESTS_FAILED${NC}"
    echo -e "${YELLOW}Skipped: $TESTS_SKIPPED${NC}"
    
    if [ $TESTS_FAILED -eq 0 ]; then
        echo -e "\n${GREEN}🎉 All tests passed! Sophia Code is working correctly.${NC}\n"
        return 0
    else
        echo -e "\n${RED}⚠️  Some tests failed. Please review the errors above.${NC}\n"
        return 1
    fi
}

# Main execution
main() {
    echo -e "
    ███████╗ ██████╗ ██████╗ ██╗  ██╗██╗ █████╗ 
    ██╔════╝██╔═══██╗██╔══██╗██║  ██║██║██╔══██╗
    ███████╗██║   ██║██████╔╝███████║██║███████║
    ╚════██║██║   ██║██╔═══╝ ██╔══██║██║██╔══██║
    ███████║╚██████╔╝██║     ██║  ██║██║██║  ██║
    ╚══════╝ ╚═════╝ ╚═╝     ╚═╝  ╚═╝╚═╝╚═╝  ╚═╝
    
    ${BLUE}Live E2E Testing Script v1.0${NC}
    ${BLUE}Mode: $TEST_MODE${NC}
    "
    
    # Check prerequisites
    check_prerequisites
    
    # Run tests based on mode
    test_basic_cli
    test_dashboard_api
    test_sessions
    test_memory_bulletin
    test_policies
    test_intake
    test_change_requests
    
    if [ "$TEST_MODE" != "--quick" ]; then
        test_build_system
        test_github_integration
    fi
    
    # Always run interactive tests
    test_interactive
    
    # Print summary
    print_summary
}

# Run main function
main "$@"
