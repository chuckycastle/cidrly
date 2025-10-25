#!/bin/bash
#
# cidrly Health Check Script
#
# Usage: ./scripts/health-check.sh [target]
# Targets: local, docker, npm
#

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
TARGET="${1:-local}"
EXIT_CODE=0

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[PASS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[FAIL]${NC} $1"
    EXIT_CODE=1
}

check_section() {
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

# Health checks
check_node_version() {
    if command -v node &> /dev/null; then
        VERSION=$(node -v)
        log_success "Node.js installed: $VERSION"

        MAJOR_VERSION=$(echo $VERSION | cut -d'v' -f2 | cut -d'.' -f1)
        if [ "$MAJOR_VERSION" -ge 18 ]; then
            log_success "Node.js version meets requirements (>=18)"
        else
            log_error "Node.js version too old (need >=18, have $VERSION)"
        fi
    else
        log_error "Node.js not installed"
    fi
}

check_npm_version() {
    if command -v npm &> /dev/null; then
        VERSION=$(npm -v)
        log_success "npm installed: v$VERSION"
    else
        log_error "npm not installed"
    fi
}

check_dependencies() {
    if [ -f "package.json" ]; then
        log_success "package.json found"

        if [ -d "node_modules" ]; then
            log_success "node_modules directory exists"

            # Count installed packages
            PACKAGE_COUNT=$(find node_modules -maxdepth 1 -type d | wc -l)
            log_info "Installed packages: ~$PACKAGE_COUNT"
        else
            log_error "node_modules directory not found (run: npm install)"
        fi
    else
        log_error "package.json not found"
    fi
}

check_build_artifacts() {
    if [ -d "dist" ]; then
        log_success "dist directory exists"

        if [ -f "dist/cli.js" ]; then
            log_success "Main entry file exists: dist/cli.js"
        else
            log_error "Main entry file not found: dist/cli.js"
        fi

        if [ -d "dist/commands" ]; then
            log_success "Commands directory exists"
        else
            log_error "Commands directory not found"
        fi

        if [ -d "dist/components" ]; then
            log_success "Components directory exists"
        else
            log_error "Components directory not found"
        fi

        # Check for source maps (should not exist in production)
        MAP_COUNT=$(find dist -name "*.map" 2>/dev/null | wc -l)
        if [ "$MAP_COUNT" -eq 0 ]; then
            log_success "No source maps in dist (production build)"
        else
            log_warning "Found $MAP_COUNT source maps in dist (development build?)"
        fi
    else
        log_error "dist directory not found (run: npm run build)"
    fi
}

check_cli_executable() {
    if [ -f "dist/cli.js" ]; then
        # Check shebang
        SHEBANG=$(head -n 1 dist/cli.js)
        if [[ "$SHEBANG" == "#!/usr/bin/env node" ]]; then
            log_success "CLI has correct shebang"
        else
            log_error "CLI missing shebang: $SHEBANG"
        fi

        # Try to run CLI
        if node dist/cli.js --help &> /dev/null; then
            log_success "CLI executable (help command works)"
        else
            log_error "CLI not executable or --help failed"
        fi
    else
        log_error "CLI file not found"
    fi
}

check_tests() {
    if [ -d "tests" ]; then
        log_success "Tests directory exists"

        # Run tests
        if npm test &> /dev/null; then
            log_success "All tests passing"
        else
            log_error "Tests failing (run: npm test)"
        fi
    else
        log_warning "Tests directory not found"
    fi
}

check_docker() {
    if command -v docker &> /dev/null; then
        VERSION=$(docker --version)
        log_success "Docker installed: $VERSION"

        # Check if docker daemon is running
        if docker ps &> /dev/null; then
            log_success "Docker daemon running"
        else
            log_error "Docker daemon not running"
        fi

        # Check Dockerfile
        if [ -f "Dockerfile" ]; then
            log_success "Dockerfile exists"
        else
            log_error "Dockerfile not found"
        fi

        # Check docker-compose
        if [ -f "docker-compose.yml" ]; then
            log_success "docker-compose.yml exists"
        else
            log_error "docker-compose.yml not found"
        fi
    else
        log_warning "Docker not installed (optional)"
    fi
}

check_docker_image() {
    if docker images | grep -q "cidrly"; then
        log_success "Docker image 'cidrly' found"

        # Try to run health check
        if docker run --rm cidrly:latest node -e "console.log('healthy')" &> /dev/null; then
            log_success "Docker container health check passed"
        else
            log_error "Docker container health check failed"
        fi
    else
        log_error "Docker image 'cidrly' not found (run: docker compose build)"
    fi
}

check_security() {
    # Check for known vulnerabilities
    log_info "Running npm audit..."
    if npm audit --audit-level=high &> /dev/null; then
        log_success "No high-severity vulnerabilities found"
    else
        log_warning "Vulnerabilities found (run: npm audit)"
    fi

    # Check for .env files in git
    if git ls-files | grep -q "\.env$"; then
        log_error ".env file tracked in git (security risk!)"
    else
        log_success "No .env files in git"
    fi
}

check_git() {
    if [ -d ".git" ]; then
        log_success "Git repository initialized"

        # Check for uncommitted changes
        if git diff-index --quiet HEAD -- 2>/dev/null; then
            log_success "No uncommitted changes"
        else
            log_warning "Uncommitted changes detected"
        fi

        # Check current branch
        BRANCH=$(git branch --show-current 2>/dev/null)
        log_info "Current branch: $BRANCH"
    else
        log_warning "Not a git repository"
    fi
}

# Target-specific health checks
health_check_local() {
    check_section "System Requirements"
    check_node_version
    check_npm_version

    check_section "Dependencies"
    check_dependencies

    check_section "Build Artifacts"
    check_build_artifacts
    check_cli_executable

    check_section "Tests"
    check_tests

    check_section "Security"
    check_security

    check_section "Version Control"
    check_git
}

health_check_docker() {
    check_section "Docker Environment"
    check_docker
    check_docker_image

    check_section "Build Artifacts"
    check_build_artifacts
}

health_check_npm() {
    check_section "NPM Package"

    # Check if installed globally
    if command -v cidrly &> /dev/null; then
        VERSION=$(cidrly --version 2>/dev/null || echo "unknown")
        log_success "cidrly installed globally: $VERSION"

        # Try to run
        if cidrly --help &> /dev/null; then
            log_success "Global installation works"
        else
            log_error "Global installation broken"
        fi
    else
        log_error "cidrly not installed globally"
    fi
}

# Main
main() {
    echo ""
    echo -e "${GREEN}╔═══════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║   cidrly Health Check                ║${NC}"
    echo -e "${GREEN}╚═══════════════════════════════════════╝${NC}"

    case "$TARGET" in
        local)
            health_check_local
            ;;
        docker)
            health_check_docker
            ;;
        npm)
            health_check_npm
            ;;
        all)
            health_check_local
            health_check_docker
            health_check_npm
            ;;
        *)
            log_error "Unknown target: $TARGET"
            log_info "Usage: $0 [local|docker|npm|all]"
            exit 1
            ;;
    esac

    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

    if [ $EXIT_CODE -eq 0 ]; then
        echo -e "${GREEN}✓ All health checks passed!${NC}"
    else
        echo -e "${RED}✗ Some health checks failed${NC}"
    fi

    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""

    exit $EXIT_CODE
}

main
