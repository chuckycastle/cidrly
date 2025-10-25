#!/usr/bin/env bash
# Pre-push verification script
# Runs all CI checks locally to catch issues before pushing to GitHub

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Track overall status
FAILED=0

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Running Pre-Push Verification${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Function to run a check
run_check() {
    local name="$1"
    local command="$2"

    echo -e "${YELLOW}▶ ${name}${NC}"

    if eval "$command"; then
        echo -e "${GREEN}✓ ${name} passed${NC}"
        echo ""
        return 0
    else
        echo -e "${RED}✗ ${name} failed${NC}"
        echo ""
        FAILED=1
        return 1
    fi
}

# 1. Linting
run_check "ESLint" "npm run lint"

# 2. Formatting
run_check "Prettier formatting check" "npm run format:check"

# 3. Type checking (build TypeScript)
run_check "TypeScript compilation" "npm run build"

# 4. Tests (matches CI behavior)
run_check "Tests" "npm test"

# Note: Coverage thresholds are checked but don't block in CI
echo -e "${YELLOW}▶ Running coverage analysis (non-blocking)${NC}"
if npm run test:coverage 2>&1 | tee /tmp/coverage-output.log; then
    echo -e "${GREEN}✓ Coverage analysis completed${NC}"
    echo ""
else
    echo -e "${YELLOW}⚠ Coverage below thresholds (reported but non-blocking)${NC}"
    echo ""
fi

# 5. Security scanning
echo -e "${YELLOW}▶ Security scanning (semgrep)${NC}"
if command -v semgrep &> /dev/null; then
    if npm run security 2>&1 | tee /tmp/semgrep-output.log; then
        echo -e "${GREEN}✓ Security scan completed${NC}"
        echo ""
    else
        echo -e "${YELLOW}⚠ Security scan found issues (non-blocking)${NC}"
        echo ""
    fi
else
    echo -e "${YELLOW}⚠ Semgrep not installed, skipping security scan${NC}"
    echo ""
fi

# 6. NPM Audit
echo -e "${YELLOW}▶ NPM audit (high severity)${NC}"
if npm audit --audit-level=high 2>&1 | tee /tmp/npm-audit.log; then
    echo -e "${GREEN}✓ NPM audit passed${NC}"
    echo ""
else
    echo -e "${YELLOW}⚠ NPM audit found issues (non-blocking)${NC}"
    echo ""
fi

# 7. Production build verification
run_check "Production build" "npm run build:prod"

# Verify build artifacts
echo -e "${YELLOW}▶ Verifying build artifacts${NC}"
if [ -f "dist/cli.js" ] && [ -d "dist/commands" ] && [ -d "dist/components" ]; then
    echo -e "${GREEN}✓ Build artifacts verified${NC}"
    echo ""
else
    echo -e "${RED}✗ Build artifacts verification failed${NC}"
    echo ""
    FAILED=1
fi

# Summary
echo -e "${BLUE}========================================${NC}"
if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All checks passed!${NC}"
    echo -e "${GREEN}Safe to push to GitHub${NC}"
    echo -e "${BLUE}========================================${NC}"
    exit 0
else
    echo -e "${RED}✗ Some checks failed${NC}"
    echo -e "${RED}Please fix the issues before pushing${NC}"
    echo -e "${BLUE}========================================${NC}"
    exit 1
fi
