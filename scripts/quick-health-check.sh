#!/usr/bin/env bash
# Quick health check - run this anytime to verify Sophia is working

echo -e "\n🔍 Sophia Code Quick Health Check\n"

PASS=0
FAIL=0

check() {
    if eval "$2" > /dev/null 2>&1; then
        echo -e "✅ $1"
        ((PASS++))
    else
        echo -e "❌ $1"
        ((FAIL++))
    fi
}

echo "CLI Commands:"
check "sophia --version" "sophia --version"
check "sophia status" "cd packages/cli && node dist/index.js status"
check "sophia session list" "sophia session list"

echo -e "\nDashboard API:"
check "Overview endpoint" "curl -s http://localhost:9473/api/overview | grep -q 'success'"
check "Sessions endpoint" "curl -s http://localhost:9473/api/sessions | grep -q 'sessions'"
check "Health endpoint" "curl -s http://localhost:9473/api/health | grep -q 'health'"

echo -e "\nDatabase:"
check "Database exists" "test -f .sophia/sophia.db"
check "Config exists" "test -f .sophia/config.yaml"

echo -e "\nBuild Status:"
check "CLI built" "test -f packages/cli/dist/index.js"
check "Dashboard built" "test -d packages/dashboard/.next"

echo -e "\n📊 Results: $PASS passed, $FAIL failed"

if [ $FAIL -eq 0 ]; then
    echo -e "🎉 All systems operational!\n"
    exit 0
else
    echo -e "⚠️  Some checks failed\n"
    exit 1
fi
