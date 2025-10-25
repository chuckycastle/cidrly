#!/usr/bin/env bash
# Setup Git hooks for local validation

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Setting up Git hooks${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Get the Git hooks directory
GIT_HOOKS_DIR=".git/hooks"

if [ ! -d "$GIT_HOOKS_DIR" ]; then
    echo -e "${YELLOW}⚠ Git hooks directory not found${NC}"
    echo "Are you in the repository root?"
    exit 1
fi

# Install pre-push hook
echo -e "${YELLOW}▶ Installing pre-push hook${NC}"
cp scripts/git-hooks/pre-push "$GIT_HOOKS_DIR/pre-push"
chmod +x "$GIT_HOOKS_DIR/pre-push"
echo -e "${GREEN}✓ Pre-push hook installed${NC}"
echo ""

echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}✓ Git hooks setup complete!${NC}"
echo ""
echo "The pre-push hook will now automatically run"
echo "verification checks before each push."
echo ""
echo "To bypass the hook (not recommended), use:"
echo "  git push --no-verify"
echo ""
echo "To manually run checks at any time:"
echo "  ./scripts/verify-pre-push.sh"
echo -e "${BLUE}========================================${NC}"
