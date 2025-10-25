#!/bin/bash
#
# cidrly Deployment Script
#
# Usage: ./scripts/deploy.sh [environment]
# Environments: local, docker, production
#

set -e  # Exit on error
set -u  # Exit on undefined variable
set -o pipefail  # Exit on pipe failure

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT="${1:-local}"
PROJECT_NAME="cidrly"
VERSION=$(node -p "require('./package.json').version")
BUILD_DIR="dist"

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_prerequisites() {
    log_info "Checking prerequisites..."

    # Check Node.js
    if ! command -v node &> /dev/null; then
        log_error "Node.js is not installed"
        exit 1
    fi

    # Check npm
    if ! command -v npm &> /dev/null; then
        log_error "npm is not installed"
        exit 1
    fi

    # Check required Node version
    REQUIRED_NODE_VERSION="18"
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)

    if [ "$NODE_VERSION" -lt "$REQUIRED_NODE_VERSION" ]; then
        log_error "Node.js version $REQUIRED_NODE_VERSION or higher is required (found: v$NODE_VERSION)"
        exit 1
    fi

    log_success "Prerequisites check passed"
}

run_tests() {
    log_info "Running tests..."
    npm run test || {
        log_error "Tests failed"
        exit 1
    }
    log_success "Tests passed"
}

run_linter() {
    log_info "Running linter..."
    npm run lint || {
        log_error "Linting failed"
        exit 1
    }
    log_success "Linting passed"
}

run_security_scan() {
    log_info "Running security scan..."
    npm run security || {
        log_warning "Security scan found issues"
    }
}

clean_build() {
    log_info "Cleaning build artifacts..."
    npm run clean
    log_success "Build artifacts cleaned"
}

build_production() {
    log_info "Building production bundle..."
    npm run build:prod || {
        log_error "Production build failed"
        exit 1
    }
    log_success "Production build completed"
}

verify_build() {
    log_info "Verifying build artifacts..."

    if [ ! -f "$BUILD_DIR/cli.js" ]; then
        log_error "Main entry file not found: $BUILD_DIR/cli.js"
        exit 1
    fi

    if [ ! -d "$BUILD_DIR/commands" ]; then
        log_error "Commands directory not found: $BUILD_DIR/commands"
        exit 1
    fi

    if [ ! -d "$BUILD_DIR/components" ]; then
        log_error "Components directory not found: $BUILD_DIR/components"
        exit 1
    fi

    log_success "Build verification passed"
}

deploy_local() {
    log_info "Deploying to local environment..."

    check_prerequisites
    run_tests
    run_linter
    run_security_scan
    clean_build
    build_production
    verify_build

    log_success "Local deployment completed successfully!"
    log_info "Test with: node dist/cli.js"
}

deploy_docker() {
    log_info "Deploying to Docker..."

    # Check Docker
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed"
        exit 1
    fi

    check_prerequisites
    run_tests
    run_linter
    run_security_scan

    log_info "Building Docker image..."
    docker compose build || {
        log_error "Docker build failed"
        exit 1
    }

    log_info "Starting Docker containers..."
    docker compose up -d || {
        log_error "Docker compose up failed"
        exit 1
    }

    log_success "Docker deployment completed successfully!"
    log_info "View logs with: docker compose logs -f"
    log_info "Stop with: docker compose down"
}

deploy_production() {
    log_info "Deploying to production environment..."

    log_warning "This will deploy version $VERSION to production"
    read -p "Are you sure you want to continue? (y/N) " -n 1 -r
    echo

    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_info "Deployment cancelled"
        exit 0
    fi

    check_prerequisites

    log_info "Running full verification suite..."
    npm run verify || {
        log_error "Verification failed"
        exit 1
    }

    clean_build
    build_production
    verify_build

    log_info "Creating package..."
    npm pack || {
        log_error "Package creation failed"
        exit 1
    }

    PACKAGE_FILE="${PROJECT_NAME}-${VERSION}.tgz"

    log_success "Production deployment package created: $PACKAGE_FILE"
    log_info "Next steps:"
    log_info "  1. Test the package: npm install -g $PACKAGE_FILE"
    log_info "  2. Publish to npm: npm publish"
    log_info "  3. Tag release: git tag v$VERSION && git push --tags"
}

# Main deployment logic
main() {
    log_info "Starting $PROJECT_NAME deployment (v$VERSION)"
    log_info "Environment: $ENVIRONMENT"
    echo ""

    case "$ENVIRONMENT" in
        local)
            deploy_local
            ;;
        docker)
            deploy_docker
            ;;
        production|prod)
            deploy_production
            ;;
        *)
            log_error "Unknown environment: $ENVIRONMENT"
            log_info "Usage: $0 [local|docker|production]"
            exit 1
            ;;
    esac

    echo ""
    log_success "Deployment completed successfully! 🚀"
}

# Run main function
main
