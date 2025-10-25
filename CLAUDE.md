# Claude Code Development Guide

## 🚨 CRITICAL: Pre-Push Verification (MANDATORY)

**⚠️ NEVER push to GitHub without running local verification first!**

### One-Time Setup (Required)

```bash
# Install Git pre-push hook
./scripts/setup-git-hooks.sh
```

This installs an automatic pre-push hook that runs ALL CI checks locally before allowing a push.

### Pre-Push Hook Behavior

The hook **automatically** runs these checks on every `git push`:

1. ✓ ESLint (code quality)
2. ✓ Prettier (formatting check)
3. ✓ TypeScript compilation
4. ✓ Tests (all 230 tests must pass)
5. ✓ Coverage analysis (informational)
6. ✓ Security scanning (Semgrep)
7. ✓ NPM audit
8. ✓ Production build
9. ✓ Build artifact verification

**If ANY check fails, the push is blocked.**

### Manual Verification

To run checks manually at any time:

```bash
./scripts/verify-pre-push.sh
```

### Bypassing the Hook

**⚠️ NEVER bypass the hook unless you have a specific reason and understand the consequences:**

```bash
git push --no-verify  # ⚠️ NOT RECOMMENDED
```

**Why This is Mandatory:**

- Prevents CI failures on GitHub (saves time and CI minutes)
- Catches formatting issues, test failures, and security problems locally
- Mirrors EXACT CI pipeline - what passes locally will pass in CI
- Maintains code quality standards automatically
- Previous CI failures were caused by skipping these checks

**Bottom Line**: If the hook is not installed or you bypass it, expect CI failures.

## CRITICAL: Publishing Workflow

**⚠️ NEVER use `npm publish` locally!**

All publishing is handled automatically via GitHub Actions. Always follow this workflow:

### Versioning Strategy

cidrly follows [Semantic Versioning 2.0.0](https://semver.org):

- **v0.x.x** = Initial development (current phase)
  - `0.1.1`, `0.1.2` = Bug fixes → `npm version patch`
  - `0.2.0`, `0.3.0` = New features → `npm version minor`
  - `0.4.0+` = Breaking changes → `npm version minor` (treated as minor in 0.x)
- **v1.0.0** = First stable release (manual decision when production-ready)

### Publishing Updates to NPM

```bash
# 1. Verify all checks pass locally (MANDATORY)
./scripts/verify-pre-push.sh

# 2. Make your code changes and commit them
git add .
git commit -m "fix: your changes here"

# 3. Push to main (pre-push hook runs automatically)
git push origin main

# 4. Bump version and create tag
npm version patch -m "chore: bump version to %s"     # For bug fixes (0.1.x)
npm version minor -m "chore: bump version to %s"     # For features/breaking (0.x.0)

# 5. Push commit and tag to GitHub (pre-push hook runs again)
git push origin main --follow-tags

# 6. GitHub Actions automatically:
#    ✅ Runs tests, linting, security scans
#    ✅ Builds production code
#    ✅ Publishes to npm as latest (using NPM_TOKEN secret)
#    ✅ Creates GitHub Release
```

**Why this workflow?**

- NPM_TOKEN is stored as GitHub secret (not available locally)
- Automated CI/CD ensures quality checks before publishing
- Consistent release process with GitHub Releases
- Prevents accidental local publishes with wrong credentials

**To verify successful publish:**

```bash
npm view cidrly version  # Check latest version on npm
gh run list --workflow=release.yml --limit 1  # Check workflow status
gh release view v0.x.x  # View GitHub Release
```

## Project Overview

cidrly is a type-safe CLI tool for network architecture planning built with:

- **Runtime**: Node.js 20+
- **Language**: TypeScript (strict mode)
- **UI Framework**: Ink v6 (React for CLI)
- **State Management**: Zustand with Immer
- **Validation**: Zod schemas

## Development Commands

### Primary Commands

```bash
npm run dev                    # Run in development mode (tsx)
./scripts/verify-pre-push.sh  # ⚠️ MANDATORY before every push
npm run verify                 # Quick verify: format + lint + test + security
```

### Individual Checks

```bash
npm run lint              # ESLint - Check code quality
npm run lint:fix          # ESLint - Auto-fix issues
npm run format:check      # Prettier - Check formatting
npm run format            # Prettier - Auto-fix formatting
npm test                  # Vitest - Run all tests
npm run test:coverage     # Vitest - Tests with coverage
npm run build             # TypeScript - Build
npm run build:prod        # TypeScript - Clean + production build
npm run security          # Semgrep - Security scan
```

### Quality Check Order

**Before making commits:**

1. Write code
2. Run `npm run format` to auto-fix formatting
3. Run `npm run lint:fix` to auto-fix lint issues
4. Run `npm test` to verify tests pass
5. Commit changes

**Before pushing to GitHub:**

1. Run `./scripts/verify-pre-push.sh` (or let the hook run automatically)
2. Fix any failures
3. Push (hook prevents push if checks fail)

## Architecture Principles

- **Type Safety First**: Full TypeScript with strict mode
- **Component-Driven**: React components for all UI
- **Immutable State**: Zustand with Immer for safe updates
- **Validation Everywhere**: Zod schemas for all data
- **Security by Default**: Multi-layer path protection

## Common Tasks

### Adding New Features

1. Create feature in appropriate directory (src/components/, src/core/, etc.)
2. Add tests
3. Update types if needed
4. Build and test locally
5. Follow publishing workflow above

### Fixing Bugs

1. Write failing test first
2. Implement fix
3. Verify test passes
4. Follow publishing workflow above

### Terminal UI Considerations

- No true transparency in Ink - use conditional rendering
- No z-index layering - content renders sequentially
- Hide conflicting content instead of trying to layer it
- Clear screen on launch for professional appearance

## Documentation

- **README.md**: User-facing documentation
- **ARCHITECTURE.md**: Technical architecture details
- **BETA_README.md**: Beta testing guide
- **CHANGELOG.md**: Version history (update with each release)

## Important Patterns

### Screen Clearing

Always clear terminal on app launch:

```tsx
import { useEffect } from 'react';

export default function Component() {
  useEffect(() => {
    process.stdout.write('\x1Bc'); // Full terminal reset
  }, []);
  // ...
}
```

### Global Installation

Package is a CLI tool with `"preferGlobal": true` to warn users who install locally.

Users should install globally:

```bash
npm install -g cidrly
```

## Distribution Channels

1. **npm**: Latest version published automatically (currently v0.x.x)
2. **GitHub Releases**: Automated with each version tag
3. **Homebrew**: `chuckycastle/cidrly` tap (manual updates)

## Support

For issues or questions, see GitHub Issues: https://github.com/chuckycastle/cidrly/issues
